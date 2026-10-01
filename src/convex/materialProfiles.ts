import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  MATERIAL_CATEGORY_LABELS,
  normalizeMaterialCategory,
} from "./bimEngine";

// ============================================================================
// FICHE MATÉRIAU ENRICHIE
// ----------------------------------------------------------------------------
// Produit une fiche technique structurée pour N'IMPORTE QUEL matériau de la
// base, même sans saisie manuelle : les caractéristiques, normes,
// certifications, conseils d'usage/stockage/sécurité et compatibilités sont
// dérivés du nom, de la catégorie et de l'unité (moteur pur, testable). Les
// valeurs saisies par l'administrateur (champs optionnels de `materialPrices`)
// SONT PRIORITAIRES et écrasent la valeur dérivée correspondante.
// ============================================================================

export type MaterialCharacteristic = { label: string; value: string };

export type MaterialProfile = {
  categorySlug: string;
  categoryLabel: string;
  characteristics: MaterialCharacteristic[];
  norms: string[];
  certifications: string[];
  packaging: string;
  usageAdvice: string;
  storageAdvice: string;
  safetyAdvice: string;
  compatibility: string[];
  documentation: { type: string; label: string; url?: string }[];
  /** Vrai dès qu'au moins un champ enrichi a été saisi par l'admin. */
  enriched: boolean;
};

/** Sous-ensemble de `materialPrices` nécessaire au calcul de la fiche. */
export type MaterialProfileInput = {
  name: string;
  category: string;
  subcategory?: string | null;
  unit: string;
  brand?: string | null;
  manufacturer?: string | null;
  sku?: string | null;
  description?: string | null;
  currency?: string | null;
  priceQuality?: string | null;
  availability?: string | null;
  region?: string | null;
  characteristics?: MaterialCharacteristic[] | null;
  certifications?: string[] | null;
  norms?: string[] | null;
  packaging?: string | null;
  usageAdvice?: string | null;
  storageAdvice?: string | null;
  safetyAdvice?: string | null;
  compatibility?: string[] | null;
  technicalSheetUrl?: string | null;
};

type CategoryGuide = {
  norms: string[];
  certifications: string[];
  usage: string;
  storage: string;
  safety: string;
  compatibility: string[];
};

// ── Connaissances par catégorie officielle 2026 ─────────────────────────────

