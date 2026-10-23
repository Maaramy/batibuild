// ============================================================================
// PROFESSIONS & SPÉCIALITÉS DES EXPERTS — constantes partagées
//
// ⚠️ Ce module doit rester SANS dépendance (aucun import) : il est utilisé par
// l'espace Expert (formulaire), l'annuaire ProMarket et le backend Convex
// (`recommendedProviders`).
//
// La catégorie « Professionnel » regroupe les métiers techniques du bâtiment
// et des travaux : elle remplace les anciennes professions indépendantes
// « Plombier » et « Électricien », conservées ici uniquement comme valeurs
// historiques (aucune donnée existante n'est perdue).
// ============================================================================

/** Libellés des professions experts (valeurs historiques incluses). */
export const EXPERT_PROFESSION_LABELS: Record<string, string> = {
  architecte: "Architecte",
  bureau_etudes: "Bureau d'études",
  ingenieur: "Ingénieur",
  promoteur_immobilier: "Promoteur immobilier",
  professionnel: "Professionnel",
  // Valeurs historiques — uniquement pour l'affichage des profils existants.
  plombier: "Plombier",
  electricien: "Électricien",
};

/** Ordre d'affichage officiel des professions. */
export const EXPERT_PROFESSION_ORDER = [
  "architecte",
  "bureau_etudes",
  "ingenieur",
  "promoteur_immobilier",
  "professionnel",
] as const;

/** Anciennes professions « métier » désormais regroupées dans « Professionnel ». */
export const LEGACY_TECHNICIAN_PROFESSIONS = ["plombier", "electricien"] as const;

/**
 * Normalise une profession lue en base : les valeurs historiques
 * `plombier` / `electricien` sont rattachées à la catégorie « Professionnel »
 * (la spécialité enregistrée sur le profil reste inchangée).
 */
export function normalizeExpertProfession(
  profession: string | null | undefined,
): string {
  const value = (profession ?? "").trim();
  if (!value) return "architecte";
  return (LEGACY_TECHNICIAN_PROFESSIONS as readonly string[]).includes(value)
    ? "professionnel"
    : value;
}

/** Libellé d'une profession, avec repli sur la valeur brute. */
export function expertProfessionLabel(
  profession: string | null | undefined,
): string {
  const value = (profession ?? "").trim();
  if (!value) return "";
  return EXPERT_PROFESSION_LABELS[value] ?? value;
}

// ============================================================================
// SPÉCIALITÉS DE LA CATÉGORIE « PROFESSIONNEL »
// ============================================================================

export interface ExpertSpecialtyGroup {
  label: string;
  options: string[];
}

/** Groupes de métiers proposés dans le champ obligatoire « Spécialité ». */
export const PROFESSIONNEL_SPECIALTY_GROUPS: ExpertSpecialtyGroup[] = [
  {
    label: "Plomberie et installations techniques",
    options: [
      "plombier",
      "electricien",
      "chauffagiste",
      "installateur_cvc",
      "frigoriste",
      "installateur_panneaux_solaires",
      "installateur_chauffe_eau_solaire",
      "technicien_domotique",
      "installateur_securite_alarme",
      "technicien_reseaux_telecoms",
    ],
  },
  {
    label: "Gros œuvre et structure",
    options: [
      "macon",
      "coffreur",
      "ferrailleur",
      "bancheur",
      "constructeur_piscines",
      "piscinier",
      "etancheur",
      "terrassier",
      "demolisseur",
      "charpentier_metallique",
    ],
  },
  {
    label: "Second œuvre et finitions",
    options: [
      "peintre_batiment",
      "platrier",
      "plaquiste",
      "poseur_faux_plafonds",
      "carreleur",
      "poseur_revetements_sol",
      "menuisier_bois",
      "menuisier_aluminium_pvc",
      "vitrier",
      "serrurier",
      "ferronnier",
      "poseur_portes_fenetres",
      "jointeur",
      "staffeur_decorateur_platre",
    ],
  },
  {
    label: "Aménagements et équipements",
    options: [
      "paysagiste",
      "jardinier",
      "installateur_clotures_portails",
      "poseur_paves_dallages",
      "installateur_cuisines_equipees",
      "installateur_sanitaires",
      "specialiste_etancheite_terrasses",
      "technicien_isolation",
      "nettoyeur_fin_chantier",
      "specialiste_renovation_immobiliere",
    ],
  },
];

/** Liste à plat des spécialités « Professionnel » (toutes catégories). */
export const PROFESSIONNEL_SPECIALTIES: string[] =
  PROFESSIONNEL_SPECIALTY_GROUPS.flatMap((group) => group.options);

// ============================================================================
// LIBELLÉS DES SPÉCIALITÉS
// ============================================================================

