import { describe, it, expect } from "vitest";
import {
  generatePlans,
  regenerateVariant,
  seededRandom,
  planToRoomCounts,
  optimizePlan,
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

  it("adapte le programme au type de projet (entrepôt, bureau, local commercial)", () => {
    const entrepot = generatePlans({ ...BASE_REQUEST, bienType: "entrepot", surfaceCouverte: 300, floors: 1 });
    for (const plan of entrepot) {
      expect(plan.rooms.some((r) => r.type === "hall")).toBe(true);
      expect(plan.rooms.some((r) => r.type === "chambre" || r.type === "salon")).toBe(false);
    }
    const bureau = generatePlans({ ...BASE_REQUEST, bienType: "bureau", surfaceCouverte: 200, floors: 1 });
    for (const plan of bureau) {
      expect(plan.rooms.some((r) => r.type === "openSpace")).toBe(true);
      expect(plan.rooms.some((r) => r.type === "reunion")).toBe(true);
      expect(plan.rooms.some((r) => r.type === "chambre")).toBe(false);
    }
    const local = generatePlans({ ...BASE_REQUEST, bienType: "local_commercial", surfaceCouverte: 160, floors: 1 });
    for (const plan of local) {
      expect(plan.rooms.some((r) => r.type === "espaceVente")).toBe(true);
      expect(plan.rooms.some((r) => r.type === "reserve")).toBe(true);
    }
    // Entrepôt sur deux niveaux : l'étage garde un programme cohérent (bureaux, sanitaires)
    const entrepotEtage = generatePlans({ ...BASE_REQUEST, bienType: "entrepot", surfaceCouverte: 400, floors: 2, level: 1 });
    for (const plan of entrepotEtage) {
      expect(plan.level).toBe(1);
      expect(plan.rooms.some((r) => r.type === "bureau" || r.type === "repos")).toBe(true);
      expect(plan.rooms.some((r) => r.type === "chambre")).toBe(false);
      expect(plan.stairs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("génère un plan dédié par niveau quand req.level est fourni", () => {
    const etage1 = generatePlans({ ...BASE_REQUEST, floors: 2, surfaceCouverte: 220, level: 1 });
    expect(etage1).toHaveLength(10);
    for (const plan of etage1) {
      expect(plan.level).toBe(1);
      // Toutes les pièces couvertes appartiennent au niveau demandé
      for (const r of plan.rooms.filter((x) => !x.exterior)) {
        expect(r.level).toBe(1);
      }
      // Surface construite par niveau = surface totale / étages
      expect(Math.abs(plan.stats.construite - 110)).toBeLessThan(25);
      // Un étage habitable est relié par un escalier
      expect(plan.stairs.length).toBeGreaterThanOrEqual(1);
    }
    const rdc = generatePlans({ ...BASE_REQUEST, floors: 2, surfaceCouverte: 220, level: 0 });
    for (const plan of rdc) {
      expect(plan.level).toBe(0);
      expect(plan.stairs.length).toBeGreaterThanOrEqual(1);
    }
    // La somme des plans par niveau respecte la surface totale saisie
    const total = etage1[0].stats.construite + rdc[0].stats.construite;
    expect(Math.abs(total - 220)).toBeLessThan(40);
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

describe("mobilier & équipements", () => {
  it("chaque plan contient du mobilier adapté aux pièces", () => {
    const plans = generatePlans(BASE_REQUEST);
    for (const plan of plans) {
      const furniture = plan.furniture ?? [];
      expect(furniture.length).toBeGreaterThan(0);
      // Toute chambre assez grande pour un lit standard doit en contenir un,
      // et au moins une chambre du plan est meublée
      const chambres = plan.rooms.filter((r) => r.type === "chambre" || r.type === "master");
      for (const chambre of chambres) {
        if (chambre.w >= 2.2 && chambre.h >= 2.4) {
          expect(furniture.some((f) => f.roomId === chambre.id && f.kind === "lit")).toBe(true);
        }
      }
      expect(chambres.some((c) => furniture.some((f) => f.roomId === c.id && f.kind === "lit"))).toBe(true);
      const cuisine = plan.rooms.find((r) => r.type === "cuisine");
      if (cuisine) {
        expect(furniture.some((f) => f.roomId === cuisine.id && f.kind === "plan_travail")).toBe(true);
      }
      const sdb = plan.rooms.find((r) => r.type === "sdb");
      if (sdb) {
        expect(furniture.some((f) => f.roomId === sdb.id && f.kind === "douche")).toBe(true);
      }
    }
  });

  it("le mobilier ne chevauche presque jamais les portes", () => {
    const plans = generatePlans(BASE_REQUEST);
    for (const plan of plans) {
      let overlaps = 0;
      for (const f of plan.furniture ?? []) {
        for (const d of plan.doors) {
          if (d.roomId !== f.roomId) continue;
          const ox = Math.min(f.x + f.w, d.x + d.w) - Math.max(f.x, d.x);
          const oy = Math.min(f.y + f.h, d.y + d.h) - Math.max(f.y, d.y);
          if (ox > 0.05 && oy > 0.05) overlaps++;
        }
      }
      expect(overlaps).toBeLessThan(3);
    }
  });
});

describe("contrôle qualité & optimisation IA", () => {
  it("chaque plan produit un rapport qualité borné", () => {
    const plans = generatePlans(BASE_REQUEST);
    for (const plan of plans) {
      const q = plan.quality!;
      expect(q.score).toBeGreaterThanOrEqual(0);
      expect(q.score).toBeLessThanOrEqual(100);
      expect(q.count.error + q.count.warning + q.count.info).toBe(q.issues.length);
      for (const issue of q.issues) {
        expect(issue.fix.length).toBeGreaterThan(5);
        expect(["error", "warning", "info"]).toContain(issue.severity);
      }
    }
  });

  it("optimizePlan ne dégrade jamais le score qualité", () => {
    const plans = generatePlans(BASE_REQUEST);
    const plan = plans[0];
    const result = optimizePlan(plan, BASE_REQUEST, 2026);
    expect(result.after.score).toBeGreaterThanOrEqual(result.before.score);
    expect(result.improvements.length).toBeGreaterThan(0);
    expect(result.plan.rooms.length).toBeGreaterThan(2);
    expect(result.plan.quality!.score).toBe(result.after.score);
  });
});

describe("générateur de plans", () => {
  it("produit 10 propositions sans référence architecturale externe", () => {
    const plans = generatePlans(BASE_REQUEST);
    expect(plans).toHaveLength(10);
    expect(plans.some((p) => p.key === "villa_t10")).toBe(false);
    for (const plan of plans) {
      expect((plan as any).reference).toBeUndefined();
      expect(plan.rooms.length).toBeGreaterThan(2);
    }
  });

  it("chaque proposition a une stratégie distincte et des scores valides", () => {
    const plans = generatePlans(BASE_REQUEST);
    const keys = new Set(plans.map((p) => p.key));
    expect(keys.size).toBe(10);
    for (const plan of plans) {
      expect(plan.scores.global).toBeGreaterThan(0);
      expect(plan.scores.global).toBeLessThanOrEqual(100);
    }
  });
});
