/**
 * Garde-fou « ICÔNES DES TRAVAUX COMPLÉMENTAIRES PERSONNALISÉS ».
 *
 * Hors du Quantitatif détaillé, les travaux personnalisés (Piscine, Garage,
 * Cuisine extérieure, Jardin, Panneaux solaires et tous les futurs travaux)
 * utilisent EXACTEMENT la bibliothèque d'icônes de la plateforme
 * (lucide-react), via l'unique composant `CustomWorkIcon` — aucun emoji ni
 * variante graphique d'origine.
 *
 * Exception volontaire : le « Quantitatif détaillé » n'affiche AUCUNE icône de
 * travail — les travaux complémentaires personnalisés y sont présentés comme
 * des catégories professionnelles (mêmes lignes et postes que « Gros œuvre » et
 * « Second œuvre et finitions »). Le test correspondant verrouille cette
 * absence d'icône.
 *
 * Ce test verrouille les propriétés demandées :
 *   1. correspondance sémantique travail → icône ;
 *   2. source unique (`customWorkType → icon → <CustomWorkIcon />`) : ajouter un
 *      travail au catalogue sans l'enregistrer dans `CustomWorkIcon` échoue ici ;
 *   3. plus aucune icône « ancienne » (emoji) dans la chaîne des travaux ;
 *   4. aucune icône de travail dans le Quantitatif détaillé.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CUSTOM_WORK_CATALOG, getCustomWorkDef } from "./customWorksCatalog";

const SRC = join(process.cwd(), "src");
const read = (relativePath: string) => readFileSync(join(SRC, relativePath), "utf8");

/** Plages couvrant les emoji utilisés comme icônes (pas les caractères de dessin). */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/** Fichiers de la chaîne « travaux complémentaires » (données + moteur + UI). */
const CUSTOM_WORK_FILES = [
  "lib/customWorksCatalog.ts",
  "lib/complementaryWorks.ts",
  "convex/customWorksEngine.ts",
  "convex/customWorks.ts",
  "components/CustomWorkIcon.tsx",
  "components/complementary/ComplementaryWorksSection.tsx",
];

/**
 * Composants qui affichent des travaux personnalisés à l'écran HORS du
 * Quantitatif détaillé (où les travaux sont rendus sans aucune icône).
 */
const CUSTOM_WORK_UI = [
  "components/complementary/ComplementaryWorksSection.tsx",
  "components/decision/CapacityDecisionCard.tsx",
];

/** Bloc « Quantitatif détaillé » : catégories professionnelles, sans icône. */
const QUANTITATIF_DETAILS = "components/quantitatif/QuantitatifDetails.tsx";

describe("icônes des travaux complémentaires personnalisés", () => {
  it("associe chaque travail à l'icône sémantique de la bibliothèque de la plateforme", () => {
    expect(CUSTOM_WORK_CATALOG.map((def) => [def.key, def.icon])).toEqual([
      ["piscine", "Waves"],
      ["garage", "Car"],
      ["cuisine_exterieure", "CookingPot"],
      ["jardin", "TreePine"],
      ["solaire", "Sun"],
    ]);
  });

  it("enregistre dans CustomWorkIcon toutes les icônes du catalogue (source unique)", () => {
    const code = read("components/CustomWorkIcon.tsx");
    const start = code.indexOf("const CUSTOM_WORK_ICONS");
    expect(start, "registre CUSTOM_WORK_ICONS introuvable").toBeGreaterThan(-1);
    const registry = code.slice(start, code.indexOf("};", start));

    for (const def of CUSTOM_WORK_CATALOG) {
      const expected = `  ${def.icon},`;
      expect(registry, `icône « ${def.icon} » absente du registre`).toContain(expected);
    }
  });

  it("n'utilise plus aucun emoji ni ancien champ `emoji` comme icône de travail", () => {
    for (const file of [...CUSTOM_WORK_FILES, ...CUSTOM_WORK_UI]) {
      expect(/\bemoji\b/.test(read(file)), `${file} référence encore « emoji »`).toBe(false);
    }
    for (const file of CUSTOM_WORK_FILES) {
      expect(EMOJI.test(read(file)), `${file} contient encore un emoji`).toBe(false);
    }
  });

  it("affiche les travaux via le composant partagé dans chaque vue concernée", () => {
    for (const file of CUSTOM_WORK_UI) {
      expect(read(file), `${file} ne rend pas CustomWorkIcon`).toContain("CustomWorkIcon");
    }
    // Le composant partagé est le SEUL à choisir un composant d'icône.
    expect(read("components/CustomWorkIcon.tsx")).toContain("CUSTOM_WORK_ICONS");
  });

  it("n'affiche aucune icône de travail dans le Quantitatif détaillé", () => {
    const code = read(QUANTITATIF_DETAILS);
    expect(code, "le Quantitatif détaillé ne doit plus rendre CustomWorkIcon").not.toContain(
      "CustomWorkIcon",
    );
    expect(code, "plus aucune icône de travail n'y est résolue").not.toContain(
      "getCustomWorkDef",
    );
    expect(EMOJI.test(code), `${QUANTITATIF_DETAILS} contient encore un emoji`).toBe(false);
  });

  it("résout chaque travail du catalogue par sa clé (icône comprise)", () => {
    for (const def of CUSTOM_WORK_CATALOG) {
      const resolved = getCustomWorkDef(def.key);
      expect(resolved?.icon).toBe(def.icon);
    }
  });
});
