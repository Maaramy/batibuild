"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  AI_DISCLAIMER,
  DEMO_DISCLAIMER,
  buildDemoAnalysis,
  parseAiAnalysis,
  type AiAnalysisPayload,
} from "../lib/siteIntelligence";

/** Résultat explicite : évite l'inférence circulaire entre l'action et `api`. */
export interface AnalyzeSitePhotosResult {
  mode: "ai" | "demo" | "unavailable" | "error";
  available: boolean;
  analysisId: string | null;
  payload: AiAnalysisPayload | null;
  disclaimer: string;
  message: string;
  detail?: string;
  usage?: { tokenInput: number; tokenOutput: number; costUsd: number };
}

// ============================================================================
// AI SITE INTELLIGENCE — analyse multimodale (fichier « use node »)
// ----------------------------------------------------------------------------
// Aucune clé API n'est exposée au navigateur : l'appel au fournisseur se fait
// uniquement ici, avec `OPENAI_API_KEY` (et `OPENAI_BASE_URL` / modèle
// facultatifs). Trois issues honnêtes :
//   • `ai`          : analyse réelle, validée puis persistée ;
//   • `demo`        : exemple local, marqué comme tel, sans analyse d'image ;
//   • `unavailable` : aucun fournisseur configuré — rien n'est inventé.
// ============================================================================

const TIMEOUT_MS = 60_000;
const MAX_IMAGES = 6;

const CORRECTION_PROMPT =
  "Toute observation est une ESTIMATION visuelle. L'absence d'un élément sur une photo ne prouve jamais qu'il n'est pas réalisé. " +
  "Ne conclus jamais à une non-conformité technique : au mieux un « point à vérifier ». " +
  "Le taux d'avancement proposé doit refléter uniquement ce qui est visible et rester prudent.";

function systemPrompt(phaseName: string, phaseKey: string) {
  return (
    "Tu es un inspecteur de chantier BTP en Tunisie. Tu analyses des photos datées pour aider au suivi d'avancement. " +
    CORRECTION_PROMPT +
    " Réponds UNIQUEMENT par un objet JSON valide, sans texte ni backticks, au format exact : " +
    JSON.stringify({
      phaseKey,
      elements: ["éléments de construction visibles"],
      worksObserved: ["travaux apparemment réalisés"],
      worksRemaining: ["travaux restant à réaliser"],
      changes: ["évolution par rapport aux photos précédentes, ou tableau vide"],
      anomalies: [{ label: "point à vérifier", severity: "faible|moyen|eleve|critique", evidence: "élément visible justifiant l'observation" }],
      progressEstimate: 0,
      confidence: 0,
      summary: "2 à 4 phrases factuelles, en français",
    }) +
    ` La phase concernée est « ${phaseName} » (clé ${phaseKey}). ` +
    "progressEstimate et confidence sont des nombres entre 0 et 100."
  );
}

