// ============================================================================
// VALORISATION DES QUANTITÉS TECHNIQUES AVEC LES PRIX DÉJÀ CONFIGURÉS
// ----------------------------------------------------------------------------
// Aucun prix n'est créé ici : chaque quantité est rapprochée d'un poste du
// « Quantitatif détaillé » du projet (prix du marché tunisien configuré dans
// BatiBuild). Un poste sans prix correspondant est signalé explicitement
// (« Prix non configuré ») au lieu de recevoir une valeur fictive.
//
// Le total technique est une VÉRIFICATION : les lots Plomberie / Électricité
// sont déjà compris dans le total TTC. Il n'est donc jamais ajouté une seconde
// fois — c'est la règle « sans doublonner les coûts déjà comptabilisés ».
// ============================================================================

import type { QuantityLine, TechnicalPlanKind } from "./technicalPlanEngine";

export interface DqeLineLike {
  designation?: string;
  unit?: string;
  unitPrice?: number;
  quantity?: number;
  total?: number;
  nature?: string;
  sousLot?: string;
}

export interface DqeLotLike {
  id?: string;
  name?: string;
  subtotal?: number;
  lines?: DqeLineLike[];
}

export interface PricedQuantity extends QuantityLine {
  unitPrice: number | null;
  total: number | null;
  priceSource: string | null;
  priceMissing: boolean;
}

