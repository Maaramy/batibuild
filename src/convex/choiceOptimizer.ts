// ═══════════════════════════════════════════════════════════════════════════
// OPTIMISER MON CHOIX — extension indépendante du moteur Matériaux IA
// (« Optimiser mon choix » — spécification §5 Matériaux AI)
//
// Analyse le choix recommandé de chaque catégorie sur les 9 axes du scoring
// (prix, qualité, durabilité, isolation thermique/acoustique, résistance,
// entretien, disponibilité, impact environnemental), puis confronte chaque axe
// aux alternatives RÉELLES du catalogue — mêmes données, mêmes fonctions de
// score, jamais de prix inventé (règle de fiabilité du moteur).
//
// Le coût de bascule d'un matériau à l'autre utilise exactement la formule de
// la grille de coûts du moteur : (Δprix unitaire × quantité) × (1 + pose %) ×
// (1 + transport % + déchets % + accessoires %) × (1 + TVA).
// ═══════════════════════════════════════════════════════════════════════════

import {
  COPILOT_CATEGORY_BY_ID,
  matchCategoryMaterials,
  priceBandFor,
  scoreMaterial,
  TRANSPORT_PCT,
  WASTE_PCT,
  ACCESSORIES_PCT,
  TVA,
  MaterialScores,
  CatalogMaterial,
  Offer,
  RecommendResult,
} from "./aiMaterialsEngine";

export type ChoiceAxisKey = Exclude<keyof MaterialScores, "noteGlobale">;

export type ChoiceAxisAssessment = {
  key: ChoiceAxisKey;
  label: string;
  /** Score moyen de l'axe sur l'ensemble des catégories analysées (0-100). */
  score: number;
  verdict: "fort" | "correct" | "faible";
  comment: string;
};

export type ChoiceAlternative = {
  categoryId: string;
  categoryLabel: string;
  /** Axe sur lequel l'alternative est plus performante. */
  axis: string;
  axisLabel: string;
  currentId: string;
  currentName: string;
  alternativeId: string;
  alternativeName: string;
  currentScore: number;
  alternativeScore: number;
  /** Gain de points sur l'axe. */
  gain: number;
  /** Surcoût TTC complet (ou économie si négatif) si l'alternative est retenue. */
  extraCost: number;
  rationale: string;
};

export type ChoiceOptimization = {
  /** Moyenne des notes globales des solutions recommandées (0-100). */
  overallScore: number;
  verdict: "optimal" | "ameliorable" | "suboptimal";
  headline: string;
  axes: ChoiceAxisAssessment[];
  alternatives: ChoiceAlternative[];
  assumptions: string[];
  note: string;
};

/** Définition des 9 axes évalués (même grille que l'UI des solutions). */
const CHOICE_AXIS_DEFS: { key: ChoiceAxisKey; label: string }[] = [
  { key: "prix", label: "Prix" },
  { key: "qualite", label: "Qualité" },
  { key: "durabilite", label: "Durabilité" },
  { key: "isolationThermique", label: "Isolation thermique" },
  { key: "isolationAcoustique", label: "Isolation acoustique" },
  { key: "resistance", label: "Résistance" },
  { key: "entretien", label: "Entretien" },
  { key: "disponibilite", label: "Disponibilité" },
  { key: "impactEnvironnemental", label: "Impact environnemental" },
];

/** Écart minimal de points pour proposer une alternative (anti-bruit). */
const CHOICE_MIN_GAIN = 3;

function choiceAxisVerdict(score: number): "fort" | "correct" | "faible" {
  return score >= 75 ? "fort" : score >= 55 ? "correct" : "faible";
}

