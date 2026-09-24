// ============================================================================
// IDENTITÉ DE MARQUE — SOURCE UNIQUE
// ----------------------------------------------------------------------------
// Nom officiel : « batibuild ».
// Logo officiel : la tuile verte (#059669) au casque de chantier blanc déjà
// présente dans les assets de la plateforme (`src/assets/logo.png`, identique
// à l'icône de l'application mobile). Aucun logo n'est redessiné et aucune
// icône Lucide ne doit être utilisée comme logo.
//
// Tous les modules (interface, e-mails, PDF, mobile) doivent importer le nom
// et le logo depuis CE fichier plutôt que de les redéfinir localement.
// ============================================================================

import logoDataUrl from "@/assets/logo.png?inline";
import logoUrl from "@/assets/logo.png";

/** Nom officiel de la plateforme (toujours en minuscules). */
export const BRAND_NAME = "batibuild";

/** Logo officiel — URL utilisable dans `<img src>` (hashée par le bundler). */
export const BRAND_LOGO_SRC = logoUrl;

/** Logo officiel — chemin public stable (favicons, manifeste, partages). */
export const BRAND_LOGO_PATH = "/batibuild-logo.png";

/** Logo officiel — data URL (exporté en base64) pour la génération des PDF. */
export const BRAND_LOGO_DATA_URL = logoDataUrl;

/** Vert de marque (emerald-600, ≈ --primary de l'application). */
export const BRAND_RGB: [number, number, number] = [5, 150, 105];

/** Vert de marque en hexadécimal (#059669). */
export const BRAND_PRIMARY_HEX = "#059669";

/** Signature institutionnelle affichée sous le logo dans les rapports PDF. */
export const BRAND_TAGLINE = "Estimation de coûts de construction — Tunisie 2026";

/**
 * Nom de marque avec suffixe optionnel : `brandTitle("Plateforme")`
 * → « batibuild Plateforme ».
 */
export function brandTitle(suffix?: string): string {
  return suffix ? `${BRAND_NAME} ${suffix}` : BRAND_NAME;
}

/**
 * Titre SEO / document : `seoTitle("Connexion")` → « Connexion - batibuild ».
 */
export function seoTitle(page?: string): string {
  return page ? `${page} - ${BRAND_NAME}` : `${BRAND_NAME} - Estimation Construction Tunisie`;
}

/** Phrase de contact standard utilisée dans les e-mails. */
export const BRAND_SIGNATURE = `L'équipe ${BRAND_NAME}`;
