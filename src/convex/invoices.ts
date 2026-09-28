import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { resolveProfileRole } from "./profileSubscription";
import {
  INVOICE_PROFILE_TYPES,
  INVOICE_STATUSES,
  computeInvoiceStats,
  computeInvoiceTax,
  emptyInvoiceStats,
  formatInvoiceNumber,
  formatMoney,
  invoiceCounterKind,
  invoiceDescription,
  invoiceYear,
  matchesInvoiceFilter,
  type InvoiceFilter,
  type InvoiceFilterable,
  type InvoiceProfileType,
  type InvoiceStatus,
} from "../lib/invoiceStatus";

// ============================================================================
// FACTURATION — GÉNÉRATION AUTOMATIQUE ET CONSULTATION DES FACTURES
// ----------------------------------------------------------------------------
// Chaque paiement (ou renouvellement) d'abonnement produit AUTOMATIQUEMENT une
// facture, rattachée à l'abonnement et au client :
//
//   paiement confirmé → facture créée → numéro unique et séquentiel → PDF
//   disponible dans « Mes factures » (abonné) et « Admin → Factures ».
//
//   • Une facture n'est JAMAIS supprimée ni écrasée : `cancelled` et
//     `refunded` sont des STATUTS, l'historique de facturation est conservé
//     même après annulation d'un abonnement. Un renouvellement crée une
//     NOUVELLE facture (nouvel abonnement) sans toucher aux précédentes.
//
//   • SÉCURITÉ (règles imposées côté serveur, pas seulement à l'affichage) :
//       – `getMyInvoices` ne renvoie QUE les factures de l'utilisateur connecté
//         (index `by_user`) : modifier l'URL ou un identifiant ne donne accès à
//         rien d'autre ;
//       – la liste complète et la modification des statuts sont réservées au
//         rôle `admin` : un modérateur, un fournisseur ou un client reçoit une
//         réponse vide (lecture) ou une erreur (écriture) ;
//       – `archiveInvoicePdf` vérifie la propriété de la facture avant écriture.
//
//   • Les montants sont calculés UNE SEULE fois, à l'émission, puis figés avec
//     le taux de TVA et les coordonnées de l'émetteur : modifier la
//     configuration de facturation ne réécrit jamais l'historique.
// ============================================================================

/** Nom d'émetteur de secours — la source de vérité produit est
 *  `src/lib/branding.ts` (nom + logo officiel), que le backend ne peut pas
 *  importer (l'asset PNG `?inline` est résolu par le bundler Vite). */
const ISSUER_FALLBACK_NAME = "batibuild";

/** Taille maximale d'une liste renvoyée à l'interface (protection mémoire). */
const MAX_ROWS = 1000;

/* ------------------------------------------------------------------ *
 * Garde d'accès administrateur
 * ------------------------------------------------------------------ */

async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const user = await getCurrentUser(ctx);
  // Seuls les ADMINISTRATEURS voient toutes les factures : les données de
  // facturation ne sont pas du ressort des modérateurs.
  if (!user || user.role !== "admin") return null;
  return user;
}

/* ------------------------------------------------------------------ *
 * Numérotation séquentielle
 * ------------------------------------------------------------------ */

/**
 * Alloue le prochain numéro de facture de l'année (`FACT-2026-000001`).
 * Le compteur est lu ET écrit dans la transaction courante : deux paiements
 * simultanés ne peuvent pas recevoir le même numéro.
 */
async function allocateInvoiceNumber(
  ctx: Pick<MutationCtx, "db">,
  now: number,
): Promise<string> {
  const year = invoiceYear(now);
  const kind = invoiceCounterKind(year);

  const counter = await ctx.db
    .query("invoiceCounters")
    .withIndex("by_kind", (q) => q.eq("kind", kind))
    .first();

  let sequence = (counter?.value ?? 0) + 1;
  let number = formatInvoiceNumber(year, sequence);

  // Garde-fou : si un compteur a été recréé (restauration de sauvegarde), on
  // avance jusqu'au premier numéro réellement libre. Jamais de doublon.
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const clash = await ctx.db
      .query("invoices")
      .withIndex("by_number", (q) => q.eq("invoiceNumber", number))
      .first();
    if (!clash) break;
    sequence += 1;
    number = formatInvoiceNumber(year, sequence);
  }

  if (counter) {
    await ctx.db.patch(counter._id, { value: sequence });
  } else {
    await ctx.db.insert("invoiceCounters", { kind, value: sequence });
  }

  return number;
}

