// ============================================================================
// Construction AI Copilot — moteur déterministe (sans dépendances Convex)
//   - Détection & exécution de calculs techniques (béton, ciment, prix/m²…)
//   - Recherche RAG par mots-clés dans la base de connaissances
//   - Extraction de mémoire à partir d'une décision utilisateur
//   - Formatage monétaire / nombres (TND)
// ============================================================================

// ----------------------------------------------------------------------------
// Calculs
// ----------------------------------------------------------------------------

export type CalcKind =
  | "concrete_volume"      // Volume de béton (m³) à partir d'une surface + épaisseur
  | "cement_bags"          // Nombre de sacs de ciment pour un volume donné
  | "concrete_mix"         // Dosage d'un béton (ciment, sable, gravier)
  | "price_per_m2"         // Prix au m² à partir d'un coût total et d'une surface
  | "bricks_wall"          // Quantité de briques/parpaings pour un mur
  | "paint_quantity"       // Litres de peinture pour une surface et un nombre de couches
  | "roi"                  // Rentabilité locative (rendement net, délai de retour)
  | "transport_cost"       // Coût de transport
  | "plaster_quantity"     // Enduit / plâtre pour une surface
  | "tiles_quantity"       // Carrelage (m² + chutes)
  | "duration_estimate";   // Durée de chantier approximative

export interface CalculationInput {
  kind: CalcKind;
  label: string;
  surface?: number;        // m²
  thicknessCm?: number;    // cm
  volumeM3?: number;       // m³
  dosageKgM3?: number;     // kg de ciment par m³ (default 350)
  length?: number;         // m
  height?: number;         // m
  totalCost?: number;      // TND
  coats?: number;
  monthlyRent?: number;
  annualCosts?: number;
  distanceKm?: number;
  trips?: number;
  pricePerTrip?: number;
}

export interface CalculationResult {
  kind: CalcKind;
  label: string;
  summary: string;                    // Phrase récapitulative
  assumptions: string[];              // Hypothèses utilisées
  values: { label: string; value: string }[];
}

const TND = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR")} TND`;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

function bad(label: string, why: string): CalculationResult {
  return {
    kind: "price_per_m2" as CalcKind,
    label,
    summary: `Impossible de calculer : ${why}.`,
    assumptions: [why],
    values: [],
  };
}

/** Convertit un volume en sacs de ciment (sac de 50 kg). */
export function cementBagsForVolume(volumeM3: number, dosageKgM3 = 350): number {
  const totalKg = volumeM3 * dosageKgM3;
  return Math.ceil(totalKg / 50);
}

/** Règles de dosage usuelles (béton courant, Tunisie) — par m³ de béton. */
export function concreteMixForVolume(volumeM3: number, dosageKgM3 = 350) {
  // Ordres de grandeur courants (fondations / dalles / poteaux)
  const cementKg = volumeM3 * dosageKgM3;
  const sandM3 = volumeM3 * 0.4;
  const gravelM3 = volumeM3 * 0.8;
  return {
    cementBags: cementBagsForVolume(volumeM3, dosageKgM3),
    cementKg,
    sandM3: round2(sandM3),
    gravelM3: round2(gravelM3),
  };
}

/** Brique creuse 10 cm ≈ 40 u/m² · 15 cm ≈ 32 u/m² · parpaing 20 cm ≈ 12,5 u/m² (avec joints). */
export function bricksForWall(length: number, height: number, kind: "brique10" | "brique15" | "parpaing20" = "parpaing20") {
  const area = length * height;
  const perM2 =
    kind === "brique10" ? 40 : kind === "brique15" ? 32 : 12.5;
  const units = Math.ceil(area * perM2);
  const mortarM3 = kind === "parpaing20" ? area * 0.02 : area * 0.025;
  return { area: round2(area), units, mortarM3: round2(mortarM3), perM2 };
}

