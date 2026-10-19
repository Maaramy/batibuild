// ============================================================================
// EXPORT PDF DES PLANS TECHNIQUES
// ----------------------------------------------------------------------------
// Page 1 : plan technique (superposé au plan architectural), légende complète,
//          échelle graphique + échelle numérique, date, unités.
// Page 2 : quantitatif détaillé et circuits calculés (électricité) + rappel de
//          vérification par un professionnel qualifié.
// Le logo et l'en-tête sont ceux de tous les rapports BatiBuild (pdfBranding).
// ============================================================================

import { renderToStaticMarkup } from "react-dom/server";
import { jsPDF } from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";

import { TechnicalPlan2D } from "@/components/floorplan/TechnicalPlan2D";
import type { FloorPlan } from "@/lib/floorPlanEngine";
import {
  ELECTRICAL_LEGEND,
  PLUMBING_LEGEND,
  type QuantityLine,
  type TechnicalPlan,
} from "@/lib/technicalPlanEngine";
import { priceQuantities, type DqeLotLike } from "@/lib/technicalPlanPricing";
import { drawReportFooters, drawReportHeader } from "./pdfBranding";

applyAutotablePlugin(jsPDF);

export interface TechnicalPlanPdfOptions {
  plan: FloorPlan;
  technical: TechnicalPlan;
  projectName: string;
  variantName: string;
  quantities: QuantityLine[];
  lots?: DqeLotLike[];
  filename?: string;
}

const ALL_LAYERS: Record<string, boolean> = {
  architecture: true,
  eau_froide: true,
  eau_chaude: true,
  evacuation: true,
  ventilation: true,
  appareils: true,
  accessoires: true,
  diametres: true,
  cotes: true,
  eclairage: true,
  prises: true,
  specialises: true,
  climatisation: true,
  cheminements: true,
  tableau: true,
  calibres: true,
};

const C = {
  text: [31, 41, 55] as [number, number, number],
  secondary: [107, 114, 128] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  primary: [5, 150, 105] as [number, number, number],
};

async function technicalToPng(plan: FloorPlan, technical: TechnicalPlan) {
  const markup = renderToStaticMarkup(
    <TechnicalPlan2D plan={plan} technical={technical} layers={ALL_LAYERS} zoom={1} pan={{ x: 0, y: 0 }} />,
  );
  const host = document.createElement("div");
  host.setAttribute("style", "position:absolute;left:-99999px;width:0;height:0;overflow:hidden;");
  document.body.appendChild(host);
  host.innerHTML = markup;
  try {
    const svg = host.querySelector("svg");
    if (!svg) throw new Error("SVG du plan technique introuvable");
    const vb = svg.viewBox.baseVal;
    const svgW = vb.width;
    const svgH = vb.height;
    const xml = new XMLSerializer().serializeToString(svg);
    const src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg">${xml}</svg>`);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Impossible de rasteriser le plan technique"));
      img.src = src;
    });

    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.round(svgW * scale));
    canvas.height = Math.max(2, Math.round(svgH * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/png"), svgW, svgH };
  } finally {
    document.body.removeChild(host);
  }
}

