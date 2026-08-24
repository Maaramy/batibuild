// ============================================================================
// CATALOGUE OFFICIEL 2026 — Base de données des matériaux de construction,
// Tunisie (version du 14 août 2026). 26 catégories officielles.
// Source : https://docs.google.com/spreadsheets/d/1NE4mea4E-ELRiL2tSgvkqwOOhtaDu8bb
// priceQuality : observé_en_ligne | publication_2026 | estimation_indicative
// Paramètres TVA 19%, remise gros 7%, seuil alerte 30 j, critique 60 j.
// ============================================================================

export type CatalogItem = {
  category: string;
  name: string;
  unit: string;
  unitPrice: number;
  quality?: "observé_en_ligne" | "publication_2026" | "estimation_indicative";
  confidence?: number;
  subcategory?: string;
  catCode?: string;
  attributes?: string;
};

const OBSERVED = "observé_en_ligne" as const;
const PUBLISHED = "publication_2026" as const;
const ESTIMATED = "estimation_indicative" as const;

// ── Nomenclature officielle 26 catégories (Base matériaux Tunisie 2026) ────
export const CATEGORIES_NOMENCLATURE: Array<{
  code: string;
  id: string;
  label: string;
  description: string;
  units: string;
  attributes: string;
  updateFrequency: string;
  refCount: number;
  observedCount: number;
  highConfidenceCount: number;
  avgPriceTTC: number;
}> = [
  { code: "CAT-01", id: "terrassement_granulats", label: "Terrassement et granulats", description: "Terres, remblais, sables, graviers et pierres", units: "m³; t; sac", attributes: "Granulométrie, propreté, LA/MDE, ES", updateFrequency: "Hebdomadaire / devis transport", refCount: 17, observedCount: 0, highConfidenceCount: 0, avgPriceTTC: 45.324 },
  { code: "CAT-02", id: "liants_ciments_mortiers", label: "Liants, ciments et mortiers", description: "Ciments, chaux, plâtre et mortiers industriels", units: "sac; kg; t", attributes: "Classe, résistance, temps de prise", updateFrequency: "Hebdomadaire pour ciment; 30 j autres", refCount: 19, observedCount: 5, highConfidenceCount: 2, avgPriceTTC: 54.266 },
  { code: "CAT-03", id: "betons_prefabrication", label: "Bétons et préfabrication", description: "BPE, blocs, pavés, bordures, regards", units: "m³; U; m²; ml", attributes: "Classe béton, consistance, charge", updateFrequency: "Devis chantier ≤15 j", refCount: 22, observedCount: 3, highConfidenceCount: 3, avgPriceTTC: 123.387 },
  { code: "CAT-04", id: "acier_metaux_structure", label: "Acier et métaux de structure", description: "Armatures, treillis, profilés, tôles", units: "t; kg; barre; panneau; ml", attributes: "Nuance, diamètre, certificat, revêtement", updateFrequency: "Hebdomadaire", refCount: 26, observedCount: 8, highConfidenceCount: 2, avgPriceTTC: 152.906 },
  { code: "CAT-05", id: "maconnerie_plancher", label: "Maçonnerie et éléments de plancher", description: "Briques, blocs, hourdis, poutrelles", units: "U; palette; ml; m²", attributes: "Dimensions, résistance, absorption", updateFrequency: "15–30 j", refCount: 21, observedCount: 5, highConfidenceCount: 0, avgPriceTTC: 5.573 },
  { code: "CAT-06", id: "bois_panneaux_coffrage", label: "Bois, panneaux et coffrage", description: "Bois massif, panneaux et systèmes de coffrage", units: "m³; panneau; ml; U", attributes: "Classe bois, humidité, collage", updateFrequency: "30 j", refCount: 24, observedCount: 9, highConfidenceCount: 9, avgPriceTTC: 388.384 },
  { code: "CAT-07", id: "etancheite_protection", label: "Étanchéité et protection", description: "Membranes, SEL, mastics et joints", units: "m²; rouleau; kg; L; ml", attributes: "Épaisseur, armature, mouvement, UV", updateFrequency: "30 j", refCount: 20, observedCount: 7, highConfidenceCount: 7, avgPriceTTC: 76.809 },
  { code: "CAT-08", id: "isolation_thermique", label: "Isolation thermique et acoustique", description: "EPS, XPS, laines, mousses et acoustique", units: "m²; m³; paquet", attributes: "Lambda, R, densité, réaction au feu", updateFrequency: "30 j", refCount: 18, observedCount: 3, highConfidenceCount: 3, avgPriceTTC: 32.306 },
  { code: "CAT-09", id: "cloisons_platre_plafonds", label: "Cloisons, plâtre et plafonds", description: "Plaques, ossatures et faux plafonds", units: "plaque; m²; ml; U", attributes: "Type A/H/F, épaisseur, feu, acoustique", updateFrequency: "30 j", refCount: 21, observedCount: 4, highConfidenceCount: 4, avgPriceTTC: 43.126 },
  { code: "CAT-10", id: "toitures_bardages_facades", label: "Toitures, bardages et façades", description: "Bacs, panneaux sandwich, tuiles, parements", units: "m²; ml; U", attributes: "Épaisseur, U, corrosion, feu", updateFrequency: "30 j / devis", refCount: 15, observedCount: 1, highConfidenceCount: 1, avgPriceTTC: 72.81 },
  { code: "CAT-11", id: "revetements_sols_murs", label: "Revêtements de sols et murs", description: "Céramique, pierre, parquet et sols souples", units: "m²; boîte; ml", attributes: "Absorption, PEI, glissance, calibre", updateFrequency: "30 j", refCount: 29, observedCount: 9, highConfidenceCount: 8, avgPriceTTC: 59.292 },
  { code: "CAT-12", id: "peintures_enduits_finitions", label: "Peintures, enduits et finitions", description: "Peintures, impressions, enduits et décoration", units: "L; kg; seau; rouleau", attributes: "Résine, COV, rendement, lavabilité", updateFrequency: "30 j", refCount: 24, observedCount: 7, highConfidenceCount: 7, avgPriceTTC: 90.334 },
  { code: "CAT-13", id: "menuiseries", label: "Menuiseries", description: "Aluminium, PVC, bois, portes et volets", units: "U; m²; ml", attributes: "Profil, AEV, Uw, quincaillerie", updateFrequency: "Devis 15–30 j", refCount: 23, observedCount: 6, highConfidenceCount: 0, avgPriceTTC: 1018.893 },
  { code: "CAT-14", id: "vitrage_verriers", label: "Vitrage et produits verriers", description: "Verre float, trempé, feuilleté et isolant", units: "m²; U", attributes: "Épaisseur, sécurité, Ug", updateFrequency: "Devis 30 j", refCount: 11, observedCount: 1, highConfidenceCount: 1, avgPriceTTC: 113.25 },
  { code: "CAT-15", id: "chimie_construction", label: "Chimie de construction", description: "Adjuvants, cure, réparation, scellement", units: "kg; L; kit", attributes: "Dosage, résistance, DPU", updateFrequency: "30 j", refCount: 1, observedCount: 1, highConfidenceCount: 1, avgPriceTTC: 260.438 },
  { code: "CAT-16", id: "quincaillerie_fixations", label: "Quincaillerie et fixations", description: "Vis, chevilles, serrures et consommables", units: "U; boîte; kg", attributes: "Matière, classe, charge, traitement", updateFrequency: "30 j", refCount: 14, observedCount: 2, highConfidenceCount: 2, avgPriceTTC: 33.335 },
  { code: "CAT-17", id: "plomberie_evacuation", label: "Plomberie et évacuation", description: "PVC, PEHD, PEX, multicouche, cuivre, vannes", units: "ml; barre; U", attributes: "DN, PN/SN/SDR, température", updateFrequency: "30 j", refCount: 33, observedCount: 0, highConfidenceCount: 0, avgPriceTTC: 0 },
  { code: "CAT-18", id: "sanitaires_robinetterie", label: "Sanitaires et robinetterie", description: "Appareils sanitaires, mitigeurs et chauffe-eau", units: "U; kit", attributes: "Dimensions, garantie, débit", updateFrequency: "30 j", refCount: 27, observedCount: 0, highConfidenceCount: 0, avgPriceTTC: 0 },
  { code: "CAT-19", id: "electricite_courants_forts", label: "Électricité – courants forts", description: "Câbles, gaines, protection et appareillage", units: "ml; bobine; U", attributes: "Section, tension, IP/IK, pouvoir coupure", updateFrequency: "30 j; cuivre hebdomadaire", refCount: 38, observedCount: 0, highConfidenceCount: 0, avgPriceTTC: 0 },
  { code: "CAT-20", id: "eclairage", label: "Éclairage", description: "Lampes, spots, luminaires et sécurité", units: "U; rouleau", attributes: "Flux, IRC, IP, garantie", updateFrequency: "30 j", refCount: 14, observedCount: 3, highConfidenceCount: 2, avgPriceTTC: 70.599 },
  { code: "CAT-21", id: "cvc_chauffage_ventilation", label: "CVC, chauffage et ventilation", description: "Climatisation, chauffage, gaines et ventilation", units: "U; ml; m²", attributes: "Puissance, rendement, débit, fluide", updateFrequency: "30 j / devis", refCount: 16, observedCount: 4, highConfidenceCount: 2, avgPriceTTC: 1762.162 },
  { code: "CAT-22", id: "energies_renouvelables", label: "Énergies renouvelables", description: "Photovoltaïque, stockage et solaire thermique", units: "U; kit; système", attributes: "Puissance, rendement, certification", updateFrequency: "30 j / devis", refCount: 15, observedCount: 3, highConfidenceCount: 0, avgPriceTTC: 1970.164 },
  { code: "CAT-23", id: "securite_incendie_surete", label: "Sécurité incendie et sûreté", description: "Extinction, détection, signalisation et CCTV", units: "U; kit", attributes: "Certification système, maintenance", updateFrequency: "30 j / devis", refCount: 11, observedCount: 1, highConfidenceCount: 1, avgPriceTTC: 463.479 },
  { code: "CAT-24", id: "voirie_reseaux_drainage", label: "Voirie, réseaux divers et drainage", description: "Canalisations, fonte, géotextiles, drainage", units: "ml; m²; U", attributes: "SN/PN, classe de charge, résistance", updateFrequency: "15–30 j", refCount: 13, observedCount: 0, highConfidenceCount: 0, avgPriceTTC: 138.5 },
  { code: "CAT-25", id: "amenagements_exterieurs", label: "Aménagements extérieurs", description: "Clôtures, terrasses, portails et paysage", units: "ml; m²; U", attributes: "Corrosion, UV, usage extérieur", updateFrequency: "30 j / devis", refCount: 11, observedCount: 0, highConfidenceCount: 0, avgPriceTTC: 847.045 },
  { code: "CAT-26", id: "materiaux_durables_biosources", label: "Matériaux durables et biosourcés", description: "Solutions biosourcées, recyclées et bas carbone", units: "Unité propre", attributes: "Contenu recyclé, EPD, réaction feu", updateFrequency: "Devis / disponibilité", refCount: 8, observedCount: 0, highConfidenceCount: 0, avgPriceTTC: 443.438 },
];

// ── Paramètres officiels ──
export const CATALOG_PARAMS = {
  tva: 0.19,
  remiseGros: 0.07,
  seuilAlerteJours: 30,
  seuilCritiqueJours: 60,
  devise: "TND",
  consolidationDate: "2026-08-14",
  minDevis: 3,
} as const;

