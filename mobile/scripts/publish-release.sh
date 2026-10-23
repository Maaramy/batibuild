#!/usr/bin/env bash
#
# PUBLICATION D'UNE GITHUB RELEASE — batibuild Mobile.
#
# Objectif : conserver durablement les APK/AAB d'une version SANS consommer le
# quota d'artefacts GitHub Actions. Le stockage des Releases (fichiers attachés
# à un tag) est distinct et bien plus large que celui des artefacts : un build
# versionné y reste disponible sans limite de 90 jours.
#
# Utilisation (dans le workflow Android, après le build) :
#
#   GH_TOKEN=... RELEASE_TAG=v1.3.2 RELEASE_VERSION=1.3.2 RELEASE_CODE=12 \
#     bash scripts/publish-release.sh
#
#   bash scripts/publish-release.sh --dry-run     # valide et affiche le plan, ne publie rien
#
# Variables d'environnement :
#   RELEASE_TAG          tag à publier (obligatoire) — ex. v1.3.2 ou v1.3.2-rc1
#   RELEASE_VERSION      expo.version de mobile/app.json (obligatoire)
#   RELEASE_CODE         expo.android.versionCode (obligatoire)
#   RELEASE_PRERELEASE   "true" → Release marquée comme pré-version
#   RELEASE_TARGET_IS_TAG "true" → le tag existe déjà côté Git (ne pas passer --target)
#   RELEASE_DRY_RUN      "1" → simulation (identique à --dry-run)
#   DIST_DIR             répertoire des APK/AAB (défaut : /tmp/dist)
#   RELEASE_ASSETS       fichiers à joindre (défaut : APK release + AAB release)
#   GH_TOKEN / GITHUB_TOKEN  jeton avec la permission `contents: write`
#   ARCHITECTURES        ABI compilées, recopiées dans les notes
#   GITHUB_*             fournis automatiquement par GitHub Actions
#
# Le script est IDEMPOTENT : relancer le workflow sur le même tag met à jour les
# fichiers joints (--clobber) au lieu d'échouer sur « release already exists ».
# Il refuse de publier un tag qui ne correspond pas à la version compilée, pour
# qu'aucune Release trompeuse (tag v1.4.0 contenant l'APK 1.3.2) n'existe.
#
set -euo pipefail

fail() {
  echo "❌ $*" >&2
  exit 1
}

DRY_RUN="${RELEASE_DRY_RUN:-}"
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="1" ;;
    -h|--help)
      sed -n '2,32p' "$0"
      exit 0
      ;;
    *)
      echo "Argument inconnu : $arg (essayez --help)" >&2
      exit 2
      ;;
  esac
done
case "$DRY_RUN" in 1 | true | yes) DRY_RUN="1" ;; *) DRY_RUN="" ;; esac

# app.json de la coque native : sert de repli pour version / versionCode quand le
# script est lancé à la main (en CI, le workflow les fournit toujours).
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
APP_JSON="${APP_JSON:-$(cd "${SCRIPT_DIR}/.." && pwd)/app.json}"

read_app_json() {
  command -v node >/dev/null 2>&1 || fail "node est requis pour lire $(basename "$APP_JSON")."
  node -p "require('${APP_JSON}').expo$1" 2>/dev/null || fail "impossible de lire expo${1} dans ${APP_JSON}."
}

TAG="${RELEASE_TAG:-}"
VERSION="${RELEASE_VERSION:-}"
CODE="${RELEASE_CODE:-}"
if [ -z "$VERSION" ]; then VERSION=$(read_app_json '.version'); fi
if [ -z "$CODE" ]; then CODE=$(read_app_json '.android.versionCode'); fi
if [ -z "$TAG" ]; then
  TAG="v${VERSION}"
  echo "RELEASE_TAG non fourni → tag déduit : ${TAG}"
fi
PRERELEASE="${RELEASE_PRERELEASE:-false}"
TARGET_IS_TAG="${RELEASE_TARGET_IS_TAG:-}"
if [ -z "$TARGET_IS_TAG" ]; then
  # Déduit de l'événement : un tag poussé existe déjà, un lancement manuel non.
  if [ "${GITHUB_REF_TYPE:-}" = "tag" ]; then TARGET_IS_TAG="true"; else TARGET_IS_TAG="false"; fi
fi
DIST_DIR="${DIST_DIR:-/tmp/dist}"

TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
SERVER="${GITHUB_SERVER_URL:-https://github.com}"
REPO="${GITHUB_REPOSITORY:-}"