/* ------------------------------------------------------------------ *
 * Émission d'une facture
 * ------------------------------------------------------------------ */

export interface IssueInvoiceInput {
  userId: Id<"users">;
  /**
   * Abonnement facturé : identifiant `subscriptions`, ou
   * « supplierProfile:<id> » / « expertProfile:<id> ».
   */
  subscriptionId?: string;
  /** Forfait facturé (pro / supplier / expert). */
  plan: string;
  /** Profil porteur de l'abonnement. */
  profileType: InvoiceProfileType;
  /** Montant réellement réglé (TTC) : le HT et la TVA en sont déduits. */
  amountTTC: number;
  currency?: string;
  paymentMethod?: string;
  /** `paid` = encaissée, `pending` = en attente de validation du règlement. */
  status: InvoiceStatus;
  paymentDate?: number;
  billingPeriodStart: number;
  billingPeriodEnd: number;
  transactionId?: string;
  customer: {
    name?: string;
    email?: string;
    address?: string;
    company?: string;
  };
  /** Date d'émission (défaut : maintenant). */
  issueDate?: number;
  /** Notification in-app « facture disponible » (défaut : oui). */
  notify?: boolean;
}

function clean(value: string | undefined | null): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : undefined;
}

/**
 * Crée une facture : numéro unique, montants figés (HT/TVA/TTC), coordonnées
 * du client et de l'émetteur figées, puis — si elle est payée — notification
 * « facture disponible ». Utilisé par tous les flux d'abonnement (Client Pro,
 * Fournisseur, Expert) et par les tests.
 */
export async function issueInvoice(
  ctx: Pick<MutationCtx, "db">,
  input: IssueInvoiceInput,
): Promise<Doc<"invoices">> {
  const now = input.issueDate ?? Date.now();

  // Taux de TVA et coordonnées de facturation : lus au moment de l'émission
  // puis FIGÉS sur la facture (aucune donnée inventée : un champ vide reste vide).
  const config = await ctx.db.query("paymentConfig").order("desc").first();
  const currency = input.currency ?? config?.currency ?? "TND";
  const tax = computeInvoiceTax(input.amountTTC, config?.vatRate ?? 0);

  const issuer = {
    name: clean(config?.companyLegalName) ?? ISSUER_FALLBACK_NAME,
    address: clean(config?.companyAddress),
    taxId: clean(config?.companyTaxId),
    email: clean(config?.companyEmail),
    phone: clean(config?.companyPhone),
    terms: clean(config?.paymentTerms),
  };

  const invoiceNumber = await allocateInvoiceNumber(ctx, now);
  const description = invoiceDescription(
    input.plan,
    input.billingPeriodStart,
    input.billingPeriodEnd,
  );

  const invoiceId = await ctx.db.insert("invoices", {
    invoiceNumber,
    userId: input.userId,
    subscriptionId: input.subscriptionId,
    transactionId: clean(input.transactionId),
    issueDate: now,
    paymentDate:
      input.status === "paid" ? (input.paymentDate ?? now) : input.paymentDate,
    billingPeriodStart: input.billingPeriodStart,
    billingPeriodEnd: input.billingPeriodEnd,
    profileType: input.profileType,
    plan: input.plan,
    description,
    amountHT: tax.amountHT,
    taxAmount: tax.taxAmount,
    taxRate: tax.taxRate,
    amountTTC: tax.amountTTC,
    currency,
    paymentMethod: clean(input.paymentMethod),
    status: input.status,
    customerName: clean(input.customer.name),
    customerEmail: clean(input.customer.email),
    customerAddress: clean(input.customer.address),
    customerCompany: clean(input.customer.company),
    issuer,
    createdAt: now,
    updatedAt: now,
  });

  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) throw new Error("Facture introuvable après création");

  // Notification in-app : la facture est disponible dans « Mes factures ».
  if (input.notify !== false && input.status !== "cancelled") {
    try {
      await ctx.db.insert("notifications", {
        userId: input.userId,
        type: "subscription",
        title: `Facture ${invoiceNumber} disponible`,
        message:
          `${invoiceDescription(input.plan, input.billingPeriodStart, input.billingPeriodEnd)} — ` +
          `${formatMoney(tax.amountTTC, currency)}. ` +
          "Vous pouvez la télécharger en PDF depuis votre profil (Mes factures).",
        read: false,
        link: "/dashboard/profile",
        createdAt: now,
      });
    } catch {
      // La notification est un confort : elle ne doit jamais bloquer la facture.
    }
  }

  return invoice;
}

