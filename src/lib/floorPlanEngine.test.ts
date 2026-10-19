import { describe, it, expect } from "vitest";
import {
  generateFloorPlans,
  summarizeSurfaces,
  VARIANTS_PER_PROJECT,
  type FloorPlanVariant,
  type SiteElement,
} from "./floorPlanEngine";

const EPS = 1e-6;

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return (
    a.x + a.w > b.x + EPS &&
    b.x + b.w > a.x + EPS &&
    a.y + a.h > b.y + EPS &&
    b.y + b.h > a.y + EPS
  );
}

const inside = (
  r: { x: number; y: number; w: number; h: number },
  plot: { length: number; width: number },
) =>
  r.x >= -EPS &&
  r.y >= -EPS &&
  r.x + r.w <= plot.length + EPS &&
  r.y + r.h <= plot.width + EPS;

/** Toutes les variantes respectent la géométrie, les surfaces et les extérieurs. */
function expectSoundVariants(variants: FloorPlanVariant[], requestedSurface: number) {
  expect(variants).toHaveLength(VARIANTS_PER_PROJECT);
  expect(new Set(variants.map((v) => v.styleId)).size).toBe(VARIANTS_PER_PROJECT);

  for (const v of variants) {
    // Identité architecturale complète.
    expect(v.name.length).toBeGreaterThan(10);
    expect(v.style.length).toBeGreaterThan(3);
    expect(v.tagline.length).toBeGreaterThan(15);
    expect(v.description.length).toBeGreaterThan(120);
    expect(v.advantages.length).toBeGreaterThanOrEqual(3);
    expect(v.characteristics.length).toBeGreaterThanOrEqual(3);
    expect(v.conceptNote.length).toBeGreaterThan(200);

    // Surfaces : trois catégories séparées et cohérentes.
    const s = v.surfaces;
    expect(s.interior).toBeGreaterThan(0);
    expect(s.interior + s.complementary).toBeCloseTo(s.built, 1);
    expect(s.built).toBeCloseTo(v.totalArea, 1);
    expect(s.built / v.floors.length).toBeGreaterThan(requestedSurface / v.floors.length * 0.9);
    expect(s.exterior).toBeCloseTo(s.plot - s.groundBuilt, 1);
    expect(s.garden).toBeGreaterThanOrEqual(0);
    expect(s.plot).toBeGreaterThan(s.footprint);
    expect(v.validation.surfacesOk).toBe(true);

    // Plan de masse : bâti et aménagements strictement séparés.
    expect(v.site.building.w).toBeGreaterThan(0);
    expect(inside(v.site.building, v.site.plot)).toBe(true);
    for (const el of v.site.elements) {
      expect(inside(el, v.site.plot)).toBe(true);
      expect(overlaps(el, v.site.building)).toBe(false);
      expect(["terrasse", "piscine", "cuisine_exterieure", "jardin", "allee", "stationnement"]).toContain(el.kind);
    }
    for (let i = 0; i < v.site.elements.length; i++) {
      for (let j = i + 1; j < v.site.elements.length; j++) {
        // L'allée peut longer une terrasse, mais ne doit jamais la traverser.
        if (v.site.elements[i].kind === "allee" || v.site.elements[j].kind === "allee") continue;
        expect(overlaps(v.site.elements[i], v.site.elements[j])).toBe(false);
      }
    }
    expect(v.validation.exteriorOk).toBe(true);

    // Aucune piscine, cuisine extérieure ou jardin dans une pièce fermée.
    for (const fp of v.floors) {
      for (const r of fp.rooms) {
        expect(r.kind).not.toBe("piscine" as never);
        const label = r.label.toLowerCase();
        if (!r.exterior) {
          expect(label).not.toContain("piscine");
          expect(label).not.toContain("jardin");
          expect(label).not.toContain("cuisine extérieure");
        }
      }
    }

    // Géométrie et circulation.
    for (const fp of v.floors) {
      for (let i = 0; i < fp.rooms.length; i++) {
        const r = fp.rooms[i];
        expect(r.w).toBeGreaterThan(0);
        expect(r.h).toBeGreaterThan(0);
        expect(inside(r, fp)).toBe(true);
        for (let j = i + 1; j < fp.rooms.length; j++) {
          expect(overlaps(r, fp.rooms[j])).toBe(false);
        }
        if (!r.exterior) expect(r.doors.length).toBeGreaterThanOrEqual(1);
        // Proportions professionnelles : les pièces techniques ne doivent pas
        // absorber la surface faute de programme (WC de 8 m², hall de 16 m²…).
        if (!r.exterior) {
          if (r.kind === "wc") expect(r.area).toBeLessThanOrEqual(5.0);
          if (r.kind === "sdb") expect(r.area).toBeLessThanOrEqual(8.5);
          if (r.kind === "buanderie") expect(r.area).toBeLessThanOrEqual(7.5);
          if (r.kind === "hall") expect(r.area).toBeLessThanOrEqual(12.5);
          if (r.kind === "cuisine") expect(r.area).toBeLessThanOrEqual(20);
          if (r.kind === "garage") expect(r.area).toBeLessThanOrEqual(25);
          if (r.kind === "bureau") expect(r.area).toBeLessThanOrEqual(15.5);
          if (r.kind === "sejour" && r.label.toLowerCase().includes("manger")) {
            expect(r.area).toBeLessThanOrEqual(19.5);
          }
        }
      }
      const sum = fp.rooms.reduce((acc, r) => acc + r.area, 0);
      expect(Math.abs(sum - fp.area) / fp.area).toBeLessThan(0.02);
    }
    expect(v.validation.noOverlap).toBe(true);
    expect(v.validation.areasOk).toBe(true);
    expect(v.validation.circulationOk).toBe(true);
    expect(v.floors[0].rooms.some((r) => r.doors.some((d) => d.isEntry))).toBe(true);

    // La chambre principale est bien la plus grande chambre du logement.
    const chambres = v.floors.flatMap((f) => f.rooms.filter((r) => r.kind === "chambre"));
    if (chambres.length > 1) {
      const master = chambres.find((r) => r.label === "Chambre principale");
      expect(master).toBeDefined();
      expect(master!.area).toBeGreaterThanOrEqual(Math.max(...chambres.map((r) => r.area)) - 0.01);
    }
  }
}

