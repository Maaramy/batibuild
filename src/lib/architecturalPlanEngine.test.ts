import { describe, expect, it } from "vitest";
import { generateArchitecturalPlans } from "./architecturalPlanEngine";

const input = { category: "villa", surface: 180, landWidth: 12, landLength: 15, floors: 2, bedrooms: 3, bathrooms: 2, kitchens: 1, livingRooms: 1 };

describe("architecturalPlanEngine", () => {
  it("génère exactement dix variantes structurées", () => {
    const plans = generateArchitecturalPlans(input);
    expect(plans).toHaveLength(10);
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(10);
    expect(plans.every((plan) => plan.rooms.length > 0 && plan.walls.length > 0)).toBe(true);
  });
  it("conserve les surfaces géométriques et les limites", () => {
    for (const plan of generateArchitecturalPlans(input)) {
      expect(plan.rooms.every((room) => room.area > 0)).toBe(true);
      expect(plan.rooms.every((room) => room.x >= 0 && room.y >= 0)).toBe(true);
      expect(plan.validation.builtArea).toBeLessThanOrEqual(input.surface * input.floors + 0.1);
    }
  });
});