export const TUNISIA_2026_CATALOG: CatalogItem[] = [
  // ── Terrassement et granulats ──────────────────────────────────────────────
  { category: "terrassement_granulats", name: "Sable de construction 0/4", unit: "m³", unitPrice: 36, quality: OBSERVED, confidence: 0.9 },
  { category: "terrassement_granulats", name: "Sable fin lavé", unit: "m³", unitPrice: 32, quality: OBSERVED, confidence: 0.85 },
  { category: "terrassement_granulats", name: "Sable de remblai", unit: "m³", unitPrice: 22.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "terrassement_granulats", name: "Gravier concassé 8/15", unit: "m³", unitPrice: 38.4, quality: OBSERVED, confidence: 0.85 },
  { category: "terrassement_granulats", name: "Gravier concassé 15/25", unit: "m³", unitPrice: 41.6, quality: OBSERVED, confidence: 0.85 },
  { category: "terrassement_granulats", name: "Tout-venant 0/31.5", unit: "m³", unitPrice: 28, quality: ESTIMATED, confidence: 0.6 },
  { category: "terrassement_granulats", name: "Granulat concassé 0/63", unit: "m³", unitPrice: 30.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "terrassement_granulats", name: "Cailloux roulés 20/40", unit: "m³", unitPrice: 48, quality: ESTIMATED, confidence: 0.5 },
  { category: "terrassement_granulats", name: "Terre végétale (apport)", unit: "m³", unitPrice: 28, quality: ESTIMATED, confidence: 0.6 },
  { category: "terrassement_granulats", name: "Argile plastique", unit: "m³", unitPrice: 24, quality: ESTIMATED, confidence: 0.5 },
  { category: "terrassement_granulats", name: "Remblai compacté (fourniture + pose)", unit: "m³", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },
  { category: "terrassement_granulats", name: "Fouilles en rigole", unit: "m³", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "terrassement_granulats", name: "Terrassement mécanique", unit: "m³", unitPrice: 20, quality: ESTIMATED, confidence: 0.55 },
  { category: "terrassement_granulats", name: "Nivellement et compactage", unit: "m²", unitPrice: 4.8, quality: ESTIMATED, confidence: 0.5 },
  { category: "terrassement_granulats", name: "Évacuation terre (benne 8 m³)", unit: "bennes", unitPrice: 160, quality: ESTIMATED, confidence: 0.55 },
  { category: "terrassement_granulats", name: "Géotextile anti-contaminant", unit: "m²", unitPrice: 2.8, quality: ESTIMATED, confidence: 0.5 },
  { category: "terrassement_granulats", name: "Tranchée drainante (grave 20/40)", unit: "ml", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.5 },

  // ── Liants, ciments et mortiers ────────────────────────────────────────────
  { category: "liants_ciments_mortiers", name: "Ciment CPJ 42.5 (sac 50 kg)", unit: "sac", unitPrice: 12.68, quality: OBSERVED, confidence: 0.95, subcategory: "Ciment en sac" },
  { category: "liants_ciments_mortiers", name: "Ciment CPJ 32.5 (sac 50 kg)", unit: "sac", unitPrice: 11.2, quality: OBSERVED, confidence: 0.9, subcategory: "Ciment en sac" },
  { category: "liants_ciments_mortiers", name: "Ciment CPJ 42.5 (vrac)", unit: "tonne", unitPrice: 264, quality: OBSERVED, confidence: 0.9, subcategory: "Ciment en vrac" },
  { category: "liants_ciments_mortiers", name: "Ciment blanc (sac 40 kg)", unit: "sac", unitPrice: 30.4, quality: OBSERVED, confidence: 0.85, subcategory: "Ciment blanc" },
  { category: "liants_ciments_mortiers", name: "Ciment prompt naturel", unit: "sac", unitPrice: 36, quality: ESTIMATED, confidence: 0.5 },
  { category: "liants_ciments_mortiers", name: "Chaux éteinte CL90 (sac 25 kg)", unit: "sac", unitPrice: 22.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "liants_ciments_mortiers", name: "Mortier sec prêt à gâcher (sac 25 kg)", unit: "sac", unitPrice: 17.6, quality: PUBLISHED, confidence: 0.7 },
  { category: "liants_ciments_mortiers", name: "Mortier de ciment colle (sac 25 kg)", unit: "sac", unitPrice: 12.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "liants_ciments_mortiers", name: "Enduit de ciment bâtard (sac 25 kg)", unit: "sac", unitPrice: 12, quality: ESTIMATED, confidence: 0.55 },
  { category: "liants_ciments_mortiers", name: "Plâtre de construction (sac 40 kg)", unit: "sac", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "liants_ciments_mortiers", name: "Ciment réfractaire (sac 25 kg)", unit: "sac", unitPrice: 36, quality: ESTIMATED, confidence: 0.5 },
  { category: "liants_ciments_mortiers", name: "Adjuvant plastifiant béton", unit: "L", unitPrice: 20, quality: ESTIMATED, confidence: 0.5 },
  { category: "liants_ciments_mortiers", name: "Hydrofuge de masse (sac 25 kg)", unit: "sac", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.5 },
  { category: "liants_ciments_mortiers", name: "Accélérateur de prise", unit: "L", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.45 },
  { category: "liants_ciments_mortiers", name: "Retardateur de prise", unit: "L", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.45 },
  { category: "liants_ciments_mortiers", name: "Produit de cure du béton", unit: "L", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.45 },
  { category: "liants_ciments_mortiers", name: "Liège expansé (sac 100 L)", unit: "sac", unitPrice: 36, quality: ESTIMATED, confidence: 0.5 },
  { category: "liants_ciments_mortiers", name: "Sable à maçonner dosé (sac)", unit: "sac", unitPrice: 7.2, quality: ESTIMATED, confidence: 0.5 },
  { category: "liants_ciments_mortiers", name: "Ciment-colle flexible (sac 25 kg)", unit: "sac", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.6 },

  // ── Bétons et préfabrication ───────────────────────────────────────────────
  { category: "betons_prefabrication", name: "Béton prêt à l'emploi 250 kg/m³", unit: "m³", unitPrice: 168, quality: OBSERVED, confidence: 0.85 },
  { category: "betons_prefabrication", name: "Béton prêt à l'emploi 300 kg/m³", unit: "m³", unitPrice: 188, quality: OBSERVED, confidence: 0.85 },
  { category: "betons_prefabrication", name: "Béton prêt à l'emploi 350 kg/m³", unit: "m³", unitPrice: 212, quality: OBSERVED, confidence: 0.85 },
  { category: "betons_prefabrication", name: "Béton de propreté 150 kg/m³", unit: "m³", unitPrice: 72, quality: ESTIMATED, confidence: 0.6 },
  { category: "betons_prefabrication", name: "Béton auto-plaçant BAP", unit: "m³", unitPrice: 248, quality: ESTIMATED, confidence: 0.55 },
  { category: "betons_prefabrication", name: "Béton fibreux", unit: "m³", unitPrice: 224, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Béton léger cellulaire", unit: "m³", unitPrice: 200, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Bloc béton creux 20×20×40", unit: "pièce", unitPrice: 0.92, quality: OBSERVED, confidence: 0.8, subcategory: "Blocs en béton" },
  { category: "betons_prefabrication", name: "Bloc béton plein 20×20×40", unit: "pièce", unitPrice: 1.44, quality: ESTIMATED, confidence: 0.6 },
  { category: "betons_prefabrication", name: "Hourdis béton 16×20×50", unit: "pièce", unitPrice: 1.52, quality: OBSERVED, confidence: 0.8, subcategory: "Hourdis" },
  { category: "betons_prefabrication", name: "Entrevous plancher", unit: "pièce", unitPrice: 1.76, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Poutrelle préfabriquée (ml)", unit: "ml", unitPrice: 11.2, quality: ESTIMATED, confidence: 0.55 },
  { category: "betons_prefabrication", name: "Dalle alvéolaire précontrainte", unit: "m²", unitPrice: 68, quality: ESTIMATED, confidence: 0.55 },
  { category: "betons_prefabrication", name: "Poutre béton préfabriquée", unit: "ml", unitPrice: 48, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Poteau béton préfabriqué", unit: "pièce", unitPrice: 96, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Escalier béton préfabriqué", unit: "pièce", unitPrice: 640, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Bordure béton préfabriquée", unit: "ml", unitPrice: 7.2, quality: ESTIMATED, confidence: 0.55 },
  { category: "betons_prefabrication", name: "Caniveau béton préfabriqué", unit: "ml", unitPrice: 20, quality: ESTIMATED, confidence: 0.55 },
  { category: "betons_prefabrication", name: "Regard béton préfabriqué Ø60", unit: "pièce", unitPrice: 144, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Plot béton 20×20×40", unit: "pièce", unitPrice: 2.0, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Dallette béton 40×40", unit: "pièce", unitPrice: 1.76, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Murette béton préfabriquée (ml)", unit: "ml", unitPrice: 28, quality: ESTIMATED, confidence: 0.5 },

  // ── Acier et métaux de structure ───────────────────────────────────────────
  { category: "acier_metaux_structure", name: "Fer à béton HA T6 (barre 12 m)", unit: "barre", unitPrice: 8.8, quality: OBSERVED, confidence: 0.85, subcategory: "Barres HA" },
  { category: "acier_metaux_structure", name: "Fer à béton HA T8 (barre 12 m)", unit: "barre", unitPrice: 10.8, quality: OBSERVED, confidence: 0.85, subcategory: "Barres HA" },
  { category: "acier_metaux_structure", name: "Fer à béton HA T10 (barre 12 m)", unit: "barre", unitPrice: 16.4, quality: OBSERVED, confidence: 0.85, subcategory: "Barres HA" },
  { category: "acier_metaux_structure", name: "Fer à béton HA T12 (barre 12 m)", unit: "barre", unitPrice: 23.6, quality: OBSERVED, confidence: 0.85, subcategory: "Barres HA" },
  { category: "acier_metaux_structure", name: "Fer à béton HA T14 (barre 12 m)", unit: "barre", unitPrice: 32, quality: ESTIMATED, confidence: 0.7, subcategory: "Barres HA" },
  { category: "acier_metaux_structure", name: "Fer à béton HA T16 (barre 12 m)", unit: "barre", unitPrice: 41.6, quality: ESTIMATED, confidence: 0.7, subcategory: "Barres HA" },
  { category: "acier_metaux_structure", name: "Acier à béton T12 (tonne)", unit: "tonne", unitPrice: 3080, quality: OBSERVED, confidence: 0.9, subcategory: "Tonne" },
  { category: "acier_metaux_structure", name: "Acier à béton T14 (tonne)", unit: "tonne", unitPrice: 3160, quality: OBSERVED, confidence: 0.9, subcategory: "Tonne" },
  { category: "acier_metaux_structure", name: "Treillis soudé ST25 (panneau)", unit: "panneau", unitPrice: 36, quality: OBSERVED, confidence: 0.85, subcategory: "Treillis soudé" },
  { category: "acier_metaux_structure", name: "Treillis soudé ST20", unit: "panneau", unitPrice: 30.4, quality: ESTIMATED, confidence: 0.7, subcategory: "Treillis soudé" },
  { category: "acier_metaux_structure", name: "Treillis soudé ST50", unit: "panneau", unitPrice: 48, quality: ESTIMATED, confidence: 0.7, subcategory: "Treillis soudé" },
  { category: "acier_metaux_structure", name: "Fil d'attache recuit (kg)", unit: "kg", unitPrice: 2.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "acier_metaux_structure", name: "Cales d'enrobage béton", unit: "sac", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "acier_metaux_structure", name: "Poutrelle IPN 120", unit: "ml", unitPrice: 30.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "acier_metaux_structure", name: "Poutrelle IPN 160", unit: "ml", unitPrice: 46.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "acier_metaux_structure", name: "Poutrelle HEA 140", unit: "ml", unitPrice: 68, quality: ESTIMATED, confidence: 0.55 },
  { category: "acier_metaux_structure", name: "Tube acier carré 40×40×2", unit: "ml", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "acier_metaux_structure", name: "Cornière 30×30×3", unit: "ml", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "acier_metaux_structure", name: "Plat acier 60×6", unit: "ml", unitPrice: 16, quality: ESTIMATED, confidence: 0.55 },
  { category: "acier_metaux_structure", name: "Tôle galvanisée 10/10", unit: "m²", unitPrice: 36, quality: ESTIMATED, confidence: 0.6 },
  { category: "acier_metaux_structure", name: "Tôle perforée anti-dérapante", unit: "m²", unitPrice: 52, quality: ESTIMATED, confidence: 0.55 },
  { category: "acier_metaux_structure", name: "Électrode de soudure (kg)", unit: "kg", unitPrice: 5.2, quality: ESTIMATED, confidence: 0.55 },
  { category: "acier_metaux_structure", name: "Câble acier galvanisé Ø8", unit: "ml", unitPrice: 3.2, quality: ESTIMATED, confidence: 0.5 },
  { category: "acier_metaux_structure", name: "Goujons d'ancrage chimiques", unit: "pièce", unitPrice: 12, quality: ESTIMATED, confidence: 0.5 },
  { category: "acier_metaux_structure", name: "Grille métallique soudée (m²)", unit: "m²", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "acier_metaux_structure", name: "Antirouille métal (L)", unit: "L", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.5 },

  // ── Maçonnerie et éléments de plancher ─────────────────────────────────────
  { category: "maconnerie_plancher", name: "Brique creuse 10 cm", unit: "pièce", unitPrice: 0.38, quality: OBSERVED, confidence: 0.85, subcategory: "Briques creuses" },
  { category: "maconnerie_plancher", name: "Brique creuse 15 cm", unit: "pièce", unitPrice: 0.52, quality: OBSERVED, confidence: 0.85, subcategory: "Briques creuses" },
  { category: "maconnerie_plancher", name: "Brique alvéolaire 6 cm (noot)", unit: "pièce", unitPrice: 0.36, quality: ESTIMATED, confidence: 0.6 },
  { category: "maconnerie_plancher", name: "Brique pleine 22×11×7", unit: "pièce", unitPrice: 0.44, quality: OBSERVED, confidence: 0.8 },
  { category: "maconnerie_plancher", name: "Brique réfractaire", unit: "pièce", unitPrice: 0.96, quality: ESTIMATED, confidence: 0.5 },
  { category: "maconnerie_plancher", name: "Parpaing creux 15 cm", unit: "pièce", unitPrice: 0.88, quality: OBSERVED, confidence: 0.85, subcategory: "Parpaings" },
  { category: "maconnerie_plancher", name: "Parpaing creux 20 cm", unit: "pièce", unitPrice: 1.04, quality: OBSERVED, confidence: 0.85, subcategory: "Parpaings" },
  { category: "maconnerie_plancher", name: "Parpaing plein 20 cm", unit: "pièce", unitPrice: 1.48, quality: ESTIMATED, confidence: 0.6, subcategory: "Parpaings" },
  { category: "maconnerie_plancher", name: "Bloc à bancher 20 cm", unit: "pièce", unitPrice: 1.68, quality: ESTIMATED, confidence: 0.55 },
  { category: "maconnerie_plancher", name: "Hourdis 16×50", unit: "pièce", unitPrice: 1.02, quality: OBSERVED, confidence: 0.9, subcategory: "Hourdis" },
  { category: "maconnerie_plancher", name: "Hourdis 20×50", unit: "pièce", unitPrice: 1.6, quality: ESTIMATED, confidence: 0.6, subcategory: "Hourdis" },
  { category: "maconnerie_plancher", name: "Corps creux béton 16", unit: "pièce", unitPrice: 1.2, quality: ESTIMATED, confidence: 0.55 },
  { category: "maconnerie_plancher", name: "Brique de verre 19×19", unit: "pièce", unitPrice: 4.8, quality: ESTIMATED, confidence: 0.5 },
  { category: "maconnerie_plancher", name: "Pierre de taille (m³)", unit: "m³", unitPrice: 224, quality: ESTIMATED, confidence: 0.5 },
  { category: "maconnerie_plancher", name: "Moellon (m³)", unit: "m³", unitPrice: 96, quality: ESTIMATED, confidence: 0.5 },
  { category: "maconnerie_plancher", name: "Plancher collaborant bac acier", unit: "m²", unitPrice: 44, quality: ESTIMATED, confidence: 0.55 },
  { category: "maconnerie_plancher", name: "Coffrage perdu polystyrène", unit: "m²", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "maconnerie_plancher", name: "Équerre de fixation maçonnerie", unit: "pièce", unitPrice: 0.96, quality: ESTIMATED, confidence: 0.45 },
  { category: "maconnerie_plancher", name: "Tirant métallique de chaînage", unit: "ml", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.5 },
  { category: "maconnerie_plancher", name: "Manchon anti-fissure", unit: "ml", unitPrice: 2.4, quality: ESTIMATED, confidence: 0.45 },
  { category: "maconnerie_plancher", name: "Raidisseur de plancher", unit: "pièce", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.45 },

  // ── Bois, panneaux et coffrage ─────────────────────────────────────────────
  { category: "bois_panneaux_coffrage", name: "Bois de coffrage (m³)", unit: "m³", unitPrice: 576, quality: OBSERVED, confidence: 0.85 },
  { category: "bois_panneaux_coffrage", name: "Bois de charpente (m³)", unit: "m³", unitPrice: 656, quality: OBSERVED, confidence: 0.85 },
  { category: "bois_panneaux_coffrage", name: "Chevron sapin 63×75×400", unit: "pièce", unitPrice: 11.2, quality: OBSERVED, confidence: 0.85, subcategory: "Bois de coffrage" },
  { category: "bois_panneaux_coffrage", name: "Panneau coffrage 18 mm", unit: "pièce", unitPrice: 33.6, quality: OBSERVED, confidence: 0.85, subcategory: "Panneaux" },
  { category: "bois_panneaux_coffrage", name: "Contreplaqué 15 mm", unit: "pièce", unitPrice: 44, quality: OBSERVED, confidence: 0.85 },
  { category: "bois_panneaux_coffrage", name: "Contreplaqué marine 18 mm", unit: "pièce", unitPrice: 56, quality: PUBLISHED, confidence: 0.75 },
  { category: "bois_panneaux_coffrage", name: "Panneau OSB 18 mm", unit: "pièce", unitPrice: 36, quality: OBSERVED, confidence: 0.85 },
  { category: "bois_panneaux_coffrage", name: "Panneau MDF 18 mm", unit: "pièce", unitPrice: 30.4, quality: OBSERVED, confidence: 0.8 },
  { category: "bois_panneaux_coffrage", name: "Panneau aggloméré 16 mm", unit: "pièce", unitPrice: 24, quality: ESTIMATED, confidence: 0.7 },
  { category: "bois_panneaux_coffrage", name: "Lambris bois (m²)", unit: "m²", unitPrice: 20, quality: ESTIMATED, confidence: 0.6 },
  { category: "bois_panneaux_coffrage", name: "Parquet flottant (m²)", unit: "m²", unitPrice: 28, quality: PUBLISHED, confidence: 0.7 },
  { category: "bois_panneaux_coffrage", name: "Parquet massif (m²)", unit: "m²", unitPrice: 96, quality: ESTIMATED, confidence: 0.6 },
  { category: "bois_panneaux_coffrage", name: "Parquet contrecollé (m²)", unit: "m²", unitPrice: 52, quality: ESTIMATED, confidence: 0.6 },
  { category: "bois_panneaux_coffrage", name: "Poutre bois lamellé-collé", unit: "ml", unitPrice: 200, quality: ESTIMATED, confidence: 0.55 },
  { category: "bois_panneaux_coffrage", name: "Madrier 100×100 (ml)", unit: "ml", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "bois_panneaux_coffrage", name: "Planche sapin 27×150 (ml)", unit: "ml", unitPrice: 4.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "bois_panneaux_coffrage", name: "Volige pin (ml)", unit: "ml", unitPrice: 4, quality: ESTIMATED, confidence: 0.6 },
  { category: "bois_panneaux_coffrage", name: "Tasseau 40×60 (ml)", unit: "ml", unitPrice: 3.2, quality: ESTIMATED, confidence: 0.6 },
  { category: "bois_panneaux_coffrage", name: "Latte de coffrage", unit: "ml", unitPrice: 2.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "bois_panneaux_coffrage", name: "Coffrage métallique (m²)", unit: "m²", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.5 },
  { category: "bois_panneaux_coffrage", name: "Huile de décoffrage (L)", unit: "L", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "bois_panneaux_coffrage", name: "Étai métallique réglable", unit: "pièce", unitPrice: 20, quality: ESTIMATED, confidence: 0.55 },
  { category: "bois_panneaux_coffrage", name: "Poutrelle de coffrage", unit: "pièce", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "bois_panneaux_coffrage", name: "Panneau bois imprégné (m²)", unit: "m²", unitPrice: 22.4, quality: ESTIMATED, confidence: 0.5 },

  // ── Étanchéité et protection ───────────────────────────────────────────────
  { category: "etancheite_protection", name: "Membrane bitumineuse (rouleau 10 m)", unit: "rouleau", unitPrice: 46.4, quality: OBSERVED, confidence: 0.9, subcategory: "Étanchéité toiture" },
  { category: "etancheite_protection", name: "Étanchéité liquide bitumeuse", unit: "m²", unitPrice: 17.6, quality: OBSERVED, confidence: 0.85 },
  { category: "etancheite_protection", name: "Enduit d'étanchéité cimentaire (sac 25 kg)", unit: "sac", unitPrice: 28, quality: OBSERVED, confidence: 0.85 },
  { category: "etancheite_protection", name: "Primaire d'accrochage bitumineux (L)", unit: "L", unitPrice: 12, quality: PUBLISHED, confidence: 0.75 },
  { category: "etancheite_protection", name: "Feutre bitumé armé (rouleau)", unit: "rouleau", unitPrice: 36, quality: ESTIMATED, confidence: 0.7 },
  { category: "etancheite_protection", name: "Bande d'étanchéité auto-adhésive", unit: "rouleau", unitPrice: 20, quality: ESTIMATED, confidence: 0.7 },
  { category: "etancheite_protection", name: "Mastic polyuréthane (cartouche)", unit: "cartouche", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "etancheite_protection", name: "Résine époxy (kit 4 kg)", unit: "kit", unitPrice: 208, quality: OBSERVED, confidence: 0.85, subcategory: "Chimie de construction" },
  { category: "etancheite_protection", name: "Hydrafuge (sac 25 kg)", unit: "sac", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "etancheite_protection", name: "Membrane PVC (m²)", unit: "m²", unitPrice: 28, quality: ESTIMATED, confidence: 0.6 },
  { category: "etancheite_protection", name: "Membrane EPDM (m²)", unit: "m²", unitPrice: 32, quality: ESTIMATED, confidence: 0.55 },
  { category: "etancheite_protection", name: "Géomembrane d'étanchéité (m²)", unit: "m²", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "etancheite_protection", name: "Bentonite (sac 25 kg)", unit: "sac", unitPrice: 30.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "etancheite_protection", name: "Protection gravillonnée toiture (m²)", unit: "m²", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "etancheite_protection", name: "Isolant sous membrane (m²)", unit: "m²", unitPrice: 8, quality: ESTIMATED, confidence: 0.5 },
  { category: "etancheite_protection", name: "Pare-vapeur (m²)", unit: "m²", unitPrice: 3.2, quality: ESTIMATED, confidence: 0.5 },
  { category: "etancheite_protection", name: "Gaine de descente EP Ø80 (ml)", unit: "ml", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "etancheite_protection", name: "Gouttière PVC 125 (ml)", unit: "ml", unitPrice: 7.2, quality: ESTIMATED, confidence: 0.6 },
  { category: "etancheite_protection", name: "Mastic silicone neutre", unit: "cartouche", unitPrice: 7.2, quality: ESTIMATED, confidence: 0.6 },
  { category: "etancheite_protection", name: "Scellant polyuréthane (m²)", unit: "m²", unitPrice: 28, quality: ESTIMATED, confidence: 0.55 },

  // ── Isolation thermique et acoustique ──────────────────────────────────────
  { category: "isolation_thermique", name: "Laine de verre (rouleau 30 m²)", unit: "rouleau", unitPrice: 71.2, quality: OBSERVED, confidence: 0.9, subcategory: "Isolation thermique" },
  { category: "isolation_thermique", name: "Laine de verre (m²)", unit: "m²", unitPrice: 3.2, quality: ESTIMATED, confidence: 0.6 },
  { category: "isolation_thermique", name: "Laine de roche (m²)", unit: "m²", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "isolation_thermique", name: "Polystyrène expansé PSE 4 cm (m²)", unit: "m²", unitPrice: 7.2, quality: PUBLISHED, confidence: 0.75 },
  { category: "isolation_thermique", name: "Polystyrène extrudé XPS (m²)", unit: "m²", unitPrice: 12.8, quality: PUBLISHED, confidence: 0.75 },
  { category: "isolation_thermique", name: "Panneau polyuréthane (m²)", unit: "m²", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.65 },
  { category: "isolation_thermique", name: "Panneau liège expansé (m²)", unit: "m²", unitPrice: 36, quality: ESTIMATED, confidence: 0.6 },
  { category: "isolation_thermique", name: "Fibre de bois (m²)", unit: "m²", unitPrice: 28, quality: ESTIMATED, confidence: 0.6 },
  { category: "isolation_thermique", name: "Isolant acoustique mousse (m²)", unit: "m²", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "isolation_thermique", name: "Sous-couche acoustique sol (m²)", unit: "m²", unitPrice: 4.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "isolation_thermique", name: "Isolation toiture pente (m²)", unit: "m²", unitPrice: 20.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "isolation_thermique", name: "Isolation combles soufflée (m²)", unit: "m²", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "isolation_thermique", name: "Film réfléchissant (m²)", unit: "m²", unitPrice: 8, quality: ESTIMATED, confidence: 0.55 },
  { category: "isolation_thermique", name: "Bande adhésive alu (rouleau)", unit: "rouleau", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "isolation_thermique", name: "Cheville à frapper isolation", unit: "sac", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.5 },
  { category: "isolation_thermique", name: "Enduit isolant thermique (sac)", unit: "sac", unitPrice: 22.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "isolation_thermique", name: "Perlite (sac 100 L)", unit: "sac", unitPrice: 25.6, quality: ESTIMATED, confidence: 0.5 },
  { category: "isolation_thermique", name: "Vermiculite (sac 100 L)", unit: "sac", unitPrice: 30.4, quality: ESTIMATED, confidence: 0.5 },

  // ── Cloisons, plâtre et plafonds ───────────────────────────────────────────
  { category: "cloisons_platre_plafonds", name: "Plaque placoplâtre BA13 (m²)", unit: "m²", unitPrice: 16, quality: OBSERVED, confidence: 0.85, subcategory: "Plaques de plâtre" },
  { category: "cloisons_platre_plafonds", name: "Plaque hydrofuge BA13 (m²)", unit: "m²", unitPrice: 20.8, quality: OBSERVED, confidence: 0.85 },
  { category: "cloisons_platre_plafonds", name: "Plaque ignifuge BA13 (m²)", unit: "m²", unitPrice: 22.4, quality: ESTIMATED, confidence: 0.7 },
  { category: "cloisons_platre_plafonds", name: "Plaque phonique (m²)", unit: "m²", unitPrice: 24, quality: ESTIMATED, confidence: 0.65 },
  { category: "cloisons_platre_plafonds", name: "Rail 48/70 (ml)", unit: "ml", unitPrice: 2.4, quality: PUBLISHED, confidence: 0.7 },
  { category: "cloisons_platre_plafonds", name: "Montant 48/70 (ml)", unit: "ml", unitPrice: 3.2, quality: PUBLISHED, confidence: 0.7 },
  { category: "cloisons_platre_plafonds", name: "Bande à joint (rouleau)", unit: "rouleau", unitPrice: 2.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "cloisons_platre_plafonds", name: "Enduit à joint (sac 25 kg)", unit: "sac", unitPrice: 8, quality: ESTIMATED, confidence: 0.6 },
  { category: "cloisons_platre_plafonds", name: "Plâtre (sac 40 kg)", unit: "sac", unitPrice: 12.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "cloisons_platre_plafonds", name: "Corniche en plâtre (ml)", unit: "ml", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "cloisons_platre_plafonds", name: "Rosace plafond", unit: "pièce", unitPrice: 12, quality: ESTIMATED, confidence: 0.5 },
  { category: "cloisons_platre_plafonds", name: "Faux plafond dalles 60×60 (m²)", unit: "m²", unitPrice: 20, quality: ESTIMATED, confidence: 0.65 },
  { category: "cloisons_platre_plafonds", name: "Faux plafond BA13 (m²)", unit: "m²", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "cloisons_platre_plafonds", name: "Suspente + attaches (jeu)", unit: "jeu", unitPrice: 2.0, quality: ESTIMATED, confidence: 0.55 },
  { category: "cloisons_platre_plafonds", name: "Rail de plafond 60/27 (ml)", unit: "ml", unitPrice: 2.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "cloisons_platre_plafonds", name: "Vis placo (boîte)", unit: "boîte", unitPrice: 7.2, quality: ESTIMATED, confidence: 0.55 },
  { category: "cloisons_platre_plafonds", name: "Cheville Molly (boîte)", unit: "boîte", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "cloisons_platre_plafonds", name: "Cloison alvéolaire préfabriquée (m²)", unit: "m²", unitPrice: 30.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "cloisons_platre_plafonds", name: "Panneau de doublage isolé (m²)", unit: "m²", unitPrice: 25.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "cloisons_platre_plafonds", name: "Moulure de finition (ml)", unit: "ml", unitPrice: 4, quality: ESTIMATED, confidence: 0.5 },
  { category: "cloisons_platre_plafonds", name: "Enduit de finition projeté (sac)", unit: "sac", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.55 },

  // ── Toitures, bardages et façades ──────────────────────────────────────────
  { category: "toitures_bardages_facades", name: "Tuile canal rouge (m²)", unit: "m²", unitPrice: 15.2, quality: OBSERVED, confidence: 0.85, subcategory: "Tuiles" },
  { category: "toitures_bardages_facades", name: "Tuile mécanique (m²)", unit: "m²", unitPrice: 18.4, quality: ESTIMATED, confidence: 0.7, subcategory: "Tuiles" },
  { category: "toitures_bardages_facades", name: "Tuile béton (m²)", unit: "m²", unitPrice: 20, quality: ESTIMATED, confidence: 0.65 },
  { category: "toitures_bardages_facades", name: "Bac acier nervuré (m²)", unit: "m²", unitPrice: 23.2, quality: ESTIMATED, confidence: 0.65, subcategory: "Bardages" },
  { category: "toitures_bardages_facades", name: "Tôle ondulée (m²)", unit: "m²", unitPrice: 16, quality: ESTIMATED, confidence: 0.6 },
  { category: "toitures_bardages_facades", name: "Panneau sandwich (m²)", unit: "m²", unitPrice: 44, quality: ESTIMATED, confidence: 0.6 },
  { category: "toitures_bardages_facades", name: "Bardage bois (m²)", unit: "m²", unitPrice: 52, quality: ESTIMATED, confidence: 0.55 },
  { category: "toitures_bardages_facades", name: "Bardage composite (m²)", unit: "m²", unitPrice: 68, quality: ESTIMATED, confidence: 0.55 },
  { category: "toitures_bardages_facades", name: "Façade vitrée (m²)", unit: "m²", unitPrice: 176, quality: ESTIMATED, confidence: 0.5 },
  { category: "toitures_bardages_facades", name: "Faîtage (ml)", unit: "ml", unitPrice: 4.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "toitures_bardages_facades", name: "Sous-toiture film (m²)", unit: "m²", unitPrice: 3.2, quality: ESTIMATED, confidence: 0.55 },
  { category: "toitures_bardages_facades", name: "Liteau bois (ml)", unit: "ml", unitPrice: 2.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "toitures_bardages_facades", name: "Chatière / lanterneau", unit: "pièce", unitPrice: 144, quality: ESTIMATED, confidence: 0.5 },
  { category: "toitures_bardages_facades", name: "Écran de sous-toiture HPV (m²)", unit: "m²", unitPrice: 2.8, quality: ESTIMATED, confidence: 0.5 },
  { category: "toitures_bardages_facades", name: "Fixations bac acier (jeu)", unit: "jeu", unitPrice: 3.2, quality: ESTIMATED, confidence: 0.5 },

  // ── Revêtements de sols et murs ────────────────────────────────────────────
  { category: "revetements_sols_murs", name: "Carrelage grès cérame 60×60 (m²)", unit: "m²", unitPrice: 20.8, quality: OBSERVED, confidence: 0.85, subcategory: "Grès cérame" },
  { category: "revetements_sols_murs", name: "Carrelage sol 40×40 (m²)", unit: "m²", unitPrice: 17.6, quality: OBSERVED, confidence: 0.85 },
  { category: "revetements_sols_murs", name: "Carrelage émaillé 33×33 (m²)", unit: "m²", unitPrice: 19.2, quality: ESTIMATED, confidence: 0.7 },
  { category: "revetements_sols_murs", name: "Carrelage grand format 80×80 (m²)", unit: "m²", unitPrice: 30.4, quality: ESTIMATED, confidence: 0.7 },
  { category: "revetements_sols_murs", name: "Carrelage extérieur antidérapant (m²)", unit: "m²", unitPrice: 25.6, quality: PUBLISHED, confidence: 0.75 },
  { category: "revetements_sols_murs", name: "Faïence murale 25×40 (m²)", unit: "m²", unitPrice: 15.2, quality: OBSERVED, confidence: 0.85, subcategory: "Faïence" },
  { category: "revetements_sols_murs", name: "Faïence 20×30 (m²)", unit: "m²", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.7 },
  { category: "revetements_sols_murs", name: "Marbre importé (m²)", unit: "m²", unitPrice: 96, quality: OBSERVED, confidence: 0.85, subcategory: "Marbre" },
  { category: "revetements_sols_murs", name: "Marbre local Thala (m²)", unit: "m²", unitPrice: 68, quality: ESTIMATED, confidence: 0.65 },
  { category: "revetements_sols_murs", name: "Granit (m²)", unit: "m²", unitPrice: 108, quality: ESTIMATED, confidence: 0.6 },
  { category: "revetements_sols_murs", name: "Pierre naturelle (m²)", unit: "m²", unitPrice: 68, quality: ESTIMATED, confidence: 0.6, subcategory: "Pierre" },
  { category: "revetements_sols_murs", name: "Travertin (m²)", unit: "m²", unitPrice: 76, quality: ESTIMATED, confidence: 0.55 },
  { category: "revetements_sols_murs", name: "Mosaïque (m²)", unit: "m²", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },
  { category: "revetements_sols_murs", name: "Tomette (m²)", unit: "m²", unitPrice: 44, quality: ESTIMATED, confidence: 0.55 },
  { category: "revetements_sols_murs", name: "Plinthe céramique (ml)", unit: "ml", unitPrice: 6.4, quality: OBSERVED, confidence: 0.8 },
  { category: "revetements_sols_murs", name: "Béton ciré (m²)", unit: "m²", unitPrice: 72, quality: ESTIMATED, confidence: 0.6 },
  { category: "revetements_sols_murs", name: "Résine sol (m²)", unit: "m²", unitPrice: 60, quality: ESTIMATED, confidence: 0.6 },
  { category: "revetements_sols_murs", name: "Stratifié sol (m²)", unit: "m²", unitPrice: 22.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "revetements_sols_murs", name: "Lino PVC (m²)", unit: "m²", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "revetements_sols_murs", name: "Moquette (m²)", unit: "m²", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "revetements_sols_murs", name: "Colle carrelage (sac 25 kg)", unit: "sac", unitPrice: 12.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "revetements_sols_murs", name: "Joint carrelage (sac 5 kg)", unit: "sac", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "revetements_sols_murs", name: "Croisillons carrelage (boîte)", unit: "boîte", unitPrice: 2.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "revetements_sols_murs", name: "Pavé autobloquant (m²)", unit: "m²", unitPrice: 25.6, quality: OBSERVED, confidence: 0.8, subcategory: "Pavés" },
  { category: "revetements_sols_murs", name: "Dalle gazon (m²)", unit: "m²", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "revetements_sols_murs", name: "Revêtement piscine mosaïque (m²)", unit: "m²", unitPrice: 44, quality: ESTIMATED, confidence: 0.6, subcategory: "Revêtement" },
  { category: "revetements_sols_murs", name: "Enduit décoratif (m²)", unit: "m²", unitPrice: 20, quality: ESTIMATED, confidence: 0.55 },
  { category: "revetements_sols_murs", name: "Soubassement pierre (m²)", unit: "m²", unitPrice: 56, quality: ESTIMATED, confidence: 0.5 },
  { category: "revetements_sols_murs", name: "Marche d'escalier granit", unit: "pièce", unitPrice: 72, quality: ESTIMATED, confidence: 0.55 },

  // ── Peintures, enduits et finitions ────────────────────────────────────────
  { category: "peintures_enduits_finitions", name: "Peinture acrylique blanche (pot 15 L)", unit: "pot", unitPrice: 54.4, quality: OBSERVED, confidence: 0.85, subcategory: "Peinture intérieure" },
  { category: "peintures_enduits_finitions", name: "Peinture intérieure mate (L)", unit: "L", unitPrice: 17.6, quality: OBSERVED, confidence: 0.85 },
  { category: "peintures_enduits_finitions", name: "Peinture extérieure acrylique (L)", unit: "L", unitPrice: 20.8, quality: OBSERVED, confidence: 0.85 },
  { category: "peintures_enduits_finitions", name: "Peinture à l'huile (pot 5 L)", unit: "pot", unitPrice: 44, quality: OBSERVED, confidence: 0.8 },
  { category: "peintures_enduits_finitions", name: "Primaire d'accrochage (L)", unit: "L", unitPrice: 14.4, quality: PUBLISHED, confidence: 0.75 },
  { category: "peintures_enduits_finitions", name: "Sous-couche universelle (L)", unit: "L", unitPrice: 12, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Vernis bois (L)", unit: "L", unitPrice: 28, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Laque glycérophtalique (L)", unit: "L", unitPrice: 32, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Peinture anti-humidité (L)", unit: "L", unitPrice: 22.4, quality: ESTIMATED, confidence: 0.65 },
  { category: "peintures_enduits_finitions", name: "Peinture anti-moisissure (L)", unit: "L", unitPrice: 24, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Peinture spéciale métal (L)", unit: "L", unitPrice: 25.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Peinture écologique (L)", unit: "L", unitPrice: 36, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Enduit de lissage (kg)", unit: "kg", unitPrice: 0.96, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Enduit projeté (sac 25 kg)", unit: "sac", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Enduit de façade (sac 25 kg)", unit: "sac", unitPrice: 12.8, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Crépis décoratif (sac 25 kg)", unit: "sac", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "peintures_enduits_finitions", name: "Gobetis (sac 25 kg)", unit: "sac", unitPrice: 8, quality: ESTIMATED, confidence: 0.55 },
  { category: "peintures_enduits_finitions", name: "Peinture de sol (L)", unit: "L", unitPrice: 28, quality: ESTIMATED, confidence: 0.55 },
  { category: "peintures_enduits_finitions", name: "Peinture acrylique façade (L)", unit: "L", unitPrice: 24, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Peinture satinée lessivable (L)", unit: "L", unitPrice: 20, quality: ESTIMATED, confidence: 0.6 },
  { category: "peintures_enduits_finitions", name: "Enduit graté (sac 25 kg)", unit: "sac", unitPrice: 16, quality: ESTIMATED, confidence: 0.55 },
  { category: "peintures_enduits_finitions", name: "Bande de calicot (rouleau)", unit: "rouleau", unitPrice: 4, quality: ESTIMATED, confidence: 0.5 },
  { category: "peintures_enduits_finitions", name: "Papier peint (rouleau)", unit: "rouleau", unitPrice: 20, quality: ESTIMATED, confidence: 0.55 },
  { category: "peintures_enduits_finitions", name: "Peinture glycérophtalique (L)", unit: "L", unitPrice: 30.4, quality: ESTIMATED, confidence: 0.55 },

  // ── Compléments catalogue 2026 (couverture consolidée) ─────────────────────
  // Références ajoutées pour compléter la couverture par catégorie (prix
  // indicatifs du marché tunisien 2026).

  // Terrassement et granulats
  { category: "terrassement_granulats", name: "Décapage terre végétale (m²)", unit: "m²", unitPrice: 3.2, quality: ESTIMATED, confidence: 0.5, subcategory: "Terrassement" },
  { category: "terrassement_granulats", name: "Purge et remplacement de sol (m³)", unit: "m³", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },

  // Liants, ciments et mortiers
  { category: "liants_ciments_mortiers", name: "Mortier colle granit (sac 25 kg)", unit: "sac", unitPrice: 19.2, quality: ESTIMATED, confidence: 0.55 },
  { category: "liants_ciments_mortiers", name: "Joint hydrofuge piscine (sac 25 kg)", unit: "sac", unitPrice: 16, quality: ESTIMATED, confidence: 0.5 },

  // Bétons et préfabrication
  { category: "betons_prefabrication", name: "Dalle préfabriquée pleine (m²)", unit: "m²", unitPrice: 48, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Poteau béton armé coulé en place (ml)", unit: "ml", unitPrice: 36, quality: ESTIMATED, confidence: 0.5 },
  { category: "betons_prefabrication", name: "Chape maigre 5 cm (m²)", unit: "m²", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.55 },

  // Acier et métaux de structure
  { category: "acier_metaux_structure", name: "Fer à béton HA T20 (barre 12 m)", unit: "barre", unitPrice: 65.6, quality: ESTIMATED, confidence: 0.65, subcategory: "Barres HA" },
  { category: "acier_metaux_structure", name: "Acier à béton T8 (tonne)", unit: "tonne", unitPrice: 3160, quality: ESTIMATED, confidence: 0.6, subcategory: "Tonne" },
  { category: "acier_metaux_structure", name: "Caillebotis acier galvanisé (m²)", unit: "m²", unitPrice: 68, quality: ESTIMATED, confidence: 0.55 },

  // Maçonnerie et éléments de plancher
  { category: "maconnerie_plancher", name: "Brique creuse 20 cm", unit: "pièce", unitPrice: 0.68, quality: ESTIMATED, confidence: 0.6, subcategory: "Briques creuses" },
  { category: "maconnerie_plancher", name: "Parpaing creux 10 cm", unit: "pièce", unitPrice: 0.72, quality: ESTIMATED, confidence: 0.55, subcategory: "Parpaings" },
  { category: "maconnerie_plancher", name: "Claustra béton décoratif", unit: "pièce", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.5 },

  // Bois, panneaux et coffrage
  { category: "bois_panneaux_coffrage", name: "Bastain 50×70 (ml)", unit: "ml", unitPrice: 4, quality: ESTIMATED, confidence: 0.55, subcategory: "Bois de coffrage" },
  { category: "bois_panneaux_coffrage", name: "Planche de rive bois (ml)", unit: "ml", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "bois_panneaux_coffrage", name: "Tabouret de coffrage", unit: "pièce", unitPrice: 24, quality: ESTIMATED, confidence: 0.5 },

  // Étanchéité et protection
  { category: "etancheite_protection", name: "Bande de relevé bitumineuse (ml)", unit: "ml", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "etancheite_protection", name: "Peinture bitumeuse de protection (L)", unit: "L", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.5 },

  // Isolation thermique et acoustique
  { category: "isolation_thermique", name: "Panneau PSE 6 cm (m²)", unit: "m²", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "isolation_thermique", name: "Isolation phonique sous chape (m²)", unit: "m²", unitPrice: 12, quality: ESTIMATED, confidence: 0.55 },
  { category: "isolation_thermique", name: "Isolation toiture terrasse (m²)", unit: "m²", unitPrice: 16, quality: ESTIMATED, confidence: 0.55 },

  // Cloisons, plâtre et plafonds
  { category: "cloisons_platre_plafonds", name: "Ossature métallique plafond (m²)", unit: "m²", unitPrice: 12, quality: ESTIMATED, confidence: 0.55 },
  { category: "cloisons_platre_plafonds", name: "Enduit de rebouchage (sac 5 kg)", unit: "sac", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.55 },

  // Toitures, bardages et façades
  { category: "toitures_bardages_facades", name: "Arêtier (ml)", unit: "ml", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "toitures_bardages_facades", name: "Chéneau zinc (ml)", unit: "ml", unitPrice: 36, quality: ESTIMATED, confidence: 0.5 },
  { category: "toitures_bardages_facades", name: "Enduit monocouche façade (m²)", unit: "m²", unitPrice: 24, quality: ESTIMATED, confidence: 0.55 },

  // Revêtements de sols et murs
  { category: "revetements_sols_murs", name: "Carrelage 60×60 effet marbre (m²)", unit: "m²", unitPrice: 36, quality: OBSERVED, confidence: 0.8, subcategory: "Grès cérame" },
  { category: "revetements_sols_murs", name: "Carrelage extérieur 45×45 antidérapant (m²)", unit: "m²", unitPrice: 24, quality: ESTIMATED, confidence: 0.6 },
  { category: "revetements_sols_murs", name: "Dalle pierre reconstituée (m²)", unit: "m²", unitPrice: 32, quality: ESTIMATED, confidence: 0.55 },
  { category: "revetements_sols_murs", name: "Sol sportif PVC (m²)", unit: "m²", unitPrice: 32, quality: ESTIMATED, confidence: 0.5 },

  // Peintures, enduits et finitions
  { category: "peintures_enduits_finitions", name: "Peinture plafond blanc mat (L)", unit: "L", unitPrice: 14.4, quality: OBSERVED, confidence: 0.8 },
  { category: "peintures_enduits_finitions", name: "Peinture anti-UV terrasse (L)", unit: "L", unitPrice: 33.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "peintures_enduits_finitions", name: "Enduit taloché fin (sac 25 kg)", unit: "sac", unitPrice: 19.2, quality: ESTIMATED, confidence: 0.55 },
  { category: "peintures_enduits_finitions", name: "Impression isolante (L)", unit: "L", unitPrice: 16, quality: ESTIMATED, confidence: 0.55 },
  { category: "peintures_enduits_finitions", name: "Peinture effet béton (L)", unit: "L", unitPrice: 28.8, quality: ESTIMATED, confidence: 0.5 },

  // Menuiseries
  { category: "menuiseries", name: "Porte intérieure laquée (H.204)", unit: "pièce", unitPrice: 336, quality: OBSERVED, confidence: 0.8, subcategory: "Portes intérieures" },
  { category: "menuiseries", name: "Porte d'entrée en bois massif", unit: "pièce", unitPrice: 720, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Fenêtre alu oscillo-battant 120×120", unit: "pièce", unitPrice: 496, quality: ESTIMATED, confidence: 0.6, subcategory: "Fenêtres alu" },
  { category: "menuiseries", name: "Store banne (m²)", unit: "m²", unitPrice: 144, quality: ESTIMATED, confidence: 0.5 },
  { category: "menuiseries", name: "Claustra alu décoratif (m²)", unit: "m²", unitPrice: 120, quality: ESTIMATED, confidence: 0.5 },

  // Vitrage et produits verriers
  { category: "vitrage_verriers", name: "Verre imprimé (m²)", unit: "m²", unitPrice: 32, quality: ESTIMATED, confidence: 0.55 },
  { category: "vitrage_verriers", name: "Double vitrage acoustique (m²)", unit: "m²", unitPrice: 76, quality: ESTIMATED, confidence: 0.55 },
  { category: "vitrage_verriers", name: "Vitrine vitrée alu (m²)", unit: "m²", unitPrice: 144, quality: ESTIMATED, confidence: 0.5 },
  { category: "vitrage_verriers", name: "Verre armé (m²)", unit: "m²", unitPrice: 44, quality: ESTIMATED, confidence: 0.55 },

  // Chimie de construction
  { category: "chimie_construction", name: "Résine d'injection fissures (cartouche)", unit: "cartouche", unitPrice: 44, quality: ESTIMATED, confidence: 0.55 },
  { category: "chimie_construction", name: "Mortier de réparation (sac 25 kg)", unit: "sac", unitPrice: 25.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "chimie_construction", name: "Primaire béton (L)", unit: "L", unitPrice: 12.8, quality: ESTIMATED, confidence: 0.55 },
  { category: "chimie_construction", name: "Hydrofuge de façade (L)", unit: "L", unitPrice: 20, quality: ESTIMATED, confidence: 0.55 },
  { category: "chimie_construction", name: "Nettoyant béton (L)", unit: "L", unitPrice: 12, quality: ESTIMATED, confidence: 0.5 },
  { category: "chimie_construction", name: "Décapant ciment (L)", unit: "L", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "chimie_construction", name: "Anti-fissure de façade (L)", unit: "L", unitPrice: 16, quality: ESTIMATED, confidence: 0.5 },
  { category: "chimie_construction", name: "Coulis de scellement (sac 25 kg)", unit: "sac", unitPrice: 22.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "chimie_construction", name: "Injecteur de résine (jeu)", unit: "jeu", unitPrice: 20, quality: ESTIMATED, confidence: 0.5 },
  { category: "chimie_construction", name: "Mastic acrylique (cartouche)", unit: "cartouche", unitPrice: 8, quality: ESTIMATED, confidence: 0.5 },
  { category: "chimie_construction", name: "Colle époxy marbre (kg)", unit: "kg", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "chimie_construction", name: "Ragréage sol (sac 25 kg)", unit: "sac", unitPrice: 24, quality: ESTIMATED, confidence: 0.55 },

  // Quincaillerie et fixations
  { category: "quincaillerie_fixations", name: "Serrures à encastrer (jeu)", unit: "jeu", unitPrice: 48, quality: OBSERVED, confidence: 0.8 },
  { category: "quincaillerie_fixations", name: "Poignée de fenêtre", unit: "pièce", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "quincaillerie_fixations", name: "Crémone deux points", unit: "pièce", unitPrice: 36, quality: ESTIMATED, confidence: 0.5 },
  { category: "quincaillerie_fixations", name: "Espagnolette", unit: "pièce", unitPrice: 24, quality: ESTIMATED, confidence: 0.5 },
  { category: "quincaillerie_fixations", name: "Butée de porte magnétique", unit: "pièce", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "quincaillerie_fixations", name: "Cache-bornes (boîte)", unit: "boîte", unitPrice: 12, quality: ESTIMATED, confidence: 0.5 },
  { category: "quincaillerie_fixations", name: "Rails de tiroir (paire)", unit: "paire", unitPrice: 16, quality: ESTIMATED, confidence: 0.5 },
  { category: "quincaillerie_fixations", name: "Tambour de serrure à cylindre", unit: "pièce", unitPrice: 32, quality: ESTIMATED, confidence: 0.55 },

  // Éclairage
  { category: "eclairage", name: "Spot LED sur rail", unit: "pièce", unitPrice: 28, quality: ESTIMATED, confidence: 0.6, subcategory: "Éclairage LED" },
  { category: "eclairage", name: "Plafonnier LED design", unit: "pièce", unitPrice: 68, quality: ESTIMATED, confidence: 0.55 },
  { category: "eclairage", name: "Ampoule LED GU10", unit: "pièce", unitPrice: 4, quality: PUBLISHED, confidence: 0.7 },
  { category: "eclairage", name: "Réglette LED étanche 150 cm", unit: "pièce", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },
  { category: "eclairage", name: "Luminaire de jardin solaire", unit: "pièce", unitPrice: 28, quality: ESTIMATED, confidence: 0.5 },
  { category: "eclairage", name: "Borne lumineuse extérieure", unit: "pièce", unitPrice: 44, quality: ESTIMATED, confidence: 0.5 },
  { category: "eclairage", name: "Hublot LED étanche", unit: "pièce", unitPrice: 24, quality: ESTIMATED, confidence: 0.5 },
  { category: "eclairage", name: "Variateur d'éclairage", unit: "pièce", unitPrice: 32, quality: ESTIMATED, confidence: 0.55 },

  // CVC, chauffage et ventilation
  { category: "cvc_chauffage_ventilation", name: "Climatiseur mono split 9000 BTU", unit: "pièce", unitPrice: 840, quality: ESTIMATED, confidence: 0.6, subcategory: "Climatisation" },
  { category: "cvc_chauffage_ventilation", name: "Climatiseur multi-split 3 unités", unit: "pièce", unitPrice: 4160, quality: ESTIMATED, confidence: 0.5 },
  { category: "cvc_chauffage_ventilation", name: "Chauffe-eau instantané gaz", unit: "pièce", unitPrice: 680, quality: ESTIMATED, confidence: 0.55 },
  { category: "cvc_chauffage_ventilation", name: "Ventiloconvecteur (fan coil)", unit: "pièce", unitPrice: 720, quality: ESTIMATED, confidence: 0.5 },
  { category: "cvc_chauffage_ventilation", name: "Déshumidificateur", unit: "pièce", unitPrice: 280, quality: ESTIMATED, confidence: 0.5 },
  { category: "cvc_chauffage_ventilation", name: "Cheminée / insert bois", unit: "pièce", unitPrice: 1200, quality: ESTIMATED, confidence: 0.5 },
  { category: "cvc_chauffage_ventilation", name: "Gaine rigide galvanisée (ml)", unit: "ml", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.5 },

  // Sécurité incendie et sûreté
  { category: "securite_incendie_surete", name: "Extincteur CO2 5 kg", unit: "pièce", unitPrice: 120, quality: ESTIMATED, confidence: 0.6 },
  { category: "securite_incendie_surete", name: "Extincteur poudre 9 kg", unit: "pièce", unitPrice: 96, quality: ESTIMATED, confidence: 0.6 },
  { category: "securite_incendie_surete", name: "Boîtier d'alarme incendie", unit: "pièce", unitPrice: 144, quality: ESTIMATED, confidence: 0.55 },
  { category: "securite_incendie_surete", name: "Bouton d'arrêt d'urgence", unit: "pièce", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },
  { category: "securite_incendie_surete", name: "Caméra dôme IP", unit: "pièce", unitPrice: 360, quality: ESTIMATED, confidence: 0.55 },
  { category: "securite_incendie_surete", name: "Enregistreur NVR 16 voies", unit: "pièce", unitPrice: 720, quality: ESTIMATED, confidence: 0.5 },
  { category: "securite_incendie_surete", name: "Vidéophone avec badge", unit: "pièce", unitPrice: 200, quality: ESTIMATED, confidence: 0.55 },

  // Voirie, réseaux divers et drainage
  { category: "voirie_reseaux_drainage", name: "Enrobé drainant (m²)", unit: "m²", unitPrice: 44, quality: ESTIMATED, confidence: 0.5 },
  { category: "voirie_reseaux_drainage", name: "Enduit superficiel d'usure (m²)", unit: "m²", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.5 },
  { category: "voirie_reseaux_drainage", name: "Accotement grave concassée (m³)", unit: "m³", unitPrice: 32, quality: ESTIMATED, confidence: 0.5 },
  { category: "voirie_reseaux_drainage", name: "Regard de branchement Ø40", unit: "pièce", unitPrice: 96, quality: ESTIMATED, confidence: 0.5 },
  { category: "voirie_reseaux_drainage", name: "Chambre de tirage télécom", unit: "pièce", unitPrice: 160, quality: ESTIMATED, confidence: 0.45 },
  { category: "voirie_reseaux_drainage", name: "Signalisation verticale (panneau)", unit: "panneau", unitPrice: 96, quality: ESTIMATED, confidence: 0.5 },

  // Aménagements extérieurs
  { category: "amenagements_exterieurs", name: "Clôture grillage soudé (ml)", unit: "ml", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.55, subcategory: "Clôtures" },
  { category: "amenagements_exterieurs", name: "Clôture PVC (ml)", unit: "ml", unitPrice: 48, quality: ESTIMATED, confidence: 0.55 },
  { category: "amenagements_exterieurs", name: "Portillon piéton métallique", unit: "pièce", unitPrice: 280, quality: ESTIMATED, confidence: 0.55 },
  { category: "amenagements_exterieurs", name: "Carport en bois (m²)", unit: "m²", unitPrice: 144, quality: ESTIMATED, confidence: 0.5 },
  { category: "amenagements_exterieurs", name: "Kiosque / tonnelle (m²)", unit: "m²", unitPrice: 200, quality: ESTIMATED, confidence: 0.5 },
  { category: "amenagements_exterieurs", name: "Terrasse en bois exotique (m²)", unit: "m²", unitPrice: 112, quality: ESTIMATED, confidence: 0.55 },
  { category: "amenagements_exterieurs", name: "Gazon en plaques (m²)", unit: "m²", unitPrice: 11.2, quality: OBSERVED, confidence: 0.8, subcategory: "Gazon" },
  { category: "amenagements_exterieurs", name: "Pergola bois (m²)", unit: "m²", unitPrice: 144, quality: ESTIMATED, confidence: 0.55 },

  // Matériaux durables et biosourcés
  { category: "materiaux_durables_biosources", name: "Brique de terre crue (adobe)", unit: "pièce", unitPrice: 0.96, quality: ESTIMATED, confidence: 0.5 },
  { category: "materiaux_durables_biosources", name: "Bambou de construction (ml)", unit: "ml", unitPrice: 20, quality: ESTIMATED, confidence: 0.45 },
  { category: "materiaux_durables_biosources", name: "Isolant ouate de cellulose (m²)", unit: "m²", unitPrice: 22.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "materiaux_durables_biosources", name: "Isolant laine de mouton (m²)", unit: "m²", unitPrice: 32, quality: ESTIMATED, confidence: 0.5 },
  { category: "materiaux_durables_biosources", name: "Peinture à la chaux (L)", unit: "L", unitPrice: 12, quality: ESTIMATED, confidence: 0.5 },
  { category: "materiaux_durables_biosources", name: "Enduit chaux-chanvre (sac 25 kg)", unit: "sac", unitPrice: 24, quality: ESTIMATED, confidence: 0.5 },
  { category: "materiaux_durables_biosources", name: "Bardeaux bois toiture (m²)", unit: "m²", unitPrice: 40, quality: ESTIMATED, confidence: 0.5 },

  // ── CAT-17: Plomberie et évacuation ────────────────────────────────────────
  { category: "plomberie_evacuation", name: "Tube PVC évacuation Ø40 (ml)", unit: "ml", unitPrice: 4, quality: ESTIMATED, confidence: 0.6, subcategory: "Tubes PVC", catCode: "CAT-17", attributes: "DN, PN/SN/SDR, température" },
  { category: "plomberie_evacuation", name: "Tube acier galvanisé Ø1″ (ml)", unit: "ml", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.55, catCode: "CAT-17", attributes: "DN, PN, revêtement" },
  { category: "plomberie_evacuation", name: "Flexible d'alimentation", unit: "pièce", unitPrice: 12, quality: ESTIMATED, confidence: 0.55, catCode: "CAT-17", attributes: "DN, pression" },
  { category: "plomberie_evacuation", name: "Vanne d'arrêt laiton Ø3/4", unit: "pièce", unitPrice: 20, quality: ESTIMATED, confidence: 0.55, catCode: "CAT-17", attributes: "DN, pression" },
  { category: "plomberie_evacuation", name: "Siphon de sol", unit: "pièce", unitPrice: 16, quality: ESTIMATED, confidence: 0.55, catCode: "CAT-17", attributes: "DN, débit" },
  { category: "plomberie_evacuation", name: "Robinets de jardin", unit: "pièce", unitPrice: 24, quality: ESTIMATED, confidence: 0.55, catCode: "CAT-17", attributes: "DN, pression" },
  { category: "plomberie_evacuation", name: "Pompe surpresseur 1.5 CV", unit: "pièce", unitPrice: 360, quality: ESTIMATED, confidence: 0.55, catCode: "CAT-17", attributes: "Puissance, débit, pression" },
  { category: "plomberie_evacuation", name: "Vase d'expansion", unit: "pièce", unitPrice: 96, quality: ESTIMATED, confidence: 0.5, catCode: "CAT-17", attributes: "Volume, pression" },

  // ── CAT-18: Sanitaires et robinetterie ─────────────────────────────────────
  { category: "sanitaires_robinetterie", name: "Lave-mains céramique", unit: "pièce", unitPrice: 64, quality: ESTIMATED, confidence: 0.6, subcategory: "Sanitaire", catCode: "CAT-18", attributes: "Dimensions, garantie" },
  { category: "sanitaires_robinetterie", name: "Mitigeur de cuisine", unit: "pièce", unitPrice: 76, quality: OBSERVED, confidence: 0.8, subcategory: "Robinetterie", catCode: "CAT-18", attributes: "Débit, finition" },

  // ── CAT-19: Électricité – courants forts ────────────────────────────────────
  { category: "electricite_courants_forts", name: "Câble électrique 4 mm² (ml)", unit: "ml", unitPrice: 2.24, quality: ESTIMATED, confidence: 0.6, subcategory: "Câblage", catCode: "CAT-19", attributes: "Section, tension, IP/IK" },
  { category: "electricite_courants_forts", name: "Câble électrique 6 mm² (ml)", unit: "ml", unitPrice: 3.6, quality: ESTIMATED, confidence: 0.6, catCode: "CAT-19", attributes: "Section, tension, IP/IK" },
  { category: "electricite_courants_forts", name: "Interrupteur différentiel 40 A", unit: "pièce", unitPrice: 72, quality: PUBLISHED, confidence: 0.7, subcategory: "Protection", catCode: "CAT-19", attributes: "Pouvoir coupure, sensibilité" },
  // ── Menuiseries ────────────────────────────────────────────────────────────
  { category: "menuiseries", name: "Porte intérieure en bois (H.204)", unit: "pièce", unitPrice: 176, quality: OBSERVED, confidence: 0.85, subcategory: "Portes intérieures" },
  { category: "menuiseries", name: "Porte intérieure bois pleine", unit: "pièce", unitPrice: 256, quality: ESTIMATED, confidence: 0.7 },
  { category: "menuiseries", name: "Porte d'entrée métallique", unit: "pièce", unitPrice: 440, quality: OBSERVED, confidence: 0.85 },
  { category: "menuiseries", name: "Porte blindée de sécurité", unit: "pièce", unitPrice: 960, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Porte garage sectionnelle 2.5×2.1", unit: "pièce", unitPrice: 1040, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Porte coulissante bois", unit: "pièce", unitPrice: 680, quality: ESTIMATED, confidence: 0.55 },
  { category: "menuiseries", name: "Porte PVC intérieure", unit: "pièce", unitPrice: 200, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Porte de placard coulissante (m²)", unit: "m²", unitPrice: 96, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Porte en verre coulissante", unit: "pièce", unitPrice: 760, quality: ESTIMATED, confidence: 0.5 },
  { category: "menuiseries", name: "Fenêtre aluminium 90×120", unit: "pièce", unitPrice: 248, quality: OBSERVED, confidence: 0.85, subcategory: "Fenêtres alu" },
  { category: "menuiseries", name: "Fenêtre alu double vitrage 90×120", unit: "pièce", unitPrice: 384, quality: ESTIMATED, confidence: 0.7, subcategory: "Fenêtres alu" },
  { category: "menuiseries", name: "Fenêtre PVC double vitrage 90×120", unit: "pièce", unitPrice: 304, quality: OBSERVED, confidence: 0.85, subcategory: "Fenêtres PVC" },
  { category: "menuiseries", name: "Baie coulissante alu 2 vantaux", unit: "pièce", unitPrice: 720, quality: ESTIMATED, confidence: 0.65 },
  { category: "menuiseries", name: "Baie coulissante PVC 3 vantaux", unit: "pièce", unitPrice: 880, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Volet roulant alu manuel 1.2×1.2", unit: "pièce", unitPrice: 304, quality: ESTIMATED, confidence: 0.65 },
  { category: "menuiseries", name: "Volet roulant motorisé", unit: "pièce", unitPrice: 496, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Grille de protection métallique", unit: "pièce", unitPrice: 176, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Garde-corps alu (ml)", unit: "ml", unitPrice: 144, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Rampe d'escalier bois (ml)", unit: "ml", unitPrice: 96, quality: ESTIMATED, confidence: 0.55 },
  { category: "menuiseries", name: "Escalier bois complet", unit: "pièce", unitPrice: 2000, quality: ESTIMATED, confidence: 0.55 },
  { category: "menuiseries", name: "Plan de travail cuisine (ml)", unit: "ml", unitPrice: 176, quality: ESTIMATED, confidence: 0.6 },
  { category: "menuiseries", name: "Meuble cuisine (ml)", unit: "ml", unitPrice: 360, quality: ESTIMATED, confidence: 0.55 },
  { category: "menuiseries", name: "Portail alu battant 2 vantaux", unit: "pièce", unitPrice: 1280, quality: ESTIMATED, confidence: 0.55 },

  // ── Vitrage et produits verriers ───────────────────────────────────────────
  { category: "vitrage_verriers", name: "Verre clair 4 mm (m²)", unit: "m²", unitPrice: 22.4, quality: PUBLISHED, confidence: 0.75 },
  { category: "vitrage_verriers", name: "Verre clair 6 mm (m²)", unit: "m²", unitPrice: 28, quality: ESTIMATED, confidence: 0.65 },
  { category: "vitrage_verriers", name: "Double vitrage 4/16/4 (m²)", unit: "m²", unitPrice: 54.4, quality: ESTIMATED, confidence: 0.65 },
  { category: "vitrage_verriers", name: "Double vitrage à faible émissivité (m²)", unit: "m²", unitPrice: 68, quality: ESTIMATED, confidence: 0.6 },
  { category: "vitrage_verriers", name: "Verre feuilleté 44.2 (m²)", unit: "m²", unitPrice: 72, quality: ESTIMATED, confidence: 0.6 },
  { category: "vitrage_verriers", name: "Verre trempé 10 mm (m²)", unit: "m²", unitPrice: 92, quality: ESTIMATED, confidence: 0.6 },
  { category: "vitrage_verriers", name: "Verre dépoli (m²)", unit: "m²", unitPrice: 48, quality: ESTIMATED, confidence: 0.6 },
  { category: "vitrage_verriers", name: "Miroir 4 mm (m²)", unit: "m²", unitPrice: 64, quality: ESTIMATED, confidence: 0.6 },
  { category: "vitrage_verriers", name: "Vitrage sécurité pare-balles (m²)", unit: "m²", unitPrice: 104, quality: ESTIMATED, confidence: 0.5 },
  { category: "vitrage_verriers", name: "Verre teinté (m²)", unit: "m²", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },
  { category: "vitrage_verriers", name: "Film solaire (m²)", unit: "m²", unitPrice: 20, quality: ESTIMATED, confidence: 0.5 },

  // ── Chimie de construction ─────────────────────────────────────────────────
  { category: "chimie_construction", name: "Résine époxy structurale (kit)", unit: "kit", unitPrice: 208, quality: OBSERVED, confidence: 0.85 },

  // ── Quincaillerie et fixations ─────────────────────────────────────────────
  { category: "quincaillerie_fixations", name: "Serrure de sûreté 3 points", unit: "pièce", unitPrice: 68, quality: OBSERVED, confidence: 0.8 },
  { category: "quincaillerie_fixations", name: "Poignée de porte (paire)", unit: "paire", unitPrice: 20, quality: OBSERVED, confidence: 0.8 },
  { category: "quincaillerie_fixations", name: "Paumelles renforcées (jeu)", unit: "jeu", unitPrice: 12, quality: ESTIMATED, confidence: 0.6 },
  { category: "quincaillerie_fixations", name: "Verrou de sécurité", unit: "pièce", unitPrice: 16, quality: ESTIMATED, confidence: 0.55 },
  { category: "quincaillerie_fixations", name: "Ferme-porte", unit: "pièce", unitPrice: 64, quality: ESTIMATED, confidence: 0.6 },
  { category: "quincaillerie_fixations", name: "Visserie et chevilles (kg)", unit: "kg", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "quincaillerie_fixations", name: "Clous acier (kg)", unit: "kg", unitPrice: 3.2, quality: ESTIMATED, confidence: 0.55 },
  { category: "quincaillerie_fixations", name: "Ancrages métalliques (jeu)", unit: "jeu", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "quincaillerie_fixations", name: "Charnières de portail (paire)", unit: "paire", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },
  { category: "quincaillerie_fixations", name: "Rails et glissières (ml)", unit: "ml", unitPrice: 12, quality: ESTIMATED, confidence: 0.5 },
  { category: "quincaillerie_fixations", name: "Mastic d'étanchéité joints (cartouche)", unit: "cartouche", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.55 },
  { category: "quincaillerie_fixations", name: "Cheville à expansion (boîte)", unit: "boîte", unitPrice: 8, quality: ESTIMATED, confidence: 0.55 },
  { category: "quincaillerie_fixations", name: "Cadenas de sûreté", unit: "pièce", unitPrice: 12, quality: ESTIMATED, confidence: 0.5 },
  { category: "quincaillerie_fixations", name: "Gonds à scellement (jeu)", unit: "jeu", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.55 },

  // ── Éclairage ──────────────────────────────────────────────────────────────
  { category: "eclairage", name: "Spot LED encastrable 9 W", unit: "pièce", unitPrice: 6.8, quality: OBSERVED, confidence: 0.85, subcategory: "Éclairage LED" },
  { category: "eclairage", name: "Luminaire LED plafonnier", unit: "pièce", unitPrice: 24, quality: OBSERVED, confidence: 0.8 },
  { category: "eclairage", name: "Ampoule LED E27 12 W", unit: "pièce", unitPrice: 3.2, quality: PUBLISHED, confidence: 0.75 },
  { category: "eclairage", name: "Tube LED 120 cm", unit: "pièce", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.65 },
  { category: "eclairage", name: "Applique murale LED", unit: "pièce", unitPrice: 20, quality: ESTIMATED, confidence: 0.6 },
  { category: "eclairage", name: "Projecteur LED extérieur étanche", unit: "pièce", unitPrice: 64, quality: ESTIMATED, confidence: 0.6 },
  { category: "eclairage", name: "Projecteur LED haute baie 150 W", unit: "pièce", unitPrice: 144, quality: ESTIMATED, confidence: 0.6 },
  { category: "eclairage", name: "Ruban LED (ml)", unit: "ml", unitPrice: 12, quality: ESTIMATED, confidence: 0.6 },
  { category: "eclairage", name: "Lampadaire sur pied", unit: "pièce", unitPrice: 96, quality: ESTIMATED, confidence: 0.55 },
  { category: "eclairage", name: "Luminaire LED encastré 60×60", unit: "pièce", unitPrice: 36, quality: ESTIMATED, confidence: 0.6 },
  { category: "eclairage", name: "Interrupteur va-et-vient", unit: "pièce", unitPrice: 5.6, quality: ESTIMATED, confidence: 0.6 },
  { category: "eclairage", name: "Prise de courant 2P+T", unit: "pièce", unitPrice: 7.2, quality: ESTIMATED, confidence: 0.6 },
  { category: "eclairage", name: "Panneau LED 30×120", unit: "pièce", unitPrice: 44, quality: ESTIMATED, confidence: 0.55 },
  { category: "eclairage", name: "Ballon LED étanche industriel", unit: "pièce", unitPrice: 76, quality: ESTIMATED, confidence: 0.55 },

  // ── CVC, chauffage et ventilation ──────────────────────────────────────────
  { category: "cvc_chauffage_ventilation", name: "Climatiseur split 12000 BTU", unit: "pièce", unitPrice: 1080, quality: OBSERVED, confidence: 0.85, subcategory: "Climatisation" },
  { category: "cvc_chauffage_ventilation", name: "Climatiseur split 18000 BTU", unit: "pièce", unitPrice: 1440, quality: OBSERVED, confidence: 0.85, subcategory: "Climatisation" },
  { category: "cvc_chauffage_ventilation", name: "Climatiseur gainable 24000 BTU", unit: "pièce", unitPrice: 2560, quality: ESTIMATED, confidence: 0.6 },
  { category: "cvc_chauffage_ventilation", name: "Chauffe-eau électrique 80 L", unit: "pièce", unitPrice: 320, quality: OBSERVED, confidence: 0.85, subcategory: "Chauffage ECS" },
  { category: "cvc_chauffage_ventilation", name: "Chauffe-eau électrique 100 L", unit: "pièce", unitPrice: 384, quality: PUBLISHED, confidence: 0.75, subcategory: "Chauffage ECS" },
  { category: "cvc_chauffage_ventilation", name: "Chauffe-eau solaire 200 L", unit: "pièce", unitPrice: 1440, quality: ESTIMATED, confidence: 0.6 },
  { category: "cvc_chauffage_ventilation", name: "VMC double flux", unit: "pièce", unitPrice: 760, quality: ESTIMATED, confidence: 0.6 },
  { category: "cvc_chauffage_ventilation", name: "Ventilateur extracteur 100 mm", unit: "pièce", unitPrice: 96, quality: ESTIMATED, confidence: 0.6 },
  { category: "cvc_chauffage_ventilation", name: "Pompe à chaleur air/eau", unit: "pièce", unitPrice: 3600, quality: ESTIMATED, confidence: 0.55 },
  { category: "cvc_chauffage_ventilation", name: "Radiateur électrique", unit: "pièce", unitPrice: 200, quality: ESTIMATED, confidence: 0.6 },
  { category: "cvc_chauffage_ventilation", name: "Groupe froid commercial", unit: "pièce", unitPrice: 2800, quality: ESTIMATED, confidence: 0.55 },
  { category: "cvc_chauffage_ventilation", name: "Système de ventilation mécanique", unit: "pièce", unitPrice: 480, quality: ESTIMATED, confidence: 0.55 },
  { category: "cvc_chauffage_ventilation", name: "Thermostat programmable", unit: "pièce", unitPrice: 72, quality: ESTIMATED, confidence: 0.6 },
  { category: "cvc_chauffage_ventilation", name: "Gaines de ventilation flexibles (ml)", unit: "ml", unitPrice: 9.6, quality: ESTIMATED, confidence: 0.55 },
  { category: "cvc_chauffage_ventilation", name: "Bouches de soufflage", unit: "pièce", unitPrice: 28, quality: ESTIMATED, confidence: 0.55 },
  { category: "cvc_chauffage_ventilation", name: "Groupe de traitement d'air", unit: "pièce", unitPrice: 4160, quality: ESTIMATED, confidence: 0.5 },

  // ── Énergies renouvelables ─────────────────────────────────────────────────
  { category: "energies_renouvelables", name: "Panneau photovoltaïque 450 Wc", unit: "pièce", unitPrice: 440, quality: OBSERVED, confidence: 0.85, subcategory: "Photovoltaïque" },
  { category: "energies_renouvelables", name: "Panneau photovoltaïque 550 Wc", unit: "pièce", unitPrice: 496, quality: PUBLISHED, confidence: 0.75 },
  { category: "energies_renouvelables", name: "Onduleur central 5 kW", unit: "pièce", unitPrice: 2000, quality: OBSERVED, confidence: 0.85 },
  { category: "energies_renouvelables", name: "Micro-onduleur", unit: "pièce", unitPrice: 280, quality: ESTIMATED, confidence: 0.65 },
  { category: "energies_renouvelables", name: "Batterie de stockage lithium 10 kWh", unit: "pièce", unitPrice: 2560, quality: ESTIMATED, confidence: 0.65 },
  { category: "energies_renouvelables", name: "Structure alu support toiture", unit: "pièce", unitPrice: 96, quality: ESTIMATED, confidence: 0.6 },
  { category: "energies_renouvelables", name: "Câble solaire 6 mm² (ml)", unit: "ml", unitPrice: 2.4, quality: ESTIMATED, confidence: 0.6 },
  { category: "energies_renouvelables", name: "Régulateur de charge MPPT", unit: "pièce", unitPrice: 240, quality: ESTIMATED, confidence: 0.6 },
  { category: "energies_renouvelables", name: "Compteur bidirectionnel", unit: "pièce", unitPrice: 320, quality: ESTIMATED, confidence: 0.6 },
  { category: "energies_renouvelables", name: "Chauffe-eau solaire 300 L", unit: "pièce", unitPrice: 1760, quality: ESTIMATED, confidence: 0.65 },
  { category: "energies_renouvelables", name: "Capteur solaire thermique", unit: "m²", unitPrice: 360, quality: ESTIMATED, confidence: 0.6 },
  { category: "energies_renouvelables", name: "Pompe à chaleur piscine", unit: "pièce", unitPrice: 2240, quality: ESTIMATED, confidence: 0.55 },
  { category: "energies_renouvelables", name: "Éolienne domestique 1 kW", unit: "pièce", unitPrice: 2560, quality: ESTIMATED, confidence: 0.5 },
  { category: "energies_renouvelables", name: "Kit fixation toiture tuiles", unit: "jeu", unitPrice: 48, quality: ESTIMATED, confidence: 0.6 },
  { category: "energies_renouvelables", name: "Parafoudre photovoltaïque", unit: "pièce", unitPrice: 120, quality: ESTIMATED, confidence: 0.6 },

  // ── Sécurité incendie et sûreté ────────────────────────────────────────────
  { category: "securite_incendie_surete", name: "Extincteur 6 kg ABC", unit: "pièce", unitPrice: 72, quality: OBSERVED, confidence: 0.85 },
  { category: "securite_incendie_surete", name: "Détecteur de fumée autonome", unit: "pièce", unitPrice: 36, quality: ESTIMATED, confidence: 0.65 },
  { category: "securite_incendie_surete", name: "Sprinkler automatique", unit: "pièce", unitPrice: 96, quality: ESTIMATED, confidence: 0.6 },
  { category: "securite_incendie_surete", name: "RIA (robinet d'incendie armé)", unit: "pièce", unitPrice: 400, quality: ESTIMATED, confidence: 0.6 },
  { category: "securite_incendie_surete", name: "Centrale incendie adressable", unit: "pièce", unitPrice: 1760, quality: ESTIMATED, confidence: 0.55 },
  { category: "securite_incendie_surete", name: "Porte coupe-feu 1h (pièce)", unit: "pièce", unitPrice: 960, quality: ESTIMATED, confidence: 0.6 },
  { category: "securite_incendie_surete", name: "Bloc de secours autonome", unit: "pièce", unitPrice: 48, quality: ESTIMATED, confidence: 0.6 },
  { category: "securite_incendie_surete", name: "Signalétique de sécurité", unit: "pièce", unitPrice: 12, quality: ESTIMATED, confidence: 0.55 },
  { category: "securite_incendie_surete", name: "Caméra de surveillance IP", unit: "pièce", unitPrice: 280, quality: ESTIMATED, confidence: 0.6 },
  { category: "securite_incendie_surete", name: "Centrale d'alarme intrusion", unit: "pièce", unitPrice: 480, quality: ESTIMATED, confidence: 0.6 },
  { category: "securite_incendie_surete", name: "Détecteur de mouvement", unit: "pièce", unitPrice: 64, quality: ESTIMATED, confidence: 0.6 },

  // ── Voirie, réseaux divers et drainage ─────────────────────────────────────
  { category: "voirie_reseaux_drainage", name: "Enrobé bitumineux (m²)", unit: "m²", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },
  { category: "voirie_reseaux_drainage", name: "Grave bitume (tonne)", unit: "tonne", unitPrice: 68, quality: ESTIMATED, confidence: 0.55 },
  { category: "voirie_reseaux_drainage", name: "Gravier drainage 20/40 (m³)", unit: "m³", unitPrice: 44, quality: ESTIMATED, confidence: 0.55 },
  { category: "voirie_reseaux_drainage", name: "Regard béton Ø60 avec tampon", unit: "pièce", unitPrice: 144, quality: ESTIMATED, confidence: 0.55 },
  { category: "voirie_reseaux_drainage", name: "Tampon fonte classe D400", unit: "pièce", unitPrice: 280, quality: ESTIMATED, confidence: 0.55 },
  { category: "voirie_reseaux_drainage", name: "Conduite PVC assainissement Ø200 (ml)", unit: "ml", unitPrice: 20, quality: ESTIMATED, confidence: 0.6 },
  { category: "voirie_reseaux_drainage", name: "Conduite béton Ø400 (ml)", unit: "ml", unitPrice: 44, quality: ESTIMATED, confidence: 0.55 },
  { category: "voirie_reseaux_drainage", name: "Caniveau béton (ml)", unit: "ml", unitPrice: 24, quality: ESTIMATED, confidence: 0.55 },
  { category: "voirie_reseaux_drainage", name: "Bordure trottoir (ml)", unit: "ml", unitPrice: 12, quality: ESTIMATED, confidence: 0.6 },
  { category: "voirie_reseaux_drainage", name: "Géotextile drainage (m²)", unit: "m²", unitPrice: 2.4, quality: ESTIMATED, confidence: 0.5 },
  { category: "voirie_reseaux_drainage", name: "Drain français (ml)", unit: "ml", unitPrice: 28, quality: ESTIMATED, confidence: 0.55 },
  { category: "voirie_reseaux_drainage", name: "Glissière de sécurité (ml)", unit: "ml", unitPrice: 96, quality: ESTIMATED, confidence: 0.5 },
  { category: "voirie_reseaux_drainage", name: "Marquage au sol (ml)", unit: "ml", unitPrice: 6.4, quality: ESTIMATED, confidence: 0.5 },

  // ── Aménagements extérieurs ────────────────────────────────────────────────
  { category: "amenagements_exterieurs", name: "Clôture béton préfabriquée (ml)", unit: "ml", unitPrice: 76, quality: ESTIMATED, confidence: 0.6, subcategory: "Clôtures" },
  { category: "amenagements_exterieurs", name: "Portail métallique coulissant", unit: "pièce", unitPrice: 960, quality: ESTIMATED, confidence: 0.6 },
  { category: "amenagements_exterieurs", name: "Motorisation portail 600 kg", unit: "pièce", unitPrice: 720, quality: ESTIMATED, confidence: 0.6 },
  { category: "amenagements_exterieurs", name: "Gazon synthétique (m²)", unit: "m²", unitPrice: 14.4, quality: ESTIMATED, confidence: 0.6, subcategory: "Gazon" },
  { category: "amenagements_exterieurs", name: "Pergola alu (m²)", unit: "m²", unitPrice: 200, quality: ESTIMATED, confidence: 0.6 },
  { category: "amenagements_exterieurs", name: "Abri voiture métallique (m²)", unit: "m²", unitPrice: 120, quality: ESTIMATED, confidence: 0.55 },
  { category: "amenagements_exterieurs", name: "Barbecue fixe maçonnerie", unit: "pièce", unitPrice: 640, quality: ESTIMATED, confidence: 0.55 },
  { category: "amenagements_exterieurs", name: "Fontaine / bassin décoratif", unit: "pièce", unitPrice: 1200, quality: ESTIMATED, confidence: 0.5 },
  { category: "amenagements_exterieurs", name: "Terrasse bois composite (m²)", unit: "m²", unitPrice: 88, quality: ESTIMATED, confidence: 0.6 },
  { category: "amenagements_exterieurs", name: "Mur végétal (m²)", unit: "m²", unitPrice: 144, quality: ESTIMATED, confidence: 0.5 },
  { category: "amenagements_exterieurs", name: "Éclairage jardin sur poteaux", unit: "pièce", unitPrice: 56, quality: ESTIMATED, confidence: 0.55 },

  // ── Matériaux durables et biosourcés ───────────────────────────────────────
  { category: "materiaux_durables_biosources", name: "Béton de chanvre (m³)", unit: "m³", unitPrice: 280, quality: ESTIMATED, confidence: 0.55 },
  { category: "materiaux_durables_biosources", name: "Brique de terre compressée (BTC)", unit: "pièce", unitPrice: 1.2, quality: ESTIMATED, confidence: 0.5 },
  { category: "materiaux_durables_biosources", name: "Paille compressée (m²)", unit: "m²", unitPrice: 20, quality: ESTIMATED, confidence: 0.5 },
  { category: "materiaux_durables_biosources", name: "Bois certifié FSC (m³)", unit: "m³", unitPrice: 720, quality: ESTIMATED, confidence: 0.55 },
  { category: "materiaux_durables_biosources", name: "Liège expansé (m²)", unit: "m²", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },
  { category: "materiaux_durables_biosources", name: "Isolant fibre de bois (m²)", unit: "m²", unitPrice: 28, quality: ESTIMATED, confidence: 0.55 },
  { category: "materiaux_durables_biosources", name: "Peinture écologique biosourcée (L)", unit: "L", unitPrice: 36, quality: ESTIMATED, confidence: 0.55 },
  { category: "materiaux_durables_biosources", name: "Enduit terre (sac 25 kg)", unit: "sac", unitPrice: 16, quality: ESTIMATED, confidence: 0.5 },

  // ── CAT-17: Plomberie et évacuation (suite) ──────────────────────────────
  { category: "plomberie_evacuation", name: "Tube PVC évacuation Ø110 (ml)", unit: "ml", unitPrice: 12, quality: OBSERVED, confidence: 0.85, subcategory: "Tubes PVC", catCode: "CAT-17", attributes: "DN, PN/SN/SDR, température" },
  { category: "plomberie_evacuation", name: "Tube PVC évacuation Ø50 (ml)", unit: "ml", unitPrice: 5.6, quality: ESTIMATED, confidence: 0.7, subcategory: "Tubes PVC", catCode: "CAT-17", attributes: "DN, PN/SN/SDR, température" },
  { category: "plomberie_evacuation", name: "Tube PER Ø16 (ml)", unit: "ml", unitPrice: 3.2, quality: ESTIMATED, confidence: 0.6, catCode: "CAT-17", attributes: "DN, PN, température" },
  { category: "plomberie_evacuation", name: "Tube cuivre Ø14 (ml)", unit: "ml", unitPrice: 17.6, quality: ESTIMATED, confidence: 0.6, catCode: "CAT-17", attributes: "DN, PN, température" },
  { category: "plomberie_evacuation", name: "Pompe de relevage eaux usées", unit: "pièce", unitPrice: 480, quality: ESTIMATED, confidence: 0.6, catCode: "CAT-17", attributes: "Puissance, débit" },
  { category: "plomberie_evacuation", name: "Compteur d'eau SONEDE", unit: "pièce", unitPrice: 120, quality: ESTIMATED, confidence: 0.6, catCode: "CAT-17", attributes: "DN, débit" },
  { category: "plomberie_evacuation", name: "Fosse septique 3000 L", unit: "pièce", unitPrice: 960, quality: ESTIMATED, confidence: 0.55, catCode: "CAT-17", attributes: "Volume, norme" },
  { category: "plomberie_evacuation", name: "Vide-ordures", unit: "pièce", unitPrice: 72, quality: ESTIMATED, confidence: 0.5, catCode: "CAT-17", attributes: "Débit, norme" },

  // ── CAT-18: Sanitaires et robinetterie (suite) ─────────────────────────────
  { category: "sanitaires_robinetterie", name: "Robinetterie mitigeur salle de bain", unit: "pièce", unitPrice: 52, quality: OBSERVED, confidence: 0.8, subcategory: "Robinetterie", catCode: "CAT-18", attributes: "Dimensions, garantie, débit" },
  { category: "sanitaires_robinetterie", name: "WC à l'anglaise complet", unit: "pièce", unitPrice: 192, quality: OBSERVED, confidence: 0.85, subcategory: "Sanitaire", catCode: "CAT-18", attributes: "Dimensions, garantie" },
  { category: "sanitaires_robinetterie", name: "Lavabo céramique", unit: "pièce", unitPrice: 76, quality: OBSERVED, confidence: 0.8, subcategory: "Sanitaire", catCode: "CAT-18", attributes: "Dimensions, garantie" },
  { category: "sanitaires_robinetterie", name: "Receveur de douche 90×90", unit: "pièce", unitPrice: 160, quality: ESTIMATED, confidence: 0.7, catCode: "CAT-18", attributes: "Dimensions, garantie" },
  { category: "sanitaires_robinetterie", name: "Colonne de douche", unit: "pièce", unitPrice: 144, quality: ESTIMATED, confidence: 0.65, catCode: "CAT-18", attributes: "Débit, finition" },
  { category: "sanitaires_robinetterie", name: "Évier inox 2 bacs", unit: "pièce", unitPrice: 192, quality: ESTIMATED, confidence: 0.65, catCode: "CAT-18", attributes: "Dimensions, garantie" },
  { category: "sanitaires_robinetterie", name: "Baignoire 170×75", unit: "pièce", unitPrice: 400, quality: ESTIMATED, confidence: 0.6, catCode: "CAT-18", attributes: "Dimensions, garantie" },

  // ── CAT-19: Électricité – courants forts (suite) ────────────────────────────
  { category: "electricite_courants_forts", name: "Câble électrique 3×2.5 mm² (rouleau 100 m)", unit: "rouleau", unitPrice: 71.2, quality: OBSERVED, confidence: 0.85, subcategory: "Câblage", catCode: "CAT-19", attributes: "Section, tension, IP/IK" },
  { category: "electricite_courants_forts", name: "Câble électrique 1.5 mm² (ml)", unit: "ml", unitPrice: 1.2, quality: ESTIMATED, confidence: 0.6, catCode: "CAT-19", attributes: "Section, tension, IP/IK" },
  { category: "electricite_courants_forts", name: "Disjoncteur modulaire 16 A", unit: "pièce", unitPrice: 9.6, quality: PUBLISHED, confidence: 0.75, subcategory: "Protection", catCode: "CAT-19", attributes: "Pouvoir coupure, sensibilité" },
  { category: "electricite_courants_forts", name: "Tableau électrique 13 modules", unit: "pièce", unitPrice: 120, quality: ESTIMATED, confidence: 0.7, catCode: "CAT-19", attributes: "Nombre modules, protection" },
  { category: "electricite_courants_forts", name: "Gaine électrique ICTA (ml)", unit: "ml", unitPrice: 1.2, quality: ESTIMATED, confidence: 0.6, catCode: "CAT-19", attributes: "Section, norme" },

];
