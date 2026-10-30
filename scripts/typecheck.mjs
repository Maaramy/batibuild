#!/usr/bin/env node
// ============================================================================
// CONTRÔLE DE TYPE SÉQUENTIEL, AVEC BUDGET MÉMOIRE
// ----------------------------------------------------------------------------
// Dans la sandbox (cgroup 2 Go), `tsc -b` était tué par le noyau (SIGKILL,
// code 137) : le compilateur ne pèse pourtant que ~1 Go, mais il tombait en
// même temps que les autres gros consommateurs — l'aperçu Vite, le service
// esbuild, `convex dev` et le `tsc --listFiles` que la CLI Convex lance pour
// typer le backend. Cumulés, ils dépassent `memory.max` et le noyau tue le
// dernier arrivé.
//
// Ce script ne désactive AUCUNE vérification : il exécute les TROIS projets
// TypeScript l'un APRÈS l'autre (jamais en parallèle), attend qu'assez de
// mémoire soit réellement libre avant chaque projet, puis mesure la durée et le
// pic du cgroup pour chacun. Un projet en échec arrête la suite et son code de
// sortie est propagé tel quel (134 = plafond V8, 137 = SIGKILL mémoire).
//
//   bun run typecheck            # les trois projets, dans l'ordre
//   bun run typecheck frontend   # un seul projet (frontend | vite | convex)
// ============================================================================
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CGROUP = "/sys/fs/cgroup";

/** Projets à vérifier, du plus lourd au plus léger. */
const PROJECTS = [
  { id: "frontend", label: "frontend (src)", config: "tsconfig.app.json" },
  { id: "convex", label: "fonctions Convex", config: "src/convex/tsconfig.json" },
  { id: "vite", label: "config Vite", config: "tsconfig.node.json" },
];

/** Pic mesuré du projet le plus lourd (~1 Go) + marge de sécurité. */
const NEED_MB = Number(process.env.BB_TYPECHECK_NEED_MB || 1150);
/** Attente maximale de mémoire libre avant de tenter quand même. */
const WAIT_MS = Number(process.env.BB_TYPECHECK_WAIT_MS || 90_000);

const readNumber = (file) => {
  try {
    const raw = readFileSync(file, "utf8").trim();
    return raw === "max" ? Number.POSITIVE_INFINITY : Number(raw);
  } catch {
    return Number.NaN;
  }
};

const cgroupMb = () => ({
  max: readNumber(join(CGROUP, "memory.max")) / 1048576,
  current: readNumber(join(CGROUP, "memory.current")) / 1048576,
});

const freeMb = () => {
  const { max, current } = cgroupMb();
  return Number.isFinite(max) ? max - current : Number.POSITIVE_INFINITY;
};

const cgroupState = () => {
  const { max, current } = cgroupMb();
  const fmt = (n) => (Number.isFinite(n) ? Math.round(n) : "∞");
  return `cgroup ${fmt(max)} Mo, utilisé ${fmt(current)} Mo, libres ${fmt(freeMb())} Mo`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attend que le cgroup redescende sous le seuil : lancer `tsc` alors que les
 * serveurs de développement occupent la mémoire, c'est se faire tuer à 40 s.
 */
async function waitForRoom(needMb) {
  const deadline = Date.now() + WAIT_MS;
  let free = freeMb();
  while (free < needMb && Date.now() < deadline) {
    process.stdout.write(`· ${Math.round(free)} Mo libres — attente (${needMb} Mo requis)…\n`);
    await sleep(3000);
    free = freeMb();
  }
  return free;
}

/** Lance un projet et renvoie { code, seconds, peakMb } (pic du cgroup). */
function runProject(project) {
  const bin = join(process.cwd(), "node_modules", ".bin", "tsc");
  if (!existsSync(bin)) {
    return Promise.resolve({ code: 127, seconds: 0, peakMb: 0, missing: true });
  }

  const start = Date.now();
  let peakMb = 0;
  const child = spawn(bin, ["-p", project.config, "--noEmit"], {
    stdio: "inherit",
    env: process.env,
  });

  const sampler = setInterval(() => {
    const { current } = cgroupMb();
    if (Number.isFinite(current)) peakMb = Math.max(peakMb, current);
  }, 400);

  return new Promise((resolve) => {
    child.on("close", (code, signal) => {
      clearInterval(sampler);
      resolve({
        code: code ?? (signal ? 137 : 1),
        signal,
        seconds: (Date.now() - start) / 1000,
        peakMb,
      });
    });
  });
}

const only = process.argv[2];
const queue = only ? PROJECTS.filter((p) => p.id === only || p.config.includes(only)) : PROJECTS;
if (queue.length === 0) {
  console.error(
    `Projet inconnu : ${only}. Choix : ${PROJECTS.map((p) => p.id).join(", ")}`,
  );
  process.exit(2);
}

console.log(`Contrôle de type séquentiel — ${queue.length} projet(s), un seul à la fois`);
console.log(`Mémoire avant : ${cgroupState()}`);

const results = [];
for (const project of queue) {
  const free = await waitForRoom(NEED_MB);
  console.log(
    `\n▶ ${project.label} (${project.config}) — ${Math.round(free)} Mo libres`,
  );

  const result = await runProject(project);
  results.push({ ...project, ...result });

  const ok = result.code === 0;
  const peak = Math.round(result.peakMb);
  console.log(
    `${ok ? "✅" : "❌"} ${project.label} : code ${result.code} en ${result.seconds.toFixed(
      1,
    )} s — pic cgroup ${peak} Mo`,
  );

  if (!ok) {
    if (result.code === 137) {
      console.error(
        `   SIGKILL : mémoire insuffisante pendant ce projet (${cgroupState()}).`,
      );
      console.error(
        "   Relancer quand les serveurs de développement sont au repos, ou vérifier ce projet seul :",
      );
      console.error(`     bun run typecheck ${project.id}`);
    } else if (result.code === 134) {
      console.error("   Abandon de V8 : le plafond de heap de `tsc` est trop bas.");
    }
    break;
  }
}

const failed = results.find((r) => r.code !== 0);
console.log("\nRécapitulatif");
for (const r of results) {
  console.log(
    `  ${r.code === 0 ? "ok  " : "échec"}  ${r.label.padEnd(16)} ${r.seconds.toFixed(
      1,
    )} s  pic ${Math.round(r.peakMb)} Mo`,
  );
}
console.log(`Mémoire après : ${cgroupState()}`);

process.exit(failed ? failed.code : 0);
