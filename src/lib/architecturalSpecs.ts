// ============================================================================
// SPÉCIFICATIONS ARCHITECTURALES PAR TYPE DE PROJET
// ----------------------------------------------------------------------------
// Source unique de vérité du module « Plans architecturaux AI ».
//
// Chaque type de projet dispose de SES propres spécifications : programme des
// espaces, circulations, équipements, besoins extérieurs, exigences techniques
// (plomberie / électricité), points de vigilance réglementaires et questions
// spécifiques à poser avant la génération.
//
// Le moteur de plans (`floorPlanEngine`) consomme directement ces
// spécifications : deux types de projet ne peuvent donc pas produire le même
// programme résidentiel générique. Aucune donnée n'est dupliquée ailleurs :
// l'écran « Plans architecturaux AI » affiche exactement ce que le moteur
// applique.
//
// Les plans restent des documents d'aide à la conception : ils ne constituent
// ni une validation réglementaire, ni un plan d'exécution certifié.
// ============================================================================

import { resolveProjectType } from "../convex/projectTypes";
import type { RoomKind } from "./floorPlanEngine";

/** Famille de composition utilisée par le moteur génératif. */
export type ArchitecturalFamily =
  | "residentiel"
  | "logement_collectif"
  | "tertiaire"
  | "logistique"
  | "tourisme"
  | "restauration"
  | "renovation";

/** Les 14 types pris en charge par le module de plans (groupe A). */
export const ARCHITECTURAL_PLAN_TYPES = [
  "maison",
  "appartement",
  "villa",
  "immeuble",
  "local_commercial",
  "studio",
  "duplex",
  "bureau",
  "entrepot",
  "residence_touristique",
  "projet_neuf",
  "restaurant",
  "cafe",
  "renovation_complete",
] as const;

export type ArchitecturalPlanType = (typeof ARCHITECTURAL_PLAN_TYPES)[number];

export interface PlanQuestion {
  id: string;
  label: string;
  kind: "number" | "choice" | "boolean";
  unit?: string;
  min?: number;
  max?: number;
  options?: string[];
  /** Valeur retenue quand l'utilisateur ne répond pas (hypothèse affichée). */
  defaultValue: number | string | boolean;
  hint: string;
}

export interface ArchitecturalSpec {
  category: ArchitecturalPlanType;
  label: string;
  family: ArchitecturalFamily;
  /** Espaces attendus dans chaque variante (programme de référence). */
  spaces: string[];
  /** Principe de circulation propre au type de bâtiment. */
  circulation: string;
  /** Équipements et locaux de service attendus. */
  equipment: string[];
  /** Aménagements extérieurs pertinents (jamais comptés dans le bâti). */
  exterior: string[];
  technical: {
    plumbing: string;
    electrical: string;
    ventilation?: string;
  };
  /** Points de vigilance réglementaires (à vérifier, jamais « validés »). */
  regulation: string[];
  levels: { min: number; max: number; default: number };
  surface: { min: number; max: number; default: number };
  /** Pièces indispensables au programme — contrôlées par les tests. */
  requiredKinds: RoomKind[];
  /** Repères de libellés propres au type — contrôlés par les tests. */
  signature: string[];
  questions: PlanQuestion[];
  /** Hypothèses affichées explicitement quand une donnée manque. */
  assumptions: string[];
  /** Phrase de composition reprise dans la note conceptuelle. */
  organization: string;
  /** Besoins extérieurs par défaut (en plus des travaux déclarés). */
  exteriorNeeds: {
    garden: boolean;
    terrace: boolean;
    pool: boolean;
    parking: boolean;
  };
}

const Q = {
  bedrooms: (def: number, hint = "Chambres nécessaires au programme."): PlanQuestion => ({
    id: "bedrooms",
    label: "Nombre de chambres",
    kind: "number",
    min: 0,
    max: 8,
    defaultValue: def,
    hint,
  }),
  bathrooms: (def: number): PlanQuestion => ({
    id: "bathrooms",
    label: "Salles de bains",
    kind: "number",
    min: 0,
    max: 5,
    defaultValue: def,
    hint: "Une salle d'eau par groupe de chambres, plus les sanitaires visiteurs.",
  }),
  kitchenOpen: (open: boolean): PlanQuestion => ({
    id: "kitchenOpen",
    label: "Cuisine",
    kind: "choice",
    options: ["Ouverte sur le séjour", "Fermée"],
    defaultValue: open ? "Ouverte sur le séjour" : "Fermée",
    hint: "Une cuisine ouverte agrandit la pièce de vie ; une cuisine fermée limite odeurs et bruit.",
  }),
  levels: (def: number, max = 4): PlanQuestion => ({
    id: "floors",
    label: "Nombre de niveaux",
    kind: "number",
    min: 1,
    max,
    defaultValue: def,
    hint: "Chaque niveau est dessiné séparément, avec continuité d'escalier et de gaines.",
  }),
  terrace: (def: boolean): PlanQuestion => ({
    id: "terrace",
    label: "Terrasse / balcon",
    kind: "boolean",
    defaultValue: def,
    hint: "Espace extérieur privatif, jamais compté dans la surface bâtie.",
  }),
  pool: (def: boolean): PlanQuestion => ({
    id: "pool",
    label: "Piscine",
    kind: "boolean",
    defaultValue: def,
    hint: "Implantée uniquement dans la parcelle, avec dégagements de sécurité.",
  }),
  garage: (def: boolean): PlanQuestion => ({
    id: "garage",
    label: "Garage couvert",
    kind: "boolean",
    defaultValue: def,
    hint: "Surface complémentaire intégrée au bâti, distincte de la surface habitable.",
  }),
};

