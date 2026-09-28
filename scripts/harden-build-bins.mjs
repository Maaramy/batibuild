#!/usr/bin/env node
// ============================================================================
// PLAFOND DE HEAP POUR LES DEUX BINÔMES QUE LANCE LE BUILD DE LA PLATEFORME
// ----------------------------------------------------------------------------
// La mise en production échouait sur :
//
//     - Running 'tsc -b && vite build' with environment variables "…" set...
//     Killed
//     ✖ 'tsc -b && vite build' failed
//
// Cette commande n'est PAS celle de package.json : la plateforme (Convex
// `--cmd`) fournit elle-même celle du gabarit Vite, et elle ne lit donc jamais
// `scripts/build.sh`. Le plafond de heap posé dans ce script-là — la mitigation
// qui évite l'OOM kill de la sandbox de 2 Go — ne s'appliquait donc JAMAIS au
// build déployé.
//
// La seule chose que cette commande et nous partageons, c'est la résolution
// PATH des binaires `tsc` et `vite` : les liens créés par `bun` dans
// `node_modules/.bin`. Ce script, lancé par le `postinstall`, remplace ces liens
// par de minuscules enveloppes `sh` qui relancent le vrai binaire sous
// `--max-old-space-size`. Le plafond s'applique alors quelle que soit la façon
// dont la commande a été écrite, exactement comme celui de `scripts/build.sh`.
//
// Mesuré dans cette sandbox (cgroup 2 Go, partagé avec le serveur Vite et
// `convex dev`), sur la commande exacte de la plateforme :
//   · sans plafond : pic du build ≈ 1 413 Mo  → « Killed » (SIGKILL du cgroup)
//   · plafonné     : pic du build ≈ 1 152 Mo  → le build passe
//
// Deux précautions :
//   · `vite` n'est plafonné QUE pour la sous-commande `build` : le serveur de
//     développement (l'aperçu) doit garder tout le tas dont il a besoin.
//   · l'enveloppe retrouve sa cible À PARTIR DE SA PROPRE POSITION (avec le
//     chemin absolu du moment de l'installation en secours) : un node_modules
//     déplacé continue de fonctionner.
//   · tout échec est silencieux (exit 0) : un `postinstall` ne doit jamais
//     casser une installation.
// ============================================================================
import { chmodSync, existsSync, lstatSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Marqueur présent uniquement dans les enveloppes écrites par ce script. */
export const MARKER = "budgetbati-build-heap-guard";

/** Plafond, surchargeable. Doit rester ≥ ce que le build vivant réclame : en
 * dessous de ~700 Mo V8 abandonne sur « JavaScript heap out of memory ». */
export const HEAP_MB = process.env.BB_BUILD_HEAP_MB || "800";

/**
 * Binaires plafonnés.
 *   · `tsc`  : sert au typecheck (`tsc -b`) et au build → plafonné toujours.
 *   · `vite` : plafonné uniquement pour `vite build`; `vite` (serveur de dev)
 *              et `vite preview` restent libres.
 */
export const TARGETS = [
  { name: "tsc", target: "typescript/bin/tsc", buildOnly: false },
  { name: "vite", target: "vite/bin/vite.js", buildOnly: true },
];

/** Enveloppe `sh` : retrouve le vrai binaire puis rappelle `node` plafonné. */
export function wrapperSource({ relTarget, absTarget, heapMb, buildOnly }) {
  const resolveTarget = [
    `self="$0"`,
    `case "$self" in */*) ;; *) self=$(command -v "$self" 2>/dev/null || true) ;; esac`,
    `here=$(cd "$(dirname -- "\${self:-$0}")" 2>/dev/null && pwd || true)`,
    `target="$here/${relTarget}"`,
    `[ -f "$target" ] || target="${absTarget}"`,
  ].join("\n");
  const run = (withCap) =>
    `exec node ${withCap ? `--max-old-space-size=${heapMb} ` : ""}"$target" "$@"`;
  const body = buildOnly
    ? `# Plafonné pour « build » seulement : l'aperçu (serveur de développement) garde tout son tas.\ncase "$1" in\n  build) ${run(true)} ;;\n  *) ${run(false)} ;;\nesac`
    : run(true);
  return `#!/bin/sh\n# ${MARKER} — voir scripts/harden-build-bins.mjs\n${resolveTarget}\n${body}\n`;
}

/** Résultat : "absent" | "already" | "patched" | "skipped". */
export function patchBin({ binDir, name, target, heapMb = HEAP_MB, buildOnly = false }) {
  const binPath = join(binDir, name);
  if (!existsSync(binPath)) return "absent";
  const isLink = lstatSync(binPath).isSymbolicLink();
  if (!isLink && readFileSync(binPath, "utf8").includes(MARKER)) return "already";

  // Le chemin du paquet est préféré au lien : il ne peut pas se retourner vers
  // l'enveloppe elle-même (boucle `exec` de node sur lui-même).
  const fromPackage = resolve(binDir, "..", target);
  const linkTarget = isLink ? realpathSync(binPath) : null;
  const absTarget = existsSync(fromPackage) ? fromPackage : linkTarget;
  if (!absTarget || absTarget === binPath) return "skipped";

  unlinkSync(binPath);
  writeFileSync(
    binPath,
    wrapperSource({ relTarget: relative(binDir, absTarget).split("\\").join("/"), absTarget, heapMb, buildOnly }),
    { mode: 0o755 },
  );
  chmodSync(binPath, 0o755);
  return "patched";
}

function main() {
  if (process.platform === "win32") return; // les liens sont des .cmd : rien à faire
  const binDir = join(process.cwd(), "node_modules", ".bin");
  if (!existsSync(binDir)) return;
  const results = TARGETS.map((t) => `${t.name}:${patchBin({ binDir, ...t })}`);
  console.log(`[heap-guard] plafond de build ${HEAP_MB} Mo → ${results.join(", ")}`);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    // Un postinstall ne casse jamais une installation.
    console.warn(`[heap-guard] ignoré : ${error instanceof Error ? error.message : String(error)}`);
  }
}
