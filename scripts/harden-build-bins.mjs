#!/usr/bin/env node
// ============================================================================
// PLAFONDS DE HEAP, CHOIX DU CHEMIN SELON LE BUDGET, ET DIAGNOSTIC D'OOM
// ----------------------------------------------------------------------------
// La mise en production échoue sur :
//
//     - Running 'tsc -b && vite build' with environment variables "…" set...
//     Killed
//     [heap-guard] tsc : SIGKILL — processus tué par le noyau (exit=137)
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
// ── Mesures sur la commande exacte de la plateforme (VmHWM) ─────────────────
//   · sans plafond ................. tsc ≈ 990 Mo · vite ≈ 1 160 Mo → tués
//   · plafonds v1 (800/800) ........ tsc ≈ 876 Mo · vite ≈ 888 Mo → tués
//   · plafonds v2 (752/704) ........ tsc ≈ 859 Mo · vite ≈ 846 Mo → tsc tué
//   · avant re-mesure 2026-10 ...... tsc ≈ 796 Mo (`--jitless`) · vite : cap 660
//
// ── RE-MESURE 2026-10 : les planchers précédents ont ÉTÉ DÉPASSÉS ──────────
// Le contrôle de type a grossi avec le projet : `tsc -b` ABANDONNE désormais
// au plafond rapide comme au repli économe, ce qui a fait échouer le build de
// la plateforme (essai + repli dépassent le délai alloué à la commande) :
//   · cap 752 (JIT) ........  abandon de V8 après 75 s  → build mort
//   · cap 900 (JIT) ........  OK en 41 s   ← nouveau chemin rapide
//   · cap 744 (`--jitless`)  abandon de V8 après 126 s
//   · cap 848 (`--jitless`)  OK en 119 s  ← nouveau chemin économe
//   · `vite build` cap 660 .  toujours bon (26 s), inchangé
//
// ── Les planchers mesurés ──────────────────────────────────────────────────
// Le contrôle de type de cette application a grossi avec le projet : ses
// données vivantes dépassent désormais l'ancien plancher de 720 Mo, d'où la
// re-mesure de 2026-10 ci-dessus. Planchers validés aujourd'hui :
//   · chemin rapide (JIT) : cap 900 Mo, OK en 41 s ; à 752 Mo V8 abandonne
//     (« Ineffective mark-compacts near heap limit ») au bout de 75 s ;
//   · chemin économe (`--jitless`, interpréteur seul : plus de cache de code
//     JIT) : cap 848 Mo, OK en 119 s (≈ 2,8× le temps) ; à 744 Mo il abandonne
//     aussi (126 s) — c'est cette double mort qui mettait le build hors délai.
// C'est le point le plus bas atteignable sans rien désactiver.
// `vite build` ne peut PAS être allégé de la même façon : `--jitless` échoue
// aussitôt (Node charge `undici`, dont le parseur HTTP est un module
// `WebAssembly` : « ReferenceError: WebAssembly is not defined »), et
// `--max-semi-space-size=1` le fait abandonner encore plus tôt. Son seul levier
// est donc le plafond, et il est plus serré qu'il n'y paraît : à 620 Mo le build
// ABANDONNE (« Ineffective mark-compacts near heap limit », jeu vivant ≈ 600 Mo,
// limite réelle ≈ 635 Mo) ; à 660 Mo il passe (mesuré 3×, ~23 s). Un plafond
// trop juste n'allège pas le pic : il casse le build — d'où le repli à 900 Mo.
//
// Mesuré comme SANS EFFET sur la consommation de `tsc` : `exclude` des tests,
// `types: []`, suppression des 924 `.d.ts` de `@types/three`, isolation du
// backend Convex par découpage des racines (699 Mo pour le seul socle
// components+lib+convex), `--optimize-for-size`, build incrémental `tsc -b`,
// compilateur natif `tsgo` (4× plus rapide mais 1 110 Mo), et le déport du
// backend en déclarations (impossible : erreur TS2742, les types Convex ne sont
// pas nommables en sortie). Pour `vite` : `maxParallelFileOps` de 4 à 2 (792 Mo,
// aucun gain) et `--no-opt` (+23 % de temps, aucun gain mesuré).
//
// ── Stratégie : le budget décide, l'échec se replie ────────────────────────
// `tsc` lit la mémoire réellement disponible du cgroup AVANT de lancer node :
//   · budget confortable (≥ 1 250 Mo libres) → chemin rapide (900 Mo, JIT) ;
//   · budget serré                        → chemin économe d'emblée (`--jitless`,
//     848 Mo) : inutile de payer 41 s d'un essai que le noyau va tuer, et
//     surtout inutile de déclencher l'OOM killer avant la tentative qui compte.
// Le chemin rapide garde en plus son repli : si V8 abandonne (134) ou si le
// noyau tue (137), la même commande est REJOUÉE en `--jitless`. Un
// environnement large garde donc un build rapide ; un environnement serré
// obtient un build qui passe. `vite build` a le repli symétrique : son plafond
// nominal (660 Mo) reste proche de son jeu vivant, donc un abandon de V8 (134)
// le rejoue à 900 Mo. Étant donné qu'un plafond trop bas est un échec franc et
// non un pic plus bas, ce repli ne coûte rien tant qu'il n'est pas nécessaire.
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
 * Plafond du chemin économe `--jitless` de `tsc`. Re-mesuré 2026-10 : 744 Mo
 * ABANDONNE (V8, 126 s) — le contrôle de type a grossi —, 848 Mo passe (119 s).
 */
