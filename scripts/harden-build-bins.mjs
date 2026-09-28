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
// Cette commande n'est PAS celle de package.json : elle vient de
// `convex deploy --cmd "tsc -b && vite build"` (voir `runCommand()` dans
// `node_modules/convex/dist/esm/cli/lib/deploy2.js`, qui exécute
// `spawnSync(cmd, { shell: true })`). Elle ne lit donc jamais
// `scripts/build.sh`, et `--cmd-url-env-var-name` ne sert qu'à injecter
// `VITE_CONVEX_URL` / `VITE_CONVEX_SITE_URL`.
//
// Ce que cette commande et nous partageons, c'est la résolution PATH des
// binaires `tsc` et `vite` (les liens créés par `bun` dans `node_modules/.bin`).
// Ce script, lancé par le `postinstall`, remplace ces liens par de minuscules
// enveloppes `sh` qui relancent le vrai binaire sous `--max-old-space-size`.
// Le plafond s'applique alors quelle que soit la façon dont la commande a été
// écrite. Vérifié : les enveloppes survivent à `bun add` (le postinstall les
// repose après le relink des `.bin`).
//
// ── Mesures sur la commande exacte de la plateforme (VmHWM, sandbox 2 Go) ────
//   · sans plafond ......... tsc ≈ 990 Mo · vite ≈ 1 160 Mo → « Killed »
//   · plafond 800 Mo (v1) .. tsc ≈ 876 Mo · vite ≈ 888 Mo → toujours « Killed »
//   · plafonds actuels ..... tsc ≈ 859 Mo · vite ≈ 846 Mo
//
// Les deux plafonds ci-dessous sont les PLANCHERS mesurés : en dessous, V8
// abandonne (« JavaScript heap out of memory »), donc on ne peut pas descendre
// davantage sans réduire le travail de TypeScript lui-même.
//   · tsc  : 736 Mo → abandon · 744 Mo → OK (856 Mo de RSS) · 768 Mo → OK (873)
//   · vite : 704 Mo → OK (846 Mo de RSS)
// Le pic de `tsc -b` (≈ 859 Mo) est le plancher du build : il est dominé par le
// contrôle de type de l'application elle-même (1 413 fichiers, ~109 000 lignes,
// ~897 000 instanciations de types). Ni `exclude`, ni `types`, ni `skipLibCheck`
// ne le font baisser (mesuré) ; le build incrémental de `tsc -b` n'aide pas non
// plus sur un checkout froid.
//
// ── Journalisation ───────────────────────────────────────────────────────────
// L'enveloppe rapporte le code de sortie du binaire. Dans le journal de
// déploiement, cela distingue enfin les deux échecs possibles :
//   exit=134 → V8 a abandonné (plafond trop bas) ;
//   exit=137 → SIGKILL du noyau = mémoire insuffisante dans la sandbox.
// Sans cela, `Killed` ne dit pas quelle étape est morte.
//
// Deux précautions :
//   · `vite` n'est plafonné QUE pour la sous-commande `build` : le serveur de
//     développement (l'aperçu) doit garder tout le tas dont il a besoin ;
//   · l'enveloppe retrouve sa cible À PARTIR DE SA PROPRE POSITION (avec le
//     chemin absolu du moment de l'installation en secours) : un node_modules
//     déplacé continue de fonctionner ;
//   · tout échec est silencieux (exit 0) : un `postinstall` ne doit jamais
//     casser une installation.
// ============================================================================
import { chmodSync, existsSync, lstatSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Marqueur présent uniquement dans les enveloppes écrites par ce script. */
export const MARKER = "budgetbati-build-heap-guard";

/**
 * Plafonds de tas, par binaire, en Mo. Surchargables par `BB_BUILD_HEAP_MB`
 * (une seule valeur pour les deux), mais les valeurs par défaut sont les
 * planchers MESURÉS — ne pas les remonter sans re-mesurer le pic de RSS.
 */
export const HEAP_MB_BY_TARGET = { tsc: "752", vite: "704" };

/** Plafond appliqué à `tsc` (compatibilité : sert aussi de valeur par défaut). */
export const HEAP_MB = process.env.BB_BUILD_HEAP_MB || HEAP_MB_BY_TARGET.tsc;

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

/**
 * Enveloppe `sh` : retrouve le vrai binaire puis rappelle `node` plafonné, et
 * rapporte le code de sortie (V8 a abandonné vs. tué par le noyau).
 */
export function wrapperSource({ name, relTarget, absTarget, heapMb, buildOnly }) {
  const resolveTarget = [
    `self="$0"`,
    `case "$self" in */*) ;; *) self=$(command -v "$self" 2>/dev/null || true) ;; esac`,
    `here=$(cd "$(dirname -- "\${self:-$0}")" 2>/dev/null && pwd || true)`,
    `target="$here/${relTarget}"`,
    `[ -f "$target" ] || target="${absTarget}"`,
  ].join("\n");
  const run = (withCap) =>
    [
      `node ${withCap ? `--max-old-space-size=${heapMb} ` : ""}"$target" "$@"`,
      `status=$?`,
      `if [ "$status" -ne 0 ]; then`,
      `  case "$status" in`,
      `    134) reason="abandon de V8 (plafond de ${heapMb} Mo épuisé)";;`,
      `    137) reason="SIGKILL — processus tué par le noyau (mémoire du sandbox)";;`,
      `    *) reason="échec";;`,
      `  esac`,
      `  echo "[heap-guard] ${name} : $reason (exit=$status)${
        withCap ? "" : " — non plafonné"
      }" >&2`,
      `fi`,
      `exit $status`,
    ].join("\n");
  const body = buildOnly
    ? `# Plafonné pour « build » seulement : l'aperçu (serveur de développement) garde tout son tas.\ncase "$1" in\n  build)\n${run(true)}\n    ;;\n  *)\n${run(false)}\n    ;;\nesac`
    : run(true);
  return `#!/bin/sh\n# ${MARKER} — voir scripts/harden-build-bins.mjs\n${resolveTarget}\n${body}\n`;
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
