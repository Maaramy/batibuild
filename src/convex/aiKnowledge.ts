// ============================================================================
// Construction AI Copilot — Base de connaissances (corpus RAG)
// Contenu technique curé pour le marché tunisien et africain (2026).
// Chaque entrée : sujet, mots-clés de recherche, contenu, source, fiabilité.
// ============================================================================

export interface KnowledgeSeed {
  topic: string;
  keywords: string[];
  content: string;
  source?: string;
  reliability?: string;
}

export const KNOWLEDGE_SEED: KnowledgeSeed[] = [
  // ── Gros œuvre ─────────────────────────────────────────────────────────────
  {
    topic: "Fondations et terrassement",
    keywords: ["fondation", "terrassement", "semelle", "radier", "fouille", "sol", "portance"],
    content:
      "Le choix des fondations dépend de la portance du sol. Pour un sol courant en Tunisie (portance ~1 à 2 bars), une maison R+1 utilise des semelles filantes en béton armé de 40-60 cm de large. Un sol argileux ou remblai imposera un radier général ou des pieux. Le terrassement mécanique coûte ~25 TND/m³, les fouilles en rigole ~18 TND/m³. Toujours faire une étude de sol (géotechnique) avant de dimensionner : c'est une RECOMMANDATION essentielle, la validation finale appartient à un ingénieur structure.",
    source: "Pratique courante Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Béton armé et dosage",
    keywords: ["beton", "dalle", "poteau", "poutre", "ferraillage", "acier", "dosage", "ciment"],
    content:
      "Dosages usuels par m³ de béton (Tunisie) : fondations et dallage 300-350 kg/m³ de ciment ; poteaux et poutres 350-400 kg/m³. Un m³ de béton ≈ 350 kg ciment + 0,4 m³ sable + 0,8 m³ gravier + eau. Le béton prêt à l'emploi coûte ~115-140 TND/m³ (250-350 kg). L'acier se vend à la tonne (~3 500-4 200 TND/t en 2026) ; un ferraillage courant de maison pèse 40-60 kg/m² de dalle. Prévoir 5 % de pertes et un béton de propreté (5 cm) sous les semelles.",
    source: "Prix marché Tunisie 2026 + DTU 21",
    reliability: "ESTIMATION",
  },
  {
    topic: "Maçonnerie — briques et parpaings",
    keywords: ["brique", "parpaing", "maconnerie", "mur", "cloison", "hourdis", "mortier"],
    content:
      "Cadences usuelles avec joints : brique creuse 10 cm ≈ 40 u/m², brique 15 cm ≈ 32 u/m², parpaing creux 20 cm ≈ 12,5 u/m². Prix indicatifs 2026 : brique creuse 10 ~0,45-0,55 TND/u, parpaing 20 ~1,3-1,6 TND/u. Le mortier de pose se dose à 1 volume de ciment pour 4 de sable. Pour les cloisons intérieures, la brique 10 cm est la norme ; pour les murs porteurs ou de refend, parpaing 15/20 cm ou brique 15 cm. Prévoir 10 % de casse.",
    source: "Pratique courante Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Dalle et plancher — hourdis",
    keywords: ["dalle", "plancher", "hourdis", "poutrelle", "etage", "plafond"],
    content:
      "Le plancher le plus courant en Tunisie est la dalle en corps creux : poutrelles précontraintes + hourdis 16×50 + dalle de compression 4-5 cm ferraillée (treillis ST25). Cadence : ~1,2-1,5 hourdis/m². Coût posé indicatif : 35-55 TND/m² hors béton et acier. Pour de grandes portées (> 5 m) ou charges lourdes, dalle pleine ou prédalle. Le ferraillage de la dalle de compression se fait avec treillis soudé ST25 (~12 TND/m²).",
    source: "Pratique courante Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Charpente et toiture",
    keywords: ["toiture", "charpente", "tuile", "pente", "bois", "metallique", "bac acier"],
    content:
      "Toiture en pente : charpente bois (sapin/peuplier) ou métallique, couverture en tuile canal (~0,7-1,1 TND/u, 10-12 u/m²), ou bac acier (~25-40 TND/m²). Toit terrasse : dalle + étanchéité (voir étanchéité). Pente minimale tuile : 25-30 %. En zones côtières (Bizerte, Nabeul), prévoir des fixations renforcées contre le vent. L'isolation sous couverture est recommandée en climat méditerranéen (été chaud).",
    source: "Pratique courante Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Étanchéité des toitures terrasses",
    keywords: ["etancheite", "terrasse", "toiture", "membrane", "bitume", "hydrofuge", "fuite", "humidite"],
    content:
      "Toute terrasse non accessible nécessite une étanchéité : complexe bicouche bitumeux (forme de pente + primaire + 2 couches soudées) ou membrane PVC/EPDM (plus chère mais plus durable). Coût indicatif : 25-45 TND/m² posé (bitume), 50-90 TND/m² (PVC). Les points sensibles : relevés (≥ 15 cm), évacuations des eaux pluviales, joints. Une étanchéité mal posée est la première cause de fuites. Faire contrôler par un étancheur qualifié.",
    source: "DTU 43 + marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Isolation thermique — norme ANME",
    keywords: ["isolation", "thermique", "anme", "polystyrene", "laine", "liege", "climat", "confort"],
    content:
      "La réglementation thermique tunisienne (ANME, 2018) impose des exigences d'isolation pour les bâtiments neufs. Options courantes : polystyrène expansé (PSE) 4-6 cm en toiture et façades, laine de verre/roche en doublage, liège (plus cher, écologique), polystyrène extrudé (XPS) pour les terrasses. Ordre de prix 2026 : PSE ~8-15 TND/m², laine de verre ~6-12 TND/m², liège ~40-60 TND/m². L'isolation se rembourse par les économies de climatisation (jusqu'à 30-40 % en climat tunisien). Le choix dépend du climat : intérieur (Kairouan, Gafsa) → forte isolation ; littoral → isolation + ventilation.",
    source: "ANME — RT tunisienne + marché 2026",
    reliability: "RECOMMANDATION",
  },
  {
    topic: "Isolation phonique",
    keywords: ["phonique", "bruit", "acoustique", "doublage", "laine", "placo"],
    content:
      "Pour l'isolation acoustique entre logements ou face au bruit extérieur : doublage placoplâtre sur ossature avec laine minérale (isolant phonique), cloisons en brique pleine, joints périphériques. Le placo BA13 seul ne coupe presque pas le bruit : il faut la laine. Coût indicatif doublage phonique : 40-70 TND/m² posé. Vérifier l'isolation des menuiseries (double vitrage) pour les façades exposées au bruit.",
    source: "Pratique courante + DTU 25.41",
    reliability: "RECOMMANDATION",
  },

  // ── Second œuvre ──────────────────────────────────────────────────────────
  {
    topic: "Carrelage et revêtements de sol",
    keywords: ["carrelage", "faience", "marbre", "gres", "pose", "sol", "plinthe", "chape"],
    content:
      "Ordre de prix posé 2026 (Tunisie) : grès cérame 30×30/60×60 ~35-60 TND/m² posé, faïence murale ~30-50 TND/m² posé, marbre local (Thala) ~120-250 TND/m² posé, plinthe céramique ~8-15 TND/ml. Prévoir 5-8 % de chutes selon la pose (diagonale = plus). Une chape de 5-7 cm (~2 000 m²... correction : 20-30 TND/m²) doit être sèche avant pose. Le jointoiement se fait avec mortier-joint adapté (extérieur : joint souple).",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Peinture et finitions",
    keywords: ["peinture", "enduit", "lissage", "sous-couche", "emulsion", "façade", "couleur"],
    content:
      "Rendement peinture : ~10 m²/L par couche (2 couches recommandées). Enduit de lissage ~1,2 TND/kg, besoin ~1,5 kg/m² pour un lissage fin. Peinture intérieure mate ~25-45 TND/L, extérieure acrylique ~35-60 TND/L. Préparer : enduit, ponçage, sous-couche (obligatoire sur neuf), 2 couches. Pour les façades au soleil tunisien, choisir des peintures extérieures acryliques claires (réflexion solaire) et vérifier l'adhérence sur support humide.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Plâtrerie et plafonds",
    keywords: ["platre", "placo", "placoplatre", "faux plafond", "corniche", "cloisons seches"],
    content:
      "Prix posés 2026 : placoplâtre BA13 ~20-30 TND/m², faux plafond sur ossature ~25-45 TND/m², corniche en plâtre ~8-15 TND/ml. Le placo est rapide mais moins résistant que la maçonnerie ; l'utiliser pour les doublages, faux plafonds et cloisons légères. En zones humides (salle de bain) : plaque hydrofuge (BA13 H). Attendre le séchage complet des maçonneries avant de fermer les plafonds.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Menuiserie — portes et fenêtres",
    keywords: ["porte", "fenetre", "menuiserie", "aluminium", "pvc", "bois", "vitrage", "double vitrage"],
    content:
      "Comparatif 2026 (Tunisie) : fenêtre alu simple vitrage ~180-280 TND/u, alu double vitrage ~300-500 TND/u, PVC double vitrage ~250-450 TND/u, porte intérieure bois ~150-350 TND/u, porte d'entrée métallique ~500-1 200 TND/u. Le double vitrage (4/12/4) est recommandé pour l'isolation thermique et phonique. L'aluminium est courant en façade (poids, durabilité) ; le PVC est plus isolant. Pour les grandes baies, prévoir un renfort structurel et un vitrage feuilleté en rez-de-chaussée (sécurité).",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Électricité — installation",
    keywords: ["electricite", "cable", "disjoncteur", "tableau", "prise", "norme", "ntc", "mise a la terre"],
    content:
      "Norme tunisienne NTC 2012 (basse tension) : tableau électrique avec disjoncteurs par circuit, différentiel 30 mA obligatoire, mise à la terre obligatoire, câbles : éclairage 1,5 mm², prises 2,5 mm², cuisinière/chauffe-eau 4-6 mm². Ordre de prix matériel 2026 : câble 2,5 mm² ~0,5-0,8 TND/ml, disjoncteur 20 A ~8-15 TND, tableau 13 modules ~40-80 TND, luminaire LED ~20-60 TND. Faire établir le schéma électrique par un électricien qualifié et vérifier la terre avant mise sous tension.",
    source: "NTC 2012 + marché Tunisie 2026",
    reliability: "DONNÉE VÉRIFIÉE",
  },
  {
    topic: "Plomberie et sanitaire",
    keywords: ["plomberie", "sanitaire", "tuyau", "pvc", "wc", "geyser", "chauffe-eau", "evacuation"],
    content:
      "Ordre de prix matériel 2026 : tuyau PVC Ø110 ~12-18 TND/ml, PVC Ø50 ~5-9 TND/ml, chauffe-eau électrique 80 L ~350-600 TND, WC complet ~150-350 TND, lavabo ~60-150 TND. Règles de base : pente d'évacuation ≥ 2 % (1 cm/m), ventilations primaires, purge des canalisations, groupe de sécurité sur le chauffe-eau. L'eau chaude sanitaire solaire est encouragée (STEG/ANME, aides) en climat tunisien.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Climatisation et ventilation",
    keywords: ["climatisation", "climatiseur", "split", "btu", "ventilation", "debit", "confort"],
    content:
      "Dimensionnement approximatif : 100 W/m² (≈ 340 BTU/m²) pour une pièce en climat tunisien avec plafond standard. Une chambre de 12-15 m² → 9 000-12 000 BTU ; salon 30 m² → 18 000-24 000 BTU. Ordre de prix posé 2026 : split 9 000 BTU ~900-1 400 TND, 12 000 BTU ~1 100-1 700 TND, 18 000 BTU ~1 500-2 300 TND. Prévoir une ventilation naturelle (VMC en pièces humides) pour éviter condensation et moisissures. L'inverter réduit la consommation de 30-40 %.",
    source: "Pratique courante Tunisie 2026",
    reliability: "ESTIMATION",
  },

  // ── Structure / VRD / génie civil ─────────────────────────────────────────
  {
    topic: "Structure béton armé — règles de l'art",
    keywords: ["structure", "beton arme", "poteau", "poutre", "bael", "eurocode", "seisme", "contreventement"],
    content:
      "En Tunisie, le dimensionnement courant suit le BAEL ou l'Eurocode 2 (EC2), avec prise en compte du séisme (règles parasismiques, zone de séismicité moyenne à forte selon région). Points clés : enrobage des aciers ≥ 2,5 cm (fondations 4 cm), écartement des cadres, ancrages, chaînages verticaux et horizontaux, contreventement par voiles ou portiques. Toute modification du plan (murs, ouvertures) doit être validée par un ingénieur structure : la structure ne se dimensionne jamais « à l'estimation ». Coût structure : ~15-25 % du coût total d'une maison.",
    source: "Eurocode 2 / BAEL + pratique TN",
    reliability: "RECOMMANDATION",
  },
  {
    topic: "VRD — voirie et réseaux divers",
    keywords: ["vrd", "voirie", "assainissement", "eaux pluviales", "fosse septique", "trottoir", "reseau"],
    content:
      "VRD : terrassement, assainissement (EU/EP), alimentation en eau, électricité, voirie et trottoirs. En zone non raccordée : fosse septique conforme (toutes eaux) + épandage ou micro-station. Ordres de prix 2026 : trottoir béton ~30-45 TND/m², accès/bordure ~25-40 TND/ml, assainissement EU ~60-120 TND/ml selon profondeur. Déclarer le raccordement auprès de l'ONAS (eaux usées) et de la SONEDE (eau potable).",
    source: "ONAS / SONEDE + pratique TN",
    reliability: "ESTIMATION",
  },
  {
    topic: "Routes et génie civil",
    keywords: ["route", "voirie", "revêtement", "enrobe", "bitume", "piste", "pont", "ouvrage", "genie civil"],
    content:
      "Construction de route : plateforme terrassée, couche de forme (grave naturelle 20-30 cm), couche de base (grave concassée 15-25 cm), revêtement en enrobé bitumineux (5-8 cm) ou bicouche (enduit superficiel) pour les pistes. Ordres de prix 2026 (Tunisie) : enrobé ~45-75 TND/m² posé, bicouche ~12-20 TND/m², grave concassée ~25-40 TND/m³. Les ouvrages d'art (ponts, dalots, buses) nécessitent une étude hydraulique et structurelle : validation obligatoire par un ingénieur.",
    source: "Pratique BTP Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Clôture et murs de séparation",
    keywords: ["cloture", "mur", "separation", "grillage", "portail", "limite"],
    content:
      "Prix 2026 : mur de clôture parpaing 20 cm enduit ~120-180 TND/ml (hors fondation), grillage simple torsion ~15-30 TND/ml, portail métallique ~800-2 500 TND. Pour les murs mitoyens, respecter les règles de copropriété/urbanisme (hauteur, recul). Le mur de clôture doit être fondé (semelle filante) surtout en sol argileux, avec joints de retrait tous les 6-8 m.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },

  // ── Aménagements ─────────────────────────────────────────────────────────
  {
    topic: "Piscine privée",
    keywords: ["piscine", "bassin", "liner", "mosaique", "filtration", "pompe", "revêtement"],
    content:
      "Coût de construction 2026 (Tunisie) : piscine en maçonnerie enduite + mosaïque ~1 800-2 800 TND/m² de plan d'eau ; liner ~1 200-1 800 TND/m². Équipements : filtration (pompe + filtre à sable), skimmers, projecteurs LED, local technique. Entretien : pH 7,2-7,6, chlore, hivernage. La qualité de l'étanchéité et du local technique est cruciale — recourir à un pisciniste pour l'étude du bassin (fers, épaisseurs).",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Jardin et aménagement paysager",
    keywords: ["jardin", "paysage", "plante", "gazon", "arrosage", "arbre", "terrasse exterieur", "pergola"],
    content:
      "Ordres de prix 2026 : gazon (rouleaux) ~8-15 TND/m², gazon synthétique ~25-45 TND/m², arrosage goutte-à-goutte ~3-6 TND/ml, pergola bois/métal ~150-400 TND/m², pavage extérieur ~40-70 TND/m². En climat tunisien, privilégier les essences locales résistantes à la sécheresse (olivier, jacaranda, laurier) et un arrosage goutte-à-goutte pour économiser l'eau. Prévoir l'éclairage extérieur et le drainage.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Installation solaire photovoltaïque",
    keywords: ["solaire", "photovoltaique", "panneau", "steg", "autoconsommation", "onduleur", "economie"],
    content:
      "En Tunisie, le décret 2016-1123 autorise l'autoconsommation avec injection du surplus (facturation nette STEG). Un kit de 3 kWc coûte ~12 000-18 000 TND posé (2026), produit ~4 500 kWh/an à Tunis (≈ 1 500 kWh/kWc/an). Aides : prêts bonifiés, réduction TVA (13 %). Dimensionnement : une villa moyenne consomme ~6 000-9 000 kWh/an → 4-6 kWc. Rentabilité typique : 5-8 ans selon l'usage. Faire valider l'installation par un installateur agréé STEG.",
    source: "STEG / décret 2016-1123",
    reliability: "ESTIMATION",
  },
  {
    topic: "Château d'eau et réservoir",
    keywords: ["chateau d'eau", "reservoir", "cuve", "pompe", "pression", "surpresseur", "eau"],
    content:
      "Pour les zones à pression insuffisante : réservoir surélevé ou cuve + surpresseur. Dimensionnement : 1 à 2 jours de consommation (100-150 L/pers/jour). Une cuve de 5 m³ coûte ~2 500-4 500 TND (plastique) ou plus en maçonnerie/béton. Prévoir un surpresseur (300-800 TND) et un traitement anti-calcaire selon la région (eau très calcaire au centre/sud).",
    source: "Pratique Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Irrigation agricole",
    keywords: ["irrigation", "goutte", "agricole", "serre", "puits", "pompage", "economie eau"],
    content:
      "L'irrigation goutte-à-goutte économise 40-60 % d'eau vs aspersion. Coût 2026 : réseau goutte ~0,8-2 TND/ml, pompe de forage ~1 500-4 000 TND, cuve tampon. Pour une serre agricole : structure + film ~25-50 TND/m², système d'irrigation et fertigation. Le pompage solaire est très pertinent dans le sud tunisien (fort ensoleillement, zones non desservies).",
    source: "Pratique Tunisie 2026",
    reliability: "ESTIMATION",
  },

  // ── Coûts, planning, gestion ─────────────────────────────────────────────
  {
    topic: "Coûts de construction au m² (Tunisie 2026)",
    keywords: ["cout", "prix au m2", "budget", "m2", "metre carre", "construction", "prix"],
    content:
      "Ordres de grandeur 2026 (Tunisie, finition standard) : maison économique ~1 100-1 500 TND/m², maison standard ~1 500-2 100 TND/m², villa haut de gamme ~2 200-3 200 TND/m², appartement (promoteur) ~1 600-2 400 TND/m², entrepôt/local ~900-1 400 TND/m², bureau ~1 600-2 200 TND/m². Répartition typique : gros œuvre ~45-55 %, second œuvre ~20-25 %, finitions ~15-20 %, études/imprévus ~10 %. Ces fourchettes sont des ESTIMATIONS : le prix réel dépend de la région, du niveau de finition et du terrain.",
    source: "Analyse marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Coûts par région tunisienne",
    keywords: ["region", "tunis", "sfax", "sousse", "nabeul", "sud", "nord", "multiplier", "climat"],
    content:
      "Les coûts de construction varient selon la région : Tunis/Grand Tunis = référence (×1,0) ; littoral (Nabeul, Sousse, Monastir, Sfax) ≈ ×0,95-1,05 ; intérieur (Kairouan, Kasserine, Siliana) ≈ ×0,90-0,95 (main-d'œuvre moins chère, matériaux + transport) ; Sud (Gabès, Médenine, Tataouine, Tozeur) ≈ ×0,95-1,10 selon l'éloignement des centres de production (transport du ciment et de l'acier). Le climat influe : isolation renforcée à l'intérieur (chaud sec), protection humidité sur le littoral.",
    source: "Analyse marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Main-d'œuvre et corps de métier",
    keywords: ["main d'oeuvre", "ouvrier", "macon", "chef de chantier", "manoeuvre", "artisan", "salaire"],
    content:
      "Ordres de prix 2026 (Tunisie, à la journée) : maçon qualifié ~70-120 TND/j, manœuvre ~45-70 TND/j, chef de chantier ~150-250 TND/j, électricien ~80-140 TND/j, plombier ~80-140 TND/j, carreleur ~90-160 TND/j, peintre ~70-120 TND/j. Le poste main-d'œuvre représente ~30-40 % du coût total d'un chantier. Pour les devis, regrouper « chef de chantier & maçon qualifié » : leur quantité s'exprime en nombre d'ouvriers (ex. 7) — les effectifs exacts dépendent du planning réel du chantier.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Planning et durée de chantier",
    keywords: ["planning", "duree", "delai", "chantier", "retard", "phase", "gantt"],
    content:
      "Durées indicatives (maison 120-200 m², Tunisie) : terrassement/fondations 2-3 semaines, gros œuvre 2-4 mois, toiture/étanchéité 2-3 semaines, second œuvre 2-3 mois, finitions 1-2 mois. Total : 6-10 mois pour une maison, 12-18 mois pour une villa ou un immeuble. Facteurs de retard fréquents : autorisations (permis de construire 2-6 mois), paiements, disponibilité des matériaux, pluie. Un planning réaliste intègre 10-15 % de marge. Suivi hebdomadaire : avancement réel vs prévu, tâches critiques.",
    source: "Pratique Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Gestion de chantier — suivi et qualité",
    keywords: ["gestion", "chantier", "suivi", "qualite", "conformite", "controle", "reception", "pointage"],
    content:
      "Bonnes pratiques : cahier de chantier (journal des travaux), PV de réunion hebdomadaire, suivi budgétaire (engagé vs prévu), contrôle qualité à chaque phase (fondations avant coulage, étanchéité avant chape, etc.), réception provisoire avec liste de réserves, réception définitive après levée des réserves (garantie de parfait achèvement 1 an, garantie décennale 10 ans pour les ouvrages). Toujours faire valider les points structurants par un professionnel (bureau de contrôle).",
    source: "Pratique Tunisie + réglementation",
    reliability: "RECOMMANDATION",
  },
  {
    topic: "Anomalies et désordres courants",
    keywords: ["fissure", "humidite", "infiltration", "affaissement", "desordre", "anomalie", "probleme", "pathologie"],
    content:
      "Désordres fréquents : fissures (retrait du béton, tassement, défaut de chaînage), infiltrations (étanchéité, remontées capillaires), moisissures (ventilation insuffisante), affaissements (sol non étudié), éclatement du béton (corrosion des aciers). Conduite à tenir : diagnostiquer la cause AVANT de réparer (une fissure de structure ne se rebouche pas), documenter avec photos, consulter un ingénieur pour toute fissure > 0,3 mm, surélévation ou désaffleurement. Ne jamais masquer un désordre par une simple reprise de peinture.",
    source: "Pathologie du bâtiment",
    reliability: "RECOMMANDATION",
  },
  {
    topic: "Budget et marge pour imprévus",
    keywords: ["imprevus", "marge", "budget", "reserve", "depassement", "risque"],
    content:
      "La pratique recommande une marge pour imprévus de 5-10 % du coût estimé (15 % pour les projets complexes ou mal définis). Les dépassements viennent surtout des changements en cours de chantier (modifications de plan), des quantités sous-estimées et des variations de prix des matériaux. Suivre un tableau de bord : coût prévu, engagé, réalisé, reste à faire. Ajuster les lots sensibles (acier, ciment, main-d'œuvre) chaque mois.",
    source: "Pratique Tunisie 2026",
    reliability: "RECOMMANDATION",
  },
  {
    topic: "Permis de construire et autorisations",
    keywords: ["permis", "autorisation", "urbanisme", "municipalite", "lotissement", "reglementation", "administratif"],
    content:
      "En Tunisie, toute construction nécessite un permis de construire délivré par la municipalité (délai légal ~2 mois, souvent 2-6 mois en pratique). Pièces : plan de situation, plan de masse, plans d'architecture, notice descriptive, pièces foncières. Dans les zones urbaines, vérifier le POS/PUD (hauteur, recul, coefficient d'occupation). Construire sans permis expose à la démolition et aux amendes. Les délais administratifs doivent être intégrés au planning global du projet.",
    source: "Code de l'urbanisme tunisien",
    reliability: "DONNÉE VÉRIFIÉE",
  },
  {
    topic: "Assurances et garanties",
    keywords: ["assurance", "garantie", "decennale", "responsabilite", "chantier", "tous risques"],
    content:
      "Assurances clés : assurance dommages-ouvrage (obligatoire pour le maître d'ouvrage), assurance décennale de l'entrepreneur (10 ans), assurance tous risques chantier (TRC). En cas de sinistre, déclarer rapidement et faire constater par huissier/expert. La garantie de parfait achèvement couvre les réserves pendant 1 an après réception. Vérifier que chaque intervenant (entreprise, bureau d'études) justifie de ses attestations.",
    source: "Code des assurances tunisien",
    reliability: "DONNÉE VÉRIFIÉE",
  },

  // ── Matériaux & choix ────────────────────────────────────────────────────
  {
    topic: "Comparer les matériaux — méthodologie",
    keywords: ["comparer", "comparaison", "choix", "materiau", "solution", "alternative", "criteres"],
    content:
      "Pour comparer des matériaux ou solutions techniques, évaluer sur 5 critères : prix (fourniture + pose), performance (thermique, phonique, mécanique), durabilité (durée de vie, entretien), disponibilité locale (délais, transport), et impact (esthétique, environnemental). Le choix optimal dépend du projet : budget, climat, usage. Proposer systématiquement 3 niveaux : économique, optimal, premium, avec pour chacun prix estimé, performance et durée de vie. Une comparaison de devis doit être faite à prestations équivalentes (mêmes quantités, mêmes marques).",
    source: "Méthodologie batibuild",
    reliability: "RECOMMANDATION",
  },
  {
    topic: "Acier — prix et achats",
    keywords: ["acier", "fer", "tonne", "t12", "barre", "achat", "importation"],
    content:
      "L'acier est le matériau le plus volatile du chantier : son prix dépend des cours mondiaux et du taux de change. 2026 : ~3 500-4 200 TND/tonne (T12), barres T6-T10 au mètre. Acheter par lot (fondations + dalle ensemble) quand les prix sont bas ; surveiller le marché mensuellement. Stocker l'acier à l'abri (corrosion) et vérifier les certificats de qualité. Les chutes de ferraillage se recyclent (reprise ~0,5-1 TND/kg).",
    source: "Marché Tunisie 2026",
    reliability: "PRÉVISION IA",
  },
  {
    topic: "Ciment — marques et achat",
    keywords: ["ciment", "cpj", "sac", "marque", "stockage", "achat"],
    content:
      "Marchés tunisiens : ciment CPJ 32,5 et 42,5 (sac 50 kg) ~11-14 TND/sac (2026), prêt à l'emploi chez les cimenteries (Carthage Cement, Bizerte, SOTACIB, etc.). Stockage : à plat, à l'abri de l'humidité, pas plus de 1-2 mois (perte de résistance). Ne jamais utiliser du ciment grumeleux. Pour un usage continu, acheter en palette (remise). Le transport en vrac ou en sac dépend du volume.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Sable et gravier",
    keywords: ["sable", "gravier", "granulat", "carriere", "livraison", "gros"],
    content:
      "Prix 2026 (Tunisie) : sable de construction ~30-45 TND/m³, sable fin ~25-40 TND/m³, gravier 8/15 et 15/25 ~40-60 TND/m³, livrés depuis les carrières (Bizerte, Zaghouan, Kairouan...). Le transport double parfois le coût en zones éloignées. Vérifier la propreté du sable (absence d'argile) et la granulométrie du gravier. Commander avec 5-10 % de marge pour la compaction.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Bois et coffrage",
    keywords: ["bois", "coffrage", "contreplaque", "charpente", "menuiserie bois", "traite"],
    content:
      "Bois de coffrage ~500-700 TND/m³, bois de charpente ~700-950 TND/m³, contreplaqué de coffrage ~25-40 TND/plaque. Le bois de coffrage se réutilise 4-8 fois avec un décoffrant. Pour la charpente, utiliser du bois traité (termites, humidité) et vérifier l'entre-axe selon la portée. Les essences locales (peuplier, sapin) sont économiques ; le chêne/teck pour les finitions.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Étanchéité et protection",
    keywords: ["etancheite", "hydrofuge", "membrane", "primaire", "joint", "silicon", "protection"],
    content:
      "Outre les toitures, l'étanchéité concerne : salles d'eau (hydrofuge sous carrelage), balcons et terrasses, fondations (drainage + membrane si nappe), joints de dilatation. Produits : primaire d'accrochage, membranes bitumineuses soudées, enduits hydrofuges, bandes d'étanchéité. Coût : 15-45 TND/m² selon système. Les jonctions (relevés, pénétrations) sont 90 % des fuites : y prêter une attention maximale.",
    source: "DTU 43 + marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Maintenance du bâtiment",
    keywords: ["maintenance", "entretien", "frequence", "nettoyage", "verification", "revision"],
    content:
      "Maintenance recommandée : toiture/étanchéité (inspection 2×/an, après tempêtes), gouttières et descentes (nettoyage 2×/an), chauffe-eau (purge + anode 1-2 ans), climatiseurs (filtres 1-3 mois, révision annuelle), pompe de relevage (test mensuel), peintures extérieures (retouche 3-5 ans), joints silicone (remplacement 5-8 ans). Un carnet d'entretien prolonge la durée de vie du bâtiment et protège la valeur du bien.",
    source: "Pratique bâtiment",
    reliability: "RECOMMANDATION",
  },

  // ── Investissement & immobilier ───────────────────────────────────────────
  {
    topic: "Investissement locatif — indicateurs",
    keywords: ["investissement", "roi", "rendement", "rentabilite", "cashflow", "locatif", "retour", "plus-value"],
    content:
      "Indicateurs clés : rendement brut = loyers annuels / prix d'achat ; rendement net = (loyers − charges) / prix ; délai de retour = prix / flux net annuel ; cash-flow = loyers − charges − crédit. En Tunisie 2026, les rendements locatifs bruts varient de 4 à 8 % selon la ville et le type de bien (appartements à Tunis/Sousse ~5-6 %, locaux commerciaux ~7-9 %). Intégrer : taxe sur les terrains non bâtis, impôt sur les revenus fonciers, frais de gestion (5-10 %), vacance locative (1-2 mois/an), travaux d'entretien (~1 % du prix/an).",
    source: "Analyse marché immobilier TN 2026",
    reliability: "PRÉVISION IA",
  },
  {
    topic: "Évaluation immobilière — cohérence du prix",
    keywords: ["evaluation", "immobilier", "prix au m2", "fourchette", "valorisation", "marche", "bien"],
    content:
      "Pour vérifier si un prix est cohérent : comparer au prix au m² des biens similaires dans la même zone (même type, état, étage, orientation). Ordres de grandeur 2026 (Tunisie) : appartement Tunis centre ~3 500-5 500 TND/m², banlieues nord ~4 000-6 000 TND/m², Sousse/Monastir ~3 000-4 500 TND/m², Sfax ~2 800-4 000 TND/m², intérieur ~1 800-3 000 TND/m². Maisons/villas : 2 500-5 000 TND/m² selon standing. Un écart > 15-20 % vs la fourchette justifie une négociation ou une vérification (état, titres fonciers, charges).",
    source: "Analyse marché immobilier TN 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Marché immobilier africain — multi-pays",
    keywords: ["afrique", "dakar", "abidjan", "casablanca", "algier", "pays", "devise", "fcf a", "marche local"],
    content:
      "Les coûts de construction varient fortement selon le pays africain : Sénégal (Dakar) ~250 000-450 000 FCFA/m² (maison standard, 2026), Côte d'Ivoire (Abidjan) ~250 000-400 000 FCFA/m², Maroc (Casablanca) ~6 000-10 000 MAD/m², Algérie ~80 000-140 000 DZD/m². Les matériaux importés (acier, ciment selon pays, menuiseries) dépendent des droits de douane et du taux de change. Le climat local (tropical, sahel, méditerranéen) impose des solutions différentes (ventilation, protection solaire, drainage). Toujours raisonner dans la devise locale avec les prix locaux réels du marché.",
    source: "Analyse marché Afrique 2026",
    reliability: "PRÉVISION IA",
  },

  // ── Rénovation / spécial ─────────────────────────────────────────────────
  {
    topic: "Rénovation — salle de bain et cuisine",
    keywords: ["renovation", "salle de bain", "cuisine", "rehabilitation", "reprise", "existant"],
    content:
      "Rénovation salle de bain (Tunisie 2026) : 8 000-18 000 TND selon standing (carrelage, sanitaire, plomberie, électricité). Cuisine : 10 000-25 000 TND (meubles, plan de travail, électroménager). Points critiques en rénovation : état de la plomberie et de l'électricité (remise aux normes), humidité/moisissures, structure porteuse avant ouverture de murs. Prévoir un budget imprévus de 15-20 % en rénovation (découvertes en cours de travaux). Faire un diagnostic avant devis ferme.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Démolition",
    keywords: ["demolition", "deconstruction", "deblais", "evacuation", "recyclage", "gravats"],
    content:
      "Coûts 2026 (Tunisie) : démolition maçonnerie ~15-30 TND/m², évacuation des gravats ~20-40 TND/m³ (décharge + transport), découpe béton armé ~200-400 TND/m³. Points de sécurité : couper l'électricité/l'eau/gaz, étayer si structure, tri des déchets (ferraille recyclable, bois, plastiques), permis de démolition selon la commune. La démolition intérieure (cloisons) est rapide mais génère poussière et nuisances : protéger les zones adjacentes.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Extension de bâtiment",
    keywords: ["extension", "agrandissement", "surélévation", "annexe", "adjacent"],
    content:
      "Avant toute extension : vérifier le POS (recul, COS), la structure existante (fondations, possibilité de liaison), et la mitoyenneté. Une surélévation nécessite une étude structurelle (reprise des charges, poteaux, fondations) par un ingénieur. Coût d'une extension plain-pied (Tunisie 2026) : 1 200-1 800 TND/m² selon finition. La liaison entre ancien et neuf est le point technique délicat (joints, étanchéité, fondations différentielles).",
    source: "Pratique Tunisie 2026",
    reliability: "RECOMMANDATION",
  },
  {
    topic: "Garage, pergola et terrasse extérieure",
    keywords: ["garage", "pergola", "terrasse", "auvent", "exterieur", "ombre", "carport"],
    content:
      "Prix 2026 (Tunisie) : garage maçonnerie + toiture ~1 000-1 500 TND/m², carport métal/bois ~200-400 TND/m², pergola bois ~150-350 TND/m², pergola aluminium ~250-500 TND/m², terrasse extérieure carrelée ~60-120 TND/m² (hors structure). Pour les terrasses ensoleillées, prévoir protection solaire (pergola, canisse, store) et un revêtement antidérapant. Drainage et pente d'évacuation obligatoires.",
    source: "Marché Tunisie 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Bâtiments professionnels — entrepôt, local, bureau",
    keywords: ["entrepot", "local commercial", "bureau", "atelier", "usine", "depot", "hauteur", "portique"],
    content:
      "Bâtiments industriels/tertiaires : structure métallique ou béton préfabriqué, grandes portées, hauteur sous ferme (entrepôt ≥ 6-8 m pour le gerbage), dallage industriel (épaisseur ≥ 15-18 cm, treillis), chargement/portes sectionnelles, désenfumage, extinction incendie (RIA, extincteurs), éclairage industriel LED. Coûts 2026 (Tunisie) : entrepôt simple ~900-1 400 TND/m², local commercial aménagé ~1 300-2 000 TND/m², bureau ~1 600-2 200 TND/m². La réglementation incendie (décret 94-461) impose des mesures selon l'effectif et l'activité.",
    source: "Pratique Tunisie 2026 + décret 94-461",
    reliability: "ESTIMATION",
  },
  {
    topic: "Bâtiments publics — école, mosquée, hôtel, restaurant",
    keywords: ["ecole", "mosquee", "hotel", "restaurant", "cafe", "etablissement", "public", "ERP"],
    content:
      "Les bâtiments recevant du public (ERP) sont soumis à des règles renforcées : issues de secours, désenfumage, sécurité incendie, accessibilité PMR, études thermiques. Coûts indicatifs 2026 (Tunisie) : école ~1 300-1 800 TND/m², mosquée ~1 800-2 800 TND/m² (minaret, traitement acoustique), restaurant/café aménagé ~1 800-3 000 TND/m², hôtel ~2 500-4 000 TND/m² selon étoiles. Ces projets exigent des bureaux d'études agréés et des autorisations spécifiques (commission de sécurité).",
    source: "Réglementation TN + marché 2026",
    reliability: "ESTIMATION",
  },
  {
    topic: "Analyse de plans — assistance",
    keywords: ["plan", "architectural", "structure", "electrique", "plomberie", "vrd", "dessin", "dimension", "plan 2d"],
    content:
      "L'analyse de plans par IA est une ASSISTANCE : elle peut identifier les pièces, lire certaines dimensions et surfaces indiquées, repérer les équipements et comparer deux versions. Elle ne remplace PAS la validation d'un architecte ou d'un ingénieur. Éléments à vérifier sur un plan : cotes cohérentes (portées, épaisseurs de murs), circulation (couloirs ≥ 90 cm), escaliers (giron 25-30 cm, hauteur ≤ 18 cm), fenêtres (surface vitrée ≥ 1/8 de la surface de la pièce), orientation (soleil, vents dominants), réserves (climatisation, tableau électrique, gaines).",
    source: "Méthodologie batibuild",
    reliability: "RECOMMANDATION",
  },
  {
    topic: "Analyse de photos de chantier",
    keywords: ["photo", "chantier", "image", "avancement", "anomalie", "controle visuel"],
    content:
      "L'analyse de photos par IA est une assistance au contrôle visuel : elle décrit les travaux apparents, compare avec des photos précédentes et signale des anomalies visuelles potentielles (fissures, ferraillage exposé, étaiements, humidité). Pour un suivi fiable : photos datées et géolocalisées, même angle à chaque visite, checklist par phase. Toute anomalie détectée doit être confirmée sur site par un professionnel. L'estimation d'avancement par photo reste approximative.",
    source: "Méthodologie batibuild",
    reliability: "RECOMMANDATION",
  },
];

// Regroupement des entrées par sujet large (utilisé pour l'affichage UI)
export const KNOWLEDGE_TOPICS: Record<string, string> = {
  gros_oeuvre: "Gros œuvre",
  second_oeuvre: "Second œuvre",
  isolation: "Isolation & étanchéité",
  electricite: "Électricité",
  plomberie: "Plomberie & sanitaire",
  structure: "Structure & génie civil",
  vrd: "VRD & routes",
  couts: "Coûts & budget",
  planning: "Planning & gestion",
  materiau: "Matériaux",
  immobilier: "Immobilier & investissement",
  renovation: "Rénovation",
};
