import { describe, expect, it } from "vitest";
import {
  computeEnduitLissageQuote,
  correctEnduitLissageBimItem,
  correctEnduitLissageDqeLine,
  enduitLissageBuckets,
  enduitLissageNeededKg,
  enduitLissageSurfaceM2,
} from "@/lib/enduitLissage";
import { generateDqe } from "@/convex/dqeEngine";
import {
  buildLivePriceMap,
  runBIMEstimation,
  withLivePrices,
} from "@/convex/bimEngine";
import { buildMaterialUsage } from "@/lib/materialUsage";

describe("enduit de lissage — quantité physique et conversion en seaux", () => {
  it("calcule 1 500 kg et 75 seaux pour 250 m² réellement construits", () => {
    expect(enduitLissageSurfaceM2(250)).toBe(625);
    expect(enduitLissageNeededKg(250)).toBe(1500);
    expect(enduitLissageBuckets(1500)).toBe(75);
    expect(enduitLissageBuckets(750)).toBe(38); // 37,5 seaux → 38
  });

  it("distingue le prix au kg du prix par seau", () => {
    const byKg = computeEnduitLissageQuote(250, "kg", 2.4);
    const byBucket = computeEnduitLissageQuote(250, "seau 20 kg", 43.74);
    expect(byKg?.pricePerBucket).toBe(48);
    expect(byKg?.total).toBe(3600);
    expect(byBucket?.pricePerBucket).toBe(43.74);
    expect(byBucket?.total).toBe(3280.5);
    expect(byBucket?.bucketKg).toBe(20);
    expect(byBucket?.buckets).toBe(75);
  });

  it("ne modifie pas un poste qui n'est pas de l'enduit de lissage", () => {
    const item = {
      name: "Ciment CPJ 42.5 (sac 50 kg)",
      unit: "sac",
      unitPrice: 12.68,
      quantity: 40,
      totalPrice: 507.2,
    };
    expect(correctEnduitLissageBimItem(item, 250)).toEqual(item);
  });
});

describe("enduit de lissage — intégration moteur BIM", () => {
  it("remplace les 535,7 seaux par 75 seaux pour une maison de 125 m² R+1", () => {
    const result = runBIMEstimation("maison", 125, 2, "tunis", "standard");
    const second = result.costEstimate.breakdown.find(
      (cat) => cat.category === "second_oeuvre",
    );
    const enduit = second?.items.find((item: any) =>
      String(item.name).includes("Enduit de lissage"),
    ) as any;

    expect(enduit).toBeTruthy();
    expect(enduit.quantity).toBe(75);
    expect(enduit.unit).toBe("seau 20 kg");
    expect(enduit.unitPrice).toBe(48);
    expect(enduit.totalPrice).toBe(3600);
    expect(enduit.totalPrice).toBe(enduit.quantity * enduit.unitPrice);
    expect(enduit.name).toBe("Enduit de lissage (kg)");
    expect(String(enduit.name)).not.toContain("535.7");
  });

  it("utilise le prix réel du seau (43,74 TND) sans multiplier des kg par un prix de seau", () => {
    const live = buildLivePriceMap([
      { name: "Enduit de lissage (kg)", unit: "seau 20 kg", unitPrice: 43.74 },
    ]);
    const result = withLivePrices(live, () =>
      runBIMEstimation("maison", 125, 2, "tunis", "standard"),
    );
    const second = result.costEstimate.breakdown.find(
      (cat) => cat.category === "second_oeuvre",
    );
    const enduit = second?.items.find((item: any) =>
      String(item.name).includes("Enduit de lissage"),
    ) as any;

    expect(enduit.quantity).toBe(75);
    expect(enduit.unit).toBe("seau 20 kg");
    expect(enduit.unitPrice).toBe(43.74);
    expect(enduit.totalPrice).toBe(3280.5);
    expect(enduit.totalPrice).toBe(enduit.quantity * enduit.unitPrice);
  });

  it("recalcule aussi une ancienne ligne BIM enregistrée (kg × prix de seau)", () => {
    const usage = buildMaterialUsage({
      builtArea: 250,
      costEstimate: {
        breakdown: [
          {
            category: "second_oeuvre",
            label: "Second œuvre et finitions",
            items: [
              {
                name: "Enduit de lissage (kg)",
                unit: "seau 20 kg",
                unitPrice: 43.74,
                quantity: 535.7,
                totalPrice: 23431.52,
              },
            ],
          },
        ],
      },
    });

    expect(usage.rows).toHaveLength(1);
    expect(usage.rows[0].quantity).toBe(75);
    expect(usage.rows[0].unit).toBe("seau 20 kg");
    expect(usage.rows[0].unitPrice).toBe(43.74);
    expect(usage.rows[0].total).toBe(3280.5);
  });
});

describe("enduit de lissage — DQE", () => {
  it("génère une ligne DQE à 75 seaux de 43,74 TND (prix avant calage du lot)", () => {
    const live = new Map([
      ["enduitdelissagekg", { unit: "seau 20 kg", unitPrice: 43.74 }],
    ]);
    const dqe = generateDqe({
      category: "peinture_interieure",
      surface: 125,
      floors: 2,
      totalBudget: 1800 * 250,
      livePrices: live,
    });
    const line = dqe.lots
      .flatMap((lot) => lot.lines)
      .find((l) => /Enduit de lissage/.test(l.designation));

    expect(line).toBeTruthy();
    expect(line?.quantity).toBe(75);
    expect(line?.unit).toBe("seau 20 kg");
    expect(line?.unitPrice).toBe(43.74);
    expect(line?.total).toBe(3280.5);
    expect(line?.total).toBe((line?.quantity ?? 0) * (line?.unitPrice ?? 0));
  });

  it("convertit une ligne DQE en kg + seaux sans modifier son prix de seau", () => {
    const line = correctEnduitLissageDqeLine(
      {
        designation: "Enduit de lissage",
        description: "Rebouchage, lissage des murs et plafonds.",
        unit: "kg",
        unitPrice: 2.4,
        quantity: 150,
        total: 360,
        nature: "materiaux",
      },
      250,
    );

    expect(line.unit).toBe("seau 20 kg");
    expect(line.quantity).toBe(75);
    expect(line.unitPrice).toBe(48);
    expect(line.total).toBe(3600);
    expect(line.total).toBe(line.quantity * line.unitPrice);
    expect(line.description).toContain("1500 kg");
  });
});
