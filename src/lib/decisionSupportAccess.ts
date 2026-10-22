// ============================================================================
// « AIDE À LA DÉCISION » — RÈGLE D'ACCÈS (partagée frontend ↔ backend)
// ----------------------------------------------------------------------------
// Deux conditions OBLIGATOIRES, vérifiées SIMULTANÉMENT :
//   1. le projet appartient au parcours COMPLET (groupes A et D) —
//      classification centrale de `projectJourney` (`projectJourneyGroup`) ;
//      l'étape est ABSENTE des parcours des groupes B et C (coût estimatif →
//      mise en relation uniquement) ;
//   2. le client dispose d'un abonnement CLIENT PRO actif, valide et NON
//      expiré (instantané `getUserSubscriptionStatus`, source de vérité).
//
// Cette fonction est PURE : aucun accès aux données, aucune horloge implicite,
// aucune date fournie par le navigateur. Le backend (`convex/
// decisionSupportAccess.ts`) lui fournit l'instantané d'abonnement recalculé
// côté serveur ; le frontend ne fait qu'afficher la décision renvoyée par la
// query protégée. Aucune nouvelle classification de projet ni système
// d'abonnement parallèle n'est créé ici.
//
// Cas refusés (avec le message associé) :
//   • projet des groupes B ou C       → masqué / désactivé ;
//   • compte gratuit (forfait Free)   → invitation à passer à Client Pro ;
//   • abonnement expiré / suspendu    → blocage jusqu'à réactivation ;
//   • utilisateur non connecté        → authentification demandée ;
//   • essai gratuit / paiement en attente / profil incompatible → refus.
//
// Note : l'essai gratuit n'est PAS un abonnement Client Pro — il ne débloque
// donc pas cette fonctionnalité (contrairement aux fonctionnalités de base).
// ============================================================================

import {
  isFullJourneyGroup,
  projectJourneyGroup,
  type ProjectJourneyGroup,
} from "./projectJourney";

/** Motif de refus (utilisé pour choisir le message affiché). */
export type DecisionSupportDenyReason =
  | "not_authenticated"
  | "not_owner"
  | "group_not_eligible"
  | "free_plan"
  | "expired"
  | "pending"
  | "trial_expired"
  | "not_client_pro";

export type DecisionSupportAccessReason = "ok" | DecisionSupportDenyReason;

export interface DecisionSupportAccess {
  allowed: boolean;
  reason: DecisionSupportAccessReason;
  /** Groupe du projet (A et D = étape présente, B et C = absente). */
  group: ProjectJourneyGroup;
  /** Invitation à passer à l'abonnement Client Pro (compte gratuit / essai). */
  upgradeRequired: boolean;
  /** Renouvellement / réactivation obligatoire (abonnement expiré, suspendu). */
  renewalRequired: boolean;
}

/** Instantané d'abonnement réduit aux champs utiles à la décision. */
export interface DecisionSupportSubscription {
  status: string;
  type: string;
  isActive: boolean;
  planCompatible: boolean;
}

export interface DecisionSupportAccessInput {
  /** Un utilisateur est-il connecté ? */
  authenticated: boolean;
  /** Admin / modérateur (bypass de test, comme les autres modules). */
  isAdmin?: boolean;
  /**
   * Le projet existe-t-il et appartient-il à l'utilisateur connecté ?
   * `false` → refus, aucune donnée du projet ne doit être exposée.
   */
  owned?: boolean;
  /** Type de projet enregistré (détermine le groupe A / B / C / D du parcours). */
  category: string | null | undefined;
  /** Instantané serveur — `null` si indisponible. */
  subscription: DecisionSupportSubscription | null;
}

/** Décision neutre : accès refusé, sans détail de projet. */
function deny(
  reason: DecisionSupportDenyReason,
  group: ProjectJourneyGroup,
  extra: Partial<Pick<DecisionSupportAccess, "upgradeRequired" | "renewalRequired">> = {},
): DecisionSupportAccess {
  return {
    allowed: false,
    reason,
    group,
    upgradeRequired: extra.upgradeRequired ?? false,
    renewalRequired: extra.renewalRequired ?? false,
  };
}

/**
 * Décision d'accès à « Aide à la décision ».
 *
 * L'ordre des vérifications compte : l'authentification d'abord, puis
 * l'appartenance du projet, puis le groupe (étape absente pour les groupes B
 * et C), puis l'abonnement. Les deux conditions obligatoires sont donc bien
 * évaluées ensemble, et un projet des groupes B ou C est refusé même avec un
 * Client Pro actif.
 */
