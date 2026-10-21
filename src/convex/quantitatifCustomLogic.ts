// ============================================================================
// PERSONNALISATION DU « QUANTITATIF DÉTAILLÉ » — logique pure partagée
// ----------------------------------------------------------------------------
// Aucune dépendance Convex / React : ce module est utilisé aussi bien par les
// fonctions backend (queries & mutations de `quantitatifCustom.ts`) que par la
// page projet (affichage, superposition, recalculs).
//
// Principe : les scénarios Économique / Standard / Premium ne sont JAMAIS
// modifiés. Les modifications d'articles sont stockées à part puis superposées
// à la copie affichée du quantitatif, ce qui produit le scénario
// « Personnalisé » (scénario de référence + modifications utilisateur).
// ============================================================================

import { normalizeLaborLine } from "../lib/laborLot";

/** Scénarios budgétaires d'origine (jamais écrasés). */
export type BudgetScenarioKey = "economique" | "standard" | "premium";

export const BUDGET_SCENARIO_KEYS: BudgetScenarioKey[] = [
  "economique",
  "standard",
  "premium",
];

export const BUDGET_SCENARIO_LABELS: Record<BudgetScenarioKey, string> = {
  economique: "Économique",
  standard: "Standard",
  premium: "Premium",
};

/** Clé du scénario dérivé (affiché uniquement s'il existe des modifications). */
export const PERSONALIZED_SCENARIO_KEY = "personnalise";

export const PERSONALIZED_SCENARIO_LABEL = "Personnalisé";

/**
 * Catégories du « Quantitatif détaillé » ouvertes à la personnalisation.
 * Toute autre catégorie reste strictement non modifiable.
 */
export const EDITABLE_LOT_IDS = [
  "frais_preliminaires",
  "gros_oeuvre",
  "second_oeuvre",
  "amenagements_exterieurs",
] as const;

export const EDITABLE_LOT_LABELS: Record<string, string> = {
  frais_preliminaires: "Frais Préliminaires et Études",
  gros_oeuvre: "Gros œuvre (fondations, structures)",
  second_oeuvre: "Second œuvre et finitions",
  amenagements_exterieurs: "Aménagements extérieurs",
};

/** La catégorie (lot) est-elle autorisée à la modification d'articles ? */
export function isEditableLot(lotId?: string | null): boolean {
  return !!lotId && (EDITABLE_LOT_IDS as readonly string[]).includes(lotId);
}

/** Libellé de la catégorie autorisée (retombe sur le nom du lot). */
export function editableLotLabel(lotId?: string | null, fallback?: string): string {
  if (!lotId) return fallback ?? "";
  return EDITABLE_LOT_LABELS[lotId] ?? fallback ?? lotId;
}

/** Identifiant stable d'un article dans le quantitatif. */
export function quantitatifLineKey(lotId: string, lineIndex: number): string {
  return `${lotId}::${lineIndex}`;
}

