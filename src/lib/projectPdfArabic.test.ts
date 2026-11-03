import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateDqe } from "@/convex/dqeEngine";
import { ARABIC_PDF_FONT } from "./arabicPdf";
import { generateProjectPdf } from "./projectPdf";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const FONT = readFileSync("public/fonts/Amiri-Regular.ttf");
const PRESENTATION = /[\uFE70-\uFEFF]/;

const dqe = generateDqe({ category: "villa", surface: 120, floors: 1, totalBudget: 300_000 });

const project = {
  name: "Villa test",
  category: "villa",
  surface: 120,
  floors: 1,
  region: "tunis",
  description: "Villa RDC 120 m²",
};

const ce = {
  totalCost: 300_000,
  costPerSquareMeter: 2_500,
  breakdown: [
    {
      category: "gros_oeuvre",
      label: "Gros œuvre",
      estimatedCost: 180_000,
      percentage: 60,
      items: [{ name: "Béton armé", quantity: 100, unit: "m3", unitPrice: 1_800, totalPrice: 180_000 }],
    },
  ],
  vatRate: 19,
};

const scenarios = {
  economique: { totalCost: 270_000, costPerM2: 2_250 },
  standard: { totalCost: 300_000, costPerM2: 2_500 },
  premium: { totalCost: 360_000, costPerM2: 3_000 },
};

/** Génère le devis et renvoie le PDF produit (sans écriture disque). */
async function renderPdf(quantitatifLang: "fr" | "ar"): Promise<string> {
  const fontBytes = FONT.buffer.slice(FONT.byteOffset, FONT.byteOffset + FONT.byteLength);
  (globalThis as any).fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => fontBytes,
  }));

  // jsPDF (build Node) écrit le fichier avec `fs` : on génère dans un dossier
  // temporaire pour ne rien laisser dans le projet.
  const dir = mkdtempSync(join(tmpdir(), "batibuild-pdf-"));
  const cwd = process.cwd();
  const onSuccess = vi.fn();
  let output = "";
  try {
    process.chdir(dir);
    await generateProjectPdf({
      project,
      ce,
      ai: {},
      scenarios,
      scenario: "standard",
      dqe,
      quantitatifLang,
      onStart: () => undefined,
      onProgress: () => undefined,
      onSuccess,
      onFinish: () => undefined,
      consumeDownload: async () => undefined,
    });
    const [file] = readdirSync(dir);
    if (file) output = readFileSync(join(dir, file)).toString("latin1");
  } finally {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  }

  expect(onSuccess).toHaveBeenCalled();
  return output;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("devis PDF — quantitatif FR / AR", () => {
  it("génère le quantitatif en français par défaut (aucune police arabe)", async () => {
    const pdf = await renderPdf("fr");
    expect(pdf.startsWith("%PDF")).toBe(true);
    expect(pdf).toContain("Quantitatif détaillé");
    expect(pdf).not.toContain(ARABIC_PDF_FONT);
    expect(pdf).not.toMatch(PRESENTATION);
  }, 30_000);

  it("génère le quantitatif en arabe avec police embarquée et lettres liées", async () => {
    const pdf = await renderPdf("ar");
    expect(pdf.startsWith("%PDF")).toBe(true);
    // Police arabe réellement intégrée au document (police TrueType embarquée).
    expect(pdf).toContain(ARABIC_PDF_FONT);
    expect(pdf).toMatch(/\/FontFile2|\/CIDFontType2/);
    // Les libellés français du quantitatif ont bien été remplacés.
    expect(pdf).not.toContain("Quantitatif détaillé");
    expect(pdf).not.toContain("Désignation");
    // Le devis contient la police + le tableau : document substantiel.
    expect(pdf.length).toBeGreaterThan(150_000);
  }, 30_000);
});