const CATEGORY_GUIDES: Record<string, CategoryGuide> = {
  terrassement_granulats: {
    norms: ["NF P 18-545 (granulats)", "EN 13242"],
    certifications: ["Marquage CE granulats"],
    usage: "Mise en œuvre après compactage par couches ; contrôler la granulométrie et la propreté.",
    storage: "Stockage en tas séparés sur aire stabilisée, à l'abri des mélanges et des ruissellements.",
    safety: "Port de gants et protection respiratoire lors de la manutention de produits secs.",
    compatibility: ["Ciment", "Géotextile", "Béton", "Liants routiers"],
  },
  liants_ciments_mortiers: {
    norms: ["EN 197-1 (ciments)", "EN 998-2 (mortiers)", "EN 459-1 (chaux)"],
    certifications: ["Marquage CE", "Fiche de données de sécurité (FDS)"],
    usage: "Respecter le dosage eau/liant ; gâcher à l'eau propre et consommer dans le délai ouvert.",
    storage: "Sacs fermés sur palettes, à l'abri de l'humidité, hauteur ≤ 2 m, durée ≤ 3 mois.",
    safety: "Produit irritant : gants, lunettes et masque anti-poussière ; éviter le contact prolongé avec la peau.",
    compatibility: ["Sable", "Gravier", "Adjuvants", "Béton", "Mortier"],
  },
  betons_prefabrication: {
    norms: ["EN 206 (béton)", "EN 13369 (préfabrication)"],
    certifications: ["Contrôle de conformité usine", "Marquage CE produits préfabriqués"],
    usage: "Contrôler la classe d'exposition, le délai de livraison et le nombre de rotations de toupie.",
    storage: "Pièces sur cales et sangles, éviter les chocs sur arêtes ; béton prêt à l'emploi à couler sous 90 min.",
    safety: "Manutention mécanique obligatoire ; ne jamais se placer sous une charge suspendue.",
    compatibility: ["Acier à béton", "Coffrage", "Adjuvants", "Ciment"],
  },
  acier_metaux_structure: {
    norms: ["EN 10080 (aciers pour béton armé)", "EN 10025 (aciers de structure)"],
    certifications: ["Certificat 3.1 matière", "Marquage CE"],
    usage: "Vérifier le diamètre et la nuance ; respecter les longueurs d'ancrage et de recouvrement.",
    storage: "Stockage hors sol sur bastaings, protégé de la corrosion et des déformations.",
    safety: "Gants anti-coupure, chaussures de sécurité ; attention aux extrémités et aux chutes de barres.",
    compatibility: ["Béton", "Treillis soudé", "Ciment", "Goujons d'ancrage"],
  },
  maconnerie_plancher: {
    norms: ["EN 771 (éléments de maçonnerie)", "DTU 20.1"],
    certifications: ["Marquage CE blocs", "Certificat de conformité fabricant"],
    usage: "Respecter les règles de calepinage, les joints d'assise et la montée en une seule journée par niveau.",
    storage: "Palettisation sur aire plane, protection contre la pluie et les chocs.",
    safety: "Manutention répétitive : gants et aides mécaniques ; ne pas surcharger les échafaudages.",
    compatibility: ["Mortier", "Ciment", "Hourdis", "Tirants"],
  },
  bois_panneaux_coffrage: {
    norms: ["EN 13986 (panneaux)", "EN 338 (bois de structure)"],
    certifications: ["Traitement fongicide/insecticide", "Marquage CE panneaux"],
    usage: "Tenir compte de l'humidité, de la classe de service et des traitements préalables.",
    storage: "Stockage à plat sur cales, sous abri ventilé, sans contact direct avec le sol.",
    safety: "Poussières de bois : masque, extraction et protection oculaire.",
    compatibility: ["Étai métallique", "Huile de décoffrage", "Connecteurs métalliques"],
  },
  etancheite_protection: {
    norms: ["EN 13707 (membranes bitumineuses)", "DTU 43.1"],
    certifications: ["Agrément technique / ATec", "Marquage CE"],
    usage: "Primairiser les supports, respecter les recouvrements et relever les points singuliers.",
    storage: "Rouleaux debout, à l'abri de la chaleur et du soleil.",
    safety: "Pose à chaud : point de flamme, extincteur et écran de protection.",
    compatibility: ["Primaire bitumineux", "Isolation", "Gouttière", "Mastic"],
  },
  isolation_thermique: {
    norms: ["EN 13162 (laines minérales)", "EN 13163 (PSE)", "DTU 45.1"],
    certifications: ["Marquage CE", "Certificat ACERMI (conduction thermique)"],
    usage: "Poser en couches continues sans lame d'air traversante ; traiter les ponts thermiques.",
    storage: "Palettes filmées, à l'abri de l'humidité et des UV.",
    safety: "Laines minérales : gants, manches longues, masque ; produits de collage en zone ventilée.",
    compatibility: ["Pare-vapeur", "Sous-couche", "Enduit isolant", "Chevilles"],
  },
  cloisons_platre_plafonds: {
    norms: ["EN 520 (plaques de plâtre)", "DTU 25.41/25.42"],
    certifications: ["Marquage CE plaques", "Classement réaction au feu"],
    usage: "Respecter l'entraxe des montants, la double visserie et l'isolation interstitielle.",
    storage: "Plis sur palettes à plat, sous abri sec ; manipuler par les rives.",
    safety: "Poussière de plâtre : masque ; protection des articulations lors de la pose.",
    compatibility: ["Rail/montant", "Enduit à joint", "Bande à joint", "Isolation"],
  },
  toitures_bardages_facades: {
    norms: ["EN 1304 (tuiles)", "EN 14782/14783 (bardages)", "DTU 40.2"],
    certifications: ["Marquage CE", "Garantie fabricant"],
    usage: "Respecter les pentes minimales, les liteaux et les fixations selon la zone de vent.",
    storage: "Palettes sanglées, à l'abri des chocs et du piétinement.",
    safety: "Travail en hauteur : harnais, garde-corps et vérification des appuis.",
    compatibility: ["Liteau", "Sous-toiture", "Faîtage", "Fixations"],
  },
  revetements_sols_murs: {
    norms: ["EN 14411 (carreaux céramiques)", "DTU 52.1"],
    certifications: ["Classement UPEC (usage)", "Marquage CE"],
    usage: "Prévoir la casse (~10 %), respecter le calepinage et le double encollage sur grands formats.",
    storage: "Palettes protégées de l'humidité, sur chantier avant pose ; ne pas empiler trop haut.",
    safety: "Chutes et coupures : gants anti-coupure, protection des genoux.",
    compatibility: ["Colle carrelage", "Joint", "Croisillons", "Primaire"],
  },
  peintures_enduits_finitions: {
    norms: ["EN 13300 (peintures)", "NF T 36-005"],
    certifications: ["Fiche de données de sécurité", "Écolabel éventuel"],
    usage: "Préparer le support, respecter le délai de séchage entre couches et le rendement au m².",
    storage: "Bidons fermés, à l'abri du gel et de la chaleur, ventilation du local.",
    safety: "Produits volatils : ventilation, gants, protection oculaire ; pas de flamme nue.",
    compatibility: ["Primaire/sous-couche", "Enduit", "Bande de calicot"],
  },
  menuiseries: {
    norms: ["EN 14351-1 (fenêtres/portes)", "DTU 36.5"],
    certifications: ["Marquage CE menuiseries", "Classement AEV"],
    usage: "Vérifier les cotes de la baie, le sens d'ouverture et les fixations avant commande.",
    storage: "Stockage vertical sur cales, à l'abri des chocs et de l'humidité (bois).",
    safety: "Vitrages : gants et ventouses ; éviter tout choc sur les vitrages trempés.",
    compatibility: ["Vitrage", "Volet roulant", "Quincaillerie", "Mastic"],
  },
  vitrage_verriers: {
    norms: ["EN 12150 (verre trempé)", "EN 1279 (double vitrage)"],
    certifications: ["Marquage CE", "Certificat de performance thermique"],
    usage: "Respecter les cotes, l'épaisseur et le type de vitrage (feuilleté/sécurit® selon usage).",
    storage: "Chevalets de transport, jamais à plat ; manipuler avec ventouses.",
    safety: "Risque de coupure : gants anti-coupure et protection des arêtes.",
    compatibility: ["Menuiserie", "Mastic", "Intercalaire"],
  },
  chimie_construction: {
    norms: ["EN 1504-3/1504-4 (réparation)", "EN 13880 (produits routiers)"],
    certifications: ["Fiche de données de sécurité", "Marquage CE"],
    usage: "Respecter les proportions de mélange et les conditions de température/humidité d'application.",
    storage: "Local ventilé, à l'abri du gel et des sources de chaleur ; produits classés par famille.",
    safety: "Produits agressifs : EPI complets (gants nitrile, lunettes, masque), ventilation.",
    compatibility: ["Primaire", "Enduit", "Résine"],
  },
  quincaillerie_fixations: {
    norms: ["EN 14592 (fixations bois)", "EN ISO 898 (visserie)"],
    certifications: ["Revêtement anticorrosion", "Zincage"],
    usage: "Adapter la fixation au support et à la charge ; prépercer selon le matériau.",
    storage: "Boîtes fermées, à l'abri de l'humidité pour éviter l'oxydation.",
    safety: "Port de lunettes lors du perçage ; attention aux éclats.",
    compatibility: ["Visserie", "Chevilles", "Goujons", "Équerres"],
  },
  eclairage: {
    norms: ["EN 60598 (luminaires)", "EN 12464-1 (éclairage)"],
    certifications: ["Marquage CE", "IP/IK selon usage"],
    usage: "Respecter l'indice de protection (IP) selon le local et la puissance de l'alimentation.",
    storage: "Emballage d'origine, à l'abri des chocs et de l'humidité.",
    safety: "Coupure de l'alimentation avant toute intervention ; habilitations électriques.",
    compatibility: ["Câblage", "Disjoncteur", "Interrupteur"],
  },
  cvc_chauffage_ventilation: {
    norms: ["EN 14511 (climatisation)", "DTU 68.3"],
    certifications: ["Marquage CE", "Classement énergétique"],
    usage: "Dimensionner selon le volume et l'exposition ; respecter les sections de gaine et le débit.",
    storage: "Stockage droit, protégé du gel et de l'humidité ; ne pas coucher les unités.",
    safety: "Fluides frigorigènes sous pression : intervention par technicien habilité.",
    compatibility: ["Gaine", "Réseau électrique", "Support"],
  },
  energies_renouvelables: {
    norms: ["EN 61215 (modules PV)", "EN 62109 (onduleurs)"],
    certifications: ["Marquage CE", "Certificat de rendement"],
    usage: "Respecter l'orientation, l'inclinaison et la ventilation arrière ; dimensionner l'onduleur.",
    storage: "Modules à plat sur palettes, à l'abri des chocs et de l'humidité.",
    safety: "Tension continue mortelle : coupure et consignation par installateur habilité.",
    compatibility: ["Onduleur", "Structure de fixation", "Câblage DC"],
  },
  securite_incendie_surete: {
    norms: ["EN 3 (extincteurs)", "EN 54 (détection incendie)"],
    certifications: ["Marquage CE", "Homologation / agrément"],
    usage: "Respecter l'implantation réglementaire, les distances et les vérifications périodiques.",
    storage: "Local sec, accessible ; contrôle de pression et de péremption.",
    safety: "Ne jamais obstruer les accès ; manipulation par personnel formé.",
    compatibility: ["Signalisation", "Support mural"],
  },
  voirie_reseaux_drainage: {
    norms: ["EN 1916 (tuyaux béton)", "EN 1401 (PVC assainissement)"],
    certifications: ["Marquage CE", "Classement de rigidité"],
    usage: "Respecter les pentes, le lit de pose et le remblaiement par couches.",
    storage: "Stockage en tas stables, embouchures protégées.",
    safety: "Tranchées : blindage obligatoire ; produits lourds manipulés mécaniquement.",
    compatibility: ["Regard", "Caniveau", "Géotextile", "Remblai"],
  },
  amenagements_exterieurs: {
    norms: ["EN 1338 (pavés béton)", "EN 13108 (enrobés)"],
    certifications: ["Marquage CE", "Classe de résistance"],
    usage: "Prévoir la couche de fondation, la pente et le jointoiement adapté à l'usage.",
    storage: "Palettes sur aire stabilisée, à l'abri des chocs.",
    safety: "Manutention lourde : aides mécaniques, chaussures de sécurité.",
    compatibility: ["Sable", "Gravier", "Bordure", "Géotextile"],
  },
  materiaux_durables_biosources: {
    norms: ["EN 13986 (panneaux biosourcés)", "Fiches FDES"],
    certifications: ["Écolabel", "FDES / données environnementales"],
    usage: "Vérifier la traçabilité et l'aptitude à l'emploi selon la classe d'humidité.",
    storage: "À l'abri de l'humidité ; matériaux sensibles aux insectes : protection préalable.",
    safety: "Poussières végétales : extraction, masque et protection oculaire.",
    compatibility: ["Fixations", "Enduits naturels", "Isolants biosourcés"],
  },
};

