// ═══════════════════════════════════════════════════════════════════════════
// COPILOTE DU PROJET — action serveur (SANS AUCUN SERVICE IA EXTERNE)
// ───────────────────────────────────────────────────────────────────────────
// Le Copilote fonctionne EXCLUSIVEMENT à partir des données de Batibuild :
// calculs locaux, règles métier, conditions déterministes et recommandations
// prédéfinies. Aucun appel réseau vers un service d'IA (OpenAI, Gemini,
// Claude…) n'est effectué, et aucune clé d'API IA n'est requise.
//
// L'architecture passe par l'abstraction `CopilotEngine` (voir
// ./copilotEngine.ts) : aujourd'hui `RuleBasedCopilot`, demain un moteur IA
// pourra être branché sans modifier ni l'interface utilisateur ni le
// Project Journey.
//
// AUCUNE donnée projet n'est modifiée par cette action.
// ═══════════════════════════════════════════════════════════════════════════

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { detectPreference, type CopilotAction, type CopilotMode } from "./aiCopilotEngine";
import { getCopilotEngine } from "./copilotEngine";

const MODES: CopilotMode[] = [
  "auto",
  "summary",
  "budget",
  "dqe",
  "materials",
  "plans",
  "journey",
  "risks",
  "preparation",
  "optimize",
];

/**
 * Pose une question au Copilote pour le projet sélectionné.
 * Retourne l'analyse (faits sourcés + actions + informations manquantes) et
 * enregistre l'échange dans l'historique STRICTEMENT propre à ce projet.
 *
 * `enhanceWithAI` est conservé pour compatibilité : il n'active AUCUN appel
 * externe tant qu'aucun moteur IA n'est configuré (la règle reste locale).
 */
export const ask = action({
  args: {
    projectId: v.id("projects"),
    question: v.string(),
    mode: v.optional(v.string()),
    enhanceWithAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const question = args.question.trim().slice(0, 2000);
    if (!question) throw new Error("Question vide");

    // Contexte compact du projet — vérification d'accès côté serveur incluse
    // (null si le projet est introuvable ou non accessible).
    const context = await ctx.runQuery(api.aiCopilot.getProjectContext, {
      projectId: args.projectId,
    });
    if (!context) throw new Error("Projet introuvable ou accès refusé");

    const mode = (MODES.includes(args.mode as CopilotMode) ? args.mode : "auto") as CopilotMode;

    // Moteur local (règles) — aucune IA externe, aucun appel réseau.
    const engine = getCopilotEngine();
    const result = await engine.answer({ question, context, mode });

    // Préférence explicite (« je préfère… ») → action de mémorisation, qui
    // exige TOUJOURS une confirmation explicite de l'utilisateur.
    const preference = detectPreference(question);
    const actions: CopilotAction[] = preference
      ? [
          ...result.actions.slice(0, 4),
          { id: "memorize", label: "Mémoriser pour ce projet", kind: "confirm", note: preference },
        ]
      : result.actions;

    // ── Historique par projet (jamais mélangé entre projets) ──
    await ctx.runMutation(api.aiCopilot.addMessage, {
      projectId: args.projectId,
      role: "user",
      content: question,
    });
    await ctx.runMutation(api.aiCopilot.addMessage, {
      projectId: args.projectId,
      role: "assistant",
      content: result.content,
      narrative: result.narrative,
      facts: result.facts.map((f) => ({ label: f.label, value: f.value, kind: f.kind })),
      actions: actions.map((a) => ({
        id: a.id,
        label: a.label,
        kind: a.kind,
        target: a.target,
        note: a.note,
      })),
      missing: result.missing,
    });

    return {
      title: result.title,
      content: result.content,
      narrative: result.narrative,
      facts: result.facts,
      actions,
      missing: result.missing,
      engine: result.engine,
    };
  },
});