export const ARCHITECTURAL_SPECS: Record<ArchitecturalPlanType, ArchitecturalSpec> = {
  // ── 1. Maison ─────────────────────────────────────────────────────────────
  maison: {
    category: "maison",
    label: "Maison",
    family: "residentiel",
    spaces: [
      "Entrée principale et hall de distribution",
      "Séjour et salle à manger",
      "Cuisine (ouverte ou fermée)",
      "Chambres et salle(s) de bains",
      "WC invités et rangements",
      "Bureau ou chambre d'appoint selon la surface",
    ],
    circulation:
      "Hall qui filtre l'entrée, desserte des pièces de jour sans traversée des chambres, couloir de nuit à l'étage.",
    equipment: ["Buanderie / local linge", "Rangement d'entrée", "Local technique si équipements"],
    exterior: ["Terrasse", "Jardin", "Garage si déclaré", "Stationnement"],
    technical: {
      plumbing:
        "Une colonne EU/EV par groupe de pièces humides, alimentation cuisine + SdB + WC, chauffe-eau au niveau.",
      electrical:
        "Tableau par niveau, circuits éclairage / prises / spécialisés (cuisine, chauffe-eau, climatisation).",
      ventilation: "Ventilation naturelle traversante ; extraction mécanique des pièces humides.",
    },
    regulation: [
      "Reculs, emprise au sol et hauteur à vérifier auprès du service d'urbanisme.",
      "Accessibilité PMR du seuil et du RDC à confirmer selon le programme.",
    ],
    levels: { min: 1, max: 4, default: 1 },
    surface: { min: 50, max: 300, default: 110 },
    requiredKinds: ["sejour", "cuisine", "chambre", "sdb", "wc"],
    signature: ["Séjour", "Cuisine", "Chambre principale"],
    questions: [Q.bedrooms(3), Q.bathrooms(2), Q.kitchenOpen(false), Q.garage(false), Q.pool(false)],
    assumptions: [
      "Nombre de chambres déduit de la surface (1 chambre par tranche de 48 m²) s'il n'est pas saisi.",
      "Niveaux : 1 par défaut, ajustable dans la fiche projet.",
    ],
    organization:
      "Le rez-de-chaussée regroupe les espaces de vie, la cuisine et un hall qui filtre l'entrée ; les chambres sont regroupées à l'étage ou dans une zone nuit clairement séparée. Les circulations desservent chaque pièce sans traversée d'une chambre.",
    exteriorNeeds: { garden: true, terrace: true, pool: false, parking: true },
  },

  // ── 2. Appartement ────────────────────────────────────────────────────────
  appartement: {
    category: "appartement",
    label: "Appartement",
    family: "residentiel",
    spaces: [
      "Entrée et dégagement",
      "Séjour (avec salle à manger selon la surface)",
      "Cuisine ouverte ou fermée",
      "Chambres, salle de bains et WC",
      "Rangements intégrés",
    ],
    circulation:
      "Dégagement court depuis l'entrée ; aucune chambre traversante ; accès direct au séjour depuis le palier.",
    equipment: ["Rangement / placard d'entrée", "Buanderie ou niche lave-linge", "Gaine technique du logement"],
    exterior: ["Balcon ou loggia selon la configuration", "Terrasse si l'unité en dispose"],
    technical: {
      plumbing:
        "Réseaux regroupés sur les gaines techniques de l'immeuble, alimentation cuisine + SdB + WC, évacuation verticale.",
      electrical: "Tableau dans l'entrée, circuits prises / éclairage / spécialisés, terre commune de l'immeuble.",
      ventilation: "Ventilation sur gaine verticale de l'immeuble ; pas de percement de façade non autorisé.",
    },
    regulation: [
      "Murs porteurs, gaines techniques et parties communes de l'immeuble à relever avant travaux.",
      "Modification de façade / balcon soumise à l'autorisation de la copropriété.",
    ],
    levels: { min: 1, max: 1, default: 1 },
    surface: { min: 35, max: 250, default: 85 },
    requiredKinds: ["sejour", "cuisine", "chambre", "sdb", "wc"],
    signature: ["Entrée", "Séjour", "Cuisine", "Chambre principale"],
    questions: [Q.bedrooms(2), Q.bathrooms(1), Q.kitchenOpen(false), Q.terrace(true)],
    assumptions: [
      "Un seul niveau : l'appartement est une unité de logement, pas une maison sur plusieurs étages.",
      "Balcon / loggia signalé dans la fiche technique, non compté dans la surface bâtie.",
    ],
    organization:
      "L'entrée débouche sur un dégagement court qui distribue le séjour et les chambres ; la cuisine reste groupée avec les gaines techniques pour limiter les réseaux, et le séjour recherche la lumière naturelle sur la façade principale. Aucune pièce n'est traversante.",
    exteriorNeeds: { garden: false, terrace: true, pool: false, parking: false },
  },

  // ── 3. Villa ──────────────────────────────────────────────────────────────
  villa: {
    category: "villa",
    label: "Villa",
    family: "residentiel",
    spaces: [
      "Réception / salon d'apparat",
      "Grand séjour et salle à manger",
      "Suite parentale avec salle d'eau",
      "Chambres secondaires et salles de bains",
      "Cuisine et office",
      "Chambre de service et local de service selon le programme",
    ],
    circulation:
      "Espaces de réception et espaces privés différenciés ; accès extérieurs indépendants (service, garage) ; circulations intérieures courtes.",
    equipment: ["Office / cuisine d'été", "Buanderie et linge", "Local technique et chaufferie", "Garage"],
    exterior: ["Terrasse couverte", "Jardin", "Piscine", "Cuisine extérieure / barbecue", "Accès véhicules"],
    technical: {
      plumbing:
        "Colonnes séparées pour la zone privée et la zone de service, alimentation piscine et cuisine d'été, évacuations dimensionnées.",
      electrical:
        "Tableaux par niveau, circuits extérieurs (éclairage jardin, piscine, portail) et circuits spécialisés cuisine / climatisation.",
      ventilation: "Ventilation traversante, protection solaire des baies, extraction des cuisines et sanitaires.",
    },
    regulation: [
      "Implantation, reculs et orientation à vérifier sur le terrain réel (urbanisme local).",
      "Piscine : barrières, dégagements et traitement de l'eau soumis aux règles de sécurité applicables.",
      "Chambre de service : accès et sanitaires à conformer aux exigences d'habitabilité.",
    ],
    levels: { min: 1, max: 4, default: 2 },
    surface: { min: 90, max: 300, default: 180 },
    requiredKinds: ["sejour", "reception", "cuisine", "chambre", "sdb"],
    signature: ["Réception", "Séjour", "Chambre principale", "Salle de bain privative"],
    questions: [Q.bedrooms(4), Q.bathrooms(3), Q.pool(true), Q.garage(true), Q.levels(2)],
    assumptions: [
      "Suite parentale : chambre principale + salle d'eau privative, placée au RDC quand le programme le permet.",
      "Chambre de service proposée à partir de 200 m² construits.",
    ],
    organization:
      "La villa sépare clairement la réception, la vie de famille et le service : le salon d'apparat et le grand séjour occupent la façade principale, la suite parentale et les chambres se regroupent dans une zone privée, la cuisine et l'office restent reliés à l'accès de service et au garage. Les terrasses et le jardin prolongent les pièces de vie.",
    exteriorNeeds: { garden: true, terrace: true, pool: true, parking: true },
  },

  // ── 4. Immeuble ───────────────────────────────────────────────────────────
  immeuble: {
    category: "immeuble",
    label: "Immeuble",
    family: "logement_collectif",
    spaces: [
      "Hall d'entrée commun et paliers",
      "Escalier et ascenseur si prévu",
      "Logements ou locaux organisés selon le programme",
      "Gaines techniques et réseaux verticaux alignés",
    ],
    circulation:
      "Circulation verticale commune (escalier, ascenseur) et palier desservant chaque logement ; séparation nette entre flux communs et flux privés.",
    equipment: ["Gaine technique verticale", "Local poubelles / vélos si prévu", "Local technique commun"],
    exterior: ["Accès piétons et véhicules", "Stationnement", "Espaces verts communs"],
    technical: {
      plumbing:
        "Colonnes EU/EV alignées sur toute la hauteur, gaine technique continue, comptage par logement.",
      electrical:
        "Colonne montante, tableau par logement, éclairage des communs, terre et protection incendie des gaines.",
      ventilation: "Ventilation naturelle des logements et extraction mécanique des sanitaires ; désenfumage des communs à vérifier.",
    },
    regulation: [
      "Sécurité incendie des circulations communes (désenfumage, dégagements) à vérifier selon la hauteur.",
      "Accessibilité PMR : ascenseur, rampe et largeurs de palier selon la réglementation applicable.",
      "Surfaces vendables / communes à répartir sans double comptage.",
    ],
    levels: { min: 2, max: 5, default: 3 },
    surface: { min: 120, max: 300, default: 240 },
    requiredKinds: ["hall", "sejour", "cuisine", "chambre", "sdb"],
    signature: ["Palier commun", "Logement 1", "Gaine technique"],
    questions: [
      Q.levels(3, 6),
      {
        id: "unitsPerFloor",
        label: "Logements par étage",
        kind: "number",
        min: 1,
        max: 4,
        defaultValue: 2,
        hint: "Détermine la répétition des unités sur le palier.",
      },
      {
        id: "elevator",
        label: "Ascenseur",
        kind: "boolean",
        defaultValue: true,
        hint: "Réservé aux projets R+2 et plus, à confirmer selon l'accessibilité.",
      },
    ],
    assumptions: [
      "Superposition identique des niveaux : gaines et escalier alignés sur toute la hauteur.",
      "Un palier commun par étage, logements répétés depuis le RDC.",
    ],
    organization:
      "Chaque étage est un plan complet et indépendant : le palier commun donne accès à l'escalier, à l'ascenseur et aux gaines, puis dessert les logements sans traversée. Les réseaux verticaux restent alignés d'un niveau à l'autre et les pièces humides de chaque logement se regroupent sur la gaine.",
    exteriorNeeds: { garden: false, terrace: false, pool: false, parking: true },
  },

  // ── 5. Local commercial ───────────────────────────────────────────────────
  local_commercial: {
    category: "local_commercial",
    label: "Local commercial",
    family: "tertiaire",
    spaces: [
      "Entrée client et vitrine sur rue",
      "Espace de vente / présentation",
      "Comptoir et caisse",
      "Réserve et stockage",
      "Sanitaires et local technique",
    ],
    circulation:
      "Circulation client continue devant la vitrine ; circulation du personnel séparée par un couloir de service vers réserve et sanitaires.",
    equipment: ["Réserve", "Local technique", "Bureau gérant", "Sanitaire personnel"],
    exterior: ["Enseigne et vitrine", "Accès livraison", "Stationnement client"],
    technical: {
      plumbing: "Alimentation et évacuation des sanitaires et du point d'eau, colonne sur gaine technique.",
      electrical:
        "Tableau dimensionné pour l'éclairage de vitrine, les prises de caisse et les équipements de vente ; éclairage de sécurité.",
      ventilation: "Renouvellement d'air adapté à l'activité, extraction si préparation ou stockage.",
    },
    regulation: [
      "Accessibilité PMR de l'entrée et des sanitaires selon l'effectif reçu.",
      "Sécurité incendie, dégagements et enseigne soumis à autorisation.",
      "Activité exercée à vérifier avec le règlement d'urbanisme et la copropriété.",
    ],
    levels: { min: 1, max: 2, default: 1 },
    surface: { min: 50, max: 300, default: 120 },
    requiredKinds: ["reception", "openspace", "comptoir", "stockage", "sanitaire"],
    signature: ["Vitrine", "Espace de vente", "Comptoir", "Réserve"],
    questions: [
      {
        id: "activity",
        label: "Nature de l'activité",
        kind: "choice",
        options: ["Boutique", "Showroom", "Commerce alimentaire", "Services"],
        defaultValue: "Boutique",
        hint: "Adapte la vitrine, la réserve et les besoins techniques.",
      },
      {
        id: "salesArea",
        label: "Surface de vente",
        kind: "number",
        unit: "m²",
        min: 15,
        max: 250,
        defaultValue: 70,
        hint: "Le reste de la surface devient réserve, sanitaires et locaux techniques.",
      },
    ],
    assumptions: [
      "Réserve dimensionnée à environ 15 % de la surface si elle n'est pas précisée.",
      "Vitrine sur la façade principale, issue de secours sur la façade opposée.",
    ],
    organization:
      "La vitrine et l'entrée client occupent la façade principale ; l'espace de vente reste dégagé et conduit au comptoir, tandis qu'un couloir de service séparé dessert la réserve, les sanitaires et le local technique sans traverser la zone commerciale.",
    exteriorNeeds: { garden: false, terrace: false, pool: false, parking: true },
  },

  // ── 6. Studio ─────────────────────────────────────────────────────────────
  studio: {
    category: "studio",
    label: "Studio",
    family: "residentiel",
    spaces: [
      "Espace de vie multifonctionnel",
      "Zone de couchage",
      "Kitchenette compacte",
      "Salle d'eau et rangements intégrés",
    ],
    circulation:
      "Circulation minimale : l'entrée dessert directement l'espace de vie, la kitchenette et la salle d'eau sans couloir.",
    equipment: ["Rangements intégrés en hauteur", "Niche lave-linge", "Gaine technique compacte"],
    exterior: ["Balcon ou loggia si la configuration le permet"],
    technical: {
      plumbing: "Kitchenette et salle d'eau regroupées sur une gaine unique, évacuation compacte.",
      electrical: "Tableau d'entrée, circuits éclairage / prises / chauffe-eau, prises en nombre dans la kitchenette.",
      ventilation: "Extraction de la salle d'eau et de la kitchenette, ventilation naturelle de l'espace de vie.",
    },
    regulation: [
      "Surface minimale d'habitabilité et hauteur sous plafond à vérifier.",
      "Éclairement naturel de la pièce de vie obligatoire : une seule façade ne suffit pas toujours.",
    ],
    levels: { min: 1, max: 1, default: 1 },
    surface: { min: 18, max: 60, default: 32 },
    requiredKinds: ["sejour", "chambre", "cuisine", "sdb"],
    signature: ["Espace de vie multifonctionnel", "Zone de couchage", "Kitchenette"],
    questions: [
      {
        id: "sleeping",
        label: "Couchage",
        kind: "choice",
        options: ["Lit double", "Canapé-lit", "Deux lits simples"],
        defaultValue: "Lit double",
        hint: "La zone de couchage reste séparée visuellement de la cuisine.",
      },
      Q.kitchenOpen(true),
      Q.terrace(false),
    ],
    assumptions: [
      "Une seule pièce de vie : le couchage et la kitchenette sont des zones, pas des pièces fermées.",
      "Salle d'eau unique avec WC intégré.",
    ],
    organization:
      "Le studio est organisé comme un espace de vie unique : l'entrée dessert directement la pièce multifonctionnelle, la kitchenette et la salle d'eau sont regroupées sur une gaine compacte, et le couchage s'adosse à la façade la plus calme. Aucun couloir n'est créé.",
    exteriorNeeds: { garden: false, terrace: false, pool: false, parking: false },
  },

  // ── 7. Duplex ─────────────────────────────────────────────────────────────
  duplex: {
    category: "duplex",
    label: "Duplex",
    family: "residentiel",
    spaces: [
      "Rez-de-chaussée : séjour, salle à manger, cuisine, WC invités",
      "Étage : chambres, salle de bains, salle familiale",
      "Escalier avec trémie et garde-corps",
      "Rangements et buanderie",
    ],
    circulation:
      "Escalier unique implanté sur la même trémie aux deux niveaux ; jour en bas, nuit en haut ; aucune chambre traversée.",
    equipment: ["Buanderie à l'étage", "Dressing", "Local technique sous escalier"],
    exterior: ["Balcon ou terrasse à l'étage", "Jardin de plain-pied si terrain"],
    technical: {
      plumbing:
        "Colonne montante dans la gaine de l'escalier, pièces humides superposées entre les deux niveaux.",
      electrical: "Tableau par niveau, alimentation de l'escalier et éclairage de sécurité.",
      ventilation: "Ventilation naturelle double orientation, extraction des pièces humides des deux niveaux.",
    },
    regulation: [
      "Escalier : largeur, hauteur de marche et garde-corps à vérifier selon la réglementation.",
      "Trémie et structure du plancher à valider par l'ingénieur structure.",
    ],
    levels: { min: 2, max: 3, default: 2 },
    surface: { min: 70, max: 300, default: 140 },
    requiredKinds: ["sejour", "cuisine", "chambre", "sdb", "escalier"],
    signature: ["Séjour", "Coin bureau", "Salle familiale", "Chambre principale"],
    questions: [
      Q.bedrooms(3),
      Q.bathrooms(2),
      {
        id: "split",
        label: "Surfaces RDC / étage",
        kind: "choice",
        options: ["Équilibrées", "RDC plus grand", "Étage plus grand"],
        defaultValue: "Équilibrées",
        hint: "La surface totale du duplex est répartie sur les deux niveaux.",
      },
    ],
    assumptions: [
      "Deux niveaux minimum : le duplex est par définition un logement sur deux étages.",
      "Escalier aligné sur la même trémie aux deux niveaux.",
    ],
    organization:
      "Le duplex sépare nettement les fonctions : le rez-de-chaussée accueille le séjour, la salle à manger, la cuisine et un coin bureau, tandis que l'étage regroupe les chambres, la salle de bains et une salle familiale. L'escalier, implanté sur une trémie unique, organise les circulations et aligne les gaines entre les deux niveaux.",
    exteriorNeeds: { garden: false, terrace: true, pool: false, parking: true },
  },

  // ── 8. Bureau ─────────────────────────────────────────────────────────────
  bureau: {
    category: "bureau",
    label: "Bureau",
    family: "tertiaire",
    spaces: [
      "Accueil et zone d'attente",
      "Espace de travail ouvert",
      "Bureaux individuels / fermés",
      "Salle(s) de réunion",
      "Kitchenette et sanitaires",
    ],
    circulation:
      "Accueil qui filtre les visiteurs, desserte des bureaux sans traversée des espaces de travail, sanitaires accessibles depuis l'accueil.",
    equipment: ["Local technique / serveur", "Archives", "Kitchenette", "Sanitaires H/F"],
    exterior: ["Accès PMR", "Stationnement", "Éclairage extérieur"],
    technical: {
      plumbing: "Sanitaires et kitchenette regroupés sur une gaine unique, alimentation et évacuation.",
      electrical:
        "Tableau avec circuits data, éclairage, prises bureautiques et climatisation ; terre et protection des locaux informatiques.",
      ventilation: "Renouvellement d'air adapté à l'occupation, extraction sanitaires et kitchenette, confort acoustique.",
    },
    regulation: [
      "Accessibilité PMR : entrée, sanitaires, largeurs de circulation et ascenseur si étage.",
      "Évacuation et sécurité incendie selon l'effectif et la hauteur du bâtiment.",
      "Éclairement naturel et surfaces de travail à vérifier selon le code du travail.",
    ],
    levels: { min: 1, max: 3, default: 1 },
    surface: { min: 40, max: 300, default: 120 },
    requiredKinds: ["reception", "openspace", "bureau", "reunion", "sanitaire"],
    signature: ["Accueil", "Espace de travail ouvert", "Salle de réunion", "Kitchenette"],
    questions: [
      {
        id: "workstations",
        label: "Postes de travail",
        kind: "number",
        min: 1,
        max: 80,
        defaultValue: 16,
        hint: "Dimensionne l'espace ouvert et le nombre de bureaux fermés.",
      },
      {
        id: "meetingRooms",
        label: "Salles de réunion",
        kind: "number",
        min: 0,
        max: 5,
        defaultValue: 1,
        hint: "Une salle de 12 à 20 m² selon l'effectif reçu.",
      },
      {
        id: "publicReception",
        label: "Accueil du public",
        kind: "boolean",
        defaultValue: true,
        hint: "Ajoute une zone d'attente et un filtrage des visiteurs.",
      },
    ],
    assumptions: [
      "Un poste de travail pour 8 à 10 m² utiles ; bureaux fermés pour l'encadrement.",
      "Sanitaires dimensionnés pour l'effectif déclaré ou estimé.",
    ],
    organization:
      "L'accueil filtre les visiteurs et distribue l'espace de travail ouvert, les bureaux fermés et les salles de réunion. Les sanitaires, la kitchenette et le local technique sont regroupés sur une gaine unique, à l'écart des zones de travail, et les circulations évitent de traverser les postes.",
    exteriorNeeds: { garden: false, terrace: false, pool: false, parking: true },
  },

  // ── 9. Entrepôt ───────────────────────────────────────────────────────────
  entrepot: {
    category: "entrepot",
    label: "Entrepôt",
    family: "logistique",
    spaces: [
      "Grande zone de stockage",
      "Quai de chargement / expédition",
      "Circulation des engins de manutention",
      "Bureaux d'exploitation, sanitaires et vestiaires",
    ],
    circulation:
      "Boucle de circulation poids lourds et engins séparée des flux piétons ; quais accessibles sans traverser le stockage.",
    equipment: ["Quai de chargement", "Local technique", "Vestiaires", "Bureau exploitation"],
    exterior: ["Cour de manœuvre", "Accès poids lourds", "Stationnement"],
    technical: {
      plumbing: "Sanitaires et vestiaires groupés, alimentation et évacuation dimensionnées pour l'effectif.",
      electrical:
        "Tableau puissance, éclairage industriel, prises de manutention, protection contre les surtensions.",
      ventilation: "Renouvellement d'air et désenfumage adaptés au volume et aux marchandises stockées.",
    },
    regulation: [
      "Hauteur utile, trame structurelle et capacité de stockage à confirmer avec le programme logistique.",
      "Sécurité incendie : désenfumage, compartimentage et issues selon la nature des marchandises.",
      "Accès pompiers et aire de manœuvre à vérifier.",
    ],
    levels: { min: 1, max: 2, default: 1 },
    surface: { min: 80, max: 300, default: 250 },
    requiredKinds: ["stockage", "logistique", "bureau", "sanitaire"],
    signature: ["Hall de stockage principal", "Quai de chargement", "Bureau exploitation"],
    questions: [
      {
        id: "goods",
        label: "Type de marchandises",
        kind: "choice",
        options: ["Palettes / produits secs", "Produits frais", "Matériaux", "Marchandises mixtes"],
        defaultValue: "Palettes / produits secs",
        hint: "Détermine la ventilation, le compartimentage et les besoins en froid.",
      },
      {
        id: "clearHeight",
        label: "Hauteur utile",
        kind: "number",
        unit: "m",
        min: 4,
        max: 12,
        defaultValue: 7,
        hint: "La hauteur libre conditionne le nombre de niveaux de rack.",
      },
      {
        id: "docks",
        label: "Quais de chargement",
        kind: "number",
        min: 0,
        max: 6,
        defaultValue: 1,
        hint: "Un quai par flux de livraison / expédition simultané.",
      },
    ],
    assumptions: [
      "Stockage : environ 60 % de la surface utile, circulation engins comprise.",
      "Hauteur utile non dessinée en plan : elle est rappelée dans la fiche technique.",
    ],
    organization:
      "Le hall de stockage occupe le cœur du bâtiment, desservi directement par le quai de chargement et la zone logistique. Les bureaux d'exploitation, vestiaires et sanitaires sont regroupés à l'entrée du personnel, séparés des flux d'engins et accessibles sans traverser les rackings.",
    exteriorNeeds: { garden: false, terrace: false, pool: false, parking: true },
  },

  // ── 10. Résidence touristique ─────────────────────────────────────────────
  residence_touristique: {
    category: "residence_touristique",
    label: "Résidence touristique",
    family: "tourisme",
    spaces: [
      "Unités d'hébergement avec salle d'eau",
      "Accueil / réception",
      "Espaces communs et zone de détente",
      "Lingerie, stockage et maintenance",
    ],
    circulation:
      "Circulation des visiteurs distincte des flux du personnel ; accès aux unités depuis un palier ou une allée, lingerie proche des unités.",
    equipment: ["Lingerie / buanderie", "Local de maintenance", "Stockage du linge", "Sanitaires communs"],
    exterior: ["Terrasse", "Jardin", "Piscine", "Espaces de loisirs", "Stationnement visiteurs"],
    technical: {
      plumbing:
        "Une gaine par grappe d'unités, bouclage d'eau chaude, évacuations dimensionnées pour l'occupation saisonnière.",
      electrical:
        "Tableau par niveau, circuits chambres, éclairage extérieur et piscine, coupure par unité et sécurité.",
      ventilation: "Extraction des salles d'eau, ventilation naturelle des unités, désenfumage des communs.",
    },
    regulation: [
      "Classement touristique, capacité d'accueil et normes d'hygiène à vérifier selon la catégorie visée.",
      "Accessibilité PMR des communs et d'une partie des unités.",
      "Piscine et espaces de loisirs soumis aux règles de sécurité applicables.",
    ],
    levels: { min: 1, max: 3, default: 2 },
    surface: { min: 100, max: 300, default: 220 },
    requiredKinds: ["reception", "chambre", "sdb", "buanderie"],
    signature: ["Unité d'hébergement", "Accueil", "Espace détente", "Lingerie"],
    questions: [
      {
        id: "capacity",
        label: "Capacité d'accueil",
        kind: "number",
        unit: "lits",
        min: 2,
        max: 80,
        defaultValue: 20,
        hint: "Dimensionne le nombre d'unités et les communs.",
      },
      {
        id: "category",
        label: "Catégorie de service",
        kind: "choice",
        options: ["Économique", "Confort", "Haut de gamme"],
        defaultValue: "Confort",
        hint: "Adapte la taille des unités et l'importance des communs.",
      },
      Q.pool(true),
      Q.terrace(true),
    ],
    assumptions: [
      "Unités de 2 à 3 lits avec salle d'eau privative.",
      "Un espace détente couvert par niveau occupé, en plus des terrasses extérieures.",
    ],
    organization:
      "Les unités d'hébergement sont regroupées par grappes autour d'un palier ou d'une allée, chacune avec sa salle d'eau sur une gaine commune. L'accueil, l'espace détente, la lingerie et le local de maintenance occupent le rez-de-chaussée, avec des flux de personnel séparés des circulations des visiteurs.",
    exteriorNeeds: { garden: true, terrace: true, pool: true, parking: true },
  },

  // ── 11. Projet immobilier neuf ────────────────────────────────────────────
  projet_neuf: {
    category: "projet_neuf",
    label: "Projet immobilier neuf",
    family: "logement_collectif",
    spaces: [
      "Plan d'implantation des bâtiments sur le terrain",
      "Hall commun, escalier et ascenseur",
      "Logements répétés par bâtiment et par étage",
      "Espaces communs et locaux techniques",
    ],
    circulation:
      "Accès piétons et véhicules séparés, desserte de chaque bâtiment, paliers communs et stationnements en périphérie.",
    equipment: ["Local technique commun", "Local vélos / poussettes", "Gaine technique verticale"],
    exterior: ["Voirie et accès", "Stationnement", "Espaces verts", "Aires de jeux si prévues"],
    technical: {
      plumbing: "Colonnes EU/EV alignées par bâtiment, comptage individuel, bouclage si nécessaire.",
      electrical: "Colonne montante par bâtiment, éclairage extérieur, terre et protection des communs.",
      ventilation: "Ventilation des logements et désenfumage des circulations communes.",
    },
    regulation: [
      "Plan d'implantation, coefficient d'occupation des sols et reculs à vérifier auprès du service d'urbanisme.",
      "Surfaces vendables, communes et extérieures à répartir sans double comptage.",
      "Voirie, assainissement et raccordements à valider avec les concessionnaires.",
    ],
    levels: { min: 2, max: 5, default: 3 },
    surface: { min: 150, max: 300, default: 280 },
    requiredKinds: ["hall", "sejour", "chambre", "sdb", "cuisine"],
    signature: ["Bâtiment type", "Logement 1", "Gaine technique"],
    questions: [
      {
        id: "buildings",
        label: "Nombre de bâtiments",
        kind: "number",
        min: 1,
        max: 8,
        defaultValue: 2,
        hint: "Le plan d'implantation répartit les bâtiments sur le terrain.",
      },
      {
        id: "unitsPerBuilding",
        label: "Logements par bâtiment",
        kind: "number",
        min: 2,
        max: 60,
        defaultValue: 8,
        hint: "Dimensionne les communs et le stationnement.",
      },
      {
        id: "parking",
        label: "Places de stationnement",
        kind: "number",
        min: 0,
        max: 120,
        defaultValue: 12,
        hint: "À répartir en surface ou en sous-sol selon le terrain.",
      },
    ],
    assumptions: [
      "Le plan généré décrit le bâtiment type ; les autres bâtiments sont identiques et répétés sur le terrain.",
      "Espaces verts et stationnement indiqués dans le plan de masse, non comptés dans la surface bâtie.",
    ],
    organization:
      "Le projet est organisé en bâtiments identiques répartis sur le terrain : chaque bâtiment dispose de son hall commun, de son escalier et de ses gaines, et répète les mêmes logements à chaque étage. Les accès piétons, la voirie, le stationnement et les espaces verts structurent le plan d'implantation, sans double comptage des surfaces.",
    exteriorNeeds: { garden: true, terrace: false, pool: false, parking: true },
  },

  // ── 12. Restaurant ────────────────────────────────────────────────────────
  restaurant: {
    category: "restaurant",
    label: "Restaurant",
    family: "restauration",
    spaces: [
      "Salle de restauration et circulation des clients",
      "Bar / comptoir",
      "Cuisine professionnelle (préparation, cuisson, dressage)",
      "Plonge et zone déchets",
      "Réserves sèches et stockage réfrigéré",
    ],
    circulation:
      "Marche en avant : livraison → réserve → cuisine → dressage → salle, sans croisement avec les déchets ; sanitaires clients accessibles depuis la salle.",
    equipment: ["Chambre froide", "Plonge", "Vestiaires du personnel", "Local technique", "Extraction des fumées"],
    exterior: ["Terrasse si autorisée", "Accès livraison", "Stationnement"],
    technical: {
      plumbing:
        "Alimentation cuisine professionnelle, plonge et sanitaires ; évacuations graisseuses et siphon de sol, eau chaude en abondance.",
      electrical:
        "Tableau puissance pour cuisson, froid, extraction et lave-vaisselle ; circuits de sécurité et éclairage de salle.",
      ventilation:
        "Extraction de la hotte de cuisson, compensation d'air neuf, désenfumage de la salle et évacuation des odeurs.",
    },
    regulation: [
      "Hygiène alimentaire (marche en avant, matériaux lavables) à valider avec les services sanitaires.",
      "Sécurité incendie, dégagements, capacité d'accueil et désenfumage selon l'effectif.",
      "Accessibilité PMR de la salle et des sanitaires clients.",
    ],
    levels: { min: 1, max: 1, default: 1 },
    surface: { min: 60, max: 300, default: 150 },
    requiredKinds: ["salle_client", "cuisine_pro", "plonge", "sanitaire"],
    signature: ["Salle de restauration", "Cuisine professionnelle", "Plonge", "Chambre froide"],
    questions: [
      {
        id: "covers",
        label: "Nombre de couverts",
        kind: "number",
        min: 10,
        max: 250,
        defaultValue: 60,
        hint: "Dimensionne la salle (1,2 à 1,5 m² par couvert) et la cuisine.",
      },
      {
        id: "cuisineType",
        label: "Type de cuisine",
        kind: "choice",
        options: ["Tunisienne", "Méditerranéenne", "Grillades", "Internationale"],
        defaultValue: "Tunisienne",
        hint: "Adapte les zones de production et l'extraction.",
      },
      Q.terrace(false),
    ],
    assumptions: [
      "Salle : environ 35 % de la surface, production et réserves : 42 %, sanitaires et circulations : 20 %.",
      "Cuisine dimensionnée pour le service en salle et une extraction en façade ou en toiture.",
    ],
    organization:
      "La salle de restauration et le bar occupent la façade principale, séparés de la cuisine professionnelle par un couloir de service respectant la marche en avant. Les réserves et le froid s'ouvrent directement sur la cuisine, la plonge et les déchets restent dans la zone de production, et les sanitaires clients sont accessibles sans traverser la cuisine.",
    exteriorNeeds: { garden: false, terrace: true, pool: false, parking: true },
  },

  // ── 13. Café ──────────────────────────────────────────────────────────────
  cafe: {
    category: "cafe",
    label: "Café",
    family: "restauration",
    spaces: [
      "Salle clientèle et circulation entre les tables",
      "Comptoir et zone de préparation des boissons",
      "Plonge et zone de lavage",
      "Réserve et rangement",
      "Sanitaires clients",
    ],
    circulation:
      "Comptoir en tête de salle, circulation client continue, service depuis l'arrière du comptoir sans traverser la salle ; livraison par accès de service.",
    equipment: ["Machine à café et vitrine", "Plonge", "Réserve sèche", "Sanitaire", "Terrasse si autorisée"],
    exterior: ["Terrasse", "Enseigne", "Accès livraison"],
    technical: {
      plumbing:
        "Alimentation du comptoir (machine, fontaine), plonge et sanitaires ; évacuation et eau chaude dimensionnées.",
      electrical:
        "Circuits dédiés machine à café, froid, vitrine et lave-vaisselle ; éclairage de salle et de terrasse.",
      ventilation: "Extraction de la zone de préparation, renouvellement d'air de la salle, désenfumage.",
    },
    regulation: [
      "Hygiène des denrées et des surfaces à valider avec les services sanitaires.",
      "Terrasse : autorisation d'occupation du domaine public à vérifier.",
      "Accessibilité PMR et sécurité incendie selon la capacité d'accueil.",
    ],
    levels: { min: 1, max: 1, default: 1 },
    surface: { min: 30, max: 200, default: 70 },
    requiredKinds: ["salle_client", "comptoir", "plonge", "sanitaire"],
    signature: ["Salle café", "Comptoir café", "Préparation boissons", "Réserve"],
    questions: [
      {
        id: "capacity",
        label: "Capacité d'accueil",
        kind: "number",
        unit: "places",
        min: 8,
        max: 120,
        defaultValue: 30,
        hint: "Dimensionne la salle et le nombre de tables.",
      },
      {
        id: "counterLength",
        label: "Longueur de comptoir",
        kind: "number",
        unit: "m",
        min: 2,
        max: 10,
        defaultValue: 4,
        hint: "Comptoir + préparation boissons + caisse.",
      },
      Q.terrace(true),
    ],
    assumptions: [
      "Salle : environ 45 % de la surface, comptoir et préparation : 20 %, réserve et service : 20 %, sanitaires et circulations : 15 %.",
      "Terrasse extérieure non comptée dans la surface bâtie.",
    ],
    organization:
      "Le comptoir occupe la tête de salle et commande la circulation clientèle ; la préparation des boissons, la plonge et la réserve s'organisent en arrière-comptoir, desservies par un accès de service. Les sanitaires restent accessibles sans traverser la zone de préparation et la terrasse prolonge la salle sur la façade principale.",
    exteriorNeeds: { garden: false, terrace: true, pool: false, parking: true },
  },

  // ── 14. Rénovation complète ───────────────────────────────────────────────
  renovation_complete: {
    category: "renovation_complete",
    label: "Rénovation complète",
    family: "renovation",
    spaces: [
      "Plan de l'état existant relevé",
      "Plan projeté après rénovation",
      "Cloisons conservées, supprimées et créées",
      "Cuisine, salles de bains et pièces de vie modernisées",
    ],
    circulation:
      "Circulations existantes conservées lorsqu'elles sont fonctionnelles, redistribuées pour supprimer les couloirs inutiles et ouvrir la cuisine sur le séjour.",
    equipment: ["Réseaux électriques et plomberie repris", "Menuiseries et sols rénovés", "Ventilation mise à niveau"],
    exterior: [
      "Emprise existante, à relever sur site",
      "Accès et cour existants conservés",
    ],
    technical: {
      plumbing:
        "Reprise des alimentations et évacuations depuis les gaines existantes, remplacement des appareils sanitaires.",
      electrical:
        "Mise en sécurité du tableau, remplacement des circuits vétustes, ajout de prises et de protections différentielles.",
      ventilation: "Ventilation des pièces humides remise aux normes, sans modification structurelle non autorisée.",
    },
    regulation: [
      "Éléments structurels à préserver : validation par l'ingénieur structure avant dépose d'une cloison porteuse.",
      "Amiante / plomb à rechercher dans les bâtiments anciens avant travaux.",
      "Autorisation d'urbanisme si la façade ou la surface change.",
    ],
    levels: { min: 1, max: 1, default: 1 },
    surface: { min: 40, max: 300, default: 110 },
    requiredKinds: ["sejour", "cuisine", "chambre", "sdb"],
    signature: ["Cuisine ouverte", "Suite parentale"],
    questions: [
      {
        id: "existingState",
        label: "État du bâtiment",
        kind: "choice",
        options: ["Bon état général", "À moderniser", "Dégradé / à remettre en état"],
        defaultValue: "À moderniser",
        hint: "Pilote l'ampleur des reprises techniques et des finitions.",
      },
      {
        id: "structural",
        label: "Modification structurelle",
        kind: "boolean",
        defaultValue: false,
        hint: "Une ouverture dans un mur porteur exige une validation structurelle.",
      },
      {
        id: "worksScope",
        label: "Travaux souhaités",
        kind: "choice",
        options: ["Cuisine et salles de bains", "Toutes les pièces", "Réseaux et finitions"],
        defaultValue: "Toutes les pièces",
        hint: "Les quantités ne portent que sur les travaux réellement retenus.",
      },
    ],
    assumptions: [
      "Les plans existants sont reconstitués à partir de la surface et du programme déclarés : un relevé sur site reste nécessaire.",
      "Les quantités du DQE portent uniquement sur les travaux de rénovation, jamais sur une construction neuve.",
    ],
    organization:
      "La rénovation est conduite en deux temps : le plan de l'existant est reconstitué (cuisine fermée, chambres, salle de bains, couloirs), puis le plan projeté redistribue les espaces en ouvrant la cuisine sur le séjour, en créant une suite parentale et en supprimant les couloirs inutiles. Les murs porteurs et les planchers restent en place ; seules les cloisons non porteuses sont modifiées.",
    exteriorNeeds: { garden: false, terrace: false, pool: false, parking: false },
  },
};

