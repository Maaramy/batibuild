// ============================================================================
// QUANTITATIF DÉTAILLÉ — MODÈLES PAR TYPE DE PROJET (feuille « projecttype »)
// Source : « projecttype.xlsx » (25 feuilles : maison, villa, maison R+1, …).
// Chaque modèle décrit, pour une surface de référence, les sections de travaux
// avec leur budget et leurs postes (Désignation / Quantité / Unité). Le
// générateur du « Quantitatif détaillé » échelle les quantités à la surface du
// projet, tarife chaque poste via le catalogue officiel 2026 (prix en direct
// de la base materialPrices lorsqu'elle est fournie) et répartit le solde de
// chaque section sur les postes sans équivalent catalogue. Les totaux par
// macro-catégorie (Gros œuvre, Second œuvre, …) restent ceux du moteur BIM
// afin de ne pas changer le montant global de l'estimation.
// ============================================================================

import { TUNISIA_2026_CATALOG } from "./materialCatalog2026";
import type { LivePriceMap } from "./bimEngine";

export interface ModelItem {
  name: string;
  qty: number;
  unit: string;
}

export interface ModelSection {
  name: string;
  /** Budget de la section pour la surface de référence (TND). */
  budget: number;
  items: ModelItem[];
}

export interface QuantitatifModel {
  /** Surface de référence (m²) à laquelle les quantités du modèle correspondent. */
  refSurface: number;
  sections: ModelSection[];
}

// Normalisation identique au moteur BIM (minuscules, sans accents, sans
// ponctuation). La ligature œ est unifiée en « oe » pour que « Gros œuvre »
// et « Second œuvre » correspondent aux libellés des sections du classeur.
const normKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// ============================================================================
// LES 25 MODÈLES (feuilles du classeur « projecttype.xlsx »)
// ============================================================================

const m = (
  refSurface: number,
  sections: ModelSection[],
): QuantitatifModel => ({ refSurface, sections });

const maisonSections: ModelSection[] = [
  {
    name: "Frais Préliminaires et Études",
    budget: 14000,
    items: [
      { name: "Étude architecturale et permis de construire", qty: 1, unit: "lot" },
      { name: "Étude structurelle (béton armé)", qty: 1, unit: "lot" },
      { name: "Étude des sols (géotechnique)", qty: 1, unit: "lot" },
      { name: "Honoraires OPC/Suivi de chantier", qty: 1, unit: "lot" },
    ],
  },
  {
    name: "Gros œuvre",
    budget: 119400,
    items: [
      { name: "Terrassement et fondations (y compris fouilles, remblais, radier/semelles filantes)", qty: 120, unit: "m²" },
      { name: "Soubassement et dallage (hérisson, film polyane, isolant, dalle béton)", qty: 120, unit: "m²" },
      { name: "Murs porteurs et refends (briques 12T/8T, parpaings)", qty: 120, unit: "m²" },
      { name: "Poteaux, poutres et chaînages (béton armé)", qty: 120, unit: "m²" },
      { name: "Planchers (dalle pleine/corps creux)", qty: 120, unit: "m²" },
      { name: "Escalier (béton armé, 1 volée)", qty: 1, unit: "unité" },
      { name: "Toiture (dalle inaccessible, étanchéité multicouche, protection lourde)", qty: 120, unit: "m²" },
    ],
  },
  {
    name: "Second œuvre et Finitions",
    budget: 98000,
    items: [
      { name: "Enduits intérieurs (ciment, plâtre)", qty: 300, unit: "m²" },
      { name: "Revêtements de sol (carrelage grès cérame premier choix)", qty: 120, unit: "m²" },
      { name: "Revêtements muraux SDB/Cuisine (faïence)", qty: 40, unit: "m²" },
      { name: "Menuiserie extérieure (Fenêtres et portes-fenêtres PVC double vitrage)", qty: 15, unit: "m²" },
      { name: "Menuiserie extérieure (Porte d'entrée en bois massif)", qty: 1, unit: "unité" },
      { name: "Menuiserie intérieure (Portes en bois semi-massif/stratifié)", qty: 6, unit: "unités" },
      { name: "Peinture intérieure (3 couches, finition standard)", qty: 300, unit: "m²" },
      { name: "Peinture extérieure (façade, monocouche acrylique)", qty: 80, unit: "m²" },
      { name: "Plomberie sanitaire (alimentation, évacuation, chauffe-eau, appareils inclus)", qty: 1, unit: "lot" },
      { name: "Électricité (installation complète, tableaux, prises, interrupteurs, luminaires basiques)", qty: 1, unit: "lot" },
      { name: "Climatisation (pré-installation)", qty: 1, unit: "lot" },
      { name: "Cuisine équipée (meubles hauts et bas, plan de travail, évier)", qty: 1, unit: "lot" },
      { name: "Garde-corps (balcons/escalier, fer forgé/inox)", qty: 10, unit: "ml" },
      { name: "Faux plafonds (plaque de plâtre)", qty: 50, unit: "m²" },
    ],
  },
  {
    name: "Aménagements extérieurs",
    budget: 13300,
    items: [
      { name: "Clôture (muret bas + grillage rigide)", qty: 50, unit: "ml" },
      { name: "Portail d'accès (métallique, coulissant/battant manuel)", qty: 1, unit: "unité" },
      { name: "Portillon piéton (métallique)", qty: 1, unit: "unité" },
      { name: "Allées et terrasses (dalles/pavés extérieurs)", qty: 30, unit: "m²" },
    ],
  },
  {
    name: "VRD (Voirie et Réseaux Divers) et Raccordements",
    budget: 5800,
    items: [
      { name: "Raccordement Eau Potable (STEG)", qty: 1, unit: "lot" },
      { name: "Raccordement Électricité (STEG)", qty: 1, unit: "lot" },
      { name: "Raccordement Assainissement (ONAS)", qty: 1, unit: "lot" },
      { name: "Fosse septique et épandage (si non raccordé ONAS)", qty: 1, unit: "lot" },
      { name: "Téléphone/Internet (TT)", qty: 1, unit: "lot" },
    ],
  },
];

