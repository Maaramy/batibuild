// ============================================================================
// RÈGLE DES PLANS 3D — seuls maison / villa / studio / appartement, au RDC
// ----------------------------------------------------------------------------
// Ces tests verrouillent la règle métier ET son branchement dans les écrans :
// une régression ne doit jamais réafficher (ni régénérer) une vue 3D pour un
// autre type de projet ou pour un niveau R+1 et supérieur.
// ============================================================================
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  PLAN_3D_CATEGORIES,
  allowsPlan3D,
  allowsPlan3DLevel,
} from "@/lib/plan3dAccess";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("plans 3D — types de projets autorisés", () => {
  it("autorise exactement maison, villa, studio et appartement", () => {
    expect([...PLAN_3D_CATEGORIES]).toEqual(["maison", "villa", "studio", "appartement"]);
    for (const category of PLAN_3D_CATEGORIES) {
      expect(allowsPlan3D(category), category).toBe(true);
    }
  });

  it("reconnaît les libellés et les anciens slugs résidentiels", () => {
    for (const category of [
      " Maison ",
      "MAISON",
      "maison_r_plus_1",
      "Maison R+1",
      "Maison R+2",
      "maison_r_plus_2",
      "Villa",
      "Studio",
      "Appartement",
    ]) {
      expect(allowsPlan3D(category), category).toBe(true);
    }
  });

  it("refuse tous les autres types, quels que soient leurs niveaux", () => {
    for (const category of [
      "duplex",
      "immeuble",
      "immeuble_residentiel",
      "local",
      "local_commercial",
      "boutique_commerciale",
      "bureau",
      "entrepot",
      "residence_touristique",
      "maison_hote",
      "projet_neuf",
      "renovation_complete",
      "renovation_cuisine",
      "extension_batiment",
      "piscine",
      "piscine_beton",
      "restaurant",
      "cafe",
      "electricite_complete",
      "plomberie_complete",
      "",
    ]) {
      expect(allowsPlan3D(category), category).toBe(false);
      expect(allowsPlan3DLevel(category, 0), category).toBe(false);
      expect(allowsPlan3DLevel(category, 1), category).toBe(false);
    }
    expect(allowsPlan3D(null)).toBe(false);
    expect(allowsPlan3D(undefined)).toBe(false);
  });
});

describe("plans 3D — niveaux autorisés (RDC uniquement)", () => {
  it("autorise le RDC et refuse R+1, R+2, R+3 pour les quatre types", () => {
    for (const category of PLAN_3D_CATEGORIES) {
      expect(allowsPlan3DLevel(category, 0), `${category} RDC`).toBe(true);
      for (const level of [1, 2, 3, 4]) {
        expect(allowsPlan3DLevel(category, level), `${category} R+${level}`).toBe(false);
      }
    }
  });

  it("refuse un niveau absent", () => {
    expect(allowsPlan3DLevel("maison", undefined)).toBe(false);
    expect(allowsPlan3DLevel("maison", null)).toBe(false);
  });
});

describe("plans 3D — branchement dans l'interface et la génération", () => {
  it("la page des plans conditionne l'onglet 3D au type et au RDC", () => {
    const page = read("src/pages/PlanGenerator.tsx");
    expect(page).toContain("allowsPlan3D");
    // L'onglet « Vue 3D » n'existe que si le type est autorisé ET au RDC.
    expect(page).toMatch(/\{allow3D && floor\.level === 0 && \(\s*<TabsTrigger value="3d"/);
    // Le rendu 3D n'est monté que via la vue effective `is3D`.
    expect(page).toMatch(/const is3D = view === "3d" && allow3D && floor\.level === 0;/);
    expect(page).toMatch(/\) : !is3D \? \(/);
  });

  it("l'aperçu automatique des plans ne génère pas de phase 3D interdite", () => {
    const showcase = read("src/components/LifecycleStepResults.tsx");
    expect(showcase).toContain("allowsPlan3DLevel");
    expect(showcase).toMatch(/PLAN_PHASES\.filter\(\(p\) => p\.key !== "3d"\)/);
  });
});
