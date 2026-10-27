import { v } from "convex/values";
import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { getUserSubscriptionStatus } from "./subscriptionStatus";
import { readTrialConfig, trialIncludes } from "./trialConfig";
import { isFullJourneyGroup, projectJourneyGroup } from "../lib/projectJourney";
import { getClientProAccess } from "./access";
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
//   1. projet du parcours COMPLET (groupes A et D) — classification centrale
//      (`projectJourneyGroup`) ; l'étape est absente des parcours des groupes
//      B et C ;
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
  trial_no_module:
    "« Aide à la décision » n'est pas inclus dans votre période d'accès : réglez une cotisation Client Pro pour y accéder.",
  expired:
    "Vos crédits Client Pro sont épuisés : l'accès à « Aide à la décision » est bloqué jusqu'à une nouvelle cotisation.",
  pending:
    "Votre paiement Client Pro est en attente de validation : l'accès sera ouvert dès l'activation.",
  trial_expired:
    "Votre période d'accès Client Pro est terminée : une cotisation (crédits de projets) est requise.",
  not_client_pro:
    "« Aide à la décision » nécessite des crédits Client Pro disponibles.",
};

/**
 * Refus qui relèvent UNIQUEMENT de l'abonnement / de la cotisation : eux seuls
 * peuvent être levés par un droit Client Pro. Les refus structurels (non
 * connecté, projet d'autrui, parcours incomplet) restent définitifs.
 */
const SUBSCRIPTION_DENY_REASONS: ReadonlySet<DecisionSupportAccessReason> = new Set([
  "trial_no_module",
  "expired",
  "pending",
  "trial_expired",
  "not_client_pro",
]);

/** Erreur standard levée par les mutations protégées. */
export function decisionSupportAccessError(reason: DecisionSupportAccessReason): Error {
  return new Error(`${DECISION_ACCESS_MARKER}${DENY_MESSAGES[reason]}`);
}

/**
 * Charge le projet + l'utilisateur et calcule la décision d'accès.
 *
 * L'instantané d'abonnement n'est lu que lorsqu'il peut changer la décision
 * (utilisateur connecté, projet possédé, parcours complet) : les refus
 * évidents (non connecté, projet d'autrui, groupes B et C) ne coûtent aucune
 * lecture.
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
    user && owned && isFullJourneyGroup(projectJourneyGroup(project.category))
      ? await getUserSubscriptionStatus(ctx, user._id)
      : null;

  // Pendant la période d'essai, « Aide à la décision » n'est ouverte que si
  // l'administrateur a coché ce module dans la configuration de l'essai.
  const trialConfig =
    snapshot?.type === "trial" && snapshot?.isActive ? await readTrialConfig(ctx) : null;

  let access = evaluateDecisionSupportAccess({
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
          trialModuleAllowed: trialConfig ? trialIncludes(trialConfig, "decision") : false,
        }
      : null,
  });

  // ── Cotisation Client Pro (crédits de projets) ───────────────────────────
  // « Aide à la décision » est un service Client Pro : les crédits PAYÉS ou la
  // gratuité initiale l'ouvrent (règle serveur unique, partagée avec les
  // rapports PDF — `access.ts`). Les refus qui ne relèvent PAS de l'abonnement
  // (non connecté, projet d'autrui, parcours incomplet) ne sont jamais
  // contournés : la cotisation n'est lue que lorsqu'ils sont déjà écartés.
  if (!access.allowed && SUBSCRIPTION_DENY_REASONS.has(access.reason)) {
    const clientPro = await getClientProAccess(ctx, user, "decision");
    if (clientPro.allowed) {
      access = {
        allowed: true,
        reason: "ok",
        group: access.group,
        upgradeRequired: false,
        renewalRequired: false,
      };
    }
  }

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
