import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { planLabel } from "./emailNotifications";
import { projectsLabel } from "../lib/clientProCredits";
import {
  paymentMethodFamily,
  paymentMethodLabel,
  type ManualPaymentFamily,
} from "../lib/paymentMethods";

// ============================================================================
// DEMANDES DE PAIEMENT EN ATTENTE — vue unifiée pour l'administration
// ----------------------------------------------------------------------------
// Un même acte de paiement (virement bancaire / D17) est enregistré dans la
// table de son flux :
//   • `subscriptions`          → abonnement mensuel Expert / Fournisseur / Pro ;
//   • `clientProCreditOrders`  → cotisation Client Pro (crédits de projets) ;
//   • `expertProfiles`         → abonnement Expert (demande portée par le profil) ;
//   • `supplierProfiles`       → abonnement Fournisseur ;
//   • `siteCotisations`        → cotisation du module Site.
// L'onglet admin « Virements » ne lisait que `subscriptions` : les cotisations
// Client Pro / Expert / Fournisseur n'y apparaissaient donc jamais. Cette
// requête agrège les cinq sources dans une forme commune, SANS nouvelle table :
// les documents existants restent la seule source de vérité.
//
// • lecture seule, réservée aux administrateurs / modérateurs ;
// • réactive (query Convex) : badge, compteurs et liste se mettent à jour en
//   temps réel, sans rafraîchir la page ;
// • identifiant de demande stable `${kind}:${documentId}` : aucun doublon.
// ============================================================================

export type PaymentRequestKind =
  | "subscription"
  | "client_pro"
  | "expert"
  | "supplier"
  | "site";

export interface PendingPaymentRequest {
  /** Identifiant stable et unique de la demande (`kind:documentId`). */
  requestId: string;
  kind: PaymentRequestKind;
  /** Identifiant du document d'origine, utilisé par les actions admin. */
  recordId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  /** Type de profil : Client Pro, Expert, Fournisseur ou Client. */
  profileType: string;
  /** Formule de cotisation demandée (libellé lisible). */
  formula: string;
  amount: number | null;
  currency: string;
  /** Valeur brute enregistrée (`bank_transfer`, `d17`, historique…). */
  paymentMethod: string | null;
  paymentMethodLabel: string;
  paymentFamily: ManualPaymentFamily;
  /** Date de soumission (ou de dépôt du justificatif). */
  submittedAt: number;
  proofUrl: string | null;
  proofFileName: string | null;
  status: "pending";
}

const METHOD_LABELS: Record<string, string> = {
  pro: "Client Pro",
  expert: "Expert",
  supplier: "Fournisseur",
};

function profileTypeFromPlan(plan: string): string {
  return METHOD_LABELS[plan] ?? "Client";
}

function buildRequest(
  draft: {
    kind: PaymentRequestKind;
    recordId: string;
    userId: string;
    profileType: string;
    formula: string;
    amount: number | null;
    currency: string;
    paymentMethod: string | null;
    submittedAt: number;
    proofUrl?: string | null;
    proofFileName?: string | null;
  },
  user: Doc<"users"> | null,
): PendingPaymentRequest {
  const method = draft.paymentMethod?.trim() || null;
  return {
    requestId: `${draft.kind}:${draft.recordId}`,
    kind: draft.kind,
    recordId: draft.recordId,
    userId: draft.userId,
    userName: user?.name?.trim() || user?.email || "Non renseigné",
    userEmail: user?.email || "",
    userPhone: user?.phone ?? null,
    profileType: draft.profileType,
    formula: draft.formula,
    amount: draft.amount,
    currency: draft.currency || "TND",
    paymentMethod: method,
    paymentMethodLabel: paymentMethodLabel(method),
    paymentFamily: paymentMethodFamily(method),
    submittedAt: draft.submittedAt,
    proofUrl: draft.proofUrl ?? null,
    proofFileName: draft.proofFileName ?? null,
    status: "pending",
  };
}

/**
 * Toutes les demandes de paiement en attente, tous flux confondus.
 * Réservé aux administrateurs et modérateurs : tout autre compte reçoit une
 * liste vide (aucune donnée d'un autre utilisateur n'est exposée).
 */