# APK release + AAB release uniquement : l'APK debug n'est ni produit ni publié
# (il ne ferait que gonfler le stockage, et la clé debug suffit déjà à signer la
# release quand aucun secret keystore n'est fourni).
DEFAULT_ASSETS=(
  "${DIST_DIR}/Batibuild-release.apk"
  "${DIST_DIR}/Batibuild-release.aab"
)
if [ -n "${RELEASE_ASSETS:-}" ]; then
  # shellcheck disable=SC2206
  ASSETS=(${RELEASE_ASSETS})
else
  ASSETS=("${DEFAULT_ASSETS[@]}")
fi

# ── 1. Cohérence tag ↔ version compilée ──────────────────────────────────────
# Un tag v1.4.0 qui publie l'APK 1.3.2 induirait en erreur : refus explicite.
if [ -z "$TAG" ]; then
  fail "RELEASE_TAG manquant : aucun tag à publier."
fi
case "$TAG" in
  "v${VERSION}" | "v${VERSION}"-* | "v${VERSION}"+*) ;;
  *)
    fail "le tag « ${TAG} » ne correspond pas à mobile/app.json (version ${VERSION}).
   Mettez à jour expo.version / expo.android.versionCode, committez, puis recréez le tag."
    ;;
esac

# ── 2. Fichiers à joindre ────────────────────────────────────────────────────
MISSING=0
for f in "${ASSETS[@]}"; do
  if [ ! -s "$f" ]; then
    echo "⚠️  Fichier manquant ou vide : $f"
    MISSING=1
  fi
done
if [ "$MISSING" = "1" ]; then
  echo "⏭️  Build incomplet : aucune Release publiée (le job de build est déjà en échec)."
  exit 0
fi

human_size() {
  if command -v du >/dev/null 2>&1; then
    du -h "$1" | cut -f1
  else
    ls -lh "$1" | awk '{print $5}'
  fi
}

checksums() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$@"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$@"
  else
    echo "(sha256 indisponible sur ce système)"
  fi
}

echo "Release à publier : ${TAG}"
echo "  version         : ${VERSION} (versionCode ${CODE})"
echo "  pré-version     : ${PRERELEASE}"
echo "  tag déjà créé   : ${TARGET_IS_TAG}"
echo "  fichiers        : ${ASSETS[*]}"

if [ "$DRY_RUN" = "1" ]; then
  echo ""
  echo "✅ --dry-run : plan validé (tag cohérent avec app.json, fichiers présents). Rien n'a été publié."
  exit 0
fi

[ -n "$TOKEN" ] || fail "GH_TOKEN (ou GITHUB_TOKEN) absente : permission « contents: write » requise."
command -v gh >/dev/null 2>&1 || fail "« gh » (GitHub CLI) introuvable : il est préinstallé sur les runners GitHub."

# ── 3. Notes de version (publiées avec les fichiers) ─────────────────────────
NOTES=$(mktemp)
trap 'rm -f "$NOTES"' EXIT
RUN_URL="${SERVER}/${REPO}/actions/runs/${GITHUB_RUN_ID:-0}"
{
  echo "## batibuild ${VERSION} (versionCode ${CODE})"
  echo ""
  echo "Build Android automatique — commit \`${GITHUB_SHA:0:7}\`, run [#${GITHUB_RUN_NUMBER:-0}](${RUN_URL})."
  echo ""
  echo "Cette Release conserve les APK/AAB **hors du quota d'artefacts** GitHub Actions."
  echo ""
  echo "| Fichier | Rôle | Taille |"
  echo "|---|---|---|"
  echo "| \`Batibuild-release.apk\` | APK signé, à installer sur un téléphone | $(human_size "${DIST_DIR}/Batibuild-release.apk") |"
  echo "| \`Batibuild-release.aab\` | App Bundle pour Google Play Console | $(human_size "${DIST_DIR}/Batibuild-release.aab") |"
  echo ""
  echo "ABI compilées : \`${ARCHITECTURES:-non précisées}\`"
  echo ""
  echo "### Installation"
  echo ""
  echo '```'
  echo "adb install -r Batibuild-release.apk"
  echo '```'
  echo ""
  echo "> Google Play n'accepte que \`Batibuild-release.aab\`."
  echo ""
  echo "### Empreintes SHA-256"
  echo ""
  echo '```'
  (cd "$DIST_DIR" && checksums "${ASSETS[@]##*/}")
  echo '```'
} > "$NOTES"

# ── 4. Création / mise à jour de la Release ──────────────────────────────────
FLAGS=()
if [ "$PRERELEASE" = "true" ]; then
  FLAGS+=(--prerelease)
fi
if [ "$TARGET_IS_TAG" != "true" ]; then
  # Le tag n'existe pas encore (lancement manuel) : il est créé sur ce commit.
  FLAGS+=(--target "${GITHUB_SHA:?GITHUB_SHA requis pour créer le tag}")
fi