const DEFAULT_GUIDE: CategoryGuide = {
  norms: ["EN / normes internationales applicables"],
  certifications: ["Conformité fabricant"],
  usage: "Respecter la notice du fabricant et les règles de l'art du lot concerné.",
  storage: "Stockage à l'abri de l'humidité, protégé des chocs et du soleil.",
  safety: "Porter les équipements de protection individuelle adaptés.",
  compatibility: [],
};

// ── Emballage / conditionnement par unité de vente ──────────────────────────

const UNIT_PACKAGING: Record<string, string> = {
  sac: "Sac — palettes filmées, à l'abri de l'humidité.",
  tonne: "Vrac ou big-bag — livraison en camion, aire de déchargement requise.",
  "m³": "Vrac — livré en benne/toupie selon le produit.",
  "m²": "Conditionné en colis/rouleaux selon le produit.",
  ml: "Conditionné en barres/rouleaux de longueurs normalisées.",
  pièce: "Unité palettisée — se référer au nombre de pièces par palette.",
  palette: "Palette complète — poids à vérifier avant livraison.",
  rouleau: "Rouleau — stockage debout, à l'abri de la chaleur.",
  cartouche: "Cartouche — conservation à température modérée.",
  pot: "Pot — refermer soigneusement après usage, à l'abri du gel.",
  bidon: "Bidon — à l'abri des flammes et du gel.",
  kg: "Conditionné au poids — sacs ou seaux selon le produit.",
  L: "Litre — bidon/pot, produit liquide à l'abri du gel.",
  barre: "Barre de longueur normalisée (souvent 12 m) — transport adapté.",
  panneau: "Panneau — transport à plat sur palettes.",
  bennes: "Benne mobilisée — livraison sur véhicule porteur.",
  boîte: "Boîte — petite unité, conditionnée en cartons.",
  jeu: "Jeu / lot complet prêt à poser.",
  kit: "Kit complet regroupant les composants nécessaires.",
};

