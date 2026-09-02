// ═══════════════════════════════════════════════════════════════════════════
// AI MATERIALS COPILOT — Connecteur de données internes (pur, sans Convex)
//
// Le Copilot ne doit JAMAIS partir de zéro (spécification §2, §57) : avant de
// recommander un matériau, on exploite prioritairement les données réelles du
// projet :
//   PRIORITÉ 1 — BIM Engine   (costEstimate.breakdown[].items + aiAnalysis)
//   PRIORITÉ 2 — DQE          (project.dqe.lots[].lines — quantités réelles)
//   PRIORITÉ 3 — Règles       (estimation surface × niveaux, datée)
//
// Règles de fiabilité (§50–51) :
//  - On n'invente jamais une quantité : chaque quantité affiche sa source et
//    sa confiance. Les lignes DQE/BIM non mappables sont simplement ignorées.
//  - Une quantité réelle n'écrase les règles QUE si son unité est dans la même
//    famille que l'unité attendue pour la catégorie (m², m³, kg, sacs, unités…).
//    Sinon on conserve l'estimation calculée (conservation de la cohérence).
//  - Exécutable hors ligne, 100 % déterministe, sans dépendance externe.
// ═══════════════════════════════════════════════════════════════════════════

import { COPILOT_CATEGORIES, ProjectContext } from "./aiMaterialsEngine";

// ── Normalisation de texte (comparaison accents/casse indifférentes) ────────
const norm = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .toLowerCase();

// ═══════════════════════════════════════════════════════════════════════════
// DÉTECTION DE CATÉGORIE DEPUIS UN TEXTE (désignation DQE / item BIM / feature)
//
// Liste ordonnée : les règles spécifiques passent avant les mots-clés génériques
// (ex. « double vitrage » → PVC avant « vitrage » → verre ; « portillon » avant
// « porte »). Le texte scanné = désignation + description éventuelle.
// ═══════════════════════════════════════════════════════════════════════════

type TextRule = { tokens: string[]; categoryId: string };

