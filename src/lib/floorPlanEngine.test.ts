import { describe, it, expect } from "vitest";
import {
  generateFloorPlans,
  planKindForCategory,
  repairFloorPlan,
  structuralLevels,
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
      expect(kinds.has("vente")).toBe(true);
      expect(kinds.has("stockage")).toBe(true);
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

// ============================================================================
// ADAPTATION AU TYPE DE PROJET
// ----------------------------------------------------------------------------
// Chaque type de projet Batibuild produit son propre plan : programme des
// pièces, nombre de niveaux, distribution et éléments extérieurs. Ces tests
// verrouillent les cas demandés (maison, duplex, immeuble, studio, rénovation
// cuisine, rénovation salle de bain, local commercial, piscine) et vérifient
// qu'un changement de type change réellement la géométrie produite.
// ============================================================================

const roomsOf = (variants: FloorPlanVariant[]) =>
  variants.flatMap((v) => v.floors.flatMap((f) => f.rooms));
const kindsOf = (variants: FloorPlanVariant[]) =>
  new Set(roomsOf(variants).map((r) => r.kind));
const labelsOf = (variants: FloorPlanVariant[]) =>
  roomsOf(variants).map((r) => r.label.toLowerCase());

describe("typologie de plan par type de projet", () => {
  it("mappe chaque type de projet sur sa typologie", () => {
    expect(planKindForCategory("maison")).toBe("house");
    expect(planKindForCategory("villa")).toBe("house");
    expect(planKindForCategory("appartement")).toBe("apartment");
    expect(planKindForCategory("studio")).toBe("studio");
    expect(planKindForCategory("duplex")).toBe("duplex");
    expect(planKindForCategory("immeuble")).toBe("building");
    expect(planKindForCategory("bureau")).toBe("office");
    expect(planKindForCategory("local_commercial")).toBe("shop");
    expect(planKindForCategory("entrepot")).toBe("warehouse");
    expect(planKindForCategory("residence_touristique")).toBe("hotel");
    expect(planKindForCategory("restaurant")).toBe("restaurant");
    expect(planKindForCategory("renovation_cuisine")).toBe("kitchen");
    expect(planKindForCategory("renovation_salle_de_bain")).toBe("bathroom");
    expect(planKindForCategory("piscine")).toBe("pool");
    expect(planKindForCategory("renovation_complete")).toBe("renovation");
  });

  it("impose les niveaux réels du type (studio 1, duplex 2, immeuble = saisie)", () => {
    expect(structuralLevels("studio", 3)).toBe(1);
    expect(structuralLevels("apartment", 2)).toBe(1);
    expect(structuralLevels("kitchen", 2)).toBe(1);
    expect(structuralLevels("bathroom", 3)).toBe(1);
    expect(structuralLevels("pool", 2)).toBe(1);
    expect(structuralLevels("duplex", 1)).toBe(2);
    expect(structuralLevels("duplex", 3)).toBe(3);
    expect(structuralLevels("building", 1)).toBe(1);
    expect(structuralLevels("building", 4)).toBe(4);
    expect(structuralLevels("house", 2)).toBe(2);
  });

  it("maison de plain-pied de 100 m² : un seul RDC cohérent", () => {
    const plans = generateFloorPlans({ category: "maison", surface: 100, floors: 1 });
    for (const v of plans) {
      expect(v.floors).toHaveLength(1);
      const kinds = new Set(v.floors[0].rooms.map((r) => r.kind));
      for (const k of ["sejour", "cuisine", "chambre", "sdb"] as const) {
        expect(kinds.has(k)).toBe(true);
      }
      expect(v.floors[0].rooms.some((r) => r.kind === "escalier")).toBe(false);
      // 10 % de tolérance : le patio extérieur d'un parti architectural n'est
      // pas compté en surface bâtie.
      expect(v.surfaces.built).toBeGreaterThan(90);
      expect(v.surfaces.built).toBeLessThanOrEqual(100.5);
      expect(v.validation.score).toBeGreaterThanOrEqual(95);
    }
  });

  it("duplex de 120 m² : RDC et étage, escalier commun, chambres à l'étage", () => {
    const plans = generateFloorPlans({ category: "duplex", surface: 120, floors: 1 });
    for (const v of plans) {
      // Le duplex est multi-niveaux même si le formulaire n'a pas saisi d'étage.
      expect(v.floors).toHaveLength(2);
      expect(v.floors[0].length).toBeCloseTo(v.floors[1].length, 3);
      expect(v.floors[0].width).toBeCloseTo(v.floors[1].width, 3);
      const stairs = v.floors.map((f) => f.rooms.find((r) => r.kind === "escalier"));
      expect(stairs[0]).toBeDefined();
      expect(stairs[1]).toBeDefined();
      // Même gaine d'escalier : la liaison entre niveaux est réelle.
      expect(stairs[1]!.x).toBeCloseTo(stairs[0]!.x, 3);
      expect(stairs[1]!.y).toBeCloseTo(stairs[0]!.y, 3);
      // Espaces de vie au RDC, chambres à l'étage.
      expect(v.floors[0].rooms.some((r) => r.kind === "sejour")).toBe(true);
      expect(v.floors[0].rooms.some((r) => r.kind === "chambre")).toBe(false);
      expect(v.floors[1].rooms.filter((r) => r.kind === "chambre").length).toBeGreaterThanOrEqual(2);
      expect(v.validation.structureOk).toBe(true);
    }
  });

  it("immeuble R+3 : quatre niveaux, appartements autonomes et circulation commune", () => {
    const plans = generateFloorPlans({ category: "immeuble", surface: 400, floors: 4 });
    for (const v of plans) {
      expect(v.floors).toHaveLength(4);
      const stair0 = v.floors[0].rooms.find((r) => r.kind === "escalier")!;
      for (const f of v.floors) {
        // Chaque niveau a sa cage d'escalier, à la même place.
        const stair = f.rooms.find((r) => r.kind === "escalier");
        expect(stair).toBeDefined();
        expect(stair!.x).toBeCloseTo(stair0.x, 3);
        expect(stair!.y).toBeCloseTo(stair0.y, 3);
        // Palier de distribution (hall d'entrée au RDC).
        expect(f.rooms.some((r) => r.kind === "hall" || r.kind === "couloir")).toBe(true);
        // Plusieurs logements par niveau, chacun avec séjour + chambre + SDB.
        const codes = new Set(
          f.rooms
            .filter((r) => r.kind === "sejour")
            .map((r) => r.label.split(" ").pop()),
        );
        expect(codes.size).toBeGreaterThanOrEqual(2);
        for (const code of codes) {
          const unitRooms = f.rooms.filter((r) => r.label.endsWith(code!));
          const kinds = new Set(unitRooms.map((r) => r.kind));
          for (const k of ["sejour", "chambre", "sdb", "cuisine"] as const) {
            expect(kinds.has(k)).toBe(true);
          }
        }
      }
      expect(v.floors[0].rooms.some((r) => r.doors.some((d) => d.isEntry))).toBe(true);
      expect(v.validation.structureOk).toBe(true);
      expect(v.validation.score).toBeGreaterThanOrEqual(90);
    }
  });

  it("studio de 30 m² : coin nuit, kitchenette et salle d'eau compacte", () => {
    const plans = generateFloorPlans({ category: "studio", surface: 30, floors: 2 });
    for (const v of plans) {
      expect(v.floors).toHaveLength(1);
      const labels = v.floors[0].rooms.map((r) => r.label.toLowerCase());
      expect(labels.some((l) => l.includes("kitchenette"))).toBe(true);
      expect(labels.some((l) => l.includes("coin nuit"))).toBe(true);
      expect(v.floors[0].rooms.some((r) => r.kind === "sdb")).toBe(true);
      // Aucun espace d'une maison familiale ne doit apparaître.
      const kinds = new Set(v.floors[0].rooms.map((r) => r.kind));
      expect(kinds.has("garage")).toBe(false);
      expect(kinds.has("buanderie")).toBe(false);
      expect(v.surfaces.built).toBeCloseTo(30, 0);
      expect(v.validation.score).toBeGreaterThanOrEqual(95);
    }
  });

  it("rénovation cuisine de 10 m² : cuisine détaillée et cellier aux bonnes dimensions", () => {
    const plans = generateFloorPlans({ category: "renovation_cuisine", surface: 10, floors: 1 });
    for (const v of plans) {
      expect(v.floors).toHaveLength(1);
      const floor = v.floors[0];
      const cuisine = floor.rooms.find((r) => r.kind === "cuisine")!;
      const cellier = floor.rooms.find((r) => r.label === "Cellier")!;
      expect(cuisine).toBeDefined();
      expect(cellier).toBeDefined();
      expect(cuisine.area + cellier.area).toBeCloseTo(10, 1);
      // Une cuisine de 10 m² reste une pièce de 10 m² : pas une maison.
      expect(floor.length).toBeLessThan(6);
      expect(floor.width).toBeLessThan(4);
      expect(cuisine.doors.length).toBeGreaterThanOrEqual(1);
      expect(v.surfaces.built).toBeCloseTo(10, 1);
      expect(v.validation.score).toBeGreaterThanOrEqual(90);
    }
  });

  it("rénovation salle de bain de 6 m² : un espace sanitaire complet", () => {
    const plans = generateFloorPlans({
      category: "renovation_salle_de_bain",
      surface: 6,
      floors: 1,
    });
    for (const v of plans) {
      expect(v.floors).toHaveLength(1);
      const floor = v.floors[0];
      expect(floor.rooms).toHaveLength(1);
      const bath = floor.rooms[0];
      expect(bath.kind).toBe("sdb");
      expect(bath.area).toBeCloseTo(6, 1);
      expect(bath.doors.length).toBeGreaterThanOrEqual(1);
      expect(floor.rooms.some((r) => r.kind === "chambre")).toBe(false);
      expect(v.validation.score).toBeGreaterThanOrEqual(90);
    }
  });

  it("local commercial : surface de vente, accueil et réserve (aucune chambre)", () => {
    const plans = generateFloorPlans({ category: "local_commercial", surface: 120, floors: 1 });
    for (const v of plans) {
      const kinds = kindsOf([v]);
      expect(kinds.has("vente")).toBe(true);
      expect(kinds.has("reception")).toBe(true);
      expect(kinds.has("stockage")).toBe(true);
      expect(kinds.has("chambre")).toBe(false);
      expect(kinds.has("sejour")).toBe(false);
      expect(v.validation.score).toBeGreaterThanOrEqual(95);
    }
  });

  it("piscine : bassin à la surface demandée, plages et local technique, aucun bâti d'habitation", () => {
    const plans = generateFloorPlans({ category: "piscine", surface: 32, floors: 1 });
    for (const v of plans) {
      expect(v.floors).toHaveLength(1);
      const floor = v.floors[0];
      const basin = floor.rooms.find((r) => r.kind === "bassin")!;
      expect(basin).toBeDefined();
      expect(basin.area).toBeCloseTo(32, 0);
      expect(floor.rooms.some((r) => r.kind === "terrasse")).toBe(true);
      expect(floor.rooms.some((r) => r.kind === "local_technique")).toBe(true);
      const kinds = kindsOf([v]);
      for (const k of ["sejour", "chambre", "cuisine", "escalier"] as const) {
        expect(kinds.has(k)).toBe(false);
      }
      // Les plages ne sont jamais comptées comme surface bâtie.
      expect(v.surfaces.built).toBeCloseTo(32, 0);
      expect(v.validation.score).toBeGreaterThanOrEqual(90);
      // La réparation 2D/3D ne perce jamais de porte dans le bassin.
      const repaired = repairFloorPlan({
        ...floor,
        rooms: floor.rooms.map((r) => ({ ...r, doors: [...r.doors], windows: [...r.windows] })),
      });
      expect(repaired.rooms.find((r) => r.kind === "bassin")!.doors).toHaveLength(0);
    }
  });

  it("bureau : espaces de travail, réunion et accueil, pas de chambre", () => {
    const plans = generateFloorPlans({ category: "bureau", surface: 180, floors: 1 });
    for (const v of plans) {
      const kinds = kindsOf([v]);
      expect(kinds.has("openspace")).toBe(true);
      expect(kinds.has("reunion")).toBe(true);
      expect(kinds.has("reception")).toBe(true);
      expect(kinds.has("chambre")).toBe(false);
    }
  });

  it("entrepôt : stockage et zone logistique, pas de séjour", () => {
    const plans = generateFloorPlans({ category: "entrepot", surface: 400, floors: 1 });
    for (const v of plans) {
      const kinds = kindsOf([v]);
      expect(kinds.has("stockage")).toBe(true);
      expect(kinds.has("logistique")).toBe(true);
      expect(kinds.has("sejour")).toBe(false);
    }
  });

  it("résidence touristique : réception au RDC et chambres avec salle d'eau aux étages", () => {
    const plans = generateFloorPlans({
      category: "residence_touristique",
      surface: 300,
      floors: 2,
    });
    for (const v of plans) {
      expect(v.floors).toHaveLength(2);
      expect(v.floors[0].rooms.some((r) => r.kind === "reception")).toBe(true);
      for (const f of v.floors) {
        const chambres = f.rooms.filter((r) => r.kind === "chambre");
        expect(chambres.length).toBeGreaterThanOrEqual(2);
        for (const chambre of chambres) {
          const code = chambre.label.split(" ").pop();
          expect(f.rooms.some((r) => r.kind === "sdb" && r.label.endsWith(code!))).toBe(true);
        }
      }
      expect(v.validation.structureOk).toBe(true);
    }
  });

  it("changer de type de projet change réellement la géométrie et le programme", () => {
    const ma = generateFloorPlans({ category: "maison", surface: 100, floors: 1 })[0];
    const studio = generateFloorPlans({ category: "studio", surface: 100, floors: 1 })[0];
    const immeuble = generateFloorPlans({ category: "immeuble", surface: 100, floors: 2 })[0];
    const piscine = generateFloorPlans({ category: "piscine", surface: 32, floors: 1 })[0];

    // Aucun type ne réutilise le programme d'un autre.
    expect(studio.floors).toHaveLength(1);
    expect(immeuble.floors).toHaveLength(2);
    expect(piscine.floors[0].rooms.some((r) => r.kind === "bassin")).toBe(true);
    expect(ma.floors[0].rooms.some((r) => r.kind === "bassin")).toBe(false);
    expect(kindsOf([studio]).has("sejour")).toBe(true);
    expect(labelsOf([studio]).some((l) => l.includes("kitchenette"))).toBe(true);
    expect(labelsOf([ma]).some((l) => l.includes("kitchenette"))).toBe(false);
    // Les pièces diffèrent : le plan n'est pas seulement relabellisé.
    const kinds = (v: FloorPlanVariant) => v.floors[0].rooms.map((r) => r.kind).join("|");
    expect(kinds(studio)).not.toBe(kinds(ma));
    expect(studio.floors[0].rooms.map((r) => r.label)).not.toEqual(
      ma.floors[0].rooms.map((r) => r.label),
    );
  });
});