export interface TechnicalCostSync {
  kind: TechnicalPlanKind;
  existingLots: { id: string; name: string; subtotal: number; supplySubtotal: number }[];
  existingSubtotal: number;
  existingSupplySubtotal: number;
  technicalTotal: number;
  pricedCount: number;
  missingPrices: string[];
  delta: number;
  overForfait: boolean;
  notes: string[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Unités comparables (le Quantitatif écrit « unités », « points », « ml », « lot »). */
function normalizeUnit(unit: string): string {
  const u = normalize(unit);
  if (u === "ml" || u === "metre lineaire" || u === "metres lineaires" || u === "m") return "ml";
  if (u.startsWith("unite")) return "unite";
  if (u.startsWith("point")) return "points";
  if (u.startsWith("lot")) return "lot";
  if (u.startsWith("jour")) return "jours";
  return u;
}

function diameterOf(label: string): number | null {
  const m = label.match(/Ø\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  return Number(m[1].replace(",", "."));
}

function sectionOf(label: string): number | null {
  const m = label.match(/c[âa]ble\s+(\d+(?:[.,]\d+)?)\s*mm/i);
  if (!m) return null;
  return Number(m[1].replace(",", "."));
}

function breakerOf(label: string): number | null {
  const m = label.match(/(\d+)\s*A\b/);
  if (!m) return null;
  return Number(m[1]);
}

function designationHas(line: DqeLineLike, pattern: RegExp): boolean {
  return pattern.test(normalize(String(line.designation ?? "")));
}

interface Candidate {
  line: DqeLineLike;
  lotId: string;
  lotName: string;
}

function collectCandidates(lots: DqeLotLike[]): Candidate[] {
  const out: Candidate[] = [];
  for (const lot of lots) {
    for (const line of lot.lines ?? []) {
      if (!(Number(line.unitPrice) > 0)) continue;
      out.push({
        line,
        lotId: String(lot.id ?? ""),
        lotName: String(lot.name ?? ""),
      });
    }
  }
  return out;
}

interface Rule {
  test: (label: string) => boolean;
  pick: (candidates: Candidate[], label: string) => Candidate | null;
}

const byDesignation = (pattern: RegExp) => (candidates: Candidate[]) =>
  candidates.find((c) => designationHas(c.line, pattern)) ?? null;

const byDiameter = (pattern: RegExp, diameter: number | null) => (candidates: Candidate[]) => {
  const pool = candidates.filter((c) => designationHas(c.line, pattern));
  if (!pool.length) return null;
  if (diameter == null) return pool[0];
  const exact = pool.find((c) => {
    const d = diameterOf(String(c.line.designation ?? ""));
    if (d != null) return Math.abs(d - diameter) < 0.6;
    const text = normalize(String(c.line.designation ?? ""));
    return text.includes(String(diameter)) || (diameter === 100 && text.includes("110")) || (diameter === 40 && text.includes("50"));
  });
  return exact ?? pool[0];
};

const PLUMBING_RULES: Rule[] = [
  { test: (l) => /^tube per/i.test(l), pick: (c, l) => byDiameter(/tube per|per Ø|per\b/i, diameterOf(l))(c) },
  { test: (l) => /^tube pvc/i.test(l), pick: (c, l) => byDiameter(/pvc/i, diameterOf(l))(c) },
  { test: (l) => /^colonne montante cuivre/i.test(l), pick: byDesignation(/cuivre/i) },
  { test: (l) => /^collecteur/i.test(l), pick: byDesignation(/collecteur/i) },
  { test: (l) => /^wc$/i.test(l.trim()), pick: byDesignation(/wc/i) },
  { test: (l) => /^lavabo/i.test(l), pick: byDesignation(/lavabo/i) },
  { test: (l) => /^douche/i.test(l), pick: byDesignation(/receveur|douche/i) },
  { test: (l) => /^baignoire/i.test(l), pick: byDesignation(/baignoire/i) },
  { test: (l) => /^evier/i.test(l), pick: byDesignation(/evier/i) },
  { test: (l) => /^chauffe-eau/i.test(l), pick: byDesignation(/chauffe-eau|chauffe eau/i) },
  { test: (l) => /^lave-vaisselle/i.test(l), pick: byDesignation(/lave-vaisselle|lave vaisselle/i) },
  { test: (l) => /^lave-linge/i.test(l), pick: byDesignation(/lave-linge|lave linge/i) },
];

const ELECTRICAL_RULES: Rule[] = [
  {
    test: (l) => /^c[âa]ble\s+\d/i.test(l),
    pick: (c, l) => {
      const section = sectionOf(l);
      const pool = c.filter((x) => designationHas(x.line, /c[âa]ble/i));
      if (section == null) return pool[0] ?? null;
      return (
        pool.find((x) => {
          const s = sectionOf(String(x.line.designation ?? ""));
          return s != null && Math.abs(s - section) < 0.01;
        }) ?? null
      );
    },
  },
  { test: (l) => /^gaines/i.test(l), pick: byDesignation(/gaine/i) },
  { test: (l) => /^bo[iî]tes/i.test(l), pick: byDesignation(/boite/i) },
  { test: (l) => /^points lumineux int/i.test(l), pick: byDesignation(/points d'eclairage|points lumineux/i) },
  { test: (l) => /^points lumineux ext/i.test(l), pick: byDesignation(/eclairage exterieur/i) },
  { test: (l) => /^interrupteurs \/ commandes/i.test(l), pick: byDesignation(/interrupteur/i) },
  { test: (l) => /^prises 2p\+t/i.test(l), pick: byDesignation(/prises de courant/i) },
  { test: (l) => /^prises sp[ée]cialis[ée]es/i.test(l), pick: byDesignation(/prises specialisees/i) },
  { test: (l) => /^tableau [ée]lectrique/i.test(l), pick: byDesignation(/tableau electrique/i) },
  {
    test: (l) => /^disjoncteurs divisionnaires/i.test(l),
    pick: (c) => byDesignation(/disjoncteurs divisionnaires/i)(c),
  },
  { test: (l) => /^interrupteurs diff[ée]rentiels/i.test(l), pick: byDesignation(/differentiel/i) },
  { test: (l) => /^parafoudre/i.test(l), pick: byDesignation(/parafoudre/i) },
  { test: (l) => /^barrette de terre/i.test(l), pick: byDesignation(/prise de terre|liaisons equipotentielles/i) },
];

/** Retrouve le prix configuré correspondant à une quantité (ou `null`). */
export function findConfiguredPrice(
  quantity: QuantityLine,
  lots: DqeLotLike[],
): { unitPrice: number; designation: string; lotName: string } | null {
  const candidates = collectCandidates(lots);
  if (!candidates.length) return null;
  const rules = quantity.kind === "plomberie" ? PLUMBING_RULES : ELECTRICAL_RULES;
  const rule = rules.find((r) => r.test(quantity.label));
  if (!rule) return null;
  const match = rule.pick(candidates, quantity.label);
  if (!match) return null;
  const unit = normalizeUnit(String(match.line.unit ?? ""));
  if (normalizeUnit(quantity.unit) !== unit) return null;
  return {
    unitPrice: Number(match.line.unitPrice),
    designation: String(match.line.designation ?? ""),
    lotName: match.lotName,
  };
}

export function priceQuantities(lines: QuantityLine[], lots: DqeLotLike[]): PricedQuantity[] {
  return lines.map((line) => {
    const price = findConfiguredPrice(line, lots);
    return {
      ...line,
      unitPrice: price?.unitPrice ?? null,
      total: price ? Math.round(line.quantity * price.unitPrice * 100) / 100 : null,
      priceSource: price ? `${price.designation} · ${price.lotName}` : null,
      priceMissing: !price,
    };
  });
}

const PLUMBING_LOT_PATTERN = /plomberie|alimentation en eau|evacuation|sanitaire|chauffe-?eau/i;
const ELECTRICAL_LOT_PATTERN = /electricite|tableau electrique|cablage|appareillage|points lumineux|mise a la terre/i;

export function buildTechnicalCostSync(input: {
  kind: TechnicalPlanKind;
  quantities: QuantityLine[];
  lots: DqeLotLike[];
}): TechnicalCostSync {
  const { kind, quantities, lots } = input;
  const priced = priceQuantities(quantities, lots);
  const technicalTotal = Math.round(priced.reduce((n, q) => n + (q.total ?? 0), 0) * 100) / 100;
  const missingPrices = priced.filter((q) => q.priceMissing).map((q) => `${q.label} (${q.unit})`);

  const pattern = kind === "plomberie" ? PLUMBING_LOT_PATTERN : ELECTRICAL_LOT_PATTERN;
  const existingLots = lots
    .filter((lot) => pattern.test(normalize(`${lot.id ?? ""} ${lot.name ?? ""}`)))
    .map((lot) => {
      const supplySubtotal = Math.round(
        (lot.lines ?? [])
          .filter((line) => line.nature !== "main_oeuvre" && line.nature !== "etudes")
          .reduce((n, line) => n + (Number(line.total) || 0), 0),
      );
      return {
        id: String(lot.id ?? ""),
        name: String(lot.name ?? ""),
        subtotal: Number(lot.subtotal) || 0,
        supplySubtotal,
      };
    });

  const existingSubtotal = Math.round(existingLots.reduce((n, l) => n + l.subtotal, 0));
  const existingSupplySubtotal = Math.round(existingLots.reduce((n, l) => n + l.supplySubtotal, 0));
  const delta = Math.round((technicalTotal - existingSupplySubtotal) * 100) / 100;

  const notes: string[] = [
    "Les lots Plomberie / Électricité du Coût estimatif sont déjà compris dans le total TTC : cette valorisation technique est une vérification, jamais un montant ajouté une seconde fois.",
  ];
  if (!existingLots.length) {
    notes.push(
      "Aucun poste Plomberie / Électricité n'est encore enregistré dans le Quantitatif du projet : lancez d'abord le Coût estimatif pour disposer des prix du marché tunisien.",
    );
  }
  if (missingPrices.length) {
    notes.push(
      `${missingPrices.length} quantité(s) sans prix configuré : aucun prix n'a été inventé. Ajoutez le prix dans les prix matériaux ou dans le Quantitatif pour la valoriser.`,
    );
  }
  if (existingLots.length && delta > Math.max(50, existingSupplySubtotal * 0.05)) {
    notes.push(
      `Les quantités techniques dépassent de ${Math.round(delta)} TND le montant fournitures du lot existant : à arbitrer dans le Quantitatif détaillé (le plan ne modifie jamais silencieusement les totaux).`,
    );
  }

  return {
    kind,
    existingLots,
    existingSubtotal,
    existingSupplySubtotal,
    technicalTotal,
    pricedCount: priced.filter((q) => !q.priceMissing).length,
    missingPrices,
    delta,
    overForfait: existingLots.length > 0 && delta > Math.max(50, existingSupplySubtotal * 0.05),
    notes,
  };
}
