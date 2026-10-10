// ============================================================================
// PARCOURS « DE L'IDÉE À L'INVESTISSEMENT » — résultats RÉELS par étape
//
// Query publique qui exécute les VRAIS moteurs de la plateforme et renvoie les
// chiffres affichés sous chaque étape terminée du parcours (page d'accueil) :
//
//   - runBIMEstimation  → coût estimatif, quantitatif, coût au m², matériaux
//   - generateRoadmap   → exécution & suivi (progression, phases, budget)
//   - runEngine         → investissement (montant, rendement, ROI)
//   - annuaires réels   → experts & fournisseurs actifs (cartes)
//
// Aucune valeur aléatoire ni fictive : tout provient des moteurs de calcul ou
// des profils réellement enregistrés. Les étapes non calculables localement
// (vue 3D…) sont dérivées des mêmes données réelles (surface, niveaux, pièces).
//
// Le projet de référence est un exemple déterministe (comme DemoProject) : les
// mêmes entrées produisent toujours les mêmes résultats.
// ============================================================================

import { query } from "./_generated/server";
import { api } from "./_generated/api";
import { runBIMEstimation } from "./bimEngine";
import { generateRoadmap } from "./roadmapEngine";
import { runEngine } from "./investments";
import {
  EXPERT_CATEGORIES,
  EXPERT_OTHER_CATEGORY,
  EXPERT_PROFESSION_LABELS,
  expertCategoryOf,
} from "./expertCategories";

/** Projet de référence des résultats — exemple déterministe (moteurs réels). */
const DEMO = {
  name: "Maison R+0 — 150 m² · Tunis",
  category: "maison",
  surface: 150,
  floors: 1,
  region: "tunis",
  city: "Tunis",
  finishLevel: "standard",
  rooms: {
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    livingRooms: 1,
    wcs: 1,
    garages: 1,
    pools: 0,
  },
} as const;

const REGION_LABELS: Record<string, string> = {
  tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
  nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
  jendouba: "Jendouba", le_kef: "Le Kef", siliana: "Siliana", kairouan: "Kairouan",
  kasserine: "Kasserine", sidi_bouzid: "Sidi Bouzid", sousse: "Sousse",
  monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès",
  medenine: "Médenine", tataouine: "Tataouine", gafsa: "Gafsa", tozeur: "Tozeur",
  kebili: "Kébili",
};

export interface ShowcaseBudgetLine {
  label: string;
  percentage: number;
  cost: number;
}

export interface ShowcaseMaterialPrice {
  name: string;
  unit: string;
  unitPrice: number;
}

export interface ShowcaseExpertCard {
  name: string;
  professionLabel: string;
  regionLabel: string;
  specialties: string[];
}

export interface ShowcaseSupplierCard {
  name: string;
  regionLabel: string;
  specialties: string[];
}

export interface LifecycleShowcase {
  /** Contexte du projet de référence (données réelles utilisées). */
  project: {
    name: string;
    category: string;
    categoryLabel: string;
    regionLabel: string;
    surface: number;
    floors: number;
  };
  /** 1. Coût estimatif. */
  cost: {
    total: number;
    costPerM2: number;
    surface: number;
    confidence: number;
    breakdown: ShowcaseBudgetLine[];
    itemsCount: number;
    quantitatifLots: number;
  };
  /** 2. Plan IA. */
  plan: {
    surface: number;
    floors: number;
    roomsTotal: number;
    /** Répartition réelle des pièces — alimente le moteur de plans 2D. */
    bedrooms: number;
    bathrooms: number;
    kitchens: number;
    livingRooms: number;
    wcs: number;
    variants: number;
    methods: string[];
    durationLabel: string;
  };
  /** 3. Choix des matériaux. */
  materials: {
    analyzed: number;
    selected: number;
    unitPrices: ShowcaseMaterialPrice[];
    /** Économie réelle possible entre le scénario standard et l'économique. */
    potentialSaving: number;
    supplier: ShowcaseSupplierCard | null;
  };
  /** 4. Consultations / experts. */
  consultations: {
    expertsCount: number;
    categories: { key: string; icon: string; label: string; count: number }[];
    regionsCount: number;
    topRegion: string | null;
    engineer: ShowcaseExpertCard | null;
  };
  /** 5. Exécution & suivi. */
  execution: {
    progress: number;
    tasksDone: number;
    tasksTotal: number;
    phases: number;
    plannedBudget: number;
    plannedDurationDays: number;
  };
  /** 6. Investissement. */
  investment: {
    amount: number;
    grossYieldPct: number;
    netYieldPct: number;
    annualNetIncome: number;
    monthlyCashflow: number;
    roi10yPct: number;
  };
}

