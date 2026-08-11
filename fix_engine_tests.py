P = "/home/daytona/codebase/src/convex/planEngine.test.ts"
src = open(P, encoding="utf-8").read()

new_tests = '''
describe("mobilier & équipements", () => {
  it("chaque plan contient du mobilier adapté aux pièces", () => {
    const plans = generatePlans(BASE_REQUEST);
    for (const plan of plans) {
      const furniture = plan.furniture ?? [];
      expect(furniture.length).toBeGreaterThan(0);
      // Une chambre doit contenir un lit, une cuisine un plan de travail
      const chambre = plan.rooms.find((r) => r.type === "chambre" || r.type === "master");
      if (chambre) {
        expect(furniture.some((f) => f.roomId === chambre.id && f.kind === "lit")).toBe(true);
      }
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

describe("référence architecturale Villa T10", () => {
  it("la première proposition est la stratégie Villa T10 avec sa référence", () => {
    const plans = generatePlans(BASE_REQUEST);
    expect(plans[0].key).toBe("villa_t10");
    expect(plans[0].reference?.name).toContain("Villa T10");
    expect((plans[0].reference?.principles.length ?? 0)).toBeGreaterThan(3);
    for (const plan of plans) {
      expect(plan.reference?.name).toBeDefined();
    }
  });

  it("la stratégie Villa T10 place un hall central qui dessert les pièces", () => {
    const plan = generatePlans(BASE_REQUEST)[0];
    const hall = plan.rooms.find((r) => r.type === "circulation");
    expect(hall).toBeDefined();
    expect(hall!.w).toBeGreaterThanOrEqual(1.7);
    // Le hall central sépare deux zones : des pièces à gauche et à droite
    const interior = plan.rooms.filter((r) => !r.exterior && r.id !== hall!.id);
    const left = interior.filter((r) => r.x + r.w <= hall!.x + 0.05);
    const right = interior.filter((r) => r.x >= hall!.x + hall!.w - 0.05);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
  });
});
'''

marker = "});\n"
# Insérer avant la dernière fermeture du describe racine — on ajoute simplement à la fin du fichier.
src = src.rstrip() + "\n" + new_tests + "\n"
open(P, "w", encoding="utf-8").write(src)
print("OK")
