// ============================================================================
// PROFESSIONAL BIM COST ESTIMATION ENGINE
// Tunisia 2026 - Market-Based Pricing (Top-Down)
// 6 Macro-Categories, 40+ Project Types
// ============================================================================
// Methodology:
// - Base cost = REAL Tunisian market price per m² × surface
// - Distributed across 6 macro-categories using specified percentages
// - Material items generated pro-rata within each category
// - 3 budget scenarios based on quality level
// ============================================================================

// Tunisian 2026 Market Prices (TND/m²) - Standard finish, Tunisia average
export const P = {
  // Unit prices for material items (used for itemized lists only)
  cement: { bag42_5: 15, bag32_5: 12.5 },
  sand: { construction: 25, fine: 22, remblai: 18 },
  gravel: { "15_25mm": 38, "8_15mm": 35 },
  bricks: { hollow_10: 1.0, hollow_15: 1.4, hourdis_16: 1.6, noot_6: 0.40, parpaing_15: 1.3, parpaing_20: 1.8 },
  concrete: { ready_mix_250: 200, ready_mix_300: 230, ready_mix_350: 260 },
  steel: { t6_m: 0.9, t8_m: 1.3, t10_m: 2.0, t12_ton: 3700, t14_ton: 3800, treillis_m2: 14 },
  wood: { formwork_m3: 700, framing_m3: 800, chevron_m: 10 },
  paint: { interior_l: 25, exterior_l: 30, primer_l: 18 },
  tiles: { floor_m2: 38, wall_m2: 30, marble_m2: 90, granite_m2: 130, ext_m2: 48, plinthe_ml: 9 },
  plumbing: { pvc_110: 14, pvc_50: 7, copper_m: 20, geyser: 500, wc: 300, lavabo: 170, douche: 380, evier: 250 },
  electrical: { cable_1_5_m: 1.4, cable_2_5_m: 2.2, cable_6_m: 4.5, breaker: 50, panel: 200, led_light: 40, socket: 9, switch: 7 },
  doors: { simple: 380, double: 700, metal: 550, garage: 1300, sliding: 850 },
  windows: { alu_simple: 480, alu_double: 680, pvc: 580, iron_grille: 220, roller_shutter: 380 },
  roofing: { tile_m2: 18, steel_sheet_m2: 28, waterproof_m2: 20, insulation_m2: 25 },
  labor: { worker_day: 65, mason_day: 80, electrician_day: 75, plumber_day: 75, painter_day: 65, tiler_day: 80 },
  transport: { truck_trip: 170, mixer_m3: 28, benne: 200 },
  equipment: { excavator_day: 280, compactor_day: 200, mixer_day: 90 },
};

export const MACRO_LABELS: Record<string, string> = {
  gros_oeuvre: "Gros œuvre",
  second_oeuvre: "Second œuvre",
  equipements: "Équipements",
  main_oeuvre: "Main-d'œuvre",
  transport: "Transport",
  etudes_imprevus: "Études, permis & imprévus",
};

export const MACRO_COLORS: Record<string, string> = {
  gros_oeuvre: "#3b82f6",
  second_oeuvre: "#f59e0b",
  equipements: "#8b5cf6",
  main_oeuvre: "#22c55e",
  transport: "#a3e635",
  etudes_imprevus: "#ef4444",
};

type Percentages = [number, number, number, number, number, number];

// ============================================================================
// REAL TUNISIAN MARKET PRICES 2026 (TND/m² - clé en main, standard)
// Based on Marché tunisien 2025-2026, toutes fournitures + main d'œuvre
// Ajustés pour refléter les prix réels constatés en Tunisie
// ============================================================================

