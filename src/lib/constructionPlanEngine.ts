// ============================================================================
// PLAN DE CONSTRUCTION SELON VOTRE BUDGET — moteur d'aide à la décision.
// ----------------------------------------------------------------------------
// Réponse à la question : « Avec mon budget actuel, qu'est-ce que je peux
// réellement construire, jusqu'où puis-je aller et quels travaux dois-je
// prioriser ? »
//
// Principes (identiques au `budgetEngine`) :
//   • AUCUN montant inventé : tout dérive du Quantitatif du projet
//     (`BudgetAnalysis.breakdown`, produit par `buildBudgetAnalysis`) ;
//   • allocation SÉQUENTIELLE dans l'ordre de construction des travaux
//     (dépendances techniques) — déterministe, aucun tirage aléatoire ;
//   • la sélection de travaux filtrés libère le budget pour les autres ;
//   • les pourcentages sont bornés [0, 100] et arrondis au dixième.
//
// Ce module ne modifie NI le coût estimatif NI `budgetEngine` : il consomme
// son résultat (`BudgetAnalysis`) pour en dériver un PLAN de construction.
// ============================================================================

import {
  categoryPriority,
  formatPercent,
  formatTndAmount,
  type BudgetAnalysis,
  type BudgetStatus,
  type QuantitatifLot,
} from "@/lib/budgetEngine";

// ── Types ──────────────────────────────────────────────────────────────────

/** Total d'un scénario du module d'estimation (Économique / Standard / Premium / Personnalisé). */
export interface ScenarioTotal {
  key: string;
  label: string;
  totalCost: number;
  /** Scénario retenu par le projet (mis en avant dans la comparaison). */
  selected?: boolean;
}

/** Article du Quantitatif intégré à une sous-catégorie. */
export interface WorkPartArticleSource {
  id: string;
  label: string;
  cost: number;
  quantity?: number;
  unit?: string;
}

/** Article du plan après allocation (affiché sous la sous-catégorie). */
export interface WorkPartArticle extends WorkPartArticleSource {
  funded: number;
  /** % de réalisation de l'article (0 → 100). */
  pct: number;
  status: BudgetStatus;
}

/** Sous-lot du Quantitatif regroupé dans un poste. */
export interface WorkPartSource {
  id: string;
  label: string;
  cost: number;
  /** Articles du Quantitatif de cette sous-catégorie (si détaillables). */
  articles?: WorkPartArticleSource[];
}

/** Sous-catégorie du plan après allocation (affichée sous le poste). */
export interface WorkPart extends WorkPartSource {
  funded: number;
  /** % de réalisation de la sous-catégorie (0 → 100). */
  pct: number;
  status: BudgetStatus;
  /** Articles financés. */
  articles?: WorkPartArticle[];
}

/** Travaux dérivé du Quantitatif (regroupé en postes de chantier). */
export interface WorkItem {
  /** Identifiant stable (« w:fondations », poste personnalisé…). */
  id: string;
  label: string;
  /** Coût estimé du poste (TND). */
  cost: number;
  /** Rang dans l'ordre de construction (plus petit = plus prioritaire). */
  rank: number;
  /** Catégorie d'origine du coût (« gros_oeuvre », « equipements »…). */
  categoryId: string;
  /** Travail ajouté manuellement par l'utilisateur. */
  custom?: boolean;
  /** Sous-lots du Quantitatif regroupés dans ce poste (si détaillables). */
  parts?: WorkPartSource[];
}

/** Travail du plan après allocation du budget. */
export interface PlannedWork extends WorkItem {
  funded: number;
  /** % de réalisation du poste (0 → 100). */
  pct: number;
  status: BudgetStatus;
  /** Sous-catégories financées. */
  parts?: WorkPart[];
}

/** Ligne de priorisation IA. */
export interface AiPriority {
  order: number;
  id: string;
  label: string;
  pct: number;
  status: BudgetStatus;
  /** Part du poste dans le programme sélectionné (%). */
  sharePct: number;
  /** Règle appliquée : nécessité technique, dépendance, risque de reprise… */
  reason: string;
}

