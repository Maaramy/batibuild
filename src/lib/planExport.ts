import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
import type { GeneratedPlan } from "@/convex/planEngine";
import type { PlanSheetData } from "./planSheet";
import { formatTnd } from "./planSheet";
import { FloorPlan2D } from "@/components/plans/FloorPlanView";

// ============================================================================
// Export des plans : PNG / JPG (rasterisation SVG→canvas), PDF (jsPDF),
// ZIP des 10 plans (jszip).
// ============================================================================

const SVG_NS = "http://www.w3.org/2000/svg";

export function serializeSvg(el: SVGSVGElement, widthPx: number, heightPx: number): string {
  const clone = el.cloneNode(true) as SVGSVGElement;
  // Fond blanc imposé pour les exports
  clone.setAttribute("width", String(widthPx));
  clone.setAttribute("height", String(heightPx));
  clone.setAttribute("xmlns", SVG_NS);
  const html = clone.outerHTML;
  return `<?xml version="1.0" encoding="UTF-8"?>${html}`;
}

/**
 * Rasterise un élément SVG vers un canvas. `scale` contrôle la résolution
 * finale (2 = rendu 2× pour la netteté).
 */
export async function svgToCanvas(el: SVGSVGElement, scale = 2): Promise<HTMLCanvasElement> {
  const vb = el.viewBox.baseVal;
  const wPx = Math.round(vb.width * scale);
  const hPx = Math.round(vb.height * scale);
  const svg = serializeSvg(el, wPx, hPx);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const img = new Image();
  img.decoding = "sync";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Impossible de rasteriser le plan"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponible");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, wPx, hPx);
  ctx.drawImage(img, 0, 0, wPx, hPx);
  return canvas;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "plan";
}

export interface PlanExportOptions {
  format: "png" | "jpg";
  scale?: number;
}

/** Rasterise le plan 2D et télécharge en PNG ou JPG. */
export async function exportPlanImage(
  plan: GeneratedPlan,
  opts: PlanExportOptions,
  filenameBase?: string,
): Promise<void> {
  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "-10000px";
  mount.style.top = "0";
  mount.style.pointerEvents = "none";
  document.body.appendChild(mount);

  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const root = createRoot(mount);
  const el = React.createElement(FloorPlan2D, { plan, showDimensions: true, whiteBg: true });
  root.render(el);

  // Attendre le rendu React dans le DOM hors-écran
  await new Promise((r) => setTimeout(r, 60));
  const svg = mount.querySelector("svg");
  if (!svg) {
    root.unmount();
    document.body.removeChild(mount);
    throw new Error("Rendu SVG introuvable");
  }
  const canvas = await svgToCanvas(svg, opts.scale ?? 2);
  root.unmount();
  document.body.removeChild(mount);

  const base = filenameBase ?? `plan-${String(plan.index).padStart(2, "0")}-${sanitizeFilename(plan.name)}`;
  const dataUrl = opts.format === "png"
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", 0.92);
  downloadDataUrl(dataUrl, `${base}.${opts.format}`);
}

/** Export PDF haute résolution (plan 2D pleine page). */
export async function exportPlanPdf(plan: GeneratedPlan, filenameBase?: string): Promise<void> {
  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "-10000px";
  document.body.appendChild(mount);

  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const root = createRoot(mount);
  root.render(React.createElement(FloorPlan2D, { plan, showDimensions: true, whiteBg: true }));
  await new Promise((r) => setTimeout(r, 60));
  const svg = mount.querySelector("svg");
  if (!svg) {
    root.unmount();
    document.body.removeChild(mount);
    throw new Error("Rendu SVG introuvable");
  }
  const canvas = await svgToCanvas(svg, 2.5);
  root.unmount();
  document.body.removeChild(mount);

  const img = canvas.toDataURL("image/png");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2;
  const ratio = canvas.width / canvas.height;
  let w = availW;
  let h = w / ratio;
  if (h > availH) { h = availH; w = h * ratio; }
  doc.addImage(img, "PNG", margin + (availW - w) / 2, margin + (availH - h) / 2, w, h);
  doc.setFontSize(7);
  doc.setTextColor(120);
  const base = filenameBase ?? `plan-${String(plan.index).padStart(2, "0")}-${sanitizeFilename(plan.name)}`;
  doc.save(`${base}.pdf`);
}

/** Export ZIP des 10 plans (PNG haute résolution chacun). */
export async function exportAllPlansZip(plans: GeneratedPlan[], projectName: string): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(sanitizeFilename(projectName) || "plans");
  if (!folder) throw new Error("Création du dossier ZIP impossible");

  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "-10000px";
  document.body.appendChild(mount);
  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const root = createRoot(mount);

  try {
    for (const plan of plans) {
      root.render(React.createElement(FloorPlan2D, { plan, showDimensions: true, whiteBg: true }));
      await new Promise((r) => setTimeout(r, 40));
      const svg = mount.querySelector("svg");
      if (!svg) continue;
      const canvas = await svgToCanvas(svg, 2);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) {
        folder.file(`plan-${String(plan.index).padStart(2, "0")}-${sanitizeFilename(plan.name)}.png`, blob);
      }
    }
    root.unmount();
    document.body.removeChild(mount);
  } catch (err) {
    root.unmount();
    document.body.removeChild(mount);
    throw err;
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(projectName)}-10-plans.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Rasterise le plan 2D vers un canvas PNG (helper interne pour les exports PDF).
 */
