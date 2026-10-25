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
#   RELEASE_TAG          tag à publier (défaut : v<version>) — ex. v1.3.2 ou v1.3.2-rc1
#   RELEASE_VERSION      expo.version de mobile/app.json (obligatoire)
#   RELEASE_CODE         expo.android.versionCode (obligatoire)
#   RELEASE_PRERELEASE   "true" → Release marquée comme pré-version
#   RELEASE_DRY_RUN      "1" → simulation (identique à --dry-run)
#   DIST_DIR             répertoire des APK/AAB (défaut : /tmp/dist)
#   RELEASE_ASSETS       fichiers à joindre (défaut : APK release + AAB release)
#   GH_TOKEN / GITHUB_TOKEN  jeton avec la permission `contents: write`
#   ARCHITECTURES        ABI compilées, recopiées dans les notes
#   GITHUB_*             fournis automatiquement par GitHub Actions
#
# ── POURQUOI L'API REST ET PLUS `gh release create` ────────────────────────
# L'échec « Publier la Release GitHub » venait du chemin de création : un tag
# `v<version>-build<run>` inexistant, passé à `gh release create --target <sha>`,
# se heurte à trois causes réelles impossibles à distinguer dans les logs :
#   · tag déjà créé côté Git (run relancé / tag poussé à la main) → 422 ;
#   · tag interdit par une règle de protection (Settings → Rules) → 403/422 ;
#   · Release existante sans tag → `--target` ignoré puis « already_exists ».
# La publication passe donc désormais par des appels REST explicites :
#   1. lecture de la Release du tag (404 = à créer, toute autre erreur = arrêt
#      immédiat avec le corps de la réponse, jamais un échec muet) ;
#   2. création CONTRÔLÉE du tag Git sur le commit du run s'il manque ;
#   3. création de la Release, ou mise à jour si elle existe déjà ;
#   4. envoi des fichiers joints par `gh release upload --clobber` (3 tentatives)
#      → aucun doublon, jamais de 422 « already_exists », hôte de téléversement
#      géré par l'outil officiel ;
#   5. vérification par l'API : les DEUX fichiers sont présents, leur taille
#      correspond EXACTEMENT au fichier local, et leur état est « uploaded ».
# Le script est IDEMPOTENT et refuse de publier un tag qui ne correspond pas à
# la version compilée (aucune Release trompeuse du type tag v1.4.0 / APK 1.3.2).
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
    -h | --help)
      sed -n '2,48p' "$0"
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
case "${RELEASE_PRERELEASE:-}" in
  true | false) PRERELEASE="${RELEASE_PRERELEASE}" ;;
  "") case "$TAG" in *-*) PRERELEASE="true" ;; *) PRERELEASE="false" ;; esac ;;
  *) fail "RELEASE_PRERELEASE doit valoir true ou false (reçu : ${RELEASE_PRERELEASE})." ;;
esac
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

# Taille exacte en octets (portable Linux / macOS).
file_size() {
  wc -c < "$1" | tr -d ' \r\n'
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
echo "  fichiers        : ${ASSETS[*]}"
for f in "${ASSETS[@]}"; do
  echo "    · $(basename "$f") — $(file_size "$f") octets"
done

if [ "$DRY_RUN" = "1" ]; then
  echo ""
  echo "✅ --dry-run : plan validé (tag cohérent avec app.json, fichiers présents). Rien n'a été publié."
  exit 0
fi

[ -n "$TOKEN" ] || fail "GH_TOKEN (ou GITHUB_TOKEN) absente : permission « contents: write » requise."
command -v gh >/dev/null 2>&1 || fail "« gh » (GitHub CLI) introuvable : il est préinstallé sur les runners GitHub."
[ -n "$REPO" ] || fail "GITHUB_REPOSITORY absente : impossible de cibler le dépôt."

API_ERR=$(mktemp)
NOTES=$(mktemp)
API_JSON=$(mktemp)
cleanup() { rm -f "$API_ERR" "$NOTES" "$API_JSON"; }
trap cleanup EXIT

# Extrait une valeur d'un JSON (chemin pointé) sans dépendre de jq.
json_get() {
  node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      let v;
      try { v = JSON.parse(s); } catch { process.exit(1); }
      for (const k of process.argv[1].split(".")) v = v == null ? undefined : v[k];
      if (v == null) process.exit(1);
      process.stdout.write(String(v));
    });
  ' "$1"
}

# ── 3. Notes de version (publiées avec les fichiers) ─────────────────────────
RUN_URL="${SERVER}/${REPO}/actions/runs/${GITHUB_RUN_ID:-0}"
RELEASE_TITLE="batibuild ${VERSION} (versionCode ${CODE})"
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