const MARKET_PRICE_M2: Record<string, { eco: number, std: number, premium: number }> = {
  // Maisons & Villa (Marché tunisien 2026 - fournitures + main d'œuvre)
  maison:             { eco: 750,  std: 1100, premium: 1800 },
  maison_r_plus_1:    { eco: 800,  std: 1150, premium: 1900 },
  villa:              { eco: 900,  std: 1350, premium: 2200 },
  immeuble_residentiel:{ eco: 950,  std: 1400, premium: 2200 },
  appartement:        { eco: 1000, std: 1500, premium: 2400 },

  // Piscine & Extérieur
  piscine:            { eco: 750,  std: 1100, premium: 1800 },
  jardin:             { eco: 80,   std: 130,  premium: 250 },
  amenagement_paysager:{ eco: 90,   std: 140,  premium: 280 },
  garage:             { eco: 500,  std: 750,  premium: 1200 },
  cloture:            { eco: 280,  std: 450,  premium: 750 },
  mur_de_separation:  { eco: 280,  std: 450,  premium: 700 },
  cuisine_exterieure: { eco: 750,  std: 1100, premium: 1800 },
  terrasse:           { eco: 320,  std: 500,  premium: 850 },
  pergola:            { eco: 450,  std: 700,  premium: 1100 },
  toiture:            { eco: 280,  std: 400,  premium: 650 },
  extension_batiment: { eco: 800,  std: 1200, premium: 2000 },

  // Commercial & Industriel
  entrepot:           { eco: 450,  std: 700,  premium: 1100 },
  local_commercial:   { eco: 750,  std: 1100, premium: 1800 },
  bureau:             { eco: 850,  std: 1250, premium: 2100 },
  ferme:              { eco: 450,  std: 650,  premium: 1000 },
  serre_agricole:     { eco: 220,  std: 350,  premium: 550 },
  parking:            { eco: 200,  std: 320,  premium: 500 },
  aire_de_jeux:       { eco: 130,  std: 230,  premium: 400 },

  // Institutionnel
  mosquee:            { eco: 950,  std: 1400, premium: 2300 },
  ecole:              { eco: 900,  std: 1350, premium: 2100 },
  hotel:              { eco: 1200, std: 1800, premium: 3000 },
  restaurant:         { eco: 1000, std: 1500, premium: 2500 },
  cafe:               { eco: 950,  std: 1400, premium: 2200 },

  // Industrie
  atelier:            { eco: 350,  std: 520,  premium: 850 },
  usine:              { eco: 500,  std: 750,  premium: 1200 },
  depot:              { eco: 320,  std: 480,  premium: 750 },

  // Énergie
  installation_solaire:{ eco: 2000, std: 3000, premium: 4500 },
  chateau_d_eau:      { eco: 1200, std: 1700, premium: 2700 },
  systeme_irrigation: { eco: 180,  std: 320,  premium: 500 },

  // VRD
  route:              { eco: 130,  std: 220,  premium: 380 },
  trottoir:           { eco: 100,  std: 180,  premium: 320 },

  // Rénovation (Marché tunisien 2026)
  renovation_interieure:    { eco: 320,  std: 550,  premium: 1000 },
  renovation_exterieure:   { eco: 260,  std: 450,  premium: 800 },
  renovation_salle_de_bain: { eco: 1300, std: 2000, premium: 3500 },
  renovation_cuisine:       { eco: 1300, std: 2000, premium: 3500 },
  renovation_facade:        { eco: 230,  std: 350,  premium: 600 },

  // Démolition
  demolition:                { eco: 90,   std: 130,  premium: 220 },
  installations_sanitaires:  { eco: 1000, std: 1600, premium: 3000 },
  installations_electricite: { eco: 180,  std: 320,  premium: 550 },
};

const PROJECT_PCT: Record<string, Percentages> = {
  maison: [38, 29, 15, 10, 3, 5],
  maison_r_plus_1: [40, 28, 14, 10, 3, 5],
  villa: [33, 34, 20, 5, 3, 5],
  immeuble_residentiel: [43, 24, 15, 10, 3, 5],
  appartement: [29, 39, 20, 5, 2, 5],
  piscine: [43, 20, 25, 5, 2, 5],
  jardin: [18, 25, 45, 5, 2, 5],
  amenagement_paysager: [20, 25, 43, 5, 2, 5],
  garage: [48, 25, 10, 10, 2, 5],
  cloture: [58, 20, 5, 10, 2, 5],
  mur_de_separation: [60, 18, 5, 10, 2, 5],
  cuisine_exterieure: [30, 30, 28, 5, 2, 5],
  terrasse: [45, 28, 15, 5, 2, 5],
  pergola: [35, 25, 28, 5, 2, 5],
  toiture: [55, 20, 13, 5, 2, 5],
  extension_batiment: [40, 28, 15, 10, 2, 5],
  entrepot: [53, 20, 10, 10, 2, 5],
  local_commercial: [33, 35, 20, 5, 2, 5],
  bureau: [28, 40, 20, 5, 2, 5],
  ferme: [50, 20, 15, 8, 2, 5],
  serre_agricole: [30, 20, 40, 3, 2, 5],
  parking: [55, 18, 10, 10, 2, 5],
  aire_de_jeux: [25, 20, 43, 5, 2, 5],
  mosquee: [40, 30, 15, 8, 2, 5],
  ecole: [42, 28, 15, 8, 2, 5],
  hotel: [28, 35, 25, 5, 2, 5],
  restaurant: [23, 40, 30, 3, 2, 2],
  cafe: [22, 40, 31, 3, 2, 2],
  atelier: [45, 25, 18, 5, 2, 5],
  usine: [48, 20, 20, 5, 2, 5],
  depot: [55, 18, 10, 10, 2, 5],
  installation_solaire: [13, 10, 65, 5, 2, 5],
  chateau_d_eau: [52, 18, 15, 8, 2, 5],
  systeme_irrigation: [20, 15, 53, 5, 2, 5],
  route: [57, 15, 10, 10, 3, 5],
  trottoir: [52, 20, 10, 10, 3, 5],
  renovation_interieure: [10, 48, 30, 5, 2, 5],
  renovation_exterieure: [35, 40, 8, 7, 3, 7],
  renovation_salle_de_bain: [20, 33, 35, 5, 2, 5],
  renovation_cuisine: [15, 33, 40, 5, 2, 5],
  renovation_facade: [30, 48, 10, 5, 2, 5],
  demolition: [15, 0, 35, 35, 10, 5],
  installations_sanitaires: [0, 20, 70, 5, 2, 3],
  installations_electricite: [0, 20, 70, 5, 2, 3],
};

