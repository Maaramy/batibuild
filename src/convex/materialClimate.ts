// ═══════════════════════════════════════════════════════════════════════════
// ZONES CLIMATIQUES DE LA TUNISIE (spécification §5-6)
// Module PUR (aucune dépendance Convex) : réutilisable côté serveur et client.
// Ne modifie aucune logique de calcul existante — fournit la donnée climatique
// de contexte (transparence, filtres futurs, explications IA).
// ═══════════════════════════════════════════════════════════════════════════

export type TunisiaRegion =
  | "TUNIS"
  | "ARIANA"
  | "BEN_AROUS"
  | "MANOUBA"
  | "NABEUL"
  | "ZAGHOUAN"
  | "BIZERTE"
  | "BEJA"
  | "JENDOUBA"
  | "LE_KEF"
  | "SILIANA"
  | "SOUSSE"
  | "MONASTIR"
  | "MAHDIA"
  | "SFAX"
  | "KAIROUAN"
  | "KASSERINE"
  | "SIDI_BOUZID"
  | "GAFSA"
  | "TOZEUR"
  | "KEBILI"
  | "GABES"
  | "MEDENINE"
  | "TATAOUINE";

export type ClimateZone = "NORTH_HUMID" | "COASTAL_HUMID" | "CENTRAL_SEMI_ARID" | "SOUTH_ARID" | "DESERT";

export const REGION_CLIMATE_MAP: Record<TunisiaRegion, ClimateZone> = {
  TUNIS: "COASTAL_HUMID",
  ARIANA: "COASTAL_HUMID",
  BEN_AROUS: "COASTAL_HUMID",
  MANOUBA: "COASTAL_HUMID",

  NABEUL: "COASTAL_HUMID",

  BIZERTE: "NORTH_HUMID",
  BEJA: "NORTH_HUMID",
  JENDOUBA: "NORTH_HUMID",
  LE_KEF: "NORTH_HUMID",

  ZAGHOUAN: "CENTRAL_SEMI_ARID",
  SILIANA: "CENTRAL_SEMI_ARID",

  SOUSSE: "COASTAL_HUMID",
  MONASTIR: "COASTAL_HUMID",
  MAHDIA: "COASTAL_HUMID",

  KAIROUAN: "CENTRAL_SEMI_ARID",
  KASSERINE: "CENTRAL_SEMI_ARID",
  SIDI_BOUZID: "CENTRAL_SEMI_ARID",

  SFAX: "COASTAL_HUMID",

  GAFSA: "SOUTH_ARID",

  TOZEUR: "DESERT",
  KEBILI: "DESERT",

  GABES: "SOUTH_ARID",
  MEDENINE: "SOUTH_ARID",
  TATAOUINE: "DESERT",
};

export const CLIMATE_ZONE_LABELS: Record<ClimateZone, string> = {
  NORTH_HUMID: "Nord humide",
  COASTAL_HUMID: "Littoral humide",
  CENTRAL_SEMI_ARID: "Centre semi-aride",
  SOUTH_ARID: "Sud aride",
  DESERT: "Désert",
};

const ALL_REGIONS = Object.keys(REGION_CLIMATE_MAP) as TunisiaRegion[];

/** Normalise un libellé de gouvernorat libre (« ben arous », « Ben Arous », « sousse »…). */
function normalizeRegion(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents (é→e, è→e…)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Lève l'ambiguïté des libellés libres vers la liste officielle (le + long d'abord). */
export function regionKey(input?: string | null): TunisiaRegion | null {
  if (!input) return null;
  const n = normalizeRegion(input);
  if (!n) return null;
  // Correspondance exacte d'abord
  const exact = ALL_REGIONS.find((r) => normalizeRegion(r) === n);
  if (exact) return exact;
  // Ensuite : inclusion (« sidi bouzid test » → SIDI_BOUZID), le plus long gagne
  let best: { key: TunisiaRegion; len: number } | null = null;
  for (const r of ALL_REGIONS) {
    const rn = normalizeRegion(r);
    if (n.includes(rn) && (!best || rn.length > best.len)) best = { key: r, len: rn.length };
  }
  return best?.key ?? null;
}

/** Zone climatique du gouvernorat (null si inconnue — jamais inventée). */
export function climateForRegion(region?: string | null): ClimateZone | null {
  const key = regionKey(region);
  return key ? REGION_CLIMATE_MAP[key] : null;
}

export function climateInfoForRegion(region?: string | null): { zone: ClimateZone; label: string } | null {
  const zone = climateForRegion(region);
  return zone ? { zone, label: CLIMATE_ZONE_LABELS[zone] } : null;
}