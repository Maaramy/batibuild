import { it } from "vitest";
import { generateDqe } from "@/convex/dqeEngine";

it("lots par type", () => {
  for (const category of [
    "maison", "villa", "appartement", "studio", "duplex", "immeuble",
    "local_commercial", "bureau", "entrepot", "cafe", "restaurant",
    "residence_touristique", "piscine", "renovation_cuisine",
    "renovation_salle_de_bain", "renovation_complete", "extension_batiment",
    "electricite_complete", "plomberie_complete",
  ]) {
    try {
      const dqe = generateDqe({ category: category as any, surface: 100, floors: 1, totalBudget: 200_000 });
      console.log(category, "=>", dqe.lots.map((l: any) => `${l.id}:${l.name}`).join(" | "));
    } catch (e) {
      console.log(category, "ERREUR", (e as Error).message);
    }
  }
});
