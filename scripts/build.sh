#!/bin/sh
# ============================================================================
# BUILD DE PRODUCTION — Convex, typecheck, tests ciblés, puis bundling Vite
# ----------------------------------------------------------------------------
# Ordre des étapes (identique à celui du déploiement) :
#   0. Dépendances ....... déjà installées par la plateforme (`bun install` ->
#                          `postinstall` = scripts/harden-build-bins.mjs). Ce
#                          script ne réinstalle rien : relancer un install ici
#                          rejouerait le postinstall et doublerait le temps de
#                          build.
#   1. Codegen Convex .... `src/convex/_generated` (voir plus bas).
#   2. TypeScript ........ `tsc -b` (frontend + config Vite).
#   3. Tests ............. abonnements, période d'essai, limites de projets.
#   4. Vite .............. `vite build`.
#
# Pourquoi un script plutôt qu'une ligne dans package.json ?
#
# La sandbox de build tourne dans un cgroup de 2 Go, partagé avec le serveur
# Vite et `convex dev` (~500 Mo). Sans plafond, V8 laisse le tas grandir et
# l'OOM killer termine le build (« Killed », sans message de V8).
#
# Un `export NODE_OPTIONS=… && …` en tête du script « build » de package.json
# n'est pas fiable : les plateformes qui recopient cette commande la nettoient.
# Le plafond est donc posé ICI (fichier lu par le shell) ET sur les binaires
# eux-mêmes par scripts/harden-build-bins.mjs (postinstall) — ce dernier est le
# seul mécanisme partagé avec la commande du gabarit Vite (`tsc -b && vite
# build`), que la plateforme peut lancer sans passer par ce fichier.
#
# ── Plafonds actuels (re-mesurés 2026-10, checkout froid) ───────────────────
#   · tsc (JIT)  900 Mo ....... OK en 56 s (752 Mo abandonne)
#   · vite        900 Mo ...... OK en 28 s (660 Mo abandonne en 35 s puis
#                              réussit au repli : 63 s payés à chaque build)
#   · vitest      900 Mo ...... OK en 6 s (98 tests)
#
# Le mode `--jitless` a été RETIRÉ : 2 à 3× plus lent (120 à 173 s), il faisait
# dépasser le délai de la sandbox de déploiement. Un seul essai rapide, puis le
# code de sortie est propagé : un échec arrête le build au lieu de lancer
# `vite build` sur un typecheck déjà mort.
#
# Chaque phase journalise sa durée : le journal de déploiement indique ainsi
# l'étape lente sans avoir à instrumenter quoi que ce soit.
#
# ── Codegen Convex : pourquoi conditionnel, et pourquoi versionné ───────────
# `convex.json` déclare `"functions": "src/convex/"`, donc les liaisons vivent
# dans `src/convex/_generated/` — cinq fichiers : api.js, api.d.ts,
# dataModel.d.ts, server.js, server.d.ts. 182 fichiers du frontend les
# importent : sans eux, `tsc -b` casse en TS2307 et `vite build` en « Could not
# resolve ».
#
# Ces fichiers sont VOLONTAIREMENT suivis par Git (voir .gitignore) : c'est ce
# que recommande Convex (« should be committed to the repo ») et c'est la seule
# façon dont un checkout propre (GitHub, CI) compile sans identifiants.
#
# La génération ne peut donc pas être inconditionnelle : `convex codegen`
# exige un déploiement joignable (`CONVEX_DEPLOYMENT` + jeton, ou backend local
# démarré). Dans une sandbox de build frontend, il n'y a ni l'un ni l'autre —
# un codegen systématique ferait échouer un build qui n'a besoin de rien. Le
# script ne le lance donc QUE si un des cinq fichiers manque, et dans ce cas il
# affiche l'erreur réelle du CLI (plus de `|| true` qui masquait la cause) au
# lieu de laisser `tsc` échouer 180 fois sur des imports absents.
# ============================================================================

set -eu

CONVEX_GENERATED_DIR="src/convex/_generated"
# Les cinq fichiers produits par `convex codegen` pour ce projet.
CONVEX_GENERATED_FILES="api.js api.d.ts dataModel.d.ts server.js server.d.ts"

log() {
  printf '[build] %s\n' "$*"
}

fail() {
  printf '[build] ÉCHEC : %s\n' "$*" >&2
  exit 1
}

# Binaires locaux : `bun run build` met déjà `node_modules/.bin` dans le PATH,
# mais un appel direct (`sh scripts/build.sh`, CI, plateforme de déploiement) ne
# le fait pas — le build mourait alors en `tsc: not found` (code de sortie 127)
# alors que les paquets étaient bien installés. Les enveloppes de plafond
# mémoire vivent dans ce même dossier : elles restent utilisées.
build_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PATH="$build_root/node_modules/.bin:$PATH"
export PATH

export NODE_OPTIONS="--max-old-space-size=${BB_BUILD_HEAP_MB:-900}${NODE_OPTIONS:+ $NODE_OPTIONS}"