# ── 4. La Release du tag existe-t-elle déjà ? ────────────────────────────────
# 404 = à créer. Toute AUTRE erreur (403 jeton, 5xx, dépôt inconnu) arrête
# immédiatement le script avec le corps exact de la réponse : plus jamais de
# « aucun stockage permanent » sans cause affichée.
RELEASE_ID=""
RELEASE_EXISTS="0"
if gh api "repos/${REPO}/releases/tags/${TAG}" >"$API_JSON" 2>"$API_ERR"; then
  RELEASE_ID=$(json_get id <"$API_JSON" || true)
  [ -n "$RELEASE_ID" ] || fail "la Release « ${TAG} » existe mais l'API n'a pas renvoyé d'identifiant exploitable."
  RELEASE_EXISTS="1"
  echo "Release « ${TAG} » déjà présente (id ${RELEASE_ID}) → mise à jour des fichiers joints."
else
  ERR=$(cat "$API_ERR")
  case "$ERR" in
    *"HTTP 404"* | *"Not Found"*) echo "Release « ${TAG} » absente → création." ;;
    *)
      fail "lecture de la Release « ${TAG} » impossible :
${ERR}
   → jeton sans « contents: write » (403), dépôt ou URL d'API incorrects,
     ou API GitHub momentanément indisponible. Aucun fichier n'a été publié."
      ;;
  esac
fi

# ── 5. Tag Git : création contrôlée s'il n'existe pas ────────────────────────
# Un tag manquant est la première cause de 422 à la création d'une Release.
# On le crée donc explicitement sur le commit du run, AVANT la Release.
if ! gh api "repos/${REPO}/git/ref/tags/${TAG}" >/dev/null 2>"$API_ERR"; then
  ERR=$(cat "$API_ERR")
  case "$ERR" in
    *"HTTP 404"* | *"Not Found"*)
      [ -n "${GITHUB_SHA:-}" ] || fail "GITHUB_SHA absente : impossible de créer le tag « ${TAG} »."
      if ! gh api --method POST "repos/${REPO}/git/refs" \
        -f "ref=refs/tags/${TAG}" \
        -f "sha=${GITHUB_SHA}" >/dev/null 2>"$API_ERR"; then
        fail "création du tag Git « ${TAG} » impossible :
$(cat "$API_ERR")
   → une règle de protection de tags (Settings → Rules) peut interdire la
     création de tags, ou le commit ${GITHUB_SHA:0:7} n'est plus accessible."
      fi
      echo "Tag Git « ${TAG} » créé sur ${GITHUB_SHA:0:7}."
      ;;
    *)
      fail "lecture du tag « ${TAG} » impossible :
${ERR}"
      ;;
  esac
else
  echo "Tag Git « ${TAG} » déjà présent."
fi

# ── 6. Création / mise à jour de la Release ──────────────────────────────────
if [ "$RELEASE_EXISTS" = "0" ]; then
  if ! gh api --method POST "repos/${REPO}/releases" \
    -f "tag_name=${TAG}" \
    -f "target_commitish=${GITHUB_SHA:-main}" \
    -f "name=${RELEASE_TITLE}" \
    -F "body=@${NOTES}" \
    -F "draft=false" \
    -F "prerelease=${PRERELEASE}" >"$API_JSON" 2>"$API_ERR"; then
    fail "la GitHub Release « ${TAG} » n'a pas pu être créée :
$(cat "$API_ERR")
   → causes réelles possibles : jeton sans « contents: write » (403), règle de
     protection du tag (403/422), limite de taille des fichiers, ou API
     indisponible. Aucun fichier n'a été publié."
  fi
  RELEASE_ID=$(json_get id <"$API_JSON" || true)
  [ -n "$RELEASE_ID" ] || fail "la Release « ${TAG} » a été créée mais son identifiant est introuvable."
  echo "Release « ${TAG} » créée (id ${RELEASE_ID})."
else
  if ! gh api --method PATCH "repos/${REPO}/releases/${RELEASE_ID}" \
    -f "name=${RELEASE_TITLE}" \
    -F "body=@${NOTES}" \
    -F "prerelease=${PRERELEASE}" >"$API_JSON" 2>"$API_ERR"; then
    fail "mise à jour de la Release « ${TAG} » impossible :
$(cat "$API_ERR")
   → jeton sans « contents: write » (403) ou Release verrouillée par une règle."
  fi
  echo "Release « ${TAG} » mise à jour (titre, notes, pré-version)."
fi

# ── 7. Fichiers joints : remplacement sans doublon, avec reprise ──────────────
list_assets() {
  gh api "repos/${REPO}/releases/${RELEASE_ID}/assets?per_page=100" \
    --jq '.[] | "\(.id)\t\(.name)\t\(.size)\t\(.state)"' 2>"$API_ERR"
}

# Téléversement d'un actif : `gh release upload` est la SEULE voie qui gère
# correctement l'hôte de téléversement (uploads.github.com), les gros fichiers
# et le remplacement d'un actif homonyme (`--clobber`). Un appel REST maison
# avec `--hostname uploads.github.com` construisait une URL d'API erronée
# (`.../api/v3/...`) et échouait sans explication utile.
# Toute erreur réelle de l'API est capturée et affichée par l'appelant.
upload_asset() {
  local file="$1"
  gh release upload "$TAG" "$file" --clobber --repo "$REPO" >/dev/null 2>"$API_ERR"
}

EXISTING=$(list_assets || true)