/** Commentaire déterministe par axe et niveau (aucune donnée inventée). */
const CHOICE_AXIS_COMMENTS: Record<ChoiceAxisKey, [string, string, string]> = {
  prix: ["Prix compétitif — levier d'économie limité.", "Prix conforme au marché.", "Prix élevé — des alternatives moins chères existent."],
  qualite: ["Qualité confirmée par des données fiables.", "Qualité correcte pour l'usage courant.", "Qualité perfectible — données ou fabrication à vérifier."],
  durabilite: ["Très bonne longévité, entretien espacé.", "Durabilité standard pour ce type d'ouvrage.", "Durabilité limitée — remplacement à prévoir plus tôt."],
  isolationThermique: ["Excellente performance thermique pour le climat tunisien.", "Performance thermique moyenne.", "Performance thermique faible — climatisation plus sollicitée."],
  isolationAcoustique: ["Bonne isolation acoustique.", "Isolation acoustique moyenne.", "Isolation acoustique limitée."],
  resistance: ["Résistance mécanique élevée.", "Résistance mécanique suffisante en usage courant.", "Résistance mécanique à surveiller selon la charge."],
  entretien: ["Entretien simple et peu fréquent.", "Entretien régulier modéré.", "Entretien exigeant — coût d'usage plus élevé."],
  disponibilite: ["Large disponibilité et délais courts.", "Disponibilité correcte — délais standards.", "Disponibilité limitée — délais à vérifier."],
  impactEnvironnemental: ["Impact environnemental favorable.", "Impact environnemental moyen.", "Impact environnemental élevé."],
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round0 = (n: number) => Math.round(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Analyse « Optimiser mon choix » : évalue la sélection recommandée du projet
 * axe par axe, puis identifie les alternatives du catalogue qui dominent le
 * choix courant sur un axe donné (gain >= CHOICE_MIN_GAIN). Une seule
 * alternative par (catégorie, axe) : le meilleur gain, départagé par le
 * surcoût le plus faible. Le résultat est borné aux 12 meilleures pistes.
 */
export function optimizeChoice(input: {
  result: RecommendResult;
  materials: CatalogMaterial[];
  offers: Offer[];
}): ChoiceOptimization {
  const { result } = input;
  const ctx = result.context;

  const offersByProduct = new Map<string, Offer[]>();
  for (const o of input.offers) {
    const list = offersByProduct.get(o.productId) || [];
    list.push(o);
    offersByProduct.set(o.productId, list);
  }

  const axisSums = new Map<ChoiceAxisKey, { sum: number; n: number }>();
  const noteSums = { sum: 0, n: 0 };
  const bestByCatAxis = new Map<string, ChoiceAlternative>();

  for (const catRes of result.categories) {
    const current = catRes.solutions.find((s) => s.profile === "equilibre") || catRes.solutions[0];
    if (!current) continue;
    const catDef = COPILOT_CATEGORY_BY_ID[catRes.categoryId];
    if (!catDef) continue;
    const candidates = matchCategoryMaterials(catDef, input.materials);
    if (candidates.length === 0) continue;

    // Accumule les scores par axe et la note globale du choix courant.
    for (const { key } of CHOICE_AXIS_DEFS) {
      const rec = axisSums.get(key) ?? { sum: 0, n: 0 };
      rec.sum += current.scores[key] ?? 0;
      rec.n += 1;
      axisSums.set(key, rec);
    }
    noteSums.sum += current.scores.noteGlobale ?? 0;
    noteSums.n += 1;

    // Bornes de prix de la catégorie (mêmes règles que recommendForProject) :
    // seules les bandes valides sont agrégées — un prix corrompu est exclu.
    const bands = candidates
      .map((m) => priceBandFor(m, offersByProduct.get(m._id) || []))
      .filter((b) => Number.isFinite(b.avg));
    if (bands.length === 0) continue;
    const catMin = Math.min(...bands.map((b) => b.avg));
    const catMax = Math.max(...bands.map((b) => b.avg));

    // Coût TTC complet d'une bascule (même formule que la grille de coûts).
    const costDelta = (altUnitPrice: number) =>
      (altUnitPrice - current.material.band.avg) *
      current.material.quantity *
      (1 + catDef.posePct) *
      (1 + TRANSPORT_PCT + WASTE_PCT + ACCESSORIES_PCT) *
      (1 + TVA);

    for (const m of candidates) {
      if (m._id === current.material.id) continue;
      const scored = scoreMaterial(m, offersByProduct.get(m._id) || [], catDef, "equilibre", ctx, catMin, catMax);
      if (!scored) continue;
      for (const { key, label } of CHOICE_AXIS_DEFS) {
        const curScore = current.scores[key] ?? 0;
        const altScore = scored.scores[key] ?? 0;
        const gain = altScore - curScore;
        if (gain < CHOICE_MIN_GAIN) continue;
        const extraCost = round0(costDelta(scored.band.avg));
        const slotKey = `${catRes.categoryId}:${key}`;
        const prev = bestByCatAxis.get(slotKey);
        // Meilleure alternative par (catégorie, axe) : gain max, puis coût min.
        if (!prev || gain > prev.gain || (gain === prev.gain && extraCost < prev.extraCost)) {
          bestByCatAxis.set(slotKey, {
            categoryId: catRes.categoryId,
            categoryLabel: catRes.label,
            axis: key,
            axisLabel: label,
            currentId: current.material.id,
            currentName: current.material.name,
            alternativeId: m._id,
            alternativeName: m.name,
            currentScore: curScore,
            alternativeScore: altScore,
            gain,
            extraCost,
            rationale:
              `Sur l'axe « ${label.toLowerCase()} », « ${m.name} » gagne ${gain} points ` +
              `(${altScore}/100 contre ${curScore}/100) pour ${extraCost >= 0 ? "un surcoût" : "une économie"} de ` +
              `${Math.abs(extraCost).toLocaleString("fr-TN")} TND sur la quantité retenue.`,
          });
        }
      }
    }
  }

  const axes: ChoiceAxisAssessment[] = CHOICE_AXIS_DEFS.map(({ key, label }) => {
    const rec = axisSums.get(key);
    const score = rec && rec.n > 0 ? round0(rec.sum / rec.n) : 0;
    const verdict = choiceAxisVerdict(score);
    return {
      key,
      label,
      score,
      verdict,
      comment: CHOICE_AXIS_COMMENTS[key][verdict === "fort" ? 0 : verdict === "correct" ? 1 : 2],
    };
  });

  const overallScore = noteSums.n > 0 ? round0(noteSums.sum / noteSums.n) : 0;
  const alternatives = [...bestByCatAxis.values()]
    .sort((a, b) => b.gain - a.gain || a.extraCost - b.extraCost)
    .slice(0, 12);

  const verdict: ChoiceOptimization["verdict"] =
    alternatives.length === 0 && overallScore >= 70
      ? "optimal"
      : overallScore < 50
        ? "suboptimal"
        : "ameliorable";

  const headline =
    verdict === "optimal"
      ? `Votre sélection est déjà parmi les plus performantes : score global ${overallScore}/100 et aucune alternative ne la domine significativement sur un axe.`
      : verdict === "suboptimal"
        ? `Score global faible (${overallScore}/100) : ${alternatives.length} alternative(s) gagneraient des points significatifs — vérifiez le budget avant de les retenir.`
        : `Bonne sélection (score ${overallScore}/100) avec ${alternatives.length} piste(s) d'optimisation possible(s) selon vos priorités.`;

  return {
    overallScore,
    verdict,
    headline,
    axes,
    alternatives,
    assumptions: [
      "Analyse fondée exclusivement sur les matériaux et prix recensés dans la base — aucune donnée inventée.",
      "Les scores d'axes sont des aides à la décision, pas des mesures de laboratoire.",
      "Le surcoût/économie inclut pose, transport, déchets, accessoires et TVA 19 % sur la quantité retenue.",
    ],
    note: "Les alternatives proposées restent des suggestions : validez tout changement technique (notamment structurel) avec un professionnel.",
  };
}

/** Petit utilitaire exposé pour tests et réutilisations futures (non utilisé par l'UI). */
export const CHOICE_LIMITS = { maxAlternatives: 12, minGain: CHOICE_MIN_GAIN } as const;
export { round2 as roundChoicePrice };