const TEXT_RULES: TextRule[] = [
  // Menuiseries / ouvertures
  { tokens: ["double vitrage"], categoryId: "pvc" },
  { tokens: ["portes-fenetres", "porte-fenetre"], categoryId: "menuiserie" },
  { tokens: ["portillon"], categoryId: "portes" },
  { tokens: ["portail"], categoryId: "portes" },
  { tokens: ["porte d'entree", "porte d entree", "porte blindee"], categoryId: "portes" },
  { tokens: ["fenetre", "volet", "menuiserie"], categoryId: "menuiserie" },
  { tokens: ["porte"], categoryId: "portes" },
  { tokens: ["pvc"], categoryId: "pvc" },
  { tokens: ["aluminium", "alu "], categoryId: "aluminium" },
  { tokens: ["vitrage", "verre"], categoryId: "verre" },
  // Structure / gros œuvre
  { tokens: ["parpaing", "bloc beton", "bloc creux", "bloc "], categoryId: "blocs_beton" },
  { tokens: ["hourdis", "entrevous", "brique", "mur porteur", "refend"], categoryId: "briques" },
  { tokens: ["treillis", "ferraill", "acier", "garde-corps", "poutrelle", "fer forge", "barre a beton"], categoryId: "acier" },
  { tokens: ["fondation", "radier", "semelle", "dallage", "dalle", "poteau", "poutre", "coffrage", "beton"], categoryId: "beton" },
  { tokens: ["ciment"], categoryId: "ciment" },
  { tokens: ["mortier", "liant", "adjuvant", "sable de construction"], categoryId: "mortier" },
  // Isolation / étanchéité
  { tokens: ["laine de roche", "panneau acoustique", "phonique", "acoustique"], categoryId: "isolation_acoustique" },
  { tokens: ["isolant", "isolation", "polystyrene", "xps", "laine de verre", "perlite"], categoryId: "isolation_thermique" },
  { tokens: ["etanche", "bitumineuse", "membrane", "hydrofuge"], categoryId: "etancheite" },
  // Second œuvre
  { tokens: ["ragreage", "ragréage"], categoryId: "revetements_sol" },
  { tokens: ["faience", "revetements muraux", "mural"], categoryId: "faience" },
  { tokens: ["carrelage", "gres cerame", "gres ", "cerame", "plinthe", "carreau"], categoryId: "carrelage" },
  { tokens: ["pierre", "travertin"], categoryId: "pierre_naturelle" },
  { tokens: ["marbre", "granit"], categoryId: "marbre" },
  { tokens: ["enduit", "crepis", "lissage"], categoryId: "enduit" },
  { tokens: ["peinture", "acrylique", "laque", "vernis"], categoryId: "peinture" },
  { tokens: ["parquet", "contreplaque", "charpente", "madrier", "chevron", "bois"], categoryId: "bois" },
  { tokens: ["revetement", "stratifie", "pave", "sol "], categoryId: "revetements_sol" },
  // Équipements
  { tokens: ["mitigeur", "robinet", "robinetterie"], categoryId: "robinetterie" },
  { tokens: ["lavabo", "douche", "baignoire", "wc ", "sanitaire", "miroir"], categoryId: "sanitaires" },
  { tokens: ["climatiseur", "climatisation"], categoryId: "climatisation" },
  { tokens: ["chauffe-eau", "radiateur", "chauffage", "chaudiere"], categoryId: "chauffage" },
  { tokens: ["disjoncteur", "tableau electrique", "prise", "cable electrique", "led", "spot", "luminaire", "lampadaire", "electricite", "electrique"], categoryId: "electricite" },
  { tokens: ["tuyauterie", "tuyau", "raccord", "evacuation", "plomberie"], categoryId: "plomberie" },
  { tokens: ["onduleur", "batterie", "panneau photovoltaique", "solaire", "photovoltaique"], categoryId: "panneaux_solaires" },
  // Extérieur / aménagement
  { tokens: ["piscine", "liner", "mosaique"], categoryId: "piscine" },
  { tokens: ["cloture", "grillage", "gazon", "jardin", "plantat", "autobloquant", "allée", "allee ", "terrasse"], categoryId: "amenagement_exterieur" },
  { tokens: ["acier", "inox"], categoryId: "acier" },
];

/** Score d'une règle sur un texte : longueur du plus long jeton trouvé (0 = aucun). */
function ruleScore(rule: TextRule, text: string): number {
  let best = 0;
  for (const t of rule.tokens) {
    if (t.length <= best) continue;
    if (text.includes(norm(t))) best = t.length;
  }
  return best;
}

/** Catégorie copilot la plus probable pour un texte (déterministe). */
export function matchTextToCopilotCategory(text: string): { categoryId: string; matched: string } | null {
  const t = norm(text);
  if (!t) return null;
  let best: { categoryId: string; matched: string; score: number } | null = null;
  for (const rule of TEXT_RULES) {
    const score = ruleScore(rule, t);
    if (score > 0 && (!best || score > best.score)) {
      best = {
        categoryId: rule.categoryId,
        matched: rule.tokens.filter((x) => t.includes(norm(x))).sort((a, b) => b.length - a.length)[0],
        score,
      };
    }
  }
  return best ? { categoryId: best.categoryId, matched: best.matched } : null;
}

/** Repli : mots-clés officiels des catégories copilot (désignation seule). */
export function matchFallbackCopilotCategory(text: string): string | null {
  const t = norm(text);
  if (!t) return null;
  let best: { id: string; kw: string; score: number } | null = null;
  for (const cat of COPILOT_CATEGORIES) {
    for (const kw of cat.keywords) {
      const k = norm(kw);
      if (k.length >= 3 && t.includes(k) && (!best || k.length > best.score)) {
        best = { id: cat.id, kw, score: k.length };
      }
    }
  }
  return best ? best.id : null;
}

