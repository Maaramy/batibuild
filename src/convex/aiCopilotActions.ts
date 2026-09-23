"use node";

// ═══════════════════════════════════════════════════════════════════════════
// COPILOTE AI DU DASHBOARD — action IA (fichier « use node »)
// ───────────────────────────────────────────────────────────────────────────
// L'analyse déterministe (aiCopilotEngine) est TOUJOURS produite, même sans
// IA : elle est sourcée exclusivement dans les données du projet sélectionné.
// L'appel IA n'ajoute qu'une explication en langage naturel (clairement
// présentée comme une recommandation) et se désactive silencieusement en cas
// d'échec. AUCUNE donnée projet n'est modifiée par cette action.
// ═══════════════════════════════════════════════════════════════════════════

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { vly } from "../lib/vly-integrations";
import {
  buildContextDigest,
  detectPreference,
  runCopilotAnalysis,
  NOT_AVAILABLE,
  type CopilotAction,
  type CopilotMode,
} from "./aiCopilotEngine";

const MODES: CopilotMode[] = [
  "auto",
  "summary",
  "budget",
  "dqe",
  "materials",
  "plans",
  "journey",
  "risks",
  "optimize",
];

/**
 * Pose une question au Copilote pour le projet sélectionné.
 * Retourne l'analyse (faits sourcés + actions + informations manquantes) et
 * enregistre l'échange dans l'historique STRICTEMENT propre à ce projet.
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
    const answer = runCopilotAnalysis(question, context, mode);

    // Préférence explicite (« je préfère… ») → action de mémorisation, qui
    // exige TOUJOURS une confirmation explicite de l'utilisateur.
    const preference = detectPreference(question);
    const actions: CopilotAction[] = preference
      ? [
          ...answer.actions.slice(0, 4),
          { id: "memorize", label: "Mémoriser pour ce projet", kind: "confirm", note: preference },
        ]
      : answer.actions;

    // ── Enrichissement IA optionnel (repli déterministe garanti) ──
    let narrative: string | undefined;
    if (args.enhanceWithAI !== false) {
      try {
        const aiRes = await vly.ai.completion({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Tu es le Copilote AI de BatiBuild, assistant de PROJET (pas un assistant générique). " +
                `Tu réponds en français, en 3 à 5 phrases, UNIQUEMENT à partir du contexte projet fourni. ` +
                `Si une information manque dans le contexte, écris exactement : « ${NOT_AVAILABLE} ». ` +
                "Ne jamais inventer de chiffres : distingue clairement donnée enregistrée, calcul, estimation et recommandation. " +
                "Tu ne modifies aucun projet : toute suggestion passe par la validation de l'utilisateur.",
            },
            {
              role: "user",
              content: `Contexte du projet sélectionné :\n${buildContextDigest(context)}\n\nQuestion : ${question}`,
            },
          ],
          temperature: 0.3,
          maxTokens: 500,
        });
        const text = aiRes.success ? aiRes.data?.choices?.[0]?.message?.content : null;
        if (typeof text === "string" && text.trim().length > 30) {
          narrative = text.trim().slice(0, 2000);
        }
      } catch {
        // Repli silencieux : l'analyse déterministe suffit.
      }
    }

    // ── Historique par projet (jamais mélangé entre projets) ──
    await ctx.runMutation(api.aiCopilot.addMessage, {
      projectId: args.projectId,
      role: "user",
      content: question,
    });
    await ctx.runMutation(api.aiCopilot.addMessage, {
      projectId: args.projectId,
      role: "assistant",
      content: answer.content,
      narrative,
      facts: answer.facts.map((f) => ({ label: f.label, value: f.value, kind: f.kind })),
      actions: actions.map((a) => ({
        id: a.id,
        label: a.label,
        kind: a.kind,
        target: a.target,
        note: a.note,
      })),
      missing: answer.missing,
    });

    return {
      title: answer.title,
      content: answer.content,
      narrative,
      facts: answer.facts,
      actions,
      missing: answer.missing,
    };
  },
});
