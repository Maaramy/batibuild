// ============================================================================
// RÈGLE DES PLANS 3D — Groupe D et tous les niveaux (RDC+)
// ----------------------------------------------------------------------------
// Ces tests verrouillent la règle métier ET son branchement dans les écrans :
//   · 3D pour les quatre logements historiques ET les cinq locaux du Groupe D ;
//   · 3D à chaque niveau (RDC, R+1, R+2…) et vue globale dès deux niveaux ;
//   · aucune 3D pour les Groupes B/C ni pour la piscine.
// ============================================================================
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  PLAN_3D_CATEGORIES,
  PLAN_3D_GROUP_D_CATEGORIES,
  allowsPlan3D,
  allowsPlan3DBuilding,
  allowsPlan3DLevel,
} from "@/lib/plan3dAccess";
import { PROJECT_JOURNEY_GROUP_D } from "@/lib/projectJourney";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const LOGEMENTS = ["maison", "villa", "studio", "appartement"] as const;
const GROUPE_D = ["local_commercial", "bureau", "entrepot", "restaurant", "cafe"] as const;

describe("plans 3D — types de projets autorisés", () => {
  it("autorise les quatre logements et les cinq locaux du Groupe D", () => {
    expect([...PLAN_3D_CATEGORIES]).toEqual([...LOGEMENTS, ...GROUPE_D]);
    expect([...PLAN_3D_GROUP_D_CATEGORIES]).toEqual([...GROUPE_D]);
    // La liste 3D reste alignée sur la classification centrale du parcours.
    expect([...PLAN_3D_GROUP_D_CATEGORIES]).toEqual([...PROJECT_JOURNEY_GROUP_D]);
    for (const category of PLAN_3D_CATEGORIES) {
      expect(allowsPlan3D(category), category).toBe(true);
    }
  });

  it("reconnaît les libellés et les anciens slugs des types autorisés", () => {
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
      "Local commercial",
      "Bureau",
      "Entrepôt",
      "Restaurant",
      "Café",
    ]) {
      expect(allowsPlan3D(category), category).toBe(true);
    }
  });

  it("refuse les groupes B et C ainsi que la piscine", () => {
    for (const category of [
      "duplex",
      "immeuble",
      "immeuble_residentiel",
      "local",
      "residence_touristique",
      "maison_hote",
      "projet_neuf",
      "renovation_complete",
      "renovation_cuisine",
      "renovation_salle_de_bain",
      "extension_batiment",
      "piscine",
      "piscine_beton",
      "piscine_coque",
      "electricite_complete",
      "plomberie_complete",
      "",
    ]) {
      expect(allowsPlan3D(category), category).toBe(false);
      expect(allowsPlan3DLevel(category, 0), category).toBe(false);
      expect(allowsPlan3DLevel(category, 1), category).toBe(false);
      expect(allowsPlan3DBuilding(category, 3), category).toBe(false);
    }
    expect(allowsPlan3D(null)).toBe(false);
    expect(allowsPlan3D(undefined)).toBe(false);
  });
});

describe("plans 3D — niveaux autorisés (RDC et RDC+)", () => {
  it("autorise chaque niveau de RDC à R+6 pour tous les types autorisés", () => {
    for (const category of PLAN_3D_CATEGORIES) {
      for (const level of [0, 1, 2, 3, 4, 5, 6]) {
        expect(allowsPlan3DLevel(category, level), `${category} niveau ${level}`).toBe(true);
      }
    }
  });

  it("refuse un niveau absent, négatif ou non fini", () => {
    expect(allowsPlan3DLevel("maison", undefined)).toBe(false);
    expect(allowsPlan3DLevel("maison", null)).toBe(false);
    expect(allowsPlan3DLevel("maison", -1)).toBe(false);
    expect(allowsPlan3DLevel("bureau", Number.NaN)).toBe(false);
  });

  it("propose la vue globale du bâtiment à partir de deux niveaux seulement", () => {
    for (const category of PLAN_3D_CATEGORIES) {
      expect(allowsPlan3DBuilding(category, 1), `${category} RDC`).toBe(false);
      expect(allowsPlan3DBuilding(category, 2), `${category} R+1`).toBe(true);
      expect(allowsPlan3DBuilding(category, 4), `${category} R+3`).toBe(true);
    }
    expect(allowsPlan3DBuilding("maison", undefined)).toBe(false);
    expect(allowsPlan3DBuilding("maison", 0)).toBe(false);
  });
});

describe("plans 3D — branchement dans l'interface et la génération", () => {
  it("la page des plans autorise la 3D à chaque niveau et la vue globale", () => {
    const page = read("src/pages/PlanGenerator.tsx");
    expect(page).toContain("allowsPlan3D");
    expect(page).toContain("allowsPlan3DBuilding");
    expect(page).toContain("FloorPlan3DBuilding");
    // L'onglet 3D n'est plus conditionné au RDC.
    expect(page).not.toMatch(/\{allow3D && floor\.level === 0 &&/);
    expect(page).not.toMatch(/const is3D = view === "3d" && allow3D && floor\.level === 0;/);
    // L'onglet global et la vue par niveau coexistent.
    expect(page).toMatch(/\{allow3D && \(\s*<TabsTrigger value="3d"/);
    expect(page).toMatch(/\{building3D && \(\s*<TabsTrigger value="building"/);
    expect(page).toMatch(/const is3D = \(view === "3d" && allow3D\) \|\| isBuilding3D;/);
  });

  it("l'aperçu automatique des plans propose la phase 3D pour le Groupe D", () => {
    const showcase = read("src/components/LifecycleStepResults.tsx");
    expect(showcase).toContain("allowsPlan3DLevel");
    expect(showcase).toMatch(/PLAN_PHASES\.filter\(\(p\) => p\.key !== "3d"\)/);
  });
});