/**
 * Spécification applicable à un type de projet enregistré.
 * Les slugs legacy sont résolus vers leur type officiel ; un type hors des
 * 14 projets du parcours complet renvoie `null` (aucune spécification
 * résidentielle générique n'est inventée).
 */
export function architecturalSpecFor(
  category: string | null | undefined,
): ArchitecturalSpec | null {
  const resolved = resolveProjectType((category ?? "").trim());
  if (!resolved) return null;
  return ARCHITECTURAL_SPECS[resolved as ArchitecturalPlanType] ?? null;
}

/** Les 14 spécifications, dans l'ordre officiel du module. */
export function allArchitecturalSpecs(): ArchitecturalSpec[] {
  return ARCHITECTURAL_PLAN_TYPES.map((category) => ARCHITECTURAL_SPECS[category]);
}

/**
 * Signature textuelle stable d'un programme : deux types de projet ne doivent
 * jamais produire la même signature (test de non-généricité).
 */
export function specSignature(spec: ArchitecturalSpec): string {
  return [
    spec.family,
    spec.spaces.length,
    spec.requiredKinds.join(","),
    spec.signature.join(","),
    spec.exteriorNeeds.garden ? "jardin" : "",
    spec.exteriorNeeds.pool ? "piscine" : "",
  ]
    .filter(Boolean)
    .join("|");
}

/** Question spécifique par identifiant (hypothèse par défaut incluse). */
export function specQuestion(
  spec: ArchitecturalSpec,
  id: string,
): PlanQuestion | undefined {
  return spec.questions.find((q) => q.id === id);
}

/** Valeur de l'hypothèse par défaut d'une question. */
export function specDefault(
  spec: ArchitecturalSpec,
  id: string,
): number | string | boolean | undefined {
  return specQuestion(spec, id)?.defaultValue;
}

/** Type de projet officiel associé (utile aux écrans et aux tests). */
export function isArchitecturalPlanType(
  category: string | null | undefined,
): category is ArchitecturalPlanType {
  const resolved = resolveProjectType((category ?? "").trim());
  return !!resolved && (ARCHITECTURAL_PLAN_TYPES as readonly string[]).includes(resolved);
}
