#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# BatiBuild Mobile — exécution d'une tâche Gradle en intégration continue.
#
# Usage : bash scripts/ci-gradle.sh <tâche-gradle> [nom-du-log]
#   ex  : bash scripts/ci-gradle.sh :app:assembleDebug debug
#
# Le script :
#   1. affiche l'espace disque et la mémoire disponibles ;
#   2. exécute la tâche via le wrapper du dépôt (aucun Gradle global requis) ;
#   3. en cas d'échec, extrait et affiche LA PREMIÈRE ERREUR RÉELLE
#      (section « What went wrong ») au lieu du pavé de stacktrace Java,
#      puis la reporte dans le résumé du run.
#
# AUCUNE erreur n'est masquée : le script sort avec le code retour de Gradle.
# ---------------------------------------------------------------------------
set -o pipefail

TASK="${1:?usage: ci-gradle.sh <gradle-task> [log-name]}"
NAME="${2:-build}"
LOG="/tmp/gradle-${NAME}.log"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/android" || exit 1

echo "────────────────────────────────────────────────────────────"
echo "Tâche Gradle : $TASK"
echo "ABI          : ${ARCHITECTURES:-<défaut du projet>}"
echo "Log complet  : $LOG"
echo "── Espace disque ──"
df -h / | tail -1
echo "── Mémoire ──"
free -m | head -2
echo "────────────────────────────────────────────────────────────"

./gradlew "$TASK" \
  -PreactNativeArchitectures="${ARCHITECTURES:-arm64-v8a,armeabi-v7a}" \
  --console=plain --stacktrace 2>&1 | tee "$LOG"
STATUS=${PIPESTATUS[0]}

if [ "$STATUS" -eq 0 ]; then
  echo "✅ $TASK : terminé avec succès."
  exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "❌ $TASK a échoué (code $STATUS) — CAUSE RÉELLE :"
echo "════════════════════════════════════════════════════════════"
sed -n '/What went wrong/,/^\* Try:/p' "$LOG" | head -60
echo "────────────────────────────────────────────────────────────"
echo "Tâches en échec :"
grep -E "^> Task .*FAILED" "$LOG" | head -5
echo "────────────────────────────────────────────────────────────"
echo "Signatures connues (mémoire, disque, compilateur, CMake) :"
grep -n -E "OutOfMemoryError|Java heap space|Killed|No space left on device|ninja: build stopped|CMake Error|e: file|FAILURE: Build failed" "$LOG" | head -15
echo "────────────────────────────────────────────────────────────"
echo "Espace disque après échec :"
df -h / | tail -1
echo "Mémoire après échec :"
free -m | head -2
echo "════════════════════════════════════════════════════════════"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### ❌ \`$TASK\` a échoué"
    echo ""
    echo '```text'
    sed -n '/What went wrong/,/^\* Try:/p' "$LOG" | head -30
    echo '```'
  } >> "$GITHUB_STEP_SUMMARY"
fi

exit "$STATUS"