// ────────────────────────────────────────────────────────────────────────────
// SUPPRESSION D'UN POSTE (depuis « Modifier l'article »)
// ----------------------------------------------------------------------------
// Un « poste » est une ligne de travaux du Quantitatif détaillé
// (`projects.dqe.lots[].lines[]`). Seule la suppression d'UN poste est
// autorisée, et uniquement depuis le popup « Modifier l'article » : la
// suppression d'une catégorie ou d'une sous-catégorie n'existe pas dans
// l'application, aucun chemin (dialogue, opération groupée, mutation) ne
// permet donc de retirer indirectement des postes protégés.
//
// ÉLÉMENTS PROTÉGÉS — liste établie à partir de l'architecture réelle (gabarits
// de `dqeEngine.ts` et méthodes du moteur BIM `bimEngine.getMethods`), jamais
// inventée :
//
//   1. Catégories protégées, PAR IDENTIFIANT STABLE (`lot.id`) :
//        · `gros_oeuvre` → « Gros œuvre (fondations, structures) » et, pour les
//          rénovations, « Gros œuvre — reprises et réparations » / « Gros
//          œuvre » : terrassement/fondations, soubassement et dallage, murs
//          porteurs, poteaux/poutres, planchers, toiture et étanchéité. TOUS
//          les postes du lot et de ses sous-catégories (natures) sont protégés ;
//        · `vrd` → « Transports & autres » : raccordements SONEDE / STEG / ONAS
//          / TGM / TT, fosse septique, réseau pluvial, bornes de délimitation.
//      Un repli par libellé (`PROTECTED_POSTE_LOT_NAME_RE`) couvre les variantes
//      de nommage selon le type de projet.
//   2. Nature protégée, PAR IDENTIFIANT STABLE (`line.nature`) :
//        · `etudes` → études, permis de construire, étude géotechnique,
//          honoraires OPC : indispensables au DQE, au dossier administratif et
//          aux synchronisations (aucun substitut chiffrable à la surface).
//   3. Postes porteurs protégés, PAR CLÉ STABLE DE POSTE
//      (`lotId::cléNormalisée(designation)`, même normalisation que le moteur
//      DQE) : enveloppe, réseaux et sécurité, sur lesquels reposent les
//      quantités, les formules et la synchronisation BIM ↔ DQE :
//        · second œuvre : enduits intérieurs (support des finitions — méthode
//          « Enduit traditionnel » du moteur), menuiseries extérieures et porte
//          d'entrée (enveloppe), plomberie sanitaire, électricité, VMC,
//          garde-corps (sécurité), réseaux de cuisine (alimentation,
//          évacuation, robinets d'arrêt, points électriques, câblage) ;
//        · aménagements extérieurs : clôture (maçonnerie de délimitation) et
//          drainage périphérique (protection des fondations).
//   4. PROTECTION PAR DÉFAUT : un poste dont l'identité n'est pas exploitable
//      (catégorie ou désignation inconnue) ou qui n'existe pas dans le
//      quantitatif enregistré du projet est refusé — le doute protège.
//
// Les libellés ne servent JAMAIS à lever une protection : seuls les
// identifiants (lot, nature, clé stable de poste) sont utilisés pour protéger.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Normalisation identique au moteur DQE (`normalizeDesignationKey`) : elle
 * transforme un libellé en identifiant de comparaison stable. Dupliquée ici
 * volontairement pour que ce module reste sans dépendance (il est importé par
 * le client) ; un test vérifie l'égalité avec le moteur.
 */
