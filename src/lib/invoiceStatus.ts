// ============================================================================
// FACTURATION — LOGIQUE PARTAGÉE (backend Convex + interface)
// ----------------------------------------------------------------------------
// Ce module ne contient que des types, des constantes et des fonctions PURES :
// il est importé à la fois par les fonctions Convex (`src/convex/invoices.ts`)
// et par l'interface (espace abonné, dashboard administrateur, PDF). Une seule
// définition des statuts, de la numérotation, du calcul de TVA et des filtres :
// le calcul affiché à l'administrateur est donc exactement celui enregistré par
// le serveur.
//
// Règles produit verrouillées ici :
//   • numéro de facture UNIQUE et SÉQUENTIEL : FACT-<année>-<6 chiffres> ;
//   • le prix des forfaits est un montant TTC (ce que le client paie) : le HT et
//     la TVA en sont déduits au taux configuré par l'administrateur (0 % par
//     défaut → « TVA non applicable ») ;
//   • quatre statuts seulement : paid (Payée), pending (En attente),
//     cancelled (Annulée), refunded (Remboursée) ;
//   • une facture n'est JAMAIS supprimée : l'historique de facturation est
//     conservé, même après annulation d'un abonnement.
// ============================================================================

/** Statuts d'une facture. Ordre = ordre d'affichage dans les filtres. */
export const INVOICE_STATUSES = ["paid", "pending", "cancelled", "refunded"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Libellés français des statuts (interface abonné, admin, PDF). */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: "Payée",
  pending: "En attente",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

/** Classes de badge (Tailwind + jetons de thème) par statut. */
export const INVOICE_STATUS_BADGE_CLASS: Record<InvoiceStatus, string> = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  cancelled: "border-border/50 bg-muted/40 text-muted-foreground",
  refunded: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

/** Couleur RVB du statut, utilisée par le PDF (jspdf ne comprend pas Tailwind). */
export const INVOICE_STATUS_RGB: Record<InvoiceStatus, [number, number, number]> = {
  paid: [5, 150, 105],
  pending: [217, 119, 6],
  cancelled: [107, 114, 128],
  refunded: [124, 58, 237],
};

/** Type de profil porteur de l'abonnement facturé. */
export const INVOICE_PROFILE_TYPES = ["client", "supplier", "expert"] as const;
export type InvoiceProfileType = (typeof INVOICE_PROFILE_TYPES)[number];

/** Libellés français des profils (repris à l'identique du reste de l'app). */
export const INVOICE_PROFILE_TYPE_LABELS: Record<InvoiceProfileType, string> = {
  client: "Client Pro",
  supplier: "Fournisseur",
  expert: "Expert",
};

/** Libellés français des forfaits facturés. */
export const INVOICE_PLAN_LABELS: Record<string, string> = {
  pro: "Client Pro",
  supplier: "Fournisseur",
  expert: "Expert",
  free: "Gratuit",
};

/** Libellé d'un forfait (retombe sur la valeur brute si inconnue). */
export function invoicePlanLabel(plan: string | null | undefined): string {
  if (!plan) return "—";
  return INVOICE_PLAN_LABELS[plan] ?? plan;
}

/** Libellé d'un type de profil. */
export function invoiceProfileTypeLabel(profileType: string | null | undefined): string {
  const key = (profileType ?? "") as InvoiceProfileType;
  return INVOICE_PROFILE_TYPE_LABELS[key] ?? "Client Pro";
}

/* ------------------------------------------------------------------ *
 * Numérotation séquentielle
 * ------------------------------------------------------------------ */

/** Préfixe officiel : « FACT-2026-000123 ». */
export const INVOICE_NUMBER_PREFIX = "FACT";

/** Nombre de chiffres de la partie séquentielle. */
const INVOICE_SEQUENCE_LENGTH = 6;

/**
 * Numéro de facture : unique, séquentiel, par année civile.
 * `formatInvoiceNumber(2026, 1)` → `"FACT-2026-000001"`.
 */
export function formatInvoiceNumber(year: number, sequence: number): string {
  const safeSequence = Number.isFinite(sequence) && sequence > 0 ? Math.floor(sequence) : 1;
  return `${INVOICE_NUMBER_PREFIX}-${year}-${String(safeSequence).padStart(INVOICE_SEQUENCE_LENGTH, "0")}`;
}

/** Clé du compteur séquentiel (un compteur par année civile). */
export function invoiceCounterKind(year: number): string {
  return `invoice:${year}`;
}

/** Décompose un numéro de facture (`null` si le format est inattendu). */
export function parseInvoiceNumber(
  invoiceNumber: string | null | undefined,
): { year: number; sequence: number } | null {
  if (!invoiceNumber) return null;
  const match = /^([A-Z]+)-(\d{4})-(\d+)$/.exec(invoiceNumber.trim());
  if (!match) return null;
  if (match[1] !== INVOICE_NUMBER_PREFIX) return null;
  const year = Number(match[2]);
  const sequence = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(sequence)) return null;
  return { year, sequence };
}

