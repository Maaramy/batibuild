import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { FloorPlan2D, PLAN_ZOOM_MAX, PLAN_ZOOM_MIN } from "./FloorPlan2D";
import { PlanZoomButtons } from "./PlanZoomButtons";
import type { FloorPlan } from "@/lib/floorPlanEngine";

// Plan de test : 8 × 6 m, séjour en façade sud, chambre à l'étage non concerné.
const PLAN: FloorPlan = {
  level: 0,
  length: 8,
  width: 6,
  area: 48,
  rooms: [
    {
      id: "sejour",
      kind: "sejour",
      label: "Séjour",
      x: 0,
      y: 0,
      w: 5,
      h: 6,
      area: 30,
      doors: [
        { wall: "S", position: 1, width: 1, isEntry: true },
        { wall: "E", position: 3, width: 0.9, isEmergency: true },
      ],
      windows: [{ wall: "N", position: 2, width: 1.2 }],
    },
    {
      id: "cuisine",
      kind: "cuisine",
      label: "Cuisine",
      x: 5,
      y: 0,
      w: 3,
      h: 6,
      area: 18,
      doors: [{ wall: "W", position: 2, width: 0.9 }],
      windows: [{ wall: "E", position: 2, width: 1.2 }],
    },
  ],
};

// Échelle du composant : S = clamp(640 / length, 14, 44).
const S = Math.max(14, Math.min(44, 640 / PLAN.length));
const PAD = 46;
const FULL_W = PLAN.length * S + PAD * 2;
const FULL_H = PLAN.width * S + PAD * 2;

function viewBox(html: string): number[] {
  const match = html.match(/viewBox="([^"]+)"/);
  expect(match).not.toBeNull();
  return match![1].split(/\s+/).map(Number);
}

describe("FloorPlan2D — zoom vectoriel centré", () => {
  it("affiche le plan entier au repos (zoom 1)", () => {
    const html = renderToStaticMarkup(<FloorPlan2D plan={PLAN} />);
    const [x, y, w, h] = viewBox(html);
    expect(x).toBeCloseTo(-PAD, 3);
    expect(y).toBeCloseTo(-PAD, 3);
    expect(w).toBeCloseTo(FULL_W, 3);
    expect(h).toBeCloseTo(FULL_H, 3);
    expect(html).toContain('data-zoom="1"');
  });

  it("zoome progressivement en restant centré sur le plan", () => {
    const html = renderToStaticMarkup(<FloorPlan2D plan={PLAN} zoom={2} />);
    const [x, y, w, h] = viewBox(html);
    expect(w).toBeCloseTo(FULL_W / 2, 3);
    expect(h).toBeCloseTo(FULL_H / 2, 3);
    // Centrage exact : marges identiques de chaque côté.
    expect(x).toBeCloseTo(-PAD + (FULL_W - w) / 2, 3);
    expect(y).toBeCloseTo(-PAD + (FULL_H - h) / 2, 3);
    expect(html).toContain('data-zoom="2"');
  });

  it("borne le zoom entre le plan entier et le maximum", () => {
    const min = viewBox(renderToStaticMarkup(<FloorPlan2D plan={PLAN} zoom={0.2} />));
    expect(min[2]).toBeCloseTo(FULL_W / PLAN_ZOOM_MIN, 3);

    const max = viewBox(renderToStaticMarkup(<FloorPlan2D plan={PLAN} zoom={99} />));
    expect(max[2]).toBeCloseTo(FULL_W / PLAN_ZOOM_MAX, 3);
  });

  it("affiche les portes extérieures : entrée et sortie de secours", () => {
    const html = renderToStaticMarkup(<FloorPlan2D plan={PLAN} />);
    expect(html).toContain("ENTRÉE");
    expect(html).toContain("SECOURS");
  });
});

describe("PlanZoomButtons — boutons loupe + / −", () => {
  it("expose les trois boutons ronds accessibles (loupe +, loupe −, recadrage)", () => {
    const html = renderToStaticMarkup(
      <PlanZoomButtons
        onZoomIn={() => undefined}
        onZoomOut={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(html).toContain('aria-label="Zoom avant"');
    expect(html).toContain('aria-label="Zoom arrière"');
    expect(html).toContain("Réinitialiser le zoom");
    // Même présentation que la barre d'outils des plans techniques.
    expect(html).toContain("rounded-full");
    expect(html).not.toContain("%");
  });

  it("désactive les bornes atteintes", () => {
    const html = renderToStaticMarkup(
      <PlanZoomButtons onZoomIn={() => undefined} onZoomOut={() => undefined} canZoomIn={false} />,
    );
    const hasDisabledAttribute = (tag: string) => /\sdisabled(?:="")?(?=[\s/>])/.test(tag);
    const plusButton = html.match(/<button[^>]*aria-label="Zoom avant"[^>]*>/)?.[0] ?? "";
    expect(hasDisabledAttribute(plusButton)).toBe(true);
    const minusButton = html.match(/<button[^>]*aria-label="Zoom arrière"[^>]*>/)?.[0] ?? "";
    expect(hasDisabledAttribute(minusButton)).toBe(false);
  });
});
