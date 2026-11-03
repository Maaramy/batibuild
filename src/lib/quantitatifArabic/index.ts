/**
 * QUANTITATIF DÉTAILLÉ — SYSTÈME DE TRADUCTION FR / AR
 * ----------------------------------------------------------------------------
 * Source UNIQUE de tout ce qui est traduit dans le bloc « Quantitatif
 * détaillé » (interface + lignes du DQE + totaux) et dans sa section PDF :
 *   • libellés d'interface (titres, colonnes, totaux, notes) ;
 *   • noms des étapes / lots et des natures de poste ;
 *   • unités de mesure ;
 *   • désignations et descriptions techniques des lignes.
 *
 * Règles de fonctionnement :
 *   • le français est la langue par défaut et n'est JAMAIS transformé ;
 *   • la traduction ne touche QUE du texte : quantités, prix unitaires,
 *     montants, références (C25/30, PVC Ø110, T12, PER…) restent identiques ;
 *   • aucune ligne du DQE n'est recalculée pour changer de langue ;
 *   • les clés sont les textes français exacts du moteur — un texte inconnu
 *     (article personnalisé par l'utilisateur) est renvoyé tel quel.
 */
import { QUANTITATIF_DESIGNATIONS_AR } from "./designations";
import { QUANTITATIF_DESCRIPTIONS_AR } from "./descriptions";

export type QuantitatifLang = "fr" | "ar";

const STORAGE_KEY = "batibuild:quantitatifLang";

/** Libellés d'interface du bloc « Quantitatif détaillé ». */
export const QUANTITATIF_UI = {
  title: { fr: "Quantitatif détaillé", ar: "الكميات التفصيلية" },
  langSwitchLabel: { fr: "Langue du quantitatif détaillé", ar: "لغة الكميات التفصيلية" },
  french: { fr: "Français", ar: "الفرنسية" },
  arabic: { fr: "Arabe", ar: "العربية" },
  steps: { fr: "étapes", ar: "مراحل" },
  refreshTitle: {
    fr: "Mettre à jour le quantitatif selon le catalogue 2026",
    ar: "تحديث الكميات وفق كتالوج 2026",
  },
  expandAll: { fr: "Tout déplier", ar: "عرض الكل" },
  collapseAll: { fr: "Tout replier", ar: "طي الكل" },
  editableArticles: { fr: "articles modifiables", ar: "بنود قابلة للتعديل" },
  columnDesignation: { fr: "Désignation", ar: "بيان الأشغال" },
  columnQuantity: { fr: "Quantité", ar: "الكمية" },
  columnUnitPrice: { fr: "Prix unitaire", ar: "سعر الوحدة" },
  columnAmount: { fr: "Montant", ar: "المبلغ" },
  includedInAmount: { fr: "inclus dans le montant", ar: "مشمول في المبلغ" },
  personalized: { fr: "Personnalisé", ar: "مخصص" },
  editArticle: { fr: "Modifier cet article", ar: "تعديل هذا البند" },
  totalTTC: { fr: "Coût total estimé TTC", ar: "التكلفة الإجمالية المقدرة شامل الأداءات" },
  perM2Unit: { fr: "/m²", ar: "/م²" },
  totalHT: { fr: "Total HT", ar: "المجموع دون أداءات" },
  vat: { fr: "TVA 19 %", ar: "الأداء على القيمة المضافة 19 %" },
  totalTTCLabel: { fr: "Total TTC", ar: "المجموع شامل الأداءات" },
  perM2: {
    fr: "soit {cost}/m² · {surface} m² · TVA 19% incluse",
    ar: "أي {cost}/م² · {surface} م² · الأداء على القيمة المضافة 19% مشمول",
  },
  personalizedModified: {
    fr: "Scénario Personnalisé — {n} article(s) modifié(s) par rapport au scénario de référence.",
    ar: "سيناريو مخصص — {n} بند معدّل مقارنة بالسيناريو المرجعي.",
  },
  personalizedRemoved: {
    fr: "Scénario Personnalisé — {n} poste(s) supprimé(s) (hors postes protégés : Gros œuvre, Transport et autres, études et postes porteurs).",
    ar: "سيناريو مخصص — {n} بند محذوف (باستثناء البنود المحمية: الأشغال الكبرى، النقل وغيرها، الدراسات والبنود الحاملة).",
  },
  personalizedCustomWorks: {
    fr: "Travaux complémentaires personnalisés inclus (une catégorie par travail).",
    ar: "أشغال تكميلية مخصصة مشمولة (فئة لكل عمل).",
  },
  avgRegionTitle: { fr: "Prix moyen par région", ar: "متوسط السعر حسب المنطقة" },
  avgRegionNote: {
    fr: "Moyenne nationale (24 gouvernorats) · Base marché Tunisie 2026",
    ar: "المتوسط الوطني (24 ولاية) · أساس سوق تونس 2026",
  },
  vsNational: {
    fr: "{pct}% vs moyenne nationale ({region})",
    ar: "{pct}% مقارنة بالمتوسط الوطني ({region})",
  },
} as const;