export function normalizePosteKey(label: string): string {
  return String(label ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Clé stable d'un poste : catégorie + identifiant de libellé normalisé. */
export function quantitatifPosteKey(lotId: string, designation: string): string {
  return `${lotId}::${normalizePosteKey(designation)}`;
}

/** Catégories dont aucun poste ne peut être supprimé (identifiants stables). */
export const PROTECTED_POSTE_LOT_IDS = ["gros_oeuvre", "vrd"] as const;

/** Repli par libellé : « Gros œuvre … » et « Transport(s) et/ou & autres ». */
const PROTECTED_POSTE_LOT_NAME_RE = /^(gros ?oeuvre|transports? ?(?:&|et) ?autres)/;

function normalizeLotName(name: string): string {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** La catégorie est-elle protégée (aucun de ses postes n'est supprimable) ? */
export function isProtectedPosteLot(
  lotId?: string | null,
  lotName?: string | null,
): boolean {
  const id = String(lotId ?? "").trim();
  if ((PROTECTED_POSTE_LOT_IDS as readonly string[]).includes(id)) return true;
  return PROTECTED_POSTE_LOT_NAME_RE.test(normalizeLotName(lotName ?? ""));
}

/** Natures dont aucun poste ne peut être supprimé (identifiant stable). */
export const PROTECTED_POSTE_NATURES = ["etudes"] as const;

/**
 * Préfixes de clés stables de postes porteurs protégés. Le préfixe couvre
 * toutes les variantes de libellé d'un même poste selon les gabarits (ex. les
 * différentes formulations de la menuiserie extérieure).
 */
export const PROTECTED_POSTE_KEY_PREFIXES = [
  // Second œuvre — support des finitions et enveloppe du bâtiment.
  "second_oeuvre::enduitsinterieurs",
  "second_oeuvre::menuiserieexterieure",
  // Second œuvre — réseaux, ventilation et sécurité.
  "second_oeuvre::plomberie",
  "second_oeuvre::electricite",
  "second_oeuvre::vmc",
  "second_oeuvre::gardecorps",
  // Second œuvre — réseaux de cuisine (gabarit « Rénovation cuisine »).
  "second_oeuvre::alimentation",
  "second_oeuvre::evacuation",
  "second_oeuvre::arriveesetrobinetsd",
  "second_oeuvre::pointselectriques",
  "second_oeuvre::cablageetgaines",
  // Aménagements extérieurs — ouvrages de protection.
  "amenagements_exterieurs::cloture",
  "amenagements_exterieurs::drainage",
] as const;

export interface PosteProtectionInput {
  lotId?: string | null;
  lotName?: string | null;
  /** Désignation du poste de référence (jamais un libellé saisi par l'utilisateur). */
  designation?: string | null;
  /** Nature de la ligne (`materiaux`, `main_oeuvre`, `equipements`, …). */
  nature?: string | null;
}

/**
 * Motif de protection d'un poste, ou `null` lorsque sa suppression est
 * autorisée. Utilisé à la fois par l'interface (option masquée/désactivée) et
 * par la mutation Convex (refus de toute suppression, y compris forgée).
 */
export function posteProtectionReason(input: PosteProtectionInput): string | null {
  const lotId = String(input?.lotId ?? "").trim();
  if (!lotId) return "poste non identifié (catégorie inconnue)";
  if (isProtectedPosteLot(lotId, input?.lotName)) {
    return `catégorie protégée « ${input?.lotName ?? lotId} »`;
  }
  const nature = String(input?.nature ?? "").trim();
  if ((PROTECTED_POSTE_NATURES as readonly string[]).includes(nature)) {
    return "poste d'études / permis requis par le DQE";
  }
  const designation = String(input?.designation ?? "").trim();
  if (!designation) return "poste non identifiable (désignation absente)";
  const key = quantitatifPosteKey(lotId, designation);
  if (PROTECTED_POSTE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return "poste porteur essentiel (structure, enveloppe ou réseaux)";
  }
  return null;
}

/** La suppression du poste est-elle autorisée ? */
export function isPosteDeletable(input: PosteProtectionInput): boolean {
  return posteProtectionReason(input) === null;
}

/** Indication affichée pour un poste protégé (interface). */
export const PROTECTED_POSTE_MESSAGE = "Poste protégé — suppression interdite";

/** Message exact de confirmation avant la suppression d'un poste. */
export const DELETE_POSTE_CONFIRMATION =
  "Voulez-vous vraiment supprimer ce poste ? Cette opération modifiera le quantitatif et le coût total de votre projet.";

export interface QuantitatifPosteRemovalEntry {
  /** Identité de position du poste supprimé (`lotId::index de ligne`). */
  lineKey: string;
  lotId: string;
  lotName: string;
  /** Désignation d'origine : repli quand le quantitatif a été régénéré. */
  designation: string;
  nature: string;
  /** Montant au niveau de référence du moteur (avant mise à l'échelle). */
  amount: number;
  removedAt: number;
}

/** Index des postes supprimés : par position et par clé stable de poste. */
export function indexPosteRemovals(
  entries?: QuantitatifPosteRemovalEntry[] | null,
): {
  byLineKey: Map<string, QuantitatifPosteRemovalEntry>;
  byPosteKey: Map<string, QuantitatifPosteRemovalEntry>;
} {
  const byLineKey = new Map<string, QuantitatifPosteRemovalEntry>();
  const byPosteKey = new Map<string, QuantitatifPosteRemovalEntry>();
  for (const e of entries ?? []) {
    if (!e?.lineKey) continue;
    byLineKey.set(e.lineKey, e);
    byPosteKey.set(quantitatifPosteKey(e.lotId, e.designation), e);
  }
  return { byLineKey, byPosteKey };
}

/**
 * Le poste d'un lot correspond-il à une suppression enregistrée ?
 *
 * L'identité stable (catégorie + libellé normalisé) décide toujours : la
 * position ne compte que lorsqu'elle désigne le MÊME poste. Un quantitatif
 * régénéré (mise à jour des prix, synchronisation marché) ne peut donc jamais
 * faire disparaître un poste au hasard, et un poste supprimé reste supprimé
 * même si sa ligne a bougé.
 */
export function isRemovedPoste(
  index: {
    byLineKey: Map<string, QuantitatifPosteRemovalEntry>;
    byPosteKey: Map<string, QuantitatifPosteRemovalEntry>;
  },
  lotId: string,
  line: any,
  lineIndex: number,
): boolean {
  const designation = String(line?.designation ?? "");
  const byPosition = index.byLineKey.get(quantitatifLineKey(lotId, lineIndex));
  if (
    byPosition &&
    normalizePosteKey(byPosition.designation) === normalizePosteKey(designation)
  ) {
    return true;
  }
  if (!designation) return false;
  return index.byPosteKey.has(quantitatifPosteKey(lotId, designation));
}

export interface PosteRemovalResult {
  lots: any[];
  /** Nombre de lignes de travaux effectivement retirées. */
  removedLines: number;
}

/**
 * Retire les postes supprimés d'une copie du quantitatif, recalcule les
 * sous-totaux des catégories touchées et les pourcentages sur le nouveau total.
 *
 * Le quantitatif d'origine n'est jamais modifié (nouveaux objets) : les
 * scénarios Économique / Standard / Premium, le DQE enregistré, le BIM et les
 * données globales restent intacts. Les lots sans suppression sont retournés
 * à l'identique (mêmes références).
 */
export function applyPosteRemovals(
  lots: any[],
  entries?: QuantitatifPosteRemovalEntry[] | null,
): PosteRemovalResult {
  const list = lots ?? [];
  if (!entries?.length) return { lots: list, removedLines: 0 };
  const index = indexPosteRemovals(entries);
  let removedLines = 0;
  const kept: any[] = [];

  for (const lot of list) {
    const lines: any[] = lot?.lines ?? [];
    const remaining = lines.filter(
      (line: any, lineIndex: number) => !isRemovedPoste(index, lot?.id, line, lineIndex),
    );
    if (remaining.length === lines.length) {
      kept.push(lot);
      continue;
    }
    removedLines += lines.length - remaining.length;
    kept.push({
      ...lot,
      lines: remaining,
      subtotal: remaining.reduce((s: number, l: any) => s + (Number(l?.total) || 0), 0),
    });
  }

  if (!removedLines) return { lots: list, removedLines: 0 };

  // Les pourcentages sont recalculés sur le nouveau total : le montant affiché
  // par catégorie reste cohérent avec le total du scénario Personnalisé.
  const grandTotal = kept.reduce((s: number, l: any) => s + (Number(l?.subtotal) || 0), 0);
  const withPercent = kept.map((l: any) => ({
    ...l,
    percent:
      grandTotal > 0
        ? Math.round(((Number(l?.subtotal) || 0) / grandTotal) * 1000) / 10
        : 0,
  }));
  return { lots: withPercent, removedLines };
}

export interface LockedArticleReference {
  /** Quantité de l'article dans le quantitatif du projet (verrouillée). */
  quantity: number;
  /** Prix unitaire de l'article dans le quantitatif du projet (verrouillé). */
  unitPrice: number;
  /** Désignation de l'article dans le quantitatif du projet. */
  designation: string;
  /** Unité de l'article dans le quantitatif du projet. */
  unit: string;
  /** Nature du poste (`materiaux`, `main_oeuvre`, `equipements`, …). */
  nature: string;
}

/**
 * Article de référence d'une ligne du quantitatif, relu dans les lots
 * enregistrés du projet.
 *
 * La quantité et le prix unitaire ne proviennent JAMAIS du client : ils sont
 * toujours résolus ici, côté serveur, ce qui rend le verrouillage
 * (quantité = quantité de référence, prix unitaire = prix de référence décliné
 * selon le scénario) impossible à contourner.
 *
 * La position (`lineIndex`) est utilisée en priorité ; si le quantitatif a été
 * régénéré et que la ligne a bougé, la désignation d'origine sert de repli —
 * jamais une autre ligne (retourne `null` dans ce cas).
 */
export function resolveLockedArticle(
  dqeLots: any[] | null | undefined,
  lotId: string,
  lineIndex: number,
  baseDesignation?: string,
): LockedArticleReference | null {
  const lot = (dqeLots ?? []).find((l: any) => l?.id === lotId);
  const lines: any[] = lot?.lines ?? [];
  const atIndex = lines[lineIndex];
  const line =
    atIndex && (!baseDesignation || atIndex.designation === baseDesignation)
      ? atIndex
      : baseDesignation
        ? lines.find((l: any) => l?.designation === baseDesignation)
        : undefined;
  if (!line) return null;
  const quantity = Number(line.quantity) || 0;
  const unitPrice = Number(line.unitPrice) || 0;
  if (!(quantity > 0) || !(unitPrice > 0)) return null;
  return {
    quantity,
    unitPrice,
    designation: String(line.designation ?? ""),
    unit: String(line.unit ?? ""),
    nature: String(line.nature ?? "materiaux"),
  };
}

/**
 * Prix unitaire verrouillé d'un article : prix de référence du quantitatif
 * (niveau « Standard » du moteur) décliné selon le scénario de budget choisi.
 * Recalculé côté serveur, il ne peut pas être fourni par le client.
 */
export function lockedUnitPriceForScenario(
  referenceUnitPrice: number,
  scenarios: any,
  priceScenario: BudgetScenarioKey,
): number {
  return unitPriceForScenario(referenceUnitPrice, scenarios, priceScenario);
}

export interface QuantitatifCustomizationEntry {
  lineKey: string;
  lotId: string;
  lotName: string;
  lineIndex: number;
  baseDesignation: string;
  designation: string;
  unit: string;
  quantity: number;
  /** Prix unitaire au niveau de référence « Standard » du moteur. */
  unitPrice: number;
  nature: string;
  priceScenario: BudgetScenarioKey;
  replacedArticle: boolean;
  updatedAt: number;
}

/** Index des personnalisations par clé d'article. */
export function indexCustomizations(
  entries?: QuantitatifCustomizationEntry[] | null,
): Map<string, QuantitatifCustomizationEntry> {
  const map = new Map<string, QuantitatifCustomizationEntry>();
  for (const e of entries ?? []) map.set(e.lineKey, e);
  return map;
}

interface LotModIndex {
  byIndex: Map<number, QuantitatifCustomizationEntry>;
  byDesignation: Map<string, QuantitatifCustomizationEntry>;
}

/** Index des personnalisations par lot (position + désignation d'origine). */
function buildLotModIndex(
  entries: QuantitatifCustomizationEntry[],
): Map<string, LotModIndex> {
  const map = new Map<string, LotModIndex>();
  for (const m of entries) {
    let lotIndex = map.get(m.lotId);
    if (!lotIndex) {
      lotIndex = { byIndex: new Map(), byDesignation: new Map() };
      map.set(m.lotId, lotIndex);
    }
    lotIndex.byIndex.set(m.lineIndex, m);
    if (m.baseDesignation) lotIndex.byDesignation.set(m.baseDesignation, m);
  }
  return map;
}

/**
 * Retrouve la personnalisation d'une ligne. La position est utilisée en
 * priorité ; si le quantitatif a été régénéré et que la ligne a bougé, on se
 * rabat sur la désignation d'origine pour ne jamais appliquer une
 * modification à un autre article.
 */
function resolveMod(
  lotIndex: LotModIndex | undefined,
  line: any,
  lineIndex: number,
): QuantitatifCustomizationEntry | undefined {
  if (!lotIndex) return undefined;
  const byIdx = lotIndex.byIndex.get(lineIndex);
  if (byIdx && byIdx.baseDesignation === line?.designation) return byIdx;
  return lotIndex.byDesignation.get(line?.designation);
}

/**
 * Facteur d'un scénario budgétaire par rapport au scénario de référence
 * « Standard » — valeurs déjà utilisées par le moteur de calcul.
 */
export function budgetScenarioFactor(
  scenarios: any,
  scenario: BudgetScenarioKey | string,
): number {
  if (!scenarios?.standard?.totalCost) return 1;
  if (scenario === "standard") return 1;
  const sel = scenarios[scenario];
  if (!sel?.totalCost) return 1;
  return sel.totalCost / scenarios.standard.totalCost;
}

/** Prix unitaire d'un article pour un niveau de finition donné. */
export function unitPriceForScenario(
  standardLevelPrice: number,
  scenarios: any,
  scenario: BudgetScenarioKey,
): number {
  return Math.round(standardLevelPrice * budgetScenarioFactor(scenarios, scenario) * 100) / 100;
}

/**
 * Niveau « Standard » implicite d'un prix enregistré pour un autre scénario :
 * permet de basculer un article d'un niveau de finition à un autre sans
 * dérive cumulative.
 */
export function standardLevelFromPrice(
  price: number,
  scenarios: any,
  scenario: BudgetScenarioKey,
): number {
  const f = budgetScenarioFactor(scenarios, scenario) || 1;
  return price / f;
}

/**
 * Met une copie du quantitatif à l'échelle d'un scénario : montants des lignes,
 * prix unitaires dérivés et sous-totaux des lots. Le quantitatif d'origine
 * n'est jamais modifié (nouveaux objets).
 */
export function scaleDqeLots(lots: any[], factor: number): any[] {
  const list = lots ?? [];
  return list.map((lot: any) => ({
    ...lot,
    subtotal: Math.round((Number(lot?.subtotal) || 0) * factor),
    lines: (lot?.lines ?? []).map((line: any) => {
      const total = Math.round((Number(line?.total) || 0) * factor);
      // La part main-d'œuvre affichée sous le poste suit le même facteur de
      // scénario : elle reste strictement incluse dans le montant du poste.
      const labor = line?.labor
        ? {
            ...line.labor,
            total: Math.round((Number(line.labor.total) || 0) * factor),
            unitPrice:
              Math.round((Number(line.labor.unitPrice) || 0) * factor * 100) / 100,
          }
        : undefined;
      return normalizeLaborLine({
        ...line,
        total,
        unitPrice:
          Math.round((total / Math.max(1, Number(line?.quantity) || 1)) * 100) / 100,
        ...(labor ? { labor } : {}),
      });
    }),
  }));
}

interface OverlayOptions {
  /** Facteur du scénario affiché (scénario / Standard). */
  scaleFactor: number;
  /** Facteur de correction des anciennes marges d'imprévus. */
  realCostFactor: number;
}

export interface OverlayResult {
  lots: any[];
  modifiedCount: number;
  /** Écart de total (nouveau − ancien), dans la devise du projet. */
  deltaTotal: number;
  grandTotal: number;
}

/**
 * Superpose les personnalisations sur une copie du quantitatif déjà mise à
 * l'échelle du scénario affiché. Les lots sans modification sont retournés tels
 * quels (aucune altération des scénarios d'origine).
 */
export function overlayCustomizations(
  scaledLots: any[],
  entries: QuantitatifCustomizationEntry[] | null | undefined,
  opts: OverlayOptions,
): OverlayResult {
  const lots = scaledLots ?? [];
  if (!entries?.length) {
    return {
      lots,
      modifiedCount: 0,
      deltaTotal: 0,
      grandTotal: lots.reduce((s, l) => s + (Number(l?.subtotal) || 0), 0),
    };
  }
  const byLot = buildLotModIndex(entries);
  const factor = (opts.scaleFactor || 1) * (opts.realCostFactor || 1);
  let modifiedCount = 0;
  let deltaTotal = 0;

  const overlaid = lots.map((lot: any) => {
    const lotMods = byLot.get(lot?.id);
    if (!lotMods || !lot?.lines?.length) return lot;
    const lines = lot.lines.map((line: any, idx: number) => {
      const mod = resolveMod(lotMods, line, idx);
      if (!mod) return line;
      modifiedCount += 1;
      const unitPrice = Math.round(mod.unitPrice * factor * 100) / 100;
      const total = Math.round(mod.quantity * mod.unitPrice * factor);
      deltaTotal += total - (Number(line.total) || 0);
      return normalizeLaborLine({
        ...line,
        designation: mod.designation,
        unit: mod.unit,
        quantity: mod.quantity,
        unitPrice,
        total,
        // Article personnalisé : la part main-d'œuvre du barème d'origine ne
        // s'applique plus (l'utilisateur a fixé sa propre quantité / son prix).
        labor: undefined,
        customized: true,
      });
    });
    const subtotal = lines.reduce((s: number, l: any) => s + (Number(l.total) || 0), 0);
    return { ...lot, lines, subtotal };
  });

  if (!modifiedCount) return { lots, modifiedCount: 0, deltaTotal: 0, grandTotal: 0 };
  const grandTotal = overlaid.reduce((s, l: any) => s + (Number(l?.subtotal) || 0), 0);
  const withPercent = overlaid.map((l: any) => ({
    ...l,
    percent: grandTotal > 0 ? Math.round((Number(l.subtotal) / grandTotal) * 1000) / 10 : (l.percent ?? 0),
  }));
  return { lots: withPercent, modifiedCount, deltaTotal, grandTotal };
}

/**
 * Superpose les personnalisations sur le quantitatif **non mis à l'échelle**
 * (niveau de référence du moteur). Utilisé pour l'export PDF du scénario
 * « Personnalisé ».
 */
export function overlayRawCustomizations(
  rawLots: any[],
  entries: QuantitatifCustomizationEntry[] | null | undefined,
): any[] {
  const lots = rawLots ?? [];
  if (!entries?.length) return lots;
  const byLot = buildLotModIndex(entries);
  return lots.map((lot: any) => {
    const lotMods = byLot.get(lot?.id);
    if (!lotMods || !lot?.lines?.length) return lot;
    const lines = lot.lines.map((line: any, idx: number) => {
      const mod = resolveMod(lotMods, line, idx);
      if (!mod) return line;
      return normalizeLaborLine({
        ...line,
        designation: mod.designation,
        unit: mod.unit,
        quantity: mod.quantity,
        unitPrice: Math.round(mod.unitPrice * 100) / 100,
        total: Math.round(mod.quantity * mod.unitPrice),
        labor: undefined,
      });
    });
    return {
      ...lot,
      lines,
      subtotal: lines.reduce((s: number, l: any) => s + (Number(l.total) || 0), 0),
    };
  });
}

/** Totaux par nature recalculés depuis les lignes (après superposition). */
export function computeQuantitatifTotals(
  lots: any[],
  builtSurface: number,
): {
  materiaux: number;
  mainOeuvre: number;
  equipements: number;
  transport: number;
  etudes: number;
  total: number;
  costPerM2: number;
} {
  const rollup = (nature: string) =>
    (lots ?? []).reduce(
      (s: number, lot: any) =>
        s +
        (lot?.lines ?? [])
          .filter((l: any) => (l?.nature ?? "materiaux") === nature)
          .reduce((a: number, b: any) => a + (Number(b.total) || 0), 0),
      0,
    );
  const total = (lots ?? []).reduce((s: number, l: any) => s + (Number(l?.subtotal) || 0), 0);
  return {
    materiaux: rollup("materiaux"),
    mainOeuvre: rollup("main_oeuvre"),
    equipements: rollup("equipements"),
    transport: rollup("transport"),
    etudes: rollup("etudes"),
    total,
    costPerM2: builtSurface > 0 ? Math.round(total / builtSurface) : 0,
  };
}

/**
 * Une personnalisation est-elle « sans effet » (identique au scénario de
 * référence) ? Dans ce cas elle est supprimée plutôt que stockée.
 */
export function isNoopCustomization(input: {
  baseDesignation: string;
  designation: string;
  unit: string;
  baseUnit: string;
  quantity: number;
  baseQuantity: number;
  unitPrice: number;
  baseUnitPrice: number;
  priceScenario: BudgetScenarioKey;
}): boolean {
  return (
    input.priceScenario === "standard" &&
    input.designation === input.baseDesignation &&
    input.unit === input.baseUnit &&
    Math.abs(input.quantity - input.baseQuantity) < 1e-6 &&
    Math.abs(input.unitPrice - input.baseUnitPrice) < 0.01
  );
}
