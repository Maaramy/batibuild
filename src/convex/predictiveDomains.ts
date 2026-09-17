// ============================================================================
// BIBLIOTHÈQUE DE DOMAINES DE CONSTRUCTION — Intelligence prédictive (Groupe B)
//
// Objectif : produire une analyse prédictive **spécifique au type de projet**
// sélectionné (plomberie, électricité, cuisine, salle de bain, piscine…),
// reliée aux données RÉELLES du projet (DQE, quantitatif détaillé, surfaces,
// coût estimé), sans jamais modifier le DQE ni les quantités existantes.
//
// Principe :
//   1. Chaque domaine décrit un corps d'état (réseaux, matériaux, travaux,
//      risques, dépendances, points souvent oubliés du DQE).
//   2. Le type de projet sélectionné détermine les domaines à analyser
//      (ex. « Plomberie complète » → plomberie ; « Rénovation cuisine » →
//      cuisine + plomberie + électricité).
//   3. Les mots-clés des domaines sont croisés avec les libellés réels du DQE
//      et du quantitatif : ce qui est couvert est marqué « dqe », ce qui
//      manque devient un besoin prévisible chiffré (prévision IA).
//
// Extension : ajouter un domaine dans `DOMAINS` et (si besoin) l'associer à un
// type dans `TYPE_DOMAINS` — aucun autre code à modifier.
//
// Ce module est pur (aucun import serveur Convex) : il est utilisé par le
// client (carte du module) et testable unitairement.
// ============================================================================

import type { DqeLine, DqeLot } from "./dqeEngine";
import { resolveProjectType } from "./projectTypes";

// ── Normalisation (comparaison tolérante aux accents / séparateurs) ─────────

/** Normalise un libellé : minuscules, sans accents, ponctuation → espace. */
export function normText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Types publics ───────────────────────────────────────────────────────────

export type RiskSeverity = "eleve" | "moyen" | "faible";
export type DependencyType = "avant" | "apres";
export type NeedSource = "dqe" | "ia";

export interface DomainFamily {
  label: string;
  keywords: string[];
}

export interface DomainMaterial {
  name: string;
  note?: string;
}

export interface DomainRisk {
  label: string;
  why: string;
  severity: RiskSeverity;
}

/** Point fréquemment oublié du DQE — devient un besoin + impact financier. */
export interface DomainMissingCheck {
  label: string;
  keywords: string[];
  /** Part du budget du domaine (en %) pour l'impact financier estimé. */
  impactPct: number;
  why: string;
}

export interface DomainDelayRisk {
  label: string;
  impactDays: number;
  why: string;
}

export interface PredictiveDomain {
  key: string;
  label: string;
  /** Mots-clés identifiant le domaine dans le DQE / quantitatif. */
  keywords: string[];
  /** Familles de réseaux / sous-ensembles à vérifier dans le projet. */
  families: DomainFamily[];
  materials: DomainMaterial[];
  risks: DomainRisk[];
  missingChecks: DomainMissingCheck[];
  delays: DomainDelayRisk[];
  dependencies: { before: string[]; after: string[] };
  recommendations: string[];
  /** Part du budget total (0-1) si le domaine n'apparaît pas dans le DQE. */
  budgetShare: number;
  /** Coût indicatif TND/m² si ni DQE ni coût total ne sont disponibles. */
  unitRatePerM2?: number;
}

export interface PredictiveNeed {
  label: string;
  why: string;
  source: NeedSource;
  covered: boolean;
}

export interface PredictiveRisk {
  label: string;
  why: string;
  severity: RiskSeverity;
}

export interface PredictedMaterial {
  name: string;
  note?: string;
  predicted: true;
}

export interface PredictiveFinancialImpact {
  label: string;
  impactTnd: number;
  why: string;
}

export interface PredictiveDelay {
  label: string;
  impactDays: number;
  why: string;
}

export interface PredictiveDependency {
  label: string;
  type: DependencyType;
}

export interface GroupBPrediction {
  domainKeys: string[];
  domainLabel: string;
  summary: string;
  needs: PredictiveNeed[];
  risks: PredictiveRisk[];
  materials: PredictedMaterial[];
  financial: PredictiveFinancialImpact[];
  totalPotentialImpactTnd: number;
  delays: PredictiveDelay[];
  dependencies: PredictiveDependency[];
  recommendations: string[];
  dataSource: {
    dqeLots: number;
    dqeLines: number;
    totalCost: number | null;
    matchedKeywords: string[];
    generatedAt: number;
  };
  disclaimer: string;
}

// ── Bibliothèque des domaines ───────────────────────────────────────────────

const PLOMBERIE: PredictiveDomain = {
  key: "plomberie",
  label: "Plomberie",
  keywords: ["plomberie", "sanitaire", "tubes per", "tubes ppr", "tubes cuivre", "tubes pvc", "evacuation", "chauffe-eau", "mitigeur", "collecteur", "siphon", "robinetterie"],
  families: [
    { label: "Alimentation eau froide", keywords: ["eau froide", "alimentation", "alimentation en eau"] },
    { label: "Alimentation eau chaude", keywords: ["eau chaude", "chauffe-eau", "chauffe eau", "chauffe-eau electrique"] },
    { label: "Distribution intérieure (conduites principales et secondaires)", keywords: ["tubes per", "tubes ppr", "tubes cuivre", "distribution", "colonne", "reseau"] },
    { label: "Raccordements, vannes et robinets d'arrêt", keywords: ["raccord", "vanne", "robinet d'arret", "robinet arret", "collecteur"] },
    { label: "Évacuation (eaux usées, vannes, ménagères)", keywords: ["evacuation", "tubes pvc", "chute", "regard", "siphon", "eaux usees"] },
    { label: "Raccordement au réseau existant", keywords: ["reseau existant", "raccordement", "tout-a-legout", "tout a l egout", "fosse", "regard"] },
  ],
  materials: [
    { name: "Tubes PPR / PER Ø16–Ø25 (alimentation)", note: "Prévoir +10 à 15 % sur les métrés" },
    { name: "Tubes PVC Ø40/Ø50 (évacuation appareils)" },
    { name: "Tubes PVC Ø100/Ø110 (chutes et collecteurs)" },
    { name: "Tubes cuivre Ø12/Ø14 (colonnes si nécessaire)" },
    { name: "Raccords, coudes et tés", note: "Souvent 15 à 25 % du budget tuyauterie" },
    { name: "Vannes et robinets d'arrêt" },
    { name: "Siphons et bouchons de visite" },
    { name: "Joints et étanchéité (téflon, filasse, colle PVC)" },
    { name: "Colliers et accessoires de fixation" },
    { name: "Isolation des conduites (manchons calorifuges)" },
    { name: "Chauffe-eau + groupe de sécurité" },
  ],
  risks: [
    { label: "Raccords sous-estimés", why: "Les raccords, coudes et tés représentent souvent 15 à 25 % du budget tuyauterie mais sont rarement détaillés poste par poste.", severity: "eleve" },
    { label: "Conflit avec les autres réseaux", why: "Les passages de gaines plomberie doivent être coordonnés avec l'électricité et les menuiseries avant scellement des saignées.", severity: "eleve" },
    { label: "Quantité de tuyauterie insuffisante", why: "Les métrés théoriques omettent passages horizontaux et retours : prévoir +10 à 15 %.", severity: "moyen" },
    { label: "Diamètre inadapté", why: "Un sous-dimensionnement des colonnes provoque perte de débit et bruit : vérifier les Ø selon le nombre d'appareils.", severity: "moyen" },
    { label: "Risque de fuite", why: "Les essais de pression sont indispensables avant fermeture des saignées et pose du carrelage.", severity: "moyen" },
    { label: "Difficultés d'accès", why: "Prévoir des bouches de visite pour les équipements encastrés.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Essais d'étanchéité / de pression", keywords: ["essai", "etancheite", "pression", "epreuve"], impactPct: 2, why: "Souvent absents du DQE alors qu'ils conditionnent la réception du réseau." },
    { label: "Isolation des conduites (eau chaude)", keywords: ["isolation", "manchon", "calorifuge", "isolant"], impactPct: 1.5, why: "Réduit les pertes thermiques et la condensation sur les conduites." },
    { label: "Vannes d'arrêt par appareil", keywords: ["vanne", "robinet d'arret", "robinet arret"], impactPct: 1, why: "Permet la maintenance sans coupure générale de l'alimentation." },
    { label: "Raccordement aux réseaux (regards / tout-à-l'égout)", keywords: ["regard", "tout-a-legout", "tout a l egout", "raccordement", "fosse"], impactPct: 2.5, why: "Raccordement final souvent budgété à part ou oublié." },
    { label: "Colliers, fixations et consommables", keywords: ["collier", "fixation", "cheville"], impactPct: 1, why: "Petites fournitures qui s'additionnent rapidement." },
  ],
  delays: [
    { label: "Approvisionnement chauffe-eau et appareils importés", impactDays: 7, why: "Délais variables selon la disponibilité des marques." },
    { label: "Attente des essais avant fermeture des murs", impactDays: 3, why: "Les saignées ne peuvent être fermées qu'après des essais concluants." },
    { label: "Coordination avec le lot carrelage", impactDays: 4, why: "Raccords et siphons doivent rester accessibles avant la pose du carrelage." },
  ],
  dependencies: {
    before: ["Réservations et saignées dans la maçonnerie", "Gros œuvre et cloisons (trémies, passages de gaines)", "Réseau d'évacuation principal"],
    after: ["Carrelage et revêtements muraux (fermeture des saignées)", "Pose des appareils sanitaires et robinetterie", "Peinture de finition"],
  },
  recommendations: [
    "Prévoir 10 à 15 % de marge sur les métrés de tubes (passages, retours, chutes).",
    "Photographier les réseaux avant fermeture des saignées pour la maintenance future.",
    "Grouper les fournitures sanitaires chez un seul fournisseur pour négocier 5 à 10 %.",
    "Assister aux essais de pression avant fermeture des murs.",
  ],
  budgetShare: 0.12,
  unitRatePerM2: 120,
};