export type QuantitatifUiKey = keyof typeof QUANTITATIF_UI;

/** Noms des étapes (lots) du moteur DQE, de la rénovation SdB et des travaux. */
export const QUANTITATIF_LOTS_AR: Record<string, string> = {
  "Alimentation en eau": "تغذية بالماء",
  "Aménagement intérieur": "تهيئة داخلية",
  "Aménagements extérieurs": "تهيئة خارجية",
  "Appareillage": "أجهزة ومفاتيح",
  "CVC": "تكييف وتهوية",
  "CVC et ventilation": "تكييف وتهوية",
  "Carrelage et faïence": "بلاط وقاشاني",
  "Charpente et couverture": "هيكل وتغطية",
  "Chauffe-eau": "سخان الماء",
  "Cloisons et faux plafonds": "فواصل وأسقف مستعارة",
  "Coque préfabriquée": "حوض جاهز",
  "Cuisine professionnelle": "مطبخ مهني",
  "Câblage et gaines": "أسلاك وقنوات",
  "Dépose et démolition": "تفكيك وهدم",
  "Enseignes et équipements": "لافتات وتجهيزات",
  "Essais et mise en service": "اختبارات وتشغيل",
  "Façade et vitrine": "واجهة وواجهة زجاجية",
  "Filtration et hydraulique": "ترشيح وهيدروليك",
  "Filtration et raccordements": "ترشيح وتوصيلات",
  "Finitions": "تشطيبات",
  "Frais Préliminaires et Études": "مصاريف أولية ودراسات",
  "Froid et équipements": "تبريد وتجهيزات",
  "Gros œuvre": "الأشغال الكبرى",
  "Gros œuvre (fondations, structures)": "الأشغال الكبرى (الأساسات والهياكل)",
  "Gros œuvre et dalle": "الأشغال الكبرى والبلاطة",
  "Gros œuvre et reprises": "الأشغال الكبرى والترميمات",
  "Gros œuvre — reprises et réparations": "الأشغال الكبرى — ترميم وإصلاح",
  "Main-d'œuvre": "اليد العاملة",
  "Main-d'œuvre électricien": "اليد العاملة — كهربائي",
  "Main-d'œuvre plombier": "اليد العاملة — سبّاك",
  "Margelles, plage et abords": "حواف المسبح ومحيطه",
  "Menuiserie": "نجارة",
  "Mise à la terre": "التأريض",
  "Nettoyage": "تنظيف",
  "Nettoyage et finition": "تنظيف وتشطيب",
  "Peinture": "دهن",
  "Peinture murs et plafonds": "دهن الجدران والأسقف",
  "Plomberie": "سباكة",
  "Plomberie et électricité": "سباكة وكهرباء",
  "Points lumineux": "نقاط إنارة",
  "Porte et menuiserie": "باب ونجارة",
  "Portes et sécurité": "أبواب وأمن",
  "Préparation et protection": "تحضير وحماية",
  "Revêtements": "كساءات",
  "Robinetterie": "حنفيات",
  "Sanitaires": "أدوات صحية",
  "Sanitaires et robinetterie": "أدوات صحية وحنفيات",
  "Second œuvre et finitions": "الأشغال الثانوية والتشطيبات",
  "Structure béton armé": "هيكل من الخرسانة المسلحة",
  "Tableau électrique et protection": "لوحة كهربائية وحماية",
  "Terrassement": "حفر وتسوية",
  "Toiture et étanchéité": "سطح وعزل",
  "Transports & autres": "نقل وأخرى",
  "Ventilation": "تهوية",
  "VRD et divers": "شبكات الطرق والمرافق ومتفرقات",
  "Maçonnerie et préparation": "بناء وتحضير",
  "Plomberie et évacuation": "سباكة وصرف",
  "Sanitaires et mobilier": "أدوات صحية وأثاث",
  "Électricité et ventilation": "كهرباء وتهوية",
  "Électricité": "كهرباء",
  "Équipements techniques": "تجهيزات تقنية",
  "Étanchéité": "عزل",
  "Étanchéité et revêtement": "عزل وكساء",
  "Évacuation": "صرف",
  Piscine: "مسبح",
  Garage: "مرآب",
  "Cuisine extérieure": "مطبخ خارجي",
  Jardin: "حديقة",
  "Panneaux solaires": "ألواح شمسية",
};

