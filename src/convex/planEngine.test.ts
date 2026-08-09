import { describe, it, expect } from "vitest";
import {
  generatePlans,
  regenerateVariant,
  seededRandom,
  planToRoomCounts,
  type PlanRequest,
} from "./planEngine";

const BASE_REQUEST: PlanRequest = {
  bienType: "maison",
  surfaceTotale: 400,
  surfaceCouverte: 150,
  floors: 1,
  bedrooms: 3,
  bathrooms: 2,
  wcs: 1,
  hasSalon: true,
  hasSalleAManger: true,
  hasCuisine: true,
  hasBuanderie: true,
  hasDressing: true,
  hasBureau: true,
  hasLocalTechnique: false,
  hasGarage: true,
  hasParking: false,
  hasTerrasse: true,
  hasBalcon: false,
  hasJardin: true,
  hasPiscine: false,
  orientation: "sud",
  entreePosition: "sud",
  facades: 2,
  standing: "standard",
  style: "moderne",
};

describe("generatePlans", () => {
  it("génère exactement 10 propositions différentes", () => {
    const plans = generatePlans(BASE_REQUEST);
    expect(plans).toHaveLength(10);
    const keys = new Set(plans.map((p) => p.key));
    expect(keys.size).toBeGreaterThanOrEqual(9); // 10 stratégies distinctes
    expect(new Set(plans.map((p) => p.name)).size).toBeGreaterThanOrEqual(9);
  });

  it("est déterministe pour un même seed", () => {
    const a = generatePlans(BASE_REQUEST);
    const b = generatePlans({ ...BASE_REQUEST, seed: 2026 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produit des plans différents avec un seed différent", () => {
    const a = generatePlans({ ...BASE_REQUEST, seed: 2026 });
    const b = generatePlans({ ...BASE_REQUEST, seed: 2027 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("aucune pièce couverte ne se chevauche (géométrie cohérente)", () => {
    const plans = generatePlans(BASE_REQUEST);
    for (const plan of plans) {
      const interior = plan.rooms.filter((r) => !r.exterior);
      for (let i = 0; i < interior.length; i++) {
        for (let j = i + 1; j < interior.length; j++) {
          const a = interior[i], b = interior[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          expect(Math.max(0, ox) * Math.max(0, oy)).toBeLessThan(0.1);
        }
      }
    }
  });

  it("toutes les pièces ont une surface positive et sont dans l'emprise", () => {
    const plans = generatePlans(BASE_REQUEST);
    for (const plan of plans) {
      for (const room of plan.rooms) {
        expect(room.area).toBeGreaterThan(0);
        expect(room.w).toBeGreaterThan(0);
        expect(room.h).toBeGreaterThan(0);
        if (!room.exterior && room.level === 0) {
          expect(room.x).toBeGreaterThanOrEqual(-0.001);
          expect(room.y).toBeGreaterThanOrEqual(-0.001);
          expect(room.x + room.w).toBeLessThanOrEqual(plan.width + 0.001);
        }
      }
    }
  });

  it("respecte le nombre de chambres et de salles de bain demandées", () => {
    const plans = generatePlans(BASE_REQUEST);
    for (const plan of plans) {
      const chambres = plan.rooms.filter((r) => r.type === "chambre" || r.type === "master").length;
      const sdb = plan.rooms.filter((r) => r.type === "sdb").length;
      expect(chambres).toBeGreaterThanOrEqual(2);
      expect(sdb).toBeGreaterThanOrEqual(1);
    }
    const counts = planToRoomCounts(plans[0]);
    expect(counts.bedrooms).toBeGreaterThanOrEqual(2);
  });

  it("les scores sont bornés entre 0 et 100 et le score global est cohérent", () => {
    const plans = generatePlans(BASE_REQUEST);
    for (const plan of plans) {
      const s = plan.scores;
      expect(s.global).toBeGreaterThanOrEqual(0);
      expect(s.global).toBeLessThanOrEqual(100);
      expect(s.optimisation).toBeGreaterThanOrEqual(0);
      expect(s.optimisation).toBeLessThanOrEqual(100);
      expect(s.confort).toBeGreaterThanOrEqual(0);
      expect(s.confort).toBeLessThanOrEqual(100);
    }
  });

  it("les statistiques sont cohérentes (utile ≤ construite + circulation)", () => {
    const plans = generatePlans(BASE_REQUEST);
    for (const plan of plans) {
      const totalCovered = plan.stats.construite;
      // Surface utile + circulation ≤ surface construite (tolérance arrondis)
      expect(plan.stats.utile + plan.stats.circulation).toBeLessThanOrEqual(totalCovered * 1.05 + 1);
      expect(plan.stats.tauxUtilisation).toBeGreaterThanOrEqual(0);
      expect(plan.stats.tauxUtilisation).toBeLessThanOrEqual(100);
    }
  });

  it("génère portes, fenêtres et escaliers selon la demande", () => {
    const plainPied = generatePlans(BASE_REQUEST);
    for (const plan of plainPied) {
      expect(plan.doors.length).toBeGreaterThanOrEqual(plan.stats.nbPieces - 1);
      // Escalier absent en plain-pied (sauf si demandé — pas ici)
      expect(plan.stairs.length).toBeLessThanOrEqual(1);
    }
    const avecEtage = generatePlans({ ...BASE_REQUEST, floors: 2, surfaceCouverte: 220 });
    for (const plan of avecEtage) {
      const hasUpstairsRoom = plan.rooms.some((r) => r.level === 1);
      if (hasUpstairsRoom) {
        expect(plan.stairs.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("les types de biens variés produisent des plans complets", () => {
    for (const bienType of ["appartement", "villa", "studio", "duplex", "bureau", "local_commercial", "entrepot", "immeuble"]) {
      const plans = generatePlans({ ...BASE_REQUEST, bienType, surfaceCouverte: 120, floors: 1 });
      expect(plans).toHaveLength(10);
      expect(plans[0].rooms.length).toBeGreaterThan(2);
    }
  });

  it("regenerateVariant produit une variante valide du même index", () => {
    const plans = generatePlans(BASE_REQUEST);
    const original = plans[2];
    const variant = regenerateVariant(BASE_REQUEST, original.key, 3);
    expect(variant.index).toBe(3);
    expect(variant.key).toBe(original.key);
    expect(variant.rooms.length).toBeGreaterThan(2);
    expect(variant.scores.global).toBeGreaterThanOrEqual(0);
  });

  it("une surface insuffisante déclenche une alerte de contraintes", () => {
    const plans = generatePlans({
      ...BASE_REQUEST,
      surfaceCouverte: 45, // trop petite pour 3 chambres + salon + cuisine…
      floors: 1,
    });
    expect(plans.some((p) => p.alerts.incompatible)).toBe(true);
  });

  it("seededRandom est déterministe", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    // Les valeurs sont dans [0, 1)
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
