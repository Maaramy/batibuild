"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { requireClientProAccess } from "./access";
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

// ── Contexte marché fourni à l'action (offres fournisseurs observées) ──────
type MarketContext = {
  trendsByCategory?: Map<string, { netPct: number; changes: number }>;
  avgChange?: number;
};

// ── Cartographie mot-clé → tendance du marché tunisien 2026 ────────────────
// Chaque entrée associe les mots-clés des libellés du « Quantitatif détaillé »
// (catalogue officiel 2026) à une tendance par défaut et à la catégorie
// officielle 2026 correspondante, pour relier la prévision aux données marché
// des offres fournisseurs (materialOffers) lorsqu'elles sont observées.
const MATERIAL_TRENDS: {
  keys: string[];
  category: string;
  trend: "hausse" | "baisse" | "stable";
  pct: number;
  horizon: string;
  reasoning: string;
}[] = [
  { keys: ["ciment", "mortier", "liant", "adjuvant", "hydrofuge"], category: "liants_ciments_mortiers", trend: "hausse", pct: 4.5, horizon: "6 mois", reasoning: "Hausse saisonnière des coûts d'énergie et de transport en été." },
  { keys: ["acier", "fer", "treillis", "metal", "poutrelle", "caillebotis"], category: "acier_metaux_structure", trend: "hausse", pct: 6.0, horizon: "3 mois", reasoning: "Tension sur l'acier importé et fluctuation des devises." },
  { keys: ["beton", "bloc", "hourdis", "entrevous", "dalle", "plot"], category: "betons_prefabrication", trend: "stable", pct: 1.5, horizon: "6 mois", reasoning: "Prix du béton prêt à l'emploi relativement stable." },
  { keys: ["sable", "gravier", "granulat", "terre", "remblai", "toutvenant", "argile"], category: "terrassement_granulats", trend: "hausse", pct: 3.0, horizon: "6 mois", reasoning: "Coût de transport en hausse depuis les carrières." },
  { keys: ["brique", "parpaing", "plancher", "claustra"], category: "maconnerie_plancher", trend: "stable", pct: 1.8, horizon: "12 mois", reasoning: "Production locale stable et concurrence soutenue." },
  { keys: ["bois", "contreplaque", "panneau", "coffrage", "chevron", "parquet", "madrier"], category: "bois_panneaux_coffrage", trend: "hausse", pct: 5.0, horizon: "6 mois", reasoning: "Hausse des bois importés et du contreplaqué." },
  { keys: ["etanche", "membrane", "bitumineuse", "gouttiere"], category: "etancheite_protection", trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Produits d'étanchéité disponibles localement." },
  { keys: ["isolation", "laine", "polystyrene", "xps", "perlite"], category: "isolation_thermique", trend: "stable", pct: 1.2, horizon: "12 mois", reasoning: "Offre locale en isolation stable." },
  { keys: ["placo", "platre", "cloison", "plafond", "corniche"], category: "cloisons_platre_plafonds", trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Plaques et ossatures stables sur le marché local." },
  { keys: ["tuile", "bac acier", "bardage", "toiture"], category: "toitures_bardages_facades", trend: "stable", pct: 1.5, horizon: "12 mois", reasoning: "Production locale de tuiles stable." },
  { keys: ["carrelage", "faience", "marbre", "granit", "pierre", "pave", "mosaique", "travertin"], category: "revetements_sols_murs", trend: "baisse", pct: -3.0, horizon: "3 mois", reasoning: "Période de promotions chez les importateurs (soldes)." },
  { keys: ["peinture", "enduit", "crepis", "vernis", "laque"], category: "peintures_enduits_finitions", trend: "stable", pct: 1.2, horizon: "6 mois", reasoning: "Stabilité des prix des peintures locales." },
  { keys: ["porte", "fenetre", "aluminium", "menuiserie", "volet"], category: "menuiseries", trend: "stable", pct: 1.5, horizon: "6 mois", reasoning: "Menuiseries stables, léger effet saisonnier." },
  { keys: ["verre", "vitrage"], category: "vitrage_verriers", trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Vitrage importé stable." },
  { keys: ["cable", "disjoncteur", "luminaire", "led", "spot", "eclairage"], category: "equipements", trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Marché du matériel électrique stable." },
  { keys: ["cuivre", "robinet", "wc", "lavabo", "geyser", "plomberie", "sanitaire"], category: "equipements", trend: "hausse", pct: 3.5, horizon: "6 mois", reasoning: "Hausse du cuivre et des raccords importés." },
  { keys: ["climatiseur", "split", "cvc", "chauffage", "ventilation"], category: "cvc_chauffage_ventilation", trend: "stable", pct: 1.5, horizon: "12 mois", reasoning: "Équipements CVC stables hors saison de pointe." },
  { keys: ["photovoltaique", "solaire", "onduleur", "batterie"], category: "energies_renouvelables", trend: "baisse", pct: -2.0, horizon: "6 mois", reasoning: "Baisse des coûts du solaire et concurrence des importateurs." },
  { keys: ["extincteur", "securite"], category: "securite_incendie_surete", trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Sécurité incendie stable." },
  { keys: ["enrobe", "voirie", "drainage", "caniveau", "bordure"], category: "voirie_reseaux_drainage", trend: "stable", pct: 1.5, horizon: "12 mois", reasoning: "Voirie et drainage stables." },
  { keys: ["cloture", "grillage", "gazon", "piscine", "jardin", "pavois"], category: "amenagements_exterieurs", trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Aménagements extérieurs stables." },
];

/** Libellé normalisé d'un poste (minuscules, sans accents, sans ponctuation). */
const normName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// ── Deterministic fallback (rule-based, Tunisian market 2026) ──────────────
// Les prévisions sont calculées sur les POSTES RÉELS du « Quantitatif détaillé »
// (catalogue officiel 2026 + prix en direct de la base) et non sur des
// catégories génériques : chaque matériau important du projet reçoit sa propre
// prévision, avec son prix unitaire actuel en référence et la tendance marché
// observée sur les offres fournisseurs lorsqu'elle est disponible.
function fallbackInsights(_project: any, ce: any, market?: MarketContext): PredictiveInsights {
  const breakdown: any[] = ce?.breakdown || [];

  // Postes matériaux réels (hors main-d'œuvre, transport, études/imprévus)
  const items: { name: string; category: string; unit: string; unitPrice: number; totalPrice: number }[] = [];
  for (const b of breakdown) {
    if (["main_oeuvre", "transport", "etudes_imprevus"].includes(b.category)) continue;
    for (const it of b.items || []) {
      if (!it.name || !it.unitPrice) continue;
      items.push({
        name: it.name,
        category: b.category,
        unit: it.unit || "",
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice || 0,
      });
    }
  }
  const topItems = [...items].sort((a, b) => b.totalPrice - a.totalPrice).slice(0, 5);

  // Tendance d'un poste : mot-clé par défaut, ajustée par la tendance marché
  // observée (offres fournisseurs) pour la catégorie officielle 2026.
  const trendFor = (name: string): { trend: "hausse" | "baisse" | "stable"; pct: number; horizon: string; reasoning: string } => {
    const norm = normName(name);
    const entry =
      MATERIAL_TRENDS.find((t) => t.keys.some((k) => norm.includes(k))) ||
      { keys: [], category: "divers", trend: "stable" as const, pct: 1.0, horizon: "12 mois", reasoning: "Fournitures diverses et accessoires stables." };
    const observed = market?.trendsByCategory?.get(entry.category);
    if (observed && observed.changes >= 2) {
      const pct = Math.round(clamp(observed.netPct, -15, 20) * 10) / 10;
      return {
        trend: pct > 0.5 ? "hausse" : pct < -0.5 ? "baisse" : "stable",
        pct: Math.abs(pct) < 0.5 ? 0 : pct,
        horizon: entry.horizon,
        reasoning: `${entry.reasoning} Tendance observée sur les offres fournisseurs (${observed.changes} relevés).`,
      };
    }
    return { trend: entry.trend, pct: entry.pct, horizon: entry.horizon, reasoning: entry.reasoning };
  };

  // Prévisions par matériau réellement présent dans le projet
  const pricePredictions = topItems.map((it) => {
    const t = trendFor(it.name);
    const priceRef = it.unitPrice.toLocaleString("fr-TN", { maximumFractionDigits: 2 });
    return {
      material: it.name,
      category: it.category,
      predictedChangePct: t.pct,
      trend: t.trend,
      horizon: t.horizon,
      reasoning: `${t.reasoning} Prix actuel : ${priceRef} TND${it.unit ? "/" + it.unit : ""}.`,
    };
  });

  // Repli : aucun poste matériau détaillé → prévisions sur les catégories du budget
  const macroCategories: { key: string; label: string; cost: number }[] =
    [...breakdown]
      .sort((a, b) => b.estimatedCost - a.estimatedCost)
      .map((b) => ({ key: b.category, label: b.label, cost: b.estimatedCost || 0 }));
  if (pricePredictions.length === 0) {
    const macroTrends: Record<string, { trend: "hausse" | "baisse" | "stable"; pct: number; horizon: string; reasoning: string }> = {
      gros_oeuvre: { trend: "hausse", pct: 4.0, horizon: "6 mois", reasoning: "Hausse combinée ciment + acier + main-d'œuvre." },
      second_oeuvre: { trend: "stable", pct: 1.5, horizon: "6 mois", reasoning: "Moyenne des finitions stable." },
      equipements: { trend: "stable", pct: 2.0, horizon: "6 mois", reasoning: "Équipements électroménagers et sanitaires stables." },
      main_oeuvre: { trend: "hausse", pct: 5.0, horizon: "6 mois", reasoning: "Pénurie de main-d'œuvre qualifiée, coûts en hausse." },
      transport: { trend: "hausse", pct: 3.5, horizon: "6 mois", reasoning: "Hausse du carburant et des frais de livraison." },
      etudes_imprevus: { trend: "stable", pct: 0.5, horizon: "12 mois", reasoning: "Frais d'études et permis stables." },
      divers: { trend: "stable", pct: 1.0, horizon: "12 mois", reasoning: "Fournitures diverses et accessoires stables." },
    };
    pricePredictions.push(
      ...macroCategories.slice(0, 4).map((c) => {
        const t = macroTrends[c.key] || macroTrends.divers;
        return { material: c.label, category: c.key, predictedChangePct: t.pct, trend: t.trend, horizon: t.horizon, reasoning: t.reasoning };
      }),
    );
  }

  // Best buying periods
  const bestBuyingPeriods = [
    { material: "Ciment & béton", period: "Octobre – Février", reason: "Demande plus faible en hiver, prix au plus bas.", savingPct: 4 },
    { material: "Acier", period: "Avril – Mai", reason: "Fin de la haute saison de construction, stocks importateurs élevés.", savingPct: 5 },
    { material: "Carrelage & marbre", period: "Janvier – Mars", reason: "Soldes et promotions des importateurs.", savingPct: 6 },
    { material: "Bois", period: "Été (juin – août)", reason: "Baisse des importations pendant la basse saison.", savingPct: 4 },
    { material: "Peinture", period: "Septembre – Novembre", reason: "Fin des promotions de rentrée, stocks frais.", savingPct: 3 },
  ];

  const totalCost = ce?.totalCost || 0;
  // Matériaux dominants du projet (pour des conseils d'achat ciblés)
  const topMaterialNames = topItems.slice(0, 2).map((i) => i.name);
  const groupedTip = topMaterialNames.length >= 2
    ? `Regroupez ${topMaterialNames[0]} et ${topMaterialNames[1]} en une seule commande pour négocier 5 à 8% de remise.`
    : "Regroupez vos commandes de matériaux (ciment, sable, gravier…) pour négocier 5 à 8% de remise.";

  const budgetOptimizations = [
    {
      title: "Achats groupés",
      description: groupedTip,
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

  const topLabel = pricePredictions[0]?.material || macroCategories[0]?.label || "construction";
  return {
    summary:
      `Analyse prédictive basée sur le catalogue 2026 et les prix en direct de la base : ` +
      `le poste le plus important de votre projet (${topLabel}) ` +
      `présente ${pricePredictions[0]?.trend === "hausse" ? "un risque de hausse" : pricePredictions[0]?.trend === "baisse" ? "une opportunité de baisse" : "une tendance stable"} ` +
      `des prix, mais un phasage d'achat intelligent peut réduire le coût global de votre budget.`,
    pricePredictions,
    bestBuyingPeriods,
    budgetOptimizations,
    lossReductions,
    overallSavingsPct: 7,
    generatedAt: Date.now(),
  };
}

// ── Normalize AI output into the strict PredictiveInsights shape ────────────
function normalize(raw: any, project: any, ce: any, market?: MarketContext): PredictiveInsights {
  const fallback = fallbackInsights(project, ce, market);
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

    // Services Client Pro : abonnement payant actif requis (admin bypass)
    await requireClientProAccess(ctx, user, "Intelligence prédictive");

    const project = await ctx.runQuery(api.projects.getProject, {
      projectId: args.projectId,
    });
    if (!project) throw new Error("Projet introuvable");
    if (project.userId !== user._id && user.role !== "admin") {
      throw new Error("Accès refusé à ce projet");
    }

    const ce = project.costEstimate;

    // ── Données marché observées (offres fournisseurs) + prix en direct ──
    // L'intelligence prédictive s'appuie sur le catalogue 2026 et les prix en
    // direct de la base : les prévisions sont calculées sur les postes réels
    // du « Quantitatif détaillé » (nom, prix unitaire actuel) et ajustées par
    // la tendance observée des offres fournisseurs quand elle est disponible.
    const [marketTrends, marketOverview] = await Promise.all([
      ctx.runQuery(api.marketData.getPriceTrends, {}).catch(() => [] as any[]),
      ctx.runQuery(api.marketData.getMarketOverview, {}).catch(() => null as any),
    ]);
    const trendsByCategory = new Map<string, { netPct: number; changes: number }>();
    for (const t of marketTrends || []) {
      trendsByCategory.set(t.category, { netPct: t.netPct, changes: t.changes });
    }
    const market: MarketContext = {
      trendsByCategory,
      avgChange: marketOverview?.avgChange ?? 0,
    };

    // Build a compact summary of the cost breakdown for the AI
    const breakdownText = (ce?.breakdown || [])
      .map((b: any) => `${b.label}: ${b.estimatedCost} TND (${b.percentage}%)`)
      .join(" | ");

    // Postes matériaux réels du quantitatif (nom, prix unitaire, quantité, total)
    const itemLines = (ce?.breakdown || [])
      .flatMap((b: any) =>
        (b.items || [])
          .filter((i: any) => i.name && i.unitPrice)
          .map((i: any) => ({ ...i, macro: b.category })),
      )
      .filter((i: any) => !["main_oeuvre", "transport", "etudes_imprevus"].includes(i.macro))
      .sort((a: any, b: any) => (b.totalPrice || 0) - (a.totalPrice || 0))
      .slice(0, 12)
      .map((i: any) => `- ${i.name} : ${i.unitPrice} TND/${i.unit || "u"} (quantité ${i.quantity}, total ${i.totalPrice || 0} TND)`)
      .join("\n");

    const marketText = marketTrends?.length
      ? "Évolutions observées des offres fournisseurs : " +
        marketTrends
          .map((t: any) => `${t.category} ${t.netPct > 0 ? "+" : ""}${t.netPct}% (${t.changes} relevés)`)
          .join(", ")
      : "Aucune évolution marché observée pour l'instant.";

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
      `Prix en vigueur (catalogue 2026, base de données des matériaux) — principaux postes du quantitatif :\n` +
      `${itemLines || "aucun poste matériau détaillé"}\n\n` +
      `Données marché : ${marketText}\n\n` +
      `Génère une analyse d'intelligence prédictive : prévision d'évolution des prix des principaux matériaux ` +
      `(base-toi sur les prix actuels indiqués et les tendances marché observées), ` +
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
        const insights = normalize(parsed, project, ce, market);

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
    const insights = fallbackInsights(project, ce, market);
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