/** Libellés de main-d'œuvre (« Main-d'œuvre — Peinture intérieure »). */
export const QUANTITATIF_LABOR_AR: Record<string, string> = {
  "Main-d'œuvre — Peinture intérieure": "اليد العاملة — دهن داخلي",
  "Main-d'œuvre — Peinture extérieure": "اليد العاملة — دهن خارجي",
  "Main-d'œuvre — Plomberie complète": "اليد العاملة — سباكة كاملة",
  "Main-d'œuvre — Électricité complète": "اليد العاملة — كهرباء كاملة",
  "Main-d'œuvre — Plomberie": "اليد العاملة — سباكة",
  "Main-d'œuvre — Électricité": "اليد العاملة — كهرباء",
};

/** Natures de poste affichées en sous-titres des étapes. */
export const QUANTITATIF_NATURES_AR: Record<string, string> = {
  materiaux: "مواد البناء",
  main_oeuvre: "اليد العاملة",
  equipements: "العدة والتجهيزات",
  transport: "النقل",
  etudes: "الدراسات والتصاريح",
};

/** Unités de mesure du DQE (les valeurs numériques ne changent jamais). */
export const QUANTITATIF_UNITS_AR: Record<string, string> = {
  "m²": "م²",
  "m³": "م³",
  ml: "م.ط",
  unité: "وحدة",
  unités: "وحدات",
  lot: "بند",
  lots: "بنود",
  forfait: "مبلغ جزافي",
  sacs: "أكياس",
  sac: "كيس",
  bennes: "حاويات",
  benne: "حاوية",
  jours: "أيام",
  jour: "يوم",
  tonnes: "طن",
  tonne: "طن",
  points: "نقاط",
  point: "نقطة",
  litres: "لتر",
  kg: "كغ",
  "seau 20 L": "دلو 20 ل",
};

/** Phrases variables (niveaux, seaux, dosages) traduites par motif. */
const DESCRIPTION_PATTERNS: {
  pattern: RegExp;
  ar: (m: RegExpMatchArray) => string;
}[] = [
  {
    pattern: /^(\d+) seaux de (\d+) L pour 100 m² construits \((.+)\)\.$/,
    ar: (m) => `${m[1]} دلو من ${m[2]} ل لكل 100 م² مبنية (${m[3]}).`,
  },
  {
    pattern: /^Main courante \+ garde-corps escalier (\d+) niveaux et balcons\.$/,
    ar: (m) => `درابزين + حواجز سلّم ${m[1]} طوابق وشرفات.`,
  },
  {
    pattern: /^Revêtement sol escalier (\d+) volées \(pierre ou carrelage\)\.$/,
    ar: (m) => `كساء أرضية السلّم ${m[1]} قلبات (حجر أو بلاط).`,
  },
  {
    pattern: /^([\d.,]+) kg\/m² — colle C2 pour pièces humides\.$/,
    ar: (m) => `${m[1]} كغ/م² — لاصق C2 للغرف الرطبة.`,
  },
  {
    pattern: /^([\d.,]+) kg\/m² — joint hydrofuge anti-moisissure\.$/,
    ar: (m) => `${m[1]} كغ/م² — فاصل مقاوم للماء مضاد للعفن.`,
  },
];

