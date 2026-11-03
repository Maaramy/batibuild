/**
 * TEXTE ARABE DANS LES PDF (jsPDF)
 * ----------------------------------------------------------------------------
 * jsPDF dessine le texte de gauche à droite avec un simple encodage de
 * caractères : il ne fait ni liaison des lettres arabes ni mise en page RTL.
 * Ce module comble ces deux manques, sans changer le moteur de calcul :
 *
 *   1. `shapeArabicText` remplace chaque lettre arabe par sa FORME CONTEXTUELLE
 *      (isolée / finale / initiale / médiane, bloc Unicode Arabic Presentation
 *      Forms-B) et compose les ligatures LAM-ALEF — les lettres sont donc
 *      réellement liées dans le PDF ;
 *   2. `rtlPdf` renverse l'ordre des mots / lettres pour un rendu visuel
 *      droite → gauche, tout en gardant les nombres et les références latines
 *      (C25/30, PVC Ø110, 1 234, 19 %) dans le bon sens de lecture ;
 *   3. `loadArabicFontBase64` charge une police arabe (Amiri) embarquée dans le
 *      PDF, indispensable pour que les glyphes existent.
 *
 * Le module est pur (aucun effet de bord) et sans dépendance à React.
 */

/** Nom de la police une fois enregistrée dans le document jsPDF. */
export const ARABIC_PDF_FONT = "BatiArabic";

/** Police arabe embarquée (fichier statique servi par l'application). */
export const ARABIC_PDF_FONT_URL = "/fonts/Amiri-Regular.ttf";

/** Famille Unicode des formes contextuelles arabes. */
const PRESENTATION_FORMS = /[\uFE70-\uFEFF]/;

interface LetterForm {
  /** Forme isolée. */
  i: number;
  /** Forme finale (reliée à la lettre précédente). */
  f: number;
  /** Forme initiale (reliée à la lettre suivante) — absente : non joignable. */
  n?: number;
  /** Forme médiane (reliée des deux côtés) — absente : non joignable. */
  m?: number;
}

/** Formes contextuelles (Arabic Presentation Forms-B) des lettres utilisées. */
const LETTER_FORMS: Record<string, LetterForm> = {
  "\u0621": { i: 0xfe80, f: 0xfe80 }, // ء
  "\u0622": { i: 0xfe81, f: 0xfe82 }, // آ
  "\u0623": { i: 0xfe83, f: 0xfe84 }, // أ
  "\u0624": { i: 0xfe85, f: 0xfe86 }, // ؤ
  "\u0625": { i: 0xfe87, f: 0xfe88 }, // إ
  "\u0626": { i: 0xfe89, f: 0xfe8a, n: 0xfe8b, m: 0xfe8c }, // ئ
  "\u0627": { i: 0xfe8d, f: 0xfe8e }, // ا
  "\u0628": { i: 0xfe8f, f: 0xfe90, n: 0xfe91, m: 0xfe92 }, // ب
  "\u0629": { i: 0xfe93, f: 0xfe94 }, // ة
  "\u062a": { i: 0xfe95, f: 0xfe96, n: 0xfe97, m: 0xfe98 }, // ت
  "\u062b": { i: 0xfe99, f: 0xfe9a, n: 0xfe9b, m: 0xfe9c }, // ث
  "\u062c": { i: 0xfe9d, f: 0xfe9e, n: 0xfe9f, m: 0xfea0 }, // ج
  "\u062d": { i: 0xfea1, f: 0xfea2, n: 0xfea3, m: 0xfea4 }, // ح
  "\u062e": { i: 0xfea5, f: 0xfea6, n: 0xfea7, m: 0xfea8 }, // خ
  "\u062f": { i: 0xfea9, f: 0xfeaa }, // د
  "\u0630": { i: 0xfeab, f: 0xfeac }, // ذ
  "\u0631": { i: 0xfead, f: 0xfeae }, // ر
  "\u0632": { i: 0xfeaf, f: 0xfeb0 }, // ز
  "\u0633": { i: 0xfeb1, f: 0xfeb2, n: 0xfeb3, m: 0xfeb4 }, // س
  "\u0634": { i: 0xfeb5, f: 0xfeb6, n: 0xfeb7, m: 0xfeb8 }, // ش
  "\u0635": { i: 0xfeb9, f: 0xfeba, n: 0xfebb, m: 0xfebc }, // ص
  "\u0636": { i: 0xfebd, f: 0xfebe, n: 0xfebf, m: 0xfec0 }, // ض
  "\u0637": { i: 0xfec1, f: 0xfec2, n: 0xfec3, m: 0xfec4 }, // ط
  "\u0638": { i: 0xfec5, f: 0xfec6, n: 0xfec7, m: 0xfec8 }, // ظ
  "\u0639": { i: 0xfec9, f: 0xfeca, n: 0xfecb, m: 0xfecc }, // ع
  "\u063a": { i: 0xfecd, f: 0xfece, n: 0xfecf, m: 0xfed0 }, // غ
  "\u0641": { i: 0xfed1, f: 0xfed2, n: 0xfed3, m: 0xfed4 }, // ف
  "\u0642": { i: 0xfed5, f: 0xfed6, n: 0xfed7, m: 0xfed8 }, // ق
  "\u0643": { i: 0xfed9, f: 0xfeda, n: 0xfedb, m: 0xfedc }, // ك
  "\u0644": { i: 0xfedd, f: 0xfede, n: 0xfedf, m: 0xfee0 }, // ل
  "\u0645": { i: 0xfee1, f: 0xfee2, n: 0xfee3, m: 0xfee4 }, // م
  "\u0646": { i: 0xfee5, f: 0xfee6, n: 0xfee7, m: 0xfee8 }, // ن
  "\u0647": { i: 0xfee9, f: 0xfeea, n: 0xfeeb, m: 0xfeec }, // ه
  "\u0648": { i: 0xfeed, f: 0xfeee }, // و
  "\u0649": { i: 0xfeef, f: 0xfef0 }, // ى
  "\u064a": { i: 0xfef1, f: 0xfef2, n: 0xfef3, m: 0xfef4 }, // ي
};

