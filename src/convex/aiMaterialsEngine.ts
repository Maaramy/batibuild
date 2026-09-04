// ═══════════════════════════════════════════════════════════════════════════
// AI MATERIALS COPILOT — Moteur d'analyse (pur, sans dépendance Convex)
// « Quel est le meilleur matériau pour mon projet, selon mon budget, ma
//   localisation, mes exigences techniques et les conditions du marché ? »
//
// Règles de fiabilité (section 19) :
//  - N'invente jamais un prix : toutes les valeurs proviennent de la base
//    (materialPrices + materialOffers) ou d'hypothèses explicites datées.
//  - Les données manquantes sont signalées, jamais comblées par une invention.
//  - Les recommandations sont des aides à la décision, pas des validations
//    d'ingénieur/architecte.
// ═══════════════════════════════════════════════════════════════════════════

export type StandingLevel = "economique" | "standard" | "bon_standing" | "premium" | "luxe";
export type BudgetMode = "limite" | "economique" | "moyen" | "confortable" | "premium" | "personnalise";
export type Profile = "economique" | "equilibre" | "premium";
export type PriorityKey = "price" | "quality" | "isolation" | "durability" | "eco";

// ── Pondération dynamique 100 points (§ priorités utilisateur) ──
// Par défaut : Prix 50 / Qualité 50. L'utilisateur peut répartir
// les 100 points sur 5 axes : prix, qualité, disponibilité, empreinte carbone, délai.
export type UserPriorities = {
  price: number;        // 0-100 (défaut 50)
  quality: number;      // 0-100 (défaut 50)
  availability: number; // 0-100 (défaut 0, optionnel)
  carbonFootprint: number; // 0-100 (défaut 0, optionnel)
  deliveryDelay: number;   // 0-100 (défaut 0, optionnel)
};

/** Crée les pondérations par défaut (50/50 prix-qualité, le reste à 0). */
export function defaultUserPriorities(): UserPriorities {
  return { price: 50, quality: 50, availability: 0, carbonFootprint: 0, deliveryDelay: 0 };
}

/** Normalise les priorités pour qu'elles totalisent exactement 100. */
export function normalizePriorities(p: Partial<UserPriorities>): UserPriorities {
  const raw = { ...defaultUserPriorities(), ...p };
  const total = raw.price + raw.quality + raw.availability + raw.carbonFootprint + raw.deliveryDelay;
  if (total <= 0) return defaultUserPriorities();
  return {
    price: Math.round((raw.price / total) * 100),
    quality: Math.round((raw.quality / total) * 100),
    availability: Math.round((raw.availability / total) * 100),
    carbonFootprint: Math.round((raw.carbonFootprint / total) * 100),
    deliveryDelay: Math.round((raw.deliveryDelay / total) * 100),
  };
}

export type ProjectContext = {
  projectName?: string;
  projectCategory?: string; // maison, villa, appartement…
  region?: string;
  /** Zone climatique déduite du gouvernorat (§5-6) — donnée de contexte, n'influence pas les prix. */
  climateZone?: string;
  city?: string;
  quarter?: string;
  surface: number; // m² construits
  floors: number;
  year?: number;
  standing?: StandingLevel;
  budgetMode?: BudgetMode;
  budgetAmount?: number; // TND (personnalisé)
  priorities?: Record<PriorityKey, number>; // 0-100
  rooms?: { bathrooms?: number; kitchens?: number; bedrooms?: number };
  terrainSurface?: number; // m² du terrain
};

export type CatalogMaterial = {
  _id: string;
  name: string;
  category: string;
  subcategory?: string;
  unit: string;
  unitPrice: number;
  currency?: string;
  lastUpdated?: number;
  priceQuality?: string;
  confidenceIndex?: number;
  minPrice?: number;
  avgPrice?: number;
  maxPrice?: number;
  availability?: string;
  brand?: string;
  manufacturer?: string;
};

export type Offer = {
  productId: string;
  name: string;
  unit: string;
  minPrice: number;
  avgPrice: number;
  maxPrice: number;
  supplier: string;
  governorate?: string;
  reliabilityIndex?: number;
  availability?: string;
};