/** Peinture : ~0,1 L/m² par couche (rendement 10 m²/L). */
export function paintForSurface(surface: number, coats = 2) {
  const litersPerM2 = 0.1;
  const liters = surface * coats * litersPerM2;
  return {
    liters: round1(liters),
    litersPerM2,
    coats,
  };
}

/** Carrelage : +5 à 8 % de chutes selon la pose (pose droite vs diagonale). */
export function tilesForSurface(surface: number, diagonal = false) {
  const wastePct = diagonal ? 0.08 : 0.05;
  const total = surface * (1 + wastePct);
  return {
    netM2: round2(surface),
    totalM2: round2(total),
    wastePct: Math.round(wastePct * 100),
  };
}

/** Enduit/plâtre : ~1,5 kg/m² par cm d'épaisseur, épaisseur type 1,5 cm. */
export function plasterForSurface(surface: number, thicknessCm = 1.5) {
  const kgPerM2 = 1.5 * thicknessCm;
  const kg = surface * kgPerM2;
  return { kg: Math.round(kg), kgPerM2: round2(kgPerM2), thicknessCm };
}

/** Durée de chantier très approximative (maison standard TN). */
export function durationForSurface(surface: number, floors = 1, category = "maison") {
  const baseDays = category === "immeuble" || category === "entrepot" ? 60 : 45;
  const extra = Math.max(0, (surface - 100) / 40);
  const totalDays = Math.round(baseDays + extra * (floors || 1));
  return {
    totalDays,
    months: round1(totalDays / 22),
    phases: [
      { phase: "Terrassement & fondations", days: Math.round(totalDays * 0.2) },
      { phase: "Gros œuvre (murs, poteaux, dalles)", days: Math.round(totalDays * 0.35) },
      { phase: "Toiture & étanchéité", days: Math.round(totalDays * 0.1) },
      { phase: "Second œuvre & finitions", days: Math.round(totalDays * 0.35) },
    ],
  };
}

/** Rentabilité locative : rendement net + délai de retour. */
export function roiForPurchase(
  purchasePrice: number,
  monthlyRent: number,
  annualCosts = 0,
) {
  const grossAnnual = monthlyRent * 12;
  const netAnnual = grossAnnual - annualCosts;
  const grossYield = purchasePrice > 0 ? (grossAnnual / purchasePrice) * 100 : 0;
  const netYield = purchasePrice > 0 ? (netAnnual / purchasePrice) * 100 : 0;
  const paybackYears = netAnnual > 0 ? purchasePrice / netAnnual : Infinity;
  return {
    grossAnnual,
    netAnnual,
    grossYield: round2(grossYield),
    netYield: round2(netYield),
    paybackYears: isFinite(paybackYears) ? round2(paybackYears) : null,
    monthlyCashflow: monthlyRent - (annualCosts / 12),
  };
}

// ── Détection du type de calcul à partir de la question ────────────────────

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const grabNumber = (s: string, patterns: RegExp[]): number | null => {
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const raw = m[1].replace(",", ".");
      const n = parseFloat(raw);
      if (isFinite(n)) return n;
    }
  }
  return null;
};

/** Joint les groupes de milliers (« 480 000 » → « 480000 ») pour faciliter le parsing. */
function joinThousands(s: string): string {
  let out = s;
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(/(\d)\s+(\d{3})\b/g, "$1$2");
  }
  return out;
}