async function rasterizePlan(plan: GeneratedPlan, scale = 2.5): Promise<HTMLCanvasElement> {
  const mount = document.createElement("div");
  mount.style.position = "fixed";
  mount.style.left = "-10000px";
  mount.style.top = "0";
  document.body.appendChild(mount);

  const { createRoot } = await import("react-dom/client");
  const React = await import("react");
  const root = createRoot(mount);
  root.render(React.createElement(FloorPlan2D, { plan, showDimensions: true, whiteBg: true }));
  await new Promise((r) => setTimeout(r, 60));
  const svg = mount.querySelector("svg");
  if (!svg) {
    root.unmount();
    document.body.removeChild(mount);
    throw new Error("Rendu SVG introuvable");
  }
  const canvas = await svgToCanvas(svg, scale);
  root.unmount();
  document.body.removeChild(mount);
  return canvas;
}

/**
 * Export PDF de la fiche descriptive : cartouche, image du plan, chiffres clés,
 * tableau des pièces, scores IA, estimation de coût détaillée (6 postes),
 * points forts / faibles et avertissement légal.
 */
export async function exportPlanSheetPdf(sheet: PlanSheetData, plan: GeneratedPlan, filenameBase?: string): Promise<void> {
  const canvas = await rasterizePlan(plan, 2.5);
  const img = canvas.toDataURL("image/png");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  applyAutotablePlugin(doc as any);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  const sectionTitle = (label: string, color: [number, number, number] = [109, 40, 217]) => {
    if (y > pageH - 30) {
      doc.addPage();
      y = margin;
    }
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, 2.4, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(label, margin + 5, y + 4.6);
    y += 10;
  };

  // ── Cartouche ──────────────────────────────────────────────────────────
  doc.setFillColor(76, 29, 149);
  doc.rect(0, 0, pageW, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`FICHE DESCRIPTIVE — PLAN ${String(sheet.index).padStart(2, "0")}`, margin, 13);
  doc.setFontSize(11);
  doc.text(sheet.name, margin, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(221, 214, 254);
  const metaLine =
    `${sheet.meta.bienType}  ·  ${sheet.meta.style}  ·  Standing ${sheet.meta.standing}  ·  ` +
    `${sheet.meta.floors} niveau${sheet.meta.floors > 1 ? "x" : ""}  ·  Entrée ${sheet.meta.entree}  ·  ` +
    `Orientation ${sheet.meta.orientation}  ·  ${sheet.meta.facades} façade(s)  ·  Généré le ${sheet.meta.generatedAt}`;
  doc.text(doc.splitTextToSize(metaLine, pageW - margin * 2), margin, 27);
  y = 40;

  // ── Image du plan + description ────────────────────────────────────────
  const availW = pageW - margin * 2;
  const imgRatio = canvas.width / canvas.height;
  let imgW = Math.min(availW, 92);
  let imgH = imgW / imgRatio;
  const maxImgH = 64;
  if (imgH > maxImgH) { imgH = maxImgH; imgW = imgH * imgRatio; }
  doc.addImage(img, "PNG", margin, y, imgW, imgH);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, imgW, imgH);
  // Description à droite de l'image (ou en dessous si pas assez de place)
  const descX = margin + imgW + 6;
  const descW = pageW - margin - descX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Description de la proposition", descX, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const descLines = doc.splitTextToSize(sheet.description, descW);
  const maxLines = Math.max(1, Math.floor((imgH - 10) / 3.4));
  doc.text(descLines.slice(0, maxLines), descX, y + 9);
  y += imgH + 8;

  // ── Chiffres clés ──────────────────────────────────────────────────────
  sectionTitle("Chiffres clés");
  const figureRows: string[][] = [];
  for (let i = 0; i < sheet.keyFigures.length; i += 4) {
    const row: string[] = [];
    for (let j = 0; j < 4; j++) {
      const f = sheet.keyFigures[i + j];
      row.push(f ? `${f.label} : ${f.value}` : "");
    }
    figureRows.push(row);
  }
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 6.8, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
    head: false,
    body: figureRows.map((r) => r.map((cell) => ({ content: cell, styles: { halign: "left" } }))),
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Tableau des pièces ─────────────────────────────────────────────────
  sectionTitle(`Composition des pièces (${sheet.rooms.length})`);
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
    headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontStyle: "bold" },
    head: [["N°", "Pièce", "Niveau", "Surface"]],
    body: sheet.rooms.map((r, i) => [String(i + 1), r.name, r.levelLabel, `${r.area.toFixed(1)} m²`]),
  });
  y = (doc as any).lastAutoTable.finalY + 4;
  if (sheet.exteriorZones.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`Zones extérieures (${sheet.exteriorZones.length})`, margin, y);
    y += 3;
    (doc as any).autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 6.8, cellPadding: 1.4, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
      headStyles: { fillColor: [243, 244, 246], textColor: [51, 65, 85], fontStyle: "bold" },
      head: [["Zone", "Surface"]],
      body: sheet.exteriorZones.map((z) => [z.name, `${z.area.toFixed(1)} m²`]),
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    y += 2;
  }

  // ── Scores IA ──────────────────────────────────────────────────────────
  sectionTitle("Évaluation par l'intelligence artificielle");
  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
    headStyles: { fillColor: [243, 244, 246], textColor: [51, 65, 85], fontStyle: "bold" },
    head: [["Critère", "Score", "Appréciation"]],
    body: sheet.scores.map((s) => [
      s.label,
      `${s.value}/100`,
      s.value >= 85 ? "Excellent" : s.value >= 70 ? "Très bon" : s.value >= 55 ? "Bon" : "À améliorer",
    ]),
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Estimation de coût ─────────────────────────────────────────────────
  if (sheet.cost) {
    sectionTitle("Estimation du coût (marché tunisien)");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text(`Coût total estimé : ${formatTnd(sheet.cost.totalCost)}`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const extra: string[] = [];
    if (sheet.cost.costPerSquareMeter > 0) extra.push(`Prix moyen : ${formatTnd(sheet.cost.costPerSquareMeter)}/m²`);
    if (sheet.cost.confidence != null) extra.push(`Indice de confiance : ${sheet.cost.confidence}%`);
    if (sheet.cost.duration) extra.push(`Durée estimée : ${sheet.cost.duration}`);
    if (sheet.cost.labor) extra.push(`Main-d'œuvre : ${sheet.cost.labor.totalWorkers} ouvriers`);
    doc.text(extra.join("   ·   "), margin, y + 5);
    y += 10;
    if (sheet.cost.breakdown.length > 0) {
      (doc as any).autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.15 },
        headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: { 2: { halign: "right" }, 1: { halign: "right" } },
        head: [["Poste", "%", "Montant estimé"]],
        body: sheet.cost.breakdown.map((b) => [b.label, `${b.percentage}%`, formatTnd(b.estimatedCost)]),
        foot: [["Coût total (hors imprévus)", "", formatTnd(sheet.cost.breakdown.reduce((s, b) => s + b.estimatedCost, 0))]],
        footStyles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [30, 41, 59] },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Scénarios budgétaires :  Économique ${formatTnd(sheet.cost.scenarios.economique)}   ·   Standard ${formatTnd(sheet.cost.scenarios.standard)}   ·   Premium ${formatTnd(sheet.cost.scenarios.premium)}`,
      margin, y,
    );
    y += 8;
  }

  // ── Points forts / faibles ─────────────────────────────────────────────
  sectionTitle("Points forts & points d'attention");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text("Points forts", margin, y);
  y += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  for (const s of sheet.strengths) {
    const lines = doc.splitTextToSize(`• ${s}`, pageW - margin * 2);
    if (y + lines.length * 3.4 > pageH - 8) { doc.addPage(); y = margin; }
    doc.text(lines, margin, y);
    y += lines.length * 3.4;
  }
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text("Points d'attention", margin, y);
  y += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  for (const w of sheet.weaknesses) {
    const lines = doc.splitTextToSize(`• ${w}`, pageW - margin * 2);
    if (y + lines.length * 3.4 > pageH - 8) { doc.addPage(); y = margin; }
    doc.text(lines, margin, y);
    y += lines.length * 3.4;
  }

  // ── Avertissement ──────────────────────────────────────────────────────
  if (y > pageH - 26) { doc.addPage(); y = margin; }
  y = Math.max(y, pageH - 22);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, pageW - margin * 2, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(146, 64, 14);
  doc.text("AVERTISSEMENT", margin + 3, y + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(120, 113, 108);
  doc.text(
    doc.splitTextToSize(
      "Plan généré automatiquement par Intelligence Artificielle à titre indicatif. Ce document ne constitue pas un plan ou devis architectural, administratif ou officiel. Il doit être vérifié, adapté et validé par un architecte ou un professionnel habilité avant toute réalisation, demande de permis ou utilisation administrative.",
      pageW - margin * 2 - 6,
    ),
    margin + 3, y + 8,
  );

  const base = filenameBase ?? `fiche-plan-${String(plan.index).padStart(2, "0")}-${sanitizeFilename(plan.name)}`;
  doc.save(`${base}.pdf`);
}

/** Télécharge un JSON de description (fiche technique) d'un plan. */
export function exportPlanJson(plan: GeneratedPlan, projectName: string): void {
  const data = {
    plan: plan.index,
    nom: plan.name,
    description: plan.description,
    scores: plan.scores,
    stats: plan.stats,
    pointsFort: plan.strengths,
    pointsFaibles: plan.weaknesses,
    avertissement: "Plan généré automatiquement par Intelligence Artificielle à titre indicatif. Ce plan ne constitue pas un document architectural ou administratif officiel. Il doit être vérifié, adapté et validé par un architecte ou un professionnel habilité avant toute réalisation ou utilisation administrative.",
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(projectName)}-plan-${String(plan.index).padStart(2, "0")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