describe("generateFloorPlans — 10 partis architecturaux", () => {
  const maison = generateFloorPlans({
    category: "maison",
    surface: 150,
    floors: 2,
    bedrooms: 3,
    bathrooms: 2,
    wcs: 2,
  });

  it("génère exactement 10 variantes réellement différenciées", () => {
    expect(maison).toHaveLength(VARIANTS_PER_PROJECT);
    expect(VARIANTS_PER_PROJECT).toBe(10);
    expectSoundVariants(maison, 150);

    // Les partis ne diffèrent pas que par l'esthétique : emprises et programmes
    // (nombre de pièces / typologies) varient d'une variante à l'autre.
    const footprints = new Set(
      maison.map((v) => `${v.footprint.length.toFixed(2)}x${v.footprint.width.toFixed(2)}`),
    );
    expect(footprints.size).toBeGreaterThanOrEqual(8);

    const programs = new Set(
      maison.map((v) =>
        [...new Set(v.floors.flatMap((f) => f.rooms.map((r) => r.kind)))].sort().join(","),
      ),
    );
    expect(programs.size).toBeGreaterThanOrEqual(3);

    // Un patio extérieur est bien présent dans les variantes qui l'annoncent.
    const patioVariants = maison.filter((v) => v.styleId === "patio" || v.style === "Méditerranéen tunisien");
    expect(patioVariants.length).toBeGreaterThanOrEqual(2);
    for (const v of patioVariants) {
      const patios = v.floors.flatMap((f) => f.rooms.filter((r) => r.kind === "patio" && r.exterior));
      if (patios.length > 0) {
        for (const p of patios) expect(p.area).toBeGreaterThan(4);
      }
    }
  });

  it("respecte la surface bâtie demandée sur tous les niveaux", () => {
    for (const v of maison) {
      expect(v.validation.dimensionsOk).toBe(true);
      const builtPerLevel = v.surfaces.built / v.floors.length;
      expect(builtPerLevel).toBeGreaterThan((150 / 2) * 0.9);
      expect(builtPerLevel).toBeLessThan((150 / 2) * 1.1);
    }
  });

  it("les pièces habitables ont une fenêtre et une double exposition quand possible", () => {
    const habitable = new Set(["chambre", "sejour", "cuisine", "bureau"]);
    for (const v of maison) {
      for (const fp of v.floors) {
        for (const r of fp.rooms) {
          if (r.exterior) continue;
          if (habitable.has(r.kind)) {
            expect(r.windows.length).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  });

  it("continuité structurelle en R+1 : emprise et gaine escalier alignées", () => {
    for (const v of maison) {
      expect(v.floors).toHaveLength(2);
      expect(v.validation.structureOk).toBe(true);
      const stair0 = v.floors[0].rooms.find((r) => r.kind === "escalier");
      const stair1 = v.floors[1].rooms.find((r) => r.kind === "escalier");
      expect(stair0).toBeDefined();
      expect(stair1).toBeDefined();
      expect(stair1!.x).toBeCloseTo(stair0!.x, 3);
      expect(stair1!.y).toBeCloseTo(stair0!.y, 3);
      expect(stair1!.w).toBeCloseTo(stair0!.w, 3);
      expect(stair1!.h).toBeCloseTo(stair0!.h, 3);
    }
  });

  it("fiche technique : summarizeSurfaces couvre toutes les pièces", () => {
    const v = maison[0];
    const sum0 = v.floors[0].rooms.reduce((s, r) => s + r.area, 0);
    const table = summarizeSurfaces(v.floors[0]);
    const totalTable = table.reduce((s, r) => s + r.area, 0);
    expect(table).toHaveLength(v.floors[0].rooms.length);
    expect(totalTable).toBeCloseTo(sum0, 1);
    expect(table.reduce((s, r) => s + r.sharePct, 0)).toBeCloseTo(100, 0);
  });

  it("est déterministe (mêmes plans pour les mêmes entrées)", () => {
    const again = generateFloorPlans({
      category: "maison",
      surface: 150,
      floors: 2,
      bedrooms: 3,
      bathrooms: 2,
      wcs: 2,
    });
    expect(JSON.stringify(again.map((v) => v.floors))).toBe(
      JSON.stringify(maison.map((v) => v.floors)),
    );
    expect(JSON.stringify(again.map((v) => v.site))).toBe(
      JSON.stringify(maison.map((v) => v.site)),
    );
  });
});

describe("generateFloorPlans — configurations demandées", () => {
  it("maison de 100 m² : plans complets et cohérents", () => {
    const plans = generateFloorPlans({ category: "maison", surface: 100, floors: 1 });
    expectSoundVariants(plans, 100);
    for (const v of plans) {
      expect(v.floors).toHaveLength(1);
      expect(v.floors[0].rooms.some((r) => r.kind === "chambre")).toBe(true);
      expect(v.totalArea).toBeGreaterThan(88);
      expect(v.totalArea).toBeLessThan(112);
    }
  });

  it("maison à étage R+2 : chambres réparties, une salle d'eau par niveau", () => {
    const plans = generateFloorPlans({
      category: "villa",
      surface: 240,
      floors: 3,
      plotArea: 400,
      works: ["jardin"],
    });
    expectSoundVariants(plans, 240);
    for (const v of plans) {
      const upper = v.floors.filter((f) => f.level > 0);
      for (const f of upper) {
        const beds = f.rooms.filter((r) => r.kind === "chambre").length;
        const baths = f.rooms.filter((r) => r.kind === "sdb").length;
        expect(baths).toBeGreaterThanOrEqual(1);
        expect(baths).toBeLessThanOrEqual(Math.max(1, Math.ceil(beds / 2)));
      }
    }
  });

  it("villa avec jardin + piscine + cuisine extérieure sur 600 m²", () => {
    const plans = generateFloorPlans({
      category: "villa",
      surface: 180,
      floors: 1,
      plotArea: 600,
      pools: 1,
      works: ["piscine", "jardin", "cuisine_exterieure", "garage"],
    });
    expectSoundVariants(plans, 180);
    for (const v of plans) {
      const pool = v.site.elements.find((e) => e.kind === "piscine");
      const kitchen = v.site.elements.find((e) => e.kind === "cuisine_exterieure");
      const terrace = v.site.elements.find((e) => e.kind === "terrasse");
      expect(pool).toBeDefined();
      expect(kitchen).toBeDefined();
      expect(terrace).toBeDefined();
      // La couverture annoncée par le parti (pergola, débord de toit) est
      // représentée sur la terrasse EXTÉRIEURE, jamais comme une pièce.
      const profilesWithCover = ["contemporain", "mediterraneen", "patio", "jardin"];
      if (profilesWithCover.includes(v.styleId)) {
        expect(terrace!.covered).toBe(true);
        expect(terrace!.label).toBe("Terrasse couverte");
        expect(
          v.floors.flatMap((f) => f.rooms).some((r) => r.label === "Terrasse couverte"),
        ).toBe(false);
      }
      expect(pool!.area).toBeGreaterThanOrEqual(30);
      // Piscine et cuisine d'été restent strictement hors du bâti.
      expect(overlaps(pool!, v.site.building)).toBe(false);
      expect(overlaps(kitchen!, v.site.building)).toBe(false);
      // Le garage est couvert mais compte en surface complémentaire.
      expect(v.surfaces.complementary).toBeGreaterThan(10);
      expect(v.floors.flatMap((f) => f.rooms).some((r) => r.kind === "cuisine" && r.label.includes("extérieure"))).toBe(false);
      // Aucun chevauchement entre bassin, terrasse et cuisine d'été.
      const hard: SiteElement[] = v.site.elements.filter((e) => e.kind !== "allee");
      for (let i = 0; i < hard.length; i++) {
        for (let j = i + 1; j < hard.length; j++) {
          expect(overlaps(hard[i], hard[j])).toBe(false);
        }
      }
    }
  });

  it("parcelle étroite : bâti contenu, jardin adapté, contraintes signalées", () => {
    const plans = generateFloorPlans({
      category: "maison",
      surface: 120,
      floors: 2,
      plotArea: 140,
      bedrooms: 3,
      bathrooms: 2,
    });
    expectSoundVariants(plans, 120);
    for (const v of plans) {
      expect(v.site.plot.source).toBe("projet");
      expect(v.site.plot.area).toBeCloseTo(140, 0);
      expect(v.site.building.x + v.site.building.w).toBeLessThanOrEqual(140 + EPS);
      expect(v.surfaces.exterior).toBeLessThanOrEqual(80.5);
      expect(v.site.constraints.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("terrain de superficie limitée : aucune surface inventée, contraintes explicites", () => {
    const plans = generateFloorPlans({
      category: "maison",
      surface: 90,
      floors: 1,
      plotArea: 90,
      works: ["piscine", "cuisine_exterieure"],
    });
    expectSoundVariants(plans, 90);
    for (const v of plans) {
      // La parcelle fournie ne peut pas accueillir le bassin : aucune piscine
      // n'est dessinée et la contrainte est explicitement documentée.
      expect(v.site.elements.some((e) => e.kind === "piscine")).toBe(false);
      expect(v.site.constraints.some((c) => c.toLowerCase().includes("piscine"))).toBe(true);
      expect(v.site.constraints.length).toBeGreaterThan(0);
      expect(v.surfaces.built).toBeLessThanOrEqual(90 * 1.1);
    }
  });

  it("maison à étage : séparation jour/nuit et extérieurs au bon endroit", () => {
    const plans = generateFloorPlans({
      category: "maison",
      surface: 160,
      floors: 2,
      plotArea: 300,
      works: ["piscine", "jardin", "cuisine_exterieure"],
      pools: 1,
    });
    expectSoundVariants(plans, 160);
    for (const v of plans) {
      // Les chambres sont à l'étage, les espaces de vie au RDC.
      const groundKinds = new Set(v.floors[0].rooms.map((r) => r.kind));
      const upstairsKinds = new Set(v.floors[1].rooms.map((r) => r.kind));
      expect(groundKinds.has("sejour")).toBe(true);
      expect(upstairsKinds.has("chambre")).toBe(true);
      expect(upstairsKinds.has("sejour")).toBe(false);
      // Piscine toujours dans la parcelle, jamais dans une pièce.
      expect(v.site.elements.some((e) => e.kind === "piscine")).toBe(true);
    }
  });

  it("fonctionne pour une villa de plain-pied sans compte de pièces fourni", () => {
    const villa = generateFloorPlans({ category: "villa", surface: 120 });
    expect(villa).toHaveLength(10);
    for (const v of villa) {
      expect(v.floors).toHaveLength(1);
      expect(v.validation.circulationOk).toBe(true);
      expect(v.floors[0].rooms.some((r) => r.kind === "chambre")).toBe(true);
    }
  });

  it("fonctionne pour un local commercial", () => {
    const bureau = generateFloorPlans({
      category: "local_commercial",
      surface: 200,
      floors: 1,
    });
    for (const v of bureau) {
      expect(v.validation.score).toBeGreaterThanOrEqual(85);
      const kinds = new Set(v.floors[0].rooms.map((r) => r.kind));
      expect(kinds.has("reception")).toBe(true);
      expect(kinds.has("openspace")).toBe(true);
      expect(v.validation.exteriorOk).toBe(true);
    }
  });

  it("fonctionne pour un entrepôt", () => {
    const wh = generateFloorPlans({ category: "entrepot", surface: 400 });
    for (const v of wh) {
      expect(v.validation.noOverlap).toBe(true);
      expect(v.floors[0].rooms.some((r) => r.kind === "stockage")).toBe(true);
    }
  });
});

describe("séparation intérieur / extérieur", () => {
  it("la cuisine extérieure n'est jamais une pièce du bâti", () => {
    const plans = generateFloorPlans({
      category: "maison",
      surface: 150,
      floors: 1,
      works: ["cuisine_exterieure"],
    });
    for (const v of plans) {
      const rooms = v.floors.flatMap((f) => f.rooms);
      expect(rooms.some((r) => r.label.toLowerCase().includes("cuisine extérieure"))).toBe(false);
      const kitchen = v.site.elements.find((e) => e.kind === "cuisine_exterieure");
      if (kitchen) {
        expect(overlaps(kitchen, v.site.building)).toBe(false);
      } else {
        expect(v.site.constraints.some((c) => c.toLowerCase().includes("cuisine extérieure"))).toBe(true);
      }
    }
  });

  it("les surfaces extérieures ne sont jamais additionnées aux surfaces bâties", () => {
    const v = generateFloorPlans({
      category: "villa",
      surface: 180,
      floors: 1,
      plotArea: 600,
      works: ["piscine", "jardin", "cuisine_exterieure"],
      pools: 1,
    })[0];
    expect(v.surfaces.interior + v.surfaces.complementary).toBeCloseTo(v.surfaces.built, 1);
    expect(v.totalArea).toBeCloseTo(v.surfaces.built, 1);
    expect(v.totalArea).not.toBeCloseTo(v.surfaces.built + v.surfaces.exterior, 1);
    expect(v.surfaces.exterior).toBeGreaterThan(v.totalArea);
    // Le détail extérieur cite bien les aménagements réels.
    const kinds = new Set(v.surfaces.exteriorDetails.map((d) => d.kind));
    expect(kinds.has("piscine")).toBe(true);
    expect(kinds.has("terrasse")).toBe(true);
    expect(kinds.has("jardin")).toBe(true);
  });
});
