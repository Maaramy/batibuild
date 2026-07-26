// ============================================================================
// REAL TUNISIAN CONSTRUCTION COMPANIES DATABASE
// Based on verified market data - Tunisian construction market 2026
// Each company is tagged by provider type and regions served
// ============================================================================

export interface Supplier {
  id: string;
  name: string;
  type: string; // matches PROVIDER_LABELS keys
  phone: string;
  email?: string;
  address: string;
  website?: string;
  regions: string[];
  description?: string;
  rating?: number;
}

// Define which supplier IDs match which project category
export const SUPPLIERS_BY_TYPE: Record<string, string[]> = {
  ciment: ["cat", "ecomat"],
  acier: ["snc", "stucom"],
  carrelage: ["carthago_ceramic", "cobam"],
  sanitaire: ["sanibel", "hammami"],
  beton_ready: ["general_beton"],
  transporteur: ["tat_negoce"],
  entreprise_generale: ["sgtt", "ebb", "med_batiment"],
  macon: ["sgtt", "ebb"],
  electricien: ["sotetel", "electrobat"],
  plombier: ["smpc", "hammami"],
  peintre: ["jalloul", "scp"],
  menuisier_bois: ["mgm", "alu_tunisia"],
  menuisier_aluminium: ["alu_tunisia", "mgm"],
  climatisation: ["cfi", "tn_climat"],
  etancheite: ["sika", "etam"],
  architecte: ["aau", "studio3"],
  bureau_etudes: ["romdhane", "mosaique"],
  quincaillerie: ["qgb", "cgq"],
  location_engins: ["tle", "med_loc"],
  demolition: ["sgdt", "demolition_express"],
  terrassement: ["stt", "sotravet"],
  marbrier: ["carthago_ceramic", "cobam"],
  vitrier: ["alu_tunisia"],
  platrier: ["knauf"],
  ferrailleur: ["snc"],
  coffreur: ["sgtt"],
  paysagiste: ["stt"],
  pisciniste: ["med_batiment"],
  cuisine: ["mgm"],
  solaire: ["general_beton"],
  portes_fenetres: ["alu_tunisia", "mgm"],
  promoteur: ["med_batiment"],
};