export const SPECIALTY_LABELS: Record<string, string> = {
  conception_architecturale: "Conception architecturale",
  plans_2d: "Plans 2D", plans_3d: "Plans 3D", bim: "BIM",
  permis_construire: "Permis de construire",
  decoration_interieure: "Décoration intérieure",
  paysagisme: "Paysagisme", renovation_patrimoine: "Rénovation patrimoine",
  audit_energetique: "Audit énergétique", suivi_chantier: "Suivi de chantier",
  etudes_structure: "Études de structure", dimensionnement: "Dimensionnement",
  bim_modeling: "Modélisation BIM", assistance_technique: "Assistance technique",
  controle_technique: "Contrôle technique", etudes_impact: "Études d'impact",
  geotechnique: "Géotechnique", topographie: "Topographie",
  plans_executeifs: "Plans exécutifs",
  dossier_consultation_entreprises: "DCE",
  genie_civil: "Génie civil", structure_beton: "Structure béton",
  structure_acier: "Structure acier", installation_thermique: "Installations thermiques",
  installation_sanitaire: "Installations sanitaires",
  installation_electrique: "Installations électriques",
  cvc: "CVC", assainissement: "Assainissement",
  ignifugation: "Ignifugation", etancheite: "Étanchéité", acoustique: "Acoustique",
  promotion_immobiliere: "Promotion immobilière", viabilisation: "Viabilisation",
  commercialisation: "Commercialisation", gestion_projet: "Gestion de projet",
  finance_projet: "Financement", urbanisme: "Urbanisme",
  etudes_marche: "Études de marché", negociation: "Négociation",
  suivi_livraison: "Suivi de livraison",
  // Plombier
  installation_eau_croisee: "Installation eau croisée",
  installation_eau_croisse: "Installation eau croisée",
  reparation_fuites: "Réparation de fuites",
  depannage_plomberie: "Dépannage plomberie",
  installation_sanitaires: "Installation sanitaires",
  installation_sanitaires_p: "Installation sanitaires",
  canalisation_evacuation: "Canalisation & évacuation",
  chauffe_eau: "Chauffe-eau",
  plomberie_industrielle: "Plomberie industrielle",
  maintenance_preventive: "Maintenance préventive",
  maintenance_preventive_p: "Maintenance préventive",
  raccordement_gaz: "Raccordement gaz",
  traitement_eau: "Traitement de l'eau",
  // Électricien
  installation_electrique_neuve: "Installation électrique neuve",
  renovation_electrique: "Rénovation électrique",
  câblage_structure: "Câblage structuré",
  tableau_electrique: "Tableau électrique",
  eclairage_interieur_exterieur: "Éclairage intérieur/extérieur",
  prise_interrupteur: "Prises & interrupteurs",
  installation_solaire: "Installation solaire",
  domotique: "Domotique",
  depannage_electrique: "Dépannage électrique",
  contrôle_conformite: "Contrôle de conformité",
  // Professionnel — Plomberie et installations techniques
  plombier: "Plombier",
  electricien: "Électricien",
  chauffagiste: "Chauffagiste",
  installateur_cvc: "Installateur de climatisation et ventilation (CVC)",
  frigoriste: "Frigoriste",
  installateur_panneaux_solaires: "Installateur de panneaux solaires",
  installateur_chauffe_eau_solaire: "Installateur de chauffe-eau solaire",
  technicien_domotique: "Technicien en domotique",
  installateur_securite_alarme: "Installateur de systèmes de sécurité et d'alarme",
  technicien_reseaux_telecoms: "Technicien en réseaux et télécommunications",
  // Professionnel — Gros œuvre et structure
  macon: "Maçon",
  coffreur: "Coffreur",
  ferrailleur: "Ferrailleur",
  bancheur: "Bancheur",
  constructeur_piscines: "Constructeur de piscines",
  piscinier: "Piscinier",
  etancheur: "Étancheur",
  terrassier: "Terrassier",
  demolisseur: "Démolisseur",
  charpentier_metallique: "Charpentier métallique",
  // Professionnel — Second œuvre et finitions
  peintre_batiment: "Peintre en bâtiment",
  platrier: "Plâtrier",
  plaquiste: "Plaquiste",
  poseur_faux_plafonds: "Poseur de faux plafonds",
  carreleur: "Carreleur",
  poseur_revetements_sol: "Poseur de revêtements de sol",
  menuisier_bois: "Menuisier bois",
  menuisier_aluminium_pvc: "Menuisier aluminium et PVC",
  vitrier: "Vitrier",
  serrurier: "Serrurier",
  ferronnier: "Ferronnier",
  poseur_portes_fenetres: "Poseur de portes et fenêtres",
  jointeur: "Jointeur",
  staffeur_decorateur_platre: "Staffeur et décorateur en plâtre",
  // Professionnel — Aménagements et équipements
  paysagiste: "Paysagiste",
  jardinier: "Jardinier",
  installateur_clotures_portails: "Installateur de clôtures et portails",
  poseur_paves_dallages: "Poseur de pavés et dallages extérieurs",
  installateur_cuisines_equipees: "Installateur de cuisines équipées",
  installateur_sanitaires: "Installateur de sanitaires",
  specialiste_etancheite_terrasses: "Spécialiste en étanchéité des terrasses",
  technicien_isolation: "Technicien en isolation thermique et acoustique",
  nettoyeur_fin_chantier: "Nettoyeur de fin de chantier",
  specialiste_renovation_immobiliere: "Spécialiste en rénovation immobilière",
};

/** Libellé d'une spécialité, avec repli sur la clé brute. */
export function expertSpecialtyLabel(key: string): string {
  return SPECIALTY_LABELS[key] ?? key;
}

/**
 * Normalise un texte pour la recherche : minuscules, sans accents, espaces
 * multiples réduits. Permet de trouver « Électricien » en tapant « electricien ».
 */
export function normalizeExpertText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