/** Essaie de comprendre une question de calcul. Retourne null si aucune correspondance. */
export function detectCalculation(message: string): CalculationInput | null {
  const q = norm(message);
  const s = joinThousands(q);

  // 1) Volume de béton : « dalle de 250 m² épaisseur 20 cm »
  if (/beton|dalle|radier|poteau|poutre|fondation/.test(s) && /m2|m²|metre carre/.test(s)) {
    const surface = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metres?\s*carres?|metre\s*carre)/]);
    const thicknessCm = grabNumber(s, [
      /epaisseur(?:s)?\s*(?:de|d'|a)?\s*(\d+(?:[.,]\d+)?)\s*cm/,
      /(\d+(?:[.,]\d+)?)\s*cm\s*d'epaisseur/,
      /(\d+(?:[.,]\d+)?)\s*cm/,
    ]);
    if (surface) {
      return {
        kind: "concrete_volume",
        label: "Volume de béton",
        surface,
        thicknessCm: thicknessCm ?? 20,
      };
    }
  }

  // 2) Sacs de ciment : « combien de ciment pour 5 m³ »
  if (/ciment/.test(s) && /m3|m³|metre cube/.test(s)) {
    const volumeM3 = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:m3|m³|metres?\s*cubes?|metre\s*cube)/]);
    if (volumeM3) {
      return { kind: "cement_bags", label: "Sacs de ciment", volumeM3 };
    }
  }

  // 3) Prix au m² : « combien ça coûte au m² » / « prix au mètre carré »
  if (/prix\s*(?:au|par)?\s*(?:m2|m²|metre\s*carre)|m2\s*(?:de|d')\s*(?:cout|prix)|cout\s*au\s*m2/.test(s)) {
    const totalCost = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:tnd|dt|dinars?)/]);
    const surface = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/]);
    if (totalCost && surface) {
      return { kind: "price_per_m2", label: "Prix au m²", totalCost, surface };
    }
    if (surface) {
      return { kind: "price_per_m2", label: "Prix au m²", surface };
    }
  }

  // 4) Mur de briques/parpaings : « mur de 12 m sur 3 m »
  if (/brique|parpaing|maconnerie|mur/.test(s)) {
    const lengths = [...s.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:m|metres?)\b/g)].map((m) => parseFloat(m[1].replace(",", ".")));
    if (lengths.length >= 2 && /brique|parpaing/.test(s)) {
      const [a, b] = lengths;
      const kind = /parpaing/.test(s) ? "parpaing20" : /brique.*10|10.*brique/.test(s) ? "brique10" : "brique15";
      return {
        kind: "bricks_wall",
        label: kind === "parpaing20" ? "Mur en parpaings" : "Mur en briques",
        length: Math.max(a, b),
        height: Math.min(a, b),
      } as CalculationInput;
    }
  }

  // 5) Peinture : « peinture pour 120 m² » (avec couches)
  if (/peinture|repeindre/.test(s) && /m2|m²/.test(s)) {
    const surface = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/]);
    const coats = grabNumber(s, [/(\d+)\s*(?:couches?|passes?)/]);
    if (surface) {
      return { kind: "paint_quantity", label: "Quantité de peinture", surface, coats: coats ?? 2 };
    }
  }

  // 6) ROI / rentabilité
  if (/roi|rendement|rentabilite|retour sur investissement|locat|investissement|loyer|achat/.test(s)) {
    const purchasePrice = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:tnd|dt|dinars?)/]);
    const monthlyRent = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:tnd|dt)\s*(?:\/|\/mois|par mois|de loyer|de loyer mensuel|mensuel)/]);
    const rentAlt = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:\/|\/mois|par mois|mensuel)/]);
    if (purchasePrice && (monthlyRent ?? rentAlt)) {
      return {
        kind: "roi",
        label: "Rentabilité locative",
        totalCost: purchasePrice,
        monthlyRent: monthlyRent ?? rentAlt ?? 0,
      };
    }
  }

  // 7) Transport
  if (/transport|livraison|voyages?/.test(s)) {
    const trips = grabNumber(s, [/(\d+)\s*(?:voyages?|camions?|benne)/]);
    const pricePerTrip = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:tnd|dt|dinars?)/]);
    const distanceKm = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*km/]);
    if (trips && (pricePerTrip || distanceKm)) {
      return {
        kind: "transport_cost",
        label: "Coût de transport",
        trips,
        pricePerTrip: pricePerTrip ?? 90,
        distanceKm: distanceKm ?? 40,
      };
    }
  }

  // 8) Durée de chantier
  if (/duree|combien de temps|delai|chantier/.test(s)) {
    const surface = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/]);
    if (surface) {
      return { kind: "duration_estimate", label: "Durée estimée du chantier", surface };
    }
  }

  // 9) Carrelage
  if (/carrelage|dallage|faience|sol/.test(s) && /m2|m²/.test(s)) {
    const surface = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/]);
    if (surface) {
      return { kind: "tiles_quantity", label: "Carrelage", surface };
    }
  }

  // 10) Plâtre / enduit
  if (/platre|enduit|lissage/.test(s) && /m2|m²/.test(s)) {
    const surface = grabNumber(s, [/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)/]);
    if (surface) {
      return { kind: "plaster_quantity", label: "Enduit / plâtre", surface };
    }
  }

  return null;
}