/** Sous-phrases des descriptions à motif (contenu de la parenthèse). */
const PATTERN_FRAGMENTS_AR: Record<string, string> = {
  "sous-couche + 2 couches": "طبقة أساسية + طبقتان",
  "impression + monocouche": "طبقة تمهيدية + طبقة واحدة",
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const DESIGNATIONS_INDEX = new Map(
  Object.entries(QUANTITATIF_DESIGNATIONS_AR).map(([fr, ar]) => [normalizeKey(fr), ar]),
);
const DESCRIPTIONS_INDEX = new Map(
  Object.entries(QUANTITATIF_DESCRIPTIONS_AR).map(([fr, ar]) => [normalizeKey(fr), ar]),
);
const LOTS_INDEX = new Map(
  Object.entries(QUANTITATIF_LOTS_AR).map(([fr, ar]) => [normalizeKey(fr), ar]),
);

/** Clé de traduction avec interpolation `{variable}`. */
export function tq(
  key: QuantitatifUiKey,
  lang: QuantitatifLang,
  vars?: Record<string, string | number>,
): string {
  // Garde-fou : une clé absente ne doit JAMAIS faire tomber la page — elle
  // s'affiche telle quelle plutôt que de lever une erreur de rendu.
  const entry = QUANTITATIF_UI[key] as { fr: string; ar: string } | undefined;
  let text: string = entry?.[lang] ?? entry?.fr ?? String(key);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/** Désignation d'une ligne du DQE (français renvoyé tel quel). */
export function translateDesignation(text: string | null | undefined, lang: QuantitatifLang): string {
  const raw = String(text ?? "");
  if (lang === "fr" || !raw.trim()) return raw;
  return DESIGNATIONS_INDEX.get(normalizeKey(raw)) ?? raw;
}

/** Description technique d'une ligne du DQE (motifs variables compris). */
export function translateDescription(text: string | null | undefined, lang: QuantitatifLang): string {
  const raw = String(text ?? "");
  if (lang === "fr" || !raw.trim()) return raw;

  const exact = DESCRIPTIONS_INDEX.get(normalizeKey(raw));
  if (exact) return exact;

  for (const { pattern, ar } of DESCRIPTION_PATTERNS) {
    const match = raw.match(pattern);
    if (match) {
      if (match[3] && PATTERN_FRAGMENTS_AR[match[3]]) {
        match[3] = PATTERN_FRAGMENTS_AR[match[3]];
      }
      return ar(match);
    }
  }
  return raw;
}

/** Nom d'une étape (lot) du quantitatif. */
export function translateLotName(text: string | null | undefined, lang: QuantitatifLang): string {
  const raw = String(text ?? "");
  if (lang === "fr" || !raw.trim()) return raw;
  return LOTS_INDEX.get(normalizeKey(raw)) ?? raw;
}

/** Libellé de la part main-d'œuvre affichée sous un poste. */
export function translateLaborLabel(label: string | null | undefined, lang: QuantitatifLang): string {
  const raw = String(label ?? "");
  if (lang === "fr" || !raw.trim()) return raw;
  const exact = QUANTITATIF_LABOR_AR[raw];
  if (exact) return exact;
  // Repli : préfixe traduit + désignation traduite quand elle existe.
  const rest = raw.replace(/^Main-d'œuvre\s*—\s*/, "");
  const restAr = translateDesignation(rest, lang);
  return `${QUANTITATIF_NATURES_AR.main_oeuvre} — ${restAr}`;
}

/** Nature de poste (Matériaux, Main-d'œuvre…). */
export function translateNature(nature: string | null | undefined, lang: QuantitatifLang): string {
  const key = String(nature ?? "");
  if (lang === "fr") {
    return (
      {
        materiaux: "Matériaux",
        main_oeuvre: "Main-d'œuvre",
        equipements: "Outillage & Équipements",
        transport: "Transport",
        etudes: "Études & Permis",
      }[key] ?? key
    );
  }
  return QUANTITATIF_NATURES_AR[key] ?? key;
}

/** Unité de mesure traduite (valeur numérique intacte). */
export function translateUnit(unit: string | null | undefined, lang: QuantitatifLang): string {
  const raw = String(unit ?? "");
  if (lang === "fr" || !raw.trim()) return raw;
  const cleaned = raw.trim();
  if (QUANTITATIF_UNITS_AR[cleaned]) return QUANTITATIF_UNITS_AR[cleaned];
  const lower = cleaned.toLowerCase();
  return QUANTITATIF_UNITS_AR[lower] ?? cleaned;
}

/**
 * Montant affiché : MÊME valeur et MÊME séparateur de milliers dans les deux
 * langues, seule l'unité monétaire est écrite dans la langue courante.
 */
export function formatQuantitatifMoney(value: number, lang: QuantitatifLang): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("fr-TN", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(safe);
  } catch {
    // Environnement sans données de locale : regroupement manuel identique.
    formatted = String(Math.round(safe)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  return lang === "ar" ? `${formatted} د.ت` : `${formatted} DT`;
}

/**
 * Quantité affichée : nombre inchangé, unité traduite. Les postes de
 * main-d'œuvre restent exprimés en lots (« 1 بند », « 2 بنود »).
 */
export function formatQuantitatifQuantityI18n(
  quantity: unknown,
  unit: unknown,
  nature: unknown,
  lang: QuantitatifLang,
): string {
  const q = Number(quantity);
  const value = Number.isFinite(q) ? q : 0;
  if (String(nature ?? "").trim() === "main_oeuvre") {
    const lots = value >= 1 ? Math.max(1, Math.round(value)) : 1;
    if (lang === "ar") return `${lots} ${lots > 1 ? QUANTITATIF_UNITS_AR.lots : QUANTITATIF_UNITS_AR.lot}`;
    return `${lots} lot${lots > 1 ? "s" : ""}`;
  }
  const unitLabel = translateUnit(String(unit ?? ""), lang);
  return `${value}${unitLabel ? ` ${unitLabel}` : ""}`.trim();
}

/** Écriture / lecture du choix de langue (conservé pendant la consultation). */
export function readQuantitatifLang(): QuantitatifLang {
  if (typeof localStorage === "undefined") return "fr";
  try {
    return localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "fr";
  } catch {
    return "fr";
  }
}

export function writeQuantitatifLang(lang: QuantitatifLang) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* préférence non essentielle : stockage indisponible, on garde l'état React */
  }
}

/** Libellé de scénario budgétaire (« Standard », « Personnalisé »…). */
export function translateScenarioLabel(label: string | null | undefined, lang: QuantitatifLang): string {
  const raw = String(label ?? "");
  if (lang === "fr" || !raw.trim()) return raw;
  return raw
    .replace(/Personnalisé/gi, "مخصص")
    .replace(/Premium/gi, "ممتاز")
    .replace(/Économique/gi, "اقتصادي")
    .replace(/Standard/gi, "قياسي");
}

/** Taux de TVA des montants du quantitatif (prix TTC du marché tunisien). */
export const QUANTITATIF_VAT_RATE = 0.19;

/**
 * Décomposition du total TTC en HT / TVA / TTC. Le TTC affiché est arrondi une
 * seule fois et la TVA est le RESTE : HT + TVA = TTC au dinar près, dans les
 * deux langues (aucun montant recalculé à partir d'un autre total).
 */
export function splitQuantitatifVat(totalTtc: number): { ht: number; vat: number; ttc: number } {
  const ttc = Math.round(Number(totalTtc) || 0);
  const ht = Math.round(ttc / (1 + QUANTITATIF_VAT_RATE));
  return { ht, vat: ttc - ht, ttc };
}

/** Direction de lecture du bloc. */
export const quantitatifDir = (lang: QuantitatifLang): "rtl" | "ltr" =>
  lang === "ar" ? "rtl" : "ltr";