// ── Helpers purs ─────────────────────────────────────────────────────────────

/** Extrait une dimension type « 20×20×40 » d'un libellé, sans invention. */
export function extractDimensions(name: string): string | null {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*[×xX]\s*(\d+(?:[.,]\d+)?)(?:\s*[×xX]\s*(\d+(?:[.,]\d+)?))?/);
  if (!match) return null;
  const parts = [match[1], match[2], match[3]].filter(Boolean) as string[];
  return `${parts.map((p) => p.replace(",", ".")).join(" × ")} cm`;
}

/** Emballage dérivé de l'unité, avec repli génériques. */
export function packagingForUnit(unit: string): string {
  return (
    UNIT_PACKAGING[unit] ??
    UNIT_PACKAGING[unit.toLowerCase()] ??
    "Conditionnement standard — se référer à la fiche du fabricant."
  );
}

/** Fiche complète, surchargée par les valeurs admin si présentes. */
export function buildMaterialProfile(input: MaterialProfileInput): MaterialProfile {
  const categorySlug = normalizeMaterialCategory(input.category);
  const categoryLabel = MATERIAL_CATEGORY_LABELS[categorySlug] || input.category;
  const guide = CATEGORY_GUIDES[categorySlug] ?? DEFAULT_GUIDE;

  const derivedCharacteristics: MaterialCharacteristic[] = [];
  const dimensions = extractDimensions(input.name);
  if (dimensions) derivedCharacteristics.push({ label: "Dimensions", value: dimensions });
  derivedCharacteristics.push({ label: "Unité de vente", value: input.unit });
  if (input.subcategory) derivedCharacteristics.push({ label: "Sous-catégorie", value: input.subcategory });
  if (input.brand) derivedCharacteristics.push({ label: "Marque", value: input.brand });
  if (input.manufacturer) derivedCharacteristics.push({ label: "Fabricant", value: input.manufacturer });
  if (input.sku) derivedCharacteristics.push({ label: "Référence", value: input.sku });
  if (input.region) derivedCharacteristics.push({ label: "Région", value: input.region });
  if (input.priceQuality) {
    derivedCharacteristics.push({
      label: "Qualité du prix",
      value:
        input.priceQuality === "observé_en_ligne"
          ? "Prix observé en ligne"
          : input.priceQuality === "publication_2026"
            ? "Publication officielle 2026"
            : "Estimation indicative",
    });
  }
  if (input.availability) {
    derivedCharacteristics.push({
      label: "Disponibilité",
      value:
        input.availability === "disponible"
          ? "Disponible"
          : input.availability === "sur_commande"
            ? "Sur commande"
            : "Rupture",
    });
  }

  const characteristics = mergeCharacteristics(
    derivedCharacteristics,
    input.characteristics ?? undefined,
  );

  const enriched =
    (input.characteristics?.length ?? 0) > 0 ||
    (input.certifications?.length ?? 0) > 0 ||
    (input.norms?.length ?? 0) > 0 ||
    !!input.packaging ||
    !!input.usageAdvice ||
    !!input.storageAdvice ||
    !!input.safetyAdvice ||
    (input.compatibility?.length ?? 0) > 0 ||
    !!input.technicalSheetUrl;

  const documentation: MaterialProfile["documentation"] = [
    { type: "fiche_technique", label: "Fiche technique", url: input.technicalSheetUrl ?? undefined },
    { type: "certificat", label: "Certificats & conformité" },
    { type: "notice", label: "Notice de mise en œuvre" },
  ];

  return {
    categorySlug,
    categoryLabel,
    characteristics,
    norms: input.norms?.length ? input.norms : guide.norms,
    certifications: input.certifications?.length ? input.certifications : guide.certifications,
    packaging: input.packaging || packagingForUnit(input.unit),
    usageAdvice: input.usageAdvice || guide.usage,
    storageAdvice: input.storageAdvice || guide.storage,
    safetyAdvice: input.safetyAdvice || guide.safety,
    compatibility: input.compatibility?.length ? input.compatibility : guide.compatibility,
    documentation,
    enriched,
  };
}