/** Ligatures LAM + ALEF : [isolée, finale] par variante d'alef. */
const LAM_ALEF_FORMS: Record<string, [number, number]> = {
  "\u0622": [0xfef5, 0xfef6], // لآ
  "\u0623": [0xfef7, 0xfef8], // لأ
  "\u0625": [0xfef9, 0xfefa], // لإ
  "\u0627": [0xfefb, 0xfefc], // لا
};

const isArabicLetter = (ch: string | undefined): boolean => !!ch && !!LETTER_FORMS[ch];

/** La lettre se relie-t-elle à la lettre SUIVANTE ? (formes initiale/médiane) */
const joinsForward = (ch: string | undefined): boolean =>
  !!ch && LETTER_FORMS[ch]?.n !== undefined;

/**
 * Applique les formes contextuelles arabes et les ligatures LAM-ALEF.
 * Le texte est renvoyé dans l'ordre LOGIQUE (lecture droite → gauche).
 */
export function shapeArabicText(input: string): string {
  const chars = [...input];
  const out: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const previous = chars[i - 1];
    const prevJoins = joinsForward(previous);

    // Ligature LAM + ALEF (une seule forme au lieu de deux lettres).
    if (ch === "\u0644") {
      const next = chars[i + 1];
      const ligature = next ? LAM_ALEF_FORMS[next] : undefined;
      if (ligature) {
        out.push(String.fromCharCode(prevJoins ? ligature[1] : ligature[0]));
        i += 1;
        continue;
      }
    }

    const form = LETTER_FORMS[ch];
    if (!form) {
      out.push(ch);
      continue;
    }

    const nextIsLetter = isArabicLetter(chars[i + 1]);
    const canJoinNext = nextIsLetter && form.n !== undefined;
    let code: number;
    if (prevJoins && canJoinNext && form.m !== undefined) code = form.m;
    else if (prevJoins) code = form.f;
    else if (canJoinNext && form.n !== undefined) code = form.n;
    else code = form.i;

    out.push(String.fromCharCode(code));
  }

  return out.join("");
}

const ARABIC_CHAR = /[\u0600-\u06FF\uFE70-\uFEFF]/;

/** Le mot contient-il des lettres arabes ? */
export function isArabicWord(word: string): boolean {
  return ARABIC_CHAR.test(word);
}

/**
 * Texte prêt à être dessiné par jsPDF (qui écrit de gauche à droite) :
 * formes contextuelles + ordre visuel RTL. Les mots latins / numériques
 * (montants, quantités, références) restent dans le bon sens.
 */
export function rtlPdf(input: string): string {
  if (!input) return "";
  const shaped = shapeArabicText(input);
  return shaped
    .split("\n")
    .map((line) =>
      line
        .split(" ")
        .reverse()
        .map((word) => (isArabicWord(word) ? [...word].reverse().join("") : word))
        .join(" "),
    )
    .join("\n");
}

/**
 * Coût unique d'un texte arabe pour le PDF : formes contextuelles sans
 * réordonnancement (utile pour un fragment inséré dans un texte déjà RTL).
 */
export const shapeArabicOnly = (input: string): string => shapeArabicText(input);

let cachedFont: string | null = null;

/** Convertit un ArrayBuffer en base64 (sans dépendance Node). */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Charge la police arabe (mise en cache pour la session). En cas d'échec
 * (hors ligne, fichier absent), la promesse est rejetée : l'appelant garde
 * alors le quantitatif en français plutôt que de produire un PDF illisible.
 */
export async function loadArabicFontBase64(): Promise<string> {
  if (cachedFont) return cachedFont;
  const response = await fetch(ARABIC_PDF_FONT_URL);
  if (!response.ok) throw new Error(`Police arabe indisponible (${response.status})`);
  cachedFont = arrayBufferToBase64(await response.arrayBuffer());
  return cachedFont;
}

interface FontCapableDoc {
  addFileToVFS: (filename: string, content: string) => void;
  addFont: (filename: string, family: string, style: string) => void;
  setFont: (family: string, style?: string) => void;
}

/** Enregistre la police arabe dans le document jsPDF. */
export function registerArabicFont(doc: FontCapableDoc, base64: string, filename = "Amiri-Regular.ttf") {
  doc.addFileToVFS(filename, base64);
  doc.addFont(filename, ARABIC_PDF_FONT, "normal");
  // Le même fichier sert de graisse « grasse » : jsPDF ne synthétise pas les
  // graisses et signalerait une police manquante pour les en-têtes de tableau.
  doc.addFont(filename, ARABIC_PDF_FONT, "bold");
  doc.setFont(ARABIC_PDF_FONT, "normal");
}

/** Vrai si le texte contient au moins un caractère arabe ou une forme contextuelle. */
export const containsArabic = (input: string): boolean =>
  ARABIC_CHAR.test(input) || PRESENTATION_FORMS.test(input);