export interface ConstructionPlan {
  /** Budget disponible simulé (TND). */
  budget: number;
  /** Postes sélectionnés, triés par ordre de construction. */
  works: PlannedWork[];
  /** Postes exclus par la sélection de l'utilisateur. */
  excludedWorks: WorkItem[];
  /** Coût total du programme sélectionné. */
  selectedCost: number;
  /** Montant du programme réellement financé. */
  funded: number;
  /** Budget encore libre après allocation. */
  remainingBudget: number;
  /** % global de construction du programme sélectionné. */
  globalPct: number;
  /** Postes réalisables à 100 %. */
  fullLabels: string[];
  /** Postes partiellement réalisables. */
  partialWorks: Array<{ id: string; label: string; pct: number; missing: number }>;
  /** Postes non réalisables avec le budget actuel. */
  deferredLabels: string[];
  /** Reste à financer pour terminer tout le programme sélectionné. */
  remainingToComplete: number;
  /** Budget supplémentaire recommandé (terminer le programme). */
  extraBudgetRecommended: number;
  /** Réponse simple à « Que puis-je construire avec ce budget ? ». */
  answerSentence: string;
  /** Prochaine étape recommandée par l'IA. */
  nextStep: string;
  /** Priorisation intelligente, dans l'ordre conseillé. */
  aiPriorities: AiPriority[];
}

// ── Postes de chantier canoniques ──────────────────────────────────────────

interface CanonicalWorkDef {
  id: string;
  label: string;
  match: RegExp;
  rank: number;
}

/**
 * Les 11 postes demandés + les études préliminaires, dans l'ordre de
 * construction (nécessité technique et dépendances). Les libellés du
 * Quantitatif sont rattachés à un poste par mots-clés (accents ignorés) ;
 * un poste non reconnu conserve son libellé d'origine — rien n'est perdu.
 */
export const CANONICAL_WORKS: CanonicalWorkDef[] = [
  { id: "etudes", label: "Études & frais préliminaires", match: /etude|frais|prelim/, rank: 12 },
  {
    id: "fondations",
    label: "Fondations",
    match: /fondation|semelle|longrine|socle|radier|terrassement|deblai|remblai|epuisement|piece soute/,
    rank: 20,
  },
  {
    id: "dalle_planchers",
    label: "Dalle / planchers",
    match: /dalle|plancher|hourdis|poutrelle|coupe feu/,
    rank: 35,
  },
  {
    id: "gros_oeuvre",
    label: "Gros œuvre (structure)",
    match: /gros oeuvre|structure|poteau|poutre|fermage|ossature|coque|montage|gaine/,
    rank: 30,
  },
  {
    id: "murs",
    label: "Murs",
    match: /mur|cloison|brique|refend|cellulaire|entourage|maconnerie/,
    rank: 40,
  },
  {
    id: "toiture",
    label: "Toiture",
    match: /toiture|charpente|couverture|zinc|tuile|gouttiere|etancheite|faitage|bac acier/,
    rank: 45,
  },
  {
    id: "electricite",
    label: "Électricité",
    match: /electri|cablage|eclairage|appareillage|tableau|interrupteur|prise/,
    rank: 55,
  },
  {
    id: "plomberie",
    label: "Plomberie",
    match: /plomber|evacuation|robinetterie|sanitair|chauffe|vidange|eau chaude|eau froide|collecteur|vrd sanit/,
    rank: 60,
  },
  {
    id: "menuiserie",
    label: "Menuiserie",
    match: /menuiser|porte|fenetre|volet|chassis|garage|rideau|banne/,
    rank: 70,
  },
  {
    id: "revetements",
    label: "Revêtements",
    match: /revetement|carrelage|faience|gres|parquet|linoleum|collage sol/,
    rank: 80,
  },
  { id: "peinture", label: "Peinture", match: /peinture|enduit|tapisser|laque|scellant/, rank: 90 },
  {
    id: "second_oeuvre",
    label: "Second œuvre et finitions",
    match: /second oeuvre|finition|nettoyage/,
    rank: 75,
  },
  { id: "transport", label: "Transports & autres", match: /transport|divers/, rank: 95 },
  {
    id: "amenagement_exterieur",
    label: "Aménagements extérieurs",
    match: /amenagement|exterieur|vrd|jardin|piscine|cloture|grillage|enseigne|parking/,
    rank: 100,
  },
];

