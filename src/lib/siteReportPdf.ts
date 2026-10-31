// ============================================================================
// RAPPORTS PDF — GESTION & SUIVI DE CHANTIER
// ----------------------------------------------------------------------------
// Sept rapports, tous produits avec l'identité visuelle batibuild
// (`drawReportHeader` / `drawReportFooters`) : logo officiel, fond blanc,
// filet de marque, pagination. Aucune donnée inventée : chaque tableau est
// construit à partir de ce que le serveur a réellement renvoyé pour le
// chantier, et les prévisions sont TOUJOURS présentées comme telles.
// ============================================================================

import jsPDF from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_NATURE_LABELS,
  formatTND,
  formatSiteDate,
  materialLine,
  phaseLabelFor,
  plannedProgressAt,
  siteTypeLabel,
  taskProgress,
  type ExpenseCategory,
  type ExpenseNature,
} from "./siteTracking";
import { drawReportFooters, drawReportHeader } from "./pdfBranding";

applyAutotablePlugin(jsPDF);

type SiteData = NonNullable<FunctionReturnType<typeof api.siteTracking.getSite>>;
type Risk = SiteData["risk"];
type Budget = NonNullable<SiteData["budget"]>;

export type SiteReportKind =
  | "synthese"
  | "planning"
  | "avancement"
  | "financier"
  | "materiaux"
  | "intervenants"
  | "qualite_risques";

export const SITE_REPORTS: {
  kind: SiteReportKind;
  title: string;
  description: string;
}[] = [
  {
    kind: "synthese",
    title: "Synthèse du chantier",
    description: "Identité, avancement, budget, alertes et prochaines échéances.",
  },
  {
    kind: "planning",
    title: "Planning prévisionnel",
    description: "Phases, dates, dépendances et diagramme de Gantt.",
  },
  {
    kind: "avancement",
    title: "Avancement & suivi quotidien",
    description: "Progression par phase et journal des travaux réalisés.",
  },
  {
    kind: "financier",
    title: "Rapport financier",
    description: "Budget, dépenses, écart et répartition par catégorie.",
  },
  {
    kind: "materiaux",
    title: "Matériaux & approvisionnement",
    description: "Besoins, commandes, livraisons, stock et alertes.",
  },
  {
    kind: "intervenants",
    title: "Intervenants & permissions",
    description: "Rôles, contacts et droits accordés sur le chantier.",
  },
  {
    kind: "qualite_risques",
    title: "Qualité & prévisions de risques",
    description: "Contrôles, réserves et projection de délai / coût final.",
  },
];

const EMERALD: [number, number, number] = [5, 150, 105];
const SLATE: [number, number, number] = [51, 65, 85];
const MARGIN = 14;

const stripControl = (text: string | null | undefined) =>
  (text ?? "")
    .replace(
      /[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu,
      "",
    )
    .trim();

const statusLabel: Record<string, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminée",
  blocked: "Bloquée",
};

const siteStatusLabel: Record<string, string> = {
  active: "En cours",
  completed: "Terminé",
  archived: "Archivé",
};

const stakeholderRoleLabel: Record<string, string> = {
  architecte: "Architecte",
  ingenieur: "Ingénieur",
  entrepreneur: "Entrepreneur",
  chef_chantier: "Chef de chantier",
  artisan: "Artisan",
  electricien: "Électricien",
  plombier: "Plombier",
  fournisseur: "Fournisseur",
};

const permissionLabel: Record<string, string> = {
  progress: "Avancement",
  daily: "Suivi quotidien",
  budget: "Budget",
  materials: "Matériaux",
  quality: "Qualité",
  team: "Intervenants",
  reports: "Rapports",
};

const inspectionStatusLabel: Record<string, string> = {
  pending: "À réaliser",
  passed: "Conforme",
  failed: "Non conforme",
};


function sectionTitle(doc: jsPDF, y: number, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...EMERALD);
  doc.text(stripControl(title), MARGIN, y);
  doc.setTextColor(...SLATE);
  return y + 2;
}

function table(
  doc: jsPDF,
  y: number,
  head: string[],
  body: (string | number)[][],
  columnStyles?: Record<number, { cellWidth?: number; halign?: "left" | "right" | "center" }>,
) {
  if (body.length === 0) return y;
  (doc as any).autoTable({
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [head.map((cell) => stripControl(cell))],
    body: body.map((row) => row.map((cell) => stripControl(String(cell)))),
    theme: "grid",
    headStyles: { fillColor: EMERALD, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.2, textColor: SLATE },
    columnStyles,
  });
  return (doc as any).lastAutoTable.finalY + 6;
}

