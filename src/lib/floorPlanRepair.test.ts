import { describe, it, expect } from "vitest";
import { repairFloorPlan } from "./floorPlanEngine";
import type { FloorPlan, PlanRoom, WallSide } from "./floorPlanEngine";

function room(partial: Partial<PlanRoom>): PlanRoom {
  return {
    id: "r",
    kind: "chambre",
    label: "Chambre",
    x: 0,
    y: 0,
    w: 3,
    h: 3,
    area: 9,
    doors: [] as { wall: WallSide; position: number; width: number; isEntry?: boolean }[],
    windows: [] as { wall: WallSide; position: number; width: number }[],
    ...partial,
  } as PlanRoom;
}

function plan(rooms: PlanRoom[], length = 10, width = 8, level = 0): FloorPlan {
  return { level, length, width, rooms, area: rooms.reduce((s, r) => s + r.area, 0) };
}

describe("repairFloorPlan", () => {
  it("recalcule les surfaces (cohérence 2D = 3D)", () => {
    const p = plan([room({ w: 4, h: 3, area: 999 })]);
    const out = repairFloorPlan(p);
    expect(out.rooms[0].area).toBeCloseTo(12, 2);
    expect(out.area).toBeCloseTo(12, 2);
  });

  it("borne les pièces à l'emprise (murs continus, pas de débordement)", () => {
    const p = plan([room({ x: 8, y: 6, w: 5, h: 5 })], 10, 8);
    const out = repairFloorPlan(p);
    const r = out.rooms[0];
    expect(r.x + r.w).toBeLessThanOrEqual(10 + 1e-9);
    expect(r.y + r.h).toBeLessThanOrEqual(8 + 1e-9);
    expect(r.w).toBeGreaterThanOrEqual(0.8);
    expect(r.h).toBeGreaterThanOrEqual(0.8);
  });

  it("supprime le chevauchement entre deux pièces", () => {
    const a = room({ id: "a", x: 0, y: 0, w: 5, h: 5 });
    const b = room({ id: "b", x: 3, y: 0, w: 5, h: 5 }); // chevauche a sur x
    const out = repairFloorPlan(plan([a, b], 10, 5));
    const [ra, rb] = out.rooms;
    const ox = Math.min(ra.x + ra.w, rb.x + rb.w) - Math.max(ra.x, rb.x);
    const oy = Math.min(ra.y + ra.h, rb.y + rb.h) - Math.max(ra.y, rb.y);
    // Chevauchement réel = intersection sur LES DEUX axes simultanément
    expect(Math.max(0, ox) * Math.max(0, oy)).toBeLessThanOrEqual(0.02 * 0.02);
    // Les deux pièces conservent une surface exploitable
    expect(ra.area).toBeGreaterThanOrEqual(0.64);
    expect(rb.area).toBeGreaterThanOrEqual(0.64);
  });

  it("clamp les fenêtres dans leur mur (pas de fenêtre hors mur)", () => {
    const r = room({
      w: 4,
      h: 3,
      windows: [{ wall: "N", position: 3.8, width: 1.2 }], // dépasse le mur de 4 m
    });
    const out = repairFloorPlan(plan([r]));
    const win = out.rooms[0].windows[0];
    expect(win.position + win.width).toBeLessThanOrEqual(4 + 1e-9);
  });

  it("requalifie une porte de façade en fenêtre si un autre accès existe", () => {
    const r = room({
      y: 0, // mur N = façade
      w: 4,
      doors: [
        { wall: "N", position: 0.5, width: 0.9 }, // porte de façade (balcon)
        { wall: "S", position: 1, width: 0.9 }, // accès intérieur (S = mur interne ici)
      ],
    });
    const out = repairFloorPlan(plan([r], 10, 8));
    const rr = out.rooms[0];
    expect(rr.windows.some((w) => w.wall === "N")).toBe(true);
    expect(rr.doors.some((d) => d.wall === "S")).toBe(true);
    expect(rr.doors.some((d) => d.wall === "N")).toBe(false);
  });

  it("conserve la porte de façade si c'est le seul accès (pas de perte d'accès)", () => {
    const r = room({
      y: 0,
      doors: [{ wall: "N", position: 1, width: 0.9 }], // pas isEntry, unique accès
    });
    const out = repairFloorPlan(plan([r]));
    expect(out.rooms[0].doors).toHaveLength(1);
  });

  it("conserve la porte d'entrée sur façade", () => {
    const r = room({
      y: 0,
      doors: [{ wall: "N", position: 1, width: 1, isEntry: true }],
    });
    const out = repairFloorPlan(plan([r]));
    expect(out.rooms[0].doors).toHaveLength(1);
    expect(out.rooms[0].doors[0].isEntry).toBe(true);
  });

  it("donne un accès à toute pièce sans porte (circulation cohérente)", () => {
    const r = room({ id: "isolée", w: 3, h: 3, doors: [] });
    const out = repairFloorPlan(plan([r]));
    expect(out.rooms[0].doors.length).toBeGreaterThanOrEqual(1);
    const d = out.rooms[0].doors[0];
    expect(d.position).toBeGreaterThanOrEqual(0);
    expect(d.position + d.width).toBeLessThanOrEqual(
      (d.wall === "N" || d.wall === "S" ? out.rooms[0].w : out.rooms[0].h) + 1e-9,
    );
  });

  it("ne modifie pas un plan déjà cohérent (idempotent)", () => {
    const r = room({
      id: "sejour",
      kind: "sejour",
      label: "Séjour",
      x: 0,
      y: 0,
      w: 6,
      h: 5,
      area: 30,
      doors: [{ wall: "N", position: 1, width: 0.9 }],
      windows: [{ wall: "S", position: 0.5, width: 1.5 }],
    });
    // y=0 met le mur N sur la façade : la porte (non entry) deviendrait une
    // fenêtre. Utilisons y=3 pour un plan pleinement intérieur.
    const inner = {
      ...r,
      y: 3,
      doors: [{ wall: "S" as WallSide, position: 1, width: 0.9 }],
    };
    const p = plan([{ ...inner, area: 30 }], 12, 10);
    const before = JSON.stringify(p);
    const out1 = repairFloorPlan(p);
    const after1 = JSON.stringify(out1);
    repairFloorPlan(out1);
    expect(JSON.stringify(out1)).toBe(after1);
    // Le plan cohérent ne change quasiment pas (surfaces déjà exactes)
    expect(after1).toBe(before);
  });
});
