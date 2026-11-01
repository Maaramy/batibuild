import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_LANGUAGE, getDirection, SUPPORTED_LANGUAGES } from "./config";

/**
 * Garde-fou des traductions.
 *
 * Ces tests ne vérifient pas la qualité littéraire mais l'intégrité du
 * catalogue : chaque clé française doit exister en arabe, aucune valeur ne doit
 * être vide, et l'arabe doit réellement être de l'arabe (pas une copie du
 * français). Ils échouent donc dès qu'un écran ajoute une clé sans sa
 * traduction — c'est ce qui évite qu'une interface retombe partiellement en
 * français en mode AR.
 */

const LOCALES_DIR = path.join(__dirname, "locales");
const NAMESPACES = fs
  .readdirSync(path.join(LOCALES_DIR, "fr"))
  .filter((file) => file.endsWith(".json"))
  .map((file) => file.replace(/\.json$/, ""));

type Json = { [key: string]: string | Json };

function flatten(node: Json, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(node)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      Object.assign(out, flatten(value, fullKey));
    } else {
      out[fullKey] = String(value);
    }
  }
  return out;
}

function load(language: "fr" | "ar", namespace: string): Record<string, string> {
  const file = path.join(LOCALES_DIR, language, `${namespace}.json`);
  return flatten(JSON.parse(fs.readFileSync(file, "utf8")) as Json);
}

/** Plages Unicode arabes (lettres, présentations, formes). */
const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Chaînes qui restent légitimement dans leur langue d'origine. */
const KEPT_AS_IS = /^(?:[A-Za-z0-9\s.,:;!?/&%+\-–—()'"@#_=*[\]{}|<>~^`]+|PDF|TND|batibuild|BatiBuild|BatiBuild)$/;

/**
 * Noms de langues : ils restent affichés dans LEUR langue (un francophone lit
 * « Français » et « العربية »), ce n'est pas une traduction manquante.
 */
const LANGUAGE_NAME_KEY = /^language\.(?:fr|ar)$/;

describe("catalogue i18n", () => {
  it("expose bien les deux langues livrées (FR par défaut, AR en RTL)", () => {
    const codes = SUPPORTED_LANGUAGES.map((language) => language.code);
    expect(codes).toContain("fr");
    expect(codes).toContain("ar");
    expect(DEFAULT_LANGUAGE).toBe("fr");
    expect(getDirection("fr")).toBe("ltr");
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("ar-TN")).toBe("ltr"); // code inconnu → repli LTR
  });

  it("définit au moins les namespaces du produit", () => {
    expect(NAMESPACES).toEqual(
      expect.arrayContaining([
        "common",
        "dashboard",
        "projectDetail",
        "newProject",
        "pricing",
        "profile",
        "admin",
        "materials",
        "supplier",
        "contact",
        "landing",
        "auth",
      ]),
    );
  });

  it.each(NAMESPACES)("%s : même jeu de clés en français et en arabe", (namespace) => {
    const fr = load("fr", namespace);
    const ar = load("ar", namespace);

    const missingInArabic = Object.keys(fr).filter((key) => !(key in ar));
    const extraInArabic = Object.keys(ar).filter((key) => !(key in fr));

    expect({ namespace, missingInArabic }).toEqual({ namespace, missingInArabic: [] });
    expect({ namespace, extraInArabic }).toEqual({ namespace, extraInArabic: [] });
  });

  it.each(NAMESPACES)("%s : aucune valeur vide", (namespace) => {
    for (const language of ["fr", "ar"] as const) {
      const entries = load(language, namespace);
      const empties = Object.entries(entries)
        .filter(([, value]) => value.trim() === "")
        .map(([key]) => key);
      expect({ language, namespace, empties }).toEqual({ language, namespace, empties: [] });
    }
  });

  it.each(NAMESPACES)("%s : les libellés arabes sont réellement en arabe", (namespace) => {
    const fr = load("fr", namespace);
    const ar = load("ar", namespace);

    const untranslated = Object.keys(fr).filter((key) => {
      if (LANGUAGE_NAME_KEY.test(key)) return false;
      const arValue = ar[key] ?? "";
      const frValue = fr[key];
      if (arValue.trim() === "") return false; // couvert par le test précédent
      if (ARABIC_SCRIPT.test(arValue)) return false;
      if (KEPT_AS_IS.test(arValue)) return false; // nom de marque, code technique…
      return arValue === frValue;
    });

    expect({ namespace, untranslated }).toEqual({ namespace, untranslated: [] });
  });
});