export const getShowcase = query({
  args: {},
  handler: async (ctx): Promise<LifecycleShowcase> => {
    // ── Moteur BIM (coût, quantitatif, plan, matériaux) ──────────────────────
    const bim = runBIMEstimation(
      DEMO.category,
      DEMO.surface,
      DEMO.floors,
      DEMO.region,
      DEMO.finishLevel,
      DEMO.rooms,
    );
    const ce = bim.costEstimate;

    // Quantitatif réel : nombre de postes et de matériaux distincts.
    const items = ce.breakdown.flatMap((b: any) => b.items ?? []);
    const unitPrices: ShowcaseMaterialPrice[] = [];
    const seenNames = new Set<string>();
    for (const it of items) {
      const name = String(it?.name ?? "").trim();
      if (!name || seenNames.has(name)) continue;
      if (typeof it?.unitPrice !== "number" || it.unitPrice <= 0) continue;
      seenNames.add(name);
      unitPrices.push({ name, unit: it.unit ?? "", unitPrice: Math.round(it.unitPrice) });
      if (unitPrices.length >= 4) break;
    }

    const standardTotal = ce.budgetScenarios?.standard?.totalCost ?? ce.totalCost;
    const ecoTotal = ce.budgetScenarios?.economique?.totalCost ?? ce.totalCost;
    const potentialSaving = Math.max(0, Math.round(standardTotal - ecoTotal));

    const roomsTotal =
      DEMO.rooms.bedrooms +
      DEMO.rooms.bathrooms +
      DEMO.rooms.kitchens +
      DEMO.rooms.livingRooms +
      DEMO.rooms.wcs;

    // ── Feuille de route (exécution & suivi) ─────────────────────────────────
    const roadmap = generateRoadmap({
      _id: "showcase",
      name: DEMO.name,
      category: DEMO.category,
      region: DEMO.region,
      surface: DEMO.surface,
      floors: DEMO.floors,
      bedrooms: DEMO.rooms.bedrooms,
      aiAnalysis: {
        confidence: bim.aiAnalysis.confidence,
        estimatedDuration: bim.aiAnalysis.estimatedDuration,
      },
      costEstimate: ce as any,
    });

    // ── Moteur d'investissement (rendement, ROI) ─────────────────────────────
    const investment = runEngine({
      name: DEMO.name,
      investmentType: "maison",
      purchasePrice: Math.round(standardTotal),
      area: DEMO.surface,
      region: DEMO.region,
      city: DEMO.city,
      rentMode: "mensuel",
      rentAmount: 1500,
      monthlyRent: 1500,
      occupancyRate: 95,
      annualCharges: 1200,
      insurance: 300,
      managementFees: 0,
      taxationPct: 10,
      renovationCost: 0,
      financingFees: 0,
      agencyFees: 0,
      furnishingCost: 0,
      acquisitionFeesPct: 6,
      annualAppreciationPct: 5,
      rentGrowthPct: 5,
      inflationPct: 6,
      horizonYears: 10,
    });
    const ind = investment.indicators;

    // ── Experts & fournisseurs réellement inscrits (annuaires actifs) ────────
    const [experts, suppliers] = await Promise.all([
      ctx.runQuery(api.expertProfiles.getActiveExperts, {}).catch(() => [] as any[]),
      ctx.runQuery(api.supplierProfiles.getActiveSuppliers, {}).catch(() => [] as any[]),
    ]);

    // Répartition réelle des experts par catégorie (catégories normalisées
    // partagées, `src/convex/expertCategories.ts`).
    const counts = new Map<string, number>();
    const regionSet = new Set<string>();
    const regionCounts = new Map<string, number>();
    for (const e of experts as any[]) {
      const cat = expertCategoryOf(e.profession);
      counts.set(cat.key, (counts.get(cat.key) ?? 0) + 1);
      for (const r of e.regions ?? []) {
        regionSet.add(r);
        regionCounts.set(r, (regionCounts.get(r) ?? 0) + 1);
      }
    }
    const categories = [...EXPERT_CATEGORIES, EXPERT_OTHER_CATEGORY]
      .map((c) => ({ key: c.key, icon: c.icon, label: c.label, count: counts.get(c.key) ?? 0 }))
      .filter((c) => c.count > 0);
    const topRegion =
      [...regionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Carte ingénieur : premier ingénieur réel, sinon premier expert disponible.
    const engineerProfile =
      (experts as any[]).find((e) => e.profession === "ingenieur") ??
      (experts as any[])[0] ??
      null;
    const engineer: ShowcaseExpertCard | null = engineerProfile
      ? {
          name: engineerProfile.displayName,
          professionLabel:
            EXPERT_PROFESSION_LABELS[engineerProfile.profession] ?? engineerProfile.profession,
          regionLabel: (engineerProfile.regions ?? [])
            .map((r: string) => REGION_LABELS[r] ?? r)
            .slice(0, 2)
            .join(", ") || "Tunisie",
          // Clés de spécialités brutes — libellés résolus côté interface.
          specialties: (engineerProfile.specialties ?? []).slice(0, 3),
        }
      : null;

    // Carte fournisseur : premier fournisseur réel.
    const supplierProfile = (suppliers as any[])[0] ?? null;
    const supplier: ShowcaseSupplierCard | null = supplierProfile
      ? {
          name: supplierProfile.companyName,
          regionLabel: (supplierProfile.regions ?? [])
            .map((r: string) => REGION_LABELS[r] ?? r)
            .slice(0, 2)
            .join(", ") || "Tunisie",
          specialties: (supplierProfile.specialties ?? []).slice(0, 3),
        }
      : null;

    return {
      project: {
        name: DEMO.name,
        category: DEMO.category,
        categoryLabel: bim.aiAnalysis.category,
        regionLabel: REGION_LABELS[DEMO.region] ?? DEMO.region,
        surface: DEMO.surface,
        floors: DEMO.floors,
      },
      cost: {
        total: ce.totalCost,
        costPerM2: ce.costPerSquareMeter ?? 0,
        surface: DEMO.surface,
        confidence: Math.round((bim.aiAnalysis.confidence ?? 0) * 100),
        breakdown: ce.breakdown.slice(0, 5).map((b: any) => ({
          label: b.label,
          percentage: b.percentage,
          cost: b.estimatedCost,
        })),
        itemsCount: items.length,
        quantitatifLots: ce.breakdown.length,
      },
      plan: {
        surface: DEMO.surface,
        floors: DEMO.floors,
        roomsTotal,
        bedrooms: DEMO.rooms.bedrooms,
        bathrooms: DEMO.rooms.bathrooms,
        kitchens: DEMO.rooms.kitchens,
        livingRooms: DEMO.rooms.livingRooms,
        wcs: DEMO.rooms.wcs,
        variants: Object.keys(ce.budgetScenarios ?? {}).length,
        methods: bim.aiAnalysis.constructionMethods ?? [],
        durationLabel: bim.aiAnalysis.estimatedDuration ?? "",
      },
      materials: {
        analyzed: items.length,
        selected: seenNames.size,
        unitPrices,
        potentialSaving,
        supplier,
      },
      consultations: {
        expertsCount: (experts as any[]).length,
        categories,
        regionsCount: regionSet.size,
        topRegion: topRegion ? REGION_LABELS[topRegion] ?? topRegion : null,
        engineer,
      },
      execution: {
        progress: roadmap.progress,
        tasksDone: roadmap.summary.tasksDone,
        tasksTotal: roadmap.summary.tasksTotal,
        phases: roadmap.phases.length,
        plannedBudget: roadmap.summary.plannedBudget,
        plannedDurationDays: roadmap.summary.plannedDurationDays,
      },
      investment: {
        amount: ind.purchasePrice,
        grossYieldPct: ind.grossYieldPct,
        netYieldPct: ind.netYieldPct,
        annualNetIncome: ind.netAnnualIncome,
        monthlyCashflow: ind.monthlyCashflow,
        roi10yPct: ind.roi10yPct,
      },
    };
  },
});