/**
 * Facture d'un abonnement payant de la table `subscriptions` (parcours
 * d'abonnement mensuel).
 *
 * Idempotent PAR ABONNEMENT : l'identifiant de l'abonnement change à chaque
 * renouvellement (une nouvelle ligne `subscriptions`), donc chaque terme
 * mensuel possède sa propre facture — un renouvellement crée une NOUVELLE
 * facture sans jamais écraser la précédente. Une validation de paiement
 * (approbation, vérification du reçu) met à jour la facture DU TERME EN COURS.
 */
export interface SubscriptionInvoiceInput {
  subscriptionId: Id<"subscriptions">;
  userId: Id<"users">;
  /** Compte client (nom, e-mail, société, type de profil). */
  user: Pick<Doc<"users">, "name" | "email" | "company" | "userRole" | "_id">;
  plan: string;
  /** Montant réglé (TTC). 0 = forfait gratuit : aucune facture n'est émise. */
  amountTTC: number;
  currency?: string;
  paymentMethod?: string;
  paymentId?: string;
  periodStart: number;
  periodEnd: number;
  status: InvoiceStatus;
  paymentDate?: number;
}

export async function issueSubscriptionInvoice(
  ctx: Pick<MutationCtx, "db">,
  input: SubscriptionInvoiceInput,
): Promise<Doc<"invoices"> | null> {
  const key = subscriptionKey(input.subscriptionId);

  // Aucune facture pour un forfait gratuit : rien n'a été réglé. Une facture
  // existante éventuelle est simplement synchronisée (jamais supprimée).
  if (!(input.amountTTC > 0)) {
    return await syncLatestInvoiceForSubscription(ctx, key, {
      status: input.status,
      paymentDate: input.paymentDate,
    });
  }

  // Idempotent : la facture de ce terme existe déjà (validation du paiement,
  // vérification du reçu…) → on synchronise SON statut, sans en créer une autre.
  const existing = await findInvoiceForSubscription(ctx, key);
  if (existing) {
    return await syncInvoiceStatus(ctx, existing._id, {
      status: input.status,
      paymentDate: input.paymentDate,
    });
  }

  const profileRole = (await resolveProfileRole(ctx, input.user)) ?? "client";
  const profileType: InvoiceProfileType =
    profileRole === "supplier" ? "supplier" : profileRole === "expert" ? "expert" : "client";

  return await issueInvoice(ctx, {
    userId: input.userId,
    subscriptionId: key,
    plan: input.plan,
    profileType,
    amountTTC: input.amountTTC,
    currency: input.currency ?? "TND",
    paymentMethod: input.paymentMethod,
    status: input.status,
    paymentDate: input.paymentDate,
    billingPeriodStart: input.periodStart,
    billingPeriodEnd: input.periodEnd,
    transactionId: input.paymentId,
    customer: {
      name: input.user.name,
      email: input.user.email,
      company: input.user.company,
    },
  });
}

export interface ProfileInvoiceInput {
  /** Profil spécialisé facturé. */
  profileType: "supplier" | "expert";
  profileId: string;
  userId: Id<"users">;
  /** Forfait facturé : « supplier » ou « expert ». */
  plan: string;
  amountTTC: number;
  currency?: string;
  paymentMethod?: string;
  periodStart: number;
  periodEnd: number;
  /** Date du paiement confirmé (validation du règlement). */
  paymentDate?: number;
  customer: {
    name?: string;
    email?: string;
    address?: string;
    company?: string;
  };
}

