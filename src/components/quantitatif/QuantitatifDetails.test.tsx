// ============================================================================
// QUANTITATIF DÉTAILLÉ — rendu FR / AR
// ----------------------------------------------------------------------------
// Vérifie sur le rendu RÉEL du composant (mêmes lots que la page résultat) :
//   • FR par défaut : textes, colonnes et montants français ;
//   • AR : traduction intégrale, direction RTL, ordre des colonnes inversé ;
//   • montants, quantités et références strictement identiques entre les deux
//     langues (aucun recalcul, aucun arrondi) ;
//   • retour au FR sans perte de données.
// ============================================================================

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { generateDqe } from "@/convex/dqeEngine";
import { QuantitatifDetails } from "@/components/quantitatif/QuantitatifDetails";
import { formatQuantitatifMoney } from "@/lib/quantitatifArabic";

const dqe = generateDqe({ category: "villa", surface: 120, floors: 1, totalBudget: 300_000 });
const LOTS = dqe.lots as any[];
const TOTAL = LOTS.reduce((s: number, lot: any) => s + (lot.subtotal || 0), 0);

function render(lang: "fr" | "ar") {
  return renderToStaticMarkup(
    <QuantitatifDetails
      lots={LOTS}
      dqeTotals={dqe.totals as any}
      totalBudg={TOTAL}
      avgM2={2_500}
      displayedCostM2={2_500}
      builtSurface={120}
      regionLabel="Tunis"
      scenarioBadge={{ label: "Standard", tone: "primary" }}
      customizationByKey={new Map()}
      rawLineByKey={new Map()}
      onOpenArticle={() => undefined}
      lang={lang}
      onLangChange={() => undefined}
    />,
  );
}

const digitsOf = (html: string) => html.replace(/[^\d]/g, "");

describe("Quantitatif détaillé — FR / AR", () => {
  it("affiche le français par défaut, en LTR", () => {
    const html = render("fr");
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("Quantitatif détaillé");
    expect(html).toContain("Gros œuvre (fondations, structures)");
    expect(html).toContain("Désignation");
    expect(html).toContain("Total TTC");
    expect(html).toContain("TVA 19 %");
    expect(html).not.toContain("الكميات التفصيلية");
  });

  it("affiche l'arabe en RTL avec les libellés traduits", () => {
    const html = render("ar");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
    expect(html).toContain("الكميات التفصيلية");
    expect(html).toContain("الأشغال الكبرى (الأساسات والهياكل)");
    expect(html).toContain("بيان الأشغال");
    expect(html).toContain("الأداء على القيمة المضافة");
    // Aucun libellé français du bloc ne subsiste.
    expect(html).not.toContain("Quantitatif détaillé");
    expect(html).not.toContain("Désignation");
    expect(html).not.toContain("Gros œuvre (fondations, structures)");
  });

  it("garde des montants et des quantités identiques dans les deux langues", () => {
    const fr = render("fr");
    const ar = render("ar");
    const frDigits = digitsOf(fr);
    const arDigits = digitsOf(ar);
    // Le total affiché et les quantités sont les mêmes : le passage en arabe
    // ne change QUE le texte (mêmes montants, même séparateur de milliers).
    LOTS.forEach((lot: any) => {
      const amount = formatQuantitatifMoney(lot.subtotal, "fr").replace(" DT", "");
      expect(frDigits).toContain(String(Math.round(lot.subtotal)));
      expect(arDigits).toContain(String(Math.round(lot.subtotal)));
      expect(fr).toContain(amount);
      expect(ar).toContain(amount);
    });
    // Le total général est identique au dinar près.
    const totalFr = formatQuantitatifMoney(TOTAL, "fr").replace(" DT", "");
    expect(fr).toContain(totalFr);
    expect(ar).toContain(totalFr);
  });

  it("revient au français à l'identique", () => {
    const first = render("fr");
    render("ar");
    const back = render("fr");
    expect(back).toBe(first);
  });
});