if gh release view "$TAG" >/dev/null 2>&1; then
  # Release (ou tag déjà publié) : on remplace les fichiers joints, jamais de
  # doublon d'actif (--clobber supprime l'ancien avant d'ajouter le nouveau).
  echo "Release « ${TAG} » déjà présente → mise à jour des fichiers joints (--clobber)."
  if ! gh release upload "$TAG" "${ASSETS[@]}" --clobber; then
    fail "la mise à jour des fichiers de la Release « ${TAG} » a échoué.
   Causes habituelles : jeton sans « contents: write », tag protégé par une
   règle du dépôt, ou coupure réseau. Le message de l'API ci-dessus est la cause exacte."
  fi
else
  if ! gh release create "$TAG" "${ASSETS[@]}" \
    --title "batibuild ${VERSION} (versionCode ${CODE})" \
    --notes-file "$NOTES" \
    "${FLAGS[@]}"; then
    fail "la GitHub Release « ${TAG} » n'a pas pu être créée.
   Causes habituelles : jeton sans « contents: write », tag déjà existant sans
   Release correspondante, tag protégé, ou limite de taille des fichiers.
   Le message de l'API ci-dessus est la cause exacte."
  fi
fi

URL=$(gh release view "$TAG" --json url --jq .url)

# ── 5. VÉRIFICATION RÉELLE : les DEUX fichiers sont-ils attachés ? ───────────
# On ne déclare jamais un build publié sans preuve : l'API GitHub doit lister
# `Batibuild-release.apk` ET `Batibuild-release.aab` avec une taille > 0.
# La sonde est indépendante de la commande d'upload : un upload « réussi » mais
# incomplet (actif ignoré, tronqué) est donc détecté ici.
ASSETS_JSON=$(gh release view "$TAG" --json assets --jq '.assets[] | "\(.name) \(.size)"' 2>/dev/null || true)
if [ -z "$ASSETS_JSON" ]; then
  fail "la Release « ${TAG} » existe mais l'API GitHub ne liste aucun fichier joint."
fi
APK_SIZE=$(printf '%s\n' "$ASSETS_JSON" | awk '$1 == "Batibuild-release.apk" { print $2 }' | head -1)
AAB_SIZE=$(printf '%s\n' "$ASSETS_JSON" | awk '$1 == "Batibuild-release.aab" { print $2 }' | head -1)
APK_SIZE=${APK_SIZE:-0}
AAB_SIZE=${AAB_SIZE:-0}
if [ "$APK_SIZE" -le 0 ] || [ "$AAB_SIZE" -le 0 ]; then
  echo "Fichiers listés par la Release « ${TAG} » :"
  printf '%s\n' "$ASSETS_JSON"
  fail "les deux fichiers attendus ne sont pas attachés à la Release « ${TAG} »
   (Batibuild-release.apk = ${APK_SIZE} octets, Batibuild-release.aab = ${AAB_SIZE} octets).
   La publication n'est PAS considérée comme réussie."
fi
echo "✅ Fichiers vérifiés dans la Release :"
echo "   · Batibuild-release.apk  (${APK_SIZE} octets)"
echo "   · Batibuild-release.aab  (${AAB_SIZE} octets)"

# Liens directs (téléchargement navigateur, stables pour un tag donné).
DOWNLOAD_BASE="${SERVER}/${REPO}/releases/download/${TAG}"
APK_URL="${DOWNLOAD_BASE}/Batibuild-release.apk"
AAB_URL="${DOWNLOAD_BASE}/Batibuild-release.aab"

# ── 6. Restitution (sortie du workflow + résumé du run) ──────────────────────
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "url=${URL}"
    echo "apk_name=Batibuild-release.apk"
    echo "apk_url=${APK_URL}"
    echo "aab_name=Batibuild-release.aab"
    echo "aab_url=${AAB_URL}"
    echo "published=true"
  } >> "$GITHUB_OUTPUT"
fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo ""
    echo "## 📦 GitHub Release publiée"
    echo ""
    echo "**${TAG}** — APK release et AAB release attachés : [voir la Release](${URL})"
    echo ""
    echo "| Fichier | Lien direct |"
    echo "|---|---|"
    echo "| APK release (téléphone) | [Batibuild-release.apk](${APK_URL}) |"
    echo "| AAB release (Google Play) | [Batibuild-release.aab](${AAB_URL}) |"
    echo ""
    echo "Cette copie est conservée **hors du quota d'artefacts** : elle reste"
    echo "disponible après l'expiration de l'artefact du run."
  } >> "$GITHUB_STEP_SUMMARY"
fi

echo "✅ Release publiée : ${URL}"
echo "   APK : ${APK_URL}"
echo "   AAB : ${AAB_URL}"
echo "   Fichiers joints : ${ASSETS[*]}"
echo "   Ce build reste téléchargeable même après expiration de l'artefact du run."
