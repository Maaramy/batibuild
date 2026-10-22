import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { FloorPlan } from "@/lib/floorPlanEngine";
import { generateFloorPlans } from "@/lib/floorPlanEngine";
import { planEmergencyExit, planEntry } from "@/lib/planPresentation";
import { FloorPlan2D } from "./FloorPlan2D";
import { PlanSheet } from "./PlanSheet";

const CASES = [
  { category: "maison", surface: 100, floors: 2, label: "Maison", level1: true },
  { category: "villa", surface: 160, floors: 1, label: "Villa", level1: false },
  { category: "studio", surface: 35, floors: 1, label: "Studio", level1: false },
  { category: "appartement", surface: 80, floors: 1, label: "Appartement", level1: false },
  { category: "duplex", surface: 140, floors: 2, label: "Duplex", level1: true },
  { category: "cafe", surface: 90, floors: 1, label: "Café", level1: false },
  { category: "restaurant", surface: 180, floors: 1, label: "Restaurant", level1: false },
  { category: "local_commercial", surface: 120, floors: 1, label: "Local commercial", level1: false },
] as const;

function planFor(category: string, surface: number, floors: number, level = 0): FloorPlan {
  const variant = generateFloorPlans({ category, surface, floors })[0];
  return variant.floors[level];
}

function render(plan: FloorPlan, category: string, showThumbnail = false) {
  return renderToStaticMarkup(
    <PlanSheet
      plan={plan}
      category={category}
      projectName="Projet de test"
      showThumbnail={showThumbnail}
      viewSwitch={<span>Plan 2D</span>}
      levelSwitch={<span>RDC</span>}
      controls={<span>zoom</span>}
    >
      <FloorPlan2D plan={plan} />
    </PlanSheet>,
  );
}

describe("PlanSheet — feuille de présentation des plans", () => {
  it.each(CASES)(
    "présente $label avec type, niveau, éléments clés et légende",
    ({ category, surface, floors, label }) => {
      const html = render(planFor(category, surface, floors), category);
      expect(html).toContain('data-slot="plan-sheet"');
      expect(html).toContain("Projet de test");
      expect(html).toContain(label);
      expect(html).toContain("Rez-de-chaussée");
      expect(html).toContain("Éléments clés");
      expect(html).toContain("Légende");
      expect(html).toContain("Surface couverte");
      // Le plan reste le plan généré : noms de pièces et surfaces sur le dessin.
      const plan = planFor(category, surface, floors);
      const biggest = [...plan.rooms].sort((a, b) => b.area - a.area)[0];
      expect(html).toContain(biggest.label.toUpperCase());
    },
  );

  it("affiche l'enseigne verte de l'entrée principale sur le plan 2D", () => {
    for (const { category, surface, floors } of CASES) {
      const plan = planFor(category, surface, floors);
      if (!planEntry(plan)) continue;
      expect(render(plan, category)).toContain("ENTRÉE PRINCIPALE");
    }
  });

  it("affiche la signalétique de secours uniquement si une sortie existe", () => {
    for (const { category, surface, floors } of CASES) {
      const plan = planFor(category, surface, floors);
      const html = render(plan, category);
      if (planEmergencyExit(plan)) {
        expect(html).toContain("SORTIE DE SECOURS");
      } else {
        expect(html).not.toContain("SORTIE DE SECOURS");
      }
    }
  });

  it("nomme le niveau 1 d'une maison R+1 et garde le même modèle graphique", () => {
    const floor1 = planFor("maison", 100, 2, 1);
    const html = render(floor1, "maison");
    expect(html).toContain("Niveau 1");
    expect(html).toContain('data-slot="plan-sheet"');
    expect(html).toContain("Éléments clés");
  });

  it("ajoute la vignette extérieure pour les typologies 3D seulement", () => {
    const maison = render(planFor("maison", 100, 2), "maison", true);
    expect(maison).toContain("Vue extérieure 3D");
    const cafe = render(planFor("cafe", 90, 1), "cafe", false);
    expect(cafe).not.toContain("Vue extérieure 3D");
  });

  it("laisse toute la largeur au plan, le panneau d'information passant dessous", () => {
    const html = render(planFor("maison", 100, 2), "maison", true);
    // Le panneau latéral ne revient à droite du plan qu'à partir de 1536 px :
    // en dessous, le plan occupe la feuille entière (aucun plafond à 1280 px).
    expect(html).toContain("2xl:grid-cols-[minmax(0,1fr)_17rem]");
    const planAt = html.indexOf("ENTRÉE PRINCIPALE");
    const asideAt = html.indexOf("<aside");
    const outsideAt = html.indexOf("Vue extérieure 3D");
    expect(planAt).toBeGreaterThan(-1);
    expect(planAt).toBeLessThan(asideAt);
    expect(outsideAt).toBeGreaterThan(asideAt);
  });

  it("adapte la légende au plan (bois d'entrée, porte de service)", () => {
    const cafe = planFor("cafe", 90, 1);
    const html = render(cafe, "cafe");
    expect(html).toContain("Entrée principale");
    if (cafe.rooms.some((r) => r.doors.some((d) => d.isService))) {
      expect(html).toContain("Porte de service");
    }
  });
});