/** Détection complète : règles ciblées puis mots-clés officiels. */
export function detectCategoryFromText(text: string): string | null {
  return matchTextToCopilotCategory(text)?.categoryId ?? matchFallbackCopilotCategory(text) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION DES SOURCES DU PROJET (BIM → DQE → features → historique)
// ═══════════════════════════════════════════════════════════════════════════

export type QuantitySourceKey = "BIM" | "DQE" | "PROJET";
export type ProjectSourceEntry = {
  categoryId: string;
  designation: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
  source: QuantitySourceKey;
  confidence: number; // 0-100
};

type AnyProject = {
  name?: string;
  category?: string;
  region?: string;
  surface?: number;
  floors?: number;
  status?: string;
  createdAt?: number;
  dqe?: any;
  costEstimate?: any;
  aiAnalysis?: any;
  predictiveInsights?: any;
};

/** Aplatit le DQE du projet en lignes exploitables. */
function dqeLines(project: AnyProject): { designation: string; unit: string; quantity: number; unitPrice?: number; lotName?: string }[] {
  const dqe = project?.dqe;
  const lots = dqe?.lots ?? dqe?.dqe?.lots;
  if (!Array.isArray(lots)) return [];
  const out: { designation: string; unit: string; quantity: number; unitPrice?: number; lotName?: string }[] = [];
  for (const lot of lots) {
    const lines = lot?.lines ?? lot?.items;
    if (!Array.isArray(lines)) continue;
    for (const line of lines) {
      const q = Number(line?.quantity);
      if (!line?.designation || !Number.isFinite(q) || q <= 0) continue;
      out.push({
        designation: line.designation,
        unit: String(line.unit || ""),
        quantity: q,
        unitPrice: Number.isFinite(Number(line.unitPrice)) ? Number(line.unitPrice) : undefined,
        lotName: lot?.name,
      });
    }
  }
  return out;
}

/** Aplatit l'estimation BIM (breakdown) du projet en items quantifiés. */
function bimItems(project: AnyProject): { designation: string; unit: string; quantity: number; unitPrice?: number }[] {
  const breakdown = project?.costEstimate?.breakdown;
  if (!Array.isArray(breakdown)) return [];
  const out: { designation: string; unit: string; quantity: number; unitPrice?: number }[] = [];
  for (const cat of breakdown) {
    const items = cat?.items;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const q = Number(item?.quantity);
      if (!item?.name || !Number.isFinite(q) || q <= 0) continue;
      out.push({
        designation: item.name,
        unit: String(item.unit || ""),
        quantity: q,
        unitPrice: Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : undefined,
      });
    }
  }
  return out;
}

/** Aplatit les features de l'analyse IA du document (types détectés). */
function aiFeatures(project: AnyProject): { designation: string; unit: string; quantity: number }[] {
  const features = project?.aiAnalysis?.features;
  if (!Array.isArray(features)) return [];
  const out: { designation: string; unit: string; quantity: number }[] = [];
  for (const f of features) {
    if (!f?.type || f.detected === false) continue;
    const q = Number(f?.quantity);
    if (Number.isFinite(q) && q > 0) {
      out.push({ designation: f.type, unit: String(f.unit || "unité"), quantity: q });
    }
  }
  return out;
}

/** Aplatit l'historique des prix (predictiveInsights) — détection uniquement. */
function priceHistoryLabels(project: AnyProject | null | undefined): string[] {
  const preds = project?.predictiveInsights?.pricePredictions;
  if (!Array.isArray(preds)) return [];
  return preds.map((p: any) => String(p?.material || p?.category || "")).filter(Boolean);
}

/**
 * Extrait toutes les quantités réelles du projet mappées à des catégories copilot.
 * BIM (niveau 1) prime sur DQE (niveau 2) ; les features et l'historique servent
 * de détection complémentaire.
 */