log "NODE_OPTIONS=$NODE_OPTIONS"

# ---------------------------------------------------------------------------
# 0. Binaires requis — diagnostic explicite du code 127
# ---------------------------------------------------------------------------
for bin in tsc vite vitest; do
  command -v "$bin" >/dev/null 2>&1 ||
    fail "binaire « $bin » introuvable dans node_modules/.bin (code 127).
  Les dépendances ne sont pas installées : lancez \`bun install\` à la racine
  du projet, puis relancez \`bun run build\`."
done

# ---------------------------------------------------------------------------
# 1. Codegen Convex — uniquement si les cinq liaisons manquent
# ---------------------------------------------------------------------------
convex_missing=""
for file in $CONVEX_GENERATED_FILES; do
  [ -f "$CONVEX_GENERATED_DIR/$file" ] || convex_missing="$convex_missing $file"
done

if [ -n "$convex_missing" ]; then
  log "liaisons Convex manquantes dans $CONVEX_GENERATED_DIR :$convex_missing"
  log "régénération via « convex codegen --typecheck disable » (le typecheck est fait par tsc -b juste après)"

  if [ -n "${CONVEX_DEPLOY_KEY:-}" ]; then
    fail "CONVEX_DEPLOY_KEY (déploiement preview) ne permet pas \`convex codegen\`.
  Les liaisons doivent être générées en développement puis committées :
  \`bunx convex codegen --typecheck disable\` puis commit de $CONVEX_GENERATED_DIR."
  fi

  if ! command -v convex >/dev/null 2>&1; then
    fail "binaire « convex » introuvable (code 127) : impossible de régénérer
  $CONVEX_GENERATED_DIR. Vérifiez que la dépendance « convex » est installée."
  fi

  codegen_log=$(mktemp 2>/dev/null || echo "/tmp/batibuild-codegen.$$.log")
  codegen_started=$(date +%s)

  if ! convex codegen --typecheck disable >"$codegen_log" 2>&1; then
    # L'erreur réelle du CLI, pas un message générique : c'est elle qui dit
    # s'il manque un déploiement, un jeton, ou si le backend local est absent.
    printf '[build] Erreur réelle de `convex codegen` :\n' >&2
    sed -n '1,40p' "$codegen_log" >&2
    rm -f "$codegen_log"
    fail "convex codegen a échoué (voir la sortie ci-dessus).
  Cause la plus fréquente hors développement : aucun déploiement joignable.
  Les liaisons générées sont du code source : générez-les en développement
  (\`bunx convex codegen --typecheck disable\`) et commitez $CONVEX_GENERATED_DIR."
  fi

  log "convex codegen : $(( $(date +%s) - codegen_started )) s"
  rm -f "$codegen_log"

  # Vérification APRÈS génération : un codegen « réussi » qui ne produit pas
  # les cinq fichiers est un échec, pas un succès.
  still_missing=""
  for file in $CONVEX_GENERATED_FILES; do
    [ -f "$CONVEX_GENERATED_DIR/$file" ] || still_missing="$still_missing $file"
  done
  [ -z "$still_missing" ] ||
    fail "convex codegen s'est terminé sans erreur mais ces fichiers manquent :$still_missing
  Vérifiez « functions » dans convex.json (attendu : \"src/convex/\")."
  log "liaisons Convex régénérées ($CONVEX_GENERATED_FILES)"
else
  log "liaisons Convex présentes ($CONVEX_GENERATED_DIR) — codegen non nécessaire"
fi

# ---------------------------------------------------------------------------
# 2. Typecheck des projets TypeScript (frontend + config Vite)
# ---------------------------------------------------------------------------
phase_started=$(date +%s)
tsc -b
log "tsc -b : $(( $(date +%s) - phase_started )) s"

# ---------------------------------------------------------------------------
# 3. Tests ciblés : abonnements, période d'essai et limites de projets
# ---------------------------------------------------------------------------
BUILD_TEST_FILES="
src/convex/projectLimits.test.ts
src/convex/trialConfig.test.ts
src/convex/subscriptionStatus.test.ts
src/convex/profileSubscription.test.ts
src/convex/adminExpertSubscription.test.ts
src/convex/adminUsersSubscriptionColumn.test.ts
"

for test_file in $BUILD_TEST_FILES; do
  [ -f "$test_file" ] ||
    fail "fichier de test attendu introuvable : $test_file
  Le build refuse de « réussir » en sautant silencieusement un contrôle."
done

phase_started=$(date +%s)
# shellcheck disable=SC2086 # la liste est volontairement éclatée en arguments
vitest run $BUILD_TEST_FILES
log "tests abonnements / limites de projets : $(( $(date +%s) - phase_started )) s"

# ---------------------------------------------------------------------------
# 4. Bundling de production
# ---------------------------------------------------------------------------
phase_started=$(date +%s)
vite build
log "vite build : $(( $(date +%s) - phase_started )) s"
