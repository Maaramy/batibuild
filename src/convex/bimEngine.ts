import {
  PROJECT_STATUS,
  type materialCategoryValidator,
} from "./schema";

// ============================================================================
// PROFESSIONAL BIM COST ESTIMATION ENGINE
// Tunisia 2026 - 6 Macro-Categories, 40+ Project Types
// ============================================================================

// Prices Tunisia 2026 (TND)
export const P = {
  cement: { bag42_5: 15, bag32_5: 12.5 },
  sand: { construction: 20, fine: 18, remblai: 15 },
  gravel: { "15_25mm": 35, "8_15mm": 32 },
  bricks: { hollow_10: 0.9, hollow_15: 1.3, hourdis_16: 1.5, noot_6: 0.35, parpaing_15: 1.2, parpaing_20: 1.6 },
  concrete: { ready_mix_250: 180, ready_mix_300: 210, ready_mix_350: 240 },
  steel: { t6_m: 0.8, t8_m: 1.2, t10_m: 1.8, t12_ton: 3400, t14_ton: 3500, treillis_m2: 12 },
  wood: { formwork_m3: 650, framing_m3: 750, chevron_m: 8 },
  paint: { interior_l: 22, exterior_l: 28, primer_l: 15 },
  tiles: { floor_m2: 35, wall_m2: 28, marble_m2: 85, granite_m2: 120, ext_m2: 45, plinthe_ml: 8 },
  plumbing: { pvc_110: 12, pvc_50: 6, copper_m: 18, geyser: 450, wc: 280, lavabo: 150, douche: 350, evier: 220 },
  electrical: { cable_1_5_m: 1.2, cable_2_5_m: 2, cable_6_m: 4, breaker: 45, panel: 180, led_light: 35, socket: 8, switch: 6 },
  doors: { simple: 350, double: 650, metal: 500, garage: 1200, sliding: 800 },
  windows: { alu_simple: 450, alu_double: 650, pvc: 550, iron_grille: 200, roller_shutter: 350 },
  roofing: { tile_m2: 15, steel_sheet_m2: 25, waterproof_m2: 18, insulation_m2: 22 },
  labor: { worker_day: 55, mason_day: 70, electrician_day: 65, plumber_day: 65, painter_day: 55, tiler_day: 70 },
  transport: { truck_trip: 150, mixer_m3: 25, benne: 180 },
  equipment: { excavator_day: 250, compactor_day: 180, mixer_day: 80 },
  finishing: { plaster_m2: 8, stucco_m2: 12, tiling_m2: 15, painting_m2: 6, demolition_m3: 25 },
  solar: { panel_450w: 600, battery_5kwh: 2500, inverter: 3000, support: 50, cable_ml: 15 },
  pool: { pump_filter: 1500, mosaic_m2: 45, gunite_m3: 250 },
  garden: { soil_m3: 35, plant: 25, grass_m2: 8, paillage_m2: 12, bordure_ml: 12 },
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
  renovation_interieure: "Rénovation intérieure", renovation_salle_de_bain: "Rénovation salle de bain",
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

const FINISH_MULTIPLIER: Record<string, number> = {
  economique: 0.75, standard: 1.0, premium: 1.35, luxe: 1.80,
};

// --- Calculators ---
function calcGO(surface: number, floors: number, cat: string) {
  const tb = surface * (floors || 1);
  const isSmall = ["cloture","mur_de_separation","trottoir","pergola","terrasse","garage"].includes(cat);
  const isHeavy = ["immeuble_residentiel","usine","depot","entrepot","chateau_d_eau","mosquee","ecole"].includes(cat);
  const d = isSmall ? 0.5 : isHeavy ? 1.3 : 1;
  const items = [
    {n:"Ciment CPJ 42.5 (Sac 50kg)",q:Math.round(tb*4.2*d),u:"sacs",up:P.cement.bag42_5,t:0},
    {n:"Ciment CPJ 32.5 (Maçonnerie)",q:Math.round(tb*1.26*d),u:"sacs",up:P.cement.bag32_5,t:0},
    {n:"Sable de construction 0/4",q:Math.round(tb*0.6*d),u:"m³",up:P.sand.construction,t:0},
    {n:"Gravier 15/25mm",q:Math.round(tb*0.4*d),u:"m³",up:P.gravel["15_25mm"],t:0},
    {n:"Acier à béton T12",q:Math.round(tb*1.5*d*100)/100,u:"tonnes",up:P.steel.t12_ton,t:0},
    {n:"Treillis soudé ST25",q:Math.round(tb*0.15),u:"m²",up:P.steel.treillis_m2,t:0},
    {n:"Brique creuse 10cm",q:Math.round(tb*65*d),u:"unités",up:P.bricks.hollow_10,t:0},
    {n:"Hourdis 16x50",q:Math.round(tb*8.5*d),u:"unités",up:P.bricks.hourdis_16,t:0},
    {n:"Béton prêt à l'emploi 300kg/m³",q:Math.round(tb*0.35*d*100)/100,u:"m³",up:P.concrete.ready_mix_300,t:0},
    {n:"Bois de coffrage",q:Math.round(tb*0.08*100)/100,u:"m³",up:P.wood.formwork_m3,t:0},
    {n:"Fouilles en rigole",q:Math.round(tb*0.15),u:"m³",up:18,t:0},
    {n:"Sable de remblai",q:Math.round(tb*0.1),u:"m³",up:P.sand.remblai,t:0},
  ];
  items.forEach(i => i.t = Math.round(i.q * i.up));
  const total = items.reduce((s,i) => s + i.t, 0);
  return {items: items.map(i => ({name:i.n,quantity:i.q,unit:i.u,unitPrice:i.up,totalPrice:i.t})), total};
}

function calcSO(surface: number, floors: number, cat: string) {
  const tb = surface * (floors || 1);
  const isRenov = cat.startsWith("renovation");
  const isExt = ["terrasse","pergola","toiture","jardin","amenagement_paysager","cloture","mur_de_separation"].includes(cat) || cat.includes("facade");
  const tileQty = Math.round(tb * (isRenov ? 0.6 : 0.7));
  const paintL = Math.round(tb * (isRenov ? 0.5 : 0.4));
  const doorC = Math.round(tb / (isRenov ? 50 : 35));
  const winC = Math.round(tb / 25);
  const items: any[] = [
    {n:"Carrelage sol grès cérame",q:tileQty,u:"m²",up:P.tiles.floor_m2},
    {n:"Carrelage mural faïence",q:Math.round(tileQty*0.3),u:"m²",up:P.tiles.wall_m2},
    {n:"Peinture intérieure mate",q:paintL,u:"litres",up:P.paint.interior_l},
    {n:"Peinture extérieure acrylique",q:Math.round(paintL*0.3),u:"litres",up:P.paint.exterior_l},
    {n:"Enduit de lissage",q:Math.round(tb*2.5),u:"kg",up:1.5},
    {n:"Bois de charpente",q:Math.round(tb*0.02*100)/100,u:"m³",up:P.wood.framing_m3},
    {n:"Plinthe céramique",q:Math.round(tb*0.4),u:"ml",up:P.tiles.plinthe_ml},
    {n:"Porte intérieure en bois",q:Math.max(1,doorC),u:"unités",up:P.doors.simple},
    {n:"Porte d'entrée métallique",q:1,u:"unité",up:P.doors.metal},
    {n:"Fenêtre coulissante alu",q:Math.max(2,winC),u:"unités",up:P.windows.alu_simple},
    {n:"Grille de protection métallique",q:Math.max(2,winC),u:"unités",up:P.windows.iron_grille},
    {n:"Étanchéité liquide",q:Math.round(tb*0.3),u:"m²",up:P.roofing.waterproof_m2},
    {n:"Isolation thermique polystyrène",q:Math.round(tb*0.7),u:"m²",up:P.roofing.insulation_m2},
    {n:"Tuile canal",q:Math.round(tb*0.7),u:"m²",up:P.roofing.tile_m2},
  ];
  if (isExt) items.push({n:"Carrelage extérieur antidérapant",q:Math.round(tb*0.3),u:"m²",up:P.tiles.ext_m2});
  const mapped = items.map(i => ({name:i.n,quantity:i.q,unit:i.u,unitPrice:i.up,totalPrice:Math.round(i.q*i.up)}));
  return {items:mapped, total:mapped.reduce((s,i) => s + i.totalPrice, 0)};
}

function calcEQ(surface: number, floors: number, cat: string) {
  const tb = surface * (floors || 1);
  const doorC = Math.round(tb / 35);
  const isPool = cat === "piscine";
  const isSolar = cat === "installation_solaire";
  const isKitchen = cat.includes("cuisine") && !cat.includes("exterieure");
  const isBath = cat.includes("salle_de_bain");
  const items: any[] = [];
  if (isPool) {
    items.push({n:"Système de filtration pompe+filtre",q:1,u:"forfait",up:P.pool.pump_filter},
      {n:"Mosaïque piscine",q:Math.round(surface*1.2),u:"m²",up:P.pool.mosaic_m2},
      {n:"Béton projeté gunite",q:Math.round(surface*0.5),u:"m³",up:P.pool.gunite_m3});
  } else if (isSolar) {
    const pc = Math.round(surface * 0.4), bc = Math.round(pc * 0.3);
    items.push({n:"Panneau photovoltaïque 450Wc",q:pc,u:"unités",up:P.solar.panel_450w},
      {n:"Batterie lithium 5kWh",q:bc,u:"unités",up:P.solar.battery_5kwh},
      {n:"Onduleur hybride",q:1,u:"unité",up:P.solar.inverter},
      {n:"Support métallique kit",q:pc,u:"unités",up:P.solar.support});
  } else if (isKitchen) {
    items.push({n:"Cuisine équipée meubles+plan",q:1,u:"forfait",up:3500},
      {n:"Évier+robinetterie",q:1,u:"unité",up:P.plumbing.evier},
      {n:"Hotte aspirante",q:1,u:"unité",up:350});
  } else if (isBath) {
    items.push({n:"Receveur de douche+paroi",q:1,u:"forfait",up:600},
      {n:"WC suspendu+réservoir",q:1,u:"unité",up:P.plumbing.wc+120},
      {n:"Lavabo vasque+robinetterie",q:1,u:"unité",up:P.plumbing.lavabo},
      {n:"Chauffe-eau électrique 100L",q:1,u:"unité",up:P.plumbing.geyser});
  }
  items.push(
    {n:"WC complet avec réservoir",q:Math.max(1,Math.round(doorC*0.4)),u:"unités",up:P.plumbing.wc},
    {n:"Lavabo avec robinetterie",q:Math.max(1,Math.round(doorC*0.3)),u:"unités",up:P.plumbing.lavabo},
    {n:"Chauffe-eau 100L",q:Math.max(1,Math.round(doorC*0.3)),u:"unités",up:P.plumbing.geyser},
    {n:"Tuyau cuivre Ø14",q:Math.round(tb*0.3),u:"ml",up:P.plumbing.copper_m},
    {n:"Tuyau PVC Ø110 évacuation",q:Math.round(tb*0.06),u:"ml",up:P.plumbing.pvc_110},
    {n:"Câble électrique 2.5mm²",q:Math.round(tb*4),u:"ml",up:P.electrical.cable_2_5_m},
    {n:"Disjoncteur différentiel",q:Math.max(1,Math.round(doorC*0.5)),u:"unités",up:P.electrical.breaker},
    {n:"Tableau électrique",q:1,u:"unité",up:P.electrical.panel},
    {n:"Prises de courant",q:Math.max(4,doorC*3),u:"unités",up:P.electrical.socket},
    {n:"Interrupteurs",q:Math.max(3,doorC*2),u:"unités",up:P.electrical.switch},
    {n:"Luminaires LED",q:Math.max(2,doorC*2),u:"unités",up:P.electrical.led_light});
  const mapped = items.map(i => ({name:i.n,quantity:i.q,unit:i.u,unitPrice:i.up,totalPrice:Math.round(i.q*i.up)}));
  return {items:mapped, total:mapped.reduce((s,i) => s + i.totalPrice, 0)};
}

function calcMO(surface: number, floors: number, cat: string) {
  const tb = surface * (floors || 1);
  const ih = ["immeuble_residentiel","usine","mosquee","ecole","hotel"].includes(cat) ? 1.3 : 1;
  const items = [
    {n:"Maçon journalier",q:Math.round(tb/20*ih),u:"jours",up:P.labor.mason_day},
    {n:"Manœuvre journalier",q:Math.round(tb/15*ih),u:"jours",up:P.labor.worker_day},
    {n:"Électricien",q:Math.round(tb/80*ih),u:"jours",up:P.labor.electrician_day},
    {n:"Plombier",q:Math.round(tb/100*ih),u:"jours",up:P.labor.plumber_day},
    {n:"Carreleur",q:Math.round(tb/60*ih),u:"jours",up:P.labor.tiler_day},
    {n:"Peintre",q:Math.round(tb/80*ih),u:"jours",up:P.labor.painter_day},
  ];
  const mapped = items.map(i => ({name:i.n,quantity:i.q,unit:i.u,unitPrice:i.up,totalPrice:Math.round(i.q*i.up)}));
  return {items:mapped, total:mapped.reduce((s,i) => s + i.totalPrice, 0)};
}

function calcTR(surface: number, floors: number) {
  const tb = surface * (floors || 1);
  const items = [
    {n:"Transport de matériaux camion",q:Math.max(1,Math.round(tb/40)),u:"voyages",up:P.transport.truck_trip},
    {n:"Pompe à béton",q:Math.round(tb*0.35),u:"m³",up:P.transport.mixer_m3},
    {n:"Évacuation des déchets",q:Math.max(1,Math.round(tb/50)),u:"bennes",up:P.transport.benne},
  ];
  const mapped = items.map(i => ({name:i.n,quantity:i.q,unit:i.u,unitPrice:i.up,totalPrice:Math.round(i.q*i.up)}));
  return {items:mapped, total:mapped.reduce((s,i) => s + i.totalPrice, 0)};
}

function calcEI(total: number) {
  const p = Math.min(total*0.02, 5000);
  const items = [
    {n:"Permis de construire & taxes",q:1,u:"forfait",up:p},
    {n:"Honoraires architecte/bureau d'études",q:1,u:"forfait",up:Math.round(total*0.03)},
    {n:"Assurance chantier Tous Risques",q:1,u:"forfait",up:Math.round(total*0.005)},
    {n:"Étude géotechnique G1+G2",q:1,u:"forfait",up:2500},
    {n:"Frais raccordement eau+électricité",q:1,u:"forfait",up:1500},
  ];
  const mapped = items.map(i => ({name:i.n,quantity:i.q,unit:i.u,unitPrice:i.up,totalPrice:Math.round(i.q*i.up)}));
  return {items:mapped, total:mapped.reduce((s,i) => s + i.totalPrice, 0)};
}

function estimateDuration(s: number, fl: number, cat: string): string {
  const tb = s * (fl || 1);
  if (cat.startsWith("renovation")) return `${Math.max(1, Math.round(tb/60))} mois`;
  if (["pergola","terrasse","cloture","mur_de_separation","trottoir","garage"].includes(cat)) return `${Math.max(1, Math.round(tb/80))} mois`;
  if (cat==="piscine") return `${Math.max(2, Math.round(s/15))} mois`;
  if (["jardin","amenagement_paysager","aire_de_jeux"].includes(cat)) return `${Math.max(1, Math.round(tb/150))} mois`;
  if (cat==="installation_solaire") return `${Math.max(1, Math.round(tb/100))} mois`;
  return `${Math.max(2, Math.round(tb/50*(fl||1)))} mois`;
}

function genTips(cat: string, s: number, reg?: string, fLvl?: string, mt?: Record<string,number>): string[] {
  const t: string[] = [];
  if (mt) {
    const go = (mt.gros_oeuvre||0)/(Object.values(mt).reduce((a,b) => a+b,0)||1);
    if (go > 0.45) t.push("Le gros œuvre est important. Envisagez blocs béton cellulaire pour réduire poids et fondations.");
  }
  t.push("Privilégiez matériaux locaux tunisiens (ciment Bizerte, carrelage Kairouan, marbre Thala) pour réduire transport.");
  if (s > 200) t.push("Pour >200m², négociez tarifs de gros fournisseurs pour 5-10% de réduction.");
  if (cat==="maison"||cat==="villa") {
    t.push("Plan carré = 15% plus économique qu'un plan complexe. Optimisez le ratio surface/volume.");
    t.push("Briques alvéolaires 10cm pour cloisons : 20% moins cher et meilleure isolation.");
  }
  if (cat==="piscine") {
    t.push("Revêtement liner plutôt que mosaïque : économie de 30%.");
    t.push("Pompe à vitesse variable pour -40% consommation électrique.");
  }
  if (cat.startsWith("renovation")) {
    t.push("Conservez structures existantes (murs porteurs, charpente) quand possible : 70% du coût.");
    t.push("Peinture lessivable pour pièces humides : durée de vie doublée.");
  }
  if (reg && ["tunis","ariana","ben_arous"].includes(reg)) t.push("Région Tunis : prix 10-15% plus élevés. Achetez en vrac et stockez.");
  t.push("Scénario Économique -25% : matériaux qualité standard, finitions simples.");
  t.push("Regroupez achats ciment+sable+gravier pour remises 5-8%.");
  return t.slice(0,8);
}

function genTechRecs(cat: string, s: number, fl: number): string[] {
  const r: string[] = [];
  if (fl >= 3) {
    r.push("Étude de sol G2 obligatoire pour >3 étages.");
    r.push("Béton dosé 350kg/m³ minimum pour éléments porteurs verticaux.");
  }
  if (s > 150) {
    r.push("Joint de dilatation tous les 25-30m pour éviter fissures thermiques.");
    r.push("Drainage périphérique (drain français) pour protéger fondations.");
  }
  if (cat==="piscine") r.push("Ferraillage acier galvanisé/inox anti-corrosion.","Test étanchéité 72h minimum.");
  if (cat==="toiture") r.push("Pente minimale tuile canal 27%. Isolation R ≥ 2.5 m².K/W.");
  if (cat==="installation_solaire") r.push("Orientation sud, inclinaison 30-35° pour Tunisie.","Parafoudre et mise à terre NF C 15-100.");
  if (cat.startsWith("renovation")) r.push("Vérifier amiante avant démolition.","Renforcer planchers si changement d'usage.");
  r.push("Norme tunisienne NT 47.01 : maison 150 kg/m², bureau 250 kg/m².");
  r.push("Vide sanitaire ≥ 30cm pour aération et isolation plancher bas.");
  return r.slice(0,8);
}

function detectAnomalies(cat: string, s: number, fl: number) {
  const a: any[] = [];
  if (s > 500 && (!fl || fl===1)) a.push({type:"Dimension excessive",severity:"moyenne",desc:`Surface ${s}m² sur un seul niveau.`,rec:"Envisager un étage pour réduire emprise au sol."});
  if (fl && fl >= 5) a.push({type:"Hauteur importante",severity:"élevée",desc:`${fl} étages = ascenseur obligatoire.`,rec:"Prévoir ascenseur PMR et voies d'évacuation incendie."});
  if (s < 20 && !["terrasse","pergola","garage"].includes(cat)) a.push({type:"Surface insuffisante",severity:"faible",desc:`${s}m² très réduit pour ce projet.`,rec:"Vérifier les dimensions saisies."});
  if (cat==="piscine" && s > 200) a.push({type:"Piscine très grande",severity:"moyenne",desc:`${s}m² coûts d'entretien élevés.`,rec:"Chauffage solaire pour réduire coûts énergétiques."});
  return a.map(x => ({type:x.type,severity:x.severity,description:x.desc,recommendation:x.rec}));
}

export function runBIMEstimation(
  category: string, surface: number, floors: number,
  region?: string, finishLevel?: string
) {
  const pct = PROJECT_PCT[category] || [35, 30, 15, 10, 3, 7];
  const rMult = region ? (REGION_MULTIPLIER[region] || 1.0) : 1.0;
  const fMult = finishLevel ? (FINISH_MULTIPLIER[finishLevel] || 1.0) : 1.0;

  const go = calcGO(surface, floors, category);
  const so = calcSO(surface, floors, category);
  const eq = calcEQ(surface, floors, category);
  const mo = calcMO(surface, floors, category);
  const tr = calcTR(surface, floors);
  const ei = calcEI(go.total + so.total + eq.total + mo.total + tr.total);

  const rawTotal = go.total + so.total + eq.total + mo.total + tr.total + ei.total;
  const target = Math.round(rawTotal * rMult * fMult);
  const rawVals = [go.total, so.total, eq.total, mo.total, tr.total, ei.total];
  const rawSum = rawVals.reduce((a,b) => a+b, 0) || 1;
  const keys = ["gros_oeuvre","second_oeuvre","equipements","main_oeuvre","transport","etudes_imprevus"];
  const labels = ["Gros œuvre","Second œuvre","Équipements","Main-d'œuvre","Transport","Études, permis & imprévus"];
  const allItems = [go.items, so.items, eq.items, mo.items, tr.items, ei.items];

  const macroTotals: Record<string, number> = {};
  const macroItems: Record<string, any[]> = {};
  keys.forEach((k, i) => {
    const targetPct = pct[i] / 100;
    const targeted = Math.round(target * targetPct);
    const scale = targeted / (rawVals[i] || 1);
    const items = allItems[i].map(item => ({
      ...item,
      totalPrice: Math.round(item.totalPrice * scale),
      unitPrice: Math.round(item.unitPrice * scale),
    }));
    macroTotals[k] = targeted;
    macroItems[k] = items;
  });

  const sumCheck = keys.reduce((s,k) => s + macroTotals[k], 0);
  const diff = target - sumCheck;
  if (diff !== 0) macroTotals.main_oeuvre = (macroTotals.main_oeuvre || 0) + diff;

  const breakdown = keys.map((k,i) => ({
    category: k, label: labels[i],
    estimatedCost: macroTotals[k], percentage: pct[i],
    items: macroItems[k],
  }));

  const finalTotal = keys.reduce((s,k) => s + macroTotals[k], 0);
  const contingencyPct = 5;
  const buffer = Math.round(finalTotal * contingencyPct / 100);
  const totalWithBuffer = finalTotal + buffer;
  const costM2 = surface > 0 ? Math.round(totalWithBuffer / surface) : 0;

  const scenarios = {
    economique: { label:"Économique", totalCost: Math.round(totalWithBuffer*0.75), costPerM2: Math.round(costM2*0.75), multiplier:0.75 },
    standard: { label:"Standard", totalCost: totalWithBuffer, costPerM2: costM2, multiplier:1.0 },
    premium: { label:"Premium", totalCost: Math.round(totalWithBuffer*1.35), costPerM2: Math.round(costM2*1.35), multiplier:1.35 },
  };

  let confidence = 0.85;
  if (!region) confidence -= 0.05;
  if (!finishLevel) confidence -= 0.03;
  if (surface <= 0) confidence -= 0.15;
  if (surface < 30) confidence -= 0.08;
  if (category === "projet_personnalise") confidence -= 0.10;
  confidence = Math.max(0.3, Math.min(1.0, confidence));

  const laborTotal = macroTotals.main_oeuvre || 0;
  const totalDays = Math.round(laborTotal / 65);
  const avgWorkers = Math.max(1, Math.round(totalDays / 26));

  const anomalies = detectAnomalies(category, surface, floors);
  const duration = estimateDuration(surface, floors, category);

  return {
    costEstimate: {
      totalCost: totalWithBuffer,
      costPerSquareMeter: costM2,
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
      rawAnalysis: "Analyse BIM basée sur les prix Tunisie 2026",
    },
    optimizationTips: genTips(category, surface, region, finishLevel, macroTotals),
    technicalRecommendations: genTechRecs(category, surface, floors),
  };
}

function getMethods(cat: string): string[] {
  if (cat==="piscine") return ["Béton projeté gunite","Coffrage traditionnel","Revêtement mosaïque","Filtration à sable"];
  if (cat==="installation_solaire") return ["Structures métalliques sur toiture","Raccordement STEG","Batteries Lithium-ion"];
  if (cat.startsWith("renovation")) return ["Démolition sélective","Renforcement structurel","Enduit projeté","Peinture acrylique"];
  if (["jardin","amenagement_paysager"].includes(cat)) return ["Terrassement mécanique","Drainage agricole","Irrigation goutte-à-goutte","Plantation manuelle"];
  return ["Fondations semelles filantes","Maçonnerie briques creuses","Dalle pleine béton armé","Enduit ciment projeté","Carrelage collé"];
}
