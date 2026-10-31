// ============================================================================
// RAPPORTS PDF — BatiBuild AI SITE INTELLIGENCE
// ----------------------------------------------------------------------------
// Six rapports (journalier, hebdomadaire, mensuel, progression globale,
// anomalies, planning/réalisation) construits uniquement à partir des données
// réelles renvoyées par le serveur. Les projections sont marquées comme
// estimations, les photos sont optionnelles (si leur lecture échoue, le
// rapport est produit sans elles plutôt que de prétendre les inclure).
// ============================================================================

import jsPDF from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
import { drawReportFooters, drawReportHeader } from "./pdfBranding";
import { formatSiteDate, formatTND, siteTypeLabel } from "./siteTracking";
import {
  AI_ANOMALY_TYPE_LABELS,
  AI_DISCLAIMER,
  AI_REPORTS,
  AI_SEVERITY_LABELS,
  PHASE_SCHEDULE_LABELS,
  type AiReportKind,
  type AiSeverity,
  type AiAnomalyType,
} from "./siteIntelligence";

applyAutotablePlugin(jsPDF);

const EMERALD: [number, number, number] = [5, 150, 105];
const SLATE: [number, number, number] = [51, 65, 85];
const RED: [number, number, number] = [190, 40, 50];
const AMBER: [number, number, number] = [161, 98, 7];
const MARGIN = 14;

export interface AiReportPhoto {
  dataUrl: string;
  caption: string;
}

export interface AiReportPhaseRow {
  phaseKey: string;
  name: string;
  weight: number;
  planned: number;
  ai: number | null;
  declared: number | null;
  validated: number;
  remaining: number;
  status: string;
  delayDays: number;
}

export interface AiReportInput {
  site: {
    name: string;
    category: string;
    region?: string | null;
    surface?: number | null;
    startDate: number;
    expectedEndDate: number;
    status: string;
  };
  isOwner: boolean;
  summary: {
    planned: number;
    validated: number;
    declared: number;
    ai: number | null;
    gap: number;
    criticalPhases: number;
  };
  rows: AiReportPhaseRow[];
  anomalies: {
    type: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
    status: string;
    detectedAt: number;
    phaseKey?: string | null;
    requiresHumanCheck: boolean;
  }[];
  sessions: {
    title: string;
    date: number;
    phaseKey?: string | null;
    imageCount: number;
    notes?: string | null;
  }[];
  risk: {
    riskLabel: string;
    riskScore: number;
    confidence: string;
    schedule: { projectedEndDate: number | null; delayDays: number; spi: number };
    budget: {
      revised: number;
      spent: number;
      projectedFinalCost: number | null;
      projectedVariance: number | null;
    };
    causes: string[];
    recommendations: string[];
  };
  period: { start: number; end: number; label: string };
  observations?: string;
  photos?: AiReportPhoto[];
}

const stripControl = (text: string | null | undefined) =>
  (text ?? "")
    .replace(
      /[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu,
      "",
    )
    .trim();

function sectionTitle(doc: jsPDF, y: number, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...EMERALD);
  doc.text(stripControl(title), MARGIN, y);
  doc.setTextColor(...SLATE);
  return y + 2;
}

function paragraph(doc: jsPDF, y: number, text: string, width: number, size = 8.6) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(...SLATE);
  const lines = doc.splitTextToSize(stripControl(text), width);
  let cursor = y;
  for (const line of lines) {
    if (cursor > doc.internal.pageSize.getHeight() - 24) {
      doc.addPage();
      cursor = 22;
    }
    doc.text(line, MARGIN, cursor);
    cursor += size * 0.52;
  }
  return cursor + 2;
}

function table(
  doc: jsPDF,
  y: number,
  head: string[],
  body: (string | number)[][],
) {
  if (body.length === 0) return y;
  (doc as any).autoTable({
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [head.map((cell) => stripControl(cell))],
    body: body.map((row) => row.map((cell) => stripControl(String(cell)))),
    styles: { fontSize: 7.6, cellPadding: 1.8, textColor: SLATE },
    headStyles: { fillColor: EMERALD, textColor: 255, fontSize: 7.8 },
    alternateRowStyles: { fillColor: [244, 250, 247] },
    theme: "grid",
  });
  return ((doc as any).lastAutoTable?.finalY ?? y) + 7;
}