/**
 * DEMANDE D'ABONNEMENT Fournisseur / Expert → facture « en attente ».
 *
 * Ces abonnements vivent dans leurs tables dédiées (`supplierProfiles` /
 * `expertProfiles`) : le profil est réutilisé à chaque terme, mais c'est la
 * DEMANDE DE PAIEMENT qui marque le début d'un terme. Une demande produit donc
 * toujours un document : tant que le terme en cours est encore en attente, il
 * n'est pas facturé deux fois ; dès qu'il est payé (ou annulé), la demande
 * suivante — un RENOUVELLEMENT — crée une NOUVELLE facture, sans jamais
 * écraser la précédente.
 */
export async function issueProfileRequestInvoice(
  ctx: Pick<MutationCtx, "db">,
  input: ProfileInvoiceInput,
): Promise<Doc<"invoices"> | null> {
  if (!(input.amountTTC > 0)) return null;

  const key = profileSubscriptionKey(input.profileType, input.profileId);
  const existing = await latestInvoiceForSubscription(ctx, key);
  // Demande déjà facturée et non réglée : on la réutilise telle quelle.
  if (existing && existing.status === "pending") return existing;

  return await issueInvoice(ctx, {
    userId: input.userId,
    subscriptionId: key,
    plan: input.plan,
    profileType: input.profileType,
    amountTTC: input.amountTTC,
    currency: input.currency,
    paymentMethod: input.paymentMethod,
    status: "pending",
    billingPeriodStart: input.periodStart,
    billingPeriodEnd: input.periodEnd,
    customer: input.customer,
  });
}

/**
 * PAIEMENT CONFIRMÉ d'un abonnement Fournisseur / Expert (approbation de la
 * demande ou vérification du reçu) → facture du terme en cours marquée
 * « payée ». Si aucune facture n'existe (profil validé avant la mise en place
 * de la facturation), elle est créée à ce moment-là.
 */
export async function markProfileInvoicePaid(
  ctx: Pick<MutationCtx, "db">,
  input: ProfileInvoiceInput,
): Promise<Doc<"invoices"> | null> {
  if (!(input.amountTTC > 0)) return null;

  const key = profileSubscriptionKey(input.profileType, input.profileId);
  const existing = await latestInvoiceForSubscription(ctx, key);
  if (existing) {
    return await syncInvoiceStatus(ctx, existing._id, {
      status: "paid",
      paymentDate: input.paymentDate,
    });
  }

  return await issueInvoice(ctx, {
    userId: input.userId,
    subscriptionId: key,
    plan: input.plan,
    profileType: input.profileType,
    amountTTC: input.amountTTC,
    currency: input.currency,
    paymentMethod: input.paymentMethod,
    status: "paid",
    paymentDate: input.paymentDate,
    billingPeriodStart: input.periodStart,
    billingPeriodEnd: input.periodEnd,
    customer: input.customer,
  });
}

/**
 * Annule uniquement les factures NON PAYÉES d'un abonnement (refus d'une
 * demande, annulation par le client). Les factures déjà payées ne sont jamais
 * touchées : l'historique de facturation est conservé, aucune facture n'est
 * supprimée.
 */
export async function cancelPendingInvoicesForSubscription(
  ctx: Pick<MutationCtx, "db">,
  subscriptionId: string | Id<"subscriptions">,
): Promise<number> {
  const key = typeof subscriptionId === "string" ? subscriptionId : subscriptionKey(subscriptionId);
  const invoices = await ctx.db
    .query("invoices")
    .withIndex("by_subscription", (q) => q.eq("subscriptionId", key))
    .collect();

  const now = Date.now();
  let cancelled = 0;

  for (const invoice of invoices) {
    if (invoice.status !== "pending") continue;
    await ctx.db.patch(invoice._id, {
      status: "cancelled",
      paymentDate: undefined,
      updatedAt: now,
    });
    cancelled += 1;
  }

  return cancelled;
}

