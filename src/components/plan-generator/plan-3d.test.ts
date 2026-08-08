// ============================================================================
// Tests unitaires — géométrie de la vue 3D isométrique (plan-3d.tsx)
// ============================================================================

import { describe, expect, it } from "vitest";
import {
  fitViewBox,
  isFaceVisible,
  projectIso,
  rotateYaw,
} from "./plan-3d";

describe("rotateYaw", () => {
  it("tourne (1, 0) de 90° vers ≈ (0, 1)", () => {
    const [x, y] = rotateYaw(1, 0, 90);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(1, 5);
  });

  it("préserve les distances (rotation pure)", () => {
    const [x, y] = rotateYaw(3, 4, 137);
    expect(Math.hypot(x, y)).toBeCloseTo(5, 5);
  });

  it("est déterministe pour un même angle", () => {
    const a = rotateYaw(2, -1, 33);
    const b = rotateYaw(2, -1, 33);
    expect(a[0]).toBeCloseTo(b[0], 10);
    expect(a[1]).toBeCloseTo(b[1], 10);
  });
});

describe("projectIso", () => {
  it("projette l'origine sur l'origine", () => {
    const [px, py] = projectIso(0, 0, 0);
    expect(px).toBeCloseTo(0, 10);
    expect(py).toBeCloseTo(0, 10);
  });

  it("monte le point vers le haut de l'écran quand z augmente", () => {
    const [, py0] = projectIso(0, 0, 0);
    const [, py1] = projectIso(0, 0, 5);
    expect(py1).toBeLessThan(py0);
  });

  it("est monotone croissant en rx", () => {
    const [a] = projectIso(1, 0, 0);
    const [b] = projectIso(5, 0, 0);
    expect(b).toBeGreaterThan(a);
  });
});

describe("isFaceVisible", () => {
  const NORMALS: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const countVisible = (deg: number) =>
    NORMALS.filter(([nx, ny]) => {
      const [rnx, rny] = rotateYaw(nx, ny, deg);
      return isFaceVisible(rnx, rny);
    }).length;

  it("expose exactement 2 faces d'un rectangle à 0° et à 35°", () => {
    expect(countVisible(0)).toBe(2);
    expect(countVisible(35)).toBe(2);
  });

  it("à 90°, deux faces opposées sont encore visibles (aucun angle n'est « par la tranche »)", () => {
    expect(countVisible(90)).toBe(2);
  });

  it("à 45°, deux faces sont vues par la tranche → une seule face nette", () => {
    // À 45°, les normales (0,1) et (0,-1) deviennent parallèles au plan de vue
    // (somme ≈ 0) : elles ne sont pas comptées comme visibles.
    expect(countVisible(45)).toBe(1);
  });
});

describe("fitViewBox", () => {
  it("retourne une échelle positive et une translation de centrage", () => {
    const pts: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 50],
      [0, 50],
    ];
    const { k, tx, ty } = fitViewBox(pts, 780, 480, 44);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThanOrEqual((780 - 88) / 100 + 1e-9);
    expect(tx).toBeGreaterThan(0);
    expect(ty).toBeGreaterThan(0);
  });

  it("adapte l'échelle quand les points sont grands", () => {
    const pts: [number, number][] = [
      [0, 0],
      [2000, 0],
      [2000, 800],
      [0, 800],
    ];
    const small = fitViewBox(pts, 780, 480, 44);
    const pts2: [number, number][] = [
      [0, 0],
      [200, 0],
      [200, 80],
      [0, 80],
    ];
    const big = fitViewBox(pts2, 780, 480, 44);
    expect(small.k).toBeLessThan(big.k);
  });
});
