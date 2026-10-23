// ============================================================================
// RAPPORT PDF — AIDE À LA DÉCISION (CAPACITÉ DE CONSTRUCTION)
// ----------------------------------------------------------------------------
// Génère le rapport de la page « Aide à la décision » à partir de l'analyse
// RÉELLE affichée (`BudgetAnalysis`) : budget disponible, coût du scénario,
// capacité de construction, répartition par catégorie, scénarios simulés,
// priorisation et recommandation. Aucun montant n'est recalculé ni inventé.
//
// Branding commun à tous les rapports (`pdfBranding` : logo officiel, en-tête
// blanc, pied de page paginé) — même présentation que le devis, les plans, les
// matériaux et le guide construction.
// ============================================================================

import jsPDF from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
import { drawReportFooters, drawReportHeader } from "./pdfBranding";
import type { BudgetAnalysis, BudgetStatus } from "./budgetEngine";

applyAutotablePlugin(jsPDF);

const stripEmojis = (text: string) =>
  text
    .replace(/[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu, "")
    .trim();

const fmtTnd = (n: number) => {
  const value = Number.isFinite(n) ? Math.round(n) : 0;
  const sign = value < 0 ? "-" : "";
  const parts = Math.abs(value).toString().split("");
  let result = "";
  for (let i = parts.length - 1, j = 1; i >= 0; i--, j++) {
    result = parts[i] + (j > 1 && (j - 1) % 3 === 0 ? "." : "") + result;
  }
  return `${sign}${result} TND`;
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const STATUS_LABEL: Record<BudgetStatus, string> = {
  realisable: "Réalisable",
  partiel: "Partiel",
  report: "À reporter",
};

export interface DecisionSupportPdfParams {
  /** Analyse réelle affichée par le module « Capacité de construction ». */
  analysis: BudgetAnalysis;
  /** Type de projet lisible (ex. « Maison ») — facultatif. */
  projectType?: string;
  /** Région du projet — facultatif. */
  region?: string;
  /** Contexte affiché par la page (« Maison · Ariana · 100 m² · Standard »). */
  projectContext?: string;
  /** Coût au m² du scénario (même valeur que la page) — facultatif. */
  costPerM2?: number;
}

/**
 * Télécharge le rapport PDF de l'aide à la décision.
 * Retourne le nom du fichier généré.
 */
export function exportDecisionSupportPdf({
  analysis,
  projectType,
  region,
  projectContext,
  costPerM2,
}: DecisionSupportPdfParams): string {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 14;
  const cw = pw - margin * 2;
  let y = margin;

  const C = {
    primary: [5, 150, 105] as [number, number, number],
    text: [31, 41, 55] as [number, number, number],
    textSecondary: [107, 114, 128] as [number, number, number],
    textLight: [156, 163, 175] as [number, number, number],
    border: [229, 231, 235] as [number, number, number],
    bgLight: [249, 250, 251] as [number, number, number],
    warn: [217, 119, 6] as [number, number, number],
  };

  const safeName = (analysis.projectName || "Projet")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 60);
  const generatedAt = analysis.generatedAt || Date.now();
  const perM2 =
    costPerM2 && costPerM2 > 0
      ? costPerM2
      : analysis.surface && analysis.surface > 0
        ? Math.round(analysis.projectTotal / analysis.surface)
        : analysis.perUnitEstimate;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > ph - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (text: string) => {
    addPageIfNeeded(16);
    y += 4;
    doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.rect(margin, y, 2.5, 5, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.text(text, margin + 5, y + 4.3);
    y += 9;
  };

  const paragraph = (text: string, options?: { bold?: boolean; color?: [number, number, number] }) => {
    if (!text) return;
    const lines = doc.splitTextToSize(stripEmojis(text), cw) as string[];
    addPageIfNeeded(lines.length * 4 + 2);
    doc.setFontSize(8);
    doc.setFont("helvetica", options?.bold ? "bold" : "normal");
    const color = options?.color ?? C.text;
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 2;
  };

  // ═══ EN-TÊTE COMMUN ═════════════════════════════════════════
  y = drawReportHeader(doc, {
    title: "Rapport Aide à la décision",
    subtitle: "Capacité de construction — Tunisie 2026",
    margin,
    info: [
      `Projet : ${stripEmojis(analysis.projectName || "Non renseigné")}${
        projectType ? ` — ${stripEmojis(projectType)}` : ""
      }`,
      projectContext
        ? stripEmojis(projectContext)
        : `Scénario : ${stripEmojis(analysis.scenarioLabel)}${
            region ? ` · Région : ${stripEmojis(region)}` : ""
          }${analysis.surface ? ` · Surface : ${analysis.surface} m²` : ""}`,
      `Budget analysé le ${fmtDate(generatedAt)} — document non contractuel`,
    ],
    meta: [
      `N° ${new Date(generatedAt).getFullYear()}-DÉC-${String(
        Math.floor(10000 + Math.random() * 90000),
      )}`,
      `Généré le ${fmtDate(Date.now())}`,
    ],
  });
  y += 2;

  // ═══ 1. SYNTHÈSE BUDGÉTAIRE ═════════════════════════════════
  sectionTitle("1. Synthèse budgétaire");
  const summaryRows: [string, string][] = [
    ["Budget disponible", fmtTnd(analysis.availableBudget)],
    ["Coût estimé du scénario", fmtTnd(analysis.projectTotal)],
    ...(perM2 && perM2 > 0 ? ([["Coût au m²", `${fmtTnd(perM2)}/m²`]] as [string, string][]) : []),
    ["Budget engagé", fmtTnd(analysis.usedBudget)],
    ["Budget restant", fmtTnd(analysis.remainingBudget)],
    [
      analysis.gapToProjectTotal > 0 ? "Reste à financer" : "Marge disponible",
      fmtTnd(Math.abs(analysis.gapToProjectTotal)),
    ],
    ["Part du coût finançable", `${analysis.projectReachablePct} %`],
    ["Budget consommé", `${analysis.budgetUsedPct} %`],
  ];
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Indicateur", "Valeur"]],
    body: summaryRows,
    theme: "grid",
    headStyles: { fillColor: C.primary, textColor: 255, fontSize: 8.5, fontStyle: "bold" },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: C.text,
      lineColor: C.border,
      lineWidth: 0.3,
    },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    alternateRowStyles: { fillColor: C.bgLight },
  });
  y = ((doc as any).lastAutoTable?.finalY || y) + 6;

  // ═══ 2. CAPACITÉ DE CONSTRUCTION ════════════════════════════
  sectionTitle("2. Capacité de construction");
  paragraph(analysis.summarySentence || analysis.recommendation, { bold: true });
  if (analysis.selectedCostSharePct !== analysis.projectReachablePct) {
    paragraph(
      `Travaux finançables avec ce budget : ${analysis.selectedCostSharePct} % du coût total du projet.`,
      { color: C.textSecondary },
    );
  }

  // ═══ 3. RÉPARTITION PAR CATÉGORIE ═══════════════════════════
  if (analysis.breakdown.length > 0) {
    sectionTitle("3. Répartition par catégorie de travaux");
    const rows = [...analysis.breakdown]
      .sort((a, b) => a.priority - b.priority)
      .map((cat) => [
        stripEmojis(cat.categoryLabel),
        fmtTnd(cat.estimatedCost),
        fmtTnd(cat.fundedAmount),
        `${cat.realizationPct} %`,
        STATUS_LABEL[cat.status] ?? cat.status,
      ]);
    (doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Catégorie", "Coût estimé", "Financé", "Réalisation", "Statut"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: C.primary, textColor: 255, fontSize: 7.5, fontStyle: "bold" },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: C.text,
        lineColor: C.border,
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: cw * 0.34 },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "center", cellWidth: 22 },
      },
      alternateRowStyles: { fillColor: C.bgLight },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 6;
  }

  // ═══ 4. SCÉNARIOS SIMULÉS ══════════════════════════════════
  if (analysis.scenarios.length > 0) {
    sectionTitle("4. Scénarios simulés");
    const rows = analysis.scenarios.map((s) => [
      stripEmojis(s.label),
      fmtTnd(s.budget),
      fmtTnd(s.fundedCost),
      `${s.progressPct} %`,
      fmtTnd(s.remainingToFund),
    ]);
    (doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Scénario", "Budget", "Coût finançable", "Avancement", "Reste à financer"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: C.primary, textColor: 255, fontSize: 7.5, fontStyle: "bold" },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: C.text,
        lineColor: C.border,
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: cw * 0.3 },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      alternateRowStyles: { fillColor: C.bgLight },
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 6;
  }

  // ═══ 5. PRIORISATION & RECOMMANDATION ══════════════════════
  sectionTitle("5. Priorisation et recommandation");
  if (analysis.nextCategoryLabel) {
    paragraph(
      `Chantier prioritaire suivant : ${analysis.nextCategoryLabel}${
        analysis.gapToNextCategory > 0
          ? ` — ${fmtTnd(analysis.gapToNextCategory)} encore nécessaires pour le terminer`
          : ""
      }.`,
      { bold: true },
    );
  }
  if (analysis.optimalCombination) {
    paragraph(`Combinaison optimale conseillée : ${analysis.optimalCombination}.`, {
      color: C.textSecondary,
    });
  }
  paragraph(analysis.recommendation, { bold: true });

  // ═══ AVERTISSEMENT ══════════════════════════════════════════
  addPageIfNeeded(34);
  y = Math.max(y + 2, ph - 34);
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.line(margin, y, margin + cw, y);
  y += 4;
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(C.textLight[0], C.textLight[1], C.textLight[2]);
  const disclaimer =
    "Avertissement : ce rapport est un document d'aide à la décision généré automatiquement à partir " +
    "du Quantitatif réel du projet et du budget saisi. Les montants sont indicatifs (marché tunisien 2026) " +
    "et ne constituent ni un devis contractuel, ni une validation d'ingénieur ou d'architecte. " +
    "Une validation professionnelle reste requise avant tout engagement de travaux.";
  const discLines = doc.splitTextToSize(disclaimer, cw) as string[];
  doc.text(discLines, margin, y);

  drawReportFooters(doc, {
    left: "Aide à la décision",
    right: "Montants indicatifs TND · Tunisie 2026",
    margin,
  });

  const filename = `Rapport-Aide-a-la-decision-${safeName}.pdf`;
  doc.save(filename);
  return filename;
}