/** Clé d'abonnement stockée sur la facture. */
export function subscriptionKey(subscriptionId: Id<"subscriptions">): string {
  return subscriptionId as unknown as string;
}

/** Clé d'un profil spécialisé (Fournisseur / Expert) facturé. */
export function profileSubscriptionKey(
  profileType: "supplier" | "expert",
  profileId: string,
): string {
  return `${profileType}Profile:${profileId}`;
}

/** Facture déjà émise pour un abonnement (index `by_subscription`). */
export async function findInvoiceForSubscription(
  ctx: Pick<MutationCtx, "db"> | Pick<QueryCtx, "db">,
  subscriptionId: string,
): Promise<Doc<"invoices"> | null> {
  return await ctx.db
    .query("invoices")
    .withIndex("by_subscription", (q) => q.eq("subscriptionId", subscriptionId))
    .first();
}

/** Facture la plus récente d'un abonnement : le TERME EN COURS. */
export async function latestInvoiceForSubscription(
  ctx: Pick<MutationCtx, "db"> | Pick<QueryCtx, "db">,
  subscriptionId: string,
): Promise<Doc<"invoices"> | null> {
  const rows = await ctx.db
    .query("invoices")
    .withIndex("by_subscription", (q) => q.eq("subscriptionId", subscriptionId))
    .collect();
  if (rows.length === 0) return null;
  return rows.sort(byIssueDateDesc)[0];
}


/**
 * Met à jour le statut d'UNE facture (validation du paiement, refus,
 * annulation, vérification de reçu).
 *
 * Une facture `cancelled` ou `refunded` n'est JAMAIS réactivée par une
 * synchronisation automatique : seul un administrateur peut la faire changer
 * d'état. Aucune facture n'est supprimée.
 */
export async function syncInvoiceStatus(
  ctx: Pick<MutationCtx, "db">,
  invoiceId: Id<"invoices">,
  next: { status: InvoiceStatus; paymentDate?: number | null },
): Promise<Doc<"invoices"> | null> {
  const invoice = await ctx.db.get(invoiceId);
  if (!invoice) return null;
  if (invoice.status === "cancelled" || invoice.status === "refunded") return invoice;

  const paymentDate =
    next.status === "paid" ? (next.paymentDate ?? invoice.paymentDate ?? Date.now()) : undefined;

  const unchanged =
    invoice.status === next.status && (invoice.paymentDate ?? null) === (paymentDate ?? null);
  if (unchanged) return invoice;

  await ctx.db.patch(invoiceId, {
    status: next.status,
    paymentDate,
    updatedAt: Date.now(),
  });

  return await ctx.db.get(invoiceId);
}

/**
 * Met à jour le statut du TERME EN COURS d'un abonnement (la facture la plus
 * récente) : les factures des termes précédents — et donc l'historique — ne
 * sont jamais réécrites.
 */
export async function syncLatestInvoiceForSubscription(
  ctx: Pick<MutationCtx, "db">,
  subscriptionId: string,
  next: { status: InvoiceStatus; paymentDate?: number | null },
): Promise<Doc<"invoices"> | null> {
  const invoice = await latestInvoiceForSubscription(ctx, subscriptionId);
  if (!invoice) return null;
  return await syncInvoiceStatus(ctx, invoice._id, next);
}

/** Numéro de la facture d'un abonnement (utilisé dans les e-mails). */
export async function invoiceNumberForSubscription(
  ctx: Pick<MutationCtx, "db"> | Pick<QueryCtx, "db">,
  subscriptionId: string,
): Promise<string | undefined> {
  const invoice = await findInvoiceForSubscription(ctx, subscriptionId);
  return invoice?.invoiceNumber;
}

/* ------------------------------------------------------------------ *
 * Consultation — espace abonné
 * ------------------------------------------------------------------ */

/** Projection minimale utilisée par les filtres et les statistiques. */
function toFilterable(invoice: Doc<"invoices">): InvoiceFilterable {
  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    status: invoice.status,
    profileType: invoice.profileType,
    plan: invoice.plan,
    amountTTC: invoice.amountTTC,
    currency: invoice.currency,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
  };
}