function drawLegend(
  doc: jsPDF,
  entries: { label: string; color: string; dash?: boolean; symbol?: "line" | "dot" | "square" }[],
  x: number,
  y: number,
  width: number,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(C.text[0], C.text[1], C.text[2]);
  doc.text("Légende", x, y);
  const colWidth = width / 2;
  entries.forEach((entry, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ex = x + col * colWidth;
    const ey = y + 5 + row * 4.6;
    const rgb = hexToRgb(entry.color);
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.7);
    if (entry.symbol === "square") {
      doc.rect(ex, ey - 2.4, 3.2, 3.2, "FD");
    } else if (entry.symbol === "dot") {
      doc.circle(ex + 1.6, ey - 0.8, 1.6, "FD");
    } else {
      if (entry.dash) {
        for (let s = 0; s < 4; s++) doc.line(ex + s * 1.7, ey - 0.8, ex + s * 1.7 + 0.9, ey - 0.8);
      } else {
        doc.line(ex, ey - 0.8, ex + 6, ey - 0.8);
      }
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.text(entry.label, ex + 8, ey);
  });
  return y + 5 + Math.ceil(entries.length / 2) * 4.6;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = Number.parseInt(clean, 16);
  if (Number.isNaN(n)) return [31, 41, 55];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function roundScale(denominator: number): number {
  const steps = [20, 25, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500];
  return steps.reduce((best, s) => (Math.abs(s - denominator) < Math.abs(best - denominator) ? s : best), steps[0]);
}

export async function downloadTechnicalPlanPdf({
  plan,
  technical,
  projectName,
  variantName,
  quantities,
  lots = [],
  filename,
}: TechnicalPlanPdfOptions) {
  const { dataUrl, svgW, svgH } = await technicalToPng(plan, technical);
  const isPlumbing = technical.kind === "plomberie";
  const title = isPlumbing ? "Plan de plomberie" : "Plan électrique";
  const floorLabel = technical.floorLabel;

  const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 12;
  const mr = 12;
  const cw = pw - ml - mr;

  let y = drawReportHeader(doc, {
    title,
    subtitle: floorLabel,
    margin: ml,
    info: [
      `${projectName} · ${variantName} · ${floorLabel}`,
      `Unités : mètres (m) — cotes et dimensions en m`,
    ],
    meta: [`Généré le ${new Date().toLocaleDateString("fr-FR")}`],
  });

  const availW = cw;
  const availH = ph - y - 58;
  const ratio = svgW / svgH;
  let drawW = availW;
  let drawH = availW / ratio;
  if (drawH > availH) {
    drawH = availH;
    drawW = availH * ratio;
  }
  const imgX = ml + (availW - drawW) / 2;
  doc.addImage(dataUrl, "PNG", imgX, y, drawW, drawH, undefined, "FAST");

  // Échelle numérique : mm de papier / mètre réel → dénominateur 1:N.
  const mmPerMeter = drawW / Math.max(0.01, plan.length);
  const denominator = roundScale(Math.max(1, 1000 / mmPerMeter));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(C.secondary[0], C.secondary[1], C.secondary[2]);
  doc.text(
    `Échelle approx. 1:${denominator} (A4) · emprise ${plan.length.toFixed(2)} × ${plan.width.toFixed(2)} m · ${plan.area.toFixed(1)} m²`,
    ml,
    y + drawH + 4,
  );

  y = y + drawH + 9;
  const entries = isPlumbing ? PLUMBING_LEGEND : ELECTRICAL_LEGEND;
  y = drawLegend(doc, entries, ml, y, cw);

  // Mentions de fiabilité (page 1, toujours visibles avec le plan).
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.2);
  doc.setTextColor(C.secondary[0], C.secondary[1], C.secondary[2]);
  const warning = isPlumbing
    ? "Proposition technique calculée à partir du plan architectural du projet. Diamètres, pentes et ventilation des évacuations à vérifier par un plombier qualifié avant travaux."
    : "Proposition technique calculée à partir du plan architectural du projet. Sections et calibres calculés selon la charge et la longueur ; à vérifier par un électricien qualifié selon les règles applicables en Tunisie avant travaux.";
  doc.text(doc.splitTextToSize(warning, cw), ml, Math.min(ph - 22, y + 2));

  drawReportFooters(doc, { left: title, right: `${projectName} · ${floorLabel}`, margin: ml });

  // ── Page 2 : quantitatif / circuits ──────────────────────────────────────
  doc.addPage("a4", "l");
  let y2 = drawReportHeader(doc, {
    title: isPlumbing ? "Quantitatif — plomberie" : "Quantitatif — électricité",
    subtitle: `${floorLabel} · ${projectName}`,
    margin: ml,
    info: [
      `${variantName} · quantités issues du plan technique`,
      "Prix issus du Quantitatif détaillé du projet — aucun prix inventé",
    ],
    meta: [`Généré le ${new Date().toLocaleDateString("fr-FR")}`],
  });

  if (!isPlumbing) {
    const rows = technical.circuits.map((c) => [
      c.label,
      c.computed && c.breakerA ? `${c.breakerA} A` : "Non calculé",
      c.computed && c.sectionMm2 ? `${c.sectionMm2} mm²` : "—",
      `${c.lengthM.toFixed(1)} m`,
      c.computed ? c.basis : "Calibre non affiché (calcul incomplet)",
    ]);
    (doc as any).autoTable({
      startY: y2,
      margin: { left: ml, right: mr },
      head: [["Circuit", "Protection", "Section", "Longueur", "Base de calcul"]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 6.2, cellPadding: 1.2, textColor: C.text, lineColor: C.border, lineWidth: 0.2 },
      headStyles: { fillColor: C.primary, textColor: 255, fontSize: 6.4 },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "right" } },
    });
    y2 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.text(
      `Puissance installée : ${technical.installedVA} VA · puissance foisonnée : ${technical.diversifiedVA} VA · disjoncteur de branchement calculé : ${
        technical.mainBreakerA ? `${technical.mainBreakerA} A` : "non déterminé"
      }`,
      ml,
      y2,
    );
    y2 += 6;
  }

  const priced = priceQuantities(quantities, lots);
  const body = priced.map((q) => [
    q.group,
    q.label,
    q.quantity.toLocaleString("fr-FR"),
    q.unit,
    q.unitPrice != null ? q.unitPrice.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : "—",
    q.total != null ? q.total.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : "—",
    q.priceMissing ? "Prix non configuré" : q.priceSource ?? "",
  ]);

  (doc as any).autoTable({
    startY: y2,
    margin: { left: ml, right: mr },
    head: [["Famille", "Désignation", "Qté", "Unité", "P.U. (TND)", "Montant (TND)", "Source du prix"]],
    body,
    theme: "grid",
    styles: { fontSize: 5.8, cellPadding: 1, textColor: C.text, lineColor: C.border, lineWidth: 0.2 },
    headStyles: { fillColor: C.primary, textColor: 255, fontSize: 6 },
    columnStyles: {
      2: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 6 && /non configuré/i.test(String(data.cell.raw))) {
        data.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  const total = priced.reduce((n, q) => n + (q.total ?? 0), 0);
  const missing = priced.filter((q) => q.priceMissing).length;
  let y3 = (doc as any).lastAutoTable.finalY + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`Valorisation technique : ${total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} TND`, ml, y3);
  y3 += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(C.secondary[0], C.secondary[1], C.secondary[2]);
  const notes = [
    `${missing} quantité(s) sans prix configuré : elles restent signalées, aucun prix n'a été créé.`,
    "Ce montant est une VÉRIFICATION : les lots Plomberie / Électricité sont déjà inclus dans le Coût estimatif et le total TTC — il n'est jamais ajouté une seconde fois.",
    "Plan généré par IA : proposition technique à faire vérifier par un professionnel qualifié (plombier / électricien) avant toute réalisation des travaux.",
  ];
  for (const note of notes) {
    doc.text(doc.splitTextToSize(note, cw), ml, y3);
    y3 += 4.4;
  }

  drawReportFooters(doc, { left: title, right: floorLabel, margin: ml });

  const safe = `${projectName.replace(/[^a-zA-Z0-9-_]/g, "_")}_${floorLabel.replace(/\s+/g, "_")}`;
  doc.save(filename || `${isPlumbing ? "Plomberie" : "Electricite"}-${safe}.pdf`);
}
