// ============================================================================
// ENDUIT DE LISSAGE — QUANTITÉ PHYSIQUE EN KG ET ACHAT PAR SEAUX
// ----------------------------------------------------------------------------
// Le poste est calculé en KILOGRAMMES à partir de la surface réellement
// traitée (murs + plafonds), du nombre de couches et du rendement du produit.
// Le produit étant vendu en seaux, la conversion est explicite :
//
//   surface traitée (m²) = surface construite × 2,5
//   quantité nécessaire (kg) = surface traitée × 2 couches × 1,2 kg/m²/couche
//   seaux nécessaires = quantité nécessaire / poids du seau (20 kg par défaut)
//   seaux à acheter = arrondi supérieur
//   total = seaux à acheter × prix du seau
//
// Le prix unitaire affiché est TOUJOURS le prix du seau, jamais un prix au kg
// appliqué à une quantité en kg (ou l'inverse). Le module est pur et partagé
// par le moteur BIM, le DQE et la page « Matériaux utilisés ».
// ============================================================================

/** Poids d'un seau d'enduit de lissage (kg). */
export const ENDUIT_LISSAGE_BUCKET_KG = 20;
/** Nombre de couches appliquées (rebouchage + lissage). */
export const ENDUIT_LISSAGE_COATS = 2;
/** Rendement technique : 1,2 kg de produit par m² et par couche. */
export const ENDUIT_LISSAGE_KG_PER_M2_PER_COAT = 1.2;
/** Surface de murs + plafonds traitée par m² construit (ratio peinture). */
export const ENDUIT_LISSAGE_M2_PER_BUILT_M2 = 2.5;