export function evaluateDecisionSupportAccess(
  input: DecisionSupportAccessInput,
): DecisionSupportAccess {
  const group = projectJourneyGroup(input.category);

  // 1. Utilisateur non connecté → authentification demandée avant toute chose.
  if (!input.authenticated) return deny("not_authenticated", group);

  // 2. Projet absent ou appartenant à un autre utilisateur → jamais de données.
  if (input.owned === false) return deny("not_owner", group);

  // 3. Groupes B et C → l'étape n'existe pas dans ces parcours (coût estimatif
  //    puis mise en relation uniquement).
  if (!isFullJourneyGroup(group)) return deny("group_not_eligible", group);

  // 4. Admin / modérateur → accès toujours accordé (même règle que `access.ts`).
  if (input.isAdmin) {
    return { allowed: true, reason: "ok", group, upgradeRequired: false, renewalRequired: false };
  }

  // 5. Abonnement : doit être un CLIENT PRO actif, valide et non expiré.
  const sub = input.subscription;
  if (!sub) return deny("not_client_pro", group, { upgradeRequired: true });

  // Compte gratuit → invitation à passer à Client Pro.
  if (sub.status === "free" || sub.type === "free") {
    return deny("free_plan", group, { upgradeRequired: true });
  }

  // Abonnement expiré / suspendu / inactif → blocage jusqu'à réactivation.
  if (sub.status === "expired") return deny("expired", group, { renewalRequired: true });
  if (sub.status === "pending") return deny("pending", group, { renewalRequired: true });
  if (sub.status === "trial_expired") return deny("trial_expired", group, { upgradeRequired: true });

  // Client Pro mensuel actif ET compatible avec le profil → accès autorisé.
  if (sub.type === "monthly" && sub.isActive && sub.planCompatible) {
    return { allowed: true, reason: "ok", group, upgradeRequired: false, renewalRequired: false };
  }

  // Essai gratuit en cours, forfait incompatible ou aucun abonnement.
  return deny("not_client_pro", group, { upgradeRequired: true });
}

/** Le message à afficher pour un motif de refus (FR). */
export const DECISION_SUPPORT_DENY_COPY: Record<
  DecisionSupportDenyReason,
  { title: string; description: string; cta: string | null }
> = {
  not_authenticated: {
    title: "Connexion requise",
    description:
      "Connectez-vous pour vérifier si votre projet et votre abonnement donnent accès à « Aide à la décision ».",
    cta: "Se connecter",
  },
  not_owner: {
    title: "Projet introuvable",
    description: "Ce projet n'existe pas ou n'est pas accessible depuis votre compte.",
    cta: null,
  },
  group_not_eligible: {
    title: "Aide à la décision indisponible pour ce type de projet",
    description:
      "Cette étape n'est pas incluse dans le parcours de ce type de projet : votre parcours se compose du coût estimatif puis de la mise en relation. Toutes les autres étapes restent accessibles.",
    cta: null,
  },
  free_plan: {
    title: "Passez à Client Pro pour utiliser l'aide à la décision",
    description:
      "Votre compte gratuit n'inclut pas « Aide à la décision ». Souscrivez à l'abonnement Client Pro pour anticiper vos achats et maîtriser votre budget.",
    cta: "Passer à Client Pro",
  },
  expired: {
    title: "Abonnement Client Pro expiré",
    description:
      "L'accès à « Aide à la décision » est suspendu jusqu'à la réactivation de votre abonnement Client Pro. Vos données et vos autres étapes sont conservées.",
    cta: "Renouveler mon abonnement",
  },
  pending: {
    title: "Abonnement Client Pro en attente de validation",
    description:
      "Votre paiement est en cours de validation. « Aide à la décision » sera accessible dès l'activation de votre abonnement Client Pro.",
    cta: "Suivre mon paiement",
  },
  trial_expired: {
    title: "Votre période d'essai est terminée",
    description:
      "« Aide à la décision » nécessite un abonnement Client Pro actif. Choisissez une offre pour retrouver l'accès.",
    cta: "Choisir une offre",
  },
  not_client_pro: {
    title: "Offre Client Pro requise",
    description:
      "« Aide à la décision » est réservée aux clients disposant d'un abonnement Client Pro actif et non expiré.",
    cta: "Voir les offres",
  },
};