/**
 * Postes dont les données doivent venir DU QUANTITATIF DÉTAILLÉ du résultat
 * « Coût estimation de construction » quand la décomposition du coût n'en
 * porte pas le montant (aucun montant inventé).
 */
const LOT_SOURCE_TARGETS: Array<{ id: string; match: RegExp }> = [
  { id: "etudes", match: /(frais prelim|etude)/ },
  { id: "second_oeuvre", match: /(second oeuvre|finition|nettoyage)/ },
  { id: "transport", match: /(transport|divers)/ },
  { id: "amenagement_exterieur", match: /(amenagement)/ },
];

/**
 * Poste « Équipements » : EXCLU du plan à la demande de l'utilisateur — ses
 * coûts ne sont plus simulés dans la sélection ni dans le plan (ils restent
 * visibles dans le Quantitatif détaillé, qui n'est pas modifié).
 */
function isExcludedWorkLabel(label: string): boolean {
  return normalizeWorkLabel(label).includes("equipement");
}

/**
 * Construit un poste à partir DU QUANTITATIF DÉTAILLÉ (lots + sous-lots +
 * articles) : sous-catégories = sous-lots, articles = lignes. Seuls les
 * montants réels du Quantitatif sont lus ; les lignes « Équipements » restent
 * exclues.
 */
function workFromLots(lots: QuantitatifLot[], def: { id: string; label: string; rank: number }, match: RegExp): WorkItem | null {

  const groups = new Map<
    string,
    {
      label: string;
      total: number;
      lines: Array<{ designation: string; cost: number; quantity?: number; unit?: string }>;
    }
  >();
  let total = 0;

  for (const lot of lots) {
    const lotName = normalizeWorkLabel(lot.name);
    const lotId = normalizeWorkLabel(String(lot.id ?? "").replace(/_/g, " "));
    if (!match.test(lotName) && !match.test(lotId)) continue;

    for (const line of lot.lines ?? []) {
      const cost =
        Number.isFinite(Number(line.total)) && Number(line.total) > 0
          ? Number(line.total)
          : (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
      if (cost <= 0) continue;
      const groupLabel = String(line.subcategory ?? "").trim() || lot.name;
      if (isExcludedWorkLabel(groupLabel)) continue;
      const group = groups.get(groupLabel) ?? { label: groupLabel, total: 0, lines: [] };
      group.lines.push({
        designation: String(line.designation ?? "").trim() || "Article",
        cost: round2(cost),
        quantity: line.quantity,
        unit: line.unit,
      });
      group.total = round2(group.total + cost);
      groups.set(groupLabel, group);
      total = round2(total + cost);
    }
  }

  if (total <= 0) return null;

  const parts: WorkPartSource[] = [...groups.values()].map((group, idx) => ({
    id: `part:lot:${def.id}:${idx}`,
    label: group.label,
    cost: group.total,
    articles: group.lines.map((line, i) => ({
      id: `art:lot:${def.id}:${idx}:${i}`,
      label: line.designation,
      cost: line.cost,
      quantity: line.quantity,
      unit: line.unit,
    })),
  }));

  return {
    id: `w:${def.id}`,
    label: def.label,
    cost: total,
    rank: def.rank,
    categoryId: "amenagements_exterieurs",
    parts,
  };
}

/** Poste personnalisé : l'utilisateur le déclare prioritaire, on le finance tôt. */
export const CUSTOM_WORK_RANK = 10;

/** Normalise un libellé : sans accents, minuscules, sans parenthèses. */
export function normalizeWorkLabel(label: string): string {
  return label
    .replace(/\s*\([^)]*\)/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/\s+/g, " ")
    .trim();
}

