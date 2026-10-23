#!/usr/bin/env node
// ============================================================================
// PLAFONDS DE HEAP, UN SEUL ESSAI RAPIDE, ET DIAGNOSTIC DU BUILD
// ----------------------------------------------------------------------------
// Déploiement en échec dans la sandbox de build :
//
//     Deployment failed — The build took longer than the project sandbox
//     allows and was stopped.
//
// La commande enchaîne `tsc -b` puis `vite build`. Trois défauts lui faisaient
// dépasser le délai alloué :
//   · le mode économe `--jitless` (2 à 3× plus lent) était choisi dès que le
//     budget mémoire du cgroup passait sous 1 250 Mo — il finissait même tué
//     par le noyau après 120 à 173 s ;
//   · le code de sortie n'était PAS propagé : après un `tsc` tué, le build
//     continuait vers `vite build`, doublant la durée d'un build condamné et
//     masquant l'étape responsable ;
//   · `vite` gardait un plafond nominal de 660 Mo, désormais sous son jeu
//     vivant : chaque build payait un abandon de V8 (35 s) avant de réussir.
//
// Cette commande n'est PAS celle de package.json : elle vient de
// `convex deploy --cmd "tsc -b && vite build"` (voir `runCommand()` dans
// `node_modules/convex/dist/esm/cli/lib/deploy2.js`, qui exécute
// `spawnSync(cmd, { shell: true })`). Elle ne lit donc jamais
// `scripts/build.sh`, et `--cmd-url-env-var-name` ne sert qu'à injecter
// `VITE_CONVEX_URL` / `VITE_CONVEX_SITE_URL`.
//
// Ce que cette commande et nous partageons, c'est la résolution PATH des
// binaires (`node_modules/.bin`) : ce script, lancé par le `postinstall`,
// remplace les liens `tsc` et `vite` par des enveloppes `sh`. Vérifié : elles
// survivent à `bun add` (le postinstall les repose après le relink des `.bin`).
//
// ── Mesures sur la commande exacte, checkout froid (2026-10) ──────────────
//   · `tsc -b` cap 900 (JIT) ......... OK en 56 s
//   · `tsc -b` cap 848 (`--jitless`) . abandon de V8 ou SIGKILL après 120 à
//                                       173 s (mesuré aussi pendant que les
//                                       serveurs de dev occupent ~430 Mo)
//   · `vite build` cap 660 ........... abandon de V8 après 35 s, puis 27 s au
//                                       repli → 63 s à chaque build
//   · `vite build` cap 900 ........... OK du premier coup en 28 s
//
// Le contrôle de type ne descend plus sous 900 Mo : un plafond plus bas est un
// échec franc, pas un pic plus bas. Mesuré comme SANS EFFET sur `tsc` :
// `exclude` des tests, `types: []`, suppression des `.d.ts` de `@types/three`,
// isolation du backend Convex, `--optimize-for-size`, build incrémental sur un
// checkout froid, compilateur natif `tsgo` (4× plus rapide mais 1 110 Mo). Pour
// `vite` : `maxParallelFileOps` à 2 (aucun gain) et `--no-opt` (+23 % de temps).
//
// ── Stratégie : un seul essai, rapide, et un échec qui arrête tout ─────────
// `tsc` ne lit plus le budget mémoire pour choisir un mode : il lance toujours
// le chemin rapide plafonné à 900 Mo. Le mode `--jitless` est supprimé parce
// que, dans une sandbox limitée par le TEMPS, il ne « sauvait » pas le build :
// il le faisait dépasser le délai (120 à 173 s) avant d'être tué. Un budget
// mémoire insuffisant donne désormais une erreur claire et immédiate (code
// 134/137 propagé) au lieu d'un build qui traîne puis échoue.
// `vite build` garde son plafond nominal à 900 Mo (mesuré suffisant du premier
// coup) et un repli unique à 1 024 Mo uniquement sur abandon de V8 (134).
//
// ── Journalisation ─────────────────────────────────────────────────────────
// Chaque enveloppe annonce le budget, puis, en cas d'échec, la durée et l'état
// du cgroup (`memory.max` / `memory.peak` / libres). Le prochain journal de
// déploiement dira donc la limite réelle du sandbox et l'étape morte, au lieu
// d'un « Killed » anonyme.
//
// Deux précautions : `vite` n'est plafonné QUE pour la sous-commande `build`
// (l'aperçu garde tout son tas), et l'enveloppe retrouve sa cible depuis sa
// propre position (un `node_modules` déplacé continue de fonctionner). Tout
// échec du `postinstall` est silencieux : il ne doit jamais casser une
// installation.
// ============================================================================
import { chmodSync, existsSync, lstatSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Marqueur présent uniquement dans les enveloppes écrites par ce script. */
export const MARKER = "budgetbati-build-heap-guard";

/**
 * Plafond du REPLI de `vite build`. `vite` refuse `--jitless` (Node charge
 * `undici`, qui compile son parseur HTTP via `WebAssembly`, indisponible sans
 * JIT), donc le seul levier disponible est un plafond plus large. Il n'est joué
 * que si le plafond nominal a DÉJÀ échoué par abandon de V8 (134) : le build qui
 * aurait échoué passe, au prix d'un RSS plus élevé.
 */
export const VITE_ABORT_RETRY_MB = "1024";

/**
 * Plafonds de tas, par binaire, en Mo — les PLANCHERS mesurés.
 *
 * Re-mesure 2026-10 sur un checkout froid (caches TypeScript supprimés) :
 *   · `tsc -b` cap 900 (JIT) ....... OK en 56 s
 *   · `tsc -b` cap 848 (`--jitless`) abandon de V8 ou SIGKILL après 120-173 s
 *   · `vite build` cap 660 ......... ABANDON de V8 après 35 s, puis 27 s au
 *                                    repli → 63 s à chaque build
 *   · `vite build` cap 900 ......... OK du premier coup en 28 s
 *
 * Le cap de `vite` est donc passé de 660 à 900 : l'ancien plancher était
 * dépassé par le graphe actuel, et le repli systématique coûtait 35 s de build
 * en plus — inacceptable dans la sandbox de déploiement, qui a un budget de
 * temps avant tout budget de mémoire.
 */
export const HEAP_MB_BY_TARGET = { tsc: "900", vite: "900" };

/** Plafond de `tsc` (compatibilité : sert aussi de valeur par défaut). */
export const HEAP_MB = process.env.BB_BUILD_HEAP_MB || HEAP_MB_BY_TARGET.tsc;

/**
 * Binaires plafonnés.
 *   · `tsc`  : typecheck (`tsc -b`) et build → plafonné toujours, un seul
 *              essai (voir l'en-tête : le mode `--jitless` coûtait 2 à 3 fois
 *              plus cher et faisait dépasser le délai de la sandbox).
 *   · `vite` : plafonné uniquement pour `vite build` ; le serveur de dev et
 *              `vite preview` gardent tout leur tas.
 */
export const TARGETS = [
  { name: "tsc", target: "typescript/bin/tsc", buildOnly: false },
  {
    name: "vite",
    target: "vite/bin/vite.js",
    buildOnly: true,
    retryAbortMb: VITE_ABORT_RETRY_MB,
  },
];

/** Lit un compteur du cgroup v2 ; 0 si absent, illisible ou non numérique. */
const cgroupHelpers = [
  `# Budget mémoire du cgroup (Mo libres) : 0 = illisible, donc inconnu.`,
  `budget_mb() {`,
  `  limit=$(cat /sys/fs/cgroup/memory.max 2>/dev/null)`,
  `  used=$(cat /sys/fs/cgroup/memory.current 2>/dev/null)`,
  `  case "$limit" in ''|*[!0-9]*) echo 0; return 0 ;; esac`,
  `  case "$used" in ''|*[!0-9]*) echo 0; return 0 ;; esac`,
  `  echo $(( (limit - used) / 1048576 ))`,
  `}`,
  ``,
  `# État du cgroup, pour le journal de déploiement : il dit la VRAIE limite du`,
  `# sandbox, celle qu'aucun plafond de V8 ne peut déduire.`,
  `cgroup_state() {`,
  `  limit=$(cat /sys/fs/cgroup/memory.max 2>/dev/null)`,
  `  peak=$(cat /sys/fs/cgroup/memory.peak 2>/dev/null)`,
  `  case "$limit" in ''|*[!0-9]*) limit=0 ;; esac`,
  `  case "$peak" in ''|*[!0-9]*) peak=0 ;; esac`,
  `  free=$(budget_mb)`,
  `  if [ "$limit" -eq 0 ]; then`,
  `    echo "cgroup illisible"`,
  `  else`,
  `    echo "cgroup $(( limit / 1048576 )) Mo, pic $(( peak / 1048576 )) Mo, libres \${free} Mo"`,
  `  fi`,
  `}`,
].join("\n");

/**
 * Enveloppe `sh` : retrouve le vrai binaire, rappelle `node` plafonné, rapporte
 * le code de sortie (V8 a abandonné vs. tué par le noyau) ET LE PROPAGE.
 */
export function wrapperSource({
  name,
  relTarget,
  absTarget,
  heapMb,
  buildOnly,
  retryAbortMb = null,
}) {
  const resolveTarget = [
    `self="$0"`,
    `case "$self" in */*) ;; *) self=$(command -v "$self" 2>/dev/null || true) ;; esac`,
    `here=$(cd "$(dirname -- "\${self:-$0}")" 2>/dev/null && pwd || true)`,
    `target="$here/${relTarget}"`,
    `[ -f "$target" ] || target="${absTarget}"`,
  ].join("\n");
  const node = (flags) => `node${flags ? ` ${flags}` : ""} "$target" "$@"`;
  const FAST = `--max-old-space-size=${heapMb}`;
  const report = (withCap) =>
    [
      `if [ "$status" -ne 0 ]; then`,
      `  case "$status" in`,
      `    134) reason="abandon de V8 (plafond épuisé)";;`,
      `    137) reason="SIGKILL — processus tué par le noyau (mémoire du sandbox)";;`,
      `    *) reason="échec";;`,
      `  esac`,
      `  echo "[heap-guard] ${name} : $reason après \${elapsed} s${withCap ? "" : " — non plafonné"} — $(cgroup_state)" >&2`,
      `fi`,
    ].join("\n");

  const timings = `elapsed=$(( $(date +%s) - started ))`;

  // `vite` : un plafond trop juste est un ABANDON de V8, pas un pic plus bas.
  // Son repli ÉLARGIT donc le plafond, et n'est joué qu'après l'échec.
  const retryOnAbort = retryAbortMb
    ? [
        `if [ "$status" -eq 134 ]; then`,
        `  echo "[heap-guard] ${name} : abandon de V8 après \${elapsed} s — nouvelle tentative (plafond ${retryAbortMb} Mo)" >&2`,
        `  started=$(date +%s)`,
        `  ${node(`--max-old-space-size=${retryAbortMb}`)}`,
        `  status=$?`,
        `  ${timings}`,
        `fi`,
      ].join("\n")
    : "";

  // Un seul essai, plafonné, puis le code de sortie est PROPAGÉ. Sans ce
  // `exit`, un `tsc` tué (137) ou en échec renvoyait 0 : le `&&` du build
  // enchaînait quand même `vite build`, doublait la durée d'un build déjà
  // condamné et masquait l'étape responsable dans le journal.
  const guarded = [
    `free=$(budget_mb)`,
    `echo "[heap-guard] ${name} : \${free} Mo libres — plafond ${heapMb} Mo" >&2`,
    `started=$(date +%s)`,
    node(FAST),
    `status=$?`,
    timings,
    retryOnAbort,
    report(true),
    `exit "$status"`,
  ]
    .filter(Boolean)
    .join("\n");

  const body = buildOnly
    ? `# Plafonné pour « build » seulement : l'aperçu (serveur de développement) garde tout son tas.\ncase "$1" in\n  build)\n${guarded}\n    ;;\n  *)\nstarted=$(date +%s)\n${node("")}\nstatus=$?\n${timings}\n${report(false)}\nexit "$status"\n    ;;\nesac`
    : guarded;
  return `#!/bin/sh\n# ${MARKER} — voir scripts/harden-build-bins.mjs\n${resolveTarget}\n${cgroupHelpers}\n${body}\n`;
}

/**
 * Résultat : "absent" | "already" | "patched" | "updated" | "skipped".
 *
 * Idempotent ET rafraîchissant : une enveloppe déjà posée mais dont le contenu
 * a changé (nouveau plafond, nouvelle journalisation, correction) est réécrite.
 * Sans cela, un simple changement de plafond dans ce fichier n'atteindrait
 * jamais un `node_modules` déjà installé.
 */
export function patchBin({
  binDir,
  name,
  target,
  heapMb = HEAP_MB_BY_TARGET[name] ?? HEAP_MB,
  buildOnly = false,
  retryAbortMb = null,
}) {
  const binPath = join(binDir, name);
  if (!existsSync(binPath)) return "absent";
  const isLink = lstatSync(binPath).isSymbolicLink();
  const existing = isLink ? null : readFileSync(binPath, "utf8");

  // Le chemin du paquet est préféré au lien : il ne peut pas se retourner vers
  // l'enveloppe elle-même (boucle `exec` de node sur lui-même).
  const fromPackage = resolve(binDir, "..", target);
  const linkTarget = isLink ? realpathSync(binPath) : null;
  const absTarget = existsSync(fromPackage) ? fromPackage : linkTarget;
  if (!absTarget || absTarget === binPath) return "skipped";

  const next = wrapperSource({
    name,
    relTarget: relative(binDir, absTarget).split("\\").join("/"),
    absTarget,
    heapMb,
    buildOnly,
    retryAbortMb,
  });
  if (existing === next) return "already";

  // Un lien doit être retiré AVANT d'écrire : écrire à travers lui écraserait
  // le vrai binaire du paquet.
  if (isLink) unlinkSync(binPath);
  writeFileSync(binPath, next, { mode: 0o755 });
  chmodSync(binPath, 0o755);
  return existing === null ? "patched" : "updated";
}

function main() {
  if (process.platform === "win32") return; // les liens sont des .cmd : rien à faire
  const binDir = join(process.cwd(), "node_modules", ".bin");
  if (!existsSync(binDir)) return;
  const results = TARGETS.map(
    (t) => `${t.name}:${patchBin({ binDir, ...t })}@${HEAP_MB_BY_TARGET[t.name]}Mo`,
  );
  console.log(`[heap-guard] plafonds de build → ${results.join(", ")}`);
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