function paragraph(doc: jsPDF, y: number, text: string, italic = false) {
  doc.setFont("helvetica", italic ? "italic" : "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...SLATE);
  const lines = doc.splitTextToSize(stripControl(text), doc.internal.pageSize.getWidth() - MARGIN * 2);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 4.2 + 2;
}

function newPageIfNeeded(doc: jsPDF, y: number) {
  if (y < doc.internal.pageSize.getHeight() - 30) return y;
  doc.addPage();
  return 20;
}

// ---------------------------------------------------------------------------
// Données budgétaires : le backend ne renvoie le bloc budget qu'avec la
// permission « budget ». Le rapport financier est alors explicitement partiel
// plutôt que complété par des montants inventés.
// ---------------------------------------------------------------------------
function borderBudget(budget: Budget | null): Budget | null {
  return budget;
}

function riskSummaryRows(risk: Risk): (string | number)[][] {
  return [
    ["Score de risque (prévision)", `${risk.riskScore}/100 — ${risk.riskLabel}`],
    ["Fiabilité de la prévision", risk.confidence],
    ["Avancement constaté", `${risk.schedule.actualProgressPct} %`],
    ["Avancement théorique à ce jour", `${risk.schedule.plannedProgressPct} %`],
    ["Indice de délai (SPI)", risk.schedule.spi ? risk.schedule.spi.toFixed(2) : "non calculable"],
    [
      "Date de fin projetée (prévision)",
      risk.schedule.projectedEndDate ? formatSiteDate(risk.schedule.projectedEndDate) : "non calculable",
    ],
    ["Retard projeté", risk.schedule.delayDays > 0 ? `+${risk.schedule.delayDays} jour(s)` : "aucun"],
    [
      "Coût final projeté (prévision)",
      risk.budget.projectedFinalCost != null ? formatTND(risk.budget.projectedFinalCost) : "non calculable",
    ],
    [
      "Écart projeté",
      risk.budget.projectedVariance != null
        ? `${risk.budget.projectedVariance >= 0 ? "+" : ""}${formatTND(risk.budget.projectedVariance)}`
        : "non calculable",
    ],
  ];
}

export function exportSiteReportPdf(kind: SiteReportKind, data: SiteData) {
  const doc = new jsPDF();
  const report = SITE_REPORTS.find((item) => item.kind === kind)!;
  const site = data.site;
  const budget = borderBudget(data.budget);
  const addressLine = [site.address, site.region ? site.region : null].filter(Boolean).join(" · ");

  let y = drawReportHeader(doc, {
    title: report.title,
    subtitle: "Gestion & suivi de chantier",
    margin: MARGIN,
    info: [
      `Chantier : ${site.name} · ${siteStatusLabel[site.status] ?? site.status}`,
      `Type : ${siteTypeLabel(site.category)}${site.surface ? ` · ${site.surface} m²` : ""}${
        addressLine ? ` · ${addressLine}` : ""
      }`,
      `Période : ${formatSiteDate(site.startDate)} → ${formatSiteDate(site.expectedEndDate)} · Avancement ${data.progress} %`,
      [
        site.clientName ? `Maître d'ouvrage : ${site.clientName}` : null,
        site.managerName ? `Suivi : ${site.managerName}` : null,
        site.projectId ? "Chantier issu d'une estimation" : "Chantier autonome",
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    meta: [
      `Édité le ${formatSiteDate(Date.now())}`,
      data.isOwner ? "Responsable du chantier" : "Intervenant autorisé",
    ],
  });
  y += 2;

  if (kind === "synthese") {
    y = sectionTitle(doc, y, "1. Indicateurs clés");
    y = table(
      doc,
      y,
      ["Indicateur", "Valeur"],
      [
        ["Avancement physique", `${data.progress} %`],
        ["Tâches", `${data.tasks.filter((task) => taskProgress(task) >= 100).length} / ${data.tasks.length} terminées`],
        ["Tâches en retard", String(data.lateCount)],
        ["Budget initial", formatTND(site.budgetInitial)],
        ["Budget révisé", formatTND(budget?.revised ?? site.budgetRevised ?? site.budgetInitial)],
        ["Dépenses engagées", budget ? formatTND(budget.spent) : "accès budget non accordé"],
        ["Écart budgétaire", budget ? formatTND(budget.variance) : "—"],
        ["Matériaux suivis", String(data.materials.length)],
        ["Intervenants", String(data.stakeholders.length)],
        ["Contrôles qualité", String(data.inspections.length)],
        ["Score de risque (prévision)", `${data.risk.riskScore}/100 — ${data.risk.riskLabel}`],
      ],
      { 0: { cellWidth: 62 } },
    );

    y = newPageIfNeeded(doc, y);
    y = sectionTitle(doc, y, "2. Alertes du chantier");
    y = table(
      doc,
      y,
      ["Niveau", "Alerte"],
      data.alerts.length
        ? data.alerts.map((alert) => [
            alert.level === "danger" ? "Critique" : alert.level === "warning" ? "Vigilance" : "Information",
            alert.label,
          ])
        : [["—", "Aucune alerte : aucun signal de retard, de dépassement ou de rupture n'est enregistré."]],
    );

    y = newPageIfNeeded(doc, y);
    y = sectionTitle(doc, y, "3. Prochaines échéances");
    const upcoming = data.tasks
      .filter((task) => taskProgress(task) < 100)
      .sort((a, b) => a.endDate - b.endDate)
      .slice(0, 8);
    y = table(
      doc,
      y,
      ["Phase", "Échéance", "Avancement"],
      upcoming.length
        ? upcoming.map((task) => [task.name, formatSiteDate(task.endDate), `${taskProgress(task)} %`])
        : [["—", "Toutes les phases sont terminées.", "100 %"]],
    );
  }

  if (kind === "planning") {
    y = sectionTitle(doc, y, "1. Phases planifiées");
    y = table(
      doc,
      y,
      ["Phase", "Début", "Fin", "Poids", "Dépend de", "Avancement", "Statut"],
      data.tasks.map((task) => [
        task.name,
        formatSiteDate(task.startDate),
        formatSiteDate(task.endDate),
        `${Math.round(task.weight * 10) / 10}`,
        task.dependsOn ? phaseLabelFor(task.dependsOn) : "—",
        `${taskProgress(task)} %`,
        statusLabel[task.status] ?? task.status,
      ]),
      { 0: { cellWidth: 42 }, 1: { cellWidth: 22 }, 2: { cellWidth: 22 } },
    );

    y = newPageIfNeeded(doc, y);
    y = sectionTitle(doc, y, "2. Diagramme de Gantt");
    const pageWidth = doc.internal.pageSize.getWidth();
    const chartWidth = pageWidth - MARGIN * 2 - 60;
    const firstStart = Math.min(...data.tasks.map((task) => task.startDate), site.startDate);
    const lastEnd = Math.max(...data.tasks.map((task) => task.endDate), site.expectedEndDate);
    const span = Math.max(1, lastEnd - firstStart);
    let cursor = y + 3;
    for (const task of data.tasks.slice(0, 16)) {
      if (cursor > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        cursor = 20;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.4);
      doc.setTextColor(...SLATE);
      doc.text(stripControl(task.name).slice(0, 34), MARGIN, cursor + 3);
      const barX = MARGIN + 60 + ((task.startDate - firstStart) / span) * chartWidth;
      const barW = Math.max(1.2, ((task.endDate - task.startDate) / span) * chartWidth);
      doc.setFillColor(226, 232, 240);
      doc.rect(MARGIN + 60, cursor, chartWidth, 4.4, "F");
      doc.setFillColor(
        taskProgress(task) >= 100 ? 5 : taskProgress(task) > 0 ? 16 : 148,
        taskProgress(task) >= 100 ? 150 : taskProgress(task) > 0 ? 185 : 163,
        taskProgress(task) >= 100 ? 105 : taskProgress(task) > 0 ? 129 : 184,
      );
      doc.rect(barX, cursor, barW, 4.4, "F");
      cursor += 6.4;
    }
    y = cursor + 4;
    y = paragraph(
      doc,
      y,
      "Les barres représentent les dates planifiées. Un décalage entre la barre grise (planning) et l'avancement réel figure dans le rapport « Avancement & suivi quotidien ».",
      true,
    );
  }

  if (kind === "avancement") {
    y = sectionTitle(doc, y, "1. Avancement par phase");
    const expected = plannedProgressAt(data.tasks, Date.now());
    y = paragraph(
      doc,
      y,
      `Avancement physique constaté : ${data.progress} % · avancement théorique attendu à ce jour : ${expected} %.`,
    );
    y = table(
      doc,
      y,
      ["Phase", "Avancement", "Statut", "Responsable", "Échéance"],
      data.tasks.map((task) => [
        task.name,
        `${taskProgress(task)} %`,
        statusLabel[task.status] ?? task.status,
        task.responsible ?? "—",
        formatSiteDate(task.endDate),
      ]),
      { 0: { cellWidth: 55 } },
    );

    y = newPageIfNeeded(doc, y);
    y = sectionTitle(doc, y, "2. Journal quotidien");
    y = table(
      doc,
      y,
      ["Date", "Travaux réalisés", "Effectif", "Heures", "Points bloquants"],
      data.dailyLogs.map((log) => [
        formatSiteDate(log.date),
        log.activities,
        log.workers.map((worker) => `${worker.count} ${worker.role}`).join(", ") || "—",
        `${log.hoursWorked} h`,
        log.issues ?? "—",
      ]),
      { 0: { cellWidth: 24 }, 1: { cellWidth: 62 } },
    );
    if (data.dailyLogs.length === 0) {
      y = paragraph(doc, y, "Aucun suivi quotidien n'a encore été enregistré sur ce chantier.", true);
    }
  }

  if (kind === "financier") {
    if (!budget) {
      y = paragraph(
        doc,
        y,
        "Vos permissions sur ce chantier ne donnent pas accès aux montants budgétaires : ce rapport est volontairement vide plutôt que complété par des chiffres non autorisés.",
      );
    } else {
      y = sectionTitle(doc, y, "1. Synthèse budgétaire");
      y = table(
        doc,
        y,
        ["Poste", "Montant"],
        [
          ["Budget initial", formatTND(budget.initial)],
          ["Budget révisé", formatTND(budget.revised)],
          ["Dépenses engagées", formatTND(budget.spent)],
          ["Écart", formatTND(budget.variance)],
          ["Part consommée", `${budget.consumedPct} %`],
          ["Valeur des matériaux livrés", formatTND(budget.materialsDeliveredValue)],
        ],
        { 0: { cellWidth: 80 } },
      );

      y = newPageIfNeeded(doc, y);
      y = sectionTitle(doc, y, "2. Répartition par catégorie");
      y = table(
        doc,
        y,
        ["Catégorie", "Montant", "Part"],
        budget.byCategory.map((row) => [row.label, formatTND(row.amount), `${row.sharePct} %`]),
        { 0: { cellWidth: 80 } },
      );

      y = newPageIfNeeded(doc, y);
      y = sectionTitle(doc, y, "3. Détail des dépenses");
      y = table(
        doc,
        y,
        ["Date", "Libellé", "Catégorie", "Nature", "Montant"],
        data.expenses.map((expense) => [
          formatSiteDate(expense.date),
          expense.label,
          EXPENSE_CATEGORY_LABELS[expense.category as ExpenseCategory] ?? expense.category,
          EXPENSE_NATURE_LABELS[expense.nature as ExpenseNature] ?? expense.nature,
          formatTND(expense.amount),
        ]),
        { 0: { cellWidth: 24 }, 1: { cellWidth: 60 } },
      );
    }
  }

  if (kind === "materiaux") {
    y = sectionTitle(doc, y, "1. Suivi des approvisionnements");
    y = table(
      doc,
      y,
      ["Matériau", "Unité", "Prévu", "Commandé", "Livré", "Consommé", "Stock", "Alerte"],
      data.materials.map((material) => {
        const line = materialLine(material);
        return [
          material.name,
          material.unit,
          material.plannedQty,
          material.orderedQty,
          material.deliveredQty,
          material.consumedQty,
          line.remainingQty,
          line.alertLabel,
        ];
      }),
      { 0: { cellWidth: 45 } },
    );
    if (data.materials.length === 0) {
      y = paragraph(
        doc,
        y,
        "Aucun matériau n'est suivi sur ce chantier. Les matériaux d'un chantier issu d'une estimation peuvent être importés depuis le DQE du projet.",
        true,
      );
    }

    y = newPageIfNeeded(doc, y);
    y = sectionTitle(doc, y, "2. Valorisation (permission budget requise)");
    y = table(
      doc,
      y,
      ["Matériau", "Prix unitaire", "Valeur commandée"],
      data.materials
        .filter((material) => material.unitPrice > 0)
        .map((material) => {
          const line = materialLine(material);
          return [material.name, formatTND(material.unitPrice), formatTND(line.valueOrdered)];
        }),
      { 0: { cellWidth: 65 } },
    );
  }

  if (kind === "intervenants") {
    y = sectionTitle(doc, y, "1. Intervenants du chantier");
    y = table(
      doc,
      y,
      ["Nom", "Rôle", "Société", "Contact", "Permissions"],
      data.stakeholders.map((stakeholder) => [
        stakeholder.name,
        stakeholderRoleLabel[stakeholder.role] ?? stakeholder.role,
        stakeholder.company ?? "—",
        [stakeholder.phone, stakeholder.email].filter(Boolean).join(" · ") || "—",
        stakeholder.permissions.length
          ? stakeholder.permissions.map((permission) => permissionLabel[permission] ?? permission).join(", ")
          : "lecture seule",
      ]),
      { 0: { cellWidth: 40 }, 4: { cellWidth: 55 } },
    );
    if (data.stakeholders.length === 0) {
      y = paragraph(doc, y, "Aucun intervenant n'a encore été ajouté à ce chantier.", true);
    }

    y = newPageIfNeeded(doc, y);
    y = sectionTitle(doc, y, "2. Journal des modifications");
    y = table(
      doc,
      y,
      ["Date", "Action"],
      data.auditLogs.slice(0, 40).map((log) => [formatSiteDate(log.createdAt), log.details ?? log.action]),
      { 0: { cellWidth: 26 } },
    );
  }

  if (kind === "qualite_risques") {
    y = sectionTitle(doc, y, "1. Contrôles qualité");
    y = table(
      doc,
      y,
      ["Date", "Contrôle", "Phase", "Inspecteur", "Statut", "Réserves ouvertes"],
      data.inspections.map((inspection) => [
        formatSiteDate(inspection.date),
        inspection.title,
        phaseLabelFor(inspection.phaseKey) || inspection.phaseKey,
        inspection.inspector,
        inspectionStatusLabel[inspection.status] ?? inspection.status,
        String(inspection.reservations.filter((reservation) => !reservation.resolved).length),
      ]),
      { 1: { cellWidth: 45 } },
    );
    if (data.inspections.length === 0) {
      y = paragraph(doc, y, "Aucun contrôle qualité n'a encore été enregistré.", true);
    }

    const openReservations = data.inspections.flatMap((inspection) =>
      inspection.reservations
        .filter((reservation) => !reservation.resolved)
        .map((reservation) => [inspection.title, reservation.label, reservation.severity, reservation.action ?? "—"]),
    );
    if (openReservations.length) {
      y = newPageIfNeeded(doc, y);
      y = sectionTitle(doc, y, "2. Réserves non levées");
      y = table(doc, y, ["Contrôle", "Réserve", "Gravité", "Action attendue"], openReservations, {
        0: { cellWidth: 42 },
      });
    }

    y = newPageIfNeeded(doc, y);
    y = sectionTitle(doc, y, "3. Prévisions de risques (estimation)");
    y = paragraph(
      doc,
      y,
      "Les valeurs ci-dessous sont des PRÉVISIONS calculées à partir des données saisies. Elles ne constituent pas une certitude et évoluent à chaque mise à jour du chantier.",
      true,
    );
    y = table(doc, y, ["Prévision", "Valeur"], riskSummaryRows(data.risk), { 0: { cellWidth: 70 } });

    if (data.risk.causes.length) {
      y = newPageIfNeeded(doc, y);
      y = sectionTitle(doc, y, "4. Causes identifiées (données réelles)");
      y = table(doc, y, ["Constat"], data.risk.causes.map((cause) => [cause]), {
        0: { cellWidth: 165 },
      });
    }
    if (data.risk.recommendations.length) {
      y = newPageIfNeeded(doc, y);
      y = sectionTitle(doc, y, "5. Recommandations");
      y = table(doc, y, ["Action suggérée"], data.risk.recommendations.map((row) => [row]), {
        0: { cellWidth: 165 },
      });
    }
  }

  drawReportFooters(doc, {
    left: `Suivi de chantier — ${site.name}`,
    right: `Document généré le ${formatSiteDate(Date.now())}`,
    margin: MARGIN,
  });

  const fileName = `batibuild-chantier-${kind}-${site.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}.pdf`;
  doc.save(fileName);
}