export type SupplierProfile = {
  _id: string;
  companyName: string;
  phone?: string;
  address?: string;
  website?: string;
  specialties?: string[];
  regions?: string[];
  isVisible?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE DES CATÉGORIES DU COPILOT (33 catégories — spécification §3)
// ─────────────────────────────────────────────────────────────────────────────
export type CopilotCategory = {
  id: string;
  label: string;
  /** Catégories officielles 2026 de la base des prix */
  catalogCategories: string[];
  /** Mots-clés de repli sur le libellé du matériau */
  keywords: string[];
  /** Part de main-d'œuvre (% du coût matériau) */
  posePct: number;
  /** Icône lucide (résolue côté client) */
  icon: string;
};

export const COPILOT_CATEGORIES: CopilotCategory[] = [
  { id: "beton", label: "Béton", catalogCategories: ["betons_prefabrication", "beton"], keywords: ["beton", "prefabrique", "dalle"], posePct: 0.35, icon: "Layers" },
  { id: "ciment", label: "Ciment", catalogCategories: ["liants_ciments_mortiers", "ciment"], keywords: ["ciment"], posePct: 0.25, icon: "Package" },
  { id: "acier", label: "Acier", catalogCategories: ["acier_metaux_structure", "acier"], keywords: ["acier", "fer", "treillis", "barre", "poutrelle"], posePct: 0.3, icon: "Magnet" },
  { id: "briques", label: "Briques", catalogCategories: ["maconnerie_plancher", "briques"], keywords: ["brique", "hourdis", "entrevous"], posePct: 0.35, icon: "Grid3x3" },
  { id: "blocs_beton", label: "Blocs béton", catalogCategories: ["maconnerie_plancher", "betons_prefabrication", "parpaings", "blocs"], keywords: ["bloc", "parpaing"], posePct: 0.35, icon: "Boxes" },
  { id: "isolation_thermique", label: "Isolation thermique", catalogCategories: ["isolation_thermique", "isolation"], keywords: ["isolation", "laine", "polystyrene", "xps", "perlite", "thermique"], posePct: 0.3, icon: "Thermometer" },
  { id: "isolation_acoustique", label: "Isolation acoustique", catalogCategories: ["isolation_thermique", "cloisons_platre_plafonds", "isolation"], keywords: ["acoustique", "phonique", "laine", "panneau acoustique"], posePct: 0.3, icon: "Volume2" },
  { id: "etancheite", label: "Étanchéité", catalogCategories: ["etancheite_protection", "etancheite", "toitures_bardages_facades"], keywords: ["etanche", "membrane", "bitumineuse", "hydrofuge"], posePct: 0.3, icon: "Droplets" },
  { id: "mortier", label: "Mortier", catalogCategories: ["liants_ciments_mortiers"], keywords: ["mortier", "liant", "adjuvant"], posePct: 0.3, icon: "Container" },
  { id: "enduit", label: "Enduit", catalogCategories: ["peintures_enduits_finitions", "liants_ciments_mortiers"], keywords: ["enduit", "crepis", "lissage"], posePct: 0.35, icon: "PaintRoller" },
  { id: "carrelage", label: "Carrelage", catalogCategories: ["revetements_sols_murs", "carrelage"], keywords: ["carrelage", "gres", "cerame", "plinthe", "sol"], posePct: 0.3, icon: "LayoutGrid" },
  { id: "faience", label: "Faïence", catalogCategories: ["revetements_sols_murs", "faience"], keywords: ["faience", "mural"], posePct: 0.3, icon: "SquareStack" },
  { id: "pierre_naturelle", label: "Pierre naturelle", catalogCategories: ["revetements_sols_murs", "pierre_naturelle"], keywords: ["pierre", "travertin", "naturelle"], posePct: 0.35, icon: "Mountain" },
  { id: "marbre", label: "Marbre", catalogCategories: ["revetements_sols_murs", "marbre"], keywords: ["marbre", "granit"], posePct: 0.35, icon: "Gem" },
  { id: "peinture", label: "Peinture", catalogCategories: ["peintures_enduits_finitions", "peinture"], keywords: ["peinture", "acrylique", "laque", "vernis", "hydrofuge"], posePct: 0.3, icon: "Brush" },
  { id: "bois", label: "Bois", catalogCategories: ["bois_panneaux_coffrage", "bois", "menuiseries"], keywords: ["bois", "chevron", "madrier", "contreplaque", "charpente", "parquet", "coffrage"], posePct: 0.3, icon: "Trees" },
  { id: "aluminium", label: "Aluminium", catalogCategories: ["menuiseries", "menuiserie_aluminium"], keywords: ["aluminium", "alu"], posePct: 0.25, icon: "Minimize" },
  { id: "pvc", label: "PVC", catalogCategories: ["menuiseries", "menuiserie_pvc"], keywords: ["pvc", "double vitrage"], posePct: 0.25, icon: "Rows" },
  { id: "verre", label: "Verre", catalogCategories: ["vitrage_verriers"], keywords: ["vitrage"], posePct: 0.25, icon: "ScanLine" },
  { id: "menuiserie", label: "Menuiserie", catalogCategories: ["menuiseries", "bois_panneaux_coffrage"], keywords: ["menuiserie", "fenetre", "volet", "porte"], posePct: 0.25, icon: "DoorOpen" },
  { id: "portes", label: "Portes", catalogCategories: ["menuiseries", "portes"], keywords: ["porte", "portail"], posePct: 0.25, icon: "DoorClosed" },
  { id: "revetements_sol", label: "Revêtements de sol", catalogCategories: ["revetements_sols_murs", "revetements", "amenagements_exterieurs"], keywords: ["revetement", "sol", "parquet", "pave", "stratifie"], posePct: 0.3, icon: "Grid2x2" },
  { id: "sanitaires", label: "Sanitaires", catalogCategories: ["equipements"], keywords: ["wc", "lavabo", "sanitaire", "douche", "baignoire"], posePct: 0.25, icon: "ShowerHead" },
  { id: "robinetterie", label: "Robinetterie", catalogCategories: ["equipements"], keywords: ["robinet", "mitigeur", "robinetterie"], posePct: 0.25, icon: "Wrench" },
  { id: "electricite", label: "Électricité", catalogCategories: ["equipements", "eclairage", "electricite"], keywords: ["cable", "disjoncteur", "tableau", "prise", "electrique", "led", "spot", "luminaire"], posePct: 0.4, icon: "Zap" },
  { id: "plomberie", label: "Plomberie", catalogCategories: ["equipements", "plomberie"], keywords: ["tube", "pvc evacuation", "raccord", "tuyau", "plomberie"], posePct: 0.4, icon: "Pipette" },
  { id: "chauffage", label: "Chauffage", catalogCategories: ["cvc_chauffage_ventilation", "chauffage"], keywords: ["chauffe-eau", "geyser", "chauffage", "radiateur", "chaudiere"], posePct: 0.3, icon: "Flame" },
  { id: "climatisation", label: "Climatisation", catalogCategories: ["cvc_chauffage_ventilation", "climatisation"], keywords: ["climatiseur", "split", "climatisation"], posePct: 0.3, icon: "AirVent" },
  { id: "equipements_energetiques", label: "Équipements énergétiques", catalogCategories: ["energies_renouvelables"], keywords: ["onduleur", "batterie", "energie", "solaire", "photovoltaique"], posePct: 0.2, icon: "BatteryCharging" },
  { id: "panneaux_solaires", label: "Panneaux solaires", catalogCategories: ["energies_renouvelables"], keywords: ["solaire", "photovoltaique"], posePct: 0.2, icon: "Sun" },
  { id: "piscine", label: "Matériaux pour piscine", catalogCategories: ["amenagements_exterieurs", "piscines"], keywords: ["piscine", "liner", "mosaique", "revêtement piscine"], posePct: 0.3, icon: "Waves" },
  { id: "amenagement_exterieur", label: "Aménagement extérieur", catalogCategories: ["amenagements_exterieurs", "amenagement_exterieur", "jardins"], keywords: ["cloture", "pave", "gazon", "jardin", "grillage", "pavois", "autobloquant"], posePct: 0.3, icon: "TreePine" },
  { id: "autres", label: "Autres", catalogCategories: ["divers", "quincaillerie_fixations", "chimie_construction", "securite_incendie_surete", "voirie_reseaux_drainage", "materiaux_durables_biosources"], keywords: [], posePct: 0.3, icon: "Box" },
];

export const COPILOT_CATEGORY_BY_ID: Record<string, CopilotCategory> = Object.fromEntries(
  COPILOT_CATEGORIES.map((c) => [c.id, c]),
);

export const STANDING_LEVELS: { id: StandingLevel; label: string; factor: number; hint: string }[] = [
  { id: "economique", label: "Économique", factor: 0.85, hint: "Matériaux de base, finitions simples" },
  { id: "standard", label: "Standard", factor: 1.0, hint: "Bon compromis courant" },
  { id: "bon_standing", label: "Bon standing", factor: 1.2, hint: "Matériaux de qualité supérieure" },
  { id: "premium", label: "Premium", factor: 1.45, hint: "Finitions haut de gamme" },
  { id: "luxe", label: "Luxe", factor: 1.8, hint: "Matériaux d'exception" },
];

export const BUDGET_MODES: { id: BudgetMode; label: string; hint: string }[] = [
  { id: "limite", label: "Budget limité", hint: "Priorité absolue au coût minimal" },
  { id: "economique", label: "Budget économique", hint: "Minimiser le coût sans sacrifier l'essentiel" },
  { id: "moyen", label: "Budget moyen", hint: "Équilibre prix / qualité" },
  { id: "confortable", label: "Budget confortable", hint: "Qualité et confort privilégiés" },
  { id: "premium", label: "Budget premium", hint: "Haut de gamme sans limite de coût" },
  { id: "personnalise", label: "Budget personnalisé (TND)", hint: "L'IA recherche la meilleure combinaison dans votre enveloppe" },
];

// ─────────────────────────────────────────────────────────────────────────────
// OUTILS
// ─────────────────────────────────────────────────────────────────────────────
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const round0 = (n: number) => Math.round(n);

/** Normalise un libellé pour la comparaison. */
export const normOffer = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const hasAnyKw = (name: string, tokens: string[]) => {
  const n = normOffer(name);
  return tokens.length > 0 && tokens.some((t) => n.includes(normOffer(t)));
};

/** Correspondance catégorie copilot → matériaux du catalogue (catégorie officielle OU mot-clé). */
export function matchCategoryMaterials(cat: CopilotCategory, materials: CatalogMaterial[]): CatalogMaterial[] {
  const out: CatalogMaterial[] = [];
  const seen = new Set<string>();
  for (const m of materials) {
    if (seen.has(m._id)) continue;
    const catMatch = cat.catalogCategories.includes(m.category);
    const kwMatch = hasAnyKw(m.name, cat.keywords);
    if (catMatch || kwMatch) {
      out.push(m);
      seen.add(m._id);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTIMATION DES QUANTITÉS (hypothèses explicites, marché tunisien)
// ─────────────────────────────────────────────────────────────────────────────
export type QuantityEstimate = { quantity: number; unitLabel: string };

export function estimateQuantity(categoryId: string, ctx: ProjectContext): QuantityEstimate {
  const S = Math.max(0, ctx.surface || 0);
  const floors = Math.max(1, ctx.floors || 1);
  const built = S * floors;
  const rooms = ctx.rooms || {};
  const bathrooms = rooms.bathrooms ?? Math.max(1, Math.round(built / 60));
  const kitchens = rooms.kitchens ?? 1;
  const sanitaires = bathrooms + kitchens;
  const terrain = ctx.terrainSurface ?? Math.max(built, S);

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

// ─────────────────────────────────────────────────────────────────────────────
// SCORES TECHNIQUES (0-100) — mots-clés + catégorie + données de la base
// ─────────────────────────────────────────────────────────────────────────────
const hasKw = (name: string, kws: string[]) => hasAnyKw(name, kws);

function priceScore(price: number, min: number, max: number): number {
  if (max <= min) return 70; // pas de tension de prix → score neutre-élevé
  return round0(clamp((100 * (max - price)) / (max - min), 0, 100));
}

function qualityScore(m: CatalogMaterial, offers: Offer[]): number {
  const conf = (m.confidenceIndex ?? 0.5) * 100;
  const rel = offers.length
    ? offers.reduce((s, o) => s + (o.reliabilityIndex ?? 0.7), 0) / offers.length * 100
    : 0;
  const qBonus = m.priceQuality === "observé_en_ligne" ? 6 : m.priceQuality === "publication_2026" ? 4 : 0;
  const brand = m.brand ? 4 : 0;
  return round0(clamp(52 + conf * 0.22 + rel * 0.18 + qBonus + brand, 0, 100));
}

function thermalScore(m: CatalogMaterial, cat: CopilotCategory): number {
  let base: number;
  switch (cat.id) {
    case "isolation_thermique": base = 85; break;
    case "isolation_acoustique": base = 40; break;
    case "etancheite": base = 35; break;
    case "briques": base = 55; break;
    case "blocs_beton": base = 45; break;
    case "bois": base = 58; break;
    case "beton": base = 40; break;
    case "aluminium": base = 55; break;
    case "pvc": base = 60; break;
    case "verre": base = 55; break;
    case "equipements_energetiques":
    case "panneaux_solaires": base = 65; break;
    default: base = 30;
  }
  const n = m.name;
  if (hasKw(n, ["polystyrene", "xps", "perlite"])) base += 18;
  if (hasKw(n, ["laine"])) base += 12;
  if (hasKw(n, ["double vitrage"])) base += 22;
  if (hasKw(n, ["isolation", "isolant", "thermique"])) base += 15;
  if (hasKw(n, ["climatiseur", "split"])) base += 5;
  return round0(clamp(base, 0, 100));
}

function acousticScore(m: CatalogMaterial, cat: CopilotCategory): number {
  let base: number;
  switch (cat.id) {
    case "isolation_acoustique": base = 85; break;
    case "briques": base = 55; break;
    case "blocs_beton": base = 50; break;
    case "cloisons_platre_plafonds": base = 60; break;
    case "menuiserie":
    case "pvc":
    case "aluminium":
    case "verre": base = 55; break;
    case "beton": base = 45; break;
    default: base = 30;
  }
  const n = m.name;
  if (hasKw(n, ["acoustique", "phonique"])) base += 25;
  if (hasKw(n, ["laine"])) base += 12;
  if (hasKw(n, ["double vitrage"])) base += 15;
  return round0(clamp(base, 0, 100));
}

function resistanceScore(m: CatalogMaterial, cat: CopilotCategory): number {
  let base: number;
  switch (cat.id) {
    case "beton": base = 88; break;
    case "acier": base = 90; break;
    case "blocs_beton": base = 80; break;
    case "briques": base = 72; break;
    case "pierre_naturelle": base = 82; break;
    case "marbre": base = 62; break;
    case "verre": base = 58; break;
    case "etancheite": base = 65; break;
    case "bois": base = 60; break;
    default: base = 58;
  }
  return round0(clamp(base + (m.confidenceIndex ?? 0.5) * 8, 0, 100));
}

function durabilityScore(m: CatalogMaterial): number {
  const n = m.name;
  let s = 60;
  if (hasKw(n, ["inox"])) s += 15;
  if (hasKw(n, ["galvanise"])) s += 12;
  if (hasKw(n, ["epdm", "tpo"])) s += 18;
  if (hasKw(n, ["pvc"])) s += 6;
  if (hasKw(n, ["bitumineuse", "membrane"])) s += 8;
  if (hasKw(n, ["importe"])) s -= 6;
  if (m.priceQuality === "observé_en_ligne") s += 4;
  return round0(clamp(s, 0, 100));
}

function maintenanceScore(m: CatalogMaterial, cat: CopilotCategory): number {
  let base: number;
  switch (cat.id) {
    case "peinture": base = 58; break;
    case "bois": base = 48; break;
    case "marbre": base = 55; break;
    case "pierre_naturelle": base = 60; break;
    case "aluminium": base = 80; break;
    case "pvc": base = 85; break;
    case "verre": base = 78; break;
    case "carrelage": base = 85; break;
    case "faience": base = 82; break;
    case "revetements_sol": base = 78; break;
    case "beton": base = 86; break;
    case "acier": base = 72; break;
    case "etancheite": base = 68; break;
    case "isolation_thermique":
    case "isolation_acoustique": base = 72; break;
    case "climatisation":
    case "chauffage":
    case "equipements_energetiques":
    case "panneaux_solaires": base = 62; break;
    default: base = 70;
  }
  return round0(clamp(base + (m.confidenceIndex ?? 0.5) * 6, 0, 100));
}

function availabilityScore(m: CatalogMaterial, offers: Offer[]): number {
  const avail = m.availability;
  let s = avail === "disponible" ? 100 : avail === "sur_commande" ? 55 : avail === "rupture" ? 15 : 70;
  s += Math.min(20, offers.length * 5);
  if (offers.length) {
    const rel = offers.reduce((a, o) => a + (o.reliabilityIndex ?? 0.7), 0) / offers.length;
    s += rel * 10;
  }
  return round0(clamp(s, 0, 100));
}

function ecoScore(m: CatalogMaterial, cat: CopilotCategory): number {
  const n = m.name;
  let s = 35;
  if (hasKw(n, ["biosource", "chanvre", "liege", "ouate"])) s += 30;
  if (hasKw(n, ["recycle", "recyclable"])) s += 25;
  if (hasKw(n, ["bois", "sapin", "chene"])) s += 18;
  if (hasKw(n, ["pierre", "terre", "argile"])) s += 15;
  if (hasKw(n, ["local", "tunisie"])) s += 10;
  if (hasKw(n, ["importe"])) s -= 12;
  if (cat.id === "equipements_energetiques" || cat.id === "panneaux_solaires") s += 30;
  return round0(clamp(s, 0, 100));
}

export type MaterialScores = {
  prix: number;
  qualite: number;
  durabilite: number;
  isolationThermique: number;
  isolationAcoustique: number;
  resistance: number;
  entretien: number;
  disponibilite: number;
  impactEnvironnemental: number;
  noteGlobale: number;
};

// Poids de base par profil (somme = 1)
const BASE_WEIGHTS: Record<Profile, Record<string, number>> = {
  economique: { prix: 0.45, qualite: 0.1, durabilite: 0.08, isoT: 0.07, isoA: 0.04, resistance: 0.08, entretien: 0.06, dispo: 0.12, eco: 0 },
  equilibre: { prix: 0.3, qualite: 0.15, durabilite: 0.1, isoT: 0.12, isoA: 0.08, resistance: 0.1, entretien: 0.05, dispo: 0.06, eco: 0.04 },
  premium: { prix: 0.05, qualite: 0.2, durabilite: 0.15, isoT: 0.18, isoA: 0.15, resistance: 0.12, entretien: 0.05, dispo: 0.05, eco: 0.05 },
};

function weightsFor(profile: Profile, ctx: ProjectContext, budgetMode: BudgetMode): Record<string, number> {
  const w = { ...BASE_WEIGHTS[profile] };
  const p = ctx.priorities || { price: 50, quality: 50, isolation: 50, durability: 50, eco: 50 };
  const pri = (k: PriorityKey) => clamp((p[k] ?? 50) / 50, 0.2, 2);

  w.prix *= pri("price");
  w.qualite *= pri("quality");
  w.resistance *= pri("quality");
  w.durabilite *= pri("durability");
  w.isoT *= pri("isolation");
  w.isoA *= pri("isolation");
  w.eco *= pri("eco");

  // Impact du mode budgétaire sur le poids du prix / de la qualité
  if (budgetMode === "limite") w.prix *= 1.7;
  else if (budgetMode === "economique") w.prix *= 1.35;
  else if (budgetMode === "confortable") { w.qualite *= 1.25; w.isoT *= 1.15; w.durabilite *= 1.1; }
  else if (budgetMode === "premium") { w.qualite *= 1.5; w.durabilite *= 1.35; w.isoT *= 1.3; w.isoA *= 1.2; }
  else if (budgetMode === "personnalise") w.prix *= 1.2;

  // Standing : le standing élevé réduit le poids du prix
  const standingFactor: Record<StandingLevel, number> = {
    economique: 1.5, standard: 1.2, bon_standing: 1.0, premium: 0.75, luxe: 0.5,
  };
  w.prix *= standingFactor[ctx.standing || "standard"];

  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w)) w[k] = w[k] / sum;
  return w;
}

export type PriceBand = { min: number; avg: number; max: number };

function priceBandFor(m: CatalogMaterial, offers: Offer[]): PriceBand {
  if (offers.length > 0) {
    const mins = offers.map((o) => o.minPrice);
    const avgs = offers.map((o) => o.avgPrice);
    const maxs = offers.map((o) => o.maxPrice);
    return {
      min: Math.min(...mins),
      avg: avgs.reduce((a, b) => a + b, 0) / avgs.length,
      max: Math.max(...maxs),
    };
  }
  return {
    min: round2(m.unitPrice * 0.95),
    avg: m.unitPrice,
    max: round2(m.unitPrice * 1.1),
  };
}

function bestOffersFor(m: CatalogMaterial, offers: Offer[]): Offer[] {
  return offers
    .filter((o) => o.productId === m._id)
    .sort((a, b) => a.minPrice - b.minPrice || (b.reliabilityIndex ?? 0) - (a.reliabilityIndex ?? 0))
    .slice(0, 4);
}

export function scoreMaterial(
  m: CatalogMaterial,
  offers: Offer[],
  cat: CopilotCategory,
  profile: Profile,
  ctx: ProjectContext,
  catMinPrice: number,
  catMaxPrice: number,
  budgetCap?: number,
): { scores: MaterialScores; band: PriceBand; suppliers: Offer[] } | null {
  const band = priceBandFor(m, offers);
  if (band.avg <= 0) return null;
  if (budgetCap && band.avg > budgetCap) return null;

  const prices = {
    prix: priceScore(band.avg, catMinPrice, catMaxPrice),
    qualite: qualityScore(m, offers),
    durabilite: durabilityScore(m),
    isolationThermique: thermalScore(m, cat),
    isolationAcoustique: acousticScore(m, cat),
    resistance: resistanceScore(m, cat),
    entretien: maintenanceScore(m, cat),
    disponibilite: availabilityScore(m, offers),
    impactEnvironnemental: ecoScore(m, cat),
    noteGlobale: 0,
  };
  const w = weightsFor(profile, ctx, ctx.budgetMode ?? "moyen");
  prices.noteGlobale = round0(
    prices.prix * w.prix +
      prices.qualite * w.qualite +
      prices.durabilite * w.durabilite +
      prices.isolationThermique * w.isoT +
      prices.isolationAcoustique * w.isoA +
      prices.resistance * w.resistance +
      prices.entretien * w.entretien +
      prices.disponibilite * w.dispo +
      prices.impactEnvironnemental * w.eco,
  );
  return { scores: prices, band, suppliers: bestOffersFor(m, offers) };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROS / CONS
// ─────────────────────────────────────────────────────────────────────────────
function prosCons(scores: MaterialScores, band: PriceBand, _cat: CopilotCategory, catAvg: number): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];
  if (scores.prix >= 75) pros.push("Prix compétitif dans sa catégorie");
  if (band.avg <= catAvg) pros.push("Coût estimatif sous la moyenne de la catégorie");
  if (scores.qualite >= 75) pros.push("Données de qualité fiable (relevé/confiance élevée)");
  if (scores.isolationThermique >= 75) pros.push("Excellente performance thermique (climat tunisien)");
  if (scores.isolationAcoustique >= 75) pros.push("Bonne isolation acoustique");
  if (scores.resistance >= 80) pros.push("Résistance mécanique élevée");
  if (scores.durabilite >= 75) pros.push("Très bonne durabilité, entretien espacé");
  if (scores.disponibilite >= 80) pros.push("Large disponibilité sur le marché tunisien");
  if (scores.impactEnvironnemental >= 65) pros.push("Impact environnemental favorable");
  if (pros.length === 0) pros.push("Solution de compromis acceptable");

  if (scores.prix < 40) cons.push("Coût unitaire élevé par rapport aux alternatives");
  if (scores.isolationThermique < 40) cons.push("Performance thermique limitée (penser à l'isolation complémentaire)");
  if (scores.isolationAcoustique < 40) cons.push("Isolation acoustique limitée");
  if (scores.entretien < 50) cons.push("Entretien régulier nécessaire");
  if (scores.disponibilite < 50) cons.push("Disponibilité limitée — vérifier le stock / délais");
  if (scores.impactEnvironnemental < 40) cons.push("Impact environnemental à considérer");
  if (cons.length === 0) cons.push("Aucun point faible majeur détecté pour ce profil");
  return { pros, cons };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE DE RÉSULTAT
// ─────────────────────────────────────────────────────────────────────────────
export type Solution = {
  profile: Profile;
  profileLabel: string;
  material: {
    id: string;
    name: string;
    unit: string;
    brand?: string;
    priceQuality?: string;
    availability?: string;
    band: PriceBand;
    quantity: number;
    quantityUnit: string;
    materialCost: number; // TND (probable)
    poseCost: number;
    transportCost: number;
    wasteCost: number;
    accessoriesCost: number;
    contingencyCost: number; // imprévus / contingence
    tva: number;
    totalCost: number;
  };
  scores: MaterialScores;
  /** Note qualité sur 10 (arrondi). */
  qualityScore10: number;
  /** Score de recommandation global calculé selon les pondérations applicables (0-100). */
  recommendationScore: number;
  /** Justification technique résumée du choix pour ce mode. */
  justification: string;
  pros: string[];
  cons: string[];
  suppliers: { name: string; price: number; unit: string; governorate?: string; reliabilityIndex?: number; availability?: string }[];
};

export type BestSupplier = {
  name: string;
  price: number; // TND (prix minimum constaté)
  unit: string;
  governorate?: string;
  reliabilityIndex?: number;
  availability?: string;
};

export type CategoryResult = {
  categoryId: string;
  label: string;
  icon: string;
  candidatesCount: number;
  coverage: boolean; // true si au moins une offre/prix recensé
  solutions: Solution[];
  /** Top 5 des articles les plus pertinents pour le projet (spéc. §30-31) — classement déterministe. */
  topArticles: TopArticle[];
  bestValue: Profile; // meilleur rapport qualité/prix
  /** Meilleur fournisseur de la catégorie : offre la moins chère (fiabilité en cas d'égalité) pour la solution recommandée. */
  bestSupplier: BestSupplier | null;
};

/** Article du « Top 5 » d'une catégorie — données réelles du projet, jamais inventées. */
export type TopArticle = {
  rank: number; // 1..5
  id: string;
  name: string;
  brand?: string;
  unit: string;
  /** Prix de marché le plus fiable disponible (moyenne offre fournisseur sinon prix catalogue). */
  unitPrice: number;
  /** Source du prix (libellé FR) : Fournisseur / Marché 2026 / Estimation… */
  priceSource: string;
  /** Indice de confiance du prix (0-100). */
  confidence: number;
  /** Quantité sélectionnée pour le projet dans cette catégorie. */
  quantity: number;
  quantityUnit: string;
  /** Prix TTC = prix unitaire × quantité × (1 + TVA) — même formule que la grille de prix. */
  totalTTC: number;
  /** Score de pertinence (profil équilibré, mêmes pondérations que les solutions). */
  score: number;
  /** Fournisseurs recensés pour l'article. */
  suppliers: { name: string; price: number; unit: string; governorate?: string; reliabilityIndex?: number }[];
};

export type CostSummary = {
  materials: number;
  pose: number;
  transport: number;
  waste: number;
  accessories: number;
  contingency: number; // imprévus
  tva: number;
  total: number;
  min: number;
  max: number;
  perM2: number;
  currency: string;
  priceDate: number;
};

export type RecommendResult = {
  generatedAt: number;
  context: ProjectContext;
  categories: CategoryResult[];
  recommendation: {
    solution: Profile;
    score: number;
    materialName: string;
    categoryLabel: string;
    explanation: string;
    advantages: string[];
    limits: string[];
  };
  cost: CostSummary;
  missingData: string[]; // données non disponibles (signalées, jamais inventées)
};

const PROFILE_LABEL: Record<Profile, string> = {
  economique: "Économique",
  equilibre: "Équilibrée",
  premium: "Premium",
};

const TVA = 0.19;
const TRANSPORT_PCT = 0.035;  // 3,5 % du coût matériaux (marché tunisien — transport local)
const WASTE_PCT = 0.07;        // 7 % pertes & déchets chantier
const ACCESSORIES_PCT = 0.05;  // 5 % quincaillerie, visserie, consommables
const CONTINGENCY_PCT = 0.05;  // 5 % imprévus / contingence

// ─────────────────────────────────────────────────────────────────────────────
// JUSTIFICATION TECHNIQUE PAR MODE
// ─────────────────────────────────────────────────────────────────────────────
type Pick = { m: CatalogMaterial; s: MaterialScores; band: PriceBand; suppliers: Offer[]; note: number };

function buildJustification(profile: Profile, best: Pick, cat: CopilotCategory): string {
  const m = best.m;
  const s = best.s;
  const band = best.band;
  const parts: string[] = [];

  switch (profile) {
    case "economique":
      parts.push(`Ce matériau a été retenu pour son coût unitaire minimal dans la catégorie « ${cat.label} ».`);
      if (s.prix >= 70) parts.push(`Son score prix (${s.prix}/100) reflète une position tarifaire très compétitive (${band.avg.toFixed(2)} TND/${m.unit}).`);
      if (s.qualite >= 50) parts.push(`La qualité reste suffisante (note ${s.qualite}/100) pour une utilisation conforme aux normes courantes.`);
      if (s.disponibilite >= 60) parts.push(`Disponibilité confirmée sur le marché tunisien, ce qui réduit les délais d'approvisionnement.`);
      if (m.brand) parts.push(`Marque ${m.brand} — standard reconnu.`);
      parts.push(`Pondérations appliquées : prix prioritaire, qualité en second.`);
      break;

    case "equilibre":
      parts.push(`Ce matériau offre le meilleur rapport qualité/prix dans la catégorie « ${cat.label} ».`);
      parts.push(`Prix moyen ${band.avg.toFixed(2)} TND/${m.unit} avec un score qualité de ${s.qualite}/100.`);
      if (s.isolationThermique >= 60) parts.push(`Performance thermique correcte (${s.isolationThermique}/100), adaptée au climat tunisien.`);
      if (s.resistance >= 70) parts.push(`Résistance mécanique satisfaisante (${s.resistance}/100) pour les contraintes structurelles.`);
      if (s.durabilite >= 65) parts.push(`Durabilité estimée à ${s.durabilite}/100, assurant un bon rapport longévité/coût.`);
      parts.push(`Pondérations équilibrées entre prix (50%) et qualité (50%).`);
      break;

    case "premium":
      parts.push(`Ce matériau a été sélectionné pour ses performances supérieures dans la catégorie « ${cat.label} ».`);
      if (s.qualite >= 75) parts.push(`Qualité élevée (${s.qualite}/100) garantissant une durabilité et un confort optimaux.`);
      if (s.isolationThermique >= 70) parts.push(`Excellente isolation thermique (${s.isolationThermique}/100), réduisant significativement les besoins en climatisation.`);
      if (s.durabilite >= 75) parts.push(`Durabilité premium (${s.durabilite}/100), réduisant les coûts de maintenance à long terme.`);
      if (m.brand) parts.push(`Fabricant ${m.brand} — gamme haut de gamme.`);
      if (band.avg > 0) parts.push(`Coût ${band.avg.toFixed(2)} TND/${m.unit}, justifié par la performance technique supérieure.`);
      parts.push(`Pondérations : qualité et durabilité priorisées, prix secondaire.`);
      break;
  }

  return parts.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP 5 ARTICLES PAR CATÉGORIE (§30-31) — déterministe, données réelles
// ─────────────────────────────────────────────────────────────────────────────
/** Nombre d'articles affichés par catégorie (spécification : Top 5). */
export const TOP_ARTICLES_LIMIT = 5;

/**
 * Construit le Top 5 des articles les plus pertinents pour le projet.
 *
 * Sources de prix autorisées (jamais d'invention) :
 *  - offres fournisseurs recensées (avgPrice) → source « Fournisseur » ;
 *  - sinon prix catalogue (unitPrice) → source « Marché 2026 ».
 * Prix TTC = prix unitaire × quantité sélectionnée × (1 + TVA) —
 * même formule que la grille de coûts (TVA 19 %).
 */
export function buildTopArticles(input: {
  cat: CopilotCategory;
  candidates: CatalogMaterial[];
  offersByProduct: Map<string, Offer[]>;
  ctx: ProjectContext;
  catMinPrice: number;
  catMaxPrice: number;
}): TopArticle[] {
  const { cat, candidates, offersByProduct, ctx, catMinPrice, catMaxPrice } = input;
  const qty = estimateQuantity(cat.id, ctx);
  if (qty.quantity <= 0) return [];

  const scored = candidates.map((m) => {
    const offers = offersByProduct.get(m._id) || [];
    const hasOffers = offers.length > 0;
    // Prix unitaire : moyenne des offres fournisseurs (prix le plus fiable), sinon prix catalogue.
    const unitPrice = hasOffers
      ? offers.reduce((s, o) => s + o.avgPrice, 0) / offers.length
      : m.unitPrice;
    const scored = scoreMaterial(m, offers, cat, "equilibre", ctx, catMinPrice, catMaxPrice);
    const note = scored?.scores.noteGlobale ?? 0;
    // Bonus de confirmation marché (+2) : article effectivement recensé chez des
    // fournisseurs — départage déterministe des quasi-égalités de score.
    const marketBonus = offers.length > 0 ? 2 : 0;
    return {
      m,
      offers,
      hasOffers,
      unitPrice,
      note: clamp(note + marketBonus, 0, 100),
    };
  })
    .filter((r) => r.unitPrice > 0 && r.note > 0)
    .sort((a, b) => b.note - a.note || a.unitPrice - b.unitPrice || normOffer(a.m.name).localeCompare(normOffer(b.m.name)))
    .slice(0, TOP_ARTICLES_LIMIT);

  return scored.map((r, i) => ({
    rank: i + 1,
    id: r.m._id,
    name: r.m.name,
    brand: r.m.brand,
    unit: r.m.unit,
    unitPrice: round2(r.unitPrice),
    priceSource: r.hasOffers ? "Fournisseur" : "Marché 2026",
    confidence: round0(
      clamp(
        (r.m.confidenceIndex ?? 0.5) * 100 * 0.7 +
        (r.hasOffers ? 30 : 0) +
        Math.min(10, r.offers.length * 3),
        0,
        100,
      ),
    ),
    quantity: qty.quantity,
    quantityUnit: qty.unitLabel,
    // Prix TTC = prix unitaire × quantité × (1 + TVA) — spécification §Top 5.
    totalTTC: round0(r.unitPrice * qty.quantity * (1 + TVA)),
    score: clamp(r.note, 0, 100),
    suppliers: [...r.offers]
      .sort((a, b) => a.minPrice - b.minPrice || (b.reliabilityIndex ?? 0) - (a.reliabilityIndex ?? 0))
      .slice(0, 4)
      .map((o) => ({
        name: o.supplier,
        price: o.minPrice,
        unit: o.unit || r.m.unit,
        governorate: o.governorate,
        reliabilityIndex: o.reliabilityIndex,
      })),
  }));
}

export function recommendForProject(input: {
  context: ProjectContext;
  categories: string[];
  materials: CatalogMaterial[];
  offers: Offer[];
}): RecommendResult {
  const ctx = input.context;
  const selected = input.categories
    .map((id) => COPILOT_CATEGORY_BY_ID[id])
    .filter((c): c is CopilotCategory => !!c);
  const offersByProduct = new Map<string, Offer[]>();
  for (const o of input.offers) {
    const list = offersByProduct.get(o.productId) || [];
    list.push(o);
    offersByProduct.set(o.productId, list);
  }

  const built = Math.max(1, (ctx.surface || 0) * Math.max(1, ctx.floors || 1));
  const budgetCap =
    ctx.budgetMode === "personnalise" && ctx.budgetAmount
      ? Math.max(1, (ctx.budgetAmount * 0.5) / Math.max(1, selected.length))
      : undefined;

  const categories: CategoryResult[] = [];
  const missingData: string[] = [];
  const costLines: { label: string; material: number; pose: number; transport: number; waste: number; accessories: number; contingency: number; tva: number; total: number; min: number; max: number }[] = [];

  for (const cat of selected) {
    const candidates = matchCategoryMaterials(cat, input.materials);
    if (candidates.length === 0) {
      missingData.push(`Aucun matériau recensé pour « ${cat.label} » dans la base des prix.`);
      continue;
    }
    const bands = candidates.map((m) => priceBandFor(m, offersByProduct.get(m._id) || []));
    const catMin = Math.min(...bands.map((b) => b.avg));
    const catMax = Math.max(...bands.map((b) => b.avg));
    const catAvg = bands.reduce((a, b) => a + b.avg, 0) / bands.length;

    const profiles: Profile[] = ["economique", "equilibre", "premium"];
    const solutions: Solution[] = [];
    const qty = estimateQuantity(cat.id, ctx);

    // Sélection par profil (indépendante), puis résolution des doublons :
    // chaque profil reçoit un matériau distinct, en gardant pour chaque
    // matériau le profil qui l'a noté le plus haut.
    const pickBest = (profile: Profile, exclude: Set<string>, withCap: boolean): Pick | null => {
      let best: Pick | null = null;
      const cap = withCap ? budgetCap : undefined;
      for (const m of candidates) {
        if (exclude.has(m._id)) continue;
        const scored = scoreMaterial(m, offersByProduct.get(m._id) || [], cat, profile, ctx, catMin, catMax, cap);
        if (!scored) continue;
        if (!best || scored.scores.noteGlobale > best.note) {
          best = { m, s: scored.scores, band: scored.band, suppliers: scored.suppliers, note: scored.scores.noteGlobale };
        }
      }
      if (!best) {
        // Repli : aucun matériau sous le plafond budgétaire → le moins cher
        for (const m of candidates) {
          if (exclude.has(m._id)) continue;
          const scored = scoreMaterial(m, offersByProduct.get(m._id) || [], cat, profile, ctx, catMin, catMax, undefined);
          if (!scored) continue;
          if (!best || scored.band.avg < best.band.avg) {
            best = { m, s: scored.scores, band: scored.band, suppliers: scored.suppliers, note: scored.scores.noteGlobale };
          }
        }
      }
      return best;
    };

    const tops: { profile: Profile; pick: Pick }[] = [];
    for (const profile of profiles) {
      const pick = pickBest(profile, new Set(), true);
      if (pick) tops.push({ profile, pick });
    }
    // Nombre de profils partageant le même matériau en tête
    const share = new Map<string, number>();
    for (const t of tops) share.set(t.pick.m._id, (share.get(t.pick.m._id) || 0) + 1);
    // Tri : matériaux « exclusifs » d'abord, puis note décroissante
    tops.sort(
      (a, b) =>
        (share.get(a.pick.m._id) || 0) - (share.get(b.pick.m._id) || 0) ||
        b.pick.note - a.pick.note,
    );
    const assignedProfiles = new Set<Profile>();
    const usedIds = new Set<string>();
    for (const t of tops) {
      if (assignedProfiles.has(t.profile)) continue;
      if (usedIds.has(t.pick.m._id)) continue;
      assignedProfiles.add(t.profile);
      usedIds.add(t.pick.m._id);
      finalizeSolution(t.profile, t.pick);
    }
    // Profils restants : meilleur matériau distinct encore disponible
    for (const profile of profiles) {
      if (assignedProfiles.has(profile)) continue;
      const pick = pickBest(profile, usedIds, true);
      if (!pick) continue;
      assignedProfiles.add(profile);
      usedIds.add(pick.m._id);
      finalizeSolution(profile, pick);
    }

    function finalizeSolution(profile: Profile, best: Pick) {
      const materialCost = qty.quantity * best.band.avg;
      const poseCost = materialCost * cat.posePct;
      const transportCost = materialCost * TRANSPORT_PCT;  // transport sur coût matériaux seul
      const wasteCost = materialCost * WASTE_PCT;
      const accessoriesCost = materialCost * ACCESSORIES_PCT;
      const subtotal = materialCost + poseCost + transportCost + wasteCost + accessoriesCost;
      const contingencyCost = subtotal * CONTINGENCY_PCT;
      const base = subtotal + contingencyCost;
      const tva = base * TVA;

      const { pros, cons } = prosCons(best.s, best.band, cat, catAvg);
      solutions.push({
        profile,
        profileLabel: PROFILE_LABEL[profile],
        material: {
          id: best.m._id,
          name: best.m.name,
          unit: best.m.unit,
          brand: best.m.brand,
          priceQuality: best.m.priceQuality,
          availability: best.m.availability,
          band: best.band,
          quantity: qty.quantity,
          quantityUnit: qty.unitLabel,
          materialCost: round0(materialCost),
          poseCost: round0(poseCost),
          transportCost: round0(transportCost),
          wasteCost: round0(wasteCost),
          accessoriesCost: round0(accessoriesCost),
          contingencyCost: round0(contingencyCost),
          tva: round0(tva),
          totalCost: round0(base + tva),
        },
        scores: best.s,
        qualityScore10: Math.round((best.s.qualite / 100) * 10) / 10,
        recommendationScore: best.s.noteGlobale,
        justification: buildJustification(profile, best, cat),
        pros,
        cons,
        suppliers: best.suppliers.map((o) => ({
          name: o.supplier,
          price: o.minPrice,
          unit: o.unit || best.m.unit,
          governorate: o.governorate,
          reliabilityIndex: o.reliabilityIndex,
          availability: o.availability,
        })),
      });
    }

    if (solutions.length === 0) {
      missingData.push(`Impossible de recommander pour « ${cat.label} » (aucune donnée de prix exploitable).`);
      continue;
    }

    // Meilleur rapport qualité/prix = score équilibré le plus élevé (sinon économique)
    const eq = solutions.find((s) => s.profile === "equilibre");
    const eco = solutions.find((s) => s.profile === "economique");
    const bestValue = eq ? "equilibre" : eco ? "economique" : solutions[0].profile;

    // Ligne de coût : on retient la solution recommandée (équilibrée par défaut)
    const line = solutions.find((s) => s.profile === "equilibre") || solutions[0];
    // Meilleur fournisseur de la catégorie : offre la moins chère constatée parmi
    // les 3 solutions (fiabilité la plus élevée en cas d'égalité de prix).
    let bestSupplier: BestSupplier | null = null;
    for (const s of solutions) {
      for (const sup of s.suppliers) {
        if (
          !bestSupplier ||
          sup.price < bestSupplier.price ||
          (sup.price === bestSupplier.price && (sup.reliabilityIndex ?? 0) > (bestSupplier.reliabilityIndex ?? 0))
        ) {
          bestSupplier = sup;
        }
      }
    }

    categories.push({
      categoryId: cat.id,
      label: cat.label,
      icon: cat.icon,
      candidatesCount: candidates.length,
      coverage: solutions.some((s) => s.suppliers.length > 0),
      solutions,
      topArticles: buildTopArticles({
        cat,
        candidates,
        offersByProduct,
        ctx,
        catMinPrice: catMin,
        catMaxPrice: catMax,
      }),
      bestValue,
      bestSupplier,
    });

    costLines.push({
      label: cat.label,
      material: line.material.materialCost,
      pose: line.material.poseCost,
      transport: line.material.transportCost,
      waste: line.material.wasteCost,
      accessories: line.material.accessoriesCost,
      contingency: line.material.contingencyCost,
      tva: line.material.tva,
      total: line.material.totalCost,
      min: line.material.quantity * line.material.band.min * (1 + cat.posePct) * (1 + TRANSPORT_PCT + WASTE_PCT + ACCESSORIES_PCT) * (1 + CONTINGENCY_PCT) * (1 + TVA),
      max: line.material.quantity * line.material.band.max * (1 + cat.posePct) * (1 + TRANSPORT_PCT + WASTE_PCT + ACCESSORIES_PCT) * (1 + CONTINGENCY_PCT) * (1 + TVA),
    });
  }

  const cost: CostSummary = {
    materials: round0(costLines.reduce((a, l) => a + l.material, 0)),
    pose: round0(costLines.reduce((a, l) => a + l.pose, 0)),
    transport: round0(costLines.reduce((a, l) => a + l.transport, 0)),
    waste: round0(costLines.reduce((a, l) => a + l.waste, 0)),
    accessories: round0(costLines.reduce((a, l) => a + l.accessories, 0)),
    contingency: round0(costLines.reduce((a, l) => a + l.contingency, 0)),
    tva: round0(costLines.reduce((a, l) => a + l.tva, 0)),
    total: round0(costLines.reduce((a, l) => a + l.total, 0)),
    min: round0(costLines.reduce((a, l) => a + l.min, 0)),
    max: round0(costLines.reduce((a, l) => a + l.max, 0)),
    perM2: round0(costLines.reduce((a, l) => a + l.total, 0) / built),
    currency: "TND",
    priceDate: Date.now(),
  };

  // ── Recommandation finale ──
  const allSolutions = categories.flatMap((c) => c.solutions.map((s) => ({ ...s, cat: c.label, catId: c.categoryId })));
  const picked =
    ctx.budgetMode === "limite" || ctx.budgetMode === "economique"
      ? allSolutions.find((s) => s.profile === "economique") || allSolutions[0]
      : ctx.budgetMode === "premium"
        ? allSolutions.find((s) => s.profile === "premium") || allSolutions[0]
        : allSolutions.find((s) => s.profile === "equilibre") || allSolutions[0];

  const advantages = picked.pros.slice(0, 4);
  const limits = picked.cons.slice(0, 3);
  const explanation =
    `Pour votre projet${ctx.projectName ? ` « ${ctx.projectName} »` : ""} ` +
    `(${Math.round(built)} m², ${ctx.standing || "standing standard"}, budget ${BUDGET_MODES.find((b) => b.id === ctx.budgetMode)?.label.toLowerCase() || ctx.budgetMode}), ` +
    `la solution ${picked.profileLabel.toLowerCase()} (« ${picked.material.name} ») offre le meilleur compromis entre prix, ` +
    `performance et disponibilité sur le marché tunisien (score ${picked.scores.noteGlobale}/100). ` +
    `Cette recommandation est une aide à la décision fondée sur les prix du catalogue 2026 et les offres fournisseurs recensées ; ` +
    `elle ne remplace pas la validation d'un ingénieur ou d'un architecte, en particulier pour les éléments structurels.`;

  return {
    generatedAt: Date.now(),
    context: ctx,
    categories,
    recommendation: {
      solution: picked.profile,
      score: picked.scores.noteGlobale,
      materialName: picked.material.name,
      categoryLabel: picked.cat,
      explanation,
      advantages,
      limits,
    },
    cost,
    missingData,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTIMISATION DU BUDGET (§14)
// ─────────────────────────────────────────────────────────────────────────────
export type BudgetOptimization = {
  originalTotal: number;
  optimizedTotal: number;
  savings: number;
  savingsPct: number;
  changes: { categoryLabel: string; from: string; to: string; saving: number }[];
  note: string;
};

export function optimizeBudget(input: { result: RecommendResult; budgetAmount: number }): BudgetOptimization {
  const { result, budgetAmount } = input;
  const originalTotal = result.cost.total;
  const changes: BudgetOptimization["changes"] = [];
  let optimized = 0;
  let count = 0;

  for (const cat of result.categories) {
    const eco = cat.solutions.find((s) => s.profile === "economique");
    const std = cat.solutions.find((s) => s.profile === "equilibre") || eco;
    if (!eco || !std) continue;
    if (std.material.id === eco.material.id) {
      optimized += std.material.totalCost;
      continue;
    }
    const saving = std.material.totalCost - eco.material.totalCost;
    if (saving <= 0) {
      optimized += std.material.totalCost;
      continue;
    }
    changes.push({
      categoryLabel: cat.label,
      from: std.material.name,
      to: eco.material.name,
      saving: round0(saving),
    });
    optimized += eco.material.totalCost;
    count++;
  }

  const savings = Math.max(0, originalTotal - optimized);
  const savingsPct = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

  // Si le budget n'est toujours pas tenu → signaler (pas de fausse promesse)
  const note =
    optimized <= budgetAmount
      ? `Le budget de ${budgetAmount.toLocaleString("fr-TN")} TND est tenu avec ${changes.length} ajustement(s) recommandé(s).`
      : `Le budget de ${budgetAmount.toLocaleString("fr-TN")} TND reste inférieur au coût estimé (${optimized.toLocaleString("fr-TN")} TND) ` +
        `même avec toutes les solutions économiques. Réduisez la surface, simplifiez le plan ou reportez certaines finitions.`;

  return {
    originalTotal,
    optimizedTotal: optimized,
    savings: round0(savings),
    savingsPct,
    changes,
    note,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AMÉLIORATION DE LA PERFORMANCE ÉNERGÉTIQUE (§15)
// ─────────────────────────────────────────────────────────────────────────────
export type PerformanceImprovement = {
  title: string;
  improvements: { categoryLabel: string; from: string; to: string; benefit: string; estimatedSavingPct: number }[];
  assumptions: string[];
  note: string;
};

export function improvePerformance(input: { result: RecommendResult }): PerformanceImprovement {
  const { result } = input;
  const improvements: PerformanceImprovement["improvements"] = [];

  for (const cat of result.categories) {
    const current = cat.solutions.find((s) => s.profile === "equilibre") || cat.solutions[0];
    if (!current || cat.solutions.length < 2) continue;
    // Meilleure performance parmi les solutions proposées (thermique + acoustique)
    const best = [...cat.solutions].sort(
      (a, b) =>
        b.scores.isolationThermique + b.scores.isolationAcoustique -
        (a.scores.isolationThermique + a.scores.isolationAcoustique),
    )[0];
    const gain = best.scores.isolationThermique - current.scores.isolationThermique;
    const acousticGain = best.scores.isolationAcoustique - current.scores.isolationAcoustique;
    if ((gain > 0 || acousticGain > 0) && best.material.id !== current.material.id) {
      improvements.push({
        categoryLabel: cat.label,
        from: current.material.name,
        to: best.material.name,
        benefit:
          (gain > 0 ? `Meilleure isolation thermique (+${gain} pts) — confort été/hiver ` : "") +
          (acousticGain > 0 ? `, acoustique (+${acousticGain} pts)` : ""),
        estimatedSavingPct:
          cat.categoryId === "isolation_thermique" ? 18 :
          cat.categoryId === "isolation_acoustique" ? 10 :
          cat.categoryId === "verre" || cat.categoryId === "pvc" ? 12 :
          cat.categoryId === "climatisation" ? 8 : 5,
      });
    }
  }

  return {
    title: "Améliorer la performance énergétique",
    improvements,
    assumptions: [
      "Économies estimées sur la consommation de climatisation/chauffage (climat tunisien), non garanties.",
      "Les gains réels dépendent de l'orientation, de l'étanchéité à l'air et des habitudes d'usage.",
      "Pour le gros œuvre, la validation d'un bureau d'études reste requise.",
    ],
    note: "Hypothèses : les pourcentages d'économie sont des ordres de grandeur indicatifs fondés sur la réglementation thermique tunisienne (RT 2017) et les retours de chantier ; ils ne constituent pas un engagement de performance.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARATEUR MULTI-MATÉRIAUX (§12 — jusqu'à 5 matériaux)
// ─────────────────────────────────────────────────────────────────────────────
export type MaterialComparison = {
  materials: {
    id: string;
    name: string;
    unit: string;
    band: PriceBand;
    scores: MaterialScores;
    pros: string[];
    cons: string[];
    suppliers: { name: string; price: number; governorate?: string }[];
    technical: string[];
    financial: string[];
    lifetime: string;
  }[];
  recommendation: { id: string; name: string; reason: string };
};

export function compareMaterials(input: {
  ids: string[];
  materials: CatalogMaterial[];
  offers: Offer[];
}): MaterialComparison {
  const byId = new Map(input.materials.map((m) => [m._id, m]));
  const offersByProduct = new Map<string, Offer[]>();
  for (const o of input.offers) {
    const list = offersByProduct.get(o.productId) || [];
    list.push(o);
    offersByProduct.set(o.productId, list);
  }

  const items = input.ids.slice(0, 5).map((id) => byId.get(id)).filter((m): m is CatalogMaterial => !!m);
  const genericCat: CopilotCategory = { id: "autres", label: "Autres", catalogCategories: [], keywords: [], posePct: 0.3, icon: "Box" };
  const catFor = (m: CatalogMaterial) => COPILOT_CATEGORIES.find((c) => c.catalogCategories.includes(m.category) || hasAnyKw(m.name, c.keywords)) || genericCat;

  const bands = items.map((m) => priceBandFor(m, offersByProduct.get(m._id) || []));
  const catMin = Math.min(...bands.map((b) => b.avg));
  const catMax = Math.max(...bands.map((b) => b.avg));

  const ctx: ProjectContext = {
    surface: 100, floors: 1, year: new Date().getFullYear(), standing: "standard",
    budgetMode: "moyen", priorities: { price: 50, quality: 50, isolation: 50, durability: 50, eco: 50 },
  };

  const materials = items.map((m) => {
    const cat = catFor(m);
    const offers = offersByProduct.get(m._id) || [];
    const band = priceBandFor(m, offers);
    const scored = scoreMaterial(m, offers, cat, "equilibre", ctx, catMin, catMax);
    const scores = scored ? scored.scores : {
      prix: 50, qualite: 50, durabilite: 50, isolationThermique: 50, isolationAcoustique: 50,
      resistance: 50, entretien: 50, disponibilite: 50, impactEnvironnemental: 50, noteGlobale: 50,
    };
    const { pros, cons } = prosCons(scores, band, cat, (catMin + catMax) / 2);
    const financial = [
      `Fourchette : ${band.min.toFixed(2)} – ${band.max.toFixed(2)} TND${m.unit ? "/" + m.unit : ""}`,
      scored && scores.prix >= 75 ? "Position tarifaire favorable" : scored && scores.prix <= 40 ? "Position tarifaire élevée" : "Position tarifaire moyenne",
    ];
    const technical = [
      `Résistance mécanique : ${scores.resistance}/100`,
      `Isolation thermique : ${scores.isolationThermique}/100`,
      `Isolation acoustique : ${scores.isolationAcoustique}/100`,
    ];
    const lifetime = scores.durabilite >= 80 ? "15–25 ans selon usage" : scores.durabilite >= 60 ? "10–15 ans" : "5–10 ans";
    return {
      id: m._id,
      name: m.name,
      unit: m.unit,
      band,
      scores,
      pros,
      cons,
      suppliers: offers.sort((a, b) => a.minPrice - b.minPrice).slice(0, 3).map((o) => ({
        name: o.supplier, price: o.minPrice, governorate: o.governorate,
      })),
      technical,
      financial,
      lifetime,
    };
  });

  const best = [...materials].sort((a, b) => b.scores.noteGlobale - a.scores.noteGlobale)[0];
  return {
    materials,
    recommendation: best
      ? {
          id: best.id,
          name: best.name,
          reason:
            `Score global ${best.scores.noteGlobale}/100 : meilleur équilibre entre prix (${best.band.avg.toFixed(2)} TND${best.unit ? "/" + best.unit : ""}), ` +
            `performance (thermique ${best.scores.isolationThermique}/100, résistance ${best.scores.resistance}/100) et durabilité (${best.scores.durabilite}/100).`,
        }
      : { id: "", name: "", reason: "Aucun matériau sélectionné." },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSISTANT CONVERSATIONNEL (§13) — repli déterministe sans API
// ─────────────────────────────────────────────────────────────────────────────
export function fallbackChatAnswer(question: string, context: { projectName?: string; surface?: number; region?: string }): string {
  const q = question.toLowerCase();
  const has = (kws: string[]) => kws.some((k) => q.includes(k));

  if (has(["isolant", "isolation", "thermique"])) {
    return "Pour une bonne isolation thermique en Tunisie, privilégiez :\n" +
      "• Toiture/terrasse : polystyrène extrudé (XPS) ou laine de verre — le poste le plus rentable (jusqu'à 25% d'économie de climatisation).\n" +
      "• Murs : laine de verre en doublage ou polystyrène expansé (PSE) entre murs.\n" +
      "• Fenêtres : double vitrage avec rupture de pont thermique (PVC ou aluminium à rupture).\n" +
      "Le XPS est le meilleur rapport qualité/prix sur le marché tunisien pour les toitures. Vérifiez la disponibilité auprès des distributeurs locaux (Knauf Tunisie, distributeurs de PSE à Tunis/Sfax).";
  }
  if (has(["brique", "qualite", "rapport"])) {
    return "La brique creuse 15 cm offre le meilleur rapport qualité/prix pour les murs porteurs en Tunisie : \n" +
      "• 15 cm : bonne isolation thermique et acoustique, prix ≈ 0,60-0,70 TND/pièce.\n" +
      "• 10 cm : moins chère mais résistance thermique inférieure — à réserver aux cloisons.\n" +
      "Pour les cloisons intérieures, la brique 10 cm est le choix économique recommandé. Vérifiez la provenance (usines locales) et commandez par palette pour négocier.";
  }
  if (has(["chaleur", "ete", "chaud", "rafraichir", "climat"])) {
    return "Pour réduire la chaleur estivale en Tunisie, combinez :\n" +
      "• Isolation de la toiture (XPS 6-8 cm) — la surface la plus exposée.\n" +
      "• Enduit clair ou peinture réfléchissante en façade.\n" +
      "• Double vitrage + protections solaires extérieures (volets, stores).\n" +
      "• Ventilation naturelle traversante et, si besoin, climatisation inverter 12 000 BTU (consommation réduite de 30% par rapport à un modèle classique).";
  }
  if (has(["carrelage", "local", "importe", "import"])) {
    return "Carrelage local vs importé :\n" +
      "• Local (SOPAL, Kairouan, Sidi Bouzid) : 25-35 TND/m², délais courts, pièces de rechange disponibles — meilleur rapport qualité/prix.\n" +
      "• Importé (Espagne, Italie, Chine) : 45-120 TND/m², esthétique premium et formats XXL, mais délais 4-8 semaines et coût de transport.\n" +
      "Recommandation : carrelage local pour les volumes (sol général), importé uniquement pour les zones d'effet (salon, entrée).";
  }
  if (has(["aluminium", "pvc", "fenetre", "menuiserie"])) {
    return "Fenêtres aluminium vs PVC :\n" +
      "• PVC double vitrage : meilleure isolation thermique/acoustique, entretien minimal, prix ≈ 350-420 TND/ouvrant (90×120). Idéal pour les pièces climatisées.\n" +
      "• Aluminium : plus rigide, formats plus grands, esthétique moderne, mais pont thermique à traiter — prix ≈ 300-380 TND/ouvrant.\n" +
      "En Tunisie, le PVC est le meilleur rapport qualité/prix pour le résidentiel. Pour un usage intensif (bord de mer), l'aluminium laqué est plus durable.";
  }
  if (has(["budget", "50 000", "50000", "prix", "combien", "cout"])) {
    return "Avec un budget donné, l'Assistant optimise la combinaison prix + qualité + performance :\n" +
      "• Répartissez le budget : gros œuvre ~45%, second œuvre ~30%, équipements ~15%, imprévus ~10%.\n" +
      "• Priorisez l'isolation et l'étanchéité (rentabilité immédiate), réduisez les finitions coûteuses (marbre → grès cérame).\n" +
      "• Utilisez le bouton « Optimiser mon budget avec l'IA » : l'analyse liste les substitutions précises avec les économies estimées.";
  }
  if (has(["fer", "acier", "beton", "structure"])) {
    return "Pour les éléments structurels (béton armé, acier) :\n" +
      "• Béton dosé à 350 kg/m³ de ciment pour les éléments porteurs verticaux (norme NT 47.01).\n" +
      "• Acier HA (haute adhérence) : HA10 pour les fondations, HA12 pour les poteaux/poutres. Le treillis soudé ST25 pour les dalles.\n" +
      "• Prix indicatifs 2026 : fer HA ≈ 2,0-2,2 TND/kg selon le diamètre ; béton prêt à l'emploi ≈ 130-150 TND/m³.\n" +
      "⚠️ Ces éléments doivent être validés par un ingénieur structure — l'Assistant ne remplace jamais cette validation.";
  }
  if (has(["solaire", "photovoltaique", "panneau"])) {
    return "Panneaux solaires en Tunisie (marché 2026) :\n" +
      "• Kit 3 kWc : 9 000-12 000 TND pose comprise — autoconsommation + revente du surplus (STEG).\n" +
      "• Retour sur investissement : 4-6 ans selon l'exposition sud et l'inclinaison 30-35°.\n" +
      "• Choisissez des panneaux certifiés (garantie 25 ans) et un onduleur de marque reconnue. Prix en baisse tendancielle (-2% sur 6 mois).";
  }
  if (has(["salle de bain", "sanitaire", "wc", "robinet"])) {
    return "Sanitaires — meilleur rapport qualité/prix en Tunisie :\n" +
      "• WC à l'anglaise complet : 220-260 TND (marques locales ou importées d'entrée de gamme).\n" +
      "• Robinetterie : mitigeurs 60-90 TND ; privilégiez les cartouches céramique remplaçables.\n" +
      "• Conseils : 1 WC + 1 lavabo par salle de bain, robinetterie économique (débit réduit) pour limiter la consommation d'eau.";
  }
  if (has(["macon", "pose", "main d'oeuvre", "main-d'oeuvre", "main doeuvre", "travaux"])) {
    return "Main-d'œuvre en Tunisie (fourchettes 2026, par jour) :\n" +
      "• Maçon qualifié : 60-80 TND/j · Manœuvre : 45-55 TND/j\n" +
      "• Électricien : 70-90 TND/j · Plombier : 70-90 TND/j · Carreleur : 80-100 TND/j\n" +
      "Astuce : regroupez les lots (gros œuvre + second œuvre chez le même artisan) pour négocier 5-10% et mieux coordonner le planning.";
  }
  if (has(["bonjour", "salut", "hello", "merci", "bonsoir"])) {
    return "Bonjour ! Je suis votre Assistant Matériaux IA de batibuild App. Posez-moi vos questions sur les matériaux, les prix, l'isolation, les fournisseurs ou le budget de votre projet en Tunisie. Par exemple : « Quel isolant pour une villa à Tunis ? »";
  }
  return "Je peux vous aider sur :\n" +
    "• Le choix d'un matériau (isolation, briques, carrelage, menuiseries, sanitaires…)\n" +
    "• Les prix indicatifs du marché tunisien (catalogue 2026)\n" +
    "• L'optimisation de votre budget et la réduction de la chaleur en été\n" +
    "• Les fournisseurs et la main-d'œuvre.\n" +
    "Précisez votre besoin (matériau, zone, budget) pour une réponse structurée. Toutes les réponses s'appuient sur la base des prix 2026 et les hypothèses datées.";
}

// ─────────────────────────────────────────────────────────────────────────────
// AIDE AU CONTEXTE POUR LE CHAT (§13) — données réelles du projet
// ─────────────────────────────────────────────────────────────────────────────
export function buildAssistantContext(result: RecommendResult | null, ctx: ProjectContext | null): string {
  const parts: string[] = [];
  if (ctx?.projectName) parts.push(`Projet : ${ctx.projectName}`);
  if (ctx?.surface) parts.push(`Surface : ${ctx.surface} m²${ctx.floors > 1 ? ` × ${ctx.floors} niveaux` : ""}`);
  if (ctx?.region) parts.push(`Région : ${ctx.region}`);
  if (ctx?.standing) parts.push(`Standing : ${ctx.standing}`);
  if (ctx?.budgetMode) parts.push(`Budget : ${BUDGET_MODES.find((b) => b.id === ctx.budgetMode)?.label || ctx.budgetMode}${ctx.budgetAmount ? ` (${ctx.budgetAmount} TND)` : ""}`);
  if (result && result.categories.length) {
    const lines = result.categories
      .map((c) => {
        const s = c.solutions.find((x) => x.profile === "equilibre") || c.solutions[0];
        return `- ${c.label} : ${s.material.name} (${s.material.band.avg.toFixed(2)} TND/${s.material.unit}, score ${s.scores.noteGlobale}/100)`;
      })
      .join("\n");
    parts.push(`Recommandations en cours :\n${lines}`);
  }
  return parts.join("\n");
}

export const PRICE_DISCLAIMER = "Prix indicatif du marché — dernière mise à jour : ";
