"use node";

import { v, type GenericId } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { vly } from "../lib/vly-integrations";
import {
  INVESTMENT_TYPE_META,
  INVESTMENT_ZONES,
  analysisInputValidator,
  type InvestmentAiInsights,
} from "./investmentTypes";
import { normalizeInput, runEngine, fallbackInsights } from "./investments";

// ============================================================================
// Actions IA — Analyse de rentabilité immobilière & Assistant Investisseur
// ============================================================================

// ── Normalisation des insights IA ───────────────────────────────────────────

function normalizeAiInsights(
  raw: any,
  input: ReturnType<typeof normalizeInput>,
  results: ReturnType<typeof runEngine>,
): InvestmentAiInsights {
  const fb = fallbackInsights(input, results);
  const strArr = (x: any, d: string[]) =>
    Array.isArray(x) && x.length > 0
      ? x.map((i: any) => String(i).trim()).filter(Boolean).slice(0, 8)
      : d;

  return {
    summary: String(raw?.summary || fb.summary),
    verdict: String(raw?.verdict || fb.verdict),
    recommendations: strArr(raw?.recommendations, fb.recommendations),
    risks: strArr(raw?.risks, fb.risks),
    marketNotes: strArr(raw?.marketNotes, fb.marketNotes),
    usedFallback: false,
    generatedAt: Date.now(),
  };
}

// ── runAnalysis : moteur + conseil IA + persistance ─────────────────────────

export const runAnalysis = action({
  args: { input: analysisInputValidator },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");

    const normalized = normalizeInput(args.input);
    const results = runEngine(normalized);
    const meta = INVESTMENT_TYPE_META[normalized.investmentType];
    const ind = results.indicators;

    const systemPrompt =
      "Tu es un conseiller en investissement immobilier spécialisé dans le marché tunisien (prix 2026). " +
      "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans backticks, au format exact : " +
      JSON.stringify({
        summary: "résumé de 1-2 phrases de l'analyse",
        verdict: "verdict court (ex: Excellent investissement)",
        recommendations: ["recommandation 1", "recommandation 2"],
        risks: ["risque 1", "risque 2"],
        marketNotes: ["note de marché 1", "note de marché 2"],
      });

    const userPrompt =
      `Type de bien: ${meta.label}. Zone: ${results.zone.name} (indice de demande ${results.zone.demandIndex}/100, risque ${results.zone.riskScore}/100, rang ${results.zone.rank}).\n` +
      `Prix d'achat: ${ind.purchasePrice} TND · Coût total: ${ind.totalCost} TND · Loyer mensuel: ${normalized.monthlyRent} TND (taux d'occupation ${normalized.occupancyRate}%).\n` +
      `Revenu net annuel: ${ind.netAnnualIncome} TND · Rendement brut ${ind.grossYieldPct}% · rendement net ${ind.netYieldPct}%.\n` +
      `Cash-flow mensuel: ${ind.monthlyCashflow} TND · ROI annuel ${ind.roiAnnualPct}% · ROI 5 ans ${ind.roi5yPct}% · ROI 10 ans ${ind.roi10yPct}%.\n` +
      `Récupération du capital: ${ind.paybackYears} ans · Score IA: ${results.score.total}/100 (${results.score.grade}).\n` +
      `Prévisions: ${results.forecastSummary.map((s) => `${s.label} gain ${s.gain} TND, valeur ${s.futureValue} TND`).join(" · ")}.\n` +
      "Génère un conseil d'investissement personnalisé et réaliste. Les recommandations doivent être concrètes et chiffrées en TND.";

    let insights: InvestmentAiInsights;
    try {
      const result = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        maxTokens: 1000,
      });
      if (result.success && result.data?.choices?.[0]?.message?.content) {
        let text = result.data.choices[0].message.content.trim();
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
        const parsed = JSON.parse(text);
        insights = normalizeAiInsights(parsed, normalized, results);
      } else {
        insights = fallbackInsights(normalized, results);
      }
    } catch {
      insights = fallbackInsights(normalized, results);
    }

    const id = (await ctx.runMutation(api.investments.saveAnalysis, {
      input: normalized as any,
      results,
      aiInsights: insights,
    })) as GenericId<"investmentAnalyses">;

    return { _id: id, input: normalized, results, aiInsights: insights };
  },
});

// ── Assistant IA Investisseur ───────────────────────────────────────────────