/** Année utilisée pour la numérotation (année du serveur). */
export function invoiceYear(now: number): number {
  return new Date(now).getFullYear();
}

/* ------------------------------------------------------------------ *
 * Montants & TVA
 * ------------------------------------------------------------------ */

/** Taux de TVA par défaut : 0 % → « TVA non applicable » (Tunisie : 19 % si activée). */
export const DEFAULT_VAT_RATE_PERCENT = 0;

/** Arrondi monétaire (3 décimales : le millime tunisien). */
export function roundMoney(amount: number): number {
  return Math.round((Number.isFinite(amount) ? amount : 0) * 1000) / 1000;
}

export interface InvoiceTaxBreakdown {
  /** Montant hors taxes. */
  amountHT: number;
  /** Montant de TVA (0 si non applicable). */
  taxAmount: number;
  /** Montant toutes taxes comprises — montant réellement payé par le client. */
  amountTTC: number;
  /** Taux appliqué (%). */
  taxRate: number;
}

/**
 * Décompose un montant TTC en HT + TVA. Le prix du forfait est un prix TTC
 * (montant réellement réglé) : le HT est donc déduit, jamais gonflé.
 * Un taux nul (ou absent) donne une facture sans TVA — « TVA non applicable ».
 */
export function computeInvoiceTax(
  amountTTC: number,
  vatRatePercent: number = DEFAULT_VAT_RATE_PERCENT,
): InvoiceTaxBreakdown {
  const ttc = roundMoney(Math.max(0, amountTTC));
  const rate = Number.isFinite(vatRatePercent) ? Math.max(0, vatRatePercent) : 0;

  if (rate <= 0) {
    return { amountHT: ttc, taxAmount: 0, amountTTC: ttc, taxRate: 0 };
  }

  const ht = roundMoney(ttc / (1 + rate / 100));
  return { amountHT: ht, taxAmount: roundMoney(ttc - ht), amountTTC: ttc, taxRate: rate };
}

/** Montant formaté : `formatMoney(80, "TND")` → `"80 TND"`. */
export function formatMoney(amount: number | null | undefined, currency = "TND"): string {
  const value = roundMoney(amount ?? 0);
  // Jusqu'au millime quand il y en a un, sans zéro inutile : « 80 TND »,
  // « 120,5 TND », « 120,333 TND ».
  const text = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
  return `${text} ${currency}`;
}

/** Date courte française : `12/09/2026`. */
export function formatInvoiceDate(timestamp: number | null | undefined): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return "—";
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Date longue française, utilisée dans le PDF : `12 septembre 2026`. */
export function formatInvoiceDateLong(timestamp: number | null | undefined): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return "—";
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Période de facturation : `12/09/2026 → 12/10/2026`. */
export function formatBillingPeriod(
  start: number | null | undefined,
  end: number | null | undefined,
): string {
  if (start == null || end == null) return "—";
  return `${formatInvoiceDate(start)} → ${formatInvoiceDate(end)}`;
}

/* ------------------------------------------------------------------ *
 * Filtres (espace abonné & dashboard administrateur)
 * ------------------------------------------------------------------ */

/** Champs minimum nécessaires au filtrage d'une facture. */
export interface InvoiceFilterable {
  invoiceNumber: string;
  issueDate: number;
  status: InvoiceStatus;
  profileType: InvoiceProfileType;
  plan: string;
  amountTTC: number;
  currency: string;
  customerName?: string | null;
  customerEmail?: string | null;
}

export interface InvoiceFilter {
  /** Recherche libre : numéro de facture, nom ou e-mail du client. */
  search: string;
  /** `"all"` = aucun filtre de statut. */
  status: InvoiceStatus | "all";
  /** `"all"` = tous les profils. */
  profileType: InvoiceProfileType | "all";
  /** `"all"` = tous les abonnements. */
  plan: string;
  /** Borne basse (inclus) sur la date d'émission. */
  from: number | null;
  /** Borne haute (inclus) sur la date d'émission. */
  to: number | null;
}

/** Filtre vide : tout est affiché. */
export function emptyInvoiceFilter(): InvoiceFilter {
  return { search: "", status: "all", profileType: "all", plan: "all", from: null, to: null };
}

/** Vrai si au moins un critère est actif (bouton « Réinitialiser »). */
export function isInvoiceFilterActive(filter: InvoiceFilter): boolean {
  return (
    filter.search.trim().length > 0 ||
    filter.status !== "all" ||
    filter.profileType !== "all" ||
    filter.plan !== "all" ||
    filter.from !== null ||
    filter.to !== null
  );
}

/** Fin de journée : la borne haute est inclusive sur toute la journée choisie. */
export function endOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

/** Début de journée (borne basse inclusive). */
export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Normalise une chaîne pour la recherche : minuscules, sans accent, espaces
 * réduits. « Société Med Bâtiment » se retrouve donc en tapant « societe
 * med batiment », « Med Batiment » ou « med  bâtiment » — indispensable pour
 * les noms et sociétés tunisiens.
 */
