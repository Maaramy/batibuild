import { it } from "vitest";
import { generateDqe } from "@/convex/dqeEngine";
import { generateRoadmap } from "@/convex/roadmapEngine";

it("trames avec vrais lots", () => {
  for (const category of [
    "maison", "villa", "appartement", "studio", "duplex", "immeuble",
    "local_commercial", "bureau", "entrepot", "cafe", "restaurant",
    "residence_touristique", "piscine", "renovation_cuisine",
    "renovation_salle_de_bain", "renovation_complete", "extension_batiment",
    "electricite_complete", "plomberie_complete",
  ]) {
    const dqe = generateDqe({ category: category as any, surface: 120, floors: 1, totalBudget: 200_000 });
    const lots = dqe.lots as any[];
    const total = lots.reduce((s, l) => s + l.subtotal, 0);
    const roadmap = generateRoadmap({
      _id: "p", name: category, category, surface: 120, floors: 1,
      costEstimate: {
        totalCost: total,
        breakdown: lots.map((l) => ({ category: l.id, label: l.name, estimatedCost: l.subtotal, percentage: 0 })),
        budgetScenarios: {
          economique: { totalCost: Math.round(total * 0.85), costPerM2: 0, label: "Économique", multiplier: 0.85 },
          standard: { totalCost: total, costPerM2: 0, label: "Standard", multiplier: 1 },
          premium: { totalCost: Math.round(total * 1.3), costPerM2: 0, label: "Premium", multiplier: 1.3 },
        },
      },
      quantitatif: { lots },
    });
    const exec = roadmap.execution!;
    const uncovered = exec.categories.filter((c) => c.taskIds.length === 0).map((c) => c.id);
    console.log(
      category, "| tâches:", roadmap.construction.length,
      "| phases:", exec.phases.map((p) => p.key).join(","),
      "| catégories:", exec.categories.length,
      "| non couvertes:", uncovered.join(",") || "-",
    );
  }
});
