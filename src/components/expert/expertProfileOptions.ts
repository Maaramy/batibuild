import { Briefcase, HardHat, Ruler, Store, Wrench, Zap } from "lucide-react";

// ============================================================================
// OPTIONS DU PROFIL EXPERT — professions, spécialités et régions
//
// Constantes partagées par l'espace expert (formulaire) et l'annuaire ProMarket.
// Extraites de la page ExpertDashboard pour garder une seule source de vérité.
// ============================================================================

export const EXPERT_PROFESSIONS = [
  { value: "architecte", label: "Architecte", icon: Ruler, desc: "Conception, plans, suivi de chantier" },
  { value: "bureau_etudes", label: "Bureau d'études", icon: Briefcase, desc: "Études techniques, dimensionnement" },
  { value: "ingenieur", label: "Ingénieur", icon: HardHat, desc: "Structure, génie civil, MEP" },
  { value: "promoteur_immobilier", label: "Promoteur immobilier", icon: Store, desc: "Développement, commercialisation" },
  { value: "plombier", label: "Plombier", icon: Wrench, desc: "Installation, réparation, maintenance plomberie" },
  { value: "electricien", label: "Électricien", icon: Zap, desc: "Installation, câblage, maintenance électrique" },
];

const ARCHITECTE_SPECIALTIES = [
  "conception_architecturale", "plans_2d", "plans_3d", "bim",
  "permis_construire", "decoration_interieure", "paysagisme",
  "renovation_patrimoine", "audit_energetique", "suivi_chantier",
];

const BUREAU_ETUDES_SPECIALTIES = [
  "etudes_structure", "dimensionnement", "bim_modeling",
  "assistance_technique", " controle_technique", "etudes_impact",
  "geotechnique", "topographie", "plans_executeifs",
  "dossier_consultation_entreprises",
];

const INGENIEUR_SPECIALTIES = [
  "genie_civil", "structure_beton", "structure_acier",
  "installation_thermique", "installation_sanitaire",
  "installation_electrique", "cvc", "assainissement",
  "ignifugation", "etancheite", "acoustique",
];

const PROMOTEUR_SPECIALTIES = [
  "promotion_immobiliere", "viabilisation", "commercialisation",
  "gestion_projet", "finance_projet", "urbanisme",
  "permis_construire", "etudes_marche", "negociation",
  "suivi_livraison",
];

const PLOMBIER_SPECIALTIES = [
  "installation_eau_croisse", "reparation_fuites", "depannage_plomberie",
  "installation_sanitaires", "canalisation_evacuation", "chauffe_eau",
  "plomberie_industrielle", "maintenance_preventive", "raccordement_gaz",
  "traitement_eau",
];

const ELECTRICIEN_SPECIALTIES = [
  "installation_electrique_neuve", "renovation_electrique", "câblage_structure",
  "tableau_electrique", "eclairage_interieur_exterieur", "prise_interrupteur",
  "installation_solaire", "domotique", "depannage_electrique",
  "contrôle_conformite",
];

export const PROFESSION_SPECIALTIES: Record<string, string[]> = {
  architecte: ARCHITECTE_SPECIALTIES,
  bureau_etudes: BUREAU_ETUDES_SPECIALTIES,
  ingenieur: INGENIEUR_SPECIALTIES,
  promoteur_immobilier: PROMOTEUR_SPECIALTIES,
  plombier: PLOMBIER_SPECIALTIES,
  electricien: ELECTRICIEN_SPECIALTIES,
};

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
  installation_eau_croisse: "Installation eau croissée",
  reparation_fuites: "Réparation de fuites",
  depannage_plomberie: "Dépannage plomberie",
  installation_sanitaires_p: "Installation sanitaires",
  canalisation_evacuation: "Canalisation & évacuation",
  chauffe_eau: "Chauffe-eau",
  plomberie_industrielle: "Plomberie industrielle",
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
};

export const TUNISIA_REGIONS = [
  { value: "tunis", label: "Tunis" }, { value: "ariana", label: "Ariana" },
  { value: "ben_arous", label: "Ben Arous" }, { value: "manouba", label: "Manouba" },
  { value: "nabeul", label: "Nabeul" }, { value: "zaghouan", label: "Zaghouan" },
  { value: "bizerte", label: "Bizerte" }, { value: "beja", label: "Béja" },
  { value: "jendouba", label: "Jendouba" }, { value: "le_kef", label: "Le Kef" },
  { value: "siliana", label: "Siliana" }, { value: "kairouan", label: "Kairouan" },
  { value: "kasserine", label: "Kasserine" }, { value: "sidi_bouzid", label: "Sidi Bouzid" },
  { value: "sousse", label: "Sousse" }, { value: "monastir", label: "Monastir" },
  { value: "mahdia", label: "Mahdia" }, { value: "sfax", label: "Sfax" },
  { value: "gabes", label: "Gabès" }, { value: "medenine", label: "Médenine" },
  { value: "tataouine", label: "Tataouine" }, { value: "gafsa", label: "Gafsa" },
  { value: "tozeur", label: "Tozeur" }, { value: "kebili", label: "Kébili" },
];