function kpiGrid(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string; tone?: "ok" | "warn" | "danger" }[],
) {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const cell = width / 4;
  const height = 15;
  items.slice(0, 8).forEach((item, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = MARGIN + col * cell;
    const top = y + row * (height + 2);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, top, cell - 2, height, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(stripControl(item.label).toUpperCase(), x + 2.5, top + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const tone =
      item.tone === "danger" ? RED : item.tone === "warn" ? AMBER : [15, 23, 42] as [number, number, number];
    doc.setTextColor(...tone);
    doc.text(stripControl(item.value), x + 2.5, top + 11.5);
  });
  return y + Math.ceil(Math.min(items.length, 8) / 4) * (height + 2) + 5;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    nouveau: "Nouveau",
    en_cours: "En cours",
    resolu: "Résolu",
    ecarte: "Écarté",
  };
  return labels[status] ?? status;
}

export function exportAiSiteReportPdf(kind: AiReportKind, input: AiReportInput) {
  const doc = new jsPDF();
  const report = AI_REPORTS.find((item) => item.kind === kind) ?? AI_REPORTS[0];
  const site = input.site;

  let y = drawReportHeader(doc, {
    title: report.label,
    subtitle: "BatiBuild AI Site Intelligence",
    margin: MARGIN,
    info: [
      `Chantier : ${site.name} · ${siteTypeLabel(site.category)}${site.surface ? ` · ${site.surface} m²` : ""}${
        site.region ? ` · ${site.region}` : ""
      }`,
      `Période : ${input.period.label}`,
      `Planning : ${formatSiteDate(site.startDate)} → ${formatSiteDate(site.expectedEndDate)}`,
    ],
    meta: [
      `Édité le ${formatSiteDate(Date.now())}`,
      input.isOwner ? "Responsable du chantier" : "Intervenant autorisé",
    ],
  });
  y += 2;

  y = kpiGrid(doc, y, [
    { label: "Avancement validé", value: `${input.summary.validated} %`, tone: "ok" },
    { label: "Avancement prévu", value: `${input.summary.planned} %` },
    {
      label: "Écart",
      value: `${input.summary.gap > 0 ? "+" : ""}${input.summary.gap} pts`,
      tone: input.summary.gap < -10 ? "danger" : input.summary.gap < 0 ? "warn" : "ok",
    },
    { label: "Anomalies ouvertes", value: `${input.anomalies.filter((a) => a.status === "nouveau" || a.status === "en_cours").length}`, tone: "warn" },
    { label: "Risque estimé", value: `${input.risk.riskScore}/100`, tone: input.risk.riskScore >= 50 ? "danger" : "warn" },
    {
      label: "Fin projetée (estimation)",
      value: input.risk.schedule.projectedEndDate
        ? formatSiteDate(input.risk.schedule.projectedEndDate)
        : "Non calculable",
    },
    { label: "Budget consommé", value: `${input.risk.budget.spent} TND` },
    {
      label: "Coût final projeté",
      value: input.risk.budget.projectedFinalCost
        ? formatTND(input.risk.budget.projectedFinalCost)
        : "Estimation indisponible",
      tone: (input.risk.budget.projectedVariance ?? 0) < 0 ? "danger" : "ok",
    },
  ]);

  // ── Avancement par phase (toujours présent) ─────────────────────────────
  y = sectionTitle(doc, y, "Avancement par phase (validé / prévu)");
  y = table(
    doc,
    y,
    ["Phase", "Poids", "Prévu", "Validé", "Déclaré", "IA (est.)", "Statut"],
    input.rows.map((row) => [
      row.name,
      `${row.weight}`,
      `${row.planned} %`,
      `${row.validated} %`,
      row.declared != null ? `${row.declared} %` : "—",
      row.ai != null ? `${row.ai} %` : "—",
      row.status ? (PHASE_SCHEDULE_LABELS as any)[row.status] ?? row.status : "—",
    ]),
  );

  // ── Sections spécifiques ────────────────────────────────────────────────
  if (kind === "planning_realisation") {
    y = sectionTitle(doc, y, "Comparaison planning / réalisation");
    y = table(
      doc,
      y,
      ["Phase", "Statut", "Retard (j)", "Écart (pts)"],
      input.rows.map((row) => [
        row.name,
        (PHASE_SCHEDULE_LABELS as any)[row.status] ?? row.status,
        row.delayDays > 0 ? `${row.delayDays}` : "0",
        `${row.validated - row.planned > 0 ? "+" : ""}${row.validated - row.planned}`,
      ]),
    );
  }

  if (kind === "anomalies") {
    y = sectionTitle(doc, y, "Anomalies détectées");
    y = table(
      doc,
      y,
      ["Gravité", "Type", "Anomalie", "Statut", "Détectée le"],
      input.anomalies.map((anomaly) => [
        AI_SEVERITY_LABELS[anomaly.severity as AiSeverity] ?? anomaly.severity,
        AI_ANOMALY_TYPE_LABELS[anomaly.type as AiAnomalyType] ?? anomaly.type,
        anomaly.title,
        statusLabel(anomaly.status),
        formatSiteDate(anomaly.detectedAt),
      ]),
    );
    for (const anomaly of input.anomalies.slice(0, 8)) {
      y = paragraph(
        doc,
        y,
        `• ${anomaly.title} — ${anomaly.description} Recommandation : ${anomaly.recommendation}`,
        doc.internal.pageSize.getWidth() - MARGIN * 2,
      );
    }
  }

  // ── Inspections & photos de la période ──────────────────────────────────
  const sessions = input.sessions.filter(
    (session) => session.date >= input.period.start && session.date <= input.period.end,
  );
  y = sectionTitle(doc, y, "Inspections photographiques de la période");
  if (sessions.length === 0) {
    y = paragraph(doc, y, "Aucune session photographique enregistrée sur cette période.", doc.internal.pageSize.getWidth() - MARGIN * 2);
  } else {
    y = table(
      doc,
      y,
      ["Date", "Session", "Phase", "Photos"],
      sessions.map((session) => [
        formatSiteDate(session.date),
        session.title,
        session.phaseKey ?? "—",
        `${session.imageCount}`,
      ]),
    );
  }

  if (input.photos && input.photos.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 70) {
      doc.addPage();
      y = 22;
    }
    y = sectionTitle(doc, y, "Photos de chantier");
    const width = (doc.internal.pageSize.getWidth() - MARGIN * 2 - 6) / 2;
    const height = width * 0.68;
    input.photos.slice(0, 4).forEach((photo, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + col * (width + 6);
      const top = y + row * (height + 9);
      try {
        doc.addImage(photo.dataUrl, "JPEG", x, top, width, height);
      } catch {
        return;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(stripControl(photo.caption).slice(0, 90), x, top + height + 3);
    });
    y += Math.ceil(Math.min(input.photos.length, 4) / 2) * (height + 9) + 3;
  }

  // ── Risques & recommandations ───────────────────────────────────────────
  if (y > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    y = 22;
  }
  y = sectionTitle(doc, y, "Risques identifiés et recommandations");
  y = paragraph(
    doc,
    y,
    `${input.risk.riskLabel} (score ${input.risk.riskScore}/100, confiance ${input.risk.confidence}). ` +
      `Retard projeté : ${input.risk.schedule.delayDays} jour(s), indice de délai ${input.risk.schedule.spi}.`,
    doc.internal.pageSize.getWidth() - MARGIN * 2,
  );
  if (input.risk.causes.length > 0) {
    y = paragraph(doc, y, `Causes observées : ${input.risk.causes.join(" · ")}`, doc.internal.pageSize.getWidth() - MARGIN * 2);
  }
  if (input.risk.recommendations.length > 0) {
    y = paragraph(
      doc,
      y,
      input.risk.recommendations.map((item, index) => `${index + 1}. ${item}`).join("\n"),
      doc.internal.pageSize.getWidth() - MARGIN * 2,
    );
  }
  if (input.observations && input.observations.trim()) {
    y = sectionTitle(doc, y, "Observations du responsable");
    y = paragraph(doc, y, input.observations, doc.internal.pageSize.getWidth() - MARGIN * 2);
  }

  y = paragraph(
    doc,
    y + 2,
    `Avertissement : ${AI_DISCLAIMER}`,
    doc.internal.pageSize.getWidth() - MARGIN * 2,
    7.4,
  );

  const fileSafe = site.name.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40) || "chantier";
  doc.save(`batibuild-ai-${kind}-${fileSafe}.pdf`);
}
