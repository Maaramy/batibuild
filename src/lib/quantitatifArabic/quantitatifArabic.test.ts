import { describe, expect, it } from "vitest";
import { generateDqe } from "@/convex/dqeEngine";
import { PROJECT_TYPES } from "@/convex/projectTypes";
import { buildSdbEstimate } from "@/lib/renovationSdbPricing";
import {
  QUANTITATIF_UI,
  formatQuantitatifMoney,
  formatQuantitatifQuantityI18n,
  quantitatifDir,
  readQuantitatifLang,
  tq,
  translateDescription,
  translateDesignation,
  translateLotName,
  translateNature,
  translateUnit,
  writeQuantitatifLang,
} from "./index";
import { QUANTITATIF_DESIGNATIONS_AR } from "./designations";
import { QUANTITATIF_DESCRIPTIONS_AR } from "./descriptions";

const ARABIC = /[\u0600-\u06FF]/;

// Navigateur simulé : le choix de langue est mémorisé dans le stockage local.
function stubLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

/** Toutes les lignes réelles du quantitatif, tous types de projet confondus. */
function collectLines() {
  const rows: { lot: string; designation: string; description?: string; unit: string; nature: string }[] = [];
  for (const category of PROJECT_TYPES) {
    for (const floors of [1, 2, 3]) {
      const dqe = generateDqe({ category, surface: 120, floors, totalBudget: 300_000 });
      for (const lot of dqe.lots as any[]) {
        for (const line of lot.lines ?? []) {
          rows.push({
            lot: lot.name,
            designation: line.designation,
            description: line.description,
            unit: line.unit,
            nature: line.nature,
          });
        }
      }
    }
  }
  const sdb = buildSdbEstimate({ surface: 6 });
  for (const lot of sdb.lots as any[]) {
    for (const line of lot.lines ?? []) {
      rows.push({
        lot: lot.name,
        designation: line.designation,
        description: line.description,
        unit: line.unit,
        nature: line.nature,
      });
    }
  }
  return rows;
}

const LINES = collectLines();

describe("quantitatif détaillé — sélecteur FR / AR", () => {
  it("démarre en français (langue par défaut, stockage vide)", () => {
    expect(readQuantitatifLang()).toBe("fr");
    expect(quantitatifDir("fr")).toBe("ltr");
    expect(quantitatifDir("ar")).toBe("rtl");
  });

  it("conserve le choix de langue entre deux consultations", () => {
    stubLocalStorage();
    writeQuantitatifLang("ar");
    expect(readQuantitatifLang()).toBe("ar");
    writeQuantitatifLang("fr");
    expect(readQuantitatifLang()).toBe("fr");
  });

  it("renvoie le français À L'IDENTIQUE quand la langue est FR", () => {
    for (const row of LINES.slice(0, 50)) {
      expect(translateDesignation(row.designation, "fr")).toBe(row.designation);
      expect(translateDescription(row.description, "fr")).toBe(row.description ?? "");
      expect(translateLotName(row.lot, "fr")).toBe(row.lot);
      expect(translateUnit(row.unit, "fr")).toBe(row.unit);
    }
  });

  it("traduit TOUS les libellés d'interface en arabe", () => {
    for (const key of Object.keys(QUANTITATIF_UI) as (keyof typeof QUANTITATIF_UI)[]) {
      const fr = tq(key, "fr");
      const ar = tq(key, "ar");
      expect(fr.length).toBeGreaterThan(0);
      expect(ar, `libellé non traduit : ${key}`).not.toBe(fr);
      expect(ARABIC.test(ar), `libellé sans arabe : ${key}`).toBe(true);
    }
    expect(tq("title", "ar")).toBe("الكميات التفصيلية");
    expect(tq("columnDesignation", "ar")).toBe("بيان الأشغال");
    expect(tq("totalTTC", "ar")).toContain("الأداءات");
    expect(tq("steps", "ar", { n: 4 })).toBe("مراحل");
  });

  it("traduit intégralement les étapes, désignations et descriptions du moteur", () => {
    const missing: string[] = [];
    for (const row of LINES) {
      if (!ARABIC.test(translateLotName(row.lot, "ar"))) missing.push(`lot: ${row.lot}`);
      if (!ARABIC.test(translateDesignation(row.designation, "ar"))) {
        missing.push(`désignation: ${row.designation}`);
      }
      if (row.description && !ARABIC.test(translateDescription(row.description, "ar"))) {
        missing.push(`description: ${row.description}`);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  it("ne laisse aucun mot français dans les textes traduits", () => {
    const leftovers: string[] = [];
    for (const row of LINES) {
      const fr = translateDesignation(row.designation, "ar");
      // Les références techniques (C25/30, PVC, LED, T12…) restent en latin :
      // on ne signale que les mots français complets restés dans le texte.
      const words = fr.match(/\b[a-zA-ZÀ-ÿ]{4,}\b/g) ?? [];
      const allowed = /^(pvc|led|inox|steg|sonede|onas|tgm|vdi|adsl|rj45|icta|brut|sdb)/i;
      for (const w of words) {
        if (!allowed.test(w)) leftovers.push(`${row.designation} → ${fr} (${w})`);
      }
    }
    expect([...new Set(leftovers)]).toEqual([]);
  });

  it("traduit les natures et les unités de mesure", () => {
    expect(translateNature("materiaux", "ar")).toBe("مواد البناء");
    expect(translateNature("main_oeuvre", "ar")).toBe("اليد العاملة");
    expect(translateUnit("m²", "ar")).toBe("م²");
    expect(translateUnit("unité", "ar")).toBe("وحدة");
    expect(translateUnit("ml", "ar")).toBe("م.ط");
  });

  it("conserve quantités, montants et références lors du changement de langue", () => {
    const numeric = new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 }).format(1234);
    expect(formatQuantitatifMoney(1234.4, "ar")).toBe(`${numeric} د.ت`);
    expect(formatQuantitatifMoney(1234.4, "fr")).toBe(`${numeric} DT`);
    // MÊME nombre affiché dans les deux langues : seule l'unité change.
    expect(formatQuantitatifMoney(1234.4, "ar").replace(" د.ت", "")).toBe(
      formatQuantitatifMoney(1234.4, "fr").replace(" DT", ""),
    );
    expect(formatQuantitatifQuantityI18n(120, "m²", "materiaux", "ar")).toBe("120 م²");
    expect(formatQuantitatifQuantityI18n(120, "m²", "materiaux", "fr")).toBe("120 m²");
    expect(formatQuantitatifQuantityI18n(2, "lot", "main_oeuvre", "ar")).toBe("2 بنود");
    expect(formatQuantitatifQuantityI18n(2, "lot", "main_oeuvre", "fr")).toBe("2 lots");
  });

  it("garde une couverture complète des dictionnaires", () => {
    expect(Object.keys(QUANTITATIF_DESIGNATIONS_AR).length).toBeGreaterThan(200);
    expect(Object.keys(QUANTITATIF_DESCRIPTIONS_AR).length).toBeGreaterThan(200);
    for (const [fr, ar] of Object.entries(QUANTITATIF_DESIGNATIONS_AR)) {
      expect(ARABIC.test(ar), `désignation non arabe : ${fr}`).toBe(true);
    }
    for (const [fr, ar] of Object.entries(QUANTITATIF_DESCRIPTIONS_AR)) {
      expect(ARABIC.test(ar), `description non arabe : ${fr}`).toBe(true);
    }
  });
});
