// ============================================================================
// IDENTITÉ DE MARQUE — VALEURS PURES (client ET backend)
// ----------------------------------------------------------------------------
// Source unique du nom, du logo et des couleurs officielles de batibuild.
//
// Ce module ne contient QUE des valeurs et des fonctions pures : il est donc
// importable aussi bien par l'interface Web que par les fonctions Convex
// (« use node ») qui génèrent la facture PDF jointe aux e-mails. C'est
// indispensable : une action Node ne peut pas résoudre les imports d'assets du
// bundler Vite (`@/assets/logo.png`, suffixe `?inline`), qui vivent dans
// `./branding.ts` — réservé au client.
//
// Aucun logo n'est redessiné : le logo officiel est celui de
// `src/assets/logo.png` (voir `./brandLogo.ts`), identique à l'icône de
// l'application mobile.
// ============================================================================

export { BRAND_LOGO_DATA_URL } from "./brandLogo";

/** Nom officiel de la plateforme (toujours en minuscules). */
export const BRAND_NAME = "batibuild";

/** Logo officiel — chemin public stable (favicons, manifeste, partages). */
export const BRAND_LOGO_PATH = "/batibuild-logo.png";

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
