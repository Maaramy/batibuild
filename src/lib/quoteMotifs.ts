// ============================================================================
// MOTIFS DE DEMANDE DE DEVIS FOURNISSEUR
//
// Liste unique et partagée des motifs proposés au client. Aucune valeur n'est
// codée en dur ailleurs : le formulaire, la validation serveur et l'affichage
// en messagerie s'appuient tous sur cette source.
// ============================================================================

export const QUOTE_MOTIFS = [
  { key: "prix_materiaux", label: "Prix pour achat de matériaux" },
  { key: "devis_projet_construction", label: "Devis projet de construction" },
  { key: "devis_renovation", label: "Devis rénovation" },
  { key: "devis_approvisionnement_complet", label: "Devis approvisionnement complet" },
  { key: "comparaison_prix", label: "Comparaison des prix" },
  { key: "disponibilite_materiaux", label: "Disponibilité des matériaux" },
  { key: "demande_urgente", label: "Demande urgente" },
  { key: "autre", label: "Autre" },
] as const;

export type QuoteMotifKey = (typeof QUOTE_MOTIFS)[number]["key"];

/** Clé du motif « Autre », qui exige une précision libre saisie par le client. */
export const QUOTE_MOTIF_OTHER: QuoteMotifKey = "autre";

const QUOTE_MOTIF_LABELS: Record<string, string> = Object.fromEntries(
  QUOTE_MOTIFS.map((m) => [m.key, m.label]),
);

export function isValidQuoteMotif(value: unknown): value is QuoteMotifKey {
  return typeof value === "string" && value in QUOTE_MOTIF_LABELS;
}

/** Libellé lisible d'un motif ; retombe sur la clé brute si elle est inconnue. */
export function quoteMotifLabel(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  return QUOTE_MOTIF_LABELS[key] ?? key;
}

/**
 * Libellé complet affiché au fournisseur : le motif « Autre » est complété par
 * la précision saisie par le client (« Autre — … »).
 */
export function resolveQuoteMotif(
  motif: string | null | undefined,
  motifOther?: string | null,
): string | undefined {
  if (!motif) return undefined;
  const label = quoteMotifLabel(motif);
  if (!label) return undefined;
  const other = motifOther?.trim();
  if (motif === QUOTE_MOTIF_OTHER && other) return `Autre — ${other}`;
  return label;
}