export const analyzeSitePhotos = action({
  args: {
    siteId: v.id("siteProjects"),
    imageIds: v.array(v.id("siteMonitoringImages")),
    phaseKey: v.string(),
    mode: v.union(v.literal("auto"), v.literal("demo")),
  },
  handler: async (ctx, args): Promise<AnalyzeSitePhotosResult> => {
    const context = await ctx.runQuery(api.siteIntelligence.getAnalysisContext, {
      siteId: args.siteId,
      imageIds: args.imageIds,
      phaseKey: args.phaseKey,
    });

    // ── Mode démonstration : jamais mélangé avec une vraie analyse ──────────
    if (args.mode === "demo") {
      if (!context.provider.demoAllowed) {
        throw new Error("Le mode démonstration est désactivé sur cette installation.");
      }
      const payload = buildDemoAnalysis({
        phaseKey: args.phaseKey,
        progress: context.phase.declaredProgress,
        imageCount: context.images.length,
      });
      const analysisId = await ctx.runMutation(api.siteIntelligence.recordAnalysis, {
        siteId: args.siteId,
        imageIds: args.imageIds,
        mode: "demo",
        provider: "demo-engine",
        phaseKey: payload.phaseKey,
        elements: payload.elements,
        worksObserved: payload.worksObserved,
        worksRemaining: payload.worksRemaining,
        changes: [],
        visualAnomalies: [],
        progressEstimate: payload.progressEstimate,
        confidence: 0,
        summary: DEMO_DISCLAIMER,
      });
      return {
        mode: "demo" as const,
        available: true,
        analysisId,
        payload,
        disclaimer: DEMO_DISCLAIMER,
        message:
          "Exemple de démonstration enregistré. Aucune image n'a été analysée : ces observations ne décrivent pas le chantier.",
      };
    }

    // ── Aucun fournisseur : on l'annonce, on n'invente rien ────────────────
    if (!context.provider.available) {
      return {
        mode: "unavailable" as const,
        available: false,
        analysisId: null,
        payload: null,
        disclaimer: AI_DISCLAIMER,
        message:
          "Analyse d'images non disponible : aucune clé de fournisseur IA n'est configurée sur le serveur. Le suivi manuel et le diagnostic restent disponibles.",
      };
    }

    if (context.usedToday >= context.dailyLimit) {
      throw new Error(
        `Limite quotidienne atteinte (${context.dailyLimit} analyses). Réessayez demain ou utilisez le diagnostic automatique.`,
      );
    }
    if (context.images.length > MAX_IMAGES) {
      throw new Error(`Une analyse est limitée à ${MAX_IMAGES} photos.`);
    }

    const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const model = context.provider.model;
    const previous = context.previous
      ? `Analyse précédente du ${new Date(context.previous.createdAt).toLocaleDateString("fr-FR")} — ` +
        `éléments vus : ${context.previous.elements.join(", ") || "aucun"}. ` +
        `Travaux observés : ${context.previous.worksObserved.join(", ") || "non précisé"}. ` +
        "Compare les nouvelles photos à cette analyse pour décrire les changements."
      : "Aucune analyse antérieure : ne décris pas de changement.";
    const userText =
      `Chantier : ${context.site.name} (${context.site.category}), ${context.site.surface ?? "?"} m², ` +
      `${context.site.region ?? "région non précisée"}.\n` +
      `Phase : ${context.phase.name}. Avancement déclaré par l'équipe : ${context.phase.declaredProgress} %.\n` +
      `${previous}\n` +
      `Photos fournies : ${context.images.length}, prises le ${context.images
        .map((image) => new Date(image.capturedAt).toLocaleDateString("fr-FR"))
        .join(", ")}.` +
      (context.images.some((image) => image.notes)
        ? `\nObservations terrain : ${context.images
            .map((image) => image.notes)
            .filter(Boolean)
            .join(" · ")}`
        : "");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt(context.phase.name, args.phaseKey) },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                ...context.images.map((image) => ({
                  type: "image_url" as const,
                  image_url: { url: image.url },
                })),
              ],
            },
          ],
        }),
      });
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return {
        mode: "error" as const,
        available: true,
        analysisId: null,
        payload: null,
        disclaimer: AI_DISCLAIMER,
        message: aborted
          ? "Le fournisseur IA n'a pas répondu dans le délai imparti. Aucune analyse n'a été enregistrée."
          : "Le fournisseur IA est injoignable pour le moment. Aucune analyse n'a été enregistrée.",
      };
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        mode: "error" as const,
        available: true,
        analysisId: null,
        payload: null,
        disclaimer: AI_DISCLAIMER,
        message:
          response.status === 401 || response.status === 403
            ? "Clé du fournisseur IA refusée : l'analyse est indisponible. Contactez l'administrateur."
            : `Le fournisseur IA a renvoyé une erreur (${response.status}). Aucune analyse n'a été enregistrée.`,
        detail: detail.slice(0, 200),
      };
    }

    const body = (await response.json().catch(() => null)) as
      | {
          choices?: { message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        }
      | null;
    const content = body?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim());
    } catch {
      parsed = null;
    }

    const payload = parseAiAnalysis(parsed, context.phaseKeys, context.images.length);
    if (!payload) {
      return {
        mode: "error" as const,
        available: true,
        analysisId: null,
        payload: null,
        disclaimer: AI_DISCLAIMER,
        message:
          "La réponse du fournisseur IA est inexploitable : aucune analyse n'a été enregistrée plutôt que d'afficher un résultat douteux.",
      };
    }

    const tokenInput = body?.usage?.prompt_tokens ?? 0;
    const tokenOutput = body?.usage?.completion_tokens ?? 0;
    const costUsd = (tokenInput * 0.15 + tokenOutput * 0.6) / 1_000_000;

    const analysisId = await ctx.runMutation(api.siteIntelligence.recordAnalysis, {
      siteId: args.siteId,
      imageIds: args.imageIds,
      mode: "ai",
      provider: context.provider.provider,
      model,
      phaseKey: payload.phaseKey,
      elements: payload.elements,
      worksObserved: payload.worksObserved,
      worksRemaining: payload.worksRemaining,
      changes: payload.changes,
      visualAnomalies: payload.anomalies,
      progressEstimate: payload.progressEstimate,
      confidence: payload.confidence,
      summary: payload.summary,
      tokenInput,
      tokenOutput,
      costUsd,
    });

    return {
      mode: "ai" as const,
      available: true,
      analysisId,
      payload,
      disclaimer: AI_DISCLAIMER,
      message:
        "Analyse enregistrée comme estimation : validez ou corrigez l'avancement proposé avant qu'il ne devienne officiel.",
      usage: { tokenInput, tokenOutput, costUsd },
    };
  },
});
