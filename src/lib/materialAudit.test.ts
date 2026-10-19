import { describe, expect, it } from "vitest";
import {
  auditResidentialMaterials,
  priceHT,
  type MaterialAuditLine,
} from "@/lib/materialAudit";
import {
  PROJECT_23_INITIAL_TOTAL,
  PROJECT_23_MATERIAL_BASELINE,
} from "@/lib/project23MaterialBaseline";

const audit = auditResidentialMaterials({ surface: 100, floors: 1, builtArea: 100 });
const byArticle = (article: string): MaterialAuditLine => {
  const line = audit.lines.find((l) => l.article === article);
  if (!line) throw new Error(`Article absent de l'audit : ${article}`);
  return line;
};
const sum = (lines: readonly MaterialAuditLine[]) =>
  Math.round(lines.reduce((s, l) => s + l.totalTTC, 0) * 100) / 100;

describe("audit matériaux — projet #23 (maison 100 m², Tunis, Standard)", () => {
  it("couvre exactement les 23 articles du relevé initial", () => {
    expect(audit.lines).toHaveLength(23);
    expect(PROJECT_23_MATERIAL_BASELINE).toHaveLength(23);
    for (const baseline of PROJECT_23_MATERIAL_BASELINE) {
      expect(
        audit.lines.some((l) => l.article === baseline.article),
        `Article manquant : ${baseline.article}`,
      ).toBe(true);
    }
  });

  it("conserve le total initial de référence et calcule un total physique", () => {
    const initial = Math.round(
      PROJECT_23_MATERIAL_BASELINE.reduce((s, l) => s + l.totalTTC, 0) * 100,
    ) / 100;
    expect(initial).toBe(PROJECT_23_INITIAL_TOTAL);
    expect(audit.totals.general).toBe(49479.12);
    expect(audit.totals.grosOeuvre).toBe(33119.76);
    expect(audit.totals.secondOeuvre).toBe(16359.36);
    expect(audit.totals.general).toBe(
      Math.round((audit.totals.grosOeuvre + audit.totals.secondOeuvre) * 100) / 100,
    );
    expect(PROJECT_23_INITIAL_TOTAL - audit.totals.general).toBeCloseTo(60703.32, 2);
  });

  it("corrige les grandes quantités structurelles sans calage budgétaire", () => {
    expect(byArticle("Béton prêt à l'emploi 300 kg/m³").quantity).toBe(38.2);
    expect(byArticle("Acier à béton T12 (tonne)").quantity).toBe(3.5);
    expect(byArticle("Ciment CPJ 42.5 (sac 50 kg)").quantity).toBe(200);
    expect(byArticle("Ciment CPJ 32.5 (sac 50 kg)").quantity).toBe(110);
    expect(byArticle("Sable de construction 0/4").quantity).toBe(48);
    expect(byArticle("Gravier concassé 15/25").quantity).toBe(0);
    expect(byArticle("Hourdis 16×50").quantity).toBe(210);
    expect(byArticle("Brique creuse 10 cm").quantity).toBe(1687);
    expect(byArticle("Parpaing creux 20 cm").quantity).toBe(1148);
  });

  it("supprime le double comptage du gravier contenu dans le béton prêt", () => {
    const gravel = byArticle("Gravier concassé 15/25");
    expect(gravel.quantity).toBe(0);
    expect(gravel.totalTTC).toBe(0);
    expect(gravel.status).toBe("corrige");
    expect(gravel.justification).toContain("prêt à l'emploi");
  });

  it("corrige les unités et les surfaces de finition", () => {
    expect(byArticle("Treillis soudé ST25 (panneau)").unit).toBe("panneau");
    expect(byArticle("Treillis soudé ST25 (panneau)").quantity).toBe(8);
    expect(byArticle("Treillis soudé ST25 (panneau)").totalTTC).toBe(2000);
    expect(byArticle("Carrelage sol 40×40 (m²)").quantity).toBe(105);
    expect(byArticle("Peinture intérieure mate (L)").quantity).toBe(4);
    expect(byArticle("Peinture intérieure mate (L)").unit).toBe("seau 20 L");
    expect(byArticle("Peinture extérieure acrylique (L)").quantity).toBe(2);
    expect(byArticle("Enduit de lissage (kg)").quantity).toBe(30);
    expect(byArticle("Enduit de lissage (kg)").unit).toBe("seau 20 kg");
    expect(byArticle("Étanchéité liquide bitumeuse").quantity).toBe(100);
  });

  it("corrige les menuiseries sans doubler la porte d'entrée", () => {
    expect(byArticle("Porte intérieure bois pleine").quantity).toBe(5);
    expect(byArticle("Porte d'entrée métallique").quantity).toBe(1);
    expect(byArticle("Fenêtre aluminium 90×120").quantity).toBe(8);
    expect(byArticle("Grille de protection métallique").quantity).toBe(8);
  });

  it("maintient des unités normalisées et des montants ligne à ligne exacts", () => {
    const allowed = new Set([
      "sac",
      "m³",
      "tonne",
      "panneau",
      "pièce",
      "m²",
      "ml",
      "seau 20 L",
      "seau 20 kg",
    ]);
    for (const line of audit.lines) {
      expect(allowed.has(line.unit), `Unité inattendue : ${line.unit}`).toBe(true);
      expect(line.quantity).toBeGreaterThanOrEqual(0);
      expect(line.unitPriceTTC).toBeGreaterThan(0);
      expect(line.totalTTC).toBe(
        Math.round(line.quantity * line.unitPriceTTC * 100) / 100,
      );
      expect(line.unitPriceHT).toBe(priceHT(line.unitPriceTTC));
      expect(["corrige", "a_valider", "conserve"]).toContain(line.status);
    }
  });

  it("ventile les sous-totaux par catégorie et le total général", () => {
    const gros = audit.lines.filter((l) => l.category === "gros_oeuvre");
    const second = audit.lines.filter((l) => l.category === "second_oeuvre");
    expect(sum(gros)).toBe(audit.totals.grosOeuvre);
    expect(sum(second)).toBe(audit.totals.secondOeuvre);
    expect(sum(audit.lines)).toBe(audit.totals.general);
  });

  it("fixe le montant attendu de chacun des 23 articles", () => {
    const expected: Record<string, number> = {
      "Ciment CPJ 42.5 (sac 50 kg)": 2940,
      "Ciment CPJ 32.5 (sac 50 kg)": 1232,
      "Sable de construction 0/4": 1608,
      "Gravier concassé 15/25": 0,
      "Acier à béton T12 (tonne)": 9800,
      "Treillis soudé ST25 (panneau)": 2000,
      "Brique creuse 10 cm": 641.06,
      "Hourdis 16×50": 214.2,
      "Béton prêt à l'emploi 300 kg/m³": 9454.5,
      "Bois de coffrage (m³)": 2592,
      "Fouilles en rigole": 342,
      "Parpaing creux 20 cm": 2296,
      "Carrelage sol 40×40 (m²)": 1848,
      "Faïence 20×30 (m²)": 1567.5,
      "Peinture intérieure mate (L)": 327.12,
      "Peinture extérieure acrylique (L)": 212.94,
      "Enduit de lissage (kg)": 1816.8,
      "Plinthe céramique (ml)": 760,
      "Porte intérieure bois pleine": 3750,
      "Porte d'entrée métallique": 925,
      "Fenêtre aluminium 90×120": 1984,
      "Grille de protection métallique": 1408,
      "Étanchéité liquide bitumeuse": 1760,
    };
    expect(Object.keys(expected)).toHaveLength(23);
    for (const [article, total] of Object.entries(expected)) {
      expect(byArticle(article).totalTTC, article).toBe(total);
    }
  });

  it("signale les données manquantes au lieu d'inventer des plans", () => {
    expect(audit.missingData.length).toBeGreaterThanOrEqual(4);
    expect(audit.missingData.join(" ")).toContain("Note de calcul");
    for (const line of audit.lines.filter((l) => l.status === "a_valider")) {
      expect(line.missingData, `Donnée manquante absente : ${line.article}`).toBeTruthy();
    }
  });
});