function matchCanonical(label: string): CanonicalWorkDef | null {
  const normalized = normalizeWorkLabel(label);
  if (!normalized) return null;
  return CANONICAL_WORKS.find((w) => w.match.test(normalized)) ?? null;
}

function mergeWork(
  map: Map<string, WorkItem>,
  item: { id: string; label: string; cost: number; rank: number; categoryId: string },
  part?: WorkPartSource,
): void {
  const existing = map.get(item.id);
  if (!existing) {
    map.set(item.id, { ...item, parts: part ? [part] : undefined });
    return;
  }
  existing.cost = Math.round((existing.cost + item.cost) * 100) / 100;
  // Invariant : si des sous-lots sont détenus, ils couvrent TOUT le coût du
  // poste — sinon le poste reste sans détail (pas de sous-catégorie affichée).
  if (part && existing.parts) existing.parts.push(part);
}

/**
 * Dérive la liste des travaux sélectionnables à partir du Quantitatif :
 * les sous-lots sont regroupés sur les postes canoniques ; les postes non
 * reconnus sont conservés tels quels, rangés par priorité de catégorie.
 */
export function deriveWorks(analysis: BudgetAnalysis, lots?: QuantitatifLot[]): WorkItem[] {
  const canonical = new Map<string, WorkItem>();
  const others: WorkItem[] = [];

  for (const cat of analysis.breakdown) {
    const rank = categoryPriority(cat.categoryId) * 10;
    if (cat.subcategories.length > 0) {
      cat.subcategories.forEach((sub, idx) => {
        const rawLabel = sub.subcategoryLabel.trim() || cat.categoryLabel;
        const cost = Math.max(0, sub.estimatedCost);
        if (cost <= 0) return;
        // Poste « Équipements » : hors plan (choix utilisateur).
        if (isExcludedWorkLabel(rawLabel)) return;
        const def = matchCanonical(rawLabel);
        if (def) {
          mergeWork(
            canonical,
            {
              id: `w:${def.id}`,
              label: def.label,
              cost,
              rank: def.rank,
              categoryId: cat.categoryId,
            },
            {
              id: `part:${cat.categoryId}:${sub.subcategoryId}`,
              label: rawLabel,
              cost,
              articles:
                sub.articles.length > 0
                  ? sub.articles
                      .map((a, i) => ({
                        id: `art:${cat.categoryId}:${sub.subcategoryId}:${i}`,
                        label: a.designation.trim() || "Article",
                        cost: Math.max(0, a.estimatedCost),
                        quantity: a.quantity,
                        unit: a.unit,
                      }))
                      .filter((a) => a.cost > 0)
                  : undefined,
            },
          );
        } else {
          others.push({
            id: `w:sub:${cat.categoryId}:${sub.subcategoryId}`,
            label: rawLabel,
            cost,
            rank: rank + idx,
            categoryId: cat.categoryId,
          });
        }
      });
    } else if (cat.estimatedCost > 0 && !isExcludedWorkLabel(cat.categoryLabel)) {
      const def = matchCanonical(cat.categoryLabel);
      if (def) {
        mergeWork(
          canonical,
          {
            id: `w:${def.id}`,
            label: def.label,
            cost: cat.estimatedCost,
            rank: def.rank,
            categoryId: cat.categoryId,
          },
          { id: `part:cat:${cat.categoryId}`, label: cat.categoryLabel, cost: cat.estimatedCost },
        );
      } else {
        others.push({
          id: `w:cat:${cat.categoryId}`,
          label: cat.categoryLabel,
          cost: cat.estimatedCost,
          rank,
          categoryId: cat.categoryId,
        });
      }
    }
  }

  const list = [...canonical.values(), ...others].filter((w) => w.cost > 0);

  // Postes manquant à la décomposition du coût : données récupérées depuis le
  // QUANTITATIF DÉTAILLÉ (Études & frais préliminaires, Second œuvre et
  // finitions, Transports & autres, Aménagements extérieurs).
  if (lots && lots.length > 0) {
    for (const target of LOT_SOURCE_TARGETS) {
      if (list.some((w) => w.id === `w:${target.id}`)) continue;
      const def = CANONICAL_WORKS.find((c) => c.id === target.id);
      if (!def) continue;
      const fromLots = workFromLots(lots, def, target.match);
      if (fromLots) list.push(fromLots);
    }
  }

  // En dernier recours, le poste Aménagements est proposé « à chiffrer » (0 TND).
  const amenagement = CANONICAL_WORKS.find((w) => w.id === "amenagement_exterieur");
  if (amenagement && !list.some((w) => w.id === `w:${amenagement.id}`)) {
    list.push({
      id: `w:${amenagement.id}`,
      label: amenagement.label,
      cost: 0,
      rank: amenagement.rank,
      categoryId: "amenagements_exterieurs",
    });
  }

  return list.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, "fr"));
}