function normalizeInvoiceSearch(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Une facture correspond-elle au filtre ? Fonction pure utilisée par le
 * backend (requête administrateur) ET par l'interface abonné : les deux
 * affichent donc exactement les mêmes résultats.
 */
export function matchesInvoiceFilter(
  invoice: InvoiceFilterable,
  filter: InvoiceFilter,
): boolean {
  if (filter.status !== "all" && invoice.status !== filter.status) return false;
  if (filter.profileType !== "all" && invoice.profileType !== filter.profileType) return false;
  if (filter.plan !== "all" && invoice.plan !== filter.plan) return false;
  if (filter.from !== null && invoice.issueDate < filter.from) return false;
  if (filter.to !== null && invoice.issueDate > filter.to) return false;

  const search = normalizeInvoiceSearch(filter.search);
  if (!search) return true;

  return (
    invoice.invoiceNumber.toLowerCase().includes(search) ||
    normalizeInvoiceSearch(invoice.customerName).includes(search) ||
    normalizeInvoiceSearch(invoice.customerEmail).includes(search)
  );
}

/** Applique un filtre à une liste de factures. */
export function applyInvoiceFilter<T extends InvoiceFilterable>(
  invoices: readonly T[],
  filter: InvoiceFilter,
): T[] {
  return invoices.filter((invoice) => matchesInvoiceFilter(invoice, filter));
}

/* ------------------------------------------------------------------ *
 * Statistiques (dashboard administrateur)
 * ------------------------------------------------------------------ */

export interface InvoiceStats {
  /** Nombre de factures retenues par le filtre. */
  count: number;
  /** Chiffre d'affaires FACTURÉ : payées + en attente (annulées et remboursées exclues). */
  billedTTC: number;
  /** Montant réellement ENCAISSÉ : factures payées uniquement. */
  collectedTTC: number;
  /** Montant facturé restant à encaisser. */
  pendingTTC: number;
  /** Montant remboursé. */
  refundedTTC: number;
  /** Nombre de factures par statut. */
  byStatus: Record<InvoiceStatus, number>;
  /** Montants par statut. */
  amountByStatus: Record<InvoiceStatus, number>;
  /** Devise des montants (la plateforme facture dans une seule devise). */
  currency: string;
}

/** Statistiques agrégées d'un jeu de factures (calcul pur, testable). */
export function computeInvoiceStats(invoices: readonly InvoiceFilterable[]): InvoiceStats {
  const byStatus: Record<InvoiceStatus, number> = {
    paid: 0,
    pending: 0,
    cancelled: 0,
    refunded: 0,
  };
  const amountByStatus: Record<InvoiceStatus, number> = {
    paid: 0,
    pending: 0,
    cancelled: 0,
    refunded: 0,
  };

  for (const invoice of invoices) {
    byStatus[invoice.status] += 1;
    amountByStatus[invoice.status] = roundMoney(
      amountByStatus[invoice.status] + (invoice.amountTTC ?? 0),
    );
  }

  return {
    count: invoices.length,
    billedTTC: roundMoney(amountByStatus.paid + amountByStatus.pending),
    collectedTTC: amountByStatus.paid,
    pendingTTC: amountByStatus.pending,
    refundedTTC: amountByStatus.refunded,
    byStatus,
    amountByStatus,
    currency: invoices[0]?.currency ?? "TND",
  };
}

/** Statistiques vides (aucune facture, ou accès refusé côté serveur). */
export function emptyInvoiceStats(currency = "TND"): InvoiceStats {
  return {
    count: 0,
    billedTTC: 0,
    collectedTTC: 0,
    pendingTTC: 0,
    refundedTTC: 0,
    byStatus: { paid: 0, pending: 0, cancelled: 0, refunded: 0 },
    amountByStatus: { paid: 0, pending: 0, cancelled: 0, refunded: 0 },
    currency,
  };
}

/* ------------------------------------------------------------------ *
 * Descriptions & conditions
 * ------------------------------------------------------------------ */

/** Description d'une facture d'abonnement mensuel. */
export function invoiceDescription(plan: string, periodStart: number, periodEnd: number): string {
  return `Abonnement ${invoicePlanLabel(plan)} — période du ${formatInvoiceDate(
    periodStart,
  )} au ${formatInvoiceDate(periodEnd)}`;
}

/** Conditions de paiement par défaut (l'administrateur peut les personnaliser). */
export const DEFAULT_PAYMENT_TERMS =
  "Abonnement mensuel payable d'avance, sans reconduction tacite. " +
  "Aucun prélèvement automatique : le règlement est effectué par virement bancaire ou D17.";

/** Nombre de jours d'une période mensuelle facturée (aligné sur l'abonnement). */
export const INVOICE_PERIOD_DAYS = 30;

/** Fin de la période facturée : 30 jours après le début (aligné sur l'abonnement). */
export function invoicePeriodEnd(periodStart: number): number {
  return periodStart + INVOICE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
}