const ELECTRICITE: PredictiveDomain = {
  key: "electricite",
  label: "Électricité",
  keywords: ["electricite", "electrique", "tableau", "disjoncteur", "cable", "gaines icta", "prise", "interrupteur", "eclairage", "terre", "differentiel", "parafoudre"],
  families: [
    { label: "Alimentation et tableau général", keywords: ["tableau", "disjoncteur de branchement", "tableau electrique"] },
    { label: "Circuits éclairage", keywords: ["eclairage", "points d'eclairage", "cable electrique 1.5"] },
    { label: "Circuits prises", keywords: ["prise", "cable electrique 2.5"] },
    { label: "Circuits spécialisés (cuisson, chauffe-eau, clim)", keywords: ["6 mm", "cuisson", "chauffe-eau", "climatiseur", "lave-linge", "specialise"] },
    { label: "Protections (différentiels, parafoudre)", keywords: ["differentiel", "parafoudre", "30ma"] },
    { label: "Mise à la terre", keywords: ["prise de terre", "terre", "liaison equipotentielle"] },
    { label: "Essais et conformité", keywords: ["essai", "mesure", "conformite"] },
  ],
  materials: [
    { name: "Câbles H07V-U 1,5 / 2,5 / 6 mm²" },
    { name: "Gaines ICTA et tubes IRL" },
    { name: "Tableau électrique + peignes", note: "Prévoir 20 % de modules libres" },
    { name: "Disjoncteurs divisionnaires et différentiels 30 mA" },
    { name: "Parafoudre type 2" },
    { name: "Boîtes de dérivation et d'encastrement" },
    { name: "Appareillage (interrupteurs, prises 2P+T)" },
    { name: "Luminaires et spots LED" },
    { name: "Piquet de terre + conducteur de terre" },
    { name: "Consommables (bornes, dominos, colliers)" },
  ],
  risks: [
    { label: "Circuits spécialisés oubliés", why: "Chauffe-eau, climatisation, four : chaque équipement exige un câble dédié en 6 mm².", severity: "eleve" },
    { label: "Protection différentielle incomplète", why: "Les circuits doivent être répartis sur des différentiels 30 mA conformes à la norme.", severity: "eleve" },
    { label: "Tableau sous-dimensionné", why: "Prévoir 20 % de modules libres pour les extensions futures (clim, borne…).", severity: "moyen" },
    { label: "Longueurs de câbles dépassées", why: "Au-delà des longueurs normalisées, la chute de tension impose des sections supérieures.", severity: "moyen" },
    { label: "Parallélisme avec la plomberie", why: "Respecter les distances câbles / conduites d'eau dans les mêmes gaines de passage.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Parafoudre", keywords: ["parafoudre"], impactPct: 0.8, why: "Protection contre la foudre recommandée dans la plupart des régions." },
    { label: "Prise de terre", keywords: ["prise de terre", "terre", "boucle"], impactPct: 1.2, why: "Obligatoire pour la sécurité des personnes." },
    { label: "Circuits climatisation dédiés", keywords: ["clim", "climatiseur"], impactPct: 1.5, why: "Les splits exigent un circuit dédié souvent oublié en première intention." },
    { label: "Rapport de conformité et mesures", keywords: ["conformite", "mesure", "essai"], impactPct: 0.8, why: "Le contrôle final conditionne le raccordement STEG." },
    { label: "Réserve de modules dans le tableau", keywords: ["reserve", "modules libres"], impactPct: 0.5, why: "20 % de modules libres pour les évolutions." },
  ],
  delays: [
    { label: "Coordination STEG (compteur / raccordement)", impactDays: 10, why: "Le dossier de raccordement conditionne la mise en service." },
    { label: "Approvisionnement tableau et disjoncteurs", impactDays: 5, why: "Références de marque parfois en rupture." },
    { label: "Attente de la fermeture des cloisons", impactDays: 3, why: "Le deuxième passage d'appareillage suit la peinture." },
  ],
  dependencies: {
    before: ["Saignées et réservations dans la maçonnerie", "Cloisons et plafonds (avant fermeture)"],
    after: ["Peinture (pose de l'appareillage en deuxième passage)", "Branchement des équipements (climatisation, chauffe-eau, cuisson)"],
  },
  recommendations: [
    "Respecter le nombre de prises par pièce selon la norme et prévoir 2 prises de plus par zone de travail.",
    "Étiqueter chaque circuit du tableau dès l'installation.",
    "Photographier le câblage avant fermeture des cloisons.",
    "Prévoir dès maintenant les circuits climatisation et borne de recharge.",
  ],
  budgetShare: 0.12,
  unitRatePerM2: 110,
};

const CLIMATISATION: PredictiveDomain = {
  key: "climatisation",
  label: "Climatisation",
  keywords: ["climatiseur", "climatisation", "split", "cvc", "condensat", "liaison frigorifique", "gaine"],
  families: [
    { label: "Unités intérieures et extérieures", keywords: ["climatiseur", "split", "unite"] },
    { label: "Liaisons frigorifiques (cuivre)", keywords: ["cuivre", "liaison frigorifique"] },
    { label: "Évacuation des condensats", keywords: ["condensat", "evacuation condensats", "pompe"] },
    { label: "Alimentation électrique dédiée", keywords: ["alimentation", "circuit", "disjoncteur"] },
    { label: "Supports et fixations", keywords: ["support", "fixation", "console"] },
  ],
  materials: [
    { name: "Unités split inverter" },
    { name: "Cuivre frigorifique isolé" },
    { name: "Manchons d'isolation des liaisons" },
    { name: "Tuyauterie PVC / pompe à condensats" },
    { name: "Supports muraux et consoles" },
    { name: "Disjoncteur dédié + câble 2,5 / 6 mm²" },
  ],
  risks: [
    { label: "Évacuation des condensats mal pentue", why: "Une pente insuffisante provoque débordements et infiltrations.", severity: "eleve" },
    { label: "Liaisons frigorifiques non mises sous vide", why: "Sans tirage au vide, le rendement chute et le compresseur s'use.", severity: "eleve" },
    { label: "Circuit électrique non dédié", why: "Provoque des disjonctions et annule la garantie installateur.", severity: "moyen" },
    { label: "Unité extérieure exposée", why: "Plein soleil ou bruit voisinage : choisir l'emplacement dès la conception.", severity: "moyen" },
    { label: "Esthétique des passages", why: "Repérer les trajets de gaines avant peinture.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Mise sous vide et contrôle d'étanchéité", keywords: ["vide", "etancheite", "essai"], impactPct: 1.2, why: "Indispensable à la garantie du circuit frigorifique." },
    { label: "Isolation des conduites frigorifiques", keywords: ["isolation", "manchon", "isolant"], impactPct: 1.5, why: "Évite la condensation et les pertes de rendement." },
    { label: "Pompe de relevage des condensats", keywords: ["pompe", "condensat"], impactPct: 1, why: "Nécessaire dès que l'évacuation gravitaire est impossible." },
  ],
  delays: [
    { label: "Approvisionnement des unités (saison haute)", impactDays: 10, why: "Les ruptures sont fréquentes en été." },
    { label: "Technicien frigoriste certifié", impactDays: 5, why: "La mise en service exige un professionnel habilité." },
  ],
  dependencies: {
    before: ["Raccordement électrique dédié", "Percements et réservations façade"],
    after: ["Peinture et finitions", "Essais et mise en service à la réception"],
  },
  recommendations: [
    "Privilégier des unités inverter adaptées au volume réel des pièces.",
    "Prévoir l'entretien annuel (filtres, pression) dans le budget.",
    "Installer l'unité extérieure à l'ombre et à distance des chambres.",
  ],
  budgetShare: 0.08,
  unitRatePerM2: 90,
};

const PEINTURE: PredictiveDomain = {
  key: "peinture",
  label: "Peinture",
  keywords: ["peinture", "enduit", "primaire", "sous-couche", "sous couche", "vernis", "finition"],
  families: [
    { label: "Préparation des supports", keywords: ["preparation", "rebouchage", "poncage", "support"] },
    { label: "Enduits", keywords: ["enduit", "lissage", "rebouchage"] },
    { label: "Primaire / sous-couche", keywords: ["primaire", "sous-couche", "sous couche", "impression"] },
    { label: "Peinture de finition (couches)", keywords: ["peinture", "couches", "finition"] },
    { label: "Protection et masquage", keywords: ["masquage", "protection", "bache"] },
  ],
  materials: [
    { name: "Enduit de rebouchage et de lissage" },
    { name: "Primaire d'accrochage / sous-couche" },
    { name: "Peinture murale mate ou satinée" },
    { name: "Peinture glycéro (boiseries et huisseries)" },
    { name: "Rouleaux, pinceaux, ruban de masquage" },
    { name: "Bâches de protection", },
    { name: "Abrasifs (grains 80 à 180)" },
  ],
  risks: [
    { label: "Support non préparé", why: "Fissures et porosités non traitées réapparaissent à travers la finition.", severity: "eleve" },
    { label: "Consommation sous-estimée", why: "Le rendement réel (8 à 10 m²/L par couche) dépend de la porosité du support.", severity: "moyen" },
    { label: "Couches insuffisantes", why: "Un seul passage sur support neuf laisse des repères et irrégularités.", severity: "moyen" },
    { label: "Poussière et protections", why: "Masquer sols et menuiseries évite les reprises coûteuses.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Primaire / sous-couche", keywords: ["primaire", "sous-couche", "sous couche", "impression"], impactPct: 3, why: "Obligatoire sur supports neufs : égalise et réduit la consommation." },
    { label: "Enduit de préparation", keywords: ["enduit", "rebouchage", "lissage"], impactPct: 2, why: "La qualité de finition dépend de la préparation du support." },
    { label: "Protection des sols", keywords: ["protection", "bache"], impactPct: 0.5, why: "Évite les taches de peinture sur revêtements neufs." },
  ],
  delays: [
    { label: "Séchage entre les couches", impactDays: 3, why: "Respecter les temps de séchage entre primaire et couches." },
    { label: "Humidité ambiante", impactDays: 2, why: "Une atmosphère humide allonge le séchage." },
  ],
  dependencies: {
    before: ["Finitions plâtre et enduits sèches", "Appareillage électrique posé ou démonté proprement"],
    after: ["Pose de l'appareillage électrique (deuxième passage)", "Pose des luminaires", "Nettoyage de fin de chantier"],
  },
  recommendations: [
    "Compter 8 à 10 m²/L par couche et ajuster selon la porosité du support.",
    "Appliquer systématiquement une sous-couche sur supports neufs.",
    "Peindre avant la pose des prises et interrupteurs.",
  ],
  budgetShare: 0.06,
  unitRatePerM2: 45,
};

const MACONNERIE: PredictiveDomain = {
  key: "maconnerie",
  label: "Maçonnerie",
  keywords: ["maconnerie", "brique", "parpaing", "ciment", "mortier", "chainage", "poteau", "linteau", "plancher", "dalle", "fondation", "enduit"],
  families: [
    { label: "Fondations et assises", keywords: ["fondation", "semelle", "radiers", "radier"] },
    { label: "Élévation des murs", keywords: ["brique", "parpaing", "elevation", "mur"] },
    { label: "Poteaux, chaînages et linteaux", keywords: ["poteau", "chainage", "linteau"] },
    { label: "Planchers et dalles", keywords: ["plancher", "dalle", "hourdis"] },
    { label: "Enduits", keywords: ["enduit", "crepi"] },
  ],
  materials: [
    { name: "Briques creuses / parpaings" },
    { name: "Ciment CPJ 42.5", note: "Protéger de l'humidité" },
    { name: "Sable et gravier concassé" },
    { name: "Acier à béton T10–T12", note: "Ferraillage contrôlé obligatoire" },
    { name: "Treillis soudé" },
    { name: "Hourdis et poutrelles" },
    { name: "Linteaux préfabriqués" },
    { name: "Étaiements et coffrage" },
  ],
  risks: [
    { label: "Ferraillage insuffisant", why: "Un ferraillage non conforme compromet la structure (séisme, surcharges).", severity: "eleve" },
    { label: "Cure du béton négligée", why: "Sans arrosage 7 jours, la résistance finale du béton chute.", severity: "eleve" },
    { label: "Qualité des granulats", why: "Sable salé ou argileux affaiblit le béton et provoque des désordres tardifs.", severity: "moyen" },
    { label: "Alignements et aplomb", why: "Les défauts de niveau se rattrapent coûteusement en enduits.", severity: "moyen" },
    { label: "Coffrage réutilisé usé", why: "Fuites de laitance et parements irréguliers.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Chaînages verticaux et poteaux", keywords: ["chainage", "poteau"], impactPct: 2, why: "Indispensables à la rigidité de l'ouvrage." },
    { label: "Linteaux au-dessus des baies", keywords: ["linteau"], impactPct: 1.5, why: "Souvent oubliés dans les métrés de maçonnerie." },
    { label: "Treillis soudé (dalles)", keywords: ["treillis"], impactPct: 1, why: "Limite la fissuration des dallages." },
    { label: "Cure du béton (arrosage)", keywords: ["cure", "arrosage"], impactPct: 0.5, why: "Humidification 7 jours pour atteindre la résistance nominale." },
  ],
  delays: [
    { label: "Prise et séchage du béton", impactDays: 7, why: "Délai avant décoffrage et reprise des élévations." },
    { label: "Approvisionnement acier et ciment", impactDays: 5, why: "Prix volatils, ruptures possibles." },
    { label: "Météo (pluie)", impactDays: 3, why: "Le coulage est impossible sous pluie soutenue." },
  ],
  dependencies: {
    before: ["Étude de sol et implantation", "Réseaux enterrés (canalisations sous dallage)"],
    after: ["Charpente et toiture", "Réseaux techniques (plomberie, électricité)", "Enduits et revêtements"],
  },
  recommendations: [
    "Ne jamais couler sans contrôle du ferraillage.",
    "Arroser le béton 7 jours après coulage (cure).",
    "Commander granulats et ciment par phase de travaux pour limiter les pertes.",
  ],
  budgetShare: 0.35,
};

const ETANCHEITE: PredictiveDomain = {
  key: "etancheite",
  label: "Étanchéité",
  keywords: ["etancheite", "membrane", "bitume", "bitumineuse", "goudron", "sel", "resine", "releve"],
  families: [
    { label: "Préparation du support", keywords: ["preparation", "support", "nettoyage", "reparation"] },
    { label: "Primaire d'accrochage", keywords: ["primaire"] },
    { label: "Membrane / système d'étanchéité", keywords: ["membrane", "bitume", "sel", "resine"] },
    { label: "Relevés et points singuliers", keywords: ["releve", "acrotère", "singularite", "angle"] },
    { label: "Évacuations", keywords: ["evacuation", "gargouille", "descente"] },
    { label: "Protection", keywords: ["protection", "gravillon", "autoprotege"] },
  ],
  materials: [
    { name: "Primaire bitumineux" },
    { name: "Membrane bitumineuse soudable / SEL" },
    { name: "Bandes et relevés de points singuliers" },
    { name: "Résine d'étanchéité (pièces humides)" },
    { name: "Profils et goujons de fixation" },
    { name: "Protection (gravillons, autoprotégé)" },
  ],
  risks: [
    { label: "Points singuliers (relevés, angles)", why: "Près de 80 % des infiltrations proviennent des relevés et points singuliers.", severity: "eleve" },
    { label: "Support humide au collage", why: "Le collage sur support humide décolle la membrane sous chaleur.", severity: "eleve" },
    { label: "Pente insuffisante", why: "La stagnation d'eau vieillit prématurément la membrane.", severity: "moyen" },
    { label: "Essais de bassinage absents", why: "Sans bassinage 48 h, les défauts ne sont détectés qu'après sinistre.", severity: "moyen" },
    { label: "UV sans protection", why: "Une membrane nue se fissure sous les UV.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Essai de bassinage", keywords: ["bassinage", "essai"], impactPct: 1, why: "Test d'étanchéité 48 h avant réception." },
    { label: "Relevés d'étanchéité", keywords: ["releve"], impactPct: 1.5, why: "Remontée de 15 cm minimum sur les rives et acrotères." },
    { label: "Protection anti-UV / gravillons", keywords: ["protection", "gravillon"], impactPct: 1, why: "Prolonge fortement la durée de vie du système." },
  ],
  delays: [
    { label: "Séchage du primaire", impactDays: 2, why: "Le soudage exige un support sec et amorcé." },
    { label: "Météo (pluie, vent)", impactDays: 4, why: "Le soudage de membrane est impossible par pluie ou vent fort." },
  ],
  dependencies: {
    before: ["Support sec, propre et réparé", "Formes / pente de la dalle"],
    after: ["Isolation thermique (sous membrane inversée)", "Poses en toiture (unités, passerelles)"],
  },
  recommendations: [
    "Traiter les relevés à 15 cm minimum.",
    "Exiger le bassinage 48 h avant réception.",
    "Prévoir la protection anti-UV dès la commande.",
  ],
  budgetShare: 0.05,
};

const TOITURE: PredictiveDomain = {
  key: "toiture",
  label: "Toiture",
  keywords: ["toiture", "charpente", "couverture", "tuile", "bac acier", "gouttiere", "ecran", "faumiere", "chevron"],
  families: [
    { label: "Structure / charpente", keywords: ["charpente", "chevron", "madrier", "structure"] },
    { label: "Couverture", keywords: ["tuile", "couverture", "bac acier"] },
    { label: "Isolation", keywords: ["isolation", "laine", "isolant"] },
    { label: "Étanchéité / écran sous-toiture", keywords: ["etancheite", "ecran", "membrane"] },
    { label: "Évacuation des eaux", keywords: ["gouttiere", "descente", "gargouille"] },
  ],
  materials: [
    { name: "Charpente bois ou métallique" },
    { name: "Tuiles / bac acier", note: "Commander +5 % pour la casse" },
    { name: "Liteaunage et contre-liteaunage" },
    { name: "Écran sous-toiture" },
    { name: "Isolant thermique" },
    { name: "Gouttières et descentes" },
    { name: "Faîtières et arêtiers" },
    { name: "Fixations et crochets" },
  ],
  risks: [
    { label: "Écran sous-toiture oublié", why: "Sans écran, la condensation dégrade l'isolant et la charpente.", severity: "eleve" },
    { label: "Surcharge vent / neige non vérifiée", why: "La zone et la pente imposent un calcul de charge.", severity: "moyen" },
    { label: "Évacuation sous-dimensionnée", why: "Des gouttières trop petites débordent et dégradent les façades.", severity: "moyen" },
    { label: "Tuiles de rechange", why: "Sans stock de réserve, les réparations futures manquent d'identiques.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Écran sous-toiture", keywords: ["ecran"], impactPct: 2, why: "Barrière contre la condensation et les infiltrations par vent contraire." },
    { label: "Gouttières et descentes", keywords: ["gouttiere", "descente"], impactPct: 1.5, why: "Évacuation des eaux souvent budgétée à part." },
    { label: "Isolation de la toiture", keywords: ["isolation", "laine"], impactPct: 3, why: "La toiture concentre la majorité des déperditions thermiques." },
    { label: "Stock de tuiles de rechange", keywords: ["rechange", "reparation"], impactPct: 0.5, why: "5 % de tuiles en réserve pour les réparations." },
  ],
  delays: [
    { label: "Approvisionnement des tuiles", impactDays: 7, why: "Références et couleurs parfois commandées sur mesure." },
    { label: "Météo", impactDays: 4, why: "La couverture exige un temps sec et peu venteux." },
    { label: "Disponibilité de l'équipe charpente", impactDays: 5, why: "Corps d'état très demandé en haute saison." },
  ],
  dependencies: {
    before: ["Maçonnerie et chaînages terminés"],
    after: ["Plafonds et isolation intérieure", "Raccordement des gouttières aux regards"],
  },
  recommendations: [
    "Commander 5 % de tuiles supplémentaires pour la casse et les réparations.",
    "Vérifier la pente minimale selon le type de couverture.",
    "Poser l'écran sous-toiture avant le liteaunage.",
  ],
  budgetShare: 0.18,
};

const CUISINE: PredictiveDomain = {
  key: "cuisine",
  label: "Cuisine",
  keywords: ["cuisine", "evier", "hotte", "meuble", "plan de travail", "caisson", "electromenager", "credence"],
  families: [
    { label: "Plomberie (alimentation et évacuation évier)", keywords: ["evier", "robinet", "alimentation", "evacuation"] },
    { label: "Électricité (prises dédiées, éclairage)", keywords: ["prise", "eclairage", "hotte", "dedie"] },
    { label: "Meubles et agencement", keywords: ["meuble", "caisson", "agencement"] },
    { label: "Plan de travail", keywords: ["plan de travail", "granit", "stratifie", "quartz"] },
    { label: "Électroménager", keywords: ["electromenager", "hotte", "four", "lave-vaisselle"] },
    { label: "Revêtements (faïence, crédence)", keywords: ["faience", "credence", "carrelage"] },
  ],
  materials: [
    { name: "Meubles hauts et bas" },
    { name: "Plan de travail" },
    { name: "Évier et mitigeur" },
    { name: "Faïence / crédence" },
    { name: "Hotte + gaine d'évacuation" },
    { name: "Prises dédiées (four, lave-vaisselle, plan de travail)" },
    { name: "Raccords plomberie (flexibles, siphon)" },
    { name: "Joints silicone", note: "Étanchéité plan de travail / crédence" },
    { name: "Électroménager" },
  ],
  risks: [
    { label: "Évacuation repositionnée mal pentue", why: "Une évacuation d'évier sans pente suffisante provoque bouchons et odeurs.", severity: "eleve" },
    { label: "Prises non dédiées / sections insuffisantes", why: "Four, lave-vaisselle et lave-linge exigent des circuits dédiés.", severity: "eleve" },
    { label: "Étanchéité du plan de travail", why: "Sans silicone soigné, l'eau s'infiltre dans les caissons.", severity: "moyen" },
    { label: "Mesures des meubles vs gaines", why: "Les réservations (gaines, plinthes) modifient les cotes d'implantation.", severity: "moyen" },
    { label: "Ventilation de la hotte", why: "Un recyclage mal prévu réduit l'efficacité et bruite la cuisine.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Prise et évacuation lave-vaisselle", keywords: ["lave-vaisselle", "lave vaisselle"], impactPct: 1.5, why: "Souvent oubliés dans les préparations électriques et plomberie." },
    { label: "Gaine de hotte", keywords: ["hotte", "gaine"], impactPct: 1, why: "Évacuation ou recyclage à définir avant pose des meubles hauts." },
    { label: "Joints silicone", keywords: ["silicone", "joint"], impactPct: 0.5, why: "Étanchéité des plans de travail et crédences." },
    { label: "Éclairage sous meubles hauts", keywords: ["led", "ruban", "reglette"], impactPct: 0.8, why: "Confort d'usage à câbler avant fermeture." },
  ],
  delays: [
    { label: "Fabrication du plan de travail", impactDays: 10, why: "Découpe sur mesures après pose des meubles bas." },
    { label: "Livraison des meubles importés", impactDays: 14, why: "Délais longs sur références importées." },
    { label: "Disponibilité plombier / électricien", impactDays: 4, why: "Les repositionnements de réseaux précèdent la pose." },
  ],
  dependencies: {
    before: ["Plomberie et électricité repositionnées", "Revêtements muraux (faïence) posés"],
    after: ["Pose des appareils électroménagers", "Joints silicone et nettoyage"],
  },
  recommendations: [
    "Commander le plan de travail après la pose des meubles bas (cotes exactes).",
    "Prévoir 2 prises supplémentaires par zone de travail.",
    "Fixer le tracé des réseaux avant commande des meubles.",
  ],
  budgetShare: 0.4,
};

const SALLE_DE_BAIN: PredictiveDomain = {
  key: "salle_de_bain",
  label: "Salle de bain",
  keywords: ["salle de bain", "salle de bains", "sanitaire", "douche", "baignoire", "receveur", "vasque", "wc", "vmc", "seche-serviette"],
  families: [
    { label: "Plomberie et évacuation", keywords: ["evacuation", "siphon", "alimentation", "tubes per"] },
    { label: "Équipements sanitaires", keywords: ["wc", "lavabo", "vasque", "douche", "baignoire", "receveur"] },
    { label: "Étanchéité", keywords: ["etancheite", "sel", "receveur"] },
    { label: "Carrelage et faïence", keywords: ["carrelage", "faience"] },
    { label: "Ventilation", keywords: ["vmc", "ventilation"] },
    { label: "Électricité", keywords: ["prise", "eclairage", "seche-serviette"] },
  ],
  materials: [
    { name: "WC complet" },
    { name: "Meuble-vasque et miroir" },
    { name: "Receveur + paroi ou baignoire" },
    { name: "Mitigeurs et robinetterie" },
    { name: "Carrelage sol et faïence murale" },
    { name: "Membrane d'étanchéité (SEL)", note: "Obligatoire sous carrelage de douche" },
    { name: "Tubes PER / PVC et raccords" },
    { name: "VMC" },
    { name: "Sèche-serviettes électrique" },
    { name: "Joints silicone" },
    { name: "Forme de pente et niche de douche" },
  ],
  risks: [
    { label: "Étanchéité de douche absente", why: "Sans SEL sous carrelage, les infiltrations dégradent la pièce adjacente.", severity: "eleve" },
    { label: "Évacuations repositionnées sans pente", why: "Pente minimale 1 à 2 cm/m vers le siphon, sinon bouchons récurrents.", severity: "eleve" },
    { label: "Ventilation insuffisante", why: "Sans VMC adaptée, condensation et moisissures apparaissent en quelques mois.", severity: "moyen" },
    { label: "Pente de douche à prévoir", why: "La forme de pente se pose avant carrelage : à intégrer dans l'épaisseur.", severity: "moyen" },
    { label: "Accès et dimensions", why: "Vérifier les cotes de passage (ouvrants, PMR) avant commande.", severity: "faible" },
  ],
  missingChecks: [
    { label: "SEL / étanchéité sous carrelage", keywords: ["sel", "etancheite"], impactPct: 2.5, why: "Membrane d'étanchéité liquide obligatoire sous douche." },
    { label: "VMC", keywords: ["vmc", "ventilation"], impactPct: 1.2, why: "Renouvellement d'air indispensable en pièce humide." },
    { label: "Forme de pente de la douche", keywords: ["pente", "forme de pente"], impactPct: 1, why: "À couler avant carrelage vers le siphon." },
    { label: "Niche et accessoires encastrés", keywords: ["niche"], impactPct: 0.5, why: "Réservations à faire avant la faïence." },
  ],
  delays: [
    { label: "Approvisionnement meuble / receveur importé", impactDays: 14, why: "Références importées souvent commandées sur mesure." },
    { label: "Séchage SEL et colles", impactDays: 4, why: "Le carrelage ne se pose que sur membrane sèche." },
    { label: "Disponibilité du carreleur", impactDays: 5, why: "Corps d'état très demandé." },
  ],
  dependencies: {
    before: ["Plomberie et évacuations repositionnées", "Électricité (sèche-serviettes, prises, éclairage)"],
    after: ["Pose des sanitaires et robinetterie", "Joints silicone", "Branchement de la VMC"],
  },
  recommendations: [
    "Appliquer une SEL obligatoire sous le carrelage de douche.",
    "Prévoir une trappe de visite pour le siphon.",
    "Dimensionner la pente à 2 cm/m vers le siphon.",
  ],
  budgetShare: 0.45,
};

const PISCINE: PredictiveDomain = {
  key: "piscine",
  label: "Piscine",
  keywords: ["piscine", "bassin", "skimmer", "refoulement", "filtration", "local technique", "liner", "margelle"],
  families: [
    { label: "Terrassement", keywords: ["terrassement", "fouille"] },
    { label: "Structure", keywords: ["structure", "beton", "coque", "paroi"] },
    { label: "Étanchéité", keywords: ["etancheite", "membrane", "liner"] },
    { label: "Filtration et local technique", keywords: ["filtration", "pompe", "filtre", "local technique"] },
    { label: "Plomberie du bassin", keywords: ["skimmer", "buse", "refoulement", "canalisation"] },
    { label: "Traitement de l'eau", keywords: ["traitement", "chlore", "desinfection", "electrolyse"] },
    { label: "Plages et margelles", keywords: ["margelle", "plage", "dallage"] },
  ],
  materials: [
    { name: "Liner / membrane ou armature béton" },
    { name: "Pompe de filtration et filtre", note: "Renouvellement complet du bassin en 4 à 6 h" },
    { name: "Skimmers et buses de refoulement" },
    { name: "Canalisations PVC pression" },
    { name: "Local technique" },
    { name: "Éclairage du bassin" },
    { name: "Margelles et plages" },
    { name: "Produits de traitement (chlore, sel)" },
    { name: "Sécurité (barrière, alarme)" },
  ],
  risks: [
    { label: "Canalisations enterrées mal testées", why: "Sans essais de pression avant remblai, les fuites sont très coûteuses à réparer.", severity: "eleve" },
    { label: "Étanchéité défaillante", why: "Une fuite structurelle impose des travaux lourds.", severity: "eleve" },
    { label: "Filtration sous-dimensionnée", why: "Le débit doit renouveler tout le bassin en 4 à 6 heures.", severity: "moyen" },
    { label: "Terrain / nappe phréatique", why: "Une nappe haute impose un drainage et des précautions de construction.", severity: "moyen" },
    { label: "Sécurité des enfants", why: "Barrière ou alarme obligatoire selon la réglementation.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Essais de pression des canalisations", keywords: ["essai", "pression"], impactPct: 1.5, why: "Test à 1,5 × la pression de service avant remblai." },
    { label: "Local technique ventilé", keywords: ["local technique", "ventilation"], impactPct: 1, why: "Ventilation et drainage du local prolongent la vie des équipements." },
    { label: "Sécurité enfant (barrière / alarme)", keywords: ["securite", "barriere", "alarme"], impactPct: 1.2, why: "Équipement de sécurité à budgétiser." },
    { label: "Dallage des plages et margelles", keywords: ["plage", "dallage", "margelle"], impactPct: 3, why: "Aménagements périphériques souvent oubliés du premier budget." },
  ],
  delays: [
    { label: "Cure et séchage de la structure", impactDays: 14, why: "Délai avant étanchéité et finitions." },
    { label: "Approvisionnement du liner", impactDays: 10, why: "Fabrication sur mesures du bassin." },
    { label: "Autorisations administratives", impactDays: 15, why: "Vérifier les autorisations locales avant terrassement." },
  ],
  dependencies: {
    before: ["Terrassement", "Alimentation électrique du local technique", "Évacuation des eaux de vidange"],
    after: ["Margelles et plages", "Aménagement paysager", "Mise en eau et équilibrage du traitement"],
  },
  recommendations: [
    "Tester les canalisations à 1,5 × la pression de service avant remblai.",
    "Installer le local technique à moins de 10 m du bassin.",
    "Vérifier les autorisations locales (implantation, sécurité) avant démarrage.",
  ],
  budgetShare: 0.5,
};

const RENOVATION: PredictiveDomain = {
  key: "renovation",
  label: "Rénovation",
  keywords: ["renovation", "demolition", "depose", "cloison", "platre", "revetement", "gravat"],
  families: [
    { label: "Démolition et évacuation des gravats", keywords: ["demolition", "depose", "gravat", "benne"] },
    { label: "Reprise des réseaux", keywords: ["plomberie", "electricite", "reseau"] },
    { label: "Maçonnerie et cloisons", keywords: ["maconnerie", "cloison", "platre"] },
    { label: "Revêtements", keywords: ["carrelage", "revetement", "parquet"] },
    { label: "Peinture et finitions", keywords: ["peinture", "finition"] },
    { label: "Menuiseries", keywords: ["porte", "fenetre", "menuiserie"] },
  ],
  materials: [
    { name: "Contenants / benne à gravats" },
    { name: "Cloisons et plaques de plâtre" },
    { name: "Carrelage et revêtements de sol" },
    { name: "Peintures et enduits" },
    { name: "Portes et fenêtres" },
    { name: "Fournitures plomberie et électricité de reprise" },
  ],
  risks: [
    { label: "Surprises derrière les murs", why: "Humidité, réseaux non répertoriés : le diagnostic initial conditionne le budget.", severity: "eleve" },
    { label: "Évacuation des gravats oubliée", why: "Coût et logistique de benne souvent absents du DQE.", severity: "eleve" },
    { label: "Coordination des corps d'état", why: "L'ordre plomberie → électricité → cloisons → finitions doit être planifié.", severity: "moyen" },
    { label: "Compatibilité anciens / nouveaux réseaux", why: "Raccorder des installations vétustes à du neuf exige des vérifications.", severity: "moyen" },
    { label: "Poussières et protection du mobilier", why: "Protections et confinement à prévoir sur site occupé.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Évacuation des gravats", keywords: ["gravat", "benne", "evacuation dechets"], impactPct: 2, why: "Location de benne et manutention rarement chiffrées." },
    { label: "Diagnostic des réseaux avant démolition", keywords: ["diagnostic"], impactPct: 0.8, why: "Repérage humidité / électricité / plomb avant démolition." },
    { label: "Raccordement des réseaux neufs à l'existant", keywords: ["raccordement", "existant"], impactPct: 1.5, why: "Mise en conformité des jonctions." },
    { label: "Protection des sols et parties communes", keywords: ["protection"], impactPct: 0.5, why: "Protections de chantier." },
  ],
  delays: [
    { label: "Découvertes imprévues en démolition", impactDays: 7, why: "Humidité ou vétusté cachée impose des reprises." },
    { label: "Coordination des corps d'état", impactDays: 5, why: "Séquencement et disponibilité des artisans." },
    { label: "Approvisionnement des revêtements", impactDays: 7, why: "Références spécifiques parfois en rupture." },
  ],
  dependencies: {
    before: ["Diagnostic technique (humidité, électricité, structure)", "Autorisation du syndic si copropriété"],
    after: ["Peinture et finitions", "Pose des menuiseries", "Nettoyage et réception"],
  },
  recommendations: [
    "Prévoir une provision de 10 à 15 % pour imprévus en rénovation.",
    "Démolir pièce par pièce et évacuer au fil de l'eau.",
    "Séquencer : démolition → réseaux → cloisons → revêtements → finitions.",
  ],
  budgetShare: 0.5,
};

const EXTENSION: PredictiveDomain = {
  key: "extension",
  label: "Extension",
  keywords: ["extension", "agrandissement", "surélévation", "surelevation"],
  families: [
    { label: "Fondations", keywords: ["fondation", "semelle"] },
    { label: "Structure", keywords: ["structure", "poteau", "chainage"] },
    { label: "Raccordement aux réseaux existants", keywords: ["raccordement", "existant", "reseau"] },
    { label: "Toiture", keywords: ["toiture", "charpente", "couverture"] },
    { label: "Isolation", keywords: ["isolation"] },
    { label: "Finitions", keywords: ["finition", "peinture", "revetement"] },
  ],
  materials: [
    { name: "Matériaux de gros œuvre (ciment, blocs, granulats)" },
    { name: "Acier et treillis soudé" },
    { name: "Charpente et couverture" },
    { name: "Isolants" },
    { name: "Menuiseries extérieures" },
    { name: "Fournitures de raccordement des réseaux" },
  ],
  risks: [
    { label: "Compatibilité avec la structure existante", why: "Des tassements différentiels fissurent la jonction ancien / neuf.", severity: "eleve" },
    { label: "Réseaux existants sous-dimensionnés", why: "Vérifier la capacité (eau, électricité, évacuation) avant raccordement.", severity: "eleve" },
    { label: "Étanchéité du raccord de toiture", why: "La noue entre ancien et nouveau toit est le point critique.", severity: "moyen" },
    { label: "Autorisations d'urbanisme", why: "L'extension est soumise à permis / autorisation selon la surface.", severity: "moyen" },
    { label: "Continuité esthétique", why: "Harmoniser matériaux et façades.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Étude de compatibilité structurelle", keywords: ["etude", "structure"], impactPct: 1.5, why: "Analyse des fondations existantes avant coulage." },
    { label: "Étanchéité du raccord de toiture", keywords: ["etancheite", "raccord", "noue"], impactPct: 2, why: "Point d'infiltration n°1 des extensions." },
    { label: "Raccordements des réseaux", keywords: ["raccordement"], impactPct: 2, why: "Jonctions eau / électricité / évacuation vers l'existant." },
    { label: "Autorisation de construire", keywords: ["permis", "autorisation"], impactPct: 0.5, why: "Frais et délais administratifs." },
  ],
  delays: [
    { label: "Instruction du permis / autorisation", impactDays: 15, why: "Durée variable selon la commune." },
    { label: "Cure des fondations", impactDays: 7, why: "Avant élévation de la structure." },
    { label: "Approvisionnement de la charpente", impactDays: 10, why: "Fabrication sur mesure." },
  ],
  dependencies: {
    before: ["Étude structurelle et autorisation", "Relevé précis des réseaux existants"],
    after: ["Toiture et étanchéité", "Isolation", "Finitions et peinture"],
  },
  recommendations: [
    "Vérifier la capacité des réseaux existants avant raccordement.",
    "Soigner l'étanchéité de la noue de toiture.",
    "Prévoir un joint de dilatation entre l'existant et le neuf.",
  ],
  budgetShare: 0.45,
};

const CONSTRUCTION_COMPLETE: PredictiveDomain = {
  key: "construction_complete",
  label: "Construction complète",
  keywords: ["construction", "gros oeuvre", "maison", "villa", "batiment"],
  families: [
    { label: "Gros œuvre", keywords: ["fondation", "brique", "parpaing", "plancher", "beton", "chainage"] },
    { label: "Toiture et étanchéité", keywords: ["toiture", "etancheite", "charpente", "membrane"] },
    { label: "Réseaux techniques", keywords: ["plomberie", "electricite", "evacuation", "steg", "sonede"] },
    { label: "Menuiseries", keywords: ["porte", "fenetre", "menuiserie"] },
    { label: "Revêtements et finitions", keywords: ["carrelage", "peinture", "enduit", "faience"] },
    { label: "Aménagements extérieurs", keywords: ["cloture", "pave", "gazon", "portail"] },
  ],
  materials: [
    { name: "Ciment, acier, briques / parpaings, granulats" },
    { name: "Charpente et couverture" },
    { name: "Fournitures plomberie et électricité" },
    { name: "Menuiseries intérieures et extérieures" },
    { name: "Carrelage, faïence et peintures" },
    { name: "Aménagements extérieurs (clôture, pavés, portail)" },
  ],
  risks: [
    { label: "Interdépendance des corps d'état", why: "Chaque corps d'état conditionne le suivant : le séquencement pilote le délai global.", severity: "eleve" },
    { label: "Hausse des prix entre devis et achat", why: "Ciment et acier sont volatils : négocier des prix fermes ou acheter tôt.", severity: "eleve" },
    { label: "Réserve d'imprévus absente", why: "Prévoir 10 % du budget pour les aléas de chantier.", severity: "moyen" },
    { label: "Coordination des artisans", why: "Chevauchements et attentes entre corps d'état allongent le chantier.", severity: "moyen" },
    { label: "Météo", why: "Coulages et couverture dépendent de la saison.", severity: "faible" },
  ],
  missingChecks: [
    { label: "Raccordements STEG / SONEDE", keywords: ["steg", "sonede", "raccordement", "compteur"], impactPct: 1.5, why: "Dossiers et frais de raccordement souvent budgétés à part." },
    { label: "Étanchéité (terrasse, toiture)", keywords: ["etancheite"], impactPct: 2, why: "Système d'étanchéité à prévoir dès le gros œuvre." },
    { label: "Isolation thermique", keywords: ["isolation"], impactPct: 2, why: "Confort et économies d'énergie à intégrer tôt." },
    { label: "Aménagements extérieurs", keywords: ["cloture", "pave", "portail", "gazon"], impactPct: 2, why: "Clôture, pavés et portail souvent oubliés du budget initial." },
    { label: "Provision imprévus", keywords: ["imprevus", "divers"], impactPct: 3, why: "10 % du budget recommandé pour les aléas." },
  ],
  delays: [
    { label: "Cure béton et planchers", impactDays: 14, why: "Les délais de séchage structurent le planning." },
    { label: "Coordination des corps d'état", impactDays: 10, why: "Planning partagé indispensable." },
    { label: "Approvisionnements importés (menuiseries, sanitaires)", impactDays: 10, why: "Délais longs sur importations." },
  ],
  dependencies: {
    before: ["Étude de sol", "Permis de construire", "Terrassement"],
    after: ["Aménagements extérieurs", "Réception et essais des installations"],
  },
  recommendations: [
    "Séquencer : gros œuvre → réseaux → fermeture → finitions.",
    "Commander les matériaux par phase pour limiter stockage et pertes.",
    "Prévoir 10 % d'imprévus et des prix fermes sur l'acier et le ciment.",
  ],
  budgetShare: 1.0,
};

/** Domaine de repli générique (aucun domaine spécifique ne correspond). */
const GENERIC: PredictiveDomain = {
  key: "generique",
  label: "Travaux du projet",
  keywords: [],
  families: [],
  materials: [],
  risks: [],
  missingChecks: [],
  delays: [],
  dependencies: { before: [], after: [] },
  recommendations: [],
  budgetShare: 1,
};

export const DOMAINS: Record<string, PredictiveDomain> = {
  plomberie: PLOMBERIE,
  electricite: ELECTRICITE,
  climatisation: CLIMATISATION,
  peinture: PEINTURE,
  maconnerie: MACONNERIE,
  etancheite: ETANCHEITE,
  toiture: TOITURE,
  cuisine: CUISINE,
  salle_de_bain: SALLE_DE_BAIN,
  piscine: PISCINE,
  renovation: RENOVATION,
  extension: EXTENSION,
  construction_complete: CONSTRUCTION_COMPLETE,
};

// ── Association type de projet → domaines (ordre = ordre d'analyse) ─────────

export const TYPE_DOMAINS: Record<string, string[]> = {
  // Travaux techniques (groupe B)
  plomberie_complete: ["plomberie"],
  electricite_complete: ["electricite"],
  // Équipements et finitions (groupe B)
  renovation_cuisine: ["cuisine", "plomberie", "electricite"],
  renovation_salle_de_bain: ["salle_de_bain", "plomberie", "electricite"],
  peinture_interieure: ["peinture"],
  piscine: ["piscine"],
  // Rénovation / extension (groupe B)
  renovation_complete: ["renovation", "plomberie", "electricite", "peinture"],
  extension_batiment: ["extension", "maconnerie", "plomberie", "electricite"],
  // Hébergement & restauration (groupe B)
  restaurant: ["renovation", "cuisine", "plomberie", "electricite"],
  cafe: ["renovation", "plomberie", "electricite"],
  // Projets immobiliers (groupe A) : ensemble des corps d'état et interdépendances
  maison: ["construction_complete"],
  villa: ["construction_complete"],
  appartement: ["construction_complete"],
  studio: ["construction_complete"],
  duplex: ["construction_complete"],
  immeuble: ["construction_complete"],
  local_commercial: ["construction_complete"],
  bureau: ["construction_complete"],
  entrepot: ["construction_complete"],
  residence_touristique: ["construction_complete"],
  projet_neuf: ["construction_complete"],
};

// ── Contexte d'analyse (données réelles du projet) ─────────────────────────

export interface PredictiveContext {
  projectType?: string | null;
  surface?: number | null;
  region?: string | null;
  totalCost?: number | null;
  /** Lots du DQE (project.dqe.lots) — lecture seule. */
  dqeLots?: DqeLot[] | null;
  /** Postes du quantitatif détaillé (costEstimate.breakdown[].items[]). */
  ceItems?: { name?: string; quantity?: number; unitPrice?: number; totalPrice?: number }[] | null;
}

interface DataLine {
  text: string; // libellé normalisé
  total: number;
  domainKeyHit: string; // "" si aucun
}

const countKeywordHits = (keywords: string[], bag: string): number =>
  keywords.reduce((n, k) => {
    const nk = normText(k);
    return nk.length >= 3 && bag.includes(nk) ? n + 1 : n;
  }, 0);

const keywordMatches = (keywords: string[], bag: string): boolean => {
  for (const k of keywords) {
    const nk = normText(k);
    if (nk.length >= 3 && bag.includes(nk)) return true;
  }
  return false;
};

const fmtTnd = (n: number) => n.toLocaleString("fr-TN", { maximumFractionDigits: 0 });

function collectLines(ctx: PredictiveContext): DataLine[] {
  const lines: DataLine[] = [];
  const push = (label: string | undefined, description: string | undefined, total: number | undefined) => {
    const text = normText(`${label ?? ""} ${description ?? ""}`);
    if (!text) return;
    lines.push({ text, total: Number.isFinite(total) ? (total as number) : 0, domainKeyHit: "" });
  };
  for (const lot of ctx.dqeLots ?? []) {
    for (const line of ((lot as any)?.lines ?? []) as DqeLine[]) {
      push(line?.designation, line?.description, line?.total);
    }
  }
  for (const it of ctx.ceItems ?? []) {
    if (!it?.name) continue;
    const total = it.totalPrice ?? (it.quantity && it.unitPrice ? it.quantity * it.unitPrice : 0);
    push(it.name, undefined, total);
  }
  return lines;
}

/** Somme des postes réels qui relèvent d'un domaine (mots-clés du domaine). */
function domainBudgetFromLines(lines: DataLine[], domain: PredictiveDomain): number {
  let sum = 0;
  for (const line of lines) {
    if (keywordMatches(domain.keywords, line.text)) sum += line.total || 0;
  }
  return sum;
}

function domainBudget(ctx: PredictiveContext, domain: PredictiveDomain, matchedFromLines: number): number {
  if (matchedFromLines > 0) return matchedFromLines;
  if (ctx.totalCost && ctx.totalCost > 0) return ctx.totalCost * domain.budgetShare;
  if (ctx.surface && ctx.surface > 0 && domain.unitRatePerM2) return ctx.surface * domain.unitRatePerM2;
  return 0;
}

function selectDomains(ctx: PredictiveContext, bag: string): string[] {
  const resolved = ctx.projectType ? resolveProjectType(String(ctx.projectType).trim()) : null;
  const mandated = (resolved && TYPE_DOMAINS[resolved]) || [];

  // Score de chaque domaine sur les données réelles du projet
  const scored = Object.values(DOMAINS)
    .map((d) => ({ key: d.key, score: countKeywordHits(d.keywords, bag) }))
    .filter((s) => s.key !== "generique")
    .sort((a, b) => b.score - a.score);

  const chosen = [...mandated];
  // Compléter avec les domaines fortement présents dans les données réelles
  for (const s of scored) {
    if (chosen.length >= 4) break;
    if (s.score >= 3 && !chosen.includes(s.key)) chosen.push(s.key);
  }

  // Type inconnu : domaines réellement présents dans les données (seuil plus
  // élevé pour ne jamais recommander un domaine sans rapport avec le projet).
  if (chosen.length === 0) {
    const top = scored.filter((s) => s.score >= 2).slice(0, 2).map((s) => s.key);
    return top;
  }
  return chosen;
}

const dedupe = <T,>(items: T[], key: (x: T) => string): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item).toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
};

// ── Analyse générique de repli (basée sur les postes réels) ────────────────

function buildGenericPrediction(ctx: PredictiveContext, lines: DataLine[], bag: string): GroupBPrediction {
  const g = GENERIC;
  const ceItems = (ctx.ceItems ?? []).filter((i) => i?.name);
  const topItems = [...ceItems]
    .sort((a, b) => (b.totalPrice ?? 0) - (a.totalPrice ?? 0))
    .slice(0, 5)
    .map((i) => ({
      name: String(i.name),
      predicted: true as const,
      note: "Poste principal identifié dans le quantitatif du projet",
    }));

  const topLabel = topItems[0]?.name ?? "vos travaux";
  const budget = ctx.totalCost && ctx.totalCost > 0 ? ctx.totalCost : 0;

  const hasEssais = keywordMatches(["essai", "controle", "reception", "conformite"], bag);
  const hasGravats = keywordMatches(["gravat", "benne", "evacuation"], bag);
  const hasMainOeuvre = keywordMatches(["main-d'oeuvre", "main d'oeuvre", "maindoeuvre"], bag);

  const needs: PredictiveNeed[] = [
    ...(hasEssais
      ? [{ label: "Essais et contrôles", why: "Identifiés dans le quantitatif du projet.", source: "dqe" as NeedSource, covered: true }]
      : [{ label: "Essais et contrôles de réception", why: "Non identifiés dans le DQE / le quantitatif : les essais conditionnent la réception.", source: "ia" as NeedSource, covered: false }]),
    ...(hasGravats
      ? [{ label: "Évacuation des déchets et gravats", why: "Identifiée dans le quantitatif du projet.", source: "dqe" as NeedSource, covered: true }]
      : [{ label: "Évacuation des déchets et gravats", why: "Non identifiée dans le DQE : logistique et coût de benne à prévoir.", source: "ia" as NeedSource, covered: false }]),
    ...(hasMainOeuvre
      ? []
      : [{ label: "Main-d'œuvre de finition", why: "Non identifiée dans le quantitatif : retouches et nettoyage de fin de chantier.", source: "ia" as NeedSource, covered: false }]),
  ];

  const volatility = budget > 0 ? budget * 0.05 : 0;
  const financial: PredictiveFinancialImpact[] = [
    ...(volatility > 0
      ? [{ label: `Variation des prix — ${topLabel}`, impactTnd: Math.round(volatility), why: "Volatilité estimée ±5 % sur le poste principal (prévision IA)." }]
      : []),
    ...(hasGravats
      ? []
      : [{ label: "Évacuation des gravats", impactTnd: Math.round(budget * 0.015), why: "Location de benne et manutention non identifiées (prévision IA)." }]),
  ];

  return {
    domainKeys: [],
    domainLabel: g.label,
    summary:
      `Analyse prédictive basée sur les ${lines.length} postes réels du projet : ` +
      `${needs.filter((n) => !n.covered).length} besoin(s) prévisible(s) et des risques génériques de coordination identifiés` +
      (financial.length ? `, impact financier potentiel ≈ ${fmtTnd(financial.reduce((s, f) => s + f.impactTnd, 0))} TND` : "") +
      ".",
    needs,
    risks: [
      { label: "Variation des prix des matériaux", why: `Le poste le plus important (${topLabel}) est exposé à la volatilité du marché tunisien.`, severity: "eleve" },
      { label: "Coordination des corps d'état", why: "L'ordre des travaux conditionne le délai global (réseaux avant fermeture, finitions en dernier).", severity: "moyen" },
      { label: "Marge d'imprévus", why: "Prévoir 5 à 10 % du budget pour les aléas de chantier.", severity: "moyen" },
    ],
    materials: topItems,
    financial,
    totalPotentialImpactTnd: financial.reduce((s, f) => s + f.impactTnd, 0),
    delays: [
      { label: "Approvisionnement des postes principaux", impactDays: 7, why: `Commande anticipée recommandée pour ${topLabel}.` },
      { label: "Coordination entre intervenants", impactDays: 5, why: "Chevauchements et attentes entre corps d'état." },
    ],
    dependencies: [
      { label: "Réservations et réseaux avant fermeture", type: "avant" },
      { label: "Finitions, réception et essais", type: "apres" },
    ],
    recommendations: [
      "Générer le DQE détaillé du projet pour affiner l'analyse prédictive.",
      "Commander les postes principaux en début de chantier.",
      "Prévoir une marge de 5 à 10 % pour les imprévus.",
    ],
    dataSource: {
      dqeLots: (ctx.dqeLots ?? []).length,
      dqeLines: lines.length,
      totalCost: budget > 0 ? budget : null,
      matchedKeywords: [],
      generatedAt: Date.now(),
    },
    disclaimer:
      "Prédictions IA indicatives et non contractuelles — le DQE et le quantitatif du projet restent la référence contractuelle.",
  };
}

// ── Moteur principal ────────────────────────────────────────────────────────

export function buildPredictiveAnalysis(ctx: PredictiveContext): GroupBPrediction {
  const lines = collectLines(ctx);
  const bag = lines.map((l) => l.text).join(" | ");
  const domainKeys = selectDomains(ctx, bag);

  if (domainKeys.length === 0) return buildGenericPrediction(ctx, lines, bag);

  const domains = domainKeys.map((k) => DOMAINS[k]).filter(Boolean);
  const matchedKeywords: string[] = [];
  const needs: PredictiveNeed[] = [];
  const risks: PredictiveRisk[] = [];
  const materials: PredictedMaterial[] = [];
  const financial: PredictiveFinancialImpact[] = [];
  const delays: PredictiveDelay[] = [];
  const dependencies: PredictiveDependency[] = [];
  const recommendations: string[] = [];

  for (const domain of domains) {
    // Mots-clés réellement trouvés dans les données du projet (traçabilité)
    for (const kw of domain.keywords) {
      const nk = normText(kw);
      if (nk.length >= 3 && bag.includes(nk) && !matchedKeywords.includes(kw)) matchedKeywords.push(kw);
    }

    // Budget du domaine : postes réels, sinon part estimée du coût total / m²
    const matchedTotal = domainBudgetFromLines(lines, domain);
    const budget = domainBudget(ctx, domain, matchedTotal);

    // 🔮 Besoins : familles de réseaux couvertes / non couvertes par le DQE
    for (const family of domain.families) {
      const covered = keywordMatches(family.keywords, bag);
      needs.push({
        label: family.label,
        why: covered
          ? `Présente dans le quantitatif du projet (domaine ${domain.label.toLowerCase()}).`
          : `Non identifiée dans le DQE / le quantitatif — vérifier la couverture du poste « ${family.label.toLowerCase()} » (${domain.label.toLowerCase()}).`,
        source: covered ? "dqe" : "ia",
        covered,
      });
    }

    // 🔮 Besoins : points fréquemment oubliés, détectés par croisement DQE
    for (const check of domain.missingChecks) {
      const found = keywordMatches(check.keywords, bag);
      if (!found) {
        needs.push({
          label: check.label,
          why: `${check.why} (domaine ${domain.label.toLowerCase()})`,
          source: "ia",
          covered: false,
        });
        if (budget > 0) {
          financial.push({
            label: check.label,
            impactTnd: Math.round((budget * check.impactPct) / 100),
            why: `Prévision IA : ≈ ${check.impactPct} % du budget ${domain.label.toLowerCase()} estimé${budget > 0 ? ` (${fmtTnd(Math.round(budget))} TND)` : ""}.`,
          });
        }
      }
    }

    // ⚠️ Risques spécifiques au domaine
    for (const r of domain.risks) {
      risks.push({ label: r.label, why: `${r.why} (${domain.label.toLowerCase()})`, severity: r.severity });
    }

    // 📦 Matériaux à prévoir (prédictions IA)
    for (const m of domain.materials) {
      materials.push({ name: m.name, note: m.note, predicted: true });
    }

    // 💰 Volatilité des prix sur le budget du domaine
    if (budget > 0) {
      financial.push({
        label: `Variation des prix — ${domain.label.toLowerCase()}`,
        impactTnd: Math.round(budget * 0.05),
        why: `Volatilité estimée ±5 % sur le budget ${domain.label.toLowerCase()}${matchedTotal > 0 ? " (calculé sur les postes réels du DQE)" : " (estimé par part de budget)"}.`,
      });
    }

    // ⏱️ Impact délai
    for (const d of domain.delays) {
      delays.push({ label: d.label, impactDays: d.impactDays, why: d.why });
    }

    // 🔗 Dépendances
    for (const b of domain.dependencies.before) dependencies.push({ label: b, type: "avant" });
    for (const a of domain.dependencies.after) dependencies.push({ label: a, type: "apres" });

    // 🧠 Recommandations
    for (const r of domain.recommendations) recommendations.push(r);
  }

  // Risques pilotés par les données réelles
  const natureTotals: Record<string, number> = {};
  for (const lot of ctx.dqeLots ?? []) {
    for (const line of ((lot as any)?.lines ?? []) as DqeLine[]) {
      if (line?.nature) natureTotals[line.nature] = (natureTotals[line.nature] ?? 0) + (line.total || 0);
    }
  }
  const sumTotals = Object.values(natureTotals).reduce((a, b) => a + b, 0);
  const moShare = sumTotals > 0 ? (natureTotals["main_oeuvre"] ?? 0) / sumTotals : null;
  if (moShare !== null && moShare < 0.12) {
    risks.push({
      label: "Main-d'œuvre possiblement sous-estimée",
      why: `La main-d'œuvre représente ${Math.round(moShare * 100)} % du DQE (référence : 15 à 30 % selon les corps d'état).`,
      severity: "moyen",
    });
  }
  if (lines.length === 0) {
    risks.push({
      label: "Analyse basée uniquement sur le type de projet",
      why: "Aucun DQE ni quantitatif disponible : générez l'estimation du projet pour des prédictions reliées à vos données réelles.",
      severity: "moyen",
    });
  }

  const needsList = dedupe(needs, (n) => n.label)
    .sort((a, b) => Number(a.covered) - Number(b.covered)) // non couverts d'abord
    .slice(0, 12);
  const financialList = dedupe(financial, (f) => f.label)
    .map((f) => ({ ...f, impactTnd: Math.max(0, f.impactTnd) }))
    .sort((a, b) => b.impactTnd - a.impactTnd)
    .slice(0, 6);
  const totalImpact = financialList.reduce((s, f) => s + f.impactTnd, 0);
  const domainLabel = domains.map((d) => d.label).join(" · ");

  const uncovered = needsList.filter((n) => !n.covered).length;
  const summary =
    `Analyse prédictive « ${domainLabel} » : ${uncovered} besoin(s) prévisible(s), ` +
    `${Math.min(risks.length, 8)} risque(s) et ${materials.length} élément(s) à prévoir, identifiés à partir des données réelles du projet` +
    (lines.length > 0 ? ` (${lines.length} postes analysés)` : "") +
    (totalImpact > 0 ? `, impact financier potentiel ≈ ${fmtTnd(totalImpact)} TND` : "") +
    ".";

  return {
    domainKeys,
    domainLabel,
    summary,
    needs: needsList,
    risks: dedupe(risks, (r) => r.label).slice(0, 8),
    materials: dedupe(materials, (m) => m.name).slice(0, 10),
    financial: financialList,
    totalPotentialImpactTnd: totalImpact,
    delays: dedupe(delays, (d) => d.label).slice(0, 5),
    dependencies: dedupe(dependencies, (d) => `${d.type}:${d.label}`).slice(0, 10),
    recommendations: dedupe(recommendations, (r) => r).slice(0, 5),
    dataSource: {
      dqeLots: (ctx.dqeLots ?? []).length,
      dqeLines: lines.length,
      totalCost: ctx.totalCost && ctx.totalCost > 0 ? ctx.totalCost : null,
      matchedKeywords: matchedKeywords.slice(0, 8),
      generatedAt: Date.now(),
    },
    disclaimer:
      "Prédictions IA indicatives et non contractuelles — le DQE et le quantitatif du projet restent la référence contractuelle.",
  };
}