// ── Allocation ─────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

function round1(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;
}

function allocate(ordered: WorkItem[], budget: number): PlannedWork[] {
  let remaining = Math.max(0, budget);
  return ordered.map((w) => {
    let funded: number;
    let status: BudgetStatus;
    if (w.cost > 0 && remaining >= w.cost) {
      funded = w.cost;
      status = "realisable";
    } else if (w.cost > 0 && remaining > 0) {
      funded = round2(remaining);
      status = "partiel";
    } else {
      funded = 0;
      status = "report";
    }
    remaining = round2(Math.max(0, remaining - funded));
    const pct = w.cost > 0 ? round1(Math.max(0, Math.min(100, (funded / w.cost) * 100))) : 0;
    return { ...w, funded: round2(funded), pct, status, parts: allocateParts(w.parts, funded) };
  });
}

/**
 * Répartit le montant financé d'un poste sur ses sous-catégories, dans l'ordre
 * d'importance (coût décroissant — même règle que `budgetEngine`). La somme
 * des sous-catégories égale toujours le montant du poste.
 */
function allocateParts(parts: WorkPartSource[] | undefined, funded: number): WorkPart[] | undefined {
  if (!parts || parts.length === 0) return undefined;
  const ordered = [...parts].sort((a, b) => b.cost - a.cost);
  let left = Math.max(0, funded);
  return ordered.map((p) => {
    let partFunded: number;
    if (p.cost > 0 && left >= p.cost) {
      partFunded = p.cost;
    } else if (p.cost > 0 && left > 0) {
      partFunded = round2(left);
    } else {
      partFunded = 0;
    }
    left = round2(Math.max(0, left - partFunded));
    const pct = p.cost > 0 ? round1(Math.max(0, Math.min(100, (partFunded / p.cost) * 100))) : 0;
    return {
      ...p,
      funded: round2(partFunded),
      pct,
      status:
        p.cost > 0 && partFunded >= p.cost ? "realisable" : partFunded > 0 ? "partiel" : "report",
      articles: allocateArticles(p.articles, partFunded),
    };
  });
}

/**
 * Répartit le montant financé d'une sous-catégorie sur ses articles, dans
 * l'ordre du Quantitatif (même règle que `budgetEngine`). La somme des
 * articles égale toujours le montant de la sous-catégorie.
 */
function allocateArticles(
  articles: WorkPartArticleSource[] | undefined,
  funded: number,
): WorkPartArticle[] | undefined {
  if (!articles || articles.length === 0) return undefined;
  let left = Math.max(0, funded);
  return articles.map((a) => {
    let articleFunded: number;
    if (a.cost > 0 && left >= a.cost) {
      articleFunded = a.cost;
    } else if (a.cost > 0 && left > 0) {
      articleFunded = round2(left);
    } else {
      articleFunded = 0;
    }
    left = round2(Math.max(0, left - articleFunded));
    const pct = a.cost > 0 ? round1(Math.max(0, Math.min(100, (articleFunded / a.cost) * 100))) : 0;
    return {
      ...a,
      funded: round2(articleFunded),
      pct,
      status:
        a.cost > 0 && articleFunded >= a.cost ? "realisable" : articleFunded > 0 ? "partiel" : "report",
    };
  });
}