export function projectSourceEntries(project: AnyProject | null | undefined): ProjectSourceEntry[] {
  if (!project) return [];
  const byCat = new Map<string, ProjectSourceEntry>();

  const add = (entry: ProjectSourceEntry) => {
    const cur = byCat.get(entry.categoryId);
    // priorité : BIM > DQE > PROJET (features)
    const rank = (s: QuantitySourceKey) => (s === "BIM" ? 3 : s === "DQE" ? 2 : 1);
    if (!cur || rank(entry.source) > rank(cur.source)) byCat.set(entry.categoryId, entry);
  };

  for (const item of bimItems(project)) {
    const cat = detectCategoryFromText(item.designation);
    if (cat) {
      add({
        categoryId: cat,
        designation: item.designation,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        source: "BIM",
        confidence: 95,
      });
    }
  }

  for (const line of dqeLines(project)) {
    const text = `${line.designation} ${line.lotName || ""} ${line.designation}`;
    const cat = detectCategoryFromText(text);
    if (cat) {
      add({
        categoryId: cat,
        designation: line.designation,
        unit: line.unit,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        source: "DQE",
        confidence: 90,
      });
    }
  }

  for (const f of aiFeatures(project)) {
    const cat = detectCategoryFromText(f.designation);
    if (cat) {
      add({
        categoryId: cat,
        designation: f.designation,
        unit: f.unit,
        quantity: f.quantity,
        source: "PROJET",
        confidence: 70,
      });
    }
  }

  return [...byCat.values()];
}

/** Catégories de matériaux détectées dans le projet (DQE + BIM + historique). */
export function detectProjectCategories(project: AnyProject | null | undefined): string[] {
  const entries = projectSourceEntries(project);
  const ids = new Set(entries.map((e) => e.categoryId));
  for (const label of priceHistoryLabels(project)) {
    const cat = detectCategoryFromText(label);
    if (cat) ids.add(cat);
  }
  return [...ids];
}

/**
 * Quantité réelle pour une catégorie (BIM puis DQE).
 * Retourne null si aucune source exploitable compatible avec l'unité attendue.
 */
