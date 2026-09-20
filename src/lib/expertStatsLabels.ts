// ============================================================================
// LIBELLÉS DES STATISTIQUES EXPERT
//
// Une seule source de vérité pour les textes affichés par la page
// « Statistiques Expert » : sources de trafic (champ `source` de
// `expertAnalytics`), statuts des demandes et natures de demande. Chaque
// libellé retombe sur la clé brute si une nouvelle valeur apparaît côté
// backend, pour ne jamais afficher « undefined » à l'écran.
// ============================================================================

/** Sources de trafic (`expertAnalytics.source`). */
export const SOURCE_LABELS: Record<string, string> = {
  direct: "Accès direct",
  search: "Recherche / annuaire",
  social: "Réseaux sociaux",
  other: "Autres sources",
};

/** Natures de demande reçues par un expert. */
export const DEMAND_KIND_LABELS: Record<string, string> = {
  devis: "Devis",
  service: "Service",
  appointment: "Rendez-vous",
  urgent: "Urgence",
  rating: "Avis",
};

/** Statuts possibles (demandes, rendez-vous, urgences, avis). */
export const DEMAND_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "En attente",
    className: "bg-amber-500/10 text-amber-700 border-amber-200/40",
  },
  responded: {
    label: "Répondu",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200/40",
  },
  approved: {
    label: "Confirmé",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200/40",
  },
  accepted: {
    label: "Accepté",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200/40",
  },
  declined: {
    label: "Refusé",
    className: "bg-rose-500/10 text-rose-700 border-rose-200/40",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-slate-500/10 text-slate-600 border-slate-200/40",
  },
  completed: {
    label: "Terminé",
    className: "bg-blue-500/10 text-blue-700 border-blue-200/40",
  },
  closed: {
    label: "Fermé",
    className: "bg-slate-500/10 text-slate-600 border-slate-200/40",
  },
  published: {
    label: "Publié",
    className: "bg-amber-500/10 text-amber-700 border-amber-200/40",
  },
};

const FALLBACK_STATUS = {
  label: "En attente",
  className: "bg-muted/50 text-muted-foreground border-border/40",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export function kindLabel(kind: string): string {
  return DEMAND_KIND_LABELS[kind] ?? kind;
}

export function statusMeta(status: string): {
  label: string;
  className: string;
} {
  return DEMAND_STATUS_META[status] ?? FALLBACK_STATUS;
}

/** Taux (%) arrondi à une décimale, protégé contre la division par zéro. */
export function ratePercent(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}
