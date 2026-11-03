import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import jsPDF from "jspdf";
import {
  ARABIC_PDF_FONT,
  containsArabic,
  registerArabicFont,
  rtlPdf,
  shapeArabicText,
} from "./arabicPdf";
import { formatQuantitatifMoney, formatQuantitatifQuantityI18n } from "./quantitatifArabic";

const BASE_LETTERS = /[\u0621-\u064A]/;
const PRESENTATION = /[\uFE70-\uFEFF]/;

describe("PDF arabe — liaison des lettres", () => {
  it("remplace chaque lettre par sa forme contextuelle", () => {
    expect(shapeArabicText("ب")).toBe("\uFE8F"); // isolée
    expect(shapeArabicText("با")).toBe("\uFE91\uFE8E"); // initiale + finale
    expect(shapeArabicText("بب")).toBe("\uFE91\uFE90"); // initiale + finale
    expect(shapeArabicText("ببب")).toBe("\uFE91\uFE92\uFE90"); // initiale + médiane + finale
  });

  it("compose les ligatures LAM + ALEF", () => {
    expect(shapeArabicText("لا")).toBe("\uFEFB");
    expect(shapeArabicText("لأ")).toBe("\uFEF7");
  });

  it("ne laisse aucune lettre arabe non liée dans un texte courant", () => {
    const shaped = shapeArabicText("الكميات التفصيلية للأشغال");
    expect(shaped).not.toMatch(BASE_LETTERS);
    expect(shaped).toMatch(PRESENTATION);
  });
});

describe("PDF arabe — ordre visuel RTL", () => {
  it("inverse l'ordre des mots et des lettres", () => {
    const visual = rtlPdf("الأشغال الكبرى");
    expect(visual).not.toBe("الأشغال الكبرى");
    expect(visual).not.toMatch(BASE_LETTERS);
    // Ordre logique « الأشغال » puis « الكبرى » ⇒ visuel : الكبرى puis الأشغال
    expect(visual.trim().split(/\s+/)).toHaveLength(2);
  });

  it("garde les nombres, unités et références dans le bon sens", () => {
    // « 120 م² » : le nombre reste groupé et se lit en premier (à droite).
    const quantity = rtlPdf("120 م²");
    expect(quantity.endsWith("120")).toBe(true);
    expect(quantity).toMatch(PRESENTATION); // lettre arabe liée (forme contextuelle)
    expect(quantity).toContain("²");
    const reference = rtlPdf("أنابيب PVC Ø110");
    expect(reference.startsWith("Ø110 PVC")).toBe(true);
    expect(containsArabic(reference)).toBe(true);
  });

  it("conserve les montants et quantités arabes à l'identique", () => {
    const money = formatQuantitatifMoney(1234.4, "ar");
    const visual = rtlPdf(money);
    const digits = (s: string) => s.replace(/[^\d]/g, "");
    expect(digits(visual)).toBe(digits(money));
    const qty = rtlPdf(formatQuantitatifQuantityI18n(120, "m²", "materiaux", "ar"));
    expect(qty.endsWith("120")).toBe(true);
    expect(qty.slice(0, -3)).toMatch(PRESENTATION);
  });
});

describe("PDF arabe — police embarquée", () => {
  it("enregistre la police arabe et produit un PDF valide", () => {
    const base64 = readFileSync("public/fonts/Amiri-Regular.ttf").toString("base64");
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    registerArabicFont(doc, base64);
    doc.setFont(ARABIC_PDF_FONT, "normal");
    doc.setFontSize(12);
    doc.text(rtlPdf("الكميات التفصيلية"), 190, 20, { align: "right" });

    const pdf = doc.output() as string;
    expect(pdf.startsWith("%PDF")).toBe(true);
    // La police est réellement embarquée dans le document.
    expect(pdf).toContain(ARABIC_PDF_FONT);
    // La police est partiellement sous-ensemblée : le PDF est nettement plus
    // volumineux qu'un document vide mais reste léger.
    expect(pdf.length).toBeGreaterThan(20_000);
  });
});