/** Modèles officiels — slugs du catalogue BIM → modèle de la feuille. */
export const PROJECT_TYPE_MODELS: Record<string, QuantitatifModel> = {
  maison: m(120, maisonSections),

  villa: m(120, [
    {
      name: "Frais Préliminaires et Études",
      budget: 28500,
      items: [
        { name: "Étude de sol (géotechnique)", qty: 1, unit: "forfait" },
        { name: "Honoraires Architecte (conception + suivi, 5% du coût total construction)", qty: 1, unit: "forfait" },
        { name: "Permis de construire et taxes diverses (municipalité, raccordements)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Gros œuvre (fondations, structure, maçonnerie)",
      budget: 103900,
      items: [
        { name: "Terrassement et nivellement (déblais/remblais, évacuation)", qty: 120, unit: "m²" },
        { name: "Fondations (semelles filantes, puits, longrines, radier partiel)", qty: 120, unit: "m²" },
        { name: "Maçonnerie élévation (briques creuses 8T, 12T)", qty: 120, unit: "m²" },
        { name: "Dalle pleine / Plancher (hourdis, poutrelles, dalle de compression)", qty: 120, unit: "m²" },
        { name: "Poteaux et poutres (béton armé)", qty: 120, unit: "m²" },
        { name: "Assainissement (fosse septique ou raccordement ONAS, regards)", qty: 1, unit: "forfait" },
        { name: "Étanchéité des fondations et murs enterrés", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Second œuvre et Finitions intérieures",
      budget: 102900,
      items: [
        { name: "Enduits intérieurs (ciment, plâtre)", qty: 350, unit: "m²" },
        { name: "Revêtements sols (grès céramique, marbre compact, selon choix)", qty: 120, unit: "m²" },
        { name: "Revêtements murs salles d'eau et cuisine (faïence)", qty: 60, unit: "m²" },
        { name: "Peinture intérieure (3 couches, bonne qualité)", qty: 350, unit: "m²" },
        { name: "Menuiserie bois intérieure (portes isoplanes/semi-massives)", qty: 8, unit: "unités" },
        { name: "Menuiserie aluminium extérieure (fenêtres, portes-fenêtres double vitrage)", qty: 15, unit: "m²" },
        { name: "Plomberie sanitaire (cuisine, 2 SDB, 1 WC invités)", qty: 1, unit: "forfait" },
        { name: "Électricité (points lumineux, prises, tableau, câblage, interrupteurs)", qty: 1, unit: "forfait" },
        { name: "Appareils sanitaires (WC, lavabos, douches, robinetterie)", qty: 1, unit: "forfait" },
        { name: "Cuisine équipée (meubles hauts et bas, plan de travail)", qty: 1, unit: "forfait" },
        { name: "Chauffe-eau solaire (200L)", qty: 1, unit: "forfait" },
        { name: "Isolation thermique toiture/terrasse", qty: 120, unit: "m²" },
      ],
    },
    {
      name: "Aménagements extérieurs et Jardin",
      budget: 22500,
      items: [
        { name: "Clôture (mur de 2m de hauteur avec enduit et peinture)", qty: 50, unit: "ml" },
        { name: "Portail d'entrée (métallique, motorisé)", qty: 1, unit: "forfait" },
        { name: "Portillon piéton", qty: 1, unit: "forfait" },
        { name: "Allées et terrasses extérieures (carrelage ou pavé)", qty: 30, unit: "m²" },
        { name: "Aménagement paysager simple (engazonnement, quelques arbres/arbustes)", qty: 1, unit: "forfait" },
        { name: "Arrosage manuel (points d'eau extérieurs)", qty: 1, unit: "forfait" },
        { name: "Éclairage extérieur (spots, appliques)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "VRD (Voirie et Réseaux Divers) et Raccordements",
      budget: 5800,
      items: [
        { name: "Raccordement Eau Potable (STEG)", qty: 1, unit: "lot" },
        { name: "Raccordement Électricité (STEG)", qty: 1, unit: "lot" },
        { name: "Raccordement Assainissement (ONAS)", qty: 1, unit: "lot" },
        { name: "Fosse septique et épandage (si non raccordé ONAS)", qty: 1, unit: "lot" },
        { name: "Téléphone/Internet (TT)", qty: 1, unit: "lot" },
      ],
    },
  ]),

  maison_r_plus_1: m(120, [
    {
      name: "Frais Préparatoires et Permis",
      budget: 37850,
      items: [
        { name: "Étude topographique", qty: 1, unit: "forfait" },
        { name: "Étude de sol (géotechnique)", qty: 1, unit: "forfait" },
        { name: "Honoraires architecte (conception et suivi)", qty: 120, unit: "m²" },
        { name: "Honoraires ingénieur structure", qty: 120, unit: "m²" },
        { name: "Honoraires ingénieur fluides (plomberie, électricité)", qty: 120, unit: "m²" },
        { name: "Permis de construire et taxes diverses", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Gros œuvre",
      budget: 113800,
      items: [
        { name: "Terrassement et fondations", qty: 120, unit: "m²" },
        { name: "Assainissement (fosse septique/raccordement réseau)", qty: 1, unit: "forfait" },
        { name: "Maçonnerie murs porteurs et cloisons (parpaings/briques)", qty: 120, unit: "m²" },
        { name: "Dalle béton armé RDC", qty: 60, unit: "m²" },
        { name: "Dalle béton armé étage (y compris escalier)", qty: 60, unit: "m²" },
        { name: "Poteaux, poutres, chaînages (béton armé)", qty: 120, unit: "m²" },
        { name: "Toiture terrasse accessible (étanchéité, isolation, dalle de protection)", qty: 60, unit: "m²" },
      ],
    },
    {
      name: "Second œuvre et Finitions intérieures",
      budget: 98400,
      items: [
        { name: "Revêtements de sol (carrelage/grès) et plinthes", qty: 120, unit: "m²" },
        { name: "Revêtements murs salles de bain/cuisine (faïence)", qty: 40, unit: "m²" },
        { name: "Enduits intérieurs (ciment et plâtre)", qty: 300, unit: "m²" },
        { name: "Menuiseries extérieures (aluminium simple vitrage)", qty: 20, unit: "m²" },
        { name: "Menuiseries intérieures (portes en bois)", qty: 8, unit: "unités" },
        { name: "Peinture intérieure (impression + 2 couches)", qty: 300, unit: "m²" },
        { name: "Peinture extérieure (façade)", qty: 100, unit: "m²" },
        { name: "Plomberie (installations sanitaires, chauffe-eau)", qty: 1, unit: "forfait" },
        { name: "Électricité (points lumineux, prises, tableau)", qty: 1, unit: "forfait" },
        { name: "Appareils sanitaires (WC, lavabos, douche)", qty: 2, unit: "unités" },
        { name: "Cuisine équipée (meubles bas/hauts, évier)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Aménagements Extérieurs et Divers",
      budget: 37900,
      items: [
        { name: "Clôture et portail (standard)", qty: 1, unit: "forfait" },
        { name: "Accès véhicules et piétons (pavés/dalle)", qty: 30, unit: "m²" },
        { name: "Raccordement VRD (eau, électricité, assainissement)", qty: 1, unit: "forfait" },
        { name: "Nettoyage fin de chantier", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  maison_r_plus_2: m(120, [
    {
      name: "Frais Préliminaires & Administratifs",
      budget: 15800,
      items: [
        { name: "Honoraires Architecte (Conception, permis)", qty: 1, unit: "forfait" },
        { name: "Frais dossier permis de construire", qty: 1, unit: "forfait" },
        { name: "Étude géotechnique", qty: 1, unit: "forfait" },
        { name: "Honoraires Ingénieur Structure", qty: 1, unit: "forfait" },
        { name: "Raccordement VRD (Eau, Électricité, Assainissement)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Terrassement & Fondations",
      budget: 30900,
      items: [
        { name: "Décapage et terrassement en pleine masse", qty: 150, unit: "m³" },
        { name: "Fouilles en rigoles et en puits", qty: 80, unit: "m³" },
        { name: "Béton de propreté", qty: 15, unit: "m³" },
        { name: "Fondations en gros béton cyclopéen ou semelles filantes", qty: 40, unit: "m³" },
        { name: "Remblai technique et compactage", qty: 100, unit: "m³" },
      ],
    },
    {
      name: "Gros œuvre (Murs, Dalles, Escalier)",
      budget: 132000,
      items: [
        { name: "Maçonnerie murs extérieurs (double cloison avec vide d'air)", qty: 450, unit: "m²" },
        { name: "Maçonnerie murs intérieurs (simple cloison)", qty: 250, unit: "m²" },
        { name: "Dalles pleine sur 3 niveaux (RDC, R+1, R+2)", qty: 360, unit: "m²" },
        { name: "Poteaux et poutres en béton armé", qty: 1, unit: "forfait" },
        { name: "Escalier intérieur (2 volées par niveau)", qty: 2, unit: "unités" },
      ],
    },
    {
      name: "Couverture / Étanchéité",
      budget: 17400,
      items: [
        { name: "Étanchéité toiture terrasse (bicouche bitumineuse)", qty: 120, unit: "m²" },
        { name: "Isolation thermique (polystyrène extrudé)", qty: 120, unit: "m²" },
        { name: "Forme de pente et protection lourde", qty: 120, unit: "m²" },
      ],
    },
    {
      name: "Menuiseries Extérieures",
      budget: 28500,
      items: [
        { name: "Fenêtres et portes-fenêtres en Aluminium (double vitrage)", qty: 30, unit: "m²" },
        { name: "Volets roulants électriques en Aluminium", qty: 30, unit: "m²" },
        { name: "Porte d'entrée principale (bois massif ou blindée)", qty: 1, unit: "unité" },
        { name: "Porte de garage sectionnelle", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Plomberie & Sanitaires",
      budget: 31400,
      items: [
        { name: "Installation plomberie complète (tube PPR, évacuations PVC)", qty: 120, unit: "m²" },
        { name: "Chauffe-eau solaire (200L)", qty: 1, unit: "unité" },
        { name: "Appareils sanitaires (WC, lavabos, douches, baignoire)", qty: 3, unit: "unités" },
        { name: "Robinetterie (mélangeurs, mitigeurs)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Électricité & Éclairage",
      budget: 29000,
      items: [
        { name: "Installation électrique complète (normes tunisiennes)", qty: 120, unit: "m²" },
        { name: "Tableau électrique principal et divisionnaires", qty: 1, unit: "forfait" },
        { name: "Interrupteurs et prises (gamme moyenne)", qty: 1, unit: "forfait" },
        { name: "Points lumineux (sans luminaires)", qty: 1, unit: "forfait" },
        { name: "Câblage TV/Téléphone/Internet", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Revêtements de sols & Murs",
      budget: 17750,
      items: [
        { name: "Carrelage sols intérieurs (grès cérame 60x60 cm)", qty: 120, unit: "m²" },
        { name: "Faience salles de bain et cuisine (murs)", qty: 70, unit: "m²" },
        { name: "Revêtement sols terrasses / balcons", qty: 30, unit: "m²" },
        { name: "Plinthes assorties", qty: 100, unit: "ml" },
      ],
    },
    {
      name: "Peinture & Finitions Intérieures",
      budget: 27000,
      items: [
        { name: "Enduit et deux couches de peinture acrylique", qty: 450, unit: "m²" },
        { name: "Faux plafonds en plâtre (simples)", qty: 100, unit: "m²" },
        { name: "Staff décoratif (corniches simples, rosaces)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Menuiseries Intérieures",
      budget: 10900,
      items: [
        { name: "Portes intérieures (bois semi-massif ou MDF stratifié)", qty: 8, unit: "unités" },
        { name: "Placards intégrés (portes et aménagement simple)", qty: 3, unit: "unités" },
      ],
    },
    {
      name: "Cuisine",
      budget: 12000,
      items: [
        { name: "Meubles de cuisine (hauts et bas, MDF stratifié)", qty: 1, unit: "forfait" },
        { name: "Plan de travail (granit ou marbre tunisien)", qty: 1, unit: "forfait" },
        { name: "Évier et robinetterie cuisine", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Divers & Aménagements Extérieurs (minimum)",
      budget: 24500,
      items: [
        { name: "Barrières escalier et balcons (fer forgé simple)", qty: 30, unit: "ml" },
        { name: "Crédit extérieur (façade en enduit ciment)", qty: 250, unit: "m²" },
        { name: "Clôture (muret bas + grillage)", qty: 30, unit: "ml" },
        { name: "Portail extérieur (fer simple)", qty: 1, unit: "unité" },
        { name: "Aménagements extérieurs (allées, raccordement)", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  immeuble_residentiel: m(120, [
    {
      name: "Frais Préparatoires & Études",
      budget: 27000,
      items: [
        { name: "Étude de sol", qty: 1, unit: "forfait" },
        { name: "Honoraires Architecte (conception + suivi)", qty: 1, unit: "forfait" },
        { name: "Honoraires Ingénieur Structure", qty: 1, unit: "forfait" },
        { name: "Honoraires Ingénieur Fluides (Plomberie, Élec.)", qty: 1, unit: "forfait" },
        { name: "Permis de construire et taxes diverses", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Gros œuvre (fondations, structure, maçonnerie)",
      budget: 101200,
      items: [
        { name: "Terrassement et VRD (raccordements)", qty: 120, unit: "m²" },
        { name: "Fondations (semelles, longrines, dallage)", qty: 120, unit: "m²" },
        { name: "Maçonnerie murs extérieurs (double paroi)", qty: 120, unit: "m²" },
        { name: "Maçonnerie cloisons intérieures", qty: 120, unit: "m²" },
        { name: "Poteaux, poutres, dalles en béton armé", qty: 120, unit: "m²" },
        { name: "Escalier (béton)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Second œuvre et Finitions",
      budget: 97000,
      items: [
        { name: "Étanchéité toiture/terrasse", qty: 120, unit: "m²" },
        { name: "Menuiserie Aluminium (fenêtres, portes-fenêtres)", qty: 15, unit: "m²" },
        { name: "Menuiserie Bois (portes intérieures)", qty: 6, unit: "unités" },
        { name: "Porte d'entrée blindée", qty: 1, unit: "unité" },
        { name: "Revêtements sols (carrelage/grès de qualité moyenne)", qty: 120, unit: "m²" },
        { name: "Revêtements murs salles d'eau/cuisine", qty: 35, unit: "m²" },
        { name: "Peinture intérieure (3 couches, préparation)", qty: 360, unit: "m²" },
        { name: "Peinture façade extérieure", qty: 80, unit: "m²" },
        { name: "Faux plafonds (plâtre/staff)", qty: 100, unit: "m²" },
        { name: "Sanitaires (WC, lavabos, douche/baignoire, robinetterie)", qty: 2, unit: "unités" },
        { name: "Électricité (points lumineux, prises, tableau)", qty: 120, unit: "m²" },
        { name: "Plomberie (alimentation, évacuation)", qty: 120, unit: "m²" },
        { name: "Climatisation (pré-installation)", qty: 3, unit: "unités" },
        { name: "Cuisine équipée (meubles hauts/bas, plan de travail)", qty: 1, unit: "forfait" },
        { name: "Gardes corps / Balcons", qty: 15, unit: "ml" },
      ],
    },
    {
      name: "Divers et Imprévus",
      budget: 18500,
      items: [
        { name: "Nettoyage de chantier", qty: 1, unit: "forfait" },
        { name: "Contrôle qualité (optionnel)", qty: 1, unit: "forfait" },
        { name: "Assurances chantier (DO, TRC)", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  appartement: m(120, [
    {
      name: "Frais Préliminaires et Études",
      budget: 14000,
      items: [
        { name: "Étude architecturale et permis de construire", qty: 1, unit: "lot" },
        { name: "Étude structurelle (béton armé)", qty: 1, unit: "lot" },
        { name: "Étude des sols (géotechnique)", qty: 1, unit: "lot" },
        { name: "Honoraires OPC/Suivi de chantier", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Gros œuvre",
      budget: 119400,
      items: [
        { name: "Terrassement et fondations (y compris fouilles, remblais, radier/semelles filantes)", qty: 120, unit: "m²" },
        { name: "Soubassement et dallage (hérisson, film polyane, isolant, dalle béton)", qty: 120, unit: "m²" },
        { name: "Murs porteurs et refends (briques 12T/8T, parpaings)", qty: 120, unit: "m²" },
        { name: "Poteaux, poutres et chaînages (béton armé)", qty: 120, unit: "m²" },
        { name: "Planchers (dalle pleine/corps creux)", qty: 120, unit: "m²" },
        { name: "Escalier (béton armé, 1 volée)", qty: 1, unit: "unité" },
        { name: "Toiture (dalle inaccessible, étanchéité multicouche, protection lourde)", qty: 120, unit: "m²" },
      ],
    },
    {
      name: "Second œuvre et Finitions",
      budget: 98000,
      items: [
        { name: "Enduits intérieurs (ciment, plâtre)", qty: 300, unit: "m²" },
        { name: "Revêtements de sol (carrelage grès cérame premier choix)", qty: 120, unit: "m²" },
        { name: "Revêtements muraux SDB/Cuisine (faïence)", qty: 40, unit: "m²" },
        { name: "Menuiserie extérieure (Fenêtres et portes-fenêtres PVC double vitrage)", qty: 15, unit: "m²" },
        { name: "Menuiserie extérieure (Porte d'entrée en bois massif)", qty: 1, unit: "unité" },
        { name: "Menuiserie intérieure (Portes en bois semi-massif/stratifié)", qty: 6, unit: "unités" },
        { name: "Peinture intérieure (3 couches, finition standard)", qty: 300, unit: "m²" },
        { name: "Peinture extérieure (façade, monocouche acrylique)", qty: 80, unit: "m²" },
        { name: "Plomberie sanitaire (alimentation, évacuation, chauffe-eau, appareils inclus)", qty: 1, unit: "lot" },
        { name: "Électricité (installation complète, tableaux, prises, interrupteurs, luminaires basiques)", qty: 1, unit: "lot" },
        { name: "Climatisation (pré-installation)", qty: 1, unit: "lot" },
        { name: "Cuisine équipée (meubles hauts et bas, plan de travail, évier)", qty: 1, unit: "lot" },
        { name: "Garde-corps (balcons/escalier, fer forgé/inox)", qty: 10, unit: "ml" },
        { name: "Faux plafonds (plaque de plâtre)", qty: 50, unit: "m²" },
      ],
    },
    {
      name: "Aménagements extérieurs",
      budget: 13300,
      items: [
        { name: "Clôture (muret bas + grillage rigide)", qty: 50, unit: "ml" },
        { name: "Portail d'accès (métallique, coulissant/battant manuel)", qty: 1, unit: "unité" },
        { name: "Portillon piéton (métallique)", qty: 1, unit: "unité" },
        { name: "Allées et terrasses (dalles/pavés extérieurs)", qty: 30, unit: "m²" },
      ],
    },
    {
      name: "VRD (Voirie et Réseaux Divers) et Raccordements",
      budget: 5800,
      items: [
        { name: "Raccordement Eau Potable (SONED)", qty: 1, unit: "lot" },
        { name: "Raccordement Électricité (STEG)", qty: 1, unit: "lot" },
        { name: "Raccordement Assainissement (ONAS)", qty: 1, unit: "lot" },
        { name: "Fosse septique et épandage (si non raccordé ONAS)", qty: 1, unit: "lot" },
        { name: "Téléphone/Internet (TT)", qty: 1, unit: "lot" },
      ],
    },
  ]),

  studio: m(120, [
    {
      name: "Études et permis (Estimations)",
      budget: 18460,
      items: [
        { name: "Honoraires Architecte (études complètes)", qty: 120, unit: "m²" },
        { name: "Honoraires Ingénieur Structure", qty: 120, unit: "m²" },
        { name: "Honoraires Ingénieur Fluides", qty: 120, unit: "m²" },
        { name: "Honoraires Géomètre/Topographe", qty: 1, unit: "forfait" },
        { name: "Permis de construire et taxes diverses", qty: 1, unit: "forfait" },
        { name: "Contrôle technique (BET)", qty: 120, unit: "m²" },
      ],
    },
    {
      name: "Gros œuvre (Matériaux et fourniture)",
      budget: 89100,
      items: [
        { name: "Terrassement et fondations (matériaux)", qty: 120, unit: "m²" },
        { name: "Maçonnerie murs porteurs et cloisons (briques, ciment, sable)", qty: 120, unit: "m²" },
        { name: "Structure béton armé (ciment, fer, agrégats)", qty: 120, unit: "m²" },
        { name: "Dalle/Plancher (hourdis, ciment, fer)", qty: 120, unit: "m²" },
        { name: "Étanchéité toiture/terrasse (matériaux)", qty: 120, unit: "m²" },
        { name: "Assainissement et raccordements (matériaux)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Second œuvre (Matériaux et fourniture)",
      budget: 79000,
      items: [
        { name: "Revêtements de sol (carrelage, faïence)", qty: 120, unit: "m²" },
        { name: "Enduits intérieurs (ciment, plâtre)", qty: 120, unit: "m²" },
        { name: "Peinture intérieure (matériaux)", qty: 120, unit: "m²" },
        { name: "Menuiserie Aluminium/PVC (fenêtres, baies)", qty: 120, unit: "m²" },
        { name: "Portes intérieures (bois)", qty: 5, unit: "unités" },
        { name: "Porte d'entrée (blindée ou bois massif)", qty: 1, unit: "unité" },
        { name: "Plomberie sanitaire (tuyaux, robinetterie, appareils)", qty: 1, unit: "forfait" },
        { name: "Électricité (câbles, appareillage, tableau)", qty: 1, unit: "forfait" },
        { name: "Cuisine équipée (meubles, évier, robinetterie)", qty: 1, unit: "forfait" },
        { name: "Appareils sanitaires (WC, lavabo, douche)", qty: 1, unit: "forfait" },
        { name: "Chauffe-eau (électrique/solaire)", qty: 1, unit: "unité" },
        { name: "Faux plafond (placo plâtre, matériaux)", qty: 60, unit: "m²" },
      ],
    },
    {
      name: "Aménagements extérieurs (Matériaux et fourniture)",
      budget: 13400,
      items: [
        { name: "Revêtements extérieurs (façade simple)", qty: 120, unit: "m²" },
        { name: "Peinture extérieure", qty: 120, unit: "m²" },
        { name: "Climatisation (pré-installation et split)", qty: 2, unit: "unités" },
      ],
    },
  ]),

  duplex: m(120, [
    {
      name: "Frais Préliminaires et Administration",
      budget: 21100,
      items: [
        { name: "Honoraires Architecte (étude, suivi)", qty: 120, unit: "m²" },
        { name: "Honoraires Ingénieur Structure", qty: 1, unit: "forfait" },
        { name: "Honoraires Ingénieur Fluides (Plomberie, Électricité)", qty: 1, unit: "forfait" },
        { name: "Étude géotechnique du sol", qty: 1, unit: "forfait" },
        { name: "Permis de construire et taxes", qty: 1, unit: "forfait" },
        { name: "Assurances (DO, RCD)", qty: 120, unit: "m²" },
      ],
    },
    {
      name: "Gros œuvre (fondations, structure, maçonnerie)",
      budget: 113600,
      items: [
        { name: "Terrassement et fouilles", qty: 120, unit: "m²" },
        { name: "Fondations (semelles, longrines, béton armé)", qty: 120, unit: "m²" },
        { name: "Dalle rez-de-chaussée (béton, ferraillage, isolation)", qty: 60, unit: "m²" },
        { name: "Élévation murs extérieurs (parpaings, briques, isolation)", qty: 120, unit: "m²" },
        { name: "Poteaux, poutres, chaînages (béton armé)", qty: 120, unit: "m²" },
        { name: "Dalle étage (béton, ferraillage)", qty: 60, unit: "m²" },
        { name: "Escalier intérieur (béton armé)", qty: 1, unit: "forfait" },
        { name: "Toiture (charpente, étanchéité, tuiles/terre cuite)", qty: 60, unit: "m²" },
        { name: "Maçonnerie intérieure (cloisons, briques)", qty: 120, unit: "m²" },
      ],
    },
    {
      name: "Second œuvre et Finitions intérieures",
      budget: 108200,
      items: [
        { name: "Enduits intérieurs (ciment, plâtre)", qty: 300, unit: "m²" },
        { name: "Revêtements sols (carrelage grès, faïence)", qty: 120, unit: "m²" },
        { name: "Peinture intérieure (3 couches)", qty: 300, unit: "m²" },
        { name: "Menuiserie bois (portes intérieures, placards)", qty: 9, unit: "unités" },
        { name: "Menuiserie aluminium/PVC (fenêtres, portes-fenêtres)", qty: 10, unit: "unités" },
        { name: "Plomberie (installations sanitaires, chauffe-eau)", qty: 1, unit: "forfait" },
        { name: "Électricité (prises, interrupteurs, tableaux)", qty: 120, unit: "m²" },
        { name: "Sanitaires (WC, lavabos, douches, baignoires)", qty: 2, unit: "unités" },
        { name: "Cuisine équipée (meubles hauts et bas, plan de travail)", qty: 1, unit: "forfait" },
        { name: "Faux plafonds (placo plâtre, spots intégrés)", qty: 80, unit: "m²" },
        { name: "Climatisation (split system)", qty: 3, unit: "unités" },
      ],
    },
    {
      name: "Aménagements Extérieurs et Façades",
      budget: 15500,
      items: [
        { name: "Enduits extérieurs et peinture façade", qty: 150, unit: "m²" },
        { name: "Porte d'entrée principale (sécurité)", qty: 1, unit: "unité" },
        { name: "Aménagements divers (murets, petits travaux)", qty: 1, unit: "forfait" },
        { name: "Raccordement VRD (eau, électricité, assainissement)", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  renovation_complete: m(120, [
    {
      name: "Démolition et Déblaiement",
      budget: 3640,
      items: [
        { name: "Dépose revêtements sols et murs", qty: 120, unit: "m²" },
        { name: "Dépose menuiseries (portes, fenêtres)", qty: 20, unit: "unités" },
        { name: "Démolition cloisons légères", qty: 30, unit: "m²" },
        { name: "Évacuation gravats", qty: 1, unit: "camion" },
      ],
    },
    {
      name: "Maçonnerie et Cloisons",
      budget: 4750,
      items: [
        { name: "Réparation maçonnerie murs", qty: 30, unit: "m²" },
        { name: "Montage nouvelles cloisons (placo ou briques)", qty: 40, unit: "m²" },
        { name: "Reprise faux-plafonds", qty: 20, unit: "m²" },
      ],
    },
    {
      name: "Électricité",
      budget: 11700,
      items: [
        { name: "Rénovation complète installation électrique (points lumineux, prises, tableaux)", qty: 120, unit: "m²" },
        { name: "Installation climatiseurs (pose et raccordement)", qty: 3, unit: "unités" },
      ],
    },
    {
      name: "Plomberie et Sanitaire",
      budget: 6900,
      items: [
        { name: "Rénovation complète salle de bain (douche/baignoire, WC, lavabo)", qty: 2, unit: "unités" },
        { name: "Rénovation plomberie cuisine (évier, raccordements)", qty: 1, unit: "unité" },
        { name: "Installation chauffe-eau", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Revêtements de sol et Muraux",
      budget: 10600,
      items: [
        { name: "Carrelage/Grès au sol", qty: 120, unit: "m²" },
        { name: "Faïence salles de bain et cuisine", qty: 40, unit: "m²" },
      ],
    },
    {
      name: "Peinture",
      budget: 10800,
      items: [
        { name: "Préparation des supports et peinture murs/plafonds (2 couches)", qty: 360, unit: "m²" },
      ],
    },
    {
      name: "Menuiseries",
      budget: 11400,
      items: [
        { name: "Portes intérieures (semi-massif/stratifié)", qty: 6, unit: "unités" },
        { name: "Fenêtres et portes-fenêtres (PVC ou Aluminium)", qty: 8, unit: "unités" },
      ],
    },
    {
      name: "Cuisine Équipée",
      budget: 12000,
      items: [
        { name: "Fourniture et pose cuisine (meubles hauts et bas, plan de travail)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Divers et Finitions",
      budget: 2000,
      items: [
        { name: "Petites réparations diverses", qty: 1, unit: "lot" },
        { name: "Nettoyage fin de chantier", qty: 1, unit: "lot" },
      ],
    },
  ]),

  renovation_cuisine: m(50, [
    {
      name: "Démolition et Préparation",
      budget: 3200,
      items: [
        { name: "Démolition meubles existants et évacuation", qty: 1, unit: "lot" },
        { name: "Dépose faïence murale", qty: 50, unit: "m²" },
        { name: "Dépose revêtement de sol", qty: 50, unit: "m²" },
        { name: "Ragréage et préparation des surfaces", qty: 50, unit: "m²" },
      ],
    },
    {
      name: "Revêtements",
      budget: 9500,
      items: [
        { name: "Faïence murale (cuisine moderne, qualité moyenne-supérieure)", qty: 50, unit: "m²" },
        { name: "Carrelage de sol (grès cérame, qualité moyenne-supérieure)", qty: 50, unit: "m²" },
        { name: "Fournitures de pose (colle, joints, croisillons)", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Plomberie",
      budget: 3750,
      items: [
        { name: "Modification / Remplacement réseau d'eau (cuivre/PPR)", qty: 1, unit: "lot" },
        { name: "Évacuation des eaux usées", qty: 1, unit: "lot" },
        { name: "Évier double bac en inox", qty: 1, unit: "unité" },
        { name: "Mitigeur de cuisine (haute qualité)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Électricité",
      budget: 4550,
      items: [
        { name: "Modification / Remplacement réseau électrique (prises, interrupteurs, points lumineux)", qty: 1, unit: "lot" },
        { name: "Installation de spots encastrés LED (20 spots)", qty: 20, unit: "unités" },
        { name: "Prises électriques supplémentaires (avec terre)", qty: 10, unit: "unités" },
        { name: "Installation interrupteur différentiel 30mA", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Menuiserie et Agencement",
      budget: 22000,
      items: [
        { name: "Meubles de cuisine sur mesure (MDF stratifié/laqué, haut et bas)", qty: 15, unit: "ml" },
        { name: "Plan de travail en granit ou quartz", qty: 10, unit: "ml" },
        { name: "Crédence assortie", qty: 8, unit: "m²" },
        { name: "Étagères et accessoires intérieurs (tiroirs, range-couverts)", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Peinture et Finitions",
      budget: 5250,
      items: [
        { name: "Préparation murs et plafonds", qty: 150, unit: "m²" },
        { name: "Peinture acrylique lavable (2 couches)", qty: 150, unit: "m²" },
      ],
    },
    {
      name: "Électroménager (non inclus dans la main d'œuvre)",
      budget: 6700,
      items: [
        { name: "Four encastrable", qty: 1, unit: "unité" },
        { name: "Plaque de cuisson (gaz ou induction)", qty: 1, unit: "unité" },
        { name: "Hotte aspirante décorative", qty: 1, unit: "unité" },
        { name: "Réfrigérateur encastrable", qty: 1, unit: "unité" },
        { name: "Lave-vaisselle encastrable", qty: 1, unit: "unité" },
      ],
    },
  ]),

  renovation_salle_de_bain: m(50, [
    {
      name: "Démolition et Préparation",
      budget: 2250,
      items: [
        { name: "Démontage anciens sanitaires et revêtements", qty: 1, unit: "forfait" },
        { name: "Évacuation des gravats", qty: 1, unit: "forfait" },
        { name: "Préparation des surfaces (ragréage, enduits)", qty: 50, unit: "m²" },
      ],
    },
    {
      name: "Plomberie",
      budget: 2950,
      items: [
        { name: "Déplacement/Remplacement tuyauterie (PER/Multicouche)", qty: 1, unit: "forfait" },
        { name: "Installation chauffe-eau électrique 80L (qualité supérieure)", qty: 1, unit: "unité" },
        { name: "Raccordements et étanchéité", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Électricité",
      budget: 1430,
      items: [
        { name: "Mise aux normes tableau divisionnaire", qty: 1, unit: "forfait" },
        { name: "Installation/Déplacement points lumineux et prises étanches", qty: 1, unit: "forfait" },
        { name: "Installation VMC ou extracteur d'air", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Revêtements et Étanchéité",
      budget: 3350,
      items: [
        { name: "Carrelage mural (faïence qualité moyenne-supérieure)", qty: 35, unit: "m²" },
        { name: "Carrelage au sol (grès cérame qualité moyenne-supérieure)", qty: 15, unit: "m²" },
        { name: "Mortier-colle et joints", qty: 1, unit: "forfait" },
        { name: "Bande d'étanchéité et primaire d'accrochage", qty: 1, unit: "forfait" },
        { name: "Peinture plafond et parties non carrelées (anti-humidité)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Sanitaires et Mobilier",
      budget: 4750,
      items: [
        { name: "Meuble vasque avec miroir et éclairage (qualité moyenne-supérieure)", qty: 1, unit: "unité" },
        { name: "Receveur de douche extra-plat 90x90 ou 120x80", qty: 1, unit: "unité" },
        { name: "Paroi de douche vitrée (fixe + porte pivotante)", qty: 1, unit: "unité" },
        { name: "Robinetterie thermostatique douche", qty: 1, unit: "unité" },
        { name: "Robinetterie lavabo", qty: 1, unit: "unité" },
        { name: "WC suspendu avec bâti-support et plaque de commande", qty: 1, unit: "unité" },
        { name: "Accessoires (porte-serviettes, porte-papier, patères, etc.)", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  peinture_interieur: m(50, [
    {
      name: "Préparation des surfaces",
      budget: 450,
      items: [
        { name: "Lessivage et nettoyage des murs", qty: 50, unit: "m²" },
        { name: "Enduit de rebouchage/lissage (petites imperfections)", qty: 50, unit: "m²" },
        { name: "Ponçage et dépoussiérage", qty: 50, unit: "m²" },
      ],
    },
    {
      name: "Fournitures de peinture",
      budget: 1230,
      items: [
        { name: "Peinture acrylique mate/satinée de qualité (2 couches)", qty: 50, unit: "m²" },
        { name: "Sous-couche d'accroche/impression", qty: 50, unit: "m²" },
        { name: "Bâche de protection, ruban de masquage, consommables", qty: 1, unit: "lot" },
      ],
    },
  ]),

  piscine_beton: m(50, [
    {
      name: "1. Études et Autorisations",
      budget: 2800,
      items: [
        { name: "Étude et plans (ingénieur / architecte)", qty: 1, unit: "forfait" },
        { name: "Permis de construire / Autorisations", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "2. Terrassement et Gros Oeuvre",
      budget: 30650,
      items: [
        { name: "Terrassement (déblai, remblai, évacuation terres)", qty: 150, unit: "m³" },
        { name: "Forme et radier (béton dosé C25/30)", qty: 20, unit: "m³" },
        { name: "Voiles et murs (béton dosé C25/30, coffrage)", qty: 25, unit: "m³" },
        { name: "Fer sur place (chaînage, armature)", qty: 1500, unit: "kg" },
        { name: "Enduit d'imperméabilisation et étanchéité", qty: 100, unit: "m²" },
        { name: "Drainage périphérique", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "3. Hydraulique et Filtration",
      budget: 12900,
      items: [
        { name: "Skimmers (2 unités)", qty: 2, unit: "pcs" },
        { name: "Buses de refoulement (4 unités)", qty: 4, unit: "pcs" },
        { name: "Prise balai et bonde de fond", qty: 2, unit: "pcs" },
        { name: "Pompe de filtration (adaptée 50m³)", qty: 1, unit: "unité" },
        { name: "Filtre à sable (adapté 50m³, avec sable)", qty: 1, unit: "unité" },
        { name: "Coffret électrique de commande (protection, horloge)", qty: 1, unit: "unité" },
        { name: "Tuyauterie PVC pression et raccords", qty: 1, unit: "forfait" },
        { name: "Local technique maçonné (incluant dalle et porte)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "4. Revêtement et Finitions",
      budget: 10550,
      items: [
        { name: "Liner armé 150/100e ou Carrelage piscine (matériaux et pose)", qty: 100, unit: "m²" },
        { name: "Margelles (pierre locale ou importée)", qty: 30, unit: "ml" },
      ],
    },
    {
      name: "5. Éclairage et Accessoires",
      budget: 2500,
      items: [
        { name: "Projecteurs LED (2 unités)", qty: 2, unit: "pcs" },
        { name: "Kit d'entretien (trousse d'analyse, épuisette, brosse, aspirateur manuel)", qty: 1, unit: "kit" },
        { name: "Échelle inox (3 marches)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "6. Options et Aménagements Extérieurs (Estimation)",
      budget: 12600,
      items: [
        { name: "Plages autour piscine (dallage ou bois composite)", qty: 30, unit: "m²" },
        { name: "Traitement de l'eau automatique (Électrolyseur de sel)", qty: 1, unit: "unité" },
        { name: "Chauffage de piscine (pompe à chaleur)", qty: 1, unit: "unité" },
      ],
    },
  ]),

  piscine_coque: m(50, [
    {
      name: "Terrassement et préparation du site",
      budget: 4000,
      items: [
        { name: "Décapage et terrassement pour bassin (déblai et remblai)", qty: 50, unit: "m³" },
        { name: "Evacuation des terres (camion 15m³)", qty: 4, unit: "voyages" },
        { name: "Préparation du fond de fouille (hérissonage et lit de sable)", qty: 50, unit: "m²" },
      ],
    },
    {
      name: "Fourniture et installation de la coque",
      budget: 38800,
      items: [
        { name: "Fourniture coque polyester (incl. escalier, skimmers, refoulements, bonde de fond)", qty: 50, unit: "m²" },
        { name: "Transport de la coque (convoi exceptionnel)", qty: 1, unit: "forfait" },
        { name: "Grutage et mise en place de la coque", qty: 1, unit: "forfait" },
        { name: "Remblaiement périphérique en gravier stabilisé", qty: 15, unit: "m³" },
      ],
    },
    {
      name: "Local technique et filtration",
      budget: 10750,
      items: [
        { name: "Construction local technique (petit modèle, enterré/semi-enterré)", qty: 1, unit: "forfait" },
        { name: "Pompe de filtration (puissance adaptée)", qty: 1, unit: "unité" },
        { name: "Filtre à sable (avec média filtrant)", qty: 1, unit: "unité" },
        { name: "Vannes, raccords PVC pression, tuyauterie (hydraulique complète)", qty: 1, unit: "forfait" },
        { name: "Tableau électrique de commande et protection (différentiel, horloge)", qty: 1, unit: "unité" },
        { name: "Projecteurs LED (2 unités)", qty: 2, unit: "unités" },
        { name: "Prise balai / bouche d'aspiration", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Margelles et périphérie",
      budget: 7150,
      items: [
        { name: "Margelles en pierre reconstituée/travertin (hors pose)", qty: 25, unit: "ml" },
        { name: "Chaînage périphérique et dalle de propreté (pour margelles)", qty: 25, unit: "ml" },
        { name: "Terrassement et forme pour plage en béton", qty: 20, unit: "m²" },
        { name: "Dalle béton armé pour plage (épaisseur 10cm, treillis soudé)", qty: 20, unit: "m²" },
        { name: "Revêtement de plage (carrelage extérieur moyen de gamme, hors pose)", qty: 20, unit: "m²" },
      ],
    },
    {
      name: "Équipements et accessoires",
      budget: 850,
      items: [
        { name: "Trousse d'analyse (pH, Chlore)", qty: 1, unit: "unité" },
        { name: "Matériel d'entretien (épuisette, balai aspirateur manuel, brosse)", qty: 1, unit: "lot" },
        { name: "Coffret by-pass pour traitement (si chlorinateur/pH automatique)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Fraisiers annexes et imprévus",
      budget: 9500,
      items: [
        { name: "Eau de remplissage (citerne)", qty: 50, unit: "m³" },
        { name: "Raccordement VRD (eau/électricité pour local technique)", qty: 1, unit: "forfait" },
        { name: "Garantie décennale et assurance dommages-ouvrage (pour coque et installation)", qty: 1, unit: "forfait" },
        { name: "Imprévus / frais divers (5% du total hors MO)", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  garage: m(50, [
    {
      name: "Terrassement et Fondations",
      budget: 2040,
      items: [
        { name: "Décapage et nivellement du terrain", qty: 50, unit: "m²" },
        { name: "Fouilles en rigoles (garage) / points (carport)", qty: 15, unit: "ml" },
        { name: "Béton de propreté C15 (garage)", qty: 0.75, unit: "m³" },
        { name: "Béton pour semelles filantes/isolées C25", qty: 2, unit: "m³" },
        { name: "Acier pour fondations (semelles et chainages)", qty: 100, unit: "kg" },
        { name: "Remblaiement et compactage (sous dalle garage)", qty: 10, unit: "m³" },
      ],
    },
    {
      name: "Superstructure et Murs (pour garage fermé ou murs bas carport)",
      budget: 6313,
      items: [
        { name: "Béton pour poteaux et chainages C25", qty: 1.5, unit: "m³" },
        { name: "Acier pour poteaux et chainages", qty: 75, unit: "kg" },
        { name: "Maconnerie murale en briques creuses (Garage)", qty: 80, unit: "m²" },
        { name: "Enduit ciment intérieur/extérieur (Garage)", qty: 160, unit: "m²" },
      ],
    },
    {
      name: "Dalle et Revêtement de sol",
      budget: 5600,
      items: [
        { name: "Hérisson ventilé et couche de forme (Garage)", qty: 50, unit: "m²" },
        { name: "Film polyane", qty: 50, unit: "m²" },
        { name: "Dalle en béton armé C25 (Garage)", qty: 50, unit: "m²" },
        { name: "Acier pour dalle", qty: 100, unit: "kg" },
        { name: "Revêtement sol carrelage (Garage) ou béton lissé (Carport)", qty: 50, unit: "m²" },
      ],
    },
    {
      name: "Toiture",
      budget: 6375,
      items: [
        { name: "Charpente métallique légère (Garage/Carport)", qty: 50, unit: "m²" },
        { name: "Couverture tôle ondulée / sandwich (Garage/Carport)", qty: 50, unit: "m²" },
        { name: "Gouttières et descentes PVC", qty: 15, unit: "ml" },
      ],
    },
    {
      name: "Menuiserie et Quincaillerie (pour garage fermé)",
      budget: 3050,
      items: [
        { name: "Porte de garage (sectionnelle ou basculante)", qty: 1, unit: "unité" },
        { name: "Porte de service / Accès (PVC ou Aluminium)", qty: 1, unit: "unité" },
        { name: "Fenêtre PVC double vitrage (si applicable)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Electricité (point lumineux et prises)",
      budget: 990,
      items: [
        { name: "Points lumineux (intérieurs/extérieurs)", qty: 4, unit: "points" },
        { name: "Prises électriques étanches", qty: 3, unit: "points" },
        { name: "Tableau électrique secondaire", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Peinture et Finitions (pour garage fermé)",
      budget: 3150,
      items: [
        { name: "Peinture acrylique murs et plafond", qty: 210, unit: "m²" },
      ],
    },
    {
      name: "Divers et Imprévus",
      budget: 550,
      items: [
        { name: "Nettoyage de fin de chantier", qty: 1, unit: "forfait" },
        { name: "Déchets et évacuation", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  boutique_commerciale: m(100, [
    {
      name: "Démolition et Préparation",
      budget: 3300,
      items: [
        { name: "Dépose revêtements sols et murs existants", qty: 100, unit: "m²" },
        { name: "Démontage cloisons légères / faux-plafond existants", qty: 50, unit: "m²" },
        { name: "Évacuation des gravats et déchets", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Gros œuvre léger & Second œuvre structurel",
      budget: 13000,
      items: [
        { name: "Création de nouvelles cloisons en placo-plâtre (doubles plaques, isolant)", qty: 60, unit: "m²" },
        { name: "Création ou modification d'ouvertures (portes/fenêtres intérieures)", qty: 3, unit: "unités" },
        { name: "Ragréage et préparation du sol", qty: 100, unit: "m²" },
        { name: "Faux-plafond en placo-plâtre (standard, sur ossature)", qty: 100, unit: "m²" },
      ],
    },
    {
      name: "Revêtements et Finitions",
      budget: 16100,
      items: [
        { name: "Revêtement de sol (Carrelage grès cérame, qualité moyenne)", qty: 100, unit: "m²" },
        { name: "Peinture murs et cloisons (2 couches, finition satinée)", qty: 250, unit: "m²" },
        { name: "Peinture faux-plafond (2 couches)", qty: 100, unit: "m²" },
        { name: "Revêtement mural décoratif (ex: papier peint, enduit spécifique)", qty: 30, unit: "m²" },
      ],
    },
    {
      name: "Menuiserie et Vitrerie",
      budget: 13800,
      items: [
        { name: "Porte d'entrée vitrée (aluminium ou acier, sécurité)", qty: 1, unit: "unité" },
        { name: "Portes intérieures (bois semi-massif ou stratifié)", qty: 3, unit: "unités" },
        { name: "Vitrine fixe ou façade vitrée (avec cadres alu ou verre trempé)", qty: 15, unit: "m²" },
        { name: "Comptoir de vente sur mesure (bois/stratifié)", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Électricité et Éclairage",
      budget: 13450,
      items: [
        { name: "Installation électrique complète (mise aux normes, câblage, tableau)", qty: 100, unit: "m²" },
        { name: "Prises électriques et interrupteurs (qualité moyenne)", qty: 30, unit: "unités" },
        { name: "Spots LED encastrés ou luminaires suspendus", qty: 40, unit: "unités" },
        { name: "Éclairage d'accentuation (rails, bandeaux LED)", qty: 1, unit: "lot" },
        { name: "Tableau électrique principal et disjoncteurs", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Plomberie et Sanitaires",
      budget: 2200,
      items: [
        { name: "Installation lavabo / petit point d'eau", qty: 1, unit: "unité" },
        { name: "Chauffe-eau électrique (15-20L)", qty: 1, unit: "unité" },
        { name: "W.C. suspendu ou à poser", qty: 1, unit: "unité" },
        { name: "Robinetterie et accessoires (porte-savon, miroir)", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Climatisation et Ventilation",
      budget: 8100,
      items: [
        { name: "Climatiseur Split System (3 unités x 12000 BTU)", qty: 3, unit: "unités" },
        { name: "Installation VMC ou extracteur d'air (WC/petite réserve)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Sécurité et Réseaux",
      budget: 5800,
      items: [
        { name: "Système d'alarme (centrale, détecteurs, sirène)", qty: 1, unit: "lot" },
        { name: "Caméras de surveillance IP (4 unités avec enregistreur)", qty: 1, unit: "lot" },
        { name: "Réseau informatique/téléphonique (câblage RJ45, prises)", qty: 10, unit: "prises" },
      ],
    },
    {
      name: "Aménagements Spécifiques et Mobilier",
      budget: 10200,
      items: [
        { name: "Mobilier de présentation et étagères sur mesure", qty: 1, unit: "lot" },
        { name: "Miroirs décoratifs", qty: 1, unit: "lot" },
        { name: "Enseigne lumineuse extérieure", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Honoraires et Divers",
      budget: 18500,
      items: [
        { name: "Honoraires Architecte / Architecte d'intérieur (conception, suivi)", qty: 1, unit: "lot" },
        { name: "Permis et autorisations administratives", qty: 1, unit: "lot" },
      ],
    },
  ]),

  restaurant: m(100, [
    {
      name: "Travaux préparatoires et Démolition (si nécessaire)",
      budget: 1900,
      items: [
        { name: "Démolition légère murs/cloisons (murs non porteurs)", qty: 20, unit: "m²" },
        { name: "Évacuation gravats", qty: 5, unit: "m³" },
        { name: "Nettoyage et préparation surface", qty: 100, unit: "m²" },
      ],
    },
    {
      name: "Gros Œuvre Léger / Aménagements Structurels",
      budget: 7300,
      items: [
        { name: "Cloisons en placo-plâtre BA13 (simples)", qty: 40, unit: "m²" },
        { name: "Création d'ouvertures / Renforcement (linteaux)", qty: 2, unit: "unités" },
        { name: "Chape de nivellement / ragréage", qty: 100, unit: "m²" },
      ],
    },
    {
      name: "Revêtements de Sol et Mur",
      budget: 26100,
      items: [
        { name: "Carrelage grès cérame (sol commercial)", qty: 100, unit: "m²" },
        { name: "Faience murale cuisine / sanitaires", qty: 40, unit: "m²" },
        { name: "Peinture murs et plafonds (2 couches)", qty: 300, unit: "m²" },
      ],
    },
    {
      name: "Menuiserie",
      budget: 18250,
      items: [
        { name: "Porte d'entrée aluminium/verre (commerciale)", qty: 1, unit: "unité" },
        { name: "Portes intérieures (cuisine, sanitaires)", qty: 3, unit: "unités" },
        { name: "Fenêtres et baies vitrées aluminium", qty: 15, unit: "m²" },
        { name: "Faux plafond BA13 (décoratif)", qty: 100, unit: "m²" },
      ],
    },
    {
      name: "Plomberie et Sanitaires",
      budget: 7400,
      items: [
        { name: "Installation plomberie générale (arrivée/évacuation)", qty: 1, unit: "forfait" },
        { name: "WC suspendu avec réservoir encastré", qty: 2, unit: "unités" },
        { name: "Lavabo avec meuble et mitigeur", qty: 2, unit: "unités" },
        { name: "Évier double bac inox professionnel (cuisine)", qty: 1, unit: "unité" },
        { name: "Chauffe-eau électrique (150L)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Électricité et Éclairage",
      budget: 15500,
      items: [
        { name: "Installation électrique complète (normes pro)", qty: 1, unit: "forfait" },
        { name: "Tableau électrique principal (pro)", qty: 1, unit: "unité" },
        { name: "Prises électriques et réseau (RJ45)", qty: 30, unit: "unités" },
        { name: "Points lumineux LED encastrés/apparents", qty: 40, unit: "unités" },
        { name: "Éclairage de secours/signalétique", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Climatisation et Ventilation",
      budget: 11200,
      items: [
        { name: "Climatisation Split System Inverter (24000 BTU)", qty: 3, unit: "unités" },
        { name: "Extracteur d'air professionnel (cuisine)", qty: 1, unit: "unité" },
        { name: "Gaines et grilles de ventilation", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Équipement de Cuisine Professionnelle",
      budget: 19500,
      items: [
        { name: "Four professionnel", qty: 1, unit: "unité" },
        { name: "Plaques de cuisson / Fourneaux", qty: 1, unit: "unité" },
        { name: "Fours micro-ondes/petits équipements", qty: 1, unit: "lot" },
        { name: "Réfrigérateurs / Congélateurs professionnels", qty: 2, unit: "unités" },
        { name: "Hotte aspirante professionnelle avec moteur", qty: 1, unit: "unité" },
        { name: "Table de travail inox et rayonnages", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Aménagement Intérieur et Mobilier",
      budget: 22000,
      items: [
        { name: "Comptoir / Bar sur mesure (bois/marbre)", qty: 1, unit: "unité" },
        { name: "Tables et Chaises (zone clientèle)", qty: 20, unit: "places" },
        { name: "Banquettes / Canapés (sièges confort)", qty: 10, unit: "ml" },
        { name: "Étagères / Rangements (déco et fonctionnel)", qty: 1, unit: "forfait" },
        { name: "Décoration murale / Miroirs / Objets", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Sécurité et Incendie",
      budget: 3200,
      items: [
        { name: "Système d'alarme et surveillance vidéo (4 caméras)", qty: 1, unit: "forfait" },
        { name: "Extincteurs et signalétique incendie", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Aménagements Extérieurs (façade/terrasse si applicable)",
      budget: 5200,
      items: [
        { name: "Enseigne lumineuse façade", qty: 1, unit: "unité" },
        { name: "Peinture façade / Retouches", qty: 30, unit: "m²" },
        { name: "Petit aménagement terrasse (dalles/garde-corps)", qty: 20, unit: "m²" },
      ],
    },
    {
      name: "Frais Annexes / Imprévus",
      budget: 26000,
      items: [
        { name: "Honoraires architecte / bureaux d'études", qty: 1, unit: "forfait" },
        { name: "Autorisations administratives / Licences", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  cafe: m(100, [
    {
      name: "Démolition et Préparation",
      budget: 5000,
      items: [
        { name: "Démolition légères (cloisons, revêtements)", qty: 100, unit: "m²" },
        { name: "Évacuation des gravats", qty: 1, unit: "lot" },
        { name: "Nettoyage et préparation du site", qty: 100, unit: "m²" },
      ],
    },
    {
      name: "Gros œuvre léger / Second œuvre (Cloisons, Plafonds)",
      budget: 7950,
      items: [
        { name: "Cloisons en placo-plâtre (doubles faces) pour zones spécifiques (cuisine, sanitaires, stockage)", qty: 60, unit: "m²" },
        { name: "Faux plafond BA13 (zone clients)", qty: 70, unit: "m²" },
        { name: "Faux plafond lavable (cuisine, sanitaires)", qty: 30, unit: "m²" },
      ],
    },
    {
      name: "Revêtements de sol et murs",
      budget: 11950,
      items: [
        { name: "Carrelage grès cérame de qualité supérieure (zone clients et circulation)", qty: 70, unit: "m²" },
        { name: "Carrelage antidérapant (cuisine, sanitaires)", qty: 30, unit: "m²" },
        { name: "Faïence murale (sanitaires)", qty: 20, unit: "m²" },
        { name: "Faïence murale (cuisine)", qty: 30, unit: "m²" },
      ],
    },
    {
      name: "Peinture et Enduits",
      budget: 9000,
      items: [
        { name: "Préparation des surfaces (enduits, ponçage)", qty: 250, unit: "m²" },
        { name: "Peinture acrylique lavable (murs)", qty: 200, unit: "m²" },
        { name: "Peinture spéciale cuisine/sanitaires", qty: 50, unit: "m²" },
      ],
    },
    {
      name: "Menuiserie Bois et Aluminium",
      budget: 18900,
      items: [
        { name: "Porte d'entrée en aluminium/verre avec serrure de sécurité", qty: 1, unit: "unité" },
        { name: "Portes intérieures (cuisine, sanitaires, stockage) en bois semi-massif", qty: 3, unit: "unités" },
        { name: "Fenêtres en aluminium double vitrage (si existantes/nécessaires)", qty: 10, unit: "m²" },
        { name: "Comptoir de bar sur mesure en bois/stratifié", qty: 1, unit: "unité" },
        { name: "Étagères et rangements sur mesure pour le bar/arrière-bar", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Plomberie et Sanitaires",
      budget: 10900,
      items: [
        { name: "Installation plomberie complète (alimentation + évacuation) pour cuisine et sanitaires", qty: 1, unit: "lot" },
        { name: "Chauffe-eau électrique 100L (cuisine)", qty: 1, unit: "unité" },
        { name: "Chauffe-eau électrique 50L (sanitaires)", qty: 1, unit: "unité" },
        { name: "Évier double bac inox professionnel", qty: 1, unit: "unité" },
        { name: "Robinetterie professionnelle", qty: 2, unit: "unités" },
        { name: "WC suspendu avec réservoir encastré", qty: 2, unit: "unités" },
        { name: "Lavabo avec meuble sous vasque (sanitaires)", qty: 2, unit: "unités" },
        { name: "Robinetterie lavabos", qty: 2, unit: "unités" },
        { name: "Accessoires sanitaires (porte-papier, miroir, sèche-mains)", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Électricité et Éclairage",
      budget: 13300,
      items: [
        { name: "Installation électrique complète (tableau, câblage, prises, interrupteurs) normes professionnelles", qty: 1, unit: "lot" },
        { name: "Éclairage encastré LED (zone clients)", qty: 25, unit: "unités" },
        { name: "Appliques murales décoratives", qty: 10, unit: "unités" },
        { name: "Éclairage technique (cuisine, stockage, sanitaires)", qty: 10, unit: "unités" },
        { name: "Éclairage de secours et sorties", qty: 5, unit: "unités" },
        { name: "Pré-installation pour enseigne lumineuse", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Climatisation et Ventilation",
      budget: 9500,
      items: [
        { name: "Climatisation centralisée ou 2 unités murales Inverter haute capacité (salon)", qty: 2, unit: "unités" },
        { name: "Ventilation mécanique contrôlée (VMC) pour cuisine et sanitaires (extraction puissante)", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Équipements de Cuisine Professionnelle",
      budget: 30000,
      items: [
        { name: "Machine à café professionnelle (location/achat initial)", qty: 1, unit: "unité" },
        { name: "Moulin à café", qty: 1, unit: "unité" },
        { name: "Réfrigérateur/Congélateur professionnel", qty: 2, unit: "unités" },
        { name: "Vitrine réfrigérée de comptoir (pâtisseries/sandwichs)", qty: 1, unit: "unité" },
        { name: "Lave-vaisselle professionnel", qty: 1, unit: "unité" },
        { name: "Four micro-ondes professionnel", qty: 1, unit: "unité" },
        { name: "Matériel de préparation (blender, toaster, etc.)", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Mobilier et Décoration",
      budget: 25000,
      items: [
        { name: "Tables (4-6 places)", qty: 10, unit: "unités" },
        { name: "Chaises", qty: 30, unit: "unités" },
        { name: "Fauteuils/Banquettes (espace lounge)", qty: 1, unit: "lot" },
        { name: "Décoration murale (tableaux, miroirs, étagères)", qty: 1, unit: "lot" },
        { name: "Luminaires décoratifs", qty: 1, unit: "lot" },
        { name: "Plantes et jardinières", qty: 1, unit: "lot" },
        { name: "Vaisselle, verrerie, couverts", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Sécurité et Réseaux",
      budget: 5800,
      items: [
        { name: "Système de vidéosurveillance (4 caméras, enregistreur)", qty: 1, unit: "lot" },
        { name: "Alarme incendie et extincteurs", qty: 1, unit: "lot" },
        { name: "Réseau internet et WIFI professionnel", qty: 1, unit: "lot" },
        { name: "Installation TPE/Caisse enregistreuse", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Honoraires et Divers",
      budget: 31000,
      items: [
        { name: "Honoraires architecte/architecte d'intérieur (conception, suivi)", qty: 1, unit: "lot" },
        { name: "Frais de raccordement (STEG, SONEDE, OACA)", qty: 1, unit: "lot" },
        { name: "Permis et licences d'exploitation", qty: 1, unit: "lot" },
      ],
    },
  ]),

  bureau_cabinet: m(100, [
    {
      name: "Démolition et Préparation",
      budget: 3300,
      items: [
        { name: "Démolition cloisons légères et évacuation", qty: 50, unit: "m²" },
        { name: "Dépose revêtements de sol", qty: 100, unit: "m²" },
        { name: "Dépose faux-plafonds", qty: 100, unit: "m²" },
        { name: "Nettoyage et préparation du site", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Gros Œuvre Secondaire et Cloisons",
      budget: 11550,
      items: [
        { name: "Cloisons en Placoplatre BA13 (double peau, isolation phonique)", qty: 80, unit: "m²" },
        { name: "Portes intérieures (bois massif ou stratifié, quincaillerie)", qty: 5, unit: "unités" },
        { name: "Bloc-porte d'entrée sécurisé", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Revêtements de Sol et Murs",
      budget: 9100,
      items: [
        { name: "Carrelage Grès Porcelaine de qualité supérieure", qty: 100, unit: "m²" },
        { name: "Plinthes assorties", qty: 80, unit: "ml" },
        { name: "Revêtement mural faïence salle d'eau/cuisine", qty: 15, unit: "m²" },
      ],
    },
    {
      name: "Peinture et Faux Plafonds",
      budget: 13750,
      items: [
        { name: "Faux-plafond démontable en dalles 60x60", qty: 100, unit: "m²" },
        { name: "Préparation et peinture murs (3 couches, qualité pro)", qty: 250, unit: "m²" },
        { name: "Préparation et peinture plafonds (3 couches)", qty: 100, unit: "m²" },
      ],
    },
    {
      name: "Électricité et Réseaux",
      budget: 11150,
      items: [
        { name: "Installation tableau électrique principal et différentiels", qty: 1, unit: "unité" },
        { name: "Points lumineux (spot LED encastré ou luminaire)", qty: 40, unit: "points" },
        { name: "Prises électriques 16A", qty: 30, unit: "prises" },
        { name: "Prises RJ45 (réseau informatique)", qty: 10, unit: "prises" },
        { name: "Alimentation climatisation et autres équipements", qty: 3, unit: "unités" },
        { name: "Câblage téléphonique (points)", qty: 5, unit: "points" },
      ],
    },
    {
      name: "Plomberie et Sanitaires",
      budget: 3450,
      items: [
        { name: "Installation WC suspendu avec lave-mains", qty: 1, unit: "unité" },
        { name: "Installation kitchenette (évier, robinetterie, raccordements)", qty: 1, unit: "unité" },
        { name: "Chauffe-eau électrique (50-80L)", qty: 1, unit: "unité" },
        { name: "Réseau d'alimentation et évacuation (forfait ajusté)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Climatisation",
      budget: 4800,
      items: [
        { name: "Climatiseur Split System Inverter (9000 BTU)", qty: 2, unit: "unités" },
        { name: "Climatiseur Split System Inverter (12000 BTU)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Menuiserie Aluminium et Vitrage",
      budget: 6150,
      items: [
        { name: "Remplacement fenêtres aluminium (double vitrage)", qty: 15, unit: "m²" },
        { name: "Rideau métallique motorisé pour vitrine/entrée", qty: 8, unit: "m²" },
      ],
    },
    {
      name: "Divers et Finitions",
      budget: 6600,
      items: [
        { name: "Cuisine / Kitchenette aménagée (meubles bas, plan de travail)", qty: 1, unit: "unité" },
        { name: "Meuble vasque et miroir salle d'eau", qty: 1, unit: "unité" },
        { name: "Aménagements spécifiques (ex: comptoir d'accueil, étagères sur mesure)", qty: 1, unit: "forfait" },
        { name: "Nettoyage de fin de chantier", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Études et Frais Annexes",
      budget: 7500,
      items: [
        { name: "Honoraires Architecte / Architecte d'intérieur (forfait estimé)", qty: 1, unit: "forfait" },
        { name: "Honoraires Bureau d'études (électricité, structure si nécessaire)", qty: 1, unit: "forfait" },
        { name: "Permis et taxes (forfait estimé)", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  atelier: m(100, [
    {
      name: "Terrassement et Fondations",
      budget: 8250,
      items: [
        { name: "Décapage et nivellement du terrain", qty: 100, unit: "m²" },
        { name: "Fouilles en rigoles/puits", qty: 30, unit: "m³" },
        { name: "Remblaiement et compactage", qty: 20, unit: "m³" },
        { name: "Béton de propreté", qty: 10, unit: "m²" },
        { name: "Semelles filantes/isolées en béton armé", qty: 15, unit: "m³" },
        { name: "Longrines/Poteaux de fondation", qty: 10, unit: "ml" },
      ],
    },
    {
      name: "Gros œuvre - Superstructure et Dallage",
      budget: 13000,
      items: [
        { name: "Maçonnerie en agglos de 20 (soubassement)", qty: 40, unit: "m²" },
        { name: "Dallage pleine masse ép. 15-20 cm (atelier)", qty: 100, unit: "m²" },
        { name: "Armature pour dalle (treillis soudé)", qty: 100, unit: "kg" },
        { name: "Poteaux en béton armé", qty: 8, unit: "unités" },
        { name: "Poutres en béton armé", qty: 1.5, unit: "m³" },
      ],
    },
    {
      name: "Toiture",
      budget: 19700,
      items: [
        { name: "Charpente métallique simple (poutrelles IPN/IPE)", qty: 100, unit: "m²" },
        { name: "Tôles ondulées galvanisées ou panneaux sandwich (toiture)", qty: 110, unit: "m²" },
        { name: "Faîtage et accessoires (tirefonds, cales)", qty: 1, unit: "unité" },
        { name: "Évacuation des eaux pluviales (chéneaux, descentes)", qty: 15, unit: "ml" },
      ],
    },
    {
      name: "Maçonnerie et Enduits",
      budget: 16600,
      items: [
        { name: "Murs en agglos de 15/20 cm (périmétriques)", qty: 200, unit: "m²" },
        { name: "Enduit ciment intérieur simple", qty: 200, unit: "m²" },
        { name: "Enduit ciment extérieur simple", qty: 120, unit: "m²" },
      ],
    },
    {
      name: "Menuiseries et Serrurerie",
      budget: 4000,
      items: [
        { name: "Porte d'entrée métallique coulissante (atelier)", qty: 1, unit: "unité" },
        { name: "Porte de service métallique", qty: 1, unit: "unité" },
        { name: "Fenêtres métalliques simples", qty: 2, unit: "unités" },
      ],
    },
    {
      name: "Électricité",
      budget: 6700,
      items: [
        { name: "Installation électrique complète (points lumineux, prises)", qty: 100, unit: "m²" },
        { name: "Tableau électrique principal", qty: 1, unit: "unité" },
        { name: "Éclairage LED industriel", qty: 8, unit: "unités" },
      ],
    },
    {
      name: "Plomberie (si petite zone sanitaire)",
      budget: 2000,
      items: [
        { name: "Réseau d'alimentation et évacuation (PVC)", qty: 1, unit: "unité" },
        { name: "Un WC et un lavabo simple", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Peinture",
      budget: 6660,
      items: [
        { name: "Peinture acrylique intérieure (murs et plafond)", qty: 300, unit: "m²" },
        { name: "Peinture façade extérieure", qty: 120, unit: "m²" },
      ],
    },
    {
      name: "VRD et Divers",
      budget: 8300,
      items: [
        { name: "Raccordement réseau ONEED/STEG", qty: 1, unit: "lot" },
        { name: "Assainissement (fosse septique si pas de raccordement)", qty: 1, unit: "unité" },
        { name: "Frais d'étude et permis de construire", qty: 1, unit: "lot" },
      ],
    },
  ]),

  entrepot: m(100, [
    {
      name: "Frais Préliminaires et Études",
      budget: 6300,
      items: [
        { name: "Honoraires Architecte (avant-projet, permis)", qty: 1, unit: "forfait" },
        { name: "Honoraires Ingénieur Structure", qty: 1, unit: "forfait" },
        { name: "Étude de Sol", qty: 1, unit: "forfait" },
        { name: "Permis de Bâtir et Taxes", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Terrassement et Fondations",
      budget: 17150,
      items: [
        { name: "Terrassement général (décapage, fouilles)", qty: 100, unit: "m²" },
        { name: "Béton de propreté", qty: 10, unit: "m³" },
        { name: "Semelles filantes/isolées en béton armé", qty: 15, unit: "m³" },
        { name: "Longrines/Poteaux de fondation", qty: 12, unit: "m³" },
      ],
    },
    {
      name: "Gros œuvre (Structure)",
      budget: 44890,
      items: [
        { name: "Élévation des murs (briques creuses 8 ou 12 trous)", qty: 250, unit: "m²" },
        { name: "Poteaux et chaînages en béton armé", qty: 18, unit: "m³" },
        { name: "Dalle ou toiture légère (bac acier isolé, charpente métallique)", qty: 100, unit: "m²" },
        { name: "Enduits intérieurs (ciment lisse)", qty: 250, unit: "m²" },
      ],
    },
    {
      name: "Revêtements et Finitions",
      budget: 8000,
      items: [
        { name: "Chape ciment sur hérisson (sol)", qty: 100, unit: "m²" },
        { name: "Peinture intérieure (acrylique/glycéro simple)", qty: 250, unit: "m²" },
      ],
    },
    {
      name: "Menuiserie et Quincaillerie",
      budget: 2600,
      items: [
        { name: "Porte d'accès principale (métallique, simple)", qty: 1, unit: "unité" },
        { name: "Porte de service (métallique)", qty: 1, unit: "unité" },
        { name: "Fenêtres / aérations (barreaudées si nécessaire)", qty: 2, unit: "unités" },
      ],
    },
    {
      name: "Électricité",
      budget: 3480,
      items: [
        { name: "Tableau électrique principal", qty: 1, unit: "unité" },
        { name: "Éclairage (points lumineux LED)", qty: 8, unit: "unités" },
        { name: "Prises de courant (standards)", qty: 6, unit: "unités" },
        { name: "Câblage et raccordements", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Plomberie (minimale)",
      budget: 700,
      items: [
        { name: "Arrivée d'eau (si besoin pour nettoyage ou WC)", qty: 1, unit: "point" },
        { name: "Évacuation (si besoin pour nettoyage ou WC)", qty: 1, unit: "point" },
      ],
    },
    {
      name: "VRD et Divers",
      budget: 3000,
      items: [
        { name: "Raccordement réseaux (STEG/SONEDE si nécessaire)", qty: 1, unit: "forfait" },
        { name: "Fosse septique / raccordement assainissement (si besoin)", qty: 1, unit: "forfait" },
        { name: "Nettoyage de chantier", qty: 1, unit: "forfait" },
      ],
    },
  ]),

  maison_d_hotes: m(120, maisonSections),

  batiment_agricole: m(100, [
    {
      name: "Frais Préliminaires et Études",
      budget: 9500,
      items: [
        { name: "Étude de sol (géotechnique)", qty: 1, unit: "rapport" },
        { name: "Honoraires architecte (esquisse, plans permis)", qty: 1, unit: "forfait" },
        { name: "Honoraires bureau d'études techniques (BET)", qty: 1, unit: "forfait" },
        { name: "Permis de construire et taxes", qty: 1, unit: "forfait" },
        { name: "Assurances (DO/RC)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Gros œuvre (fondations, structure, maçonnerie)",
      budget: 37800,
      items: [
        { name: "Terrassement et VRD (nivellement, fouilles)", qty: 100, unit: "m²" },
        { name: "Fondations (semelles, longrines, béton armé)", qty: 100, unit: "m²" },
        { name: "Dallage sur terre-plein (béton armé, treillis soudé, polyane)", qty: 100, unit: "m²" },
        { name: "Élévation murs extérieurs (blocs béton 20cm)", qty: 120, unit: "m²" },
        { name: "Poteaux et poutres (béton armé)", qty: 1, unit: "forfait" },
        { name: "Charpente métallique (portée simple, profilés IPE/HEA)", qty: 100, unit: "m²" },
      ],
    },
    {
      name: "Couverture et Étanchéité",
      budget: 5950,
      items: [
        { name: "Tôles ondulées galvanisées ou bac acier", qty: 110, unit: "m²" },
        { name: "Faîtières, rives et accessoires", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Menuiseries",
      budget: 4900,
      items: [
        { name: "Porte de service métallique (simple)", qty: 2, unit: "unités" },
        { name: "Porte d'accès principale (grande, coulissante ou battante métallique)", qty: 1, unit: "unité" },
        { name: "Fenêtres (châssis fixes ou ouvrants simples, PVC/Alu)", qty: 4, unit: "unités" },
      ],
    },
    {
      name: "Revêtements et Finitions (minimales)",
      budget: 8940,
      items: [
        { name: "Enduit ciment murs intérieurs et extérieurs", qty: 220, unit: "m²" },
        { name: "Peinture intérieure et extérieure (primaire + 2 couches, lavable)", qty: 220, unit: "m²" },
        { name: "Dalle de sol béton finition talochée (brute ou quartz)", qty: 100, unit: "m²" },
      ],
    },
    {
      name: "Électricité",
      budget: 4500,
      items: [
        { name: "Installation électrique de base (éclairage, prises, tableau)", qty: 100, unit: "m²" },
        { name: "Luminaires (douilles et ampoules LED simples)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Plomberie (si nécessaire pour petit point d'eau)",
      budget: 1500,
      items: [
        { name: "Installation point d'eau (lavabo simple, robinet, évacuation)", qty: 1, unit: "forfait" },
      ],
    },
    {
      name: "Aménagements extérieurs (minimal)",
      budget: 1000,
      items: [
        { name: "Chemin d'accès et petite aire de stationnement (gravier/empierrement)", qty: 50, unit: "m²" },
      ],
    },
  ]),

  electricite_complete: m(120, [
    {
      name: "Câblage et Conduits",
      budget: 2700,
      items: [
        { name: "Câbles électriques divers (sections 1.5, 2.5, 4, 6 mm²)", qty: 300, unit: "ml" },
        { name: "Gaines ICTA encastrables (diam. 16, 20, 25 mm)", qty: 250, unit: "ml" },
        { name: "Boîtes d'encastrement (interrupteurs, prises)", qty: 50, unit: "unités" },
        { name: "Boîtes de dérivation", qty: 10, unit: "unités" },
        { name: "Boîte de raccordement TV/Tél/Internet", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Tableau Électrique et Protection",
      budget: 1590,
      items: [
        { name: "Tableau électrique nu (4 rangées)", qty: 1, unit: "unité" },
        { name: "Disjoncteur général de branchement (Linky ou équivalent)", qty: 1, unit: "unité" },
        { name: "Interrupteurs différentiels 30mA (type A et AC)", qty: 3, unit: "unités" },
        { name: "Disjoncteurs divisionnaires (10A, 16A, 20A, 32A)", qty: 18, unit: "unités" },
        { name: "Peignes de raccordement et accessoires tableau", qty: 1, unit: "lot" },
        { name: "Piquet de terre et raccordement", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Appareillage (Prises, Interrupteurs, etc.)",
      budget: 1525,
      items: [
        { name: "Prises de courant 2P+T (standard)", qty: 35, unit: "unités" },
        { name: "Interrupteurs va-et-vient / simples allumages", qty: 20, unit: "unités" },
        { name: "Prises TV", qty: 3, unit: "unités" },
        { name: "Prises RJ45 (réseau)", qty: 4, unit: "unités" },
        { name: "Spots/Points lumineux (douilles DCL incluses)", qty: 25, unit: "unités" },
        { name: "Applique extérieure / point lumineux terrasse", qty: 2, unit: "unités" },
      ],
    },
    {
      name: "Raccordements et Divers",
      budget: 300,
      items: [
        { name: "Cheminement câble d'alimentation (du compteur au tableau)", qty: 1, unit: "lot" },
        { name: "Consommables (scotch, colliers, vis, etc.)", qty: 1, unit: "lot" },
        { name: "Petits outillages et fournitures complémentaires", qty: 1, unit: "lot" },
      ],
    },
  ]),

  plomberie_complete: m(120, [
    {
      name: "Canalisations et évacuations",
      budget: 1550,
      items: [
        { name: "Tuyaux PPR (eau chaude/froide) - F.O.S", qty: 100, unit: "m" },
        { name: "Tuyaux PVC (évacuation Ø40-63)", qty: 50, unit: "m" },
        { name: "Tuyaux PVC (évacuation Ø100-110)", qty: 30, unit: "m" },
        { name: "Raccords et colliers (PPR et PVC)", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Appareils sanitaires",
      budget: 2950,
      items: [
        { name: "W.C. suspendu ou à poser (entrée de gamme)", qty: 2, unit: "unités" },
        { name: "Lavabo avec meuble (entrée de gamme)", qty: 2, unit: "unités" },
        { name: "Douche à l'italienne ou bac à douche", qty: 2, unit: "unités" },
        { name: "Évier de cuisine (inox, simple bac)", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Robinetterie et accessoires",
      budget: 1080,
      items: [
        { name: "Mélangeurs/mitigeurs lavabo", qty: 2, unit: "unités" },
        { name: "Mélangeurs/mitigeurs douche", qty: 2, unit: "unités" },
        { name: "Mélangeur/mitigeur évier cuisine", qty: 1, unit: "unité" },
        { name: "Robinet machine à laver", qty: 1, unit: "unité" },
        { name: "Siphon, bondes, flexibles (lot)", qty: 1, unit: "lot" },
      ],
    },
    {
      name: "Production d'eau chaude",
      budget: 400,
      items: [
        { name: "Chauffe-eau électrique 80-100L", qty: 1, unit: "unité" },
      ],
    },
    {
      name: "Installation et raccordements généraux",
      budget: 550,
      items: [
        { name: "Compteur d'eau et raccordements initiaux", qty: 1, unit: "lot" },
        { name: "Vannes d'arrêt principales et secondaires", qty: 1, unit: "lot" },
        { name: "Test d'étanchéité et mise en service", qty: 1, unit: "lot" },
      ],
    },
  ]),
};

/** Alias rétro-compatibles : anciens slugs → modèle le plus proche. */
const MODEL_ALIASES: Record<string, string> = {
  immeuble: "immeuble_residentiel",
  renovation_interieure: "renovation_complete",
  piscine: "piscine_beton",
  local_commercial: "boutique_commerciale",
  bureau: "bureau_cabinet",
  installations_sanitaires: "plomberie_complete",
  installations_electricite: "electricite_complete",
  ferme: "batiment_agricole",
};

/** Modèle du quantitatif pour une catégorie (ou undefined si absent). */
export function getQuantitatifModel(category: string): QuantitatifModel | undefined {
  return PROJECT_TYPE_MODELS[category] ?? PROJECT_TYPE_MODELS[MODEL_ALIASES[category]];
}

// ============================================================================
// TARIFICATION — LIEN VERS LE CATALOGUE OFFICIEL 2026 (prix en direct inclus)
// ============================================================================

const CATALOG_BY_NAME = new Map<string, (typeof TUNISIA_2026_CATALOG)[number]>();
for (const item of TUNISIA_2026_CATALOG) {
  CATALOG_BY_NAME.set(normKey(item.name), item);
}

/**
 * Correspondance mots-clés → référence catalogue pour les postes du modèle
 * dont le libellé ne correspond pas exactement à une référence du catalogue.
 * factor convertit le prix unitaire catalogue dans l'unité du poste du modèle
 * (ex. tonne → kg, m³ → m² de dalle, rouleau → ml, L → m² de peinture).
 */
const MODEL_PRICE_HINTS: { key: string; name: string; factor?: number }[] = [
  // Gros œuvre / structure
  { key: "betondeproprete", name: "Béton de propreté 150 kg/m³" },
  { key: "betonarme", name: "Béton prêt à l'emploi 350 kg/m³" },
  { key: "betoncyclopeen", name: "Béton prêt à l'emploi 300 kg/m³" },
  { key: "semelles", name: "Béton prêt à l'emploi 350 kg/m³" },
  { key: "longrines", name: "Béton prêt à l'emploi 300 kg/m³" },
  { key: "radier", name: "Béton prêt à l'emploi 350 kg/m³" },
  { key: "dalle", name: "Béton prêt à l'emploi 300 kg/m³", factor: 0.2 },
  { key: "voiles", name: "Béton prêt à l'emploi 350 kg/m³" },
  { key: "poteaux", name: "Béton prêt à l'emploi 300 kg/m³" },
  { key: "poutres", name: "Béton prêt à l'emploi 300 kg/m³" },
  { key: "chainages", name: "Béton prêt à l'emploi 300 kg/m³" },
  { key: "beton", name: "Béton prêt à l'emploi 300 kg/m³" },
  { key: "ferraillage", name: "Acier à béton T12 (tonne)", factor: 1 / 1000 },
  { key: "armature", name: "Acier à béton T12 (tonne)", factor: 1 / 1000 },
  { key: "acier", name: "Acier à béton T12 (tonne)", factor: 1 / 1000 },
  { key: "treillis", name: "Treillis soudé ST25 (panneau)", factor: 1 / 12 },
  { key: "ciment", name: "Ciment CPJ 42.5 (sac 50 kg)" },
  { key: "sable", name: "Sable de construction 0/4" },
  { key: "gravier", name: "Gravier concassé 15/25" },
  { key: "cailloux", name: "Cailloux roulés 20/40" },
  { key: "terrevegetale", name: "Terre végétale (apport)" },
  { key: "remblai", name: "Remblai compacté (fourniture + pose)" },
  { key: "fouilles", name: "Fouilles en rigole" },
  { key: "terrassement", name: "Terrassement mécanique" },
  { key: "decapage", name: "Nivellement et compactage" },
  { key: "nivellement", name: "Nivellement et compactage" },
  { key: "parpaing", name: "Parpaing creux 20 cm" },
  { key: "agglo", name: "Bloc béton creux 20×20×40" },
  { key: "blocbeton", name: "Bloc béton creux 20×20×40" },
  { key: "brique", name: "Brique creuse 15 cm" },
  { key: "hourdis", name: "Hourdis 16×50" },
  { key: "poutrelle", name: "Poutrelle préfabriquée (ml)" },
  { key: "charpente", name: "Poutrelle IPN 120" },
  { key: "escalier", name: "Escalier béton préfabriqué" },
  // Étanchéité / isolation / cloisons
  { key: "etancheite", name: "Étanchéité liquide bitumeuse" },
  { key: "geotextile", name: "Géotextile anti-contaminant" },
  { key: "polyane", name: "Géotextile anti-contaminant" },
  { key: "isolation", name: "Polystyrène expansé PSE 4 cm (m²)" },
  { key: "polystyrene", name: "Polystyrène extrudé XPS (m²)" },
  { key: "placo", name: "Plaque placoplâtre BA13 (m²)" },
  { key: "placoplatre", name: "Plaque placoplâtre BA13 (m²)" },
  { key: "fauxplafond", name: "Faux plafond dalles 60×60 (m²)" },
  // Revêtements / peinture
  { key: "carrelage", name: "Carrelage grès cérame 60×60 (m²)" },
  { key: "gres", name: "Carrelage grès cérame 60×60 (m²)" },
  { key: "faience", name: "Faïence murale 25×40 (m²)" },
  { key: "plinthe", name: "Plinthe céramique (ml)" },
  { key: "pave", name: "Pavé autobloquant (m²)" },
  { key: "enduit", name: "Enduit de ciment bâtard (sac 25 kg)", factor: 1 / 3 },
  { key: "ragreage", name: "Enduit de lissage (kg)" },
  { key: "chape", name: "Chape maigre 5 cm (m²)" },
  { key: "peintureexterieure", name: "Peinture extérieure acrylique (L)", factor: 0.25 },
  { key: "peinturefacade", name: "Peinture acrylique façade (L)", factor: 0.25 },
  { key: "peintureinterieure", name: "Peinture intérieure mate (L)", factor: 0.25 },
  { key: "peinture", name: "Peinture intérieure mate (L)", factor: 0.25 },
  { key: "souscouche", name: "Peinture intérieure mate (L)", factor: 0.25 },
  // Menuiseries
  { key: "portedegarage", name: "Porte garage sectionnelle 2.5×2.1" },
  { key: "portesectionnelle", name: "Porte garage sectionnelle 2.5×2.1" },
  { key: "portedentree", name: "Porte d'entrée métallique" },
  { key: "portedacces", name: "Porte d'entrée métallique" },
  { key: "portemetallique", name: "Porte d'entrée métallique" },
  { key: "porteinterieure", name: "Porte intérieure bois pleine" },
  { key: "porte", name: "Porte intérieure bois pleine" },
  { key: "portail", name: "Portail métallique coulissant" },
  { key: "portillon", name: "Portillon piéton métallique" },
  { key: "fenetrepvc", name: "Fenêtre PVC double vitrage 90×120" },
  { key: "fenetrealu", name: "Fenêtre alu double vitrage 90×120" },
  { key: "fenetre", name: "Fenêtre aluminium 90×120" },
  { key: "vitrine", name: "Vitrine vitrée alu (m²)" },
  { key: "baievitree", name: "Vitrine vitrée alu (m²)" },
  { key: "gardecorps", name: "Garde-corps alu (ml)" },
  { key: "barriere", name: "Garde-corps alu (ml)" },
  { key: "tuile", name: "Tuile canal rouge (m²)" },
  { key: "tole", name: "Bac acier nervuré (m²)" },
  { key: "bacacier", name: "Bac acier nervuré (m²)" },
  { key: "cloture", name: "Murette béton préfabriquée (ml)" },
  { key: "muret", name: "Murette béton préfabriquée (ml)" },
  { key: "bordure", name: "Bordure béton préfabriquée" },
  { key: "caniveau", name: "Caniveau béton préfabriqué" },
  { key: "regard", name: "Regard béton préfabriqué Ø60" },
  // Équipements / fluides
  { key: "chauffeeau", name: "Chauffe-eau électrique 80 L" },
  { key: "climatiseur", name: "Climatiseur split 12000 BTU" },
  { key: "climatisation", name: "Climatiseur split 12000 BTU" },
  { key: "split", name: "Climatiseur split 12000 BTU" },
  { key: "projecteur", name: "Projecteur LED extérieur étanche" },
  { key: "spot", name: "Spot LED encastrable 9 W" },
  { key: "pointlumineux", name: "Spot LED encastrable 9 W" },
  { key: "eclairageled", name: "Tube LED 120 cm" },
  { key: "luminaire", name: "Tube LED 120 cm" },
  { key: "cableselectriques", name: "Câble électrique 3×2.5 mm² (rouleau 100 m)", factor: 1 / 100 },
  { key: "cableelectrique", name: "Câble électrique 3×2.5 mm² (rouleau 100 m)", factor: 1 / 100 },
  { key: "cable", name: "Câble électrique 1.5 mm² (ml)" },
  { key: "gaine", name: "Gaine électrique ICTA (ml)" },
  { key: "prise", name: "Prise de courant 2P+T" },
  { key: "interrupteur", name: "Interrupteur va-et-vient" },
  { key: "disjoncteur", name: "Disjoncteur modulaire 16 A" },
  { key: "tableau", name: "Tableau électrique 13 modules" },
  { key: "per", name: "Tube PER Ø16 (ml)" },
  { key: "pvc", name: "Tube PVC évacuation Ø110 (ml)" },
  { key: "evacuation", name: "Tube PVC évacuation Ø110 (ml)" },
  { key: "fosseseptique", name: "Fosse septique 3000 L" },
  { key: "pompe", name: "Pompe surpresseur 1.5 CV" },
  { key: "extincteur", name: "Extincteur 6 kg ABC" },
  { key: "camera", name: "Caméra de surveillance IP" },
  { key: "portecoupefeu", name: "Porte coupe-feu 1h (pièce)" },
];

const HINTS_BY_LENGTH = [...MODEL_PRICE_HINTS].sort(
  (a, b) => b.key.length - a.key.length,
);

/** Résout le prix unitaire d'un poste du modèle (catalogue 2026 ou prix en direct). */
function resolveModelPrice(
  itemName: string,
  livePrices?: LivePriceMap,
): { unitPrice: number; matched: boolean } {
  const n = normKey(itemName);
  for (const hint of HINTS_BY_LENGTH) {
    if (!n.includes(hint.key)) continue;
    const cat = CATALOG_BY_NAME.get(normKey(hint.name));
    if (!cat) continue;
    const live = livePrices?.get(normKey(cat.name));
    const price = live?.unitPrice ?? cat.unitPrice;
    return { unitPrice: price * (hint.factor ?? 1), matched: true };
  }
  return { unitPrice: 0, matched: false };
}

// ============================================================================
// GÉNÉRATION DU « QUANTITATIF DÉTAILLÉ » À PARTIR DU MODÈLE
// ============================================================================

type MacroKey = "gros_oeuvre" | "second_oeuvre" | "equipements" | "main_oeuvre" | "transport" | "etudes_imprevus";

/** Unité dont la quantité évolue avec la surface du projet. */
const SCALABLE_UNIT_RE = /^(m²|m3|m³|ml|m|kg|tonnes?|litres?|sacs?)$/i;

const qtyScaled = (qty: number, unit: string, scale: number): number => {
  if (SCALABLE_UNIT_RE.test(unit.trim())) {
    const v = qty * scale;
    return Math.round(v * 10) / 10;
  }
  return qty;
};

/** Répartit une section du modèle vers la macro-catégorie la plus proche. */
function sectionToMacro(name: string): MacroKey {
  const n = normKey(name);
  if (/(vrd|voierie|raccordement|reseaux?|benne|transport|accesvehicules)/.test(n)) return "transport";
  if (/(etude|permis|honoraires|fraispreliminaires|fraispreparatoires|autorisation|assurance|imprevus|fraisannexes|controle|nettoyage|diversetfinitions)/.test(n)) return "etudes_imprevus";
  if (/(secondœuvre|secondoeuvre|finition|revetement|peinture|menuiserie|cloison|plafond|enduit|faience|carrelage|gres|cuisine|gardecorps|amenagement|vitrerie|serrurerie|staff|barriere|rambarde|fournituresdepeinture)/.test(n)) return "second_oeuvre";
  if (/(terrassement|fondation|grosœuvre|grosoeuvre|superstructure|maconnerie|dalle|poteaux|poutres|escalier|toiture|couverture|etancheite|structure|charpente|voiles|radier|demolition|deblaiement)/.test(n)) return "gros_oeuvre";
  if (/(equipement|sanitaires?|climatisation|eclairage|filtration|electromenager|mobilier|securite|incendie|appareils?|chauffeeau|hydraulique|electricite|plomberie|accessoires|coque|canalisation|cablage|tableau|appareillage|robinetterie|productiondeau|machines?|vitrine|enseigne|alarme|cameras?)/.test(n)) return "equipements";
  return "second_oeuvre";
}

interface PricedItem {
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** Construit les lignes « Quantitatif détaillé » d'une section du modèle. */
function priceSection(section: ModelSection, scale: number, livePrices?: LivePriceMap): PricedItem[] {
  const budget = section.budget * scale;

  const raw = section.items.map((it) => {
    const quantity = Math.max(0.5, qtyScaled(it.qty, it.unit, scale));
    const { unitPrice, matched } = resolveModelPrice(it.name, livePrices);
    return { name: it.name, unit: it.unit, quantity, unitPrice, matched };
  });

  // Montant des postes tarifés via le catalogue / prix en direct.
  let matchedTotal = 0;
  let unmatchedQty = 0;
  const unmatchedIdx: number[] = [];
  raw.forEach((r, i) => {
    if (r.matched) matchedTotal += r.quantity * r.unitPrice;
    else {
      unmatchedIdx.push(i);
      unmatchedQty += r.quantity;
    }
  });

  // Si les prix catalogue dépassent le budget de la section, on les réduit
  // proportionnellement (le total de la section reste cohérent).
  if (matchedTotal > budget && matchedTotal > 0) {
    const mScale = budget / matchedTotal;
    raw.forEach((r) => {
      if (r.matched) r.unitPrice = r.unitPrice * mScale;
    });
    matchedTotal = budget;
  }

  // Répartition du solde de la section sur les postes sans équivalent catalogue.
  const remaining = Math.max(0, budget - matchedTotal);
  for (const i of unmatchedIdx) {
    const r = raw[i];
    const share = unmatchedQty > 0 ? r.quantity / unmatchedQty : 1 / Math.max(1, unmatchedIdx.length);
    r.unitPrice = r.quantity > 0 ? (remaining * share) / r.quantity : 0;
  }

  return raw.map((r) => ({
    name: r.name,
    unit: r.unit,
    quantity: r.quantity,
    unitPrice: Math.round(r.unitPrice * 100) / 100,
    totalPrice: Math.round(r.quantity * r.unitPrice),
  }));
}

export interface BreakdownEntry {
  category: string;
  label?: string;
  percentage?: number;
  estimatedCost?: number;
  items?: any[];
}

/**
 * Reconstruit les lignes du « Quantitatif détaillé » d'après le modèle du type
 * de projet (feuille « projecttype ») : quantités échelonnées à la surface du
 * projet, prix unitaires résolus via le catalogue 2026 / prix en direct, solde
 * de chaque section réparti sur les postes sans équivalent. Les totaux par
 * macro-catégorie restent ceux du moteur BIM (budget global inchangé) ; les
 * catégories sans postes dans le modèle (ex. main-d'œuvre) conservent les
 * lignes générées par le moteur.
 */
export function buildModelBreakdown(
  category: string,
  surface: number,
  rooms: { bedrooms?: number; bathrooms?: number; kitchens?: number; livingRooms?: number; garages?: number; wcs?: number; pools?: number },
  livePrices: LivePriceMap | undefined,
  breakdown: BreakdownEntry[],
): BreakdownEntry[] {
  const model = getQuantitatifModel(category);
  if (!model) return breakdown;
  const scale = Math.max(0.1, (surface || 0) / model.refSurface);

  const itemsByMacro: Record<string, PricedItem[]> = {
    gros_oeuvre: [],
    second_oeuvre: [],
    equipements: [],
    main_oeuvre: [],
    transport: [],
    etudes_imprevus: [],
  };

  for (const section of model.sections) {
    const macro = sectionToMacro(section.name);
    itemsByMacro[macro] = [...(itemsByMacro[macro] ?? []), ...priceSection(section, scale, livePrices)];
  }

  return breakdown.map((entry) => {
    const macro = entry.category as string;
    const modelItems = itemsByMacro[macro];
    // Pas de postes dans le modèle pour cette catégorie → lignes du moteur.
    if (!modelItems?.length) return entry;

    const itemTotal = modelItems.reduce((s, it) => s + it.totalPrice, 0);
    const budget = entry.estimatedCost ?? 0;
    const s = itemTotal > 0 && budget > 0 ? budget / itemTotal : 1;
    const items = modelItems.map((it) => ({
      ...it,
      totalPrice: Math.max(0, Math.round(it.totalPrice * s)),
    }));
    return { ...entry, items };
  });
}
