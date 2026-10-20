import { v } from "convex/values";
import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { getUserSubscriptionStatus } from "./subscriptionStatus";
import { projectJourneyGroup } from "../lib/projectJourney";
import {
  evaluateDecisionSupportAccess,
  type DecisionSupportAccessReason,
} from "../lib/decisionSupportAccess";

// ============================================================================
// « AIDE À LA DÉCISION » — CONTRÔLE D'ACCÈS CÔTÉ SERVEUR
// ----------------------------------------------------------------------------
// Source de vérité UNIQUE de l'accès, réutilisée par TOUS les points d'entrée
// Convex du module (`decisionSupport.getProjectBudgetContext`,
// `getBudgetAnalysis`, `saveBudgetAnalysis`, `clearBudgetAnalysis`) et par
// l'interface (query réactive ci-dessous).
//
// Les deux conditions sont vérifiées SIMULTANÉMENT, à chaque appel :
//   1. projet du GROUPE A — classification centrale (`projectJourneyGroup`) ;
//      l'étape est absente des parcours des groupes B et C ;
//   2. abonnement CLIENT PRO actif, valide et non expiré — instantané
//      recalculé côté serveur par `getUserSubscriptionStatus` (aucune date ni
//      forfait fournis par le navigateur).
//
// L'interface ne fait que refléter cette décision : masquer un bouton ne suffit
// jamais, chaque query/mutation protégée rappelle ce contrôle.
// ============================================================================

/** Marqueur d'erreur : accès « Aide à la décision » refusé côté backend. */
export const DECISION_ACCESS_MARKER = "DECISION_ACCESS_REQUIRED:";

const DENY_MESSAGES: Record<DecisionSupportAccessReason, string> = {
  ok: "",
  not_authenticated: "Connectez-vous pour accéder à « Aide à la décision ».",
  not_owner: "Ce projet n'existe pas ou n'est pas accessible depuis votre compte.",
  group_not_eligible:
    "« Aide à la décision » n'est pas incluse dans le parcours de ce type de projet (coût estimatif puis mise en relation).",
  free_plan:
    "« Aide à la décision » nécessite un abonnement Client Pro actif : passez à Client Pro pour y accéder.",
  expired:
    "Votre abonnement Client Pro a expiré : l'accès à « Aide à la décision » est bloqué jusqu'à sa réactivation.",
  pending:
    "Votre paiement Client Pro est en attente de validation : l'accès sera ouvert dès l'activation.",
  trial_expired:
    "Votre période d'essai est terminée : un abonnement Client Pro actif est requis.",
  not_client_pro:
    "« Aide à la décision » nécessite un abonnement Client Pro actif et non expiré.",
};

/** Erreur standard levée par les mutations protégées. */
export function decisionSupportAccessError(reason: DecisionSupportAccessReason): Error {
  return new Error(`${DECISION_ACCESS_MARKER}${DENY_MESSAGES[reason]}`);
}

/**
 * Charge le projet + l'utilisateur et calcule la décision d'accès.
 *
 * L'instantané d'abonnement n'est lu que lorsqu'il peut changer la décision
 * (utilisateur connecté, projet possédé, groupe A) : les refus évidents (non
 * connecté, projet d'autrui, groupes B et C) ne coûtent aucune lecture.
 */
export async function resolveDecisionSupport(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const user = await getCurrentUser(ctx);
  const project = await ctx.db.get(projectId);
  const isAdmin = user?.role === "admin" || user?.role === "moderator";
  const owned = !!project && !!user && (project.userId === user._id || isAdmin);

  const snapshot =
    user && owned && projectJourneyGroup(project.category) === "A"
      ? await getUserSubscriptionStatus(ctx, user._id)
      : null;

  const access = evaluateDecisionSupportAccess({
    authenticated: !!user,
    isAdmin,
    owned,
    category: project?.category ?? null,
    subscription: snapshot
      ? {
          status: snapshot.status,
          type: snapshot.type,
          isActive: snapshot.isActive,
          planCompatible: snapshot.planCompatible,
        }
      : null,
  });

  return { access, project: project ?? null, user: user ?? null };
}

/** Variante « mutation » : lève une erreur explicite si l'accès est refusé. */
export async function requireDecisionSupport(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
) {
  const resolved = await resolveDecisionSupport(ctx, projectId);
  if (!resolved.access.allowed) {
    throw decisionSupportAccessError(resolved.access.reason);
  }
  // `allowed` implique un utilisateur connecté et un projet possédé.
  if (!resolved.project || !resolved.user) {
    throw decisionSupportAccessError("not_owner");
  }
  return { ...resolved, project: resolved.project, user: resolved.user };
}

/**
 * Décision d'accès pour un projet (query réactive).
 *
 * Utilisée par la page « Aide à la décision » et par son module : rechargement,
 * accès direct à l'URL et retour depuis un projet existant passent donc
 * toujours par la même décision serveur.
 */
export const getProjectDecisionSupportAccess = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const { access } = await resolveDecisionSupport(ctx, projectId);
    return access;
  },
});