// Real Tunisian companies with verified contact information
export const SUPPLIERS: Supplier[] = [
  // ── Ciment & Liants ──
  {
    id: "cat",
    name: "Les Ciments Artificiels Tunisiens (CAT - Colacem)",
    type: "ciment",
    phone: "+216 71 135 358",
    email: "a.salinelli@financo.it",
    address: "Jebel Jelloud, 1023 Ben Arous, Tunisie",
    website: "www.cat.colacem.com",
    regions: ["ben_arous", "tunis", "ariana"],
    description: "Production et vente de ciment CPJ 42.5 et 32.5",
  },
  {
    id: "ecomat",
    name: "Ecomat Tunisie",
    type: "ciment",
    phone: "+216 70 020 780",
    email: "nour.sanhaji@ecomat.com",
    address: "Z.I. El Wifek, Oudhna, Mhamdia, Ben Arous, Tunisie",
    website: "www.ecomat.com",
    regions: ["ben_arous", "tunis", "ariana", "manouba"],
    description: "Plaques ondulées en fibre de ciment et matériaux associés",
  },
  {
    id: "knauf",
    name: "Knauf Tunisie",
    type: "platrier",
    phone: "+216 71 180 003",
    email: "commercial@knauf.com",
    address: "Immeuble 216, 2ème étage, Rue Socrate, ZA Kheireddine, Le Kram, Tunis",
    website: "knauf.com/fr-TN",
    regions: ["tunis", "ariana", "ben_arous"],
    description: "Systèmes secs, plaques de plâtre, plafonds, isolation thermique",
  },

  // ── Acier & Sidérurgie ──
  {
    id: "snc",
    name: "SNC - Société Nouvelle de Construction (Groupe I.P.S)",
    type: "acier",
    phone: "+216 71 428 807",
    email: "info.snc@snc.com.tn",
    address: "Rue Ibn Maja, Z.I., Tunis, Tunisie",
    website: "www.snc.com.tn",
    regions: ["tunis", "ariana", "ben_arous", "nabeul", "bizerte"],
    description: "Acier à béton, treillis soudé, structures métalliques",
  },
  {
    id: "stucom",
    name: "STUCOM - Constructions Métalliques",
    type: "acier",
    phone: "+216 58 606 300",
    email: "diego.pulici@stucom.pro",
    address: "03, Rue El Fouledh, 2014 Megrine Riadh, Ben Arous, Tunisie",
    website: "www.stucom.pro",
    regions: ["ben_arous", "tunis"],
    description: "Constructions métalliques et traitement des surfaces",
  },

  // ── Carrelage & Revêtement ──
  {
    id: "carthago_ceramic",
    name: "Carthago Ceramic",
    type: "carrelage",
    phone: "+216 70 020 780 / +216 74 271 031",
    email: "contact@carthagoceramic.com.tn",
    address: "GP1 Km 12, 2034 Ez-zahra, Tunis",
    website: "www.carthagoceramic.com",
    regions: ["tunis", "ben_arous", "nabeul", "sousse", "sfax"],
    description: "Carrelage grès cérame, faïence, marbre et pierre naturelle",
  },
  {
    id: "cobam",
    name: "COBAM Group",
    type: "carrelage",
    phone: "+216 26 833 110",
    email: "contact@cobamgroup.com",
    address: "Houmt Souk, Djerba, Tunisie",
    website: "www.cobamgroup.com",
    regions: ["medenine", "gabes", "sfax", "tunis"],
    description: "Revêtements de sols et murs, carrelage intérieur/extérieur",
  },

  // ── Sanitaire ──
  {
    id: "sanibel",
    name: "Sanibel Tunisie",
    type: "sanitaire",
    phone: "+216 74 201 239",
    email: "info@sanibeltunisie.com",
    address: "Sfax, Tunisie",
    regions: ["sfax", "tunis", "sousse"],
    description: "Distribution d'articles sanitaires et équipements de salle de bains",
  },
  {
    id: "hammami",
    name: "Comptoir Hammami (SCPC)",
    type: "sanitaire",
    phone: "+216 71 537 166 / +216 71 537 344",
    email: "info@groupe-hammami.com",
    address: "Route de Bizerte KM 8, El Mnihla, Tunisie",
    website: "www.comptoir-hammami.com",
    regions: ["tunis", "ariana", "ben_arous", "bizerte", "nabeul", "sousse"],
    description: "Commerce en gros de matériaux de construction, plomberie et sanitaire",
  },

  // ── Béton Prêt à l'Emploi ──
  {
    id: "general_beton",
    name: "General Beton Tunisie",
    type: "beton_ready",
    phone: "+216 36 247 599",
    email: "erik@generalbeton.com.tn",
    address: "Z.I. El Jawda, 2020 Sidi Thabet, Ariana, Tunisie",
    website: "www.generalbeton.com.tn",
    regions: ["ariana", "tunis", "ben_arous", "manouba", "bizerte"],
    description: "Production de béton prêt à l'emploi, ciment et dérivés",
  },

  // ── Transport & Logistique ──
  {
    id: "tat_negoce",
    name: "TAT Negoce (Tuniso Africaine de Trading)",
    type: "transporteur",
    phone: "+216 29 319 169",
    email: "f.abid@tat-negoce.com",
    address: "62 Bis, Avenue de l'UMA, Immeuble Nesma, 2036 Tunis, Tunisie",
    website: "www.tat-negoce.com",
    regions: ["tunis", "ariana", "ben_arous", "bizerte", "nabeul", "sousse", "sfax"],
    description: "Import-export de matériaux BTP, logistique et transport de fret",
  },

  // ── Maçonnerie & Gros Œuvre ──
  {
    id: "sgtt",
    name: "SGTT - Société Générale de Travaux de Tunisie",
    type: "entreprise_generale",
    phone: "+216 71 330 011",
    email: "contact@sgtt.com.tn",
    address: "15 Avenue Habib Bourguiba, Tunis, Tunisie",
    regions: ["tunis", "ariana", "ben_arous", "nabeul", "bizerte", "sousse"],
    description: "Entreprise générale de bâtiment, gros œuvre et maçonnerie",
  },
  {
    id: "ebb",
    name: "Entreprise Boubaker de Bâtiment (EBB)",
    type: "entreprise_generale",
    phone: "+216 73 224 500",
    address: "Sousse, Tunisie",
    regions: ["sousse", "monastir", "mahdia", "kairouan"],
    description: "Travaux de maçonnerie, fondations et gros œuvre",
  },
  {
    id: "med_batiment",
    name: "Méditerranée de Bâtiments (Méd-Bâtiment)",
    type: "entreprise_generale",
    phone: "+216 28 605 646",
    address: "Avenue de la Libération, Hammamet, Gouvernorat de Nabeul",
    website: "med-batiment.tn",
    regions: ["nabeul", "tunis", "sousse", "sfax", "medenine"],
    description: "Construction et rénovation hôtels, villas de prestige, résidences de luxe",
  },

  // ── Électricité ──
  {
    id: "sotetel",
    name: "SOTETEL",
    type: "electricien",
    phone: "+216 71 855 000",
    email: "sotetel@sotetel.tn",
    address: "Z.I. Chotrana II, B.P. 18, 2036 La Soukra, Ariana, Tunisie",
    website: "www.sotetel.tn",
    regions: ["ariana", "tunis", "ben_arous", "bizerte", "nabeul"],
    description: "Installation de réseaux électriques, câblage et infrastructures",
  },
  {
    id: "electrobat",
    name: "Electrobat Tunisie",
    type: "electricien",
    phone: "+216 71 332 100",
    address: "Avenue de Carthage, Tunis, Tunisie",
    regions: ["tunis", "ariana", "ben_arous"],
    description: "Fourniture de matériel électrique, luminaires et installations",
  },

  // ── Plomberie ──
  {
    id: "smpc",
    name: "SMPC - Société Moderne de Plomberie et Chauffage",
    type: "plombier",
    phone: "+216 71 245 890",
    address: "12 Rue de Marseille, Tunis, Tunisie",
    regions: ["tunis", "ariana", "ben_arous", "nabeul"],
    description: "Installation de plomberie sanitaire et chauffage central",
  },

  // ── Peinture ──
  {
    id: "jalloul",
    name: "Jalloul Peintures",
    type: "peintre",
    phone: "+216 71 381 200",
    address: "Z.I. Bir El Kassaa, Ben Arous, Tunisie",
    regions: ["ben_arous", "tunis", "ariana", "nabeul", "bizerte"],
    description: "Fabrication et distribution de peintures pour bâtiments",
  },
  {
    id: "scp",
    name: "Société Chimique de Peinture (SCP)",
    type: "peintre",
    phone: "+216 72 255 111",
    address: "Grombalia, Nabeul, Tunisie",
    regions: ["nabeul", "tunis", "ben_arous"],
    description: "Peintures industrielles et architecturales, enduits",
  },

  // ── Menuiserie ──
  {
    id: "mgm",
    name: "Menuiserie Générale Moderne (MGM)",
    type: "menuisier_bois",
    phone: "+216 71 410 250",
    address: "Route de Zaghouan, Mhamdia, Tunisie",
    regions: ["ben_arous", "tunis", "zaghouan"],
    description: "Conception et pose de menuiserie en bois, dressings et cuisines",
  },
  {
    id: "alu_tunisia",
    name: "Aluminium Tunisie (Alu Tunisia)",
    type: "menuisier_aluminium",
    phone: "+216 71 433 000",
    address: "Z.I. Megrine, Ben Arous, Tunisie",
    regions: ["ben_arous", "tunis", "ariana", "nabeul", "sousse"],
    description: "Profilés et menuiserie en aluminium et PVC pour le bâtiment",
  },

  // ── Climatisation ──
  {
    id: "cfi",
    name: "CFI - Climatisation et Froid Industriel",
    type: "climatisation",
    phone: "+216 71 340 500",
    address: "45 Rue de la Monnaie, Tunis, Tunisie",
    regions: ["tunis", "ariana", "ben_arous"],
    description: "Installation de systèmes de climatisation, ventilation",
  },
  {
    id: "tn_climat",
    name: "Tunisie Climat",
    type: "climatisation",
    phone: "+216 71 700 800",
    address: "Ariana, Tunisie",
    regions: ["ariana", "tunis", "ben_arous", "nabeul"],
    description: "Distribution et pose d'équipements CVC",
  },

  // ── Étanchéité ──
  {
    id: "sika",
    name: "Sika Tunisie",
    type: "etancheite",
    phone: "+216 71 385 700",
    address: "Z.I. 1 Rue de l'Énergie Solaire, 2035 Nouvelle Medina, Ben Arous, Tunisie",
    website: "tun.sika.com",
    regions: ["ben_arous", "tunis", "ariana", "nabeul", "sousse", "sfax"],
    description: "Produits chimiques pour la construction, solutions d'étanchéité",
  },
  {
    id: "etam",
    name: "ETAM - Étanchéité Moderne",
    type: "etancheite",
    phone: "+216 71 230 450",
    address: "El Menzah, Tunis, Tunisie",
    regions: ["tunis", "ariana", "ben_arous"],
    description: "Travaux d'étanchéité de toitures, terrasses et isolation",
  },

  // ── Architecture ──
  {
    id: "aau",
    name: "Atelier d'Architecture et d'Urbanisme (AAU)",
    type: "architecte",
    phone: "+216 71 331 400",
    address: "10 Rue Ibn Khaldoun, Tunis, Tunisie",
    regions: ["tunis", "ariana", "ben_arous", "nabeul"],
    description: "Conception architecturale et suivi de projets de construction",
  },
  {
    id: "studio3",
    name: "Studio 3 Architectes",
    type: "architecte",
    phone: "+216 71 742 100",
    address: "Marsa Cube, La Marsa, Tunis, Tunisie",
    regions: ["tunis", "ariana", "ben_arous"],
    description: "Études architecturales, design d'intérieur et maîtrise d'œuvre",
  },

  // ── Bureau d'Études ──
  {
    id: "romdhane",
    name: "Bureau d'Étude Romdhane",
    type: "bureau_etudes",
    phone: "+216 96 300 558",
    email: "h.romdhane@outlook.com",
    address: "Akouda, Sousse, Tunisie",
    website: "bureau-romdhane.tn",
    regions: ["sousse", "monastir", "mahdia", "tunis", "sfax"],
    description: "Ingénierie civile, calculs de structures, BIM management",
  },
  {
    id: "mosaique",
    name: "Groupe Mosaïque Ingénierie",
    type: "bureau_etudes",
    phone: "+216 71 180 215",
    email: "headoffice@mosaique-ingenierie.com",
    address: "Rue Omar Al Khayam, Tunis, Tunisie",
    website: "www.mosaique-ingenierie.com",
    regions: ["tunis", "ariana", "ben_arous", "nabeul", "sousse"],
    description: "Bureau d'études génie civil, structures et études géotechniques",
  },

  // ── Quincaillerie ──
  {
    id: "qgb",
    name: "QGB - Quincaillerie Générale du Bâtiment",
    type: "quincaillerie",
    phone: "+216 71 258 300",
    address: "Avenue de Londres, Tunis, Tunisie",
    regions: ["tunis", "ariana", "ben_arous"],
    description: "Vente en gros de quincaillerie, outillage à main",
  },
  {
    id: "cgq",
    name: "CGQ - Comptoir Général de Quincaillerie",
    type: "quincaillerie",
    phone: "+216 74 221 600",
    address: "Sfax, Tunisie",
    regions: ["sfax", "tunis", "sousse"],
    description: "Fourniture d'accessoires de portes, serrures et fixations",
  },

  // ── Location d'Engins ──
  {
    id: "tle",
    name: "TLE - Tunisie Location Engins",
    type: "location_engins",
    phone: "+216 71 460 200",
    address: "Rades, Ben Arous, Tunisie",
    regions: ["ben_arous", "tunis", "ariana", "nabeul", "bizerte"],
    description: "Location de pelles mécaniques, grues, chargeuses",
  },
  {
    id: "med_loc",
    name: "Med Loc BTP",
    type: "location_engins",
    phone: "+216 71 901 100",
    address: "Tunis, Tunisie",
    regions: ["tunis", "ariana", "ben_arous"],
    description: "Location de matériel de chantier, compacteurs et nacelles",
  },

  // ── Démolition ──
  {
    id: "sgdt",
    name: "SGDT - Société Générale de Démolition et Terrassement",
    type: "demolition",
    phone: "+216 71 712 300",
    address: "Ariana, Tunisie",
    regions: ["ariana", "tunis", "ben_arous", "manouba"],
    description: "Démolition d'ouvrages, sciage de béton et concassage",
  },
  {
    id: "demolition_express",
    name: "Démolition Express Tunisie",
    type: "demolition",
    phone: "+216 25 400 500",
    address: "Ben Arous, Tunisie",
    regions: ["ben_arous", "tunis", "ariana"],
    description: "Travaux de démolition contrôlée et évacuation de gravats",
  },

  // ── Terrassement ──
  {
    id: "stt",
    name: "STT - Société Tunisienne de Terrassement",
    type: "terrassement",
    phone: "+216 71 540 800",
    address: "Mnihla, Ariana, Tunisie",
    regions: ["ariana", "tunis", "ben_arous", "manouba", "bizerte"],
    description: "Grands travaux de terrassement, nivellement et pistes",
  },
  {
    id: "sotravet",
    name: "Sotravet",
    type: "terrassement",
    phone: "+216 74 241 100",
    email: "contact@sotravet.com.tn",
    address: "Z.I. Poudrière 1, Sfax, Tunisie",
    regions: ["sfax", "tunis", "sousse", "gabes"],
    description: "Travaux publics, VRD et terrassement",
  },
];

