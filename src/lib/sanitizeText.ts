// ============================================================================
// NETTOYAGE DE TEXTE — suppression des caractères chinois / CJK
//
// Des données de profils experts ont été enregistrées avec des caractères
// chinois (contenu parasite / corrompu). Ces utilitaires nettoient :
//   1. à l'écriture  — mutations backend (createProfile / updateProfile)
//   2. à la lecture  — affichage (fiche publique, annuaire, dashboard)
// ============================================================================

/** Plages Unicode : idéogrammes chinois, kana japonais, hangul coréen,
 *  ponctuation et symboles pleine largeur CJK, claviers bopomofo. */
const CJK_RE = /[\u1100-\u11FF\u2E80-\u2EFF\u2F00-\u2FDF\u3000-\u303F\u3040-\u30FF\u3105-\u312F\u3130-\u318F\u3190-\u319F\u31A0-\u31BF\u31C0-\u31EF\u31F0-\u31FF\u3200-\u9FFF\uA960-\uA97F\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/g;

/**
 * Supprime tous les caractères chinois/CJK d'une chaîne puis normalise les
 * espaces. Les caractères latins, accents français, chiffres et ponctuation
 * courante sont préservés.
 */
export function stripCjk(input: string | undefined | null): string {
  if (!input) return "";
  return input.replace(CJK_RE, "").replace(/[ \t]{2,}/g, " ").trim();
}

/** Nettoie une liste de chaînes : CJK retirés, trim, vides supprimés, doublons fusionnés. */
export function sanitizeStringList(input: string[] | undefined | null): string[] {
  if (!input) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const value = stripCjk(raw);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}