for f in "${ASSETS[@]}"; do
  NAME=$(basename "$f")
  LOCAL_SIZE=$(file_size "$f")
  [ "$LOCAL_SIZE" -gt 0 ] || fail "le fichier ${NAME} est vide : publication refusée."

  # Actif homonyme (run relancé) : signalé, puis remplacé par `--clobber` —
  # jamais de doublon, jamais de 422 « already_exists ».
  if [ -n "$EXISTING" ] && printf '%s\n' "$EXISTING" | awk -F'\t' -v n="$NAME" '$2 == n { f=1 } END { exit !f }'; then
    echo "Actif existant « ${NAME} » → remplacement (--clobber)."
  fi

  UPLOADED="0"
  for attempt in 1 2 3; do
    if upload_asset "$f"; then
      UPLOADED="1"
      break
    fi
    echo "⚠️  Tentative ${attempt}/3 échouée pour ${NAME} :"
    sed 's/^/     /' "$API_ERR" || true
    if [ "$attempt" -lt 3 ]; then sleep $((attempt * 5)); fi
  done
  [ "$UPLOADED" = "1" ] || fail "le téléversement de ${NAME} a échoué après 3 tentatives (cause ci-dessus).
   Causes réelles les plus fréquentes : jeton sans « contents: write » (403),
   tag protégé par une règle (403/422), fichier trop volumineux, ou API
   momentanément indisponible.
   Aucune copie durable n'existe : la Release ne contient pas les 2 fichiers."
  echo "✅ ${NAME} téléversé (${LOCAL_SIZE} octets)."
done

# ── 8. VÉRIFICATION RÉELLE : les DEUX fichiers, à la bonne taille ────────────
# On ne déclare jamais un build publié sans preuve : l'API doit lister
# `Batibuild-release.apk` ET `Batibuild-release.aab`, à l'état « uploaded » et
# avec une taille identique à celle du fichier local (un actif tronqué, remplacé
# par un autre fichier ou jamais finalisé est donc détecté ici).
RELEASE_JSON_URL=$(gh api "repos/${REPO}/releases/${RELEASE_ID}" --jq '.html_url' 2>"$API_ERR" || true)
LISTING=$(list_assets)
if [ -z "$LISTING" ]; then
  fail "la Release « ${TAG} » existe mais l'API GitHub ne liste aucun fichier joint."
fi

VERIFY_FAILED=0
for f in "${ASSETS[@]}"; do
  NAME=$(basename "$f")
  LOCAL_SIZE=$(file_size "$f")
  ROW=$(printf '%s\n' "$LISTING" | awk -F'\t' -v n="$NAME" '$2 == n { print; exit }')
  if [ -z "$ROW" ]; then
    echo "❌ ${NAME} absent de la Release « ${TAG} »"
    VERIFY_FAILED=1
    continue
  fi
  R_SIZE=$(printf '%s' "$ROW" | cut -f3)
  R_STATE=$(printf '%s' "$ROW" | cut -f4)
  if [ "$R_STATE" != "uploaded" ]; then
    echo "❌ ${NAME} : état « ${R_STATE} » (attendu « uploaded »)"
    VERIFY_FAILED=1
  elif [ "${R_SIZE:-0}" != "$LOCAL_SIZE" ]; then
    echo "❌ ${NAME} : taille publiée ${R_SIZE} octets ≠ locale ${LOCAL_SIZE} octets"
    VERIFY_FAILED=1
  else
    echo "✅ ${NAME} — ${R_SIZE} octets, état « uploaded » (identique au fichier local)."
  fi
done
if [ "$VERIFY_FAILED" = "1" ]; then
  echo "Fichiers listés par la Release « ${TAG} » :"
  printf '%s\n' "$LISTING"
  fail "les deux fichiers attendus ne sont pas correctement attachés à la Release « ${TAG} ».
   La publication n'est PAS considérée comme réussie."
fi

# Liens directs (téléchargement navigateur, stables pour un tag donné).
DOWNLOAD_BASE="${SERVER}/${REPO}/releases/download/${TAG}"
APK_URL="${DOWNLOAD_BASE}/Batibuild-release.apk"
AAB_URL="${DOWNLOAD_BASE}/Batibuild-release.aab"
URL="${RELEASE_JSON_URL:-${SERVER}/${REPO}/releases/tag/${TAG}}"

# ── 9. Restitution (sortie du workflow + résumé du run) ──────────────────────
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "url=${URL}"
    echo "release_id=${RELEASE_ID}"
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
    echo "Tailles vérifiées via l'API GitHub (identiques aux fichiers compilés)."
    echo "Cette copie est conservée **hors du quota d'artefacts** : elle reste"
    echo "disponible après l'expiration de l'artefact du run."
  } >> "$GITHUB_STEP_SUMMARY"
fi

echo "✅ Release publiée : ${URL}"
echo "   APK : ${APK_URL}"
echo "   AAB : ${AAB_URL}"
echo "   Fichiers joints : ${ASSETS[*]}"
echo "   Ce build reste téléchargeable même après expiration de l'artefact du run."