// ── Priorisation IA ────────────────────────────────────────────────────────

/** Postes dont la réalisation conditionne la suivante (dépendances). */
const STRUCTURAL_IDS = new Set(["etudes", "fondations", "gros_oeuvre", "dalle_planchers", "murs", "toiture"]);

function baseReason(work: WorkItem): string {
  if (work.custom) return "Priorité personnalisée : poste que vous avez choisi d'intégrer au programme.";
  switch (work.id) {
    case "etudes":
      return "Nécessité technique : études et conventions à valider avant tout engagement de chantier.";
    case "fondations":
      return "Dépendance obligatoire : tout le bâtiment repose dessus — à financer en premier.";
    case "gros_oeuvre":
    case "dalle_planchers":
    case "murs":
      return "Nécessité technique : élément porteur — à réaliser avant toute finition pour éviter une reprise.";
    case "toiture":
      return "Sécurisation du bâti : à terminer avant les réseaux et les finitions pour protéger les travaux.";
    case "electricite":
    case "plomberie":
      return "Dépendance : à implanter avant les revêtements — une reprise après finition coûte cher.";
    case "menuiserie":
      return "Dépendance : après structure sèche, pour clore l'enveloppe avant les finitions.";
    case "revetements":
      return "Après réseaux encastrés ; report possible, mais il diffère la jouissance du logement.";
    case "peinture":
      return "Finition sans impact structurel : poste reportable sans reprise.";
    case "amenagement_exterieur":
      return "Poste indépendant du bâti : reportable sans risque pour le chantier.";
    default:
      return STRUCTURAL_IDS.has(work.id)
        ? "Nécessité technique : poste structurel prioritaire."
        : "Suivi dans l'ordre de chantier déduit des dépendances entre travaux.";
  }
}

function buildAiPriorities(
  selected: PlannedWork[],
  allWorks: WorkItem[],
  excludedIds: Set<string>,
  selectedCost: number,
): AiPriority[] {
  return selected.map((work, index) => {
    const sharePct = selectedCost > 0 ? round1((work.cost / selectedCost) * 100) : 0;
    // Dépendance non satisfaite : un poste antérieur (ordre de construction)
    // n'est ni sélectionné ni financé alors que celui-ci l'est → risque de reprise.
    const blocking = allWorks.find(
      (w) =>
        w.rank < work.rank &&
        w.id !== work.id &&
        (excludedIds.has(w.id) || selected.every((s) => s.id !== w.id || s.status === "report")),
    );
    let reason: string;
    if (work.funded > 0 && blocking) {
      reason = `Risque de reprise : ce poste dépend de « ${blocking.label} », non retenu dans le plan.`;
    } else if (work.status === "partiel") {
      reason = `${baseReason(work)} ${formatPercent(work.pct)} financé — terminez-le avant d'engager le poste suivant.`;
    } else if (work.status === "report") {
      reason = `${baseReason(work)} Non finançable actuellement : à prévoir dès le prochain budget.`;
    } else {
      reason = baseReason(work);
    }
    return {
      order: index + 1,
      id: work.id,
      label: work.label,
      pct: work.pct,
      status: work.status,
      sharePct,
      reason,
    };
  });
}

// ── Réponse « Que puis-je construire ? » ───────────────────────────────────

