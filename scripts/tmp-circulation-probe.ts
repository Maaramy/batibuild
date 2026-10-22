import { generateFloorPlans } from "../src/lib/floorPlanEngine";

const CATEGORIES = [
  "maison",
  "villa",
  "appartement",
  "studio",
  "duplex",
  "immeuble",
  "residence_touristique",
  "local",
  "local_commercial",
  "bureau",
  "entrepot",
  "restaurant",
  "cafe",
  "projet_neuf",
  "renovation_complete",
  "atelier",
  "boutique_commerciale",
  "piscine",
  "extension_batiment",
  "electricite_complete",
];

const start = performance.now();
let calls = 0;
for (const category of CATEGORIES) {
  for (const surface of [60, 120, 250]) {
    const variants = generateFloorPlans({ category, surface, floors: 2 } as any);
    calls++;
    const bad: string[] = [];
    for (const v of variants) {
      if (!v.validation.circulationOk) {
        bad.push(`${v.name}: ${v.validation.issues.slice(0, 3).join(" / ")}`);
      }
    }
    const first = variants[0].validation.circulation;
    console.log(
      category,
      surface,
      "ok:",
      variants.filter((v) => v.validation.circulationOk).length,
      "/10",
      "minCorr:",
      first?.minCorridorWidth,
      "minDoor:",
      first?.minDoorWidth,
      "unreach:",
      first?.unreachable.length,
      bad.length ? `BAD ${bad[0]}` : "",
    );
  }
}
console.log("generations:", calls, "ms:", Math.round(performance.now() - start));