const CATEGORY_LABEL: Record<string, string> = {
  maison: "Maison", maison_r_plus_1: "Maison R+1", villa: "Villa",
  immeuble_residentiel: "Immeuble résidentiel", appartement: "Appartement",
  piscine: "Piscine", jardin: "Jardin", amenagement_paysager: "Aménagement paysager",
  garage: "Garage", cloture: "Clôture", mur_de_separation: "Mur de séparation",
  cuisine_exterieure: "Cuisine extérieure", terrasse: "Terrasse", pergola: "Pergola",
  toiture: "Toiture", extension_batiment: "Extension de bâtiment", entrepot: "Entrepôt",
  local_commercial: "Local commercial", bureau: "Bureau", ferme: "Ferme",
  serre_agricole: "Serre agricole", parking: "Parking", aire_de_jeux: "Aire de jeux",
  mosquee: "Mosquée", ecole: "École", hotel: "Hôtel", restaurant: "Restaurant",
  cafe: "Café", atelier: "Atelier", usine: "Usine", depot: "Dépôt",
  installation_solaire: "Installation solaire", chateau_d_eau: "Château d'eau",
  systeme_irrigation: "Système d'irrigation", route: "Route", trottoir: "Trottoir",
  renovation_interieure: "Rénovation intérieure", renovation_exterieure: "Rénovation extérieure",
  renovation_salle_de_bain: "Rénovation salle de bain",
  renovation_cuisine: "Rénovation cuisine", renovation_facade: "Rénovation façade",
  demolition: "Démolition", installations_sanitaires: "Installations sanitaires",
  installations_electricite: "Installations électricité",
};

const REGION_MULTIPLIER: Record<string, number> = {
  tunis: 1.15, ariana: 1.10, ben_arous: 1.10, manouba: 1.05,
  nabeul: 1.05, bizerte: 1.05, sousse: 1.10, monastir: 1.05, mahdia: 1.00,
  sfax: 1.05, gabes: 1.00, medenine: 0.95, tataouine: 0.95,
  gafsa: 0.95, tozeur: 0.95, kebili: 0.95, kairouan: 0.95,
  kasserine: 0.90, sidi_bouzid: 0.90, beja: 0.95, jendouba: 0.90,
  le_kef: 0.90, siliana: 0.90, zaghouan: 0.95,
};

// ============================================================================
// MATERIAL CALCULATORS (Generate items with realistic quantities)
// ============================================================================