export const JITLESS_HEAP_MB = "848";

/**
 * Plafond du REPLI de `vite build`. `vite` refuse `--jitless` (Node charge
 * `undici`, qui compile son parseur HTTP via `WebAssembly`, indisponible sans
 * JIT), donc le seul levier disponible est un plafond plus large. Il n'est joué
 * que si le plafond nominal a DÉJÀ échoué par abandon de V8 (134) : le build qui
 * aurait échoué passe, au prix d'un RSS plus élevé.
 */
export const VITE_ABORT_RETRY_MB = "900";

/**
 * Budget (Mo réellement libres dans le cgroup) en dessous duquel `tsc` part
 * directement en `--jitless`. 1 250 Mo ≈ RSS attendu du chemin rapide
 * (~1 010 Mo : plafond 900 + overhead node/V8, mesuré 859 à l'ancien plafond
 * 752, soit +107) + ~250 Mo de marge pour le CLI Convex parent et la pression
 * mémoire — la même marge que l'ancien 1 100 (859 + 250).
 * Surchargeable par `BB_FAST_MIN_FREE_MB` (les tests s'en servent).
 */
export const FAST_PATH_MIN_FREE_MB = "1250";

/**
 * Plafonds de tas, par binaire, en Mo — les PLANCHERS mesurés (re-mesurés
 * 2026-10 : tsc 752 abandonne, 900 passe). `BB_BUILD_HEAP_MB` surcharge `tsc` ;
 * ne pas remonter les valeurs par défaut sans re-mesurer le pic de RSS.
 */
export const HEAP_MB_BY_TARGET = { tsc: "900", vite: "660" };

/** Plafond de `tsc` (compatibilité : sert aussi de valeur par défaut). */
export const HEAP_MB = process.env.BB_BUILD_HEAP_MB || HEAP_MB_BY_TARGET.tsc;

/**
 * Binaires plafonnés.
 *   · `tsc`  : typecheck (`tsc -b`) et build → plafonné toujours, chemin choisi
 *              selon le budget mémoire, repli `--jitless` si ça ne suffit pas.
 *   · `vite` : plafonné uniquement pour `vite build` ; le serveur de dev et
 *              `vite preview` gardent tout leur tas.
 */
export const TARGETS = [
  { name: "tsc", target: "typescript/bin/tsc", buildOnly: false, budgetAware: true },
  {
    name: "vite",
    target: "vite/bin/vite.js",
    buildOnly: true,
    budgetAware: false,
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
 * Enveloppe `sh` : retrouve le vrai binaire, rappelle `node` plafonné, et
 * rapporte le code de sortie (V8 a abandonné vs. tué par le noyau).
 */
export function wrapperSource({
  name,
  relTarget,
  absTarget,
  heapMb,
  buildOnly,
  budgetAware = false,
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
  const ECO = `--jitless --max-semi-space-size=1 --max-old-space-size=${JITLESS_HEAP_MB}`;
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

  // `tsc` : le budget décide du chemin, et un échec du chemin rapide rejoue en
  // mode économe. `vite` n'a qu'un chemin (il refuse `--jitless`).
  const timings = `elapsed=$(( $(date +%s) - started ))`;
  // `vite` : un plafond trop juste est un ABANDON de V8, pas un pic plus bas.
  // Son repli élargit donc le plafond — l'inverse de celui de `tsc` — et n'est
  // joué que si le plafond nominal a déjà échoué.
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

  const guarded = budgetAware
    ? [
        `free=$(budget_mb)`,
        `if [ "$free" -gt 0 ] && [ "$free" -lt "\${BB_FAST_MIN_FREE_MB:-${FAST_PATH_MIN_FREE_MB}}" ]; then`,
        `  echo "[heap-guard] ${name} : \${free} Mo libres — chemin économe d'emblée (--jitless, plafond ${JITLESS_HEAP_MB} Mo)" >&2`,
        `  started=$(date +%s)`,
        `  ${node(ECO)}`,
        `  status=$?`,
        `  eco=1`,
        `else`,
        `  echo "[heap-guard] ${name} : \${free} Mo libres — chemin rapide (plafond ${heapMb} Mo)" >&2`,
        `  started=$(date +%s)`,
        `  ${node(FAST)}`,
        `  status=$?`,
        `  eco=0`,
        `fi`,
        timings,
        `case "$status" in`,
        `  134|137)`,
        `    if [ "$eco" -eq 0 ]; then`,
        `      echo "[heap-guard] ${name} : mémoire insuffisante après \${elapsed} s — nouvelle tentative en mode économe (--jitless, plafond ${JITLESS_HEAP_MB} Mo)" >&2`,
        `      started=$(date +%s)`,
        `      ${node(ECO)}`,
        `      status=$?`,
        `      ${timings}`,
        `    fi`,
        `    ;;`,
        `esac`,
        report(true),
      ].join("\n")
    : [`started=$(date +%s)`, node(FAST), `status=$?`, timings, retryOnAbort, report(true)]
        .filter(Boolean)
        .join("\n");

  const body = buildOnly
    ? `# Plafonné pour « build » seulement : l'aperçu (serveur de développement) garde tout son tas.\ncase "$1" in\n  build)\n${guarded}\n    ;;\n  *)\nstarted=$(date +%s)\n${node("")}\nstatus=$?\n${timings}\n${report(false)}\n    ;;\nesac`
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
  budgetAware = false,
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
    budgetAware,
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