const round1 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/** Normalise un libellé (accents, casse, ponctuation). */
function norm(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Vrai pour le poste « Enduit de lissage » (pas les enduits de façade). */
export function isEnduitLissageName(name: unknown): boolean {
  return norm(name).includes("enduit de lissage");
}

/** Surface de murs + plafonds à lisser (m²). */
export function enduitLissageSurfaceM2(builtArea: number): number {
  return round1(Math.max(0, builtArea) * ENDUIT_LISSAGE_M2_PER_BUILT_M2);
}

/** Quantité physique nécessaire (kg), avant arrondi d'achat. */
export function enduitLissageNeededKg(builtArea: number): number {
  return round1(
    enduitLissageSurfaceM2(builtArea) *
      ENDUIT_LISSAGE_COATS *
      ENDUIT_LISSAGE_KG_PER_M2_PER_COAT,
  );
}

/** Nombre de seaux à acheter (arrondi supérieur). */
export function enduitLissageBuckets(
  neededKg: number,
  bucketKg: number = ENDUIT_LISSAGE_BUCKET_KG,
): number {
  const weight = bucketKg > 0 ? bucketKg : ENDUIT_LISSAGE_BUCKET_KG;
  return Math.max(0, Math.ceil(round1(neededKg) / weight));
}

/** Poids du seau lu dans l'unité (« seau 20 kg », « sac 25kg »…). */
export function enduitLissageBucketKg(unit: unknown): number {
  const match = String(unit ?? "").match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
  if (!match) return ENDUIT_LISSAGE_BUCKET_KG;
  const parsed = Number(match[1].replace(",", "."));
  return parsed > 0 ? parsed : ENDUIT_LISSAGE_BUCKET_KG;
}

/** Prix du seau résolu depuis l'unité et le prix unitaire enregistrés. */
export function enduitLissageBucketPrice(
  unit: unknown,
  unitPrice: unknown,
): number | null {
  const price = Number(unitPrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  const bucketKg = enduitLissageBucketKg(unit);
  const u = norm(unit);
  const packaging = /\b(seau|seaux|sac|sacs|pot|pots|bidon|bidons|bucket)\b/.test(u);
  // Prix exprimé au kilogramme : conversion explicite vers le seau. Un prix
  // supérieur à 10 TND/kg ne peut pas être un prix d'enduit au kg : c'est un
  // prix de seau mal étiqueté (anciennes estimations), on le conserve tel quel.
  if (!packaging && /\bkg\b/.test(u)) {
    return round2(price >= 10 ? price : price * bucketKg);
  }
  if (packaging) return round2(price);
  // Unité absente ou inconnue : un prix élevé est un prix de seau, un prix
  // faible un prix au kg. Aucun prix n'est inventé.
  return round2(price >= 10 ? price : price * bucketKg);
}

export interface EnduitLissageQuote {
  builtArea: number;
  surfaceM2: number;
  neededKg: number;
  bucketKg: number;
  buckets: number;
  purchasedKg: number;
  pricePerKg: number;
  pricePerBucket: number;
  total: number;
  /** Libellé du poste, avec la quantité physique et le nombre de seaux. */
  label: string;
  /** Détail du calcul (surface, couches, rendement, arrondi). */
  description: string;
  unit: string;
}

/**
 * Calcul complet du poste. `unit` / `unitPrice` proviennent de la ligne
 * existante : le prix du seau est déduit sans jamais multiplier des kg par un
 * prix de seau. Retourne `null` si aucun prix exploitable n'est disponible.
 */
export function computeEnduitLissageQuote(
  builtArea: number,
  unit: unknown,
  unitPrice: unknown,
  bucketPriceOverride?: number,
): EnduitLissageQuote | null {
  if (!Number.isFinite(builtArea) || builtArea <= 0) return null;
  const bucketKg = enduitLissageBucketKg(unit);
  const override =
    Number.isFinite(bucketPriceOverride) && (bucketPriceOverride as number) > 0
      ? round2(bucketPriceOverride as number)
      : null;
  const pricePerBucket = override ?? enduitLissageBucketPrice(unit, unitPrice);
  if (pricePerBucket == null) return null;

  const surfaceM2 = enduitLissageSurfaceM2(builtArea);
  const neededKg = enduitLissageNeededKg(builtArea);
  const buckets = enduitLissageBuckets(neededKg, bucketKg);
  if (buckets <= 0) return null;
  const purchasedKg = buckets * bucketKg;
  const total = round2(buckets * pricePerBucket);
  const seauLabel = buckets > 1 ? "seaux" : "seau";

  return {
    builtArea,
    surfaceM2,
    neededKg,
    bucketKg,
    buckets,
    purchasedKg,
    pricePerKg: round2(pricePerBucket / bucketKg),
    pricePerBucket,
    total,
    label: `Enduit de lissage (kg) — ${neededKg} kg / ${buckets} ${seauLabel} de ${bucketKg} kg`,
    description:
      `Murs + plafonds : ${surfaceM2} m² · ${ENDUIT_LISSAGE_COATS} couches · ` +
      `${ENDUIT_LISSAGE_KG_PER_M2_PER_COAT} kg/m²/couche = ${neededKg} kg. ` +
      `Achat en seaux de ${bucketKg} kg : ${buckets} ${seauLabel} ` +
      `(${purchasedKg} kg), arrondi supérieur.`,
    unit: `seau ${bucketKg} kg`,
  };
}

export interface EnduitBimItemLike {
  name?: string;
  unit?: string;
  unitPrice?: number;
  quantity?: number;
  totalPrice?: number;
}

/**
 * Corrige un poste matériau BIM. Les autres postes sont retournés tels quels ;
 * l'opération est idempotente (un poste déjà corrigé reste identique).
 */
export function correctEnduitLissageBimItem<T extends EnduitBimItemLike>(
  item: T,
  builtArea: number,
): T {
  if (!isEnduitLissageName(item?.name) || !(builtArea > 0)) return item;
  const quote = computeEnduitLissageQuote(builtArea, item.unit, item.unitPrice);
  if (!quote) return item;
  return {
    ...item,
    // Le libellé reste la référence catalogue (nom inchangé pour la base de
    // prix et la mise en relation) ; le détail kg/seaux est porté à part.
    name: "Enduit de lissage (kg)",
    unit: quote.unit,
    unitPrice: quote.pricePerBucket,
    quantity: quote.buckets,
    totalPrice: quote.total,
  };
}

/** Corrige tous les postes « Enduit de lissage » d'une liste BIM. */
export function correctEnduitLissageBimItems<T extends EnduitBimItemLike>(
  items: readonly T[] | null | undefined,
  builtArea: number,
): T[] {
  return (items ?? []).map((item) => correctEnduitLissageBimItem(item, builtArea));
}

export interface EnduitDqeLineLike {
  designation?: string;
  description?: string;
  sousLot?: string;
  nature?: string;
  unit?: string;
  unitPrice?: number;
  quantity?: number;
  total?: number;
  observations?: string;
  labor?: unknown;
}

/**
 * Corrige une ligne de DQE. La désignation reste le poste « Enduit de
 * lissage », la description expose le calcul et l'unité devient le seau.
 */
export function correctEnduitLissageDqeLine<T extends EnduitDqeLineLike>(
  line: T,
  builtArea: number,
  bucketPriceOverride?: number,
): T {
  if (!isEnduitLissageName(line?.designation) || !(builtArea > 0)) return line;
  const quote = computeEnduitLissageQuote(
    builtArea,
    line.unit,
    line.unitPrice,
    bucketPriceOverride,
  );
  if (!quote) return line;
  return {
    ...line,
    designation: "Enduit de lissage (kg)",
    description: quote.description,
    unit: quote.unit,
    quantity: quote.buckets,
    unitPrice: quote.pricePerBucket,
    total: quote.total,
  };
}

export interface EnduitDqeLotLike<TLine extends EnduitDqeLineLike = EnduitDqeLineLike> {
  lines?: readonly TLine[] | null;
  subtotal?: number;
}

/** Corrige les lignes d'enduit d'un lot DQE et recalcule son sous-total. */
export function correctEnduitLissageDqeLot<T extends EnduitDqeLotLike>(
  lot: T,
  builtArea: number,
  bucketPriceOverride?: number,
): T {
  if (!(builtArea > 0) || !lot?.lines?.length) return lot;
  let changed = false;
  const lines = lot.lines.map((line) => {
    const corrected = correctEnduitLissageDqeLine(
      line,
      builtArea,
      bucketPriceOverride,
    );
    if (corrected !== line) changed = true;
    return corrected;
  });
  if (!changed) return lot;
  return {
    ...lot,
    lines,
    subtotal: lines.reduce((sum, line) => sum + (Number(line.total) || 0), 0),
  };
}

/** Corrige les lots DQE contenant un poste d'enduit de lissage. */
export function correctEnduitLissageDqeLots<T extends EnduitDqeLotLike>(
  lots: readonly T[] | null | undefined,
  builtArea: number,
  bucketPriceOverride?: number,
): T[] {
  return (lots ?? []).map((lot) =>
    correctEnduitLissageDqeLot(lot, builtArea, bucketPriceOverride),
  );
}