function genGOItems(surface: number, floors: number, cat: string, targetBudget: number) {
  const tb = surface * (floors || 1);
  const isSmall = ["cloture","mur_de_separation","trottoir","pergola","terrasse","garage"].includes(cat);
  const isHeavy = ["immeuble_residentiel","usine","depot","entrepot","chateau_d_eau","mosquee","ecole"].includes(cat);
  const d = isSmall ? 0.5 : isHeavy ? 1.3 : 1;
  // Realistic Tunisian quantities per m²
  const items = [
    {n:"Ciment CPJ 42.5 (Sac 50kg)", q:Math.round(tb*3.5*d), u:"sacs", up:P.cement.bag42_5},
    {n:"Ciment CPJ 32.5 (Maçonnerie)", q:Math.round(tb*1.0*d), u:"sacs", up:P.cement.bag32_5},
    {n:"Sable de construction 0/4", q:Math.round(tb*0.25*d*10)/10, u:"m³", up:P.sand.construction},
    {n:"Gravier 15/25mm", q:Math.round(tb*0.15*d*10)/10, u:"m³", up:P.gravel["15_25mm"]},
    {n:"Acier à béton T12", q:Math.round(tb*0.02*d*100)/100, u:"tonnes", up:P.steel.t12_ton},
    {n:"Treillis soudé ST25", q:Math.round(tb*0.12), u:"m²", up:P.steel.treillis_m2},
    {n:"Brique creuse 10cm", q:Math.round(tb*45*d), u:"unités", up:P.bricks.hollow_10},
    {n:"Hourdis 16x50", q:Math.round(tb*7*d), u:"unités", up:P.bricks.hourdis_16},
    {n:"Béton prêt à l'emploi 300kg/m³", q:Math.round(tb*0.25*d*10)/10, u:"m³", up:P.concrete.ready_mix_300},
    {n:"Bois de coffrage", q:Math.round(tb*0.04*100)/100, u:"m³", up:P.wood.formwork_m3},
    {n:"Fouilles en rigole", q:Math.round(tb*0.1), u:"m³", up:18},
    {n:"Parpaing creux 20cm", q:Math.round(tb*12*d), u:"unités", up:P.bricks.parpaing_20},
  ];
  const rawTotal = items.reduce((s,i) => s + Math.round(i.q*i.up), 0);
  const scale = rawTotal > 0 ? targetBudget / rawTotal : 1;
  return items.map(i => ({
    name:i.n, quantity:Math.round(i.q*scale*10)/10 || 1, unit:i.u,
    unitPrice:i.up, totalPrice:Math.round(Math.round(i.q*i.up)*scale)
  }));
}

function genSOItems(surface: number, floors: number, cat: string, targetBudget: number) {
  const tb = surface * (floors || 1);
  const isRenov = cat.startsWith("renovation");
  const tileQty = Math.round(tb * (isRenov ? 0.5 : 0.65));
  const paintL = Math.round(tb * (isRenov ? 0.4 : 0.3));
  const doorC = Math.max(1, Math.round(tb / 45));
  const winC = Math.max(1, Math.round(tb / 30));
  const items: any[] = [
    {n:"Carrelage sol grès cérame 40x40", q:tileQty, u:"m²", up:30},
    {n:"Carrelage mural faïence 20x30", q:Math.round(tileQty*0.25), u:"m²", up:25},
    {n:"Peinture intérieure mate lessivable", q:paintL, u:"litres", up:20},
    {n:"Peinture extérieure acrylique", q:Math.round(paintL*0.2), u:"litres", up:25},
    {n:"Enduit de lissage prêt à gâcher", q:Math.round(tb*2.0), u:"kg", up:1.2},
    {n:"Plinthe céramique 8x30", q:Math.round(tb*0.35), u:"ml", up:7},
    {n:"Porte intérieure en bois pleine", q:Math.max(1,doorC), u:"unités", up:300},
    {n:"Porte d'entrée métallique blindée", q:1, u:"unité", up:450},
    {n:"Fenêtre coulissante alu simple vitrage", q:Math.max(2,winC), u:"unités", up:380},
    {n:"Grille de protection métallique", q:Math.max(2,winC), u:"unités", up:180},
    {n:"Étanchéité liquide bitumeuse", q:Math.round(tb*0.25), u:"m²", up:15},
    {n:"Tuile canal rouge", q:Math.round(tb*0.65), u:"m²", up:12},
  ];
  if (isRenov) {
    items.push({n:"Panneau de placoplâtre BA13", q:Math.round(tb*0.15), u:"m²", up:20});
    items.push({n:"Corniche en plâtre", q:Math.round(tb*0.2), u:"ml", up:8});
  }
  const rawTotal = items.reduce((s,i) => s + Math.round(i.q*i.up), 0);
  const scale = rawTotal > 0 ? targetBudget / rawTotal : 1;
  return items.map(i => ({
    name:i.n, quantity:Math.round(i.q*scale*10)/10 || 1, unit:i.u,
    unitPrice:i.up, totalPrice:Math.round(Math.round(i.q*i.up)*scale)
  }));
}

