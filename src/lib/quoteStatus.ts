// ============================================================================
// STATUTS DES DEMANDES DE DEVIS FOURNISSEUR — règles partagées
//
// La messagerie est l'unique point d'entrée et de gestion des demandes de devis
// fournisseur. Les statuts y sont affichés partout de la même façon, côté client
// comme côté fournisseur : une seule table de vérité, testée, plutôt que des
// libellés dupliqués dans chaque composant.
//
// Compatibilité : les anciennes demandes enregistrées avant cette refonte
// portaient les statuts `pending` / `responded` / `closed`. Ils restent
// parfaitement valides et sont simplement LIBELLÉS autrement :
//   pending → « Nouvelle » (rien n'a encore été fait),
//   responded → « Devis envoyé »,
//   closed → « Clôturée » (statut historique, conservé tel quel).
// Aucune donnée n'est migrée ni supprimée : les anciens statuts continuent de
// s'afficher correctement et l'historique est préservé.
// ============================================================================

export type QuoteStatus =
  | "pending" // historique = Nouvelle
  | "in_progress" // le fournisseur demande des précisions
  | "responded" // historique + « Devis envoyé »
  | "accepted" // le client accepte le devis
  | "refused" // refus du fournisseur ou du client
  | "closed" // historique = Clôturée
  | "expired"; // demande périmée

/** Ordre d'affichage des filtres / badges (du plus actif au plus final). */
export const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  "pending",
  "in_progress",
  "responded",
  "accepted",
  "refused",
  "closed",
  "expired",
];

export interface QuoteStatusMeta {
  /** Libellé affiché (français, comme le reste de la plateforme). */
  label: string;
  /** Classes Tailwind du badge (fond + texte + bordure), tokens existants. */
  chip: string;
  /** Couleur du point de statut (décoratif). */
  dot: string;
}

export const QUOTE_STATUS_META: Record<QuoteStatus, QuoteStatusMeta> = {
  pending: {
    label: "Nouvelle",
    chip: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  in_progress: {
    label: "En cours",
    chip: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  responded: {
    label: "Devis envoyé",
    chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  accepted: {
    label: "Acceptée",
    chip: "bg-teal-100 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  refused: {
    label: "Refusée",
    chip: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  closed: {
    label: "Clôturée",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  expired: {
    label: "Expirée",
    chip: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
};

/** Statut inconnu (donnée ancienne imprévue) : repli neutre, jamais d'écran vide. */
const FALLBACK_META: QuoteStatusMeta = {
  label: "Statut inconnu",
  chip: "bg-muted/40 text-muted-foreground border-border/40",
  dot: "bg-muted-foreground",
};

/** Métadonnées d'affichage d'un statut, avec repli sûr pour toute valeur inconnue. */
export function quoteStatusMeta(status: string | undefined | null): QuoteStatusMeta {
  if (!status) return FALLBACK_META;
  return (QUOTE_STATUS_META as Record<string, QuoteStatusMeta>)[status] ?? FALLBACK_META;
}

/** Libellé court d'un statut (raccourci pratique). */
export function quoteStatusLabel(status: string | undefined | null): string {
  return quoteStatusMeta(status).label;
}

/**
 * Le fournisseur peut-il encore agir (répondre / refuser / demander des
 * précisions) sur cette demande ? Un devis envoyé reste modifiable tant que le
 * client n'a pas tranché.
 */
export function canSupplierAct(status: string | undefined | null): boolean {
  return status === "pending" || status === "in_progress" || status === "responded";
}

/**
 * Le client peut-il trancher le devis reçu (accepter / refuser) ?
 */
export function canClientDecide(status: string | undefined | null): boolean {
  return status === "responded";
}