export const getPendingPaymentRequests = query({
  args: {},
  handler: async (ctx): Promise<PendingPaymentRequest[]> => {
    const admin = await getCurrentUser(ctx);
    if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
      return [];
    }

    const [subscriptions, clientProOrders, expertProfiles, supplierProfiles, siteCotisations] =
      await Promise.all([
        ctx.db
          .query("subscriptions")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .collect(),
        ctx.db
          .query("clientProCreditOrders")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .collect(),
        ctx.db
          .query("expertProfiles")
          .withIndex("by_subscription", (q) => q.eq("subscriptionStatus", "pending"))
          .collect(),
        ctx.db
          .query("supplierProfiles")
          .withIndex("by_subscription", (q) => q.eq("subscriptionStatus", "pending"))
          .collect(),
        ctx.db
          .query("siteCotisations")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .collect(),
      ]);

    // Un seul chargement par utilisateur, quel que soit le nombre de demandes.
    const userIds = new Set<string>();
    for (const row of [
      ...subscriptions,
      ...clientProOrders,
      ...expertProfiles,
      ...supplierProfiles,
      ...siteCotisations,
    ]) {
      userIds.add(String(row.userId));
    }
    const users = new Map<string, Doc<"users"> | null>();
    for (const id of userIds) {
      users.set(id, await ctx.db.get(id as Id<"users">));
    }

    const requests: PendingPaymentRequest[] = [];

    for (const sub of subscriptions) {
      requests.push(
        buildRequest(
          {
            kind: "subscription",
            recordId: String(sub._id),
            userId: String(sub.userId),
            profileType: profileTypeFromPlan(sub.plan),
            formula: `${planLabel(sub.plan)} — abonnement mensuel`,
            amount: typeof sub.amount === "number" ? sub.amount : null,
            currency: sub.currency || "TND",
            paymentMethod: sub.paymentMethod ?? null,
            submittedAt: sub.createdAt,
            proofUrl: sub.paymentProofUrl ?? null,
            proofFileName: sub.paymentProofFileName ?? null,
          },
          users.get(String(sub.userId)) ?? null,
        ),
      );
    }

    for (const order of clientProOrders) {
      requests.push(
        buildRequest(
          {
            kind: "client_pro",
            recordId: String(order._id),
            userId: String(order.userId),
            profileType: "Client Pro",
            formula: `Cotisation Client Pro — ${projectsLabel(order.projects)}`,
            amount: typeof order.price === "number" ? order.price : null,
            currency: order.currency || "TND",
            paymentMethod: order.paymentMethod ?? null,
            submittedAt: order.createdAt,
            proofUrl: order.paymentProofUrl ?? null,
            proofFileName: order.paymentProofFileName ?? null,
          },
          users.get(String(order.userId)) ?? null,
        ),
      );
    }

    for (const profile of expertProfiles) {
      requests.push(
        buildRequest(
          {
            kind: "expert",
            recordId: String(profile._id),
            userId: String(profile.userId),
            profileType: "Expert",
            formula: "Abonnement Expert — mensuel",
            amount: typeof profile.paymentAmount === "number" ? profile.paymentAmount : null,
            currency: "TND",
            paymentMethod: profile.paymentMethod ?? null,
            submittedAt:
              profile.paymentProofUploadedAt ?? profile.updatedAt ?? profile.createdAt,
            proofUrl: profile.paymentProofUrl ?? null,
            proofFileName: profile.paymentProofFileName ?? null,
          },
          users.get(String(profile.userId)) ?? null,
        ),
      );
    }

    for (const profile of supplierProfiles) {
      requests.push(
        buildRequest(
          {
            kind: "supplier",
            recordId: String(profile._id),
            userId: String(profile.userId),
            profileType: "Fournisseur",
            formula: "Abonnement Fournisseur — mensuel",
            amount: typeof profile.paymentAmount === "number" ? profile.paymentAmount : null,
            currency: profile.paymentCurrency || "TND",
            paymentMethod: profile.paymentMethod ?? null,
            submittedAt:
              profile.paymentProofUploadedAt ?? profile.updatedAt ?? profile.createdAt,
            proofUrl: profile.paymentProofUrl ?? null,
            proofFileName: profile.paymentProofFileName ?? null,
          },
          users.get(String(profile.userId)) ?? null,
        ),
      );
    }

    for (const cotisation of siteCotisations) {
      requests.push(
        buildRequest(
          {
            kind: "site",
            recordId: String(cotisation._id),
            userId: String(cotisation.userId),
            profileType: "Client",
            formula: `Cotisation module Site — ${cotisation.durationDays} jours`,
            amount: typeof cotisation.amount === "number" ? cotisation.amount : null,
            currency: cotisation.currency || "TND",
            paymentMethod: cotisation.paymentMethod ?? null,
            submittedAt: cotisation.createdAt,
            proofUrl: cotisation.paymentProofUrl ?? null,
            proofFileName: cotisation.paymentProofFileName ?? null,
          },
          users.get(String(cotisation.userId)) ?? null,
        ),
      );
    }

    // Plus récentes d'abord ; l'identifiant tranche les dates identiques.
    return requests.sort(
      (a, b) => b.submittedAt - a.submittedAt || a.requestId.localeCompare(b.requestId),
    );
  },
});