function joinFr(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

/** Sous-ensemble de champs nécessaires aux phrases générées. */
type PlanCore = Pick<
  ConstructionPlan,
  "works" | "fullLabels" | "partialWorks" | "deferredLabels" | "funded" | "remainingToComplete"
>;

function buildAnswerSentence(plan: PlanCore, budget: number): string {
  const amount = formatTndAmount(budget);
  if (plan.works.length === 0) {
    return `Avec ${amount}, aucun poste du programme sélectionné ne peut être engagé : sélectionnez des travaux ou complétez votre budget.`;
  }
  if (plan.funded <= 0) {
    const firstPriced = plan.works.find((w) => w.cost > 0);
    if (!firstPriced) {
      return `Avec ${amount}, aucun poste chiffré n'est sélectionné : sélectionnez des travaux du Quantitatif pour obtenir une simulation.`;
    }
    return `Avec ${amount}, aucun chantier ne peut démarrer pour l'instant : il faut au minimum ${formatTndAmount(
      firstPriced.cost,
    )} pour engager « ${firstPriced.label} ».`;
  }

  const segments: string[] = [];
  if (plan.fullLabels.length > 0) {
    segments.push(`vous pouvez réaliser ${joinFr(plan.fullLabels)}`);
  }
  if (plan.partialWorks.length > 0) {
    const first = plan.partialWorks[0];
    segments.push(
      plan.fullLabels.length > 0
        ? `environ ${formatPercent(first.pct)} de « ${first.label} »`
        : `vous pouvez financer environ ${formatPercent(first.pct)} de « ${first.label} »`,
    );
  }
  let sentence = `Avec ${amount}, ${segments.length > 0 ? joinFr(segments) : "vous financez une partie du programme"}.`;

  const deferred = plan.deferredLabels;
  if (deferred.length === 1) {
    sentence += ` « ${deferred[0]} » peut être reporté.`;
  } else if (deferred.length > 1) {
    sentence += ` Peuvent être reportés : ${joinFr(deferred)}.`;
  }
  if (plan.remainingToComplete > 0) {
    sentence += ` Terminez le programme avec ${formatTndAmount(plan.remainingToComplete)} supplémentaires.`;
  }
  return sentence;
}

function buildNextStep(plan: PlanCore): string {
  const priced = plan.works.filter((w) => w.cost > 0);
  const partial = plan.partialWorks[0];
  if (partial) {
    const next = priced.find((w) => w.status === "report");
    return (
      `Terminer « ${partial.label} » (${formatTndAmount(partial.missing)} à compléter) avant d'engager les travaux suivants` +
      (next ? `, à commencer par « ${next.label} ».` : ".")
    );
  }
  const next = priced.find((w) => w.status === "report");
  if (next) {
    return `Démarrer « ${next.label} » (${formatTndAmount(next.cost)}) — prochain chantier prioritaire du plan.`;
  }
  if (priced.length > 0) {
    return "Programme complet finançable : lancez les travaux dans l'ordre du plan, chaque poste étant intégralement couvert.";
  }
  return "Sélectionnez les travaux à réaliser pour obtenir une prochaine étape.";
}

// ── Moteur principal ───────────────────────────────────────────────────────

export interface ConstructionPlanInput {
  /** Tous les postes dérivés du Quantitatif + personnalités. */
  works: WorkItem[];
  /** Budget disponible à allouer (TND). */
  budget: number;
  /** Ids sélectionnés ; `null` = tout est sélectionné. */
  selectedIds: string[] | null;
}

export function buildConstructionPlan(input: ConstructionPlanInput): ConstructionPlan {
  const budget = Math.max(0, Number(input.budget) || 0);
  const allWorks = input.works;
  const selectedSet =
    input.selectedIds === null ? null : new Set(input.selectedIds.filter((id) => allWorks.some((w) => w.id === id)));
  const selectedItems = allWorks.filter((w) => selectedSet === null || selectedSet.has(w.id));
  const excludedWorks = allWorks.filter((w) => selectedSet !== null && !selectedSet.has(w.id));
  const ordered = [...selectedItems].sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, "fr"));

  const works = allocate(ordered, budget);
  const selectedCost = round2(works.reduce((sum, w) => sum + w.cost, 0));
  const funded = round2(works.reduce((sum, w) => sum + w.funded, 0));
  const remainingBudget = round2(Math.max(0, budget - funded));
  const globalPct = selectedCost > 0 ? round1(Math.min(100, (funded / selectedCost) * 100)) : 0;

  const fullLabels = works.filter((w) => w.status === "realisable").map((w) => w.label);
  const partialWorks = works
    .filter((w) => w.status === "partiel")
    .map((w) => ({
      id: w.id,
      label: w.label,
      pct: w.pct,
      missing: round2(Math.max(0, w.cost - w.funded)),
    }));
  const deferredLabels = works
    .filter((w) => w.status === "report" && w.cost > 0)
    .map((w) => w.label);
  const remainingToComplete = round2(Math.max(0, selectedCost - funded));

  const base = {
    budget: round2(budget),
    works,
    excludedWorks,
    selectedCost,
    funded,
    remainingBudget,
    globalPct,
    fullLabels,
    partialWorks,
    deferredLabels,
    remainingToComplete,
    extraBudgetRecommended: remainingToComplete,
  };

  return {
    ...base,
    answerSentence: buildAnswerSentence(base, budget),
    nextStep: buildNextStep(base),
    aiPriorities: buildAiPriorities(
      works.filter((w) => w.cost > 0),
      allWorks,
      new Set(excludedWorks.map((w) => w.id)),
      selectedCost,
    ),
  };
}