export function projectQuantityOverride(
  categoryId: string,
  project: AnyProject | null | undefined,
  expectedUnit: string,
): { quantity: number; unit: string; designation: string; source: QuantitySourceKey; confidence: number } | null {
  if (!project) return null;
  const entries = projectSourceEntries(project)
    .filter((e) => e.categoryId === categoryId)
    .sort((a, b) => (a.source === "BIM" ? 0 : 1) - (b.source === "BIM" ? 0 : 1));
  const entry = entries[0];
  if (!entry) return null;
  if (isPackUnit(entry.unit)) return null;
  if (!unitsCompatible(entry.unit, expectedUnit)) return null;
  return {
    quantity: entry.quantity,
    unit: entry.unit,
    designation: entry.designation,
    source: entry.source,
    confidence: entry.confidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPATIBILITÉ DES UNITÉS (familles)
// ═══════════════════════════════════════════════════════════════════════════

const FAMILY: Record<string, string> = {
  m2: "area", "m carre": "area", "m²": "area",
  ml: "linear", "m l": "linear", "m lineaire": "linear",
  m3: "volume", "m cube": "volume", "m³": "volume",
  kg: "weight", tonne: "weight", tonnes: "weight", t: "weight",
  unite: "count", unites: "count", piece: "count", pieces: "count",
  appareil: "count", appareils: "count", point: "count", points: "count",
  ouvrant: "count", ouvrants: "count", module: "count", modules: "count",
  benne: "count", bennes: "count", sac: "count", sacs: "count",
  rouleau: "count", rouleaux: "count", bloc: "count", blocs: "count",
};

/** Unités « forfaitaires » : prix global d'un lot — ne jamais les utiliser comme quantité unitaire. */
const PACK_UNITS = new Set(["lot", "lots", "forfait", "forfaits", "ensemble", "ensembles"]);

/** Famille d'unité, ex. « sacs (50 kg) » → « sac » → count ; « ml » → linear. */
const unitFamily = (u: string): string | undefined => {
  const k = norm(u).trim();
  if (!k) return undefined;
  if (FAMILY[k]) return FAMILY[k];
  const first = k.replace(/\(.*$/, "").split(/[\/ ]/)[0] || k;
  const key = first.endsWith("s") ? first.slice(0, -1) : first;
  return FAMILY[key] ?? undefined;
};

/** Deux unités sont compatibles si elles appartiennent à la même famille. */
export function unitsCompatible(a: string, b: string): boolean {
  if (!a || !b) return false;
  const fa = unitFamily(a);
  const fb = unitFamily(b);
  if (fa === undefined || fb === undefined) return false;
  return fa === fb;
}

/** Unité forfaitaire (lot…) : quantité globale non réutilisable comme quantité unitaire. */
export function isPackUnit(u: string): boolean {
  return PACK_UNITS.has(norm(u).trim());
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRÔLE DE COHÉRENCE BIM vs DQE (§15)
// ═══════════════════════════════════════════════════════════════════════════

export type ConsistencyVerdict = "ecart_acceptable" | "ecart_probable" | "anomalie_potentielle";
export type ConsistencyRow = {
  categoryId: string;
  label: string;
  bimQuantity: number;
  bimUnit: string;
  dqeQuantity: number;
  dqeUnit: string;
  deltaPct: number; // écart relatif (par rapport à la plus grande des deux)
  verdict: ConsistencyVerdict;
  explanation: string;
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  COPILOT_CATEGORIES.map((c) => [c.id, c.label]),
);

export function bimDqeConsistency(project: AnyProject | null | undefined): ConsistencyRow[] {
  if (!project) return [];
  const rows: ConsistencyRow[] = [];
  const sources = projectSourceEntries(project);
  const byCat = new Map<string, ProjectSourceEntry[]>();
  for (const e of sources) {
    const list = byCat.get(e.categoryId) || [];
    list.push(e);
    byCat.set(e.categoryId, list);
  }
  for (const [catId, entries] of byCat) {
    const bim = entries.find((e) => e.source === "BIM");
    const dqe = entries.find((e) => e.source === "DQE");
    if (!bim || !dqe) continue;
    if (!unitsCompatible(bim.unit, dqe.unit)) continue;
    const max = Math.max(bim.quantity, dqe.quantity);
    if (max <= 0) continue;
    const deltaPct = Math.round((Math.abs(bim.quantity - dqe.quantity) / max) * 100);
    const verdict: ConsistencyVerdict =
      deltaPct <= 10 ? "ecart_acceptable" : deltaPct <= 25 ? "ecart_probable" : "anomalie_potentielle";
    const explanation =
      verdict === "ecart_acceptable"
        ? "Écart acceptable : les quantités BIM et DQE sont cohérentes."
        : verdict === "ecart_probable"
          ? "Écart probable : vérifier les surfaces ou les modes de métré (BIM brut vs DQE toutes pertes)."
          : "Anomalie potentielle : écart important entre le BIM et le DQE, une vérification du métré est requise.";
    rows.push({
      categoryId: catId,
      label: CATEGORY_LABEL[catId] || catId,
      bimQuantity: bim.quantity,
      bimUnit: bim.unit,
      dqeQuantity: dqe.quantity,
      dqeUnit: dqe.unit,
      deltaPct,
      verdict,
      explanation,
    });
  }
  return rows.sort((a, b) => b.deltaPct - a.deltaPct);
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPARENCE — « Données utilisées pour l'analyse » (§6)
// ═══════════════════════════════════════════════════════════════════════════

export type DataSourceRow = {
  source: string;
  detail: string;
  status: "disponible" | "partiel" | "indisponible";
};

/** Résumé des sources internes réellement exploitées pour l'analyse. */
export function projectDataSources(project: AnyProject | null | undefined): DataSourceRow[] {
  if (!project) return [];
  const rows: DataSourceRow[] = [];
  const dqeLots = Array.isArray(project.dqe?.lots)
    ? project.dqe.lots
    : Array.isArray(project.dqe?.dqe?.lots)
      ? project.dqe.dqe.lots
      : [];
  const bimBreakdown = Array.isArray(project.costEstimate?.breakdown) ? project.costEstimate.breakdown : [];
  const bimItemsCount = bimBreakdown.reduce((acc: number, c: any) => acc + (Array.isArray(c?.items) ? c.items.length : 0), 0);
  const dqeLinesCount = dqeLots.reduce((acc: number, l: any) => acc + (Array.isArray(l?.lines) ? l.lines.length : Array.isArray(l?.items) ? l.items.length : 0), 0);

  rows.push({
    source: "Projet",
    detail: project.name
      ? `${project.name} — ${project.surface ? project.surface + " m²" : ""}${project.region ? ", région " + project.region : ""}`
      : "Données du projet (type, surface, localisation)",
    status: project.surface ? "disponible" : "partiel",
  });

  rows.push({
    source: "BIM Engine",
    detail:
      bimItemsCount > 0
        ? `${bimItemsCount} quantités calculées (surfaces, volumes, lots)`
        : "Quantités calculées par les règles du moteur (estimation)",
    status: bimItemsCount > 0 ? "disponible" : "partiel",
  });

  rows.push({
    source: "DQE",
    detail:
      dqeLinesCount > 0
        ? `${dqeLots.length} lots · ${dqeLinesCount} lignes (quantités et prix internes)`
        : "Aucun DQE enregistré pour ce projet",
    status: dqeLinesCount > 0 ? "disponible" : "indisponible",
  });

  rows.push({
    source: "Base matériaux",
    detail: "Catalogue des prix Tunisie 2026 (caractéristiques, fourchettes, confiance)",
    status: "disponible",
  });

  rows.push({
    source: "Historique des prix",
    detail: Array.isArray(project.predictiveInsights?.pricePredictions)
      ? `${project.predictiveInsights.pricePredictions.length} prévisions tendancielles`
      : "Pas d'historique interne enregistré pour ce projet",
    status: Array.isArray(project.predictiveInsights?.pricePredictions) ? "disponible" : "indisponible",
  });

  rows.push({
    source: "Marché externe",
    detail: "Offres fournisseurs recensées — source complémentaire de validation",
    status: "partiel",
  });

  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// DÉTECTION D'ANOMALIES (§16)
// ═══════════════════════════════════════════════════════════════════════════

export type AnomalyRow = {
  severity: "haute" | "moyenne" | "basse";
  categoryId?: string;
  title: string;
  description: string;
};

/**
 * Détecte les anomalies exploitables sans inventer de donnée :
 *  - quantité DQE hors de la fourchette BIM ±25 % (incohérence résiduelle)
 *  - prix unitaire DQE hors de la fourchette catalogue 2026 (si fournie)
 *  - pas de surface renseignée pour un projet d'estimation
 */
export function detectProjectAnomalies(
  project: AnyProject | null | undefined,
  catalogByCategory?: Record<string, { min: number; avg: number; max: number }>,
): AnomalyRow[] {
  if (!project) return [];
  const out: AnomalyRow[] = [];

  if (!project.surface || project.surface <= 0) {
    out.push({
      severity: "haute",
      title: "Surface du projet manquante",
      description: "La surface construite n'est pas renseignée : les quantités et les coûts reposent sur des estimations.",
    });
  }

  for (const row of bimDqeConsistency(project)) {
    if (row.verdict === "anomalie_potentielle") {
      out.push({
        severity: "haute",
        categoryId: row.categoryId,
        title: `Incohérence BIM/DQE — ${row.label}`,
        description: `Écart de ${row.deltaPct}% entre le BIM (${row.bimQuantity} ${row.bimUnit}) et le DQE (${row.dqeQuantity} ${row.dqeUnit}). Vérifier le métré avant commande.`,
      });
    } else if (row.verdict === "ecart_probable") {
      out.push({
        severity: "moyenne",
        categoryId: row.categoryId,
        title: `Écart probable — ${row.label}`,
        description: `Écart de ${row.deltaPct}% entre BIM et DQE : prévoir une vérification des surfaces.`,
      });
    }
  }

  if (catalogByCategory) {
    for (const line of dqeLines(project)) {
      const up = line.unitPrice;
      if (up === undefined || !Number.isFinite(up)) continue;
      const cat = detectCategoryFromText(line.designation);
      if (!cat) continue;
      const band = catalogByCategory[cat];
      if (!band || band.avg <= 0) continue;
      if (up > band.max * 1.3) {
        out.push({
          severity: "moyenne",
          categoryId: cat,
          title: `Prix DQE supérieur à la fourchette interne — ${line.designation.slice(0, 60)}`,
          description: `Prix unitaire DQE : ${up.toFixed(2)} TND — la fourchette interne catalogue 2026 plafonne à ${band.max.toFixed(2)} TND.`,
        });
      } else if (up < band.min * 0.4 && up > 0) {
        out.push({
          severity: "basse",
          categoryId: cat,
          title: `Prix DQE nettement sous la fourchette — ${line.designation.slice(0, 60)}`,
          description: `Prix unitaire DQE : ${up.toFixed(2)} TND contre ${band.min.toFixed(2)} TND minimum interne.`,
        });
      }
    }
  }

  return out.slice(0, 8);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE DE FIABILITÉ GLOBAL (§39) — AnalysisConfidenceScore
// ═══════════════════════════════════════════════════════════════════════════

export function analysisConfidenceScore(project: AnyProject | null | undefined): number {
  if (!project) return 40;
  let score = 30;
  if (project.surface && project.surface > 0) score += 20;
  const bimCount = bimItems(project).length;
  const dqeCount = dqeLines(project).length;
  score += Math.min(25, bimCount * 5);
  score += Math.min(15, dqeCount * 2);
  if (Array.isArray(project.predictiveInsights?.pricePredictions)) score += 10;
  return Math.max(10, Math.min(97, score));
}

// ═══════════════════════════════════════════════════════════════════════════
// RÉSOLUTION DE QUANTITÉ POUR LE MOTEUR
// ── compatible avec l'API du moteur : usage dans recommendForProject (§10) ──
// ═══════════════════════════════════════════════════════════════════════════

export type ResolvedQuantity = {
  quantity: number;
  unitLabel: string;
  source: QuantitySourceKey | "CALCULEE";
  designation?: string;
  confidence: number; // 0-100
  override: boolean; // true = quantité réelle du projet utilisée
};

/**
 * Quantité d'une catégorie selon la hiérarchie :
 *   1. BIM Engine (réalité métrée) → 2. DQE (quantité réelle) → 3. règles surface.
 * L'unité doit correspondre ; sinon repli automatique sur l'estimation calculée.
 */
export function resolveProjectQuantity(
  categoryId: string,
  ctx: ProjectContext,
  project: AnyProject | null | undefined,
): ResolvedQuantity {
  const fallback = estimateQuantityLocal(categoryId, ctx);
  if (!project) {
    return { ...fallback, source: "CALCULEE", confidence: 60, override: false };
  }
  const override = projectQuantityOverride(categoryId, project, fallback.unitLabel);
  if (!override) {
    return { ...fallback, source: "CALCULEE", confidence: 60, override: false };
  }
  return {
    quantity: override.quantity,
    unitLabel: override.unit,
    source: override.source,
    designation: override.designation,
    confidence: override.confidence,
    override: true,
  };
}

// Réimplémentation locale du calcul de règles (évite toute dépendance circulaire).
function estimateQuantityLocal(categoryId: string, ctx: ProjectContext): { quantity: number; unitLabel: string } {
  const S = Math.max(0, ctx.surface || 0);
  const floors = Math.max(1, ctx.floors || 1);
  const built = S * floors;
  const rooms = ctx.rooms || {};
  const bathrooms = rooms.bathrooms ?? Math.max(1, Math.round(built / 60));
  const kitchens = rooms.kitchens ?? 1;
  const sanitaires = bathrooms + kitchens;
  const terrain = ctx.terrainSurface ?? Math.max(built, S);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round0 = (n: number) => Math.round(n);

  switch (categoryId) {
    case "beton": return { quantity: round2(built * 0.18), unitLabel: "m³" };
    case "ciment": return { quantity: round2(built * 6.5), unitLabel: "sacs (50 kg)" };
    case "acier": return { quantity: round2(built * 32), unitLabel: "kg" };
    case "briques": return { quantity: round0(built * 38), unitLabel: "pièces" };
    case "blocs_beton": return { quantity: round0(built * 12), unitLabel: "pièces" };
    case "isolation_thermique": return { quantity: round2(built * 1.15), unitLabel: "m²" };
    case "isolation_acoustique": return { quantity: round2(built * 0.6), unitLabel: "m²" };
    case "etancheite": return { quantity: round2(built * 1.05), unitLabel: "m²" };
    case "mortier": return { quantity: round2(built * 0.025), unitLabel: "m³" };
    case "enduit": return { quantity: round2(built * 2.2), unitLabel: "m²" };
    case "carrelage": return { quantity: round2(built * 0.85), unitLabel: "m²" };
    case "faience": return { quantity: round2(built * 0.55), unitLabel: "m²" };
    case "pierre_naturelle": return { quantity: round2(built * 0.35), unitLabel: "m²" };
    case "marbre": return { quantity: round2(built * 0.25), unitLabel: "m²" };
    case "peinture": return { quantity: round2(built * 3.0), unitLabel: "m²" };
    case "bois": return { quantity: round2(built * 0.06), unitLabel: "m³" };
    case "aluminium":
    case "pvc":
    case "menuiserie": return { quantity: Math.max(1, Math.round(built / 14)), unitLabel: "ouvrants" };
    case "verre": return { quantity: Math.max(1, Math.round(built / 10)), unitLabel: "m²" };
    case "portes": return { quantity: Math.max(1, Math.round(built / 18)), unitLabel: "unités" };
    case "revetements_sol": return { quantity: round2(built * 0.9), unitLabel: "m²" };
    case "sanitaires": return { quantity: Math.max(1, sanitaires), unitLabel: "appareils" };
    case "robinetterie": return { quantity: Math.max(1, Math.round(sanitaires * 2.5)), unitLabel: "points d'eau" };
    case "electricite": return { quantity: Math.max(6, Math.round(built * 0.9)), unitLabel: "points" };
    case "plomberie": return { quantity: round2(built * 0.4), unitLabel: "ml" };
    case "chauffage": return { quantity: Math.max(1, Math.round(built / 70)), unitLabel: "unités" };
    case "climatisation": return { quantity: Math.max(1, Math.round(built / 45)), unitLabel: "unités" };
    case "equipements_energetiques": return { quantity: Math.max(1, Math.round(built / 25)), unitLabel: "unités" };
    case "panneaux_solaires": return { quantity: Math.max(1, Math.round(built / 18)), unitLabel: "modules" };
    case "piscine": {
      const cat = (ctx.projectCategory || "").toLowerCase();
      const wantsPool = cat.includes("piscine") || cat.includes("villa") || cat.includes("hotel") || cat.includes("residence");
      return { quantity: wantsPool ? 1 : 0, unitLabel: "forfait" };
    }
    case "amenagement_exterieur": return { quantity: round2(terrain * 0.35), unitLabel: "m²" };
    default: return { quantity: 1, unitLabel: "unité" };
  }
}