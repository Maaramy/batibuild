// ============================================================================
// Données du Guide Construction A-Z — séparées du moteur IA afin d'être
// mises à jour facilement (pays → région → ville → réglementation → prix →
// démarches administratives). Démarrage avec la Tunisie.
//
// ⚠️ Toutes les démarches sont indicatives : les exigences réelles doivent
// être vérifiées auprès des autorités compétentes.
// ============================================================================

// ─── Phase 01 — Analyse du terrain ───────────────────────────────────────────
export interface TerrainItem {
  id: string;
  label: string;
  detail: string;
  auto?: boolean; // renseigné automatiquement depuis le projet
}

export const TERRAIN_ITEMS: TerrainItem[] = [
  { id: "situation", label: "Situation et localisation", detail: "Gouvernorat, ville, quartier, accessibilité routière.", auto: true },
  { id: "surface", label: "Surface et dimensions", detail: "Dimensions et surface construite du projet.", auto: true },
  { id: "accessibilite", label: "Accessibilité", detail: "Voie d'accès, largeur de la rue, possibilité de passage des engins." },
  { id: "orientation", label: "Orientation", detail: "Exposition solaire et vents dominants (impact énergie et confort)." },
  { id: "topographie", label: "Topographie", detail: "Pente, dénivelés, remblais/déblais prévisibles." },
  { id: "sol", label: "Nature présumée du sol", detail: "À confirmer par une étude géotechnique (G1)." },
  { id: "reseaux", label: "Réseaux disponibles", detail: "Eau (SONEDE), électricité (STEG), assainissement, fibre." },
  { id: "urbanisme", label: "Contraintes urbanistiques", detail: "Coefficient d'occupation du sol, alignement, servitudes, hauteur max." },
  { id: "risques", label: "Risques et points à vérifier", detail: "Inondation, nappe phréatique, talus, servitudes, titre de propriété." },
];

// ─── Phase 02 — Études et faisabilité ───────────────────────────────────────
export interface FeasibilityItem {
  id: string;
  label: string;
  detail: string;
  auto?: boolean;
}

export const FEASIBILITY_ITEMS: FeasibilityItem[] = [
  { id: "faisabilite", label: "Analyse de faisabilité", detail: "Vérification de la cohérence du projet avec le terrain et le budget.", auto: true },
  { id: "surface_constructible", label: "Surface constructible", detail: "Déduite du COS / gabarit local et de la surface du terrain.", auto: true },
  { id: "budget_preliminaire", label: "Estimation préliminaire du budget", detail: "Fourchette basse / moyenne / haute selon les scénarios du devis.", auto: true },
  { id: "contraintes", label: "Analyse des contraintes", detail: "Urbanisme, servitudes, sol, accès, délais administratifs." },
  { id: "etudes_necessaires", label: "Identification des études nécessaires", detail: "Géotechnique, structure, fluides, thermique (voir Phase 03)." },
  { id: "planning", label: "Planning prévisionnel", detail: "Calendrier global : études → permis → travaux → réception.", auto: true },
];

// ─── Phase 03 — Études techniques ────────────────────────────────────────────
export interface StudyItem {
  id: string;
  label: string;
  detail: string;
  requirement: "obligatoire" | "recommandée" | "selon projet";
}

export const TECHNICAL_STUDIES: StudyItem[] = [
  { id: "geotechnique", label: "Étude géotechnique", detail: "Nature du sol, portance, niveau de la nappe — obligatoire avant fondations.", requirement: "obligatoire" },
  { id: "structurelle", label: "Étude structurelle", detail: "Dimensionnement de la structure par un ingénieur structure.", requirement: "obligatoire" },
  { id: "fondations", label: "Fondations", detail: "Type de fondations selon la géotechnique (semelles, radier, pieux…).", requirement: "obligatoire" },
  { id: "structure_porteuse", label: "Structure porteuse", detail: "Poteaux, poutres, voiles — plans de coffrage et de ferraillage.", requirement: "obligatoire" },
  { id: "beton_arme", label: "Béton armé", detail: "Plans de béton armé et notes de calcul.", requirement: "obligatoire" },
  { id: "electricite", label: "Électricité", detail: "Schéma unifilaire, puissance, tableau, mise à la terre.", requirement: "obligatoire" },
  { id: "plomberie", label: "Plomberie", detail: "Alimentation eau froide/chaude, diamètres, pression.", requirement: "obligatoire" },
  { id: "assainissement", label: "Assainissement", detail: "Réseau d'évacuation, fosse septique ou raccordement au réseau public.", requirement: "obligatoire" },
  { id: "climatisation", label: "Climatisation", detail: "Charges thermiques, dimensionnement des unités.", requirement: "selon projet" },
  { id: "ventilation", label: "Ventilation", detail: "Ventilation naturelle et/ou mécanique selon les pièces.", requirement: "recommandée" },
  { id: "isolation", label: "Isolation thermique et acoustique", detail: "Murs, toiture, vitrage — adaptée au climat tunisien.", requirement: "recommandée" },
  { id: "incendie", label: "Sécurité incendie", detail: "Selon le type de projet (ERP, logement, local commercial…).", requirement: "selon projet" },
];

// ─── Phase 04 — Démarches administratives (Tunisie) ─────────────────────────
export interface AdminStep {
  id: string;
  order: number;
  title: string;
  organisme: string;
  documents: string[];
  delai: string;
  frais: number; // TND, indicatif
  note?: string;
}

export const TUNISIA_ADMIN_STEPS: AdminStep[] = [
  {
    id: "titre",
    order: 1,
    title: "Vérification du titre de propriété",
    organisme: "Conservation de la propriété foncière",
    documents: ["Titre foncier / certificat de propriété", "Carte d'identité nationale"],
    delai: "1 à 2 semaines",
    frais: 40,
    note: "Vérifier la situation hypothécaire et les servitudes avant tout engagement.",
  },
  {
    id: "bornage",
    order: 2,
    title: "Bornage et étude géométrique",
    organisme: "Géomètre expert agréé",
    documents: ["Titre foncier", "Plan de situation"],
    delai: "1 à 2 semaines",
    frais: 400,
    note: "Obligatoire pour délimiter précisément le terrain.",
  },
  {
    id: "certificat_urbanisme",
    order: 3,
    title: "Certificat d'urbanisme / attestation de situation juridique",
    organisme: "Municipalité",
    documents: ["Titre foncier", "Plan de situation", "CIN"],
    delai: "1 à 4 semaines",
    frais: 80,
    note: "Renseigne sur les règles d'urbanisme applicables au terrain.",
  },
  {
    id: "geotechnique",
    order: 4,
    title: "Étude géotechnique (G1/G2)",
    organisme: "Laboratoire / bureau d'études géotechnique",
    documents: ["Plan de situation", "Accès au terrain"],
    delai: "2 à 3 semaines",
    frais: 1200,
    note: "Préalable au dimensionnement des fondations.",
  },
  {
    id: "plans_architecte",
    order: 5,
    title: "Plans architecturaux et dossier technique",
    organisme: "Architecte agréé",
    documents: ["Plans d'architecture", "Plans techniques", "Notice descriptive"],
    delai: "2 à 6 semaines",
    frais: 5000,
    note: "Honoraires d'architecte : 3 à 7 % du coût estimé selon la mission.",
  },
  {
    id: "permis",
    order: 6,
    title: "Dépôt du permis de construire",
    organisme: "Municipalité (ou gouvernorat selon la commune)",
    documents: ["Dossier complet d'architecte", "Titre foncier", "Certificat d'urbanisme", "Quittances de taxes"],
    delai: "30 à 60 jours réglementaires",
    frais: 150,
    note: "Le délai peut être prolongé si demande de pièces complémentaires.",
  },
  {
    id: "zones_agricoles",
    order: 7,
    title: "Autorisation en zone agricole (si applicable)",
    organisme: "Commissariat Régional au Développement Agricole (CRDA)",
    documents: ["Dossier de permis", "Titre foncier", "Avis de la commission"],
    delai: "Variable (1 à 3 mois)",
    frais: 100,
    note: "Uniquement si le terrain est classé en zone agricole.",
  },
  {
    id: "impact",
    order: 8,
    title: "Étude d'impact environnemental (si seuils dépassés)",
    organisme: "Agence Nationale de Protection de l'Environnement (ANPE)",
    documents: ["Étude d'impact", "Dossier du projet"],
    delai: "1 à 3 mois",
    frais: 2000,
    note: "Selon la nature et la taille du projet.",
  },
  {
    id: "ouverture_chantier",
    order: 9,
    title: "Déclaration d'ouverture de chantier",
    organisme: "Municipalité",
    documents: ["Permis de construire", "Formulaire de déclaration"],
    delai: "Avant le début des travaux",
    frais: 30,
    note: "À déposer avant l'installation du chantier.",
  },
  {
    id: "sonede",
    order: 10,
    title: "Branchement eau potable",
    organisme: "SONEDE",
    documents: ["Permis de construire", "CIN", "Titre foncier", "Plan de situation"],
    delai: "2 à 6 semaines",
    frais: 300,
    note: "Demande de raccordement provisoire puis définitif.",
  },
  {
    id: "steg",
    order: 11,
    title: "Branchement électricité",
    organisme: "STEG",
    documents: ["Permis de construire", "CIN", "Titre foncier", "Attestation d'architecte"],
    delai: "2 à 6 semaines",
    frais: 400,
    note: "Chantier : compteur provisoire ; fin de chantier : compteur définitif.",
  },
  {
    id: "assurance",
    order: 12,
    title: "Assurance chantier (décennale + tous risques)",
    organisme: "Compagnie d'assurance",
    documents: ["Contrat d'entreprise", "Dossier technique"],
    delai: "1 à 2 semaines",
    frais: 3000,
    note: "Environ 0,5 à 1 % du coût total du projet.",
  },
  {
    id: "achevement",
    order: 13,
    title: "Déclaration d'achèvement des travaux",
    organisme: "Municipalité",
    documents: ["Permis de construire", "Déclaration d'achèvement", "Attestation de conformité"],
    delai: "15 à 30 jours",
    frais: 50,
    note: "Obligatoire pour la conformité et le raccordement définitif.",
  },
  {
    id: "conformite",
    order: 14,
    title: "Visite de conformité et levée des réserves",
    organisme: "Municipalité — services techniques",
    documents: ["Déclaration d'achèvement", "Plans conformes à l'exécuté"],
    delai: "2 à 4 semaines",
    frais: 50,
    note: "Les réserves éventuelles doivent être levées avant l'accord final.",
  },
  {
    id: "reseaux_definitifs",
    order: 15,
    title: "Raccordements définitifs eau / électricité",
    organisme: "SONEDE / STEG",
    documents: ["Attestation de conformité", "Contrats provisoires"],
    delai: "2 à 6 semaines",
    frais: 500,
    note: "Dernière étape avant l'occupation du bâtiment.",
  },
];

// ─── Phase 08 — Étapes de construction (ordre logique) ──────────────────────
export interface ConstructionStepTemplate {
  id: string;
  order: number;
  title: string;
  objectif: string;
  travaux: string[];
  materiaux: string[];
  mainOeuvre: string[];
  outillage: string[];
  controles: string[];
  risques: string[];
  conditions: string[];
  weight: number; // part de la durée totale (somme ≈ 1)
}

export const CONSTRUCTION_STEPS: ConstructionStepTemplate[] = [
  {
    id: "installation",
    order: 1,
    title: "Installation du chantier",
    objectif: "Préparer et sécuriser le terrain avant le démarrage des travaux.",
    travaux: ["Clôture et signalisation du chantier", "Installation de la base vie (sanitaires, abri)", "Branchements provisoires eau et électricité", "Repérage des limites et implantation"],
    materiaux: ["Grillage / tôle", "Panneaux de signalisation"],
    mainOeuvre: ["Chef de chantier", "Manœuvres"],
    outillage: ["Niveau laser", "Théodolite", "Cordeaux et piquets"],
    controles: ["Implantation conforme au plan", "Accès sécurisé", "Réseaux provisoires en règle"],
    risques: ["Vol de matériel", "Accès non autorisé", "Conflit de voisinage"],
    conditions: ["Permis de construire obtenu", "Déclaration d'ouverture déposée", "Assurance chantier souscrite"],
    weight: 0.04,
  },
  {
    id: "terrassement",
    order: 2,
    title: "Terrassement",
    objectif: "Préparer le sol pour recevoir les fondations.",
    travaux: ["Décapage de la terre végétale", "Déblais / remblais", "Nivellement et compactage", "Excavation des fouilles"],
    materiaux: ["Terre compactée", "Géotextile (si besoin)"],
    mainOeuvre: ["Conducteur d'engins", "Terrassier", "Manœuvres"],
    outillage: ["Pelle mécanique", "Compacteur", "Camion benne"],
    controles: ["Cotes d'excavation", "Compacité du sol", "Évacuation des terres excédentaires"],
    risques: ["Éboulement des fouilles", "Nappe phréatique", "Dommages aux terrains voisins"],
    conditions: ["Étude géotechnique disponible", "Implantation validée"],
    weight: 0.05,
  },
  {
    id: "fondations",
    order: 3,
    title: "Fondations",
    objectif: "Assurer la portance de la structure sur le sol.",
    travaux: ["Coulage du béton de propreté", "Ferraillage des semelles", "Coffrage des fondations", "Coulage du béton de fondation"],
    materiaux: ["Béton dosé à 350 kg/m³", "Acier (fer à béton)", "Coffrage bois ou métal"],
    mainOeuvre: ["Maçon", "Ferrailleur", "Coffreur"],
    outillage: ["Bétonnière / toupie", "Vibrateur à béton", "Pince à ferrailler"],
    controles: ["Ferraillage conforme aux plans", "Enrobage de l'acier", "Résistance du béton (éprouvettes)"],
    risques: ["Tassements différentiels", "Mauvais enrobage", "Sols hétérogènes"],
    conditions: ["Étude géotechnique réalisée", "Plans de béton armé approuvés"],
    weight: 0.08,
  },
  {
    id: "infrastructure",
    order: 4,
    title: "Infrastructure",
    objectif: "Réaliser la partie enterrée du bâtiment (sous-sol, réseau).",
    travaux: ["Réseaux enterrés (EU, EP, eau)", "Dalle ou plancher bas", "Enduit d'imperméabilisation des murs enterrés"],
    materiaux: ["Béton", "Acier", "Tuyaux PVC / PEHD", "Enduit d'étanchéité"],
    mainOeuvre: ["Maçon", "Plombier", "Électricien (tranchées)"],
    outillage: ["Niveau à bulle", "Outillage maçonnerie"],
    controles: ["Pentes des réseaux", "Étanchéité des murs enterrés", "Réservation des passages"],
    risques: ["Infiltrations", "Réseaux mal positionnés", "Mise hors d'eau tardive"],
    conditions: ["Fondations terminées et contrôlées"],
    weight: 0.07,
  },
  {
    id: "elevation",
    order: 5,
    title: "Élévation",
    objectif: "Élever les murs porteurs et les voiles du bâtiment.",
    travaux: ["Maçonnerie des murs porteurs", "Poteaux et voiles en béton armé", "Chaînages horizontaux et verticaux"],
    materiaux: ["Parpaings / briques", "Béton", "Acier", "Mortier"],
    mainOeuvre: ["Maçon", "Ferrailleur", "Coffreur", "Manœuvres"],
    outillage: ["Niveau laser", "Fil à plomb", "Échafaudages"],
    controles: ["Verticalité des murs", "Épaisseur des joints", "Position des réservations"],
    risques: ["Défaut d'aplomb", "Chaînages manquants", "Reprise de béton fragile"],
    conditions: ["Plans d'élévation approuvés", "Réception de l'infrastructure"],
    weight: 0.12,
  },
  {
    id: "dalles",
    order: 6,
    title: "Dalles et planchers",
    objectif: "Réaliser les planchers intermédiaires et la dalle de toiture.",
    travaux: ["Coffrage des dalles", "Ferraillage des planchers", "Coulage des dalles", "Décoffrage après prise"],
    materiaux: ["Béton", "Acier", "Poutrelles / hourdis", "Coffrage"],
    mainOeuvre: ["Coffreur", "Ferrailleur", "Maçon"],
    outillage: ["Étais", "Bancs de coffrage", "Vibrateur"],
    controles: ["Niveau de la dalle", "Épaisseur et enrobage", "Prise du béton (28 jours)"],
    risques: ["Affaissement du coffrage", "Fissuration de retrait", "Reprises mal soignées"],
    conditions: ["Élévation terminée au niveau considéré"],
    weight: 0.1,
  },
  {
    id: "charpente_toiture",
    order: 7,
    title: "Charpente / toiture",
    objectif: "Mettre le bâtiment hors d'eau.",
    travaux: ["Pose de la charpente", "Couverture (tuiles, tôle bac…)", "Zinguerie et gouttières"],
    materiaux: ["Bois / acier", "Tuiles ou tôle", "Étanchéité", "Zinguerie"],
    mainOeuvre: ["Charpentier", "Couvreur", "Zingueur"],
    outillage: ["Échafaudages", "Outillage de couverture"],
    controles: ["Pentes de couverture", "Fixations des tuiles", "Évacuation des eaux pluviales"],
    risques: ["Infiltration", "Arrachement au vent", "Chutes de hauteur"],
    conditions: ["Dalle de toiture réceptionnée"],
    weight: 0.07,
  },
  {
    id: "etancheite",
    order: 8,
    title: "Étanchéité",
    objectif: "Protéger toitures, terrasses et parties humides des infiltrations.",
    travaux: ["Étanchéité des terrasses", "Protection des acrotères", "Traitement des points singuliers"],
    materiaux: ["Membrane bitumineuse / liquide", "Géotextile", "Protection gravillonnée"],
    mainOeuvre: ["Étancheur"],
    outillage: ["Chalumeau (si bitumineux)", "Rouleaux"],
    controles: ["Tests d'étanchéité", "Recouvrements", "Pentes d'écoulement"],
    risques: ["Percement de la membrane", "Ponts thermiques", "Reprises mal exécutées"],
    conditions: ["Toiture terminée et propre"],
    weight: 0.04,
  },
  {
    id: "cloisons",
    order: 9,
    title: "Cloisons",
    objectif: "Diviser les espaces intérieurs selon les plans.",
    travaux: ["Pose des cloisons intérieures", "Gaines techniques", "Saignées pour les réseaux"],
    materiaux: ["Briques creuses / placo", "Mortier ou colle", "Laine (isolation)"],
    mainOeuvre: ["Maçon", "Plâtrier"],
    outillage: ["Niveau", "Outillage de pose"],
    controles: ["Aplomb et alignement", "Réservations des portes", "Saignées propres"],
    risques: ["Fissures", "Cloisons non alignées", "Réseaux oubliés avant fermeture"],
    conditions: ["Dalles réceptionnées", "Réseaux de gros œuvre en place"],
    weight: 0.09,
  },
  {
    id: "enduits",
    order: 10,
    title: "Enduits",
    objectif: "Préparer les murs intérieurs et extérieurs avant les finitions.",
    travaux: ["Enduit extérieur (corps + finition)", "Enduit intérieur des murs", "Ragréage des plafonds"],
    materiaux: ["Mortier d'enduit", "Grille d'armature", "Ragréage"],
    mainOeuvre: ["Maçon / façadier", "Plâtrier"],
    outillage: ["Taloche", "Règle", "Échafaudage"],
    controles: ["Plans et aplombs", "Épaisseur régulière", "Séchage complet"],
    risques: ["Fissuration", "Décollement", "Mauvais temps (extérieur)"],
    conditions: ["Toiture et étanchéité terminées"],
    weight: 0.07,
  },
  {
    id: "menuiseries",
    order: 11,
    title: "Menuiseries extérieures et intérieures",
    objectif: "Poser portes, fenêtres et fermetures.",
    travaux: ["Pose des fenêtres et portes extérieures", "Pose des portes intérieures", "Dressings et placards"],
    materiaux: ["Aluminium / PVC / bois", "Verre", "Quincaillerie", "Joint silicone"],
    mainOeuvre: ["Menuisier aluminium / bois", "Vitrier"],
    outillage: ["Niveau laser", "Perceuse", "Pistolet à mousse"],
    controles: ["Étanchéité à l'air et à l'eau", "Aplomb des ouvrants", "Fermeture correcte"],
    risques: ["Méprises de cotes", "Étanchéité défaillante", "Délais de fabrication longs"],
    conditions: ["Enduits terminés", "Cotes des baies vérifiées"],
    weight: 0.06,
  },
  {
    id: "electricite",
    order: 12,
    title: "Électricité",
    objectif: "Poser les circuits électriques et les équipements.",
    travaux: ["Tirage des circuits", "Pose des boîtes d'encastrement", "Tableau électrique et disjoncteurs", "Mise à la terre"],
    materiaux: ["Câbles", "Gaines ICTA", "Disjoncteurs", "Boîtes et appareillages"],
    mainOeuvre: ["Électricien"],
    outillage: ["Testeur", "Perceuse", "Pince à dénuder"],
    controles: ["Conformité aux normes (NT)", "Test de continuité", "Tableau équilibré"],
    risques: ["Surcharge", "Circuits mal protégés", "Oubli de prises avant finitions"],
    conditions: ["Cloisons et enduits prêts", "Plans électriques approuvés"],
    weight: 0.07,
  },
  {
    id: "plomberie",
    order: 13,
    title: "Plomberie et sanitaires",
    objectif: "Poser les réseaux d'eau et d'évacuation et les appareils sanitaires.",
    travaux: ["Réseaux eau froide et chaude", "Évacuations EU/EP", "Pose des sanitaires", "Test d'étanchéité"],
    materiaux: ["Tubes PER / PVC / cuivre", "Robinetterie", "Sanitaires", "Joint d'étanchéité"],
    mainOeuvre: ["Plombier"],
    outillage: ["Découpe-tube", "Clé à molette", "Testeur de pression"],
    controles: ["Épreuve de pression", "Pentes d'évacuation", "Absence de fuite"],
    risques: ["Fuites cachées", "Pression insuffisante", "Réseaux croisés"],
    conditions: ["Réseaux repérés et plans disponibles"],
    weight: 0.07,
  },
  {
    id: "revetements",
    order: 14,
    title: "Revêtements de sols et murs",
    objectif: "Pose des carrelages, faïences et revêtements de finition.",
    travaux: ["Carrelage des sols", "Faïence des murs (cuisine, SdB)", "Plinthes et seuils", "Marbre / pierre (si choisi)"],
    materiaux: ["Carrelage / grès", "Faïence", "Colle et joint", "Plinthes"],
    mainOeuvre: ["Carreleur", "Marbrier (si marbre)"],
    outillage: ["Coupe-carreaux", "Niveau", "Croisillons"],
    controles: ["Niveau et planéité", "Joints réguliers", "Réservation des passages"],
    risques: ["Désaffleurements", "Cassage", "Carrelage défectueux"],
    conditions: ["Menuiseries posées", "Réseaux électriques/plomberie en gaines"],
    weight: 0.09,
  },
  {
    id: "peinture",
    order: 15,
    title: "Peinture et finitions",
    objectif: "Appliquer les peintures et finaliser les surfaces.",
    travaux: ["Préparation des surfaces", "Sous-couche", "Peinture des murs et plafonds", "Peinture des menuiseries métalliques"],
    materiaux: ["Enduit de lissage", "Peinture (glycero / acrylique)", "Sous-couche"],
    mainOeuvre: ["Peintre"],
    outillage: ["Rouleaux", "Pinceaux", "Bâches"],
    controles: ["Teinte uniforme", "Absence de traces", "Protection des sols"],
    risques: ["Traces de rouleau", "Coulures", "Surfaces mal préparées"],
    conditions: ["Revêtements terminés", "Menuiseries peintes"],
    weight: 0.07,
  },
  {
    id: "equipements",
    order: 16,
    title: "Équipements",
    objectif: "Installer les équipements techniques et électroménagers.",
    travaux: ["Pose de la cuisine", "Installation de la climatisation", "Chauffe-eau", "Éclairage et appareillages", "Domotique (option)"],
    materiaux: ["Cuisine équipée", "Climatiseurs", "Chauffe-eau", "Luminaires"],
    mainOeuvre: ["Électricien", "Plombier", "Techniciens spécialisés"],
    outillage: ["Perceuse", "Niveau", "Outillage spécifique"],
    controles: ["Mise en service", "Test des équipements", "Conformité des branchements"],
    risques: ["Appareils défectueux", "Branchements non conformes", "Délais d'approvisionnement"],
    conditions: ["Finitions prêtes à recevoir les équipements"],
    weight: 0.06,
  },
  {
    id: "amenagement_exterieur",
    order: 17,
    title: "Aménagement extérieur",
    objectif: "Finaliser les abords : clôture, terrasse, jardin, accès.",
    travaux: ["Clôture et portail", "Terrasse et allées", "Jardin et plantations", "Éclairage extérieur", "Piscine (si prévue)"],
    materiaux: ["Grillage / muret", "Dalles extérieures", "Plantes et terreau", "Gravier"],
    mainOeuvre: ["Paysagiste", "Maçon", "Électricien (extérieur)"],
    outillage: ["Outillage de jardinage", "Niveau", "Mini-pelle (si besoin)"],
    controles: ["Évacuation des eaux pluviales", "Stabilité des clôtures", "Éclairage fonctionnel"],
    risques: ["Eaux stagnantes", "Voisinage (limites)", "Dépassement de budget"],
    conditions: ["Bâtiment réceptionné", "Réseaux extérieurs tracés"],
    weight: 0.05,
  },
  {
    id: "nettoyage",
    order: 18,
    title: "Nettoyage final et livraison",
    objectif: "Livrer un chantier propre et prêt à occuper.",
    travaux: ["Nettoyage intérieur et extérieur", "Évacuation des gravats", "Vérification des finitions", "Dernières retouches"],
    materiaux: ["Produits de nettoyage"],
    mainOeuvre: ["Équipe de nettoyage", "Chef de chantier"],
    outillage: ["Matériel de nettoyage", "Bennes"],
    controles: ["Visite complète pièce par pièce", "Correction des défauts", "Liste des réserves"],
    risques: ["Défauts découverts tardivement", "Retards de livraison"],
    conditions: ["Tous les lots terminés", "Réserves levées"],
    weight: 0.03,
  },
];