function byIssueDateDesc(a: Doc<"invoices">, b: Doc<"invoices">): number {
  return b.issueDate - a.issueDate || b.invoiceNumber.localeCompare(a.invoiceNumber);
}

/**
 * FACTURES DE L'UTILISATEUR CONNECTÉ — « Mes factures ».
 *
 * Le filtrage par `userId` est fait CÔTÉ SERVEUR (index `by_user`) : un
 * utilisateur ne peut obtenir que ses propres factures, quels que soient les
 * paramètres envoyés par le navigateur. Une réponse vide n'est jamais une
 * erreur (aucune facture = aucun historique à afficher).
 */
export const getMyInvoices = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return invoices.sort(byIssueDateDesc).slice(0, MAX_ROWS);
  },
});

/* ------------------------------------------------------------------ *
 * Consultation — dashboard administrateur
 * ------------------------------------------------------------------ */

function normalizeStatusFilter(value: string | undefined): InvoiceStatus | "all" {
  const candidate = (value ?? "").trim() as InvoiceStatus;
  return INVOICE_STATUSES.includes(candidate) ? candidate : "all";
}

function normalizeProfileFilter(value: string | undefined): InvoiceProfileType | "all" {
  const candidate = (value ?? "").trim() as InvoiceProfileType;
  return INVOICE_PROFILE_TYPES.includes(candidate) ? candidate : "all";
}

/**
 * TOUTES LES FACTURES (administrateur uniquement).
 *
 * Filtres : numéro de facture / nom / e-mail du client (recherche libre),
 * période, type de profil, abonnement, statut. Les statistiques renvoyées
 * portent sur le jeu filtré : elles répondent donc exactement à la question
 * posée par l'administrateur (CA facturé, encaissé, en attente, remboursé…).
 *
 * Un modérateur ou un utilisateur non autorisé reçoit une liste vide et des
 * statistiques à zéro : aucune donnée de facturation n'est exposée.
 */
export const adminListInvoices = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    profileType: v.optional(v.string()),
    plan: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!admin) {
      return { invoices: [], stats: emptyInvoiceStats() };
    }

    // « all » (ou absent) = aucun filtre : l'interface envoie cette valeur pour
    // « tous les abonnements » comme pour les statuts et les profils.
    const planFilter = (args.plan ?? "").trim();

    const filter: InvoiceFilter = {
      search: args.search ?? "",
      status: normalizeStatusFilter(args.status),
      profileType: normalizeProfileFilter(args.profileType),
      plan: !planFilter || planFilter === "all" ? "all" : planFilter,
      from: typeof args.from === "number" ? args.from : null,
      to: typeof args.to === "number" ? args.to : null,
    };

    // Sélection des candidats par INDEX, jamais un scan complet de la table :
    // le statut est le critère le plus sélectif, sinon la période d'émission.
    let candidates: Doc<"invoices">[];
    if (filter.status !== "all") {
      candidates = await ctx.db
        .query("invoices")
        .withIndex("by_status", (q) => q.eq("status", filter.status as InvoiceStatus))
        .collect();
    } else if (filter.from !== null || filter.to !== null) {
      const from = filter.from ?? 0;
      const to = filter.to ?? Number.MAX_SAFE_INTEGER;
      candidates = await ctx.db
        .query("invoices")
        .withIndex("by_issue_date", (q) => q.gte("issueDate", from).lte("issueDate", to))
        .collect();
    } else {
      candidates = await ctx.db.query("invoices").withIndex("by_issue_date").collect();
    }

    const filtered = candidates
      .filter((invoice) => matchesInvoiceFilter(toFilterable(invoice), filter))
      .sort(byIssueDateDesc)
      .slice(0, MAX_ROWS);

    // Compte associé (nom / e-mail à jour) — utile à l'administration pour
    // identifier le client, la facture gardant son instantané d'émission.
    const invoices = await Promise.all(
      filtered.map(async (invoice) => {
        const account = await ctx.db.get(invoice.userId);
        return {
          ...invoice,
          account: account
            ? {
                _id: account._id,
                name: account.name ?? null,
                email: account.email ?? null,
                phone: account.phone ?? null,
                company: account.company ?? null,
                userRole: account.userRole ?? null,
                status: account.status ?? null,
              }
            : null,
        };
      }),
    );

    return {
      invoices,
      stats: computeInvoiceStats(invoices.map(toFilterable)),
    };
  },
});