/** Exécute un calcul et retourne un résultat lisible. */
export function runCalculation(input: CalculationInput): CalculationResult {
  const { kind, label } = input;

  switch (kind) {
    case "concrete_volume": {
      const surface = input.surface ?? 0;
      const t = (input.thicknessCm ?? 20) / 100;
      const volume = surface * t;
      const mix = concreteMixForVolume(volume, input.dosageKgM3 ?? 350);
      const value = `${round2(volume)} m³`;
      return {
        kind,
        label,
        summary: `Pour une dalle de ${Math.round(surface)} m² avec une épaisseur de ${input.thicknessCm ?? 20} cm, il faut environ ${value} de béton.`,
        assumptions: [
          `Surface : ${Math.round(surface)} m²`,
          `Épaisseur : ${input.thicknessCm ?? 20} cm`,
          `Dosage : ${input.dosageKgM3 ?? 350} kg/m³ (béton courant)`,
        ],
        values: [
          { label: "Volume de béton", value },
          { label: "Ciment", value: `${mix.cementBags} sacs (${mix.cementKg} kg)` },
          { label: "Sable", value: `${mix.sandM3} m³` },
          { label: "Gravier", value: `${mix.gravelM3} m³` },
        ],
      };
    }
    case "cement_bags": {
      const volume = input.volumeM3 ?? 0;
      const bags = cementBagsForVolume(volume, input.dosageKgM3 ?? 350);
      return {
        kind,
        label,
        summary: `Pour ${volume} m³ de béton à ${input.dosageKgM3 ?? 350} kg/m³, il faut environ ${bags} sacs de ciment de 50 kg.`,
        assumptions: [`Volume : ${volume} m³`, `Dosage : ${input.dosageKgM3 ?? 350} kg/m³`, "Sacs de 50 kg"],
        values: [
          { label: "Sacs de ciment 50 kg", value: `${bags}` },
          { label: "Poids total", value: `${bags * 50} kg` },
        ],
      };
    }
    case "price_per_m2": {
      if (!input.surface || input.surface <= 0) return bad(label, "la surface est manquante");
      if (!input.totalCost) {
        return {
          kind,
          label,
          summary: `Indiquez le coût total et la surface pour calculer le prix au m² (ex. « 480 000 TND pour 250 m² »).`,
          assumptions: [],
          values: [],
        };
      }
      const ppm2 = input.totalCost / input.surface;
      return {
        kind,
        label,
        summary: `Le prix au m² est d'environ ${TND(ppm2)} (${TND(input.totalCost)} ÷ ${Math.round(input.surface)} m²).`,
        assumptions: [`Coût total : ${TND(input.totalCost)}`, `Surface : ${Math.round(input.surface)} m²`],
        values: [{ label: "Prix au m²", value: TND(ppm2) }],
      };
    }
    case "bricks_wall": {
      const l = input.length ?? 0;
      const h = input.height ?? 0;
      const kind2 = /parpaing/.test(label) ? "parpaing20" : "brique15";
      const res = bricksForWall(l, h, kind2 as any);
      return {
        kind,
        label,
        summary: `Pour un mur de ${l} m × ${h} m (${res.area} m²), il faut environ ${res.units} unités${kind2 === "parpaing20" ? " de parpaings 20 cm" : " de briques"} (${res.perM2} u/m² avec joints).`,
        assumptions: [`Surface du mur : ${res.area} m²`, `Cadence : ${res.perM2} u/m² (avec joints)`],
        values: [
          { label: "Unités", value: `${res.units}` },
          { label: "Mortier", value: `${res.mortarM3} m³` },
        ],
      };
    }
    case "paint_quantity": {
      const s = input.surface ?? 0;
      const coats = input.coats ?? 2;
      const res = paintForSurface(s, coats);
      return {
        kind,
        label,
        summary: `Pour ${Math.round(s)} m² en ${coats} couche${coats > 1 ? "s" : ""}, prévoyez environ ${res.liters} litres de peinture (rendement 10 m²/L).`,
        assumptions: [`Surface : ${Math.round(s)} m²`, `Couches : ${coats}`, "Rendement : 10 m²/L"],
        values: [{ label: "Peinture", value: `${res.liters} L` }],
      };
    }
    case "roi": {
      const price = input.totalCost ?? 0;
      const rent = input.monthlyRent ?? 0;
      const res = roiForPurchase(price, rent, input.annualCosts ?? 0);
      return {
        kind,
        label,
        summary:
          res.paybackYears !== null
            ? `Rendement brut : ${res.grossYield} % · net : ${res.netYield} % — retour sur investissement ≈ ${res.paybackYears} ans.`
            : `Rendement brut : ${res.grossYield} % · net : ${res.netYield} % (loyers insuffisants pour un retour rapide).`,
        assumptions: [
          `Prix d'achat : ${TND(price)}`,
          `Loyer mensuel : ${TND(rent)}`,
          `Charges annuelles : ${TND(input.annualCosts ?? 0)}`,
        ],
        values: [
          { label: "Rendement brut", value: `${res.grossYield} %` },
          { label: "Rendement net", value: `${res.netYield} %` },
          ...(res.paybackYears !== null ? [{ label: "Délai de retour", value: `${res.paybackYears} ans` }] : []),
          { label: "Cash-flow mensuel", value: TND(res.monthlyCashflow) },
        ],
      };
    }
    case "transport_cost": {
      const trips = input.trips ?? 0;
      const per = input.pricePerTrip ?? 90;
      const total = trips * per;
      return {
        kind,
        label,
        summary: `Pour ${trips} voyage${trips > 1 ? "s" : ""} à ${TND(per)}/voyage, le transport coûte environ ${TND(total)}.`,
        assumptions: [`Voyages : ${trips}`, `Prix moyen par voyage : ${TND(per)}`],
        values: [{ label: "Coût total transport", value: TND(total) }],
      };
    }
    case "duration_estimate": {
      const s = input.surface ?? 0;
      const res = durationForSurface(s, input.trips ?? 1, "maison");
      return {
        kind,
        label,
        summary: `Pour une surface de ${Math.round(s)} m², prévoyez environ ${res.totalDays} jours de chantier (≈ ${res.months} mois).`,
        assumptions: ["Planning indicatif, hors aléas climatiques et administratifs"],
        values: res.phases.map((p) => ({ label: p.phase, value: `${p.days} j` })),
      };
    }
    case "tiles_quantity": {
      const s = input.surface ?? 0;
      const res = tilesForSurface(s, !!input.distanceKm && input.distanceKm > 0);
      return {
        kind,
        label,
        summary: `Pour ${Math.round(s)} m² de carrelage, commandez environ ${res.totalM2} m² (pose droite + ${res.wastePct} % de chutes).`,
        assumptions: [`Surface nette : ${res.netM2} m²`, `Chutes : ${res.wastePct} %`],
        values: [{ label: "Carrelage à commander", value: `${res.totalM2} m²` }],
      };
    }
    case "plaster_quantity": {
      const s = input.surface ?? 0;
      const res = plasterForSurface(s, input.thicknessCm ?? 1.5);
      return {
        kind,
        label,
        summary: `Pour ${Math.round(s)} m² d'enduit (${res.thicknessCm} cm), il faut environ ${res.kg} kg de plâtre/enduit (${res.kgPerM2} kg/m²).`,
        assumptions: [`Surface : ${Math.round(s)} m²`, `Épaisseur : ${res.thicknessCm} cm`],
        values: [{ label: "Enduit", value: `${res.kg} kg` }],
      };
    }
    default:
      return bad(label, "type de calcul non reconnu");
  }
}