function genEQItems(surface: number, floors: number, cat: string, targetBudget: number) {
  const tb = surface * (floors || 1);
  const items: any[] = [];
  const isPool = cat === "piscine";
  const isSolar = cat === "installation_solaire";
  const doorC = Math.max(1, Math.round(tb / 40));

  if (isPool) {
    items.push({n:"Pompe de filtration + filtre à sable", q:1, u:"forfait", up:1200},
      {n:"Projecteur LED piscine", q:2, u:"unités", up:250},
      {n:"Skimmer + buses de refoulement", q:1, u:"forfait", up:300});
  } else if (isSolar) {
    const panels = Math.round(surface * 0.3);
    items.push({n:"Panneau photovoltaïque 450Wc monocristallin", q:panels, u:"unités", up:550},
      {n:"Onduleur central", q:1, u:"unité", up:2500},
      {n:"Coffret de protection DC/AC", q:1, u:"unité", up:400});
  } else {
    items.push(
      {n:"WC complet avec réservoir", q:Math.max(1,Math.round(doorC*0.3)), u:"unités", up:250},
      {n:"Lavabo vasque + robinetterie", q:Math.max(1,Math.round(doorC*0.25)), u:"unités", up:140},
      {n:"Chauffe-eau électrique 80L", q:Math.max(1,Math.round(doorC*0.2)), u:"unités", up:400},
      {n:"Receveur de douche 90x90", q:Math.max(1,Math.round(doorC*0.15)), u:"unités", up:200},
      {n:"Tuyau PER Ø16", q:Math.round(tb*0.5), u:"ml", up:4},
      {n:"Tuyau PVC Ø100 évacuation", q:Math.round(tb*0.05), u:"ml", up:10},
      {n:"Câble électrique 2.5mm² (rouleau 100m)", q:Math.round(tb*2), u:"ml", up:1.5},
      {n:"Disjoncteur divisionnaire 20A", q:Math.max(2,Math.round(doorC*0.3)), u:"unités", up:35},
      {n:"Tableau électrique 13 modules", q:1, u:"unité", up:150},
      {n:"Prise de courant 2P+T encastrée", q:Math.max(4,doorC*2), u:"unités", up:6},
      {n:"Interrupteur va-et-vient", q:Math.max(3,doorC*1.5), u:"unités", up:5},
      {n:"Luminaire LED plafonnier", q:Math.max(2,doorC*2), u:"unités", up:30});
  }
  const rawTotal = items.reduce((s,i) => s + Math.round(i.q*i.up), 0);
  const scale = rawTotal > 0 ? targetBudget / rawTotal : 1;
  return items.map(i => ({
    name:i.n, quantity:i.q, unit:i.u,
    unitPrice:i.up, totalPrice:Math.round(Math.round(i.q*i.up)*scale)
  }));
}

function genMOItems(surface: number, floors: number, cat: string, targetBudget: number) {
  const tb = surface * (floors || 1);
  const ih = ["immeuble_residentiel","usine","mosquee","ecole","hotel"].includes(cat) ? 1.2 : 1;
  const items = [
    {n:"Maçon qualifié", q:Math.round(tb/15*ih*10)/10, u:"jours", up:80},
    {n:"Manœuvre", q:Math.round(tb/12*ih*10)/10, u:"jours", up:55},
    {n:"Électricien", q:Math.round(tb/60*ih*10)/10, u:"jours", up:75},
    {n:"Plombier", q:Math.round(tb/80*ih*10)/10, u:"jours", up:75},
    {n:"Carreleur", q:Math.round(tb/45*ih*10)/10, u:"jours", up:80},
    {n:"Peintre en bâtiment", q:Math.round(tb/60*ih*10)/10, u:"jours", up:65},
    {n:"Chef de chantier", q:Math.round(tb/100*ih*10)/10, u:"jours", up:100},
  ];
  const rawTotal = items.reduce((s,i) => s + Math.round(i.q*i.up), 0);
  const scale = rawTotal > 0 ? targetBudget / rawTotal : 1;
  return items.map(i => ({
    name:i.n, quantity:i.q, unit:i.u,
    unitPrice:i.up, totalPrice:Math.round(Math.round(i.q*i.up)*scale)
  }));
}

function genTRItems(surface: number, floors: number, targetBudget: number) {
  const tb = surface * (floors || 1);
  const items = [
    {n:"Transport matériaux (benne 10t)", q:Math.max(2,Math.round(tb/30)), u:"voyages", up:170},
    {n:"Pompe à béton stationnaire", q:Math.round(tb*0.25), u:"m³", up:28},
    {n:"Location tractopelle", q:Math.max(1,Math.round(tb/100)), u:"jours", up:280},
    {n:"Évacuation gravats (benne 8m³)", q:Math.max(1,Math.round(tb/60)), u:"bennes", up:200},
  ];
  const rawTotal = items.reduce((s,i) => s + Math.round(i.q*i.up), 0);
  const scale = rawTotal > 0 ? targetBudget / rawTotal : 1;
  return items.map(i => ({
    name:i.n, quantity:i.q, unit:i.u,
    unitPrice:i.up, totalPrice:Math.round(Math.round(i.q*i.up)*scale)
  }));
}

