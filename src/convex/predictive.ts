"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { vly } from "../lib/vly-integrations";

// ============================================================================
// Predictive Intelligence (Pro/Expert)
// Uses AI to:
//   - Predict material price evolution
//   - Identify best purchasing periods
//   - Optimize the project budget
//   - Reduce material losses
// ============================================================================

type PredictiveInsights = {
  summary: string;
  pricePredictions: {
    material: string;
    category: string;
    predictedChangePct: number;
    trend: "hausse" | "baisse" | "stable";
    horizon: string;
    reasoning: string;
  }[];
  bestBuyingPeriods: {
    material: string;
    period: string;
    reason: string;
    savingPct: number;
  }[];
  budgetOptimizations: {
    title: string;
    description: string;
    potentialSaving: number;
  }[];
  lossReductions: {
    title: string;
    description: string;
    estimatedSavingPct: number;
  }[];
  overallSavingsPct: number;
  generatedAt: number;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

// ── Deterministic fallback (rule-based, Tunisian market 2026) ──────────────
function fallbackInsights(project: any, ce: any): PredictiveInsights {
  const breakdown: any[] = ce?.breakdown || [];
  const top = [...breakdown].sort((a, b) => b.estimatedCost - a.estimatedCost);
  const categories: { key: string; label: string; cost: number }[] = top.map(
    (b) => ({ key: b.category, label: b.label, cost: b.estimatedCost || 0 }),
  );

  const priceTrends: Record<
    string,
    { trend: "hausse" | "baisse" | "stable"; pct: number; horizon: string; reasoning: string }
  > = {
    ciment: { trend: "hausse", pct: 4.5, horizon: "6 mois", reasoning: "Hausse saisonnière des coûts d'énergie et de transport en été." },
    acier: { trend: "hausse", pct: 6.0, horizon: "3 mois", reasoning: "Tension sur l'acier importé et fluctuation des devises." },
    beton: { trend: "stable", pct: 1.5, horizon: "6 mois", reasoning: "Prix du béton prêt à l'emploi relativement stable." },
    sable: { trend: "hausse", pct: 3.0, horizon: "6 mois", reasoning: "Coût de transport en hausse depuis les carrières." },
    gravier: { trend: "stable", pct: 2.0, horizon: "6 mois", reasoning: "Offre locale suffisante, hausse modérée." },
    briques: { trend: "stable", pct: 1.8, horizon: "12 mois", reasoning: "Production locale stable." },
    parpaings: { trend: "stable", pct: 1.5, horizon: "12 mois", reasoning: "Prix encadrés par la concurrence locale." },
    carrelage: { trend: "baisse", pct: -3.0, horizon: "3 mois", reasoning: "Période de promotions chez les importateurs (soldes)." },
    marbre: { trend: "baisse", pct: -2.5, horizon: "3 mois", reasoning: "Arrivages importants des carrières de Thala." },
    peinture: { trend: "stable", pct: 1.2, horizon: "6 mois", reasoning: "Stabilité des prix des peintures locales." },
    bois: { trend: "hausse", pct: 5.0, horizon: "6 mois", reasoning: "Hausse des bois importés et du contreplaqué." },
    electricite: { trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Marché du câblage électrique stable." },
    plomberie: { trend: "hausse", pct: 3.5, horizon: "6 mois", reasoning: "Hausse du cuivre et des raccords importés." },
    toiture: { trend: "stable", pct: 1.5, horizon: "12 mois", reasoning: "Production locale de tuiles stable." },
    etancheite: { trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Produits d'étanchéité disponibles localement." },
    isolation: { trend: "stable", pct: 1.2, horizon: "12 mois", reasoning: "Offre locale en isolation stable." },
    gros_oeuvre: { trend: "hausse", pct: 4.0, horizon: "6 mois", reasoning: "Hausse combinée ciment + acier + main-d'œuvre." },
    second_oeuvre: { trend: "stable", pct: 1.5, horizon: "6 mois", reasoning: "Moyenne des finitions stable." },
    equipements: { trend: "stable", pct: 2.0, horizon: "6 mois", reasoning: "Équipements électroménagers et sanitaires stables." },
    main_oeuvre: { trend: "hausse", pct: 5.0, horizon: "6 mois", reasoning: "Pénurie de main-d'œuvre qualifiée, coûts en hausse." },
    transport: { trend: "hausse", pct: 3.5, horizon: "6 mois", reasoning: "Hausse du carburant et des frais de livraison." },
    etudes_imprevus: { trend: "stable", pct: 0.5, horizon: "12 mois", reasoning: "Frais d'études et permis stables." },
    divers: { trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Divers et imprévus stables." },
  };

  // Price predictions for the top 4 categories present in the breakdown
  const pricePredictions = categories.slice(0, 4).map((c) => {
    const t = priceTrends[c.key] || priceTrends.divers;
    return {
      material: c.label,
      category: c.key,
      predictedChangePct: t.pct,
      trend: t.trend,
      horizon: t.horizon,
      reasoning: t.reasoning,
    };
  });

  // Best buying periods
  const bestBuyingPeriods = [
    { material: "Ciment & béton", period: "Octobre – Février", reason: "Demande plus faible en hiver, prix au plus bas.", savingPct: 4 },
    { material: "Acier", period: "Avril – Mai", reason: "Fin de la haute saison de construction, stocks importateurs élevés.", savingPct: 5 },
    { material: "Carrelage & marbre", period: "Janvier – Mars", reason: "Soldes et promotions des importateurs.", savingPct: 6 },
    { material: "Bois", period: "Été (juin – août)", reason: "Baisse des importations pendant la basse saison.", savingPct: 4 },
    { material: "Peinture", period: "Septembre – Novembre", reason: "Fin des promotions de rentrée, stocks frais.", savingPct: 3 },
  ];

  const totalCost = ce?.totalCost || 0;

  const budgetOptimizations = [
    {
      title: "Achats groupés",
      description: "Regroupez ciment, sable et gravier en une seule commande pour négocier 5 à 8% de remise.",
      potentialSaving: Math.round(totalCost * 0.03),
    },
    {
      title: "Matériaux locaux",
      description: "Privilégiez les produits locaux (Bizerte, Kairouan, Thala) pour réduire le transport de 10 à 15%.",
      potentialSaving: Math.round(totalCost * 0.04),
    },
    {
      title: "Plan compact",
      description: "Un plan plus simple réduit le ratio surface/volume et les coûts de gros œuvre.",
      potentialSaving: Math.round(totalCost * 0.05),
    },
    {
      title: "Phasage des achats",
      description: "Étalez les achats selon les périodes favorables indiquées pour éviter la hausse saisonnière.",
      potentialSaving: Math.round(totalCost * 0.03),
    },
  ];

  const lossReductions = [
    {
      title: "Quantités +5%",
      description: "Prévoyez 5% de marge sur ciment et parpaings pour couvrir la casse et la découpe.",
      estimatedSavingPct: 4,
    },
    {
      title: "Stockage couvert",
      description: "Protégez ciment et plâtre de l'humidité : pertes réduites de 30% sur chantier.",
      estimatedSavingPct: 3,
    },
    {
      title: "Commande par phase",
      description: "Livrez les matériaux par phase de travaux pour éviter la détérioration et le vol.",
      estimatedSavingPct: 5,
    },
    {
      title: "Recoupe optimisée",
      description: "Plans de découpe du carrelage et du bois pour limiter les chutes à moins de 5%.",
      estimatedSavingPct: 6,
    },
  ];

  return {
    summary:
      `Analyse prédictive basée sur les tendances du marché tunisien 2026 : ` +
      `les postes les plus importants de votre projet (${categories[0]?.label || "construction"}) ` +
      `présentent un risque de hausse de prix, mais un phasage d'achat intelligent peut réduire ` +
      `le coût global de votre budget.`,
    pricePredictions,
    bestBuyingPeriods,
    budgetOptimizations,
    lossReductions,
    overallSavingsPct: 7,
    generatedAt: Date.now(),
  };
}

// ── Normalize AI output into the strict PredictiveInsights shape ────────────
function normalize(raw: any, project: any, ce: any): PredictiveInsights {
  const fallback = fallbackInsights(project, ce);
  const num = (x: any, d = 0) =>
    typeof x === "number" && isFinite(x) ? x : d;

  const trendOf = (t: any): "hausse" | "baisse" | "stable" =>
    t === "hausse" || t === "baisse" || t === "stable" ? t : "stable";

  const asArr = (x: any) => (Array.isArray(x) ? x : []);

  const pricePredictions = asArr(raw?.pricePredictions)
    .map((p: any) => ({
      material: String(p?.material || "Matériau"),
      category: String(p?.category || "divers"),
      predictedChangePct: clamp(num(p?.predictedChangePct), -25, 50),
      trend: trendOf(p?.trend),
      horizon: String(p?.horizon || "6 mois"),
      reasoning: String(p?.reasoning || "Analyse du marché tunisien."),
    }))
    .slice(0, 6);
  if (pricePredictions.length === 0) pricePredictions.push(...fallback.pricePredictions);

  const bestBuyingPeriods = asArr(raw?.bestBuyingPeriods)
    .map((p: any) => ({
      material: String(p?.material || "Matériau"),
      period: String(p?.period || "À définir"),
      reason: String(p?.reason || ""),
      savingPct: clamp(num(p?.savingPct, 3), 0, 25),
    }))
    .slice(0, 5);
  if (bestBuyingPeriods.length === 0) bestBuyingPeriods.push(...fallback.bestBuyingPeriods);

  const budgetOptimizations = asArr(raw?.budgetOptimizations)
    .map((p: any) => ({
      title: String(p?.title || "Optimisation"),
      description: String(p?.description || ""),
      potentialSaving: Math.round(clamp(num(p?.potentialSaving), 0, 1e9)),
    }))
    .slice(0, 6);
  if (budgetOptimizations.length === 0) budgetOptimizations.push(...fallback.budgetOptimizations);

  const lossReductions = asArr(raw?.lossReductions)
    .map((p: any) => ({
      title: String(p?.title || "Réduction des pertes"),
      description: String(p?.description || ""),
      estimatedSavingPct: clamp(num(p?.estimatedSavingPct, 3), 0, 40),
    }))
    .slice(0, 6);
  if (lossReductions.length === 0) lossReductions.push(...fallback.lossReductions);

  return {
    summary: String(raw?.summary || fallback.summary),
    pricePredictions,
    bestBuyingPeriods,
    budgetOptimizations,
    lossReductions,
    overallSavingsPct: clamp(num(raw?.overallSavingsPct, fallback.overallSavingsPct), 0, 40),
    generatedAt: Date.now(),
  };
}

// ============================================================================
// Action
// ============================================================================

export const generatePredictiveInsights = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<PredictiveInsights> => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");

    // Pro / Expert only (admin bypass for testing)
    const plan = user.subscriptionPlan ?? "free";
    if (plan !== "pro" && plan !== "expert" && user.role !== "admin") {
      throw new Error("OFFRE_GRATUITE:Le module Intelligence prédictive est réservé aux forfaits Pro et Expert.");
    }

    const project = await ctx.runQuery(api.projects.getProject, {
      projectId: args.projectId,
    });
    if (!project) throw new Error("Projet introuvable");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Accès refusé à ce projet");
    }

    const ce = project.costEstimate;

    // Build a compact summary of the cost breakdown for the AI
    const breakdownText = (ce?.breakdown || [])
      .map((b: any) => `${b.label}: ${b.estimatedCost} TND (${b.percentage}%)`)
      .join(" | ");

    const systemPrompt =
      "Tu es un expert en estimation de coûts de construction et en prévision des prix des matériaux sur le marché tunisien (prix 2026). " +
      "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans backticks, au format exact suivant : " +
      JSON.stringify({
        summary: "résumé de 1-2 phrases de l'analyse prédictive",
        pricePredictions: [{ material: "nom", category: "catégorie", predictedChangePct: 3.5, trend: "hausse|baisse|stable", horizon: "6 mois", reasoning: "explication" }],
        bestBuyingPeriods: [{ material: "nom", period: "mois", reason: "explication", savingPct: 4 }],
        budgetOptimizations: [{ title: "titre", description: "description", potentialSaving: 1500 }],
        lossReductions: [{ title: "titre", description: "description", estimatedSavingPct: 5 }],
        overallSavingsPct: 7,
      });

    const userPrompt =
      `Projet: ${project.name} (catégorie: ${project.category}, surface: ${project.surface ?? "N/A"} m², ` +
      `région: ${project.region ?? "non précisée"}).\n` +
      `Coût total estimé: ${ce?.totalCost ?? 0} TND.\n` +
      `Répartition budgétaire: ${breakdownText || "non disponible"}.\n\n` +
      `Génère une analyse d'intelligence prédictive : prévision d'évolution des prix des principaux matériaux, ` +
      `meilleures périodes d'achat, optimisations du budget et réduction des pertes de matériaux. ` +
      `Les montants d'économies potentielles (potentialSaving) doivent être en TND, plausibles par rapport au coût total.`;

    try {
      const result = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        maxTokens: 1200,
      });

      if (result.success && result.data?.choices?.[0]?.message?.content) {
        let text = result.data.choices[0].message.content.trim();
        // Strip code fences if the model wrapped the JSON
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
        const parsed = JSON.parse(text);
        const insights = normalize(parsed, project, ce);

        // Persist for Pro/Expert users
        try {
          await ctx.runMutation(api.projects.updatePredictiveInsights, {
            projectId: args.projectId,
            predictiveInsights: insights,
          });
        } catch (e) {
          // Persistence is optional; still return the insights
        }

        return insights;
      }
    } catch (e) {
      // Fall through to deterministic fallback
    }

    // Deterministic fallback (no AI key, network error, or parse error)
    const insights = fallbackInsights(project, ce);
    try {
      await ctx.runMutation(api.projects.updatePredictiveInsights, {
        projectId: args.projectId,
        predictiveInsights: insights,
      });
    } catch (e) {
      // ignore
    }
    return insights;
  },
});