// ── Simulation d'augmentation de budget ────────────────────────────────────

export interface BudgetStepOption {
  delta: number;
  budget: number;
  globalPct: number;
  /** Postes qui deviennent intégralement réalisables avec ce budget. */
  additionalFullLabels: string[];
  /** % de construction supplémentaire apporté par ce palier. */
  extraPct: number;
}

/** Paliers de simulation demandés : +10 000 / +20 000 / +30 000 TND. */
export const BUDGET_STEP_DELTAS: number[] = [10000, 20000, 30000];

export function planBudgetSteps(input: ConstructionPlanInput, deltas: number[] = BUDGET_STEP_DELTAS): BudgetStepOption[] {
  const base = buildConstructionPlan(input);
  const baseFull = new Set(base.fullLabels);
  return deltas.map((delta) => {
    const budget = round2(Math.max(0, input.budget) + delta);
    const stepped = buildConstructionPlan({ ...input, budget });
    return {
      delta,
      budget,
      globalPct: stepped.globalPct,
      additionalFullLabels: stepped.fullLabels.filter((label) => !baseFull.has(label)),
      extraPct: round1(Math.max(0, stepped.globalPct - base.globalPct)),
    };
  });
}

// ── Comparaison Économique / Standard / Premium ────────────────────────────

export interface ScenarioCapacityRow {
  key: string;
  label: string;
  totalCost: number;
  /** Scénario retenu par le projet. */
  selected?: boolean;
  /** % du coût de ce scénario finançable avec le budget disponible. */
  capacityPct: number;
  /** Montant manquant pour couvrir ce scénario. */
  missing: number;
  /** Coût au m² de ce scénario, si la surface est connue. */
  perSqm?: number;
}

export function compareScenarioCapacity(
  budget: number,
  totals: ScenarioTotal[],
  surface?: number,
): ScenarioCapacityRow[] {
  const safeBudget = Math.max(0, Number(budget) || 0);
  return totals
    .filter((t) => t.totalCost > 0)
    .map((t) => ({
      key: t.key,
      label: t.label,
      totalCost: round2(t.totalCost),
      selected: t.selected,
      capacityPct: round1(Math.min(100, (safeBudget / t.totalCost) * 100)),
      missing: round2(Math.max(0, t.totalCost - safeBudget)),
      perSqm: surface && surface > 0 ? round2(t.totalCost / surface) : undefined,
    }));
}

// ── Surface constructible estimée ──────────────────────────────────────────

/**
 * Surface théorique réalisable avec le budget disponible, à partir du coût au m²
 * du projet (`projectTotal / surface`). `null` si le prix au m² est inconnu.
 */
export function estimateBuildableSurface(budget: number, perUnitCost?: number): number | null {
  const safeBudget = Math.max(0, Number(budget) || 0);
  const unit = Number(perUnitCost);
  if (!Number.isFinite(unit) || unit <= 0) return null;
  return Math.max(0, Math.round(safeBudget / unit));
}