// ─── Phase 09 — Contrôle du chantier : axes de suivi ─────────────────────────
export interface ControlItem {
  id: string;
  label: string;
  detail: string;
}

export const CONTROL_ITEMS: ControlItem[] = [
  { id: "photos", label: "Photos du chantier", detail: "Prendre des photos à chaque étape clé (traçabilité et assurance)." },
  { id: "videos", label: "Vidéos", detail: "Vidéos courtes pour documenter les opérations sensibles (béton, étanchéité)." },
  { id: "problemes", label: "Signalement des problèmes", detail: "Signaler immédiatement tout défaut ou anomalie constaté." },
  { id: "observations", label: "Observations", detail: "Noter les observations de chantier et les décisions prises." },
  { id: "avancement", label: "Suivi des travaux terminés", detail: "Cocher les tâches terminées dans le planning (Phase 07)." },
  { id: "prevue_realise", label: "Comparaison prévu / réalisé", detail: "Comparer durées et coûts prévus avec le réalisé." },
  { id: "depenses", label: "Contrôle des dépenses", detail: "Enregistrer les dépenses réelles et suivre l'écart budgétaire." },
  { id: "delais", label: "Contrôle des délais", detail: "Suivre le retard éventuel par rapport au planning." },
];

// ─── Phase 10 — Réception ────────────────────────────────────────────────────
export interface ReceptionItem {
  id: string;
  label: string;
  detail: string;
}

