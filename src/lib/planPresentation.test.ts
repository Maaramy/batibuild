import { describe, expect, it } from "vitest";

import { generateFloorPlans } from "./floorPlanEngine";
import {
  builtArea,
  ENTRY_SIGN_TEXT,
  EXIT_SIGN_TEXT,
  planEmergencyExit,
  planEntry,
  planHasExteriorThumbnail,
  planKeyElements,
  planLegend,
  planLevelLabel,
  planServiceExit,
  planTypeMeta,
} from "./planPresentation";

// Un plan réel par typologie : même moteur que la page des plans.
const CASES: { category: string; surface: number; floors: number; label: string }[] = [
  { category: "maison", surface: 100, floors: 2, label: "Maison" },
  { category: "villa", surface: 160, floors: 1, label: "Villa" },
  { category: "studio", surface: 35, floors: 1, label: "Studio" },
  { category: "appartement", surface: 80, floors: 1, label: "Appartement" },
  { category: "duplex", surface: 140, floors: 2, label: "Duplex" },
  { category: "cafe", surface: 90, floors: 1, label: "Café" },
  { category: "restaurant", surface: 180, floors: 1, label: "Restaurant" },
  { category: "local_commercial", surface: 120, floors: 1, label: "Local commercial" },
];

const plans = CASES.map((testCase) => {
  const variant = generateFloorPlans({
    category: testCase.category,
    surface: testCase.surface,
    floors: testCase.floors,
  })[0];
  return { ...testCase, variant, floor: variant.floors[0] };
});

describe("PlanSheet — identité graphique commune", () => {
  it("affiche le type de projet sélectionné pour les huit typologies", () => {
    for (const { category, label } of plans) {
      expect(planTypeMeta(category).label).toBe(label);
    }
  });

  it("nomme le niveau affiché", () => {
    expect(planLevelLabel(0)).toBe("Rez-de-chaussée");
    expect(planLevelLabel(1)).toBe("Niveau 1");
    expect(planLevelLabel(2)).toBe("Niveau 2");
  });

  it("conserve les surfaces réelles dans les éléments clés", () => {
    for (const { floor, category } of plans) {
      const elements = planKeyElements(floor, category);
      const surface = elements.find((e) => e.label === "Surface couverte");
      expect(surface).toBeDefined();
      expect(surface!.value).toBe(`${(Math.round(builtArea(floor) * 10) / 10).toFixed(1)} m²`);
      const footprint = elements.find((e) => e.label === "Emprise");
      expect(footprint!.value).toBe(
        `${(Math.round(floor.length * 10) / 10).toFixed(1)} × ${(Math.round(floor.width * 10) / 10).toFixed(1)} m`,
      );
    }
  });

  it("adapte les éléments clés au type de projet, sans copier le programme d'un autre", () => {
    const cafe = plans.find((p) => p.category === "cafe")!;
    const restaurant = plans.find((p) => p.category === "restaurant")!;
    const maison = plans.find((p) => p.category === "maison")!;
    const commerce = plans.find((p) => p.category === "local_commercial")!;

    expect(planKeyElements(cafe.floor, cafe.category).some((e) => e.label === "Salle café")).toBe(true);
    expect(
      planKeyElements(restaurant.floor, restaurant.category).some(
        (e) => e.label === "Salle de restauration",
      ),
    ).toBe(true);
    expect(
      planKeyElements(restaurant.floor, restaurant.category).some(
        (e) => e.label === "Cuisine professionnelle",
      ),
    ).toBe(true);
    expect(planKeyElements(maison.floor, maison.category).some((e) => e.label === "Séjour")).toBe(
      true,
    );
    // Les chambres d'une maison R+1 sont annoncées sur le niveau qui les porte.
    const upstairs = maison.variant.floors[1];
    expect(planKeyElements(upstairs, maison.category).some((e) => e.label === "Chambres")).toBe(true);
    expect(
      planKeyElements(commerce.floor, commerce.category).some((e) => e.label === "Surface de vente"),
    ).toBe(true);
    // Aucun café / restaurant ne reprend les pièces d'une maison.
    expect(planKeyElements(cafe.floor, cafe.category).some((e) => e.label === "Chambres")).toBe(false);
  });

  it("n'annonce une sortie de secours que si la porte existe réellement", () => {
    const entries = plans.slice(0, 5);
    for (const { floor, category } of entries) {
      const legend = planLegend(floor, category);
      const hasExit = planEmergencyExit(floor) !== null;
      expect(legend.some((entry) => entry.symbol === "emergency")).toBe(hasExit);
    }
  });

  it("liste les symboles réellement présents sur le plan", () => {
    for (const { floor, category } of plans) {
      const legend = planLegend(floor, category);
      expect(legend.some((entry) => entry.symbol === "wall")).toBe(true);
      expect(legend.some((entry) => entry.symbol === "door")).toBe(true);
      expect(legend.some((entry) => entry.symbol === "furniture")).toBe(true);
      // Bois d'entrée : uniquement quand une entrée principale est dessinée.
      expect(legend.some((entry) => entry.symbol === "wood")).toBe(planEntry(floor) !== null);
      // Porte de service : seulement si le plan en comporte une.
      expect(legend.some((entry) => entry.symbol === "service")).toBe(
        planServiceExit(floor) !== null,
      );
    }
  });

  it("porte les mentions exactes de la signalétique", () => {
    expect(ENTRY_SIGN_TEXT).toBe("ENTRÉE PRINCIPALE");
    expect(EXIT_SIGN_TEXT).toBe("SORTIE DE SECOURS");
  });

  it("réserve la vignette extérieure aux typologies compatibles avec la 3D", () => {
    expect(planHasExteriorThumbnail("maison")).toBe(true);
    expect(planHasExteriorThumbnail("villa")).toBe(true);
    expect(planHasExteriorThumbnail("studio")).toBe(true);
    expect(planHasExteriorThumbnail("appartement")).toBe(true);
    expect(planHasExteriorThumbnail("duplex")).toBe(true);
    // Groupe D : les locaux professionnels sont désormais rendus en 3D.
    expect(planHasExteriorThumbnail("cafe")).toBe(true);
    expect(planHasExteriorThumbnail("restaurant")).toBe(true);
    expect(planHasExteriorThumbnail("local_commercial")).toBe(true);
    expect(planHasExteriorThumbnail("bureau")).toBe(true);
    expect(planHasExteriorThumbnail("entrepot")).toBe(true);
  });
});
