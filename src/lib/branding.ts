// ============================================================================
// IDENTITÉ DE MARQUE — POINT D'ENTRÉE DU CLIENT
// ----------------------------------------------------------------------------
// Nom officiel : « batibuild ».
// Logo officiel : la tuile verte (#059669) au casque de chantier blanc déjà
// présente dans les assets de la plateforme (`src/assets/logo.png`, identique
// à l'icône de l'application mobile). Aucun logo n'est redessiné et aucune
// icône Lucide ne doit être utilisée comme logo.
//
// Tous les modules de l'interface (e-mails, PDF, pages) importent le nom et le
// logo depuis CE fichier plutôt que de les redéfinir localement.
//
// Les valeurs pures (nom, couleurs, logo en data URL) vivent dans
// `./brandCore.ts`, importable par le backend ; ce fichier ajoute uniquement
// l'URL de l'asset construite par le bundler Vite, réservée au navigateur.
// ============================================================================

import logoUrl from "@/assets/logo.png";

export * from "./brandCore";

/** Logo officiel — URL utilisable dans `<img src>` (hashée par le bundler). */
export const BRAND_LOGO_SRC = logoUrl;