function genEIItems(totalBudget: number, targetBudget: number) {
  const items = [
    {n:"Permis de construire + taxe voirie", q:1, u:"forfait", up:Math.round(Math.min(totalBudget*0.015, 4000))},
    {n:"Honoraires architecte/BET", q:1, u:"forfait", up:Math.round(totalBudget*0.03)},
    {n:"Assurance chantier tous risques", q:1, u:"forfait", up:Math.round(totalBudget*0.008)},
    {n:"Étude de sol G12", q:1, u:"forfait", up:2500},
    {n:"Raccordement eau potable (SONEDE)", q:1, u:"forfait", up:1000},
    {n:"Raccordement électricité (STEG)", q:1, u:"forfait", up:1200},
  ];
  const rawTotal = items.reduce((s,i) => s + Math.round(i.q*i.up), 0);
  const scale = rawTotal > 0 ? targetBudget / rawTotal : 1;
  return items.map(i => ({
    name:i.n, quantity:i.q, unit:i.u,
    unitPrice:i.up, totalPrice:Math.round((i.q*i.up)*scale)
  }));
}

function estimateDuration(s: number, fl: number, cat: string): string {
  const tb = s * (fl || 1);
  if (cat.startsWith("renovation")) return `${Math.max(1, Math.round(tb/40))} mois`;
  if (["pergola","terrasse","cloture","mur_de_separation","trottoir","garage"].includes(cat)) return `${Math.max(1, Math.round(tb/60))} mois`;
  if (cat==="piscine") return `${Math.max(2, Math.round(s/12))} mois`;
  if (["jardin","amenagement_paysager","aire_de_jeux"].includes(cat)) return `${Math.max(1, Math.round(tb/100))} mois`;
  if (cat==="installation_solaire") return `${Math.max(1, Math.round(tb/80))} mois`;
  return `${Math.max(2, Math.round(tb/40*(fl||1)))} mois`;
}

function detectAnomalies(cat: string, s: number, fl: number) {
  const a: any[] = [];
  if (s > 500 && (!fl || fl===1)) a.push({type:"Dimension excessive",severity:"moyenne",desc:`Surface ${s}m² sur un seul niveau.`,rec:"Envisager un étage pour réduire emprise au sol."});
  if (fl && fl >= 5) a.push({type:"Hauteur importante",severity:"élevée",desc:`${fl} étages = ascenseur obligatoire.`,rec:"Prévoir ascenseur PMR et voies d'évacuation incendie."});
  if (s < 20 && !["terrasse","pergola","garage","piscine"].includes(cat)) a.push({type:"Surface insuffisante",severity:"faible",desc:`${s}m² très réduit pour ce projet.`,rec:"Vérifier les dimensions saisies."});
  if (cat==="piscine" && s > 150) a.push({type:"Piscine très grande",severity:"moyenne",desc:`${s}m² coûts d'entretien élevés.`,rec:"Chauffage solaire pour réduire coûts énergétiques."});
  if (cat==="toiture" && s < 30) a.push({type:"Petite surface de toiture",severity:"faible",desc:`${s}m² - vérifier rentabilité.`,rec:"Regrouper avec d'autres travaux."});
  return a.map(x => ({type:x.type,severity:x.severity,description:x.desc,recommendation:x.rec}));
}

