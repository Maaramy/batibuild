// ============================================================================
// Synchronisation du catalogue matériaux « Prix Tunisie 2026 » avec le
// référentiel officiel Batibuild (fichier Excel « Base matériaux », 491 refs).
//
// Principe : les désignations du catalogue interne restent canoniques (elles
// sont référencées par les moteurs BIM/DQE) — seuls prix, unités compatibles,
// qualité, confiance et SKU officiels sont rafraîchis.
//
// Usage : bun scripts/sync-catalog-2026.mjs <chemin-vers.xlsx>
// ============================================================================
import XLSX from "xlsx";
import fs from "fs";

const [, , xlsxPath = "/tmp/tarifs2026.xlsx", outPath = "src/convex/materialCatalog2026.ts"] =
  process.argv;

const SRC = "src/convex/materialCatalog2026.ts";
const src = fs.readFileSync(SRC, "utf8");

// ── Lecture du référentiel Excel ────────────────────────────────────────────
const wb = XLSX.readFile(xlsxPath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Base matériaux"]);
const excel = new Map(rows.map((r) => [r["ID matériau"], r]));
console.log(`Référentiel Excel : ${excel.size} références`);

// ── Correspondances curated (ancien nom → SKU officiel) ────────────────────
// Revues à la main à partir de la comparaison sémantique (catégorie +
// diamètres/dimensions + conditionnement + unité).
const MANUAL_MAP = {
  // Liants, ciments et mortiers
  "Ciment CPJ 42.5 (sac 50 kg)": "MAT-0001",
  "Mortier sec prêt à gâcher (sac 25 kg)": "MAT-0137",
  "Enduit de ciment bâtard (sac 25 kg)": "MAT-0145",
  "Ciment réfractaire (sac 25 kg)": "MAT-0143",
  "Chaux éteinte CL90 (sac 25 kg)": "MAT-0135",
  // Acier et métaux
  "Acier à béton T12 (tonne)": "MAT-0165",
  "Fer à béton HA T6 (barre 12 m)": "MAT-0004",
  "Fer à béton HA T8 (barre 12 m)": "MAT-0005",
  "Fer à béton HA T10 (barre 12 m)": "MAT-0006",
  "Fer à béton HA T12 (barre 12 m)": "MAT-0007",
  "Fer à béton HA T14 (barre 12 m)": "MAT-0008",
  "Fer à béton HA T16 (barre 12 m)": "MAT-0009",
  "Treillis soudé ST25 (panneau)": "MAT-0170",
  "Fil d'attache recuit (kg)": "MAT-0169",
  "Cornière 30×30×3": "MAT-0172",
  "Bac acier nervuré (m²)": "MAT-0259",
  // Bétons
  "Béton de propreté 150 kg/m³": "MAT-0146",
  "Béton prêt à l'emploi 250 kg/m³": "MAT-0147",
  "Béton prêt à l'emploi 300 kg/m³": "MAT-0148",
  "Béton prêt à l'emploi 350 kg/m³": "MAT-0149",
  // Maçonnerie / préfabrication (parpaing = bloc béton creux : SKU partagé)
  "Bloc béton creux 20×20×40": "MAT-0156",
  "Bloc béton plein 20×20×40": "MAT-0157",
  "Parpaing creux 10 cm": "MAT-0154",
  "Parpaing creux 15 cm": "MAT-0155",
  "Parpaing creux 20 cm": "MAT-0156",
  "Parpaing plein 20 cm": "MAT-0157",
  "Caniveau béton préfabriqué": "MAT-0162",
  "Bordure béton préfabriquée": "MAT-0101",
  "Bordures béton T2": "MAT-0161",
  // Terrassement et granulats
  "Sable de construction 0/4": "MAT-0122",
  "Gravier concassé 8/15": "MAT-0127",
  "Gravier concassé 15/25": "MAT-0128",
  "Tout-venant 0/31.5": "MAT-0117",
  "Terre végétale (apport)": "MAT-0120",
  // Revêtements
  "Carrelage grès cérame 60×60 (m²)": "MAT-0273",
  "Faïence 20×30 (m²)": "MAT-0277",
  "Carrelage extérieur antidérapant (m²)": "MAT-0278",
  "Pavé autobloquant (m²)": "MAT-0158",
  "Plinthe céramique (ml)": "MAT-0285",
  // Peintures (seau 15 L converti au litre)
  "Peinture intérieure mate (L)": { sku: "MAT-0293", priceFactor: 1 / 15 },
  "Peinture extérieure acrylique (L)": { sku: "MAT-0296", priceFactor: 1 / 15 },
  "Enduit de lissage (kg)": { sku: "MAT-0305", priceFactor: 1 / 25 },
  // Menuiseries
  "Porte intérieure bois pleine": "MAT-0320",
  "Porte d'entrée métallique": "MAT-0324",
  // Équipements / énergies
  "Câble solaire 6 mm² (ml)": "MAT-0444",
  "Gazon synthétique (m²)": "MAT-0480",
};

// Correspondances interdites même si le score automatique est élevé
// (produits réellement différents malgré des libellés proches).
const EXCLUDE = {
  "Ciment CPJ 42.5 (sac 50 kg)": ["MAT-0003"], // HRS ≠ CPJ
  "Fer à béton HA T10 (barre 12 m)": ["MAT-0166", "MAT-0167", "MAT-0168"],
};

// ── Outils de comparaison ───────────────────────────────────────────────────
const STOP = new Set(["de", "et", "en", "le", "la", "a", "au", "du", "pour", "d", "x"]);
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const toks = (s) => norm(s).replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t && !STOP.has(t));
const nums = (s) =>
  (norm(s).match(/\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?)*/g) || []).map((x) => x.replace(",", "."));
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  const i = [...A].filter((x) => B.has(x)).length;
  return i / new Set([...A, ...b, ...a]).size;
}
function numOk(a, b) {
  const A = nums(a), B = nums(b);
  if (!A.length || !B.length) return true;
  const c = A.filter((x) => B.includes(x)).length;
  return c / Math.max(new Set([...A, ...B]).size, 1) >= 0.5;
}
const UG = (u) => {
  const n = norm(u).replace("²", "2").replace("³", "3");
  if (["ml", "m", "barre"].includes(n)) return "L";
  if (["m2"].includes(n)) return "S";
  if (["m3"].includes(n)) return "V";
  if (["kg", "t", "tonne"].includes(n)) return "M";
  return "U:" + n;
};
const CATMAP = {
  "Terrassement et granulats": "terrassement_granulats",
  "Liants, ciments et mortiers": "liants_ciments_mortiers",
  "Bétons et préfabrication": "betons_prefabrication",
  "Acier et métaux de structure": "acier_metaux_structure",
  "Maçonnerie et éléments de plancher": "maconnerie_plancher",
  "Bois, panneaux et coffrage": "bois_panneaux_coffrage",
  "Étanchéité et protection": "etancheite_protection",
  "Isolation thermique et acoustique": "isolation_thermique",
  "Cloisons, plâtre et plafonds": "cloisons_platre_plafonds",
  "Toitures, bardages et façades": "toitures_bardages_facades",
  "Revêtements de sols et murs": "revetements_sols_murs",
  "Peintures, enduits et finitions": "peintures_enduits_finitions",
  Menuiseries: "menuiseries",
  "Vitrage et produits verriers": "vitrage_verriers",
  "Chimie de construction": "chimie_construction",
  "Quincaillerie et fixations": "quincaillerie_fixations",
  "Éclairage": "eclairage",
  "CVC, chauffage et ventilation": "cvc_chauffage_ventilation",
  "Énergies renouvelables": "energies_renouvelables",
  "Sécurité incendie et sûreté": "securite_incendie_surete",
  "Voirie, réseaux divers et drainage": "voirie_reseaux_drainage",
  "Aménagements extérieurs": "amenagements_exterieurs",
  "Matériaux durables et biosourcés": "materiaux_durables_biosources",
  "Électricité – courants forts": "equipements",
  "Plomberie et évacuation": "equipements",
  "Sanitaires et robinetterie": "equipements",
};
const QUALITY = {
  "Observé en ligne": "observé_en_ligne",
  "Observé – publication 2026": "publication_2026",
  "Estimation indicative 2026": "estimation_indicative",
};
const CONFIDENCE = { "Élevée": 0.9, "Moyenne": 0.7, "Faible": 0.5 };