/** Fusionne les caractéristiques dérivées et les surcharges admin (par label). */
export function mergeCharacteristics(
  derived: MaterialCharacteristic[],
  overrides?: MaterialCharacteristic[],
): MaterialCharacteristic[] {
  if (!overrides?.length) return derived;
  const map = new Map<string, string>();
  for (const c of derived) map.set(c.label, c.value);
  for (const c of overrides) map.set(c.label, c.value);
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** Fiche enrichie d'un matériau (sans contexte utilisateur). */
export const getMaterialProfile = query({
  args: { id: v.id("materialPrices") },
  handler: async (ctx, args) => {
    const material = await ctx.db.get(args.id);
    if (!material) return null;
    return { profile: buildMaterialProfile(material), name: material.name };
  },
});

/** Détail complet : fiche + historique + offres + matériaux similaires + stats. */
export const getMaterialDetail = query({
  args: { id: v.id("materialPrices") },
  handler: async (ctx, args) => {
    const material = await ctx.db.get(args.id);
    if (!material) return null;

    const history = await ctx.db
      .query("priceHistory")
      .withIndex("by_material", (q) => q.eq("materialPriceId", args.id))
      .order("desc")
      .take(36);
    const ordered = history.slice().reverse(); // du plus ancien au plus récent

    const offers = await ctx.db
      .query("materialOffers")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();

    const sameCategory = await ctx.db
      .query("materialPrices")
      .withIndex("by_category", (q) => q.eq("category", material.category))
      .take(40);
    const similar = sameCategory.filter((m) => m._id !== material._id).slice(0, 6);

    // Statistiques de prix : min / max historiques + variation vs dernière valeur.
    const prices = ordered.map((h) => h.newPrice);
    const minPrice = prices.length ? Math.min(...prices, material.unitPrice) : material.unitPrice;
    const maxPrice = prices.length ? Math.max(...prices, material.unitPrice) : material.unitPrice;
    const firstPrice = ordered.length ? ordered[0].previousPrice : material.unitPrice;
    const changeAbs = material.unitPrice - firstPrice;
    const changePct = firstPrice > 0 ? (changeAbs / firstPrice) * 100 : 0;
    const lastChangeAt = ordered.length ? ordered[ordered.length - 1].changedAt : material.lastUpdated;

    // Variation sur 30 jours glissants.
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = ordered.filter((h) => h.changedAt >= cutoff);
    const change30dPct = recent.length
      ? ((material.unitPrice - recent[0].previousPrice) /
          Math.max(1e-9, recent[0].previousPrice)) *
        100
      : 0;

    return {
      material,
      profile: buildMaterialProfile(material),
      history: ordered.map((h) => ({
        previousPrice: h.previousPrice,
        newPrice: h.newPrice,
        changedAt: h.changedAt,
      })),
      offers: offers
        .slice()
        .sort((a, b) => a.avgPrice - b.avgPrice)
        .map((o) => ({
          supplier: o.supplier,
          city: o.city,
          governorate: o.governorate,
          minPrice: o.minPrice,
          avgPrice: o.avgPrice,
          maxPrice: o.maxPrice,
          availability: o.availability,
          sourceType: o.sourceType,
          reliabilityIndex: o.reliabilityIndex,
        })),
      similar: similar.map((m) => ({
        _id: m._id,
        name: m.name,
        unit: m.unit,
        unitPrice: m.unitPrice,
        currency: m.currency,
        subcategory: m.subcategory,
        brand: m.brand,
      })),
      stats: {
        minPrice,
        maxPrice,
        firstPrice,
        latestPrice: material.unitPrice,
        changeAbs,
        changePct,
        change30dPct,
        lastChangeAt,
        points: [
          ...(ordered.length
            ? [{ price: ordered[0].previousPrice, at: ordered[0].changedAt }]
            : [{ price: material.unitPrice, at: material.lastUpdated }]),
          ...ordered.map((h) => ({ price: h.newPrice, at: h.changedAt })),
        ],
      },
    };
  },
});
