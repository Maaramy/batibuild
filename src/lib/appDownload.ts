// ============================================================================
// TÉLÉCHARGEMENT DE L'APPLICATION ANDROID batibuild.
//
// Le lien officiel du fichier de l'application Android est défini ICI, en un
// seul endroit : l'interface ne l'écrit jamais en dur et ne l'affiche jamais.
//
// Le lien fourni par l'éditeur est la page de partage Google Drive
// (`/file/d/<id>/view?usp=drivesdk`). Elle ouvre une page intermédiaire inutile
// avant le téléchargement : le lien réellement utilisé est donc la forme
// « téléchargement direct » du même fichier
// (`/uc?export=download&id=<id>`), qui déclenche le téléchargement dès le clic
// — jamais automatiquement, toujours après une action de l'utilisateur.
// ============================================================================

/** Identifiant du fichier officiel de l'application Android (Google Drive). */
export const ANDROID_APP_FILE_ID = "1RlqfsjwysJiywPkz-WCPIXM5d7U8Ko6Y";

/**
 * Lien de partage officiel fourni par l'éditeur (page Google Drive).
 * Conservé comme référence : ce n'est PAS la cible des clics des bannières.
 */
export const ANDROID_APP_SHARE_URL = `https://drive.google.com/file/d/${ANDROID_APP_FILE_ID}/view?usp=drivesdk`;

/**
 * Lien de TÉLÉCHARGEMENT DIRECT du même fichier : la cible des clics des
 * bannières de téléchargement (icône batibuild, icône Google Play, zone
 * principale et bouton).
 */
export const ANDROID_APP_DOWNLOAD_URL = `https://drive.google.com/uc?export=download&id=${ANDROID_APP_FILE_ID}`;