// ── Parsing du catalogue actuel ─────────────────────────────────────────────
const entryRe =
  /\{ category: "([a-z_]+)", name: "((?:[^"\\]|\\.)*)", unit: "([^"]+)", unitPrice: ([0-9.]+)(?:, quality: (\w+))?(?:, confidence: ([0-9.]+))?(?:, subcategory: "([^"]*)")?(?:, sku: "([A-Z]+-\d+)")? \}/g;
/** @type {{category:string,name:string,unit:string,unitPrice:number,quality:string|null,confidence:number|null,subcategory:string|null,sku:string|null}[]} */
const legacy = [];
let m;
while ((m = entryRe.exec(src))) {
  legacy.push({
    category: m[1],
    name: m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'),
    unit: m[3],
    unitPrice: +m[4],
    quality: m[5] || null,
    confidence: m[6] ? +m[6] : null,
    subcategory: m[7] || null,
    sku: m[8] || null,
  });
}
if (legacy.length < 400) throw new Error(`Parsing catalogue suspect : ${legacy.length} entrées`);

// Index Excel par slug de catégorie pour l'auto-match
const bySlug = new Map();
for (const r of rows) {
  const slug = CATMAP[r["Catégorie"]];
  if (!slug) continue;
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push(r);
}

const usedSkus = new Set();
let updated = 0, kept = 0, manual = 0, auto = 0;
/** @type {Map<string,{sku:string,newPrice:number,newUnit:string,quality:string,confidence:number}>} */
const syncData = new Map();

for (const e of legacy) {
  let ref = null;
  // 1) correspondance curated (le partage de SKU est autorisé entre homologues,
  //    ex. « Parpaing creux 20 cm » = « Bloc béton creux 20×20×40 »)
  const rule = MANUAL_MAP[e.name];
  if (rule) {
    const sku = typeof rule === "string" ? rule : rule.sku;
    const cand = excel.get(sku);
    if (!cand) throw new Error(`SKU introuvable dans l'Excel : ${sku}`);
    ref = cand;
    usedSkus.add(sku);
    manual++;
  }
  // 2) correspondance automatique stricte
  if (!ref) {
    const banned = EXCLUDE[e.name] || [];
    const cands = (bySlug.get(e.category) || [])
      .filter((r) => !usedSkus.has(r["ID matériau"]) && !banned.includes(r["ID matériau"]))
      .map((r) => ({
        r,
        s: jaccard(toks(e.name), toks(r["Désignation normalisée"])),
        num: numOk(e.name, r["Désignation normalisée"]),
        unit: UG(e.unit) === UG(r["Unité de prix"]),
      }))
      .filter((c) => c.num && c.unit && c.s >= 0.75)
      .sort((a, b) => b.s - a.s);
    if (cands.length) {
      ref = cands[0].r;
      usedSkus.add(ref["ID matériau"]);
      auto++;
    }
  }
  if (!ref) { kept++; continue; }

  const factor = typeof rule === "object" && rule?.priceFactor ? rule.priceFactor : 1;
  const newPriceRaw = ref["Prix référence TTC (TND)"] * factor;
  const newPrice = Math.round(newPriceRaw * 100) / 100;
  const newUnitRaw = ref["Unité de prix"];
  // Unité : conservée si conversion de conditionnement, sinon alignée si compatible
  const sameGroup = UG(newUnitRaw) === UG(e.unit);
  const newUnit = !factor && sameGroup && newUnitRaw !== e.unit ? normalizeUnit(newUnitRaw) : null;
  syncData.set(e.name, {
    sku: ref["ID matériau"],
    newPrice,
    newUnit,
    quality: QUALITY[ref["Statut du prix"]] || null,
    confidence: CONFIDENCE[ref["Confiance"]] ?? null,
  });
  if (newPrice !== e.unitPrice || newUnit) updated++;
}
function normalizeUnit(u) {
  const map = { t: "tonne", U: "pièce", "m²": "m²", "m³": "m³" };
  return map[u] ?? u;
}

console.log(
  `Correspondances : curated=${manual}, auto=${auto}, non synchronisés=${kept}, ` +
    `entrées avec changement=${updated}`,
);

// ── Régénération du fichier ────────────────────────────────────────────────
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const out = [];
out.push(`// ============================================================================`);
out.push(`// CATALOGUE OFFICIEL 2026 — Base de données des matériaux de construction,`);
out.push(`// Tunisie (référentiel Batibuild — version du 26 août 2026). 26 catégories.`);
out.push(`// Prix en TND TTC issus du barème officiel « Matériaux de construction –`);
out.push(`// Prix Tunisie 2026 » ; chaque référence synchronisée porte son SKU officiel`);
out.push(`// (MAT-xxxx) permettant les mises à jour globales via l'import Excel admin.`);
out.push(`// priceQuality : observé_en_ligne | publication_2026 | estimation_indicative`);
out.push(`// ============================================================================`);
out.push("");
out.push(`export type CatalogItem = {`);
out.push(`  category: string;`);
out.push(`  name: string;`);
out.push(`  unit: string;`);
out.push(`  unitPrice: number;`);
out.push(`  quality?: "observé_en_ligne" | "publication_2026" | "estimation_indicative";`);
out.push(`  confidence?: number;`);
out.push(`  subcategory?: string;`);
out.push(`  /** Référence officielle du barème Batibuild Tunisie 2026 (MAT-xxxx). */`);
out.push(`  sku?: string;`);
out.push(`};`);
out.push("");
out.push(`const OBSERVED = "observé_en_ligne" as const;`);
out.push(`const PUBLISHED = "publication_2026" as const;`);
out.push(`const ESTIMATED = "estimation_indicative" as const;`);
out.push("");

// Conserver la structure par sections du fichier d'origine
const sectionOrder = [];
const seen = new Set();
for (const match of src.matchAll(/── (.+) ─+/g)) {
  if (!seen.has(match[1])) { seen.add(match[1]); sectionOrder.push(match[1]); }
}
// Regrouper les entrées par catégorie dans l'ordre des sections d'origine
const CAT_LABELS = {
  terrassement_granulats: "Terrassement et granulats",
  liants_ciments_mortiers: "Liants, ciments et mortiers",
  betons_prefabrication: "Bétons et préfabrication",
  acier_metaux_structure: "Acier et métaux de structure",
  maconnerie_plancher: "Maçonnerie et éléments de plancher",
  bois_panneaux_coffrage: "Bois, panneaux et coffrage",
  etancheite_protection: "Étanchéité et protection",
  isolation_thermique: "Isolation thermique et acoustique",
  cloisons_platre_plafonds: "Cloisons, plâtre et plafonds",
  toitures_bardages_facades: "Toitures, bardages et façades",
  revetements_sols_murs: "Revêtements de sols et murs",
  peintures_enduits_finitions: "Peintures, enduits et finitions",
  menuiseries: "Menuiseries",
  vitrage_verriers: "Vitrage et produits verriers",
  chimie_construction: "Chimie de construction",
  quincaillerie_fixations: "Quincaillerie et fixations",
  eclairage: "Éclairage",
  cvc_chauffage_ventilation: "CVC, chauffage et ventilation",
  energies_renouvelables: "Énergies renouvelables",
  securite_incendie_surete: "Sécurité incendie et sûreté",
  voirie_reseaux_drainage: "Voirie, réseaux divers et drainage",
  amenagements_exterieurs: "Aménagements extérieurs",
  materiaux_durables_biosources: "Matériaux durables et biosourcés",
  equipements: "Équipements (électricité, plomberie, sanitaires)",
};

const grouped = new Map();
for (const e of legacy) {
  if (!grouped.has(e.category)) grouped.set(e.category, []);
  grouped.get(e.category).push(e);
}

out.push(`export const TUNISIA_2026_CATALOG: CatalogItem[] = [`);
let total = 0;
for (const [cat, label] of Object.entries(CAT_LABELS)) {
  const entries = grouped.get(cat);
  if (!entries?.length) continue;
  out.push(`  // ── ${label} ${"─".repeat(Math.max(4, 74 - label.length))}`);
  for (const e of entries) {
    const sd = syncData.get(e.name);
    const parts = [
      `category: "${e.category}"`,
      `name: "${esc(e.name)}"`,
      `unit: "${esc(sd?.newUnit ?? e.unit)}"`,
      `unitPrice: ${sd ? sd.newPrice : e.unitPrice}`,
      `quality: ${(sd?.quality ?? e.quality ?? "ESTIMATED").startsWith("observé") ? "OBSERVED" : (sd?.quality ?? e.quality ?? "ESTIMATED").startsWith("publication") ? "PUBLISHED" : "ESTIMATED"}`,
    ];
    const conf = sd?.confidence ?? e.confidence;
    if (conf != null) parts.push(`confidence: ${conf}`);
    if (e.subcategory) parts.push(`subcategory: "${esc(e.subcategory)}"`);
    const sku = sd ? sd.sku : e.sku;
    if (sku) parts.push(`sku: "${sku}"`);
    out.push(`  { ${parts.join(", ")} },`);
    total++;
  }
  out.push("");
}
out.push(`];`);
out.push("");
fs.writeFileSync(outPath, out.join("\n") + "\n");
console.log(`Fichier régénéré : ${outPath} (${total} entrées)`);