/* ------------------------------------------------------------------ *
 * Actions administrateur
 * ------------------------------------------------------------------ */

const invoiceStatusValidator = v.union(
  v.literal("paid"),
  v.literal("pending"),
  v.literal("cancelled"),
  v.literal("refunded"),
);

/**
 * Change le statut d'une facture (administrateur uniquement) :
 * payée ↔ en attente, annulée, remboursée. La facture est CONSERVÉE dans tous
 * les cas — seule sa situation comptable change — et l'action est journalisée.
 */
export const adminUpdateInvoiceStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: invoiceStatusValidator,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (!admin) throw new Error("Unauthorized: Admin access required");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Facture introuvable");

    const now = Date.now();
    const next = args.status as InvoiceStatus;

    if (invoice.status === next) {
      return { success: true, unchanged: true, status: next, invoiceNumber: invoice.invoiceNumber };
    }

    await ctx.db.patch(args.invoiceId, {
      status: next,
      // Une facture payée porte toujours une date de paiement ; une facture qui
      // n'est plus payée n'en porte plus.
      paymentDate: next === "paid" ? (invoice.paymentDate ?? now) : undefined,
      updatedAt: now,
    });

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "update_invoice_status",
        targetUserId: invoice.userId,
        targetUserEmail: invoice.customerEmail,
        details: `Facture ${invoice.invoiceNumber} — statut « ${invoice.status} » → « ${next} » (${formatMoney(
          invoice.amountTTC,
          invoice.currency,
        )})`,
        createdAt: now,
      });
    } catch {
      // Le journal est un confort : il ne doit pas annuler l'opération.
    }

    // Information du client concerné (facture payée, annulée ou remboursée).
    try {
      const label =
        next === "paid"
          ? "Facture payée"
          : next === "refunded"
            ? "Facture remboursée"
            : next === "cancelled"
              ? "Facture annulée"
              : "Facture en attente de paiement";
      await ctx.db.insert("notifications", {
        userId: invoice.userId,
        type: "subscription",
        title: `${label} — ${invoice.invoiceNumber}`,
        message: `${invoice.description} — ${formatMoney(invoice.amountTTC, invoice.currency)}.`,
        read: false,
        link: "/dashboard/profile",
        createdAt: now,
      });
    } catch {
      // Notification optionnelle.
    }

    return { success: true, unchanged: false, status: next, invoiceNumber: invoice.invoiceNumber };
  },
});

/**
 * Archive une copie PDF de la facture (facultative).
 *
 * Le PDF est produit dans le navigateur de l'utilisateur (aucun service tiers,
 * rendu identique sur ordinateur et mobile) puis, lorsqu'il est généré, mis en
 * cache dans l'espace de stockage Convex. Cette copie est un CONFORT : le
 * document reste toujours régénérable à l'identique depuis la facture.
 * Le propriétaire de la facture ou un administrateur peut l'archiver.
 */
export const archiveInvoicePdf = mutation({
  args: {
    invoiceId: v.id("invoices"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Non connecté");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Facture introuvable");

    // Sécurité : seul le propriétaire de la facture (ou un administrateur) peut
    // y rattacher un fichier — impossible d'écrire sur la facture d'autrui.
    if (user.role !== "admin" && invoice.userId !== user._id) {
      throw new Error("Accès refusé à cette facture");
    }

    // Une copie déjà archivée n'est jamais remplacée (l'historique est figé).
    if (invoice.pdfStorageId) return { success: true, alreadyArchived: true };

    await ctx.db.patch(args.invoiceId, {
      pdfStorageId: args.storageId,
      updatedAt: Date.now(),
    });

    return { success: true, alreadyArchived: false };
  },
});
