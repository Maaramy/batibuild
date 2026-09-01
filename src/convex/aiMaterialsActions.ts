"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { vly } from "../lib/vly-integrations";
import { requireClientProAccess } from "./access";
import { inferFloorsFromCategory } from "./projectTypes";
import {
  COPILOT_CATEGORY_BY_ID,
  matchCategoryMaterials,
  recommendForProject,
  optimizeBudget,
  improvePerformance,
  compareMaterials,
  fallbackChatAnswer,
  buildAssistantContext,
  RecommendResult,
  ProjectContext,
} from "./aiMaterialsEngine";

// ═══════════════════════════════════════════════════════════════════════════
// AI MATERIALS COPILOT — Actions IA (fichier « use node »).
// S'appuie sur le catalogue 2026 (materialPrices), les offres fournisseurs
// (materialOffers) et les profils fournisseurs (supplierProfiles). Chaque
// action dispose d'un repli déterministe : les prix ne sont jamais inventés.
// ═══════════════════════════════════════════════════════════════════════════

const asArray = (x: any): any[] => (Array.isArray(x) ? x : []);

const stripFences = (t: string) =>
  t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

async function loadMarketData(ctx: any) {
  // NOTE : les actions n'ont PAS accès à ctx.db — on passe par des queries publiques.
  const [materials, offers, suppliers] = await Promise.all([
    ctx.runQuery(api.materials.getMaterialPrices, {}).catch(() => []),
    ctx.runQuery(api.materials.getMaterialOffers, {}).catch(() => []),
    ctx.runQuery(api.supplierProfiles.getActiveSuppliers, {}).catch(() => []),
  ]);
  return {
    materials: asArray(materials).map((m) => ({
      _id: m._id,
      name: m.name,
      category: m.category,
      subcategory: m.subcategory,
      unit: m.unit,
      unitPrice: m.unitPrice,
      priceQuality: m.priceQuality,
      confidenceIndex: m.confidenceIndex,
      minPrice: m.minPrice,
      avgPrice: m.avgPrice,
      maxPrice: m.maxPrice,
      availability: m.availability,
      brand: m.brand,
      manufacturer: m.manufacturer,
    })),
    offers: asArray(offers).map((o) => ({
      productId: o.productId,
      name: o.name,
      unit: o.unit,
      minPrice: o.minPrice,
      avgPrice: o.avgPrice,
      maxPrice: o.maxPrice,
      supplier: o.supplier,
      governorate: o.governorate,
      reliabilityIndex: o.reliabilityIndex,
      availability: o.availability,
    })),
    suppliers: asArray(suppliers)
      .filter((s) => s.isVisible !== false)
      .map((s) => ({
        _id: s._id,
        companyName: s.companyName,
        phone: s.phone,
        address: s.address,
        website: s.website,
        specialties: s.specialties,
        regions: s.regions,
        isVisible: s.isVisible,
      })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSE COMPLÈTE — 3 solutions par catégorie + coût + recommandation finale
// ═══════════════════════════════════════════════════════════════════════════
export const recommendMaterials = action({
  args: {
    projectId: v.optional(v.id("projects")),
    context: v.any(),
    categories: v.array(v.string()),
    enhanceWithAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<RecommendResult> => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Matériaux IA");

    let project: any = null;
    if (args.projectId) {
      project = await ctx.runQuery(api.projects.getProject, { projectId: args.projectId }).catch(() => null);
    }

    const context: ProjectContext = {
      ...(args.context || {}),
      projectName: project?.name || args.context?.projectName,
      projectCategory: project?.category || args.context?.projectCategory,
      region: args.context?.region || project?.region,
      surface: args.context?.surface ?? project?.surface ?? 0,
      floors: args.context?.floors ?? project?.floors ?? inferFloorsFromCategory(project?.category),
      rooms: args.context?.rooms || {
        bathrooms: project?.bathrooms,
        kitchens: project?.kitchens,
        bedrooms: project?.bedrooms,
      },
      terrainSurface: args.context?.terrainSurface ?? project?.surfaceTotale,
      priorities: args.context?.priorities || { price: 50, quality: 50, isolation: 50, durability: 50, eco: 50 },
      standing: args.context?.standing || "standard",
      // Budget moyen appliqué systématiquement : les estimations ne dépendent
      // plus d'un choix client (l'option « Mon budget & mes priorités » a été
      // supprimée). On écrase tout budget fourni par le client.
      budgetMode: "moyen",
      budgetAmount: undefined,
      year: args.context?.year || new Date().getFullYear(),
    };

    const { materials, offers } = await loadMarketData(ctx);
    let result = recommendForProject({
      context,
      categories: args.categories,
      materials,
      offers,
    });

    // ── Enrichissement IA de la recommandation finale (avec repli sûr) ──
    if (args.enhanceWithAI !== false && result.categories.length > 0) {
      try {
        const summary = result.categories
          .map((c) => {
            const s = c.solutions.find((x) => x.profile === "equilibre") || c.solutions[0];
            return `- ${c.label} → ${s.material.name} (${s.material.band.avg.toFixed(2)} TND/${s.material.unit}, score ${s.scores.noteGlobale}/100)`;
          })
          .join("\n");
        const aiRes = await vly.ai.completion({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Tu es un expert matériaux de construction pour le marché tunisien (prix 2026). Réponds UNIQUEMENT avec un objet JSON valide : {\"explanation\": \"2-4 phrases en français expliquant la recommandation finale, ses avantages, limites, coût estimé et durée de vie, en citant des chiffres\", \"advantages\": [\"3 avantages courts\"], \"limits\": [\"2 limites courtes\"]}. Ne présente jamais la recommandation comme une certitude absolue.",
            },
            {
              role: "user",
              content:
                `Projet : ${context.projectName || "Sans nom"} (${context.projectCategory || "?"}), ${context.surface || "?"} m², ` +
                `${context.floors || 1} niveau(x), région ${context.region || "non précisée"}, standing ${context.standing}, budget ${context.budgetMode}${context.budgetAmount ? " (" + context.budgetAmount + " TND)" : ""}.\n` +
                `Coût total estimé des matériaux recommandés : ${result.cost.total} TND (fourchette ${result.cost.min} – ${result.cost.max} TND).\n` +
                `Recommandations par catégorie :\n${summary}\n\n` +
                `Rédige l'explication de la recommandation finale (solution recommandée : ${result.recommendation.solution}).`,
            },
          ],
          temperature: 0.4,
          maxTokens: 700,
        });
        if (aiRes.success && aiRes.data?.choices?.[0]?.message?.content) {
          const parsed = JSON.parse(stripFences(aiRes.data.choices[0].message.content));
          if (typeof parsed?.explanation === "string" && parsed.explanation.length > 20) {
            result = {
              ...result,
              recommendation: {
                ...result.recommendation,
                explanation: parsed.explanation,
                advantages: Array.isArray(parsed.advantages) ? parsed.advantages.slice(0, 4).map(String) : result.recommendation.advantages,
                limits: Array.isArray(parsed.limits) ? parsed.limits.slice(0, 3).map(String) : result.recommendation.limits,
              },
            };
          }
        }
      } catch {
        // Repli déterministe : résultat inchangé
      }
    }

    return result;
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPARATEUR INTELLIGENT (§12) — jusqu'à 5 matériaux
// ═══════════════════════════════════════════════════════════════════════════
export const compareCopilotMaterials = action({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Matériaux IA");

    if (args.ids.length < 2 || args.ids.length > 5) {
      throw new Error("Sélectionnez entre 2 et 5 matériaux à comparer.");
    }
    const { materials, offers } = await loadMarketData(ctx);
    const comparison = compareMaterials({ ids: args.ids, materials, offers });

    try {
      const aiRes = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert matériaux de construction Tunisie 2026. Réponds avec un JSON valide : {\"narrative\": \"3-5 phrases comparant les matériaux, avec chiffres et recommandation finale nuancée\"}.",
          },
          {
            role: "user",
            content: comparison.materials
              .map(
                (m) =>
                  `- ${m.name} : ${m.band.avg.toFixed(2)} TND/${m.unit || "u"} (fourchette ${m.band.min.toFixed(2)}–${m.band.max.toFixed(2)}), ` +
                  `score global ${m.scores.noteGlobale}/100, thermique ${m.scores.isolationThermique}/100, résistance ${m.scores.resistance}/100, durabilité ${m.scores.durabilite}/100.`,
              )
              .join("\n"),
          },
        ],
        temperature: 0.4,
        maxTokens: 400,
      });
      if (aiRes.success && aiRes.data?.choices?.[0]?.message?.content) {
        const parsed = JSON.parse(stripFences(aiRes.data.choices[0].message.content));
        return { ...comparison, narrative: String(parsed?.narrative || "") };
      }
    } catch {
      // ignore
    }
    return { ...comparison, narrative: "" };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMISER MON BUDGET AVEC L'IA (§14)
// ═══════════════════════════════════════════════════════════════════════════
export const optimizeCopilotBudget = action({
  args: { result: v.any(), budgetAmount: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Matériaux IA");

    const optimization = optimizeBudget({ result: args.result as RecommendResult, budgetAmount: args.budgetAmount });
    try {
      const aiRes = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert en optimisation budgétaire construction Tunisie 2026. Réponds avec un JSON valide : {\"summary\": \"2-4 phrases résumant les économies, les substitutions proposées et les risques éventuels\"}.",
          },
          {
            role: "user",
            content:
              `Budget initial ${optimization.originalTotal} TND → optimisé ${optimization.optimizedTotal} TND (économie ${optimization.savings} TND, ${optimization.savingsPct}%).\n` +
              `Modifications : ${optimization.changes.map((c) => `${c.categoryLabel} : ${c.from} → ${c.to} (−${c.saving} TND)`).join(" ; ") || "aucune"}\n` +
              `Note : ${optimization.note}`,
          },
        ],
        temperature: 0.4,
        maxTokens: 400,
      });
      if (aiRes.success && aiRes.data?.choices?.[0]?.message?.content) {
        const parsed = JSON.parse(stripFences(aiRes.data.choices[0].message.content));
        return { ...optimization, summary: String(parsed?.summary || "") };
      }
    } catch {
      // ignore
    }
    return { ...optimization, summary: "" };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// AMÉLIORER LA PERFORMANCE ÉNERGÉTIQUE (§15)
// ═══════════════════════════════════════════════════════════════════════════
export const improveCopilotPerformance = action({
  args: { result: v.any() },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Matériaux IA");

    return improvePerformance({ result: args.result as RecommendResult });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSISTANT CONVERSATIONNEL (§13)
// ═══════════════════════════════════════════════════════════════════════════
export const askMaterialsAssistant = action({
  args: {
    question: v.string(),
    projectContext: v.optional(v.string()),
    analysisContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");

    // Services Client Pro : abonnement payant actif requis
    await requireClientProAccess(ctx, user, "Matériaux IA");

    if (!args.question.trim()) throw new Error("Question vide");

    const context = [args.projectContext, args.analysisContext].filter(Boolean).join("\n");

    try {
      const aiRes = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Tu es « Assistant Matériaux IA » de batibuild App (Tunisie, prix 2026). Réponds en français, de façon structurée (puces si utile), concrète et adaptée au projet fourni. " +
              "Règles : n'invente JAMAIS un prix — si une donnée manque, indique-le clairement ; ne présente pas les estimations comme des garanties ; " +
              "pour les éléments structurels/sécurité, recommande la validation par un professionnel. Réponds en texte simple (pas de JSON).",
          },
          { role: "user", content: `Contexte projet :\n${context || "Aucun projet précisé."}\n\nQuestion : ${args.question}` },
        ],
        temperature: 0.5,
        maxTokens: 600,
      });
      if (aiRes.success && aiRes.data?.choices?.[0]?.message?.content) {
        return { answer: aiRes.data.choices[0].message.content.trim() };
      }
    } catch {
      // Repli déterministe
    }
    return { answer: fallbackChatAnswer(args.question, {}) };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXTE TEXTE DU PROJET POUR LE CHAT (§13)
// ═══════════════════════════════════════════════════════════════════════════
export const getAssistantProjectContext = action({
  args: { result: v.optional(v.any()), context: v.optional(v.any()) },
  handler: async (ctx, args) => {
    return buildAssistantContext(args.result as RecommendResult | null, args.context as ProjectContext | null);
  },
});

// Réexport du moteur pour les tests / réutilisation.
export { COPILOT_CATEGORY_BY_ID, matchCategoryMaterials };