function fallbackAssistant(message: string, context?: string): string {
  const m = message.toLowerCase();
  const zoneRank = [...INVESTMENT_ZONES].sort(
    (a, b) => b.demandIndex * 0.6 + (100 - b.riskScore) * 0.4 - (a.demandIndex * 0.6 + (100 - a.riskScore) * 0.4),
  );
  const top = zoneRank.slice(0, 3);

  if (m.includes("rentab") || m.includes("rendement") || m.includes("rentable")) {
    return (
      "En Tunisie, les rendements locatifs nets se situent généralement entre 5% et 8% :\n" +
      "• Appartement : 5,5 – 7% net\n• Local commercial : 7 – 9%\n• Villa : 3,5 – 5%\n\n" +
      "Un rendement net supérieur à 6% est considéré comme bon. Comparez toujours avec le taux d'intérêt bancaire (actuellement ~8% pour l'immobilier) et la croissance de la valeur du bien."
    );
  }
  if (m.includes("quartier") || m.includes("zone") || m.includes("ville") || m.includes("où investir") || m.includes("meilleur endroit")) {
    return (
      `Les zones les plus attractives pour investir en Tunisie aujourd'hui :\n` +
      top.map((z, i) => `• ${i + 1}. ${z.name} — demande ${z.demandIndex}/100, prix ${z.pricePerM2.toLocaleString("fr-FR")} TND/m², risque ${z.riskScore}/100`).join("\n") +
      "\n\nLes grandes villes (Tunis, Sousse, Sfax) offrent la meilleure liquidité ; les zones balnéaires (Nabeul, Monastir, Djerba) excellent pour la location saisonnière."
    );
  }
  if (m.includes("10 ans") || m.includes("dans 10") || m.includes("gagner") || m.includes("profit") || m.includes("combien vais-je")) {
    return (
      "Sur 10 ans, la performance d'un bien locatif repose sur 2 leviers :\n" +
      "1. Les revenus locatifs cumulés (loyers croissants de ~3%/an, charges indexées sur l'inflation).\n" +
      "2. La plus-value à la revente (appréciation moyenne de 4-5%/an en Tunisie).\n\n" +
      "Un bien à 420 000 TND avec 42 000 TND de revenu net annuel récupère son capital en 10 ans et génère généralement un gain cumulé de 30 à 60% du capital investi à l'horizon 10 ans (selon le scénario)."
    );
  }
  if (m.includes("risque") || m.includes("risqué")) {
    return (
      "Principaux risques d'un investissement immobilier en Tunisie :\n" +
      "• Vacance locative (prévoyez 5-10% de taux d'occupation réduit)\n• Liquidité du marché (revente plus lente hors des grandes villes)\n" +
      "• Fiscalité et charges en hausse\n• Conjoncture économique et pouvoir d'achat\n\n" +
      "Mitigation : choisissez une zone à forte demande (Tunis, Sousse, Sfax), conservez une réserve de 5% du budget et diversifiez par type de bien."
    );
  }
  if (m.includes("crédit") || m.includes("bank") || m.includes("banque") || m.includes("financ")) {
    return (
      "En Tunisie, le crédit immobilier est accessible avec un apport de 20-30% et un taux autour de 7,5-8,5% sur 15-25 ans.\n" +
      "Règle de prudence : le loyer doit couvrir au moins 70-80% de la mensualité. Utilisez le levier avec prudence — le coût total du crédit peut doubler le prix du bien sur 20 ans."
    );
  }
  if (m.includes("terrain") || m.includes("constructible")) {
    return (
      "Le terrain constructible est un investissement à long terme : pas de revenus immédiats, mais un potentiel d'appréciation élevé (7%+/an dans les zones d'expansion).\n" +
      "Avant d'acheter : vérifiez le classement du plan d'aménagement, la viabilisation (eau, électricité, voirie) et le titre foncier. Idéal comme réserve de valeur sur 5-10 ans."
    );
  }
  if (context) {
    return `Voici mon analyse basée sur votre étude en cours : ${context.slice(0, 400)}... Si vous voulez aller plus loin, demandez-moi la comparaison avec d'autres types de biens, le risque ou les meilleures zones.`;
  }
  return (
    "Je suis votre assistant investissement immobilier pour la Tunisie. Je peux vous aider sur :\n" +
    "• La rentabilité d'un bien (rendement, ROI)\n• Les meilleures zones et quartiers\n• Les prévisions à 1, 5 et 10 ans\n• Le risque et le financement\n• La comparaison entre types de biens (appartement, local, terrain...)\n\nPosez-moi votre question !"
  );
}

export const askInvestorAssistant = action({
  args: {
    message: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("Non connecté");
    if (args.message.trim().length < 2) throw new Error("Message trop court");

    const systemPrompt =
      "Tu es un assistant expert en investissement immobilier en Tunisie (conseiller financier et immobilier). " +
      "Réponds en français, de façon concise (4-8 lignes), structurée avec des puces si utile, avec des ordres de grandeur réalistes en TND. " +
      "Utilise le contexte d'analyse fourni quand il est présent pour personnaliser la réponse. " +
      "Tu peux répondre à : rentabilité, ROI, cash-flow, récupération du capital, prévisions à 1/3/5/10 ans, scénarios, zones d'investissement, risque, financement.";

    const userPrompt = args.context
      ? `Contexte d'analyse: ${args.context}\n\nQuestion de l'investisseur: ${args.message}`
      : `Question de l'investisseur: ${args.message}`;

    try {
      const result = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        maxTokens: 700,
      });
      if (result.success && result.data?.choices?.[0]?.message?.content) {
        return { answer: result.data.choices[0].message.content.trim(), usedFallback: false };
      }
    } catch {
      // fall through to deterministic fallback
    }
    return { answer: fallbackAssistant(args.message, args.context), usedFallback: true };
  },
});
