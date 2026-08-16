// ============================================================================
// Export PDF du Guide Construction A-Z (rapport complet de la feuille de route)
// ============================================================================

import jsPDF from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
import type { Roadmap } from "@/convex/roadmapEngine";
import { drawBatiLogo } from "./pdfLogo";

applyAutotablePlugin(jsPDF);

const stripEmojis = (text: string) =>
  text
    .replace(/[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu, "")
    .trim();

const fmtTnd = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const parts = Math.floor(Math.abs(n)).toString().split("");
  let result = "";
  for (let i = parts.length - 1, j = 1; i >= 0; i--, j++) {
    result = parts[i] + (j > 1 && (j - 1) % 3 === 0 ? "." : "") + result;
  }
  return `${sign}${result} TND`;
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function exportRoadmapPdf(roadmap: Roadmap) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const emerald: [number, number, number] = [5, 150, 105];
  const slate: [number, number, number] = [51, 65, 85];

  doc.setFillColor(...emerald);
  doc.rect(0, 0, pageWidth, 6, "F");

  // Logo officiel + wordmark
  drawBatiLogo(doc, margin, 9, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...slate);
  doc.text("batibuild App", margin + 18, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 130, 140);
  doc.text("Guide construction A-Z · Tunisie 2026", margin + 18, 21);

  let y = 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...slate);
  doc.text(stripEmojis(roadmap.project.name || "Projet de construction"), margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 130, 140);
  doc.text(
    `Guide construction A-Z · ${roadmap.project.categoryLabel} · ${roadmap.project.regionLabel ?? "Tunisie"} · ${fmtDate(roadmap.generatedAt)}`,
    margin,
    y,
  );
  y += 6;
  doc.text(`Progression globale : ${roadmap.progress}% · Budget prévu : ${fmtTnd(roadmap.summary.plannedBudget)}`, margin, y);
  y += 10;

  // ── Synthèse ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...emerald);
  doc.text("1. Synthèse du projet", margin, y);
  y += 2;
  const summaryRows: [string, string][] = [
    ["Progression globale", `${roadmap.progress} %`],
    ["Budget prévu", fmtTnd(roadmap.summary.plannedBudget)],
    ["Budget consommé", fmtTnd(roadmap.summary.budgetConsumed)],
    ["Écart budgétaire", roadmap.summary.budgetGap >= 0 ? `+${fmtTnd(roadmap.summary.budgetGap)}` : fmtTnd(roadmap.summary.budgetGap)],
    ["Durée estimée des travaux", `${roadmap.summary.plannedDurationDays} jours`],
    ["Tâches", `${roadmap.summary.tasksDone} / ${roadmap.summary.tasksTotal} terminées`],
    ["Démarrage estimé", fmtDate(roadmap.summary.startDate)],
    ["Fin estimée", fmtDate(roadmap.summary.endDate)],
  ];
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Indicateur", "Valeur"]],
    body: summaryRows,
    theme: "grid",
    headStyles: { fillColor: emerald as any, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Phases ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...emerald);
  doc.text("2. Parcours par phases (A-Z)", margin, y);
  y += 2;
  const phaseRows = roadmap.phases.map((p) => [
    `Phase ${String(p.number).padStart(2, "0")}`,
    stripEmojis(p.title),
    `${p.progress} %`,
    p.status === "done" ? "Terminée" : p.status === "in_progress" ? "En cours" : "À faire",
  ]);
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Phase", "Intitulé", "Avancement", "Statut"]],
    body: phaseRows,
    theme: "grid",
    headStyles: { fillColor: emerald as any, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 1: { cellWidth: 90 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Démarches administratives ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...emerald);
  doc.text("3. Démarches administratives (Tunisie — indicatif)", margin, y);
  y += 2;
  const adminRows = roadmap.adminSteps.map((a) => [
    a.order.toString(),
    stripEmojis(a.title),
    stripEmojis(a.organisme),
    a.delai,
    fmtTnd(a.frais),
    a.status === "done" ? "Fait" : "À faire",
  ]);
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Démarche", "Organisme", "Délai", "Frais", "État"]],
    body: adminRows,
    theme: "grid",
    headStyles: { fillColor: emerald as any, fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 1: { cellWidth: 55 }, 2: { cellWidth: 55 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Budget ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...emerald);
  const activeScenario = roadmap.budget.scenarios.find((s) => s.key === roadmap.budget.selected) ?? roadmap.budget.scenarios[1];
  doc.text(`4. Budget — scénario ${activeScenario.label} (${fmtTnd(activeScenario.totalCost)})`, margin, y);
  y += 2;
  const budgetRows = activeScenario.rows.map((row) => [row.label, `${row.pct} %`, fmtTnd(row.amount)]);
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Poste", "Répartition", "Montant"]],
    body: budgetRows,
    theme: "grid",
    headStyles: { fillColor: emerald as any, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 100 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Planning ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...emerald);
  doc.text("5. Planning des travaux", margin, y);
  y += 2;
  const planRows = roadmap.planning.map((t) => [
    stripEmojis(t.title),
    `${t.durationDays} j`,
    `J+${t.startDay} → J+${t.endDay}`,
    stripEmojis(t.responsible),
    fmtTnd(t.cost),
    t.status === "done" ? "Terminé" : t.status === "in_progress" ? "En cours" : "À faire",
  ]);
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Tâche", "Durée", "Jalons", "Responsable", "Coût", "État"]],
    body: planRows,
    theme: "grid",
    headStyles: { fillColor: emerald as any, fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 55 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Vérification (omissions) ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...emerald);
  doc.text("6. Vérification du projet", margin, y);
  y += 2;
  const omRows = [
    ...roadmap.omissions.green.map((g) => ["Complet", stripEmojis(g)]),
    ...roadmap.omissions.orange.map((o) => ["À vérifier", stripEmojis(o)]),
    ...roadmap.omissions.red.map((r) => ["Manquant", stripEmojis(r)]),
  ];
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["État", "Élément"]],
    body: omRows,
    theme: "grid",
    headStyles: { fillColor: emerald as any, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 35 } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── IA prédictive ──
  if (y > 240) {
    doc.addPage();
    y = 16;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...emerald);
  doc.text("7. IA prédictive", margin, y);
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...slate);
  const predLines = doc.splitTextToSize(
    [
      `Risque de dépassement du budget : ${roadmap.predictions.budgetOverrun.value} (confiance ${roadmap.predictions.budgetOverrun.confidence} %) — ${stripEmojis(roadmap.predictions.budgetOverrun.explanation)}`,
      `Risque de retard : ${roadmap.predictions.delay.value} (confiance ${roadmap.predictions.delay.confidence} %) — ${stripEmojis(roadmap.predictions.delay.explanation)}`,
      `Coût final probable : ${fmtTnd(roadmap.predictions.finalCost.estimate)} (confiance ${roadmap.predictions.finalCost.confidence} %)`,
    ].join("\n"),
    pageWidth - margin * 2,
  );
  doc.text(predLines, margin, y);
  y += predLines.length * 4.5 + 6;

  // ── Diagnostic IA du chantier ──
  if (y > 230) {
    doc.addPage();
    y = 16;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...emerald);
  const risk = roadmap.control.risk;
  doc.text(`8. Diagnostic IA du chantier — niveau de risque : ${risk?.level ?? "—"} (${risk?.score ?? 0}/100)`, margin, y);
  y += 2;
  const riskRows = (risk?.anomalies ?? []).map((a) => [
    a.severity === "critical" ? "Critique" : a.severity === "warning" ? "Alerte" : "Info",
    stripEmojis(a.title),
    stripEmojis(a.detail),
    stripEmojis(a.recommendation),
  ]);
  if (riskRows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text("Aucune anomalie détectée — le suivi du chantier est sain.", margin, y);
    y += 6;
  } else {
    (doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Sévérité", "Anomalie", "Détail", "Recommandation"]],
      body: riskRows,
      theme: "grid",
      headStyles: { fillColor: emerald as any, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 45 }, 2: { cellWidth: 55 } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Prochaines étapes ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...emerald);
  doc.text("9. Prochaines actions", margin, y);
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...slate);
  const nextLines = doc.splitTextToSize(roadmap.nextSteps.map((s, i) => `${i + 1}. ${stripEmojis(s)}`).join("\n"), pageWidth - margin * 2);
  doc.text(nextLines, margin, y);
  y += nextLines.length * 4.5 + 8;

  doc.setFontSize(8);
  doc.setTextColor(130, 140, 150);
  const disclaimers = doc.splitTextToSize(stripEmojis(roadmap.disclaimer), pageWidth - margin * 2);
  doc.text(disclaimers, margin, Math.min(y, doc.internal.pageSize.getHeight() - 20));

  const safeName = (roadmap.project.name || "projet").replace(/[^\w\d-]+/g, "_").slice(0, 40);
  doc.save(`batibuild_guide_${safeName}.pdf`);
}