export const RECEPTION_ITEMS: ReceptionItem[] = [
  { id: "pv_reception", label: "Procès-verbal de réception", detail: "PV signé par le maître d'ouvrage et l'entrepreneur, avec ou sans réserves." },
  { id: "reserves", label: "Liste des réserves", detail: "Établir la liste précise des réserves et leurs délais de levée." },
  { id: "garanties", label: "Garantie décennale", detail: "S'assurer de la souscription des garanties légales (décennale, biennale)." },
  { id: "documents", label: "Dossier des ouvrages exécutés", detail: "Plans conformes, notices, certificats, fiches techniques (DOE)." },
  { id: "levée_reserves", label: "Levée des réserves", detail: "Vérifier la levée de chaque réserve avant le paiement final." },
  { id: "conformite", label: "Attestation de conformité", detail: "Obtenir l'accord de conformité de la municipalité (Phase 04)." },
  { id: "occupation", label: "Mise en service et occupation", detail: "Compteurs définitifs, nettoyage final, remise des clés." },
];

// ─── Documents générables ────────────────────────────────────────────────────
export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
}

export const DOCUMENT_TYPES: DocumentTemplate[] = [
  { id: "cahier_des_charges", title: "Cahier des charges", description: "Descriptif technique complet du projet pour consultation des entreprises." },
  { id: "checklist_chantier", title: "Checklist chantier", description: "Liste de contrôle des étapes et points de validation." },
  { id: "planning", title: "Planning des travaux", description: "Planning prévisionnel avec tâches, durées et dépendances." },
  { id: "budget_previsionnel", title: "Budget prévisionnel", description: "Budget par poste avec les trois scénarios." },
  { id: "rapport_avancement", title: "Rapport d'avancement", description: "État d'avancement global et par phase." },
  { id: "rapport_controle", title: "Rapport de contrôle", description: "Anomalies, observations et dépenses enregistrées." },
  { id: "liste_materiaux", title: "Liste des matériaux", description: "Quantitatif détaillé issu de l'estimation du projet." },
  { id: "demande_devis", title: "Demande de devis", description: "Modèle de consultation des entreprises et fournisseurs." },
  { id: "comparatif_devis", title: "Comparatif des devis", description: "Grille de comparaison des offres reçues." },
  { id: "pv_reception", title: "Procès-verbal de réception", description: "Modèle de PV de réception des travaux." },
  { id: "liste_reserves", title: "Liste des réserves", description: "Modèle de relevé des réserves et délais de levée." },
  { id: "rapport_final", title: "Rapport final du projet", description: "Synthèse complète : coûts, délais, photos, réserves." },
];

// ─── Critères de comparaison des entreprises (Phase 06) ──────────────────────
export const COMPANY_CRITERIA = [
  { id: "prix", label: "Prix", detail: "Montant de l'offre et conformité au budget." },
  { id: "specialite", label: "Spécialité", detail: "Métier et domaine d'expertise (maçonnerie, électricité…)." },
  { id: "localisation", label: "Localisation", detail: "Proximité du chantier (réactivité et coûts de déplacement)." },
  { id: "experience", label: "Expérience", detail: "Années d'activité et références de projets similaires." },
  { id: "evaluations", label: "Évaluations", detail: "Avis et notes des clients précédents." },
  { id: "disponibilite", label: "Disponibilité", detail: "Capacité à démarrer et respecter le planning." },
];