// ----------------------------------------------------------------------------
// RAG — recherche par mots-clés dans la base de connaissances
// ----------------------------------------------------------------------------

export interface KnowledgeEntry {
  topic: string;
  keywords: string[];
  content: string;
  source?: string;
  reliability?: string;
}

const tokenize = (s: string): string[] => {
  const t = norm(s)
    .replace(/[^a-z0-9']+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2);
  return [...new Set(t)];
};

/**
 * Recherche les entrées de la base de connaissances les plus pertinentes pour
 * une question. Score = mots-clés trouvés (poids) + chevauchement de tokens.
 */
export function retrieveKnowledge(
  query: string,
  kb: KnowledgeEntry[],
  limit = 6,
): KnowledgeEntry[] {
  const qTokens = tokenize(query);
  const qNorm = norm(query);

  const scored = kb
    .map((entry) => {
      let score = 0;
      // Mots-clés explicites
      for (const kw of entry.keywords) {
        const k = norm(kw);
        if (qNorm.includes(k)) {
          score += 3 + (k.length >= 6 ? 1 : 0);
        }
      }
      // Chevauchement de tokens (entrée entière + topic)
      const entryTokens = tokenize(`${entry.topic} ${entry.content}`.slice(0, 400));
      for (const t of qTokens) {
        if (entryTokens.includes(t)) score += 1;
      }
      return { entry, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.entry);
}

// ----------------------------------------------------------------------------
// Mémoire — détection heuristique d'une décision à mémoriser
// ----------------------------------------------------------------------------

const DECISION_MARKERS = [
  "garde",
  "retenu",
  "retenons",
  "on choisit",
  "je choisis",
  "je prefere",
  "je prefere",
  "on prend",
  "je prends",
  "choisissons",
  "decide",
  "on decide",
  "je decide",
  "retenez",
  "on garde",
  "gardons",
];

/**
 * Si le message contient une décision explicite, retourne le texte à mémoriser.
 * Retourne null si aucune décision détectée.
 */
export function extractMemory(message: string): { category: string; content: string } | null {
  const m = norm(message);
  const found = DECISION_MARKERS.find((marker) => m.includes(marker));
  if (!found) return null;

  // Catégorie probable
  let category = "décision";
  if (/isolant|isolation|polystyrene|laine|liege/.test(m)) category = "isolation";
  else if (/carrelage|faience|marbre|sol/.test(m)) category = "revêtements";
  else if (/fenetre|vitrage|menuiserie|aluminium|pvc/.test(m)) category = "menuiserie";
  else if (/ciment|beton|acier|parpaing|brique/.test(m)) category = "matériaux";
  else if (/fournisseur|prestataire|entreprise|artisan/.test(m)) category = "fournisseurs";
  else if (/budget|cout|prix|montant/.test(m)) category = "budget";
  else if (/plan|etage|piece|surface/.test(m)) category = "conception";
  else if (/retard|delai|planning|chantier/.test(m)) category = "planning";

  const cleaned = message.replace(/^\s*(garde|gardons|retenu|retenons|retenez|on choisit|je choisis|on prend|je prends|choisissons|on decide|je decide)\s*(la solution|ce choix|ça|ca)?\s*/i, "").trim();
  return {
    category,
    content: cleaned.length > 8 ? cleaned : message.trim(),
  };
}

// ----------------------------------------------------------------------------
// Formatage
// ----------------------------------------------------------------------------

export function fmtTND(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} TND`;
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}
