import { Briefcase, HardHat, Ruler, Store, Wrench } from "lucide-react";
import { PROFESSIONNEL_SPECIALTIES } from "@/lib/expertProfessions";

// ============================================================================
// OPTIONS DU PROFIL EXPERT — professions, spécialités et régions
//
// Constantes partagées par l'espace expert (formulaire) et l'annuaire ProMarket.
// Extraites de la page ExpertDashboard pour garder une seule source de vérité.
// Les libellés et les spécialités « Professionnel » vivent dans
// `src/lib/expertProfessions.ts` (module sans dépendance, partagé avec Convex).
// ============================================================================

export {
  EXPERT_PROFESSION_LABELS,
  PROFESSIONNEL_SPECIALTY_GROUPS,
  SPECIALTY_LABELS,
} from "@/lib/expertProfessions";

/**
 * Professions proposées dans l'espace Expert.
 *
 * « Professionnel » regroupe les métiers techniques du bâtiment et des
 * travaux : les anciennes entrées indépendantes « Plombier » et
 * « Électricien » ont été retirées de cette liste et sont désormais
 * sélectionnables dans le champ « Spécialité » de cette catégorie.
 */
export const EXPERT_PROFESSIONS = [
  { value: "architecte", label: "Architecte", icon: Ruler, desc: "Conception, plans, suivi de chantier" },
  { value: "bureau_etudes", label: "Bureau d'études", icon: Briefcase, desc: "Études techniques, dimensionnement" },
  { value: "ingenieur", label: "Ingénieur", icon: HardHat, desc: "Structure, génie civil, MEP" },
  { value: "promoteur_immobilier", label: "Promoteur immobilier", icon: Store, desc: "Développement, commercialisation" },
  { value: "professionnel", label: "Professionnel", icon: Wrench, desc: "Métiers techniques du bâtiment et des travaux" },
];

const ARCHITECTE_SPECIALTIES = [
  "conception_architecturale", "plans_2d", "plans_3d", "bim",
  "permis_construire", "decoration_interieure", "paysagisme",
  "renovation_patrimoine", "audit_energetique", "suivi_chantier",
];

const BUREAU_ETUDES_SPECIALTIES = [
  "etudes_structure", "dimensionnement", "bim_modeling",
  "assistance_technique", "controle_technique", "etudes_impact",
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

/** Anciennes spécialités « Plombier » — conservées pour les profils existants. */
const PLOMBIER_SPECIALTIES = [
  "installation_eau_croisee", "reparation_fuites", "depannage_plomberie",
  "installation_sanitaires", "canalisation_evacuation", "chauffe_eau",
  "plomberie_industrielle", "maintenance_preventive", "raccordement_gaz",
  "traitement_eau",
];

/** Anciennes spécialités « Électricien » — conservées pour les profils existants. */
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
  professionnel: PROFESSIONNEL_SPECIALTIES,
  // Valeurs historiques (profils déjà enregistrés) : la liste reste disponible
  // pour ne jamais perdre une spécialité déjà stockée.
  plombier: PLOMBIER_SPECIALTIES,
  electricien: ELECTRICIEN_SPECIALTIES,
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
