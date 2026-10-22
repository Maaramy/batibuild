// ============================================================================
// GARDE-FOUS DES VISIONNEUSES DE PLANS ARCHITECTURAUX
// ----------------------------------------------------------------------------
// Le clic sur un plan / une vignette ne doit JAMAIS ouvrir un plein écran :
// les plans restent dans leur carte. Les vues 2D et 3D exposent en revanche
// les mêmes boutons de zoom (+ / −). Ces vérifications de source empêchent la
// réintroduction silencieuse d'un aperçu plein écran ou la perte des commandes
// de zoom lors d'un futur refactor.
// ============================================================================
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const PAGE = "src/pages/PlanGenerator.tsx";
const VIEWER_2D = "src/components/floorplan/FloorPlan2D.tsx";
const VIEWER_3D_HD = "src/components/floorplan/FloorPlan3DHD.tsx";
const VIEWER_3D_LEGACY = "src/components/floorplan/FloorPlan3DLegacy.tsx";

describe("plans architecturaux — aucun plein écran automatique", () => {
  it("la page des plans n'ouvre plus d'aperçu plein écran au clic", () => {
    const page = read(PAGE);
    expect(page).not.toMatch(/requestFullscreen/);
    expect(page).not.toMatch(/previewOpen/);
    expect(page).not.toMatch(/DialogContent/);
    // Le plan 2D reste dans sa carte et reçoit simplement le zoom courant.
    expect(page).toMatch(/<FloorPlan2D[\s\S]*?zoom=\{zoom2d\}/);
  });

  it("les vues 3D ne quittent plus leur conteneur (aucun plein écran natif)", () => {
    for (const file of [VIEWER_3D_HD, VIEWER_3D_LEGACY]) {
      const source = read(file);
      expect(source, file).not.toMatch(/requestFullscreen/);
      expect(source, file).not.toMatch(/exitFullscreen/);
      expect(source, file).not.toMatch(/fullscreenElement/);
    }
  });
});

describe("plans architecturaux — zoom loupe + / − sur les deux vues", () => {
  it("la vue 2D expose un zoom vectoriel borné et le zoom à la main", () => {
    const source = read(VIEWER_2D);
    expect(source).toMatch(/PLAN_ZOOM_MIN/);
    expect(source).toMatch(/PLAN_ZOOM_MAX/);
    expect(source).toMatch(/onZoomChange/);
    expect(source).toMatch(/pointersRef/);
    expect(source).toMatch(/touchAction/);
  });

  it("la page et les plans techniques branchent les mêmes boutons ronds", () => {
    for (const file of [PAGE, "src/components/floorplan/TechnicalPlansPanel.tsx"]) {
      const source = read(file);
      expect(source, file).toContain("<PlanZoomButtons");
      expect(source, file).toMatch(/onZoomIn=/);
      expect(source, file).toMatch(/onZoomOut=/);
    }
    // Le module partagé utilise les loupes et des boutons ronds.
    const buttons = read("src/components/floorplan/PlanZoomButtons.tsx");
    expect(buttons).toContain("ZoomIn");
    expect(buttons).toContain("ZoomOut");
    expect(buttons).toContain("rounded-full");
  });

  it("les deux moteurs 3D reçoivent les commandes de zoom de la barre d'outils", () => {
    for (const file of [VIEWER_3D_HD, VIEWER_3D_LEGACY]) {
      const source = read(file);
      expect(source, file).toMatch(/zoomAction/);
      expect(source, file).toMatch(/zoomBy/);
      expect(source, file).not.toContain("<PlanZoomButtons");
    }
  });

  it("aucun contour filaire, cote ni fond sombre autour de la maquette 3D", () => {
    for (const file of [VIEWER_3D_HD, VIEWER_3D_LEGACY]) {
      const source = read(file);
      expect(source, file).not.toMatch(/shellEdges/);
      expect(source, file).not.toMatch(/dimGroup/);
      expect(source, file).not.toMatch(/makeTextSprite/);
      expect(source, file).not.toMatch(/dark:from-slate-9/);
      // Fond d'atelier clair obligatoire : dégradé historique, blanc cassé de
      // la feuille de présentation (#FBFAF7) ou feuille blanche (#FFFFFF).
      expect(source, file).toMatch(/from-sky-50|#FBFAF7|#FFFFFF/);
    }
    expect(read("src/components/floorplan/site3D.ts")).not.toMatch(/boundary/);
  });
});