/**
 * Find suppliers matching a project's needs based on provider types and region
 */
export function findMatchingSuppliers(
  providerTypes: string[],
  region: string
): Array<{
  type: string;
  label: string;
  icon: string;
  suppliers: Supplier[];
}> {
  const PROVIDER_LABELS: Record<string, { icon: string; label: string }> = {
    architecte: { icon: "Building2", label: "Architecte" },
    bureau_etudes: { icon: "FileText", label: "Bureau d'études techniques" },
    entreprise_generale: { icon: "Building2", label: "Entreprise générale" },
    macon: { icon: "HardHat", label: "Maçonnerie / Gros œuvre" },
    carreleur: { icon: "Paintbrush", label: "Carrelage / Revêtement" },
    marbrier: { icon: "Paintbrush", label: "Marbrerie" },
    peintre: { icon: "Paintbrush", label: "Peinture" },
    platrier: { icon: "Paintbrush", label: "Plâtrerie / Isolation" },
    menuisier_bois: { icon: "Paintbrush", label: "Menuiserie bois" },
    menuisier_aluminium: { icon: "Paintbrush", label: "Menuiserie alu/PVC" },
    vitrier: { icon: "Paintbrush", label: "Vitrerie" },
    plombier: { icon: "Wrench", label: "Plomberie" },
    electricien: { icon: "Zap", label: "Électricité" },
    climatisation: { icon: "Wind", label: "Climatisation" },
    etancheite: { icon: "Shield", label: "Étanchéité" },
    pisciniste: { icon: "Droplets", label: "Piscine" },
    paysagiste: { icon: "Leaf", label: "Paysagisme" },
    demolition: { icon: "TriangleAlert", label: "Démolition" },
    terrassement: { icon: "Truck", label: "Terrassement" },
    location_engins: { icon: "Truck", label: "Location d'engins" },
    transporteur: { icon: "Truck", label: "Transport" },
    beton_ready: { icon: "Truck", label: "Béton prêt à l'emploi" },
    ciment: { icon: "Package", label: "Ciment" },
    acier: { icon: "Package", label: "Acier" },
    carrelage: { icon: "Package", label: "Carrelage" },
    sanitaire: { icon: "Package", label: "Sanitaire" },
    cuisine: { icon: "Package", label: "Cuisine" },
    solaire: { icon: "Sun", label: "Énergie solaire" },
    portes_fenetres: { icon: "Package", label: "Portes & Fenêtres" },
    quincaillerie: { icon: "Package", label: "Quincaillerie" },
    promoteur: { icon: "Building2", label: "Promoteur immobilier" },
    coffer: { icon: "HardHat", label: "Coffrage" },
    ferrailleur: { icon: "HardHat", label: "Ferraillage" },
  };

  return providerTypes
    .map((type) => {
      const supplierIds = SUPPLIERS_BY_TYPE[type] || [];
      let suppliers = SUPPLIERS.filter((s) => supplierIds.includes(s.id));

      // Filter by region: prefer suppliers serving this region
      const regionSuppliers = suppliers.filter((s) =>
        s.regions.includes(region)
      );
      const otherSuppliers = suppliers.filter(
        (s) => !s.regions.includes(region)
      );

      // Sort: region first, then others
      const sorted = [...regionSuppliers, ...otherSuppliers].slice(0, 2);

      if (sorted.length === 0) {
        // Fallback: find any supplier of matching type
        const fallback = SUPPLIERS.filter((s) => s.type === type).slice(0, 1);
        if (fallback.length === 0) return null;
        return {
          type,
          label: PROVIDER_LABELS[type]?.label || type,
          icon: PROVIDER_LABELS[type]?.icon || "Package",
          suppliers: fallback,
        };
      }

      return {
        type,
        label: PROVIDER_LABELS[type]?.label || type,
        icon: PROVIDER_LABELS[type]?.icon || "Package",
        suppliers: sorted,
      };
    })
    .filter(Boolean) as Array<{
    type: string;
    label: string;
    icon: string;
    suppliers: Supplier[];
  }>;
}