function getMethods(cat: string): string[] {
  if (cat==="piscine") return ["Béton projeté gunite","Coffrage traditionnel","Revêtement carrelage","Filtration à sable"];
  if (cat==="installation_solaire") return ["Structures alu toiture","Raccordement STEG","Compteur bidirectionnel"];
  if (cat.startsWith("renovation")) return ["Démolition sélective","Nettoyage/reprise support","Enduit projeté","Peinture acrylique"];
  if (["jardin","amenagement_paysager"].includes(cat)) return ["Terrassement mécanique","Irrigation goutte-à-goutte","Plantation manuelle"];
  return ["Fondations semelles filantes","Maçonnerie briques creuses","Dalle pleine béton armé","Enduit traditionnel","Carrelage collé"];
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export function runBIMEstimation(
  category: string, surface: number, floors: number,
  region?: string, finishLevel?: string
) {
  const pct = PROJECT_PCT[category] || [35, 30, 15, 10, 3, 7];
  const marketPrices = MARKET_PRICE_M2[category] || { eco: 1000, std: 1500, premium: 2500 };
  const rMult = region ? (REGION_MULTIPLIER[region] || 1.0) : 1.0;

  // Determine finish level multiplier
  const fLevel = finishLevel || "standard";
  let fMult = 1.0;
  let basePriceM2 = marketPrices.std;
  if (fLevel === "economique") { fMult = 0.8; basePriceM2 = marketPrices.eco; }
  else if (fLevel === "premium") { fMult = 1.3; basePriceM2 = marketPrices.premium; }
  else if (fLevel === "luxe") { fMult = 1.7; basePriceM2 = marketPrices.premium * 1.3; }
  else { fMult = 1.0; basePriceM2 = marketPrices.std; }

  const tb = surface * (floors || 1);
  const finalTotal = Math.round(basePriceM2 * tb * fMult * rMult);
  const costM2 = tb > 0 ? Math.round(finalTotal / tb) : 0;

  const keys = ["gros_oeuvre","second_oeuvre","equipements","main_oeuvre","transport","etudes_imprevus"];
  const labels = ["Gros œuvre","Second œuvre","Équipements","Main-d'œuvre","Transport","Études, permis & imprévus"];

  // Generate category budgets from percentages
  const categoryBudgets: Record<string, number> = {};
  keys.forEach((k, i) => {
    categoryBudgets[k] = Math.round(finalTotal * (pct[i] / 100));
  });
  // Adjust for rounding
  const sum = keys.reduce((s, k) => s + categoryBudgets[k], 0);
  categoryBudgets.main_oeuvre = Math.max(1, categoryBudgets.main_oeuvre - (sum - finalTotal));

  // Generate itemized lists per category
  const genMap: Record<string, (s: number, f: number, c: string, b: number) => any[]> = {
    gros_oeuvre: genGOItems,
    second_oeuvre: genSOItems,
    equipements: genEQItems,
    main_oeuvre: genMOItems,
    transport: (s: number, f: number, c: string, b: number) => genTRItems(s, f, b),
    etudes_imprevus: (s: number, f: number, c: string, b: number) => genEIItems(finalTotal, b),
  };

  const breakdown = keys.map((k, i) => {
    const budget = categoryBudgets[k];
    const items = genMap[k](surface, floors, category, budget);
    const itemTotal = items.reduce((s, it) => s + it.totalPrice, 0);
    // Scale items to match budget exactly
    const scale = itemTotal > 0 ? budget / itemTotal : 1;
    const scaledItems = items.map(it => ({
      ...it,
      totalPrice: Math.round(it.totalPrice * scale),
    }));
    const finalItemTotal = scaledItems.reduce((s, it) => s + it.totalPrice, 0);
    return {
      category: k, label: labels[i],
      estimatedCost: finalItemTotal, percentage: pct[i],
      items: scaledItems,
    };
  });

  const contingencyPct = 5;
  const buffer = Math.round(finalTotal * contingencyPct / 100);
  const totalWithBuffer = finalTotal + buffer;
  const finalCostM2 = tb > 0 ? Math.round(totalWithBuffer / tb) : 0;

  // Budget scenarios using REAL market price ranges (already include region)
  const totalEco = Math.round(marketPrices.eco * tb * rMult);
  const totalPremium = Math.round(marketPrices.premium * tb * rMult);
  const scenarios = {
    economique: { label:"Économique", totalCost: totalEco + Math.round(totalEco * contingencyPct / 100), costPerM2: Math.round(totalEco / tb), multiplier: 0.8 },
    standard: { label:"Standard", totalCost: totalWithBuffer, costPerM2: finalCostM2, multiplier: 1.0 },
    premium: { label:"Premium", totalCost: totalPremium + Math.round(totalPremium * contingencyPct / 100), costPerM2: Math.round(totalPremium / tb), multiplier: 1.3 },
  };

  // Confidence index
  let confidence = 0.90;
  if (!region) confidence -= 0.05;
  if (!finishLevel) confidence -= 0.03;
  if (surface <= 0) confidence -= 0.20;
  if (surface < 30) confidence -= 0.10;
  if (!MARKET_PRICE_M2[category]) confidence -= 0.10;
  confidence = Math.max(0.3, Math.min(1.0, confidence));

  const laborTotal = breakdown[3]?.estimatedCost || 0;
  const avgWorkerCost = 55;
  const totalDays = laborTotal > 0 ? Math.round(laborTotal / avgWorkerCost) : 0;
  const avgWorkers = Math.max(1, Math.round(totalDays / 22));

  const anomalies = detectAnomalies(category, surface, floors);
  const duration = estimateDuration(surface, floors, category);

  // Optimization tips with region context
  const tips = generateTips(category, surface, region, finishLevel, costM2);

  // Region impact info for UI
  const regionLabel = region ? ({
    tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
    nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
    jendouba: "Jendouba", le_kef: "Le Kef", siliana: "Siliana", kairouan: "Kairouan",
    kasserine: "Kasserine", sidi_bouzid: "Sidi Bouzid", sousse: "Sousse",
    monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès",
    medenine: "Médenine", tataouine: "Tataouine", gafsa: "Gafsa", tozeur: "Tozeur",
    kebili: "Kébili",
  } as Record<string, string>)[region] : undefined;

  const regionImpact = region ? {
    region,
    regionLabel: regionLabel || region,
    multiplier: rMult,
    impactPct: Math.round((rMult - 1) * 100),
    totalWithRegion: totalWithBuffer,
    totalWithoutRegion: Math.round(totalWithBuffer / rMult),
    difference: totalWithBuffer - Math.round(totalWithBuffer / rMult),
  } : undefined;

  return {
    costEstimate: {
      totalCost: totalWithBuffer,
      costPerSquareMeter: finalCostM2,
      currency: "TND",
      breakdown,
      contingencyBuffer: buffer,
      contingencyPercentage: contingencyPct,
      budgetScenarios: scenarios,
    },
    aiAnalysis: {
      category: CATEGORY_LABEL[category] || category,
      confidence,
      dimensions: { detected: surface > 0, estimatedArea: surface },
      features: [],
      anomalies,
      constructionMethods: getMethods(category),
      estimatedDuration: duration,
      laborEstimate: { totalWorkers: avgWorkers, totalDays, estimatedCost: laborTotal },
      rawAnalysis: "Analyse BIM basée sur les prix du marché tunisien 2026",
    },
    optimizationTips: tips,
    technicalRecommendations: generateTechRecs(category, surface, floors),
    regionImpact,
  };
}

function generateTips(cat: string, s: number, reg?: string, fLvl?: string, costM2?: number): string[] {
  const t: string[] = [];
  t.push("Privilégiez les matériaux locaux (ciment Bizerte, carrelage Kairouan, marbre Thala) pour réduire le transport.");
  if (s > 200) t.push("Pour plus de 200m², négociez des remises de 5-10% auprès des fournisseurs en gros.");
  if (cat==="maison"||cat==="villa") {
    t.push("Un plan carré est 15% plus économique qu'un plan complexe. Optimisez le ratio surface/volume.");
    t.push("Utilisez des briques alvéolaires 10cm pour les cloisons : 20% moins cher et meilleure isolation.");
  }
  if (cat==="piscine") {
    t.push("Revêtement liner plutôt que mosaïque : économie de 30% sur le budget revêtement.");
    t.push("Pompe à vitesse variable : réduit de 40% la consommation électrique.");
  }
  if (cat.startsWith("renovation")) {
    t.push("Conservez les structures existantes (murs porteurs, charpente) quand c'est possible.");
    t.push("Peinture lessivable dans les pièces humides : durée de vie doublée.");
  }
  if (reg && ["tunis","ariana","ben_arous"].includes(reg)) t.push("Région Tunis : prix 10-15% plus élevés. Achetez en région pour économiser.");
  if (costM2 && costM2 > 1800) t.push("Budget premium : envisagez un suivi par un maître d'œuvre pour optimiser les finitions.");
  t.push("Regroupez vos achats (ciment + sable + gravier) pour obtenir des remises de 5-8%.");
  return t.slice(0, 8);
}

function generateTechRecs(cat: string, s: number, fl: number): string[] {
  const r: string[] = [];
  if (fl >= 3) {
    r.push("Étude de sol G2 obligatoire pour plus de 3 étages (NT 47.01).");
    r.push("Béton dosé à 350 kg/m³ minimum pour les éléments porteurs verticaux.");
  }
  if (s > 150) {
    r.push("Prévoyez des joints de dilatation tous les 25-30 mètres.");
    r.push("Drainage périphérique (drain français) pour protéger les fondations.");
  }
  if (cat==="piscine") r.push("Utilisez des aciers galvanisés ou inox pour les parties immergées.", "Test d'étanchéité de 72 heures minimum avant mise en eau.");
  if (cat==="toiture") r.push("Pente minimale de 27% pour les tuiles canal. Isolation R ≥ 2.5 m².K/W.");
  if (cat==="installation_solaire") r.push("Orientation sud avec inclinaison de 30-35° (optimal pour la Tunisie).", "Installez un parafoudre et une mise à la terre conforme à la NF C 15-100.");
  if (cat.startsWith("renovation")) r.push("Vérifiez la présence d'amiante avant toute démolition.", "Renforcez les planchers si le changement d'usage le nécessite.");
  r.push("Norme tunisienne NT 47.01 : charge d'exploitation maison 150 kg/m², bureau 250 kg/m².");
  r.push("Prévoyez un vide sanitaire d'au moins 30 cm pour l'aération et l'isolation.");
  return r.slice(0, 8);
}
