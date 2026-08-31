// ============================================================================
// EXPORT PDF « PLAN D'ARCHITECTE »
// ----------------------------------------------------------------------------
// Rend le plan 2D (SVG React) côté navigateur → PNG haute résolution → page PDF
// A4 avec entête (logo + variante + niveau), le plan pleine page et le tableau
// sommaire des surfaces.
// ============================================================================

import { renderToStaticMarkup } from "react-dom/server";
import { jsPDF } from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
import { FloorPlan2D } from "@/components/floorplan/FloorPlan2D";
import { summarizeSurfaces } from "@/lib/floorPlanEngine";
import type { FloorPlan } from "@/lib/floorPlanEngine";
import { drawBatiLogo } from "./pdfLogo";

applyAutotablePlugin(jsPDF);

export interface FloorPlanPdfOptions {
  plan: FloorPlan;
  projectName: string;
  variantName: string;
  floorLabel: string;
  filename?: string;
}

/** Rendu du plan 2D en PNG (fond blanc) depuis une image SVG interne. */
async function planToPng(plan: FloorPlan): Promise<{ dataUrl: string; svgW: number; svgH: number }> {
  const markup = renderToStaticMarkup(<FloorPlan2D plan={plan} />);

  const host = document.createElement("div");
  host.setAttribute("style", "position:absolute;left:-99999px;width:0;height:0;overflow:hidden;");
  document.body.appendChild(host);
  host.innerHTML = markup;
  try {
    const svg = host.querySelector("svg");
    if (!svg) throw new Error("SVG plan introuvable");
    const vb = svg.viewBox.baseVal;
    const svgW = vb.width;
    const svgH = vb.height;

    const xml = new XMLSerializer().serializeToString(svg);
    const src =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg">${xml}</svg>`,
      );

    const img = new Image();
    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Impossible de rasteriser le plan 2D"));
      img.src = src;
    });

    // Rendu haute résolution (x3) pour un PDF net.
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.round(svgW * scale));
    canvas.height = Math.max(2, Math.round(svgH * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loaded, 0, 0, canvas.width, canvas.height);

    return { dataUrl: canvas.toDataURL("image/png"), svgW, svgH };
  } finally {
    document.body.removeChild(host);
  }
}

const stripEmojis = (text: string) =>
  text
    .replace(
      /[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu,
      "",
    )
    .trim();

/**
 * Télécharge le plan d'architecte (niveau courant) en PDF.
 * Fonction pure côté navigateur : appelée depuis un gestionnaire de clic.
 */
export async function downloadFloorPlanPdf({
  plan,
  projectName,
  variantName,
  floorLabel,
  filename,
}: FloorPlanPdfOptions) {
  const { dataUrl, svgW, svgH } = await planToPng(plan);

  // Orientation selon le format du plan.
  const landscape = svgW > svgH;
  const doc = new jsPDF({
    orientation: landscape ? "l" : "p",
    unit: "mm",
    format: "a4",
  });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 12;
  const mr = 12;
  const cw = pw - ml - mr;

  const C = {
    primary: [5, 150, 105] as [number, number, number],
    text: [31, 41, 55] as [number, number, number],
    textSecondary: [107, 114, 128] as [number, number, number],
    border: [229, 231, 235] as [number, number, number],
  };

  // ── Entête ──
  doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.rect(0, 0, pw, 18, "F");
  drawBatiLogo(doc, ml, 3.5, 12);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Plan d'architecte — batibuild App", ml + 16, 9);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${stripEmojis(projectName)} · ${variantName} · ${floorLabel}`,
    ml + 16,
    15,
  );
  doc.setFontSize(6);
  doc.text(
    new Date().toLocaleDateString("fr-FR"),
    pw - mr,
    8,
    { align: "right" } as any,
  );
  doc.text("Échelle indicative — document non contractuel", pw - mr, 15, { align: "right" } as any);

  let y = 22;

  // ── Plan image (ajusté à la page) ──
  const availW = cw;
  const availH = ph - y - 40;
  const ratio = svgW / svgH;
  let drawW = availW;
  let drawH = availW / ratio;
  if (drawH > availH) {
    drawH = availH;
    drawW = availH * ratio;
  }
  const imgX = ml + (availW - drawW) / 2;
  doc.addImage(dataUrl, "PNG", imgX, y, drawW, drawH, undefined, "FAST");
  const imgBottom = y + drawH;
  y = imgBottom + 8;

  // ── Tableau sommaire des surfaces ──
  const surfaces = summarizeSurfaces(plan);
  const body: [string, string, string][] = surfaces.map((s) => [
    s.label,
    `${s.area.toFixed(1)} m²`,
    `${s.sharePct}%`,
  ]);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(C.text[0], C.text[1], C.text[2]);
  doc.text("Sommaire des surfaces", ml, y + 2);

  (doc as any).autoTable({
    startY: y + 5,
    margin: { left: ml, right: mr },
    head: [["Pièce", "Surface", "Part"]],
    body,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, textColor: C.text, lineColor: C.border, lineWidth: 0.3 },
    headStyles: { fillColor: C.primary, textColor: 255, fontStyle: "bold", fontSize: 7 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });

  // ── Pied de page ──
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.line(ml, ph - 14, pw - mr, ph - 14);
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
  const note =
    "Plan généré algorithmiquement à titre indicatif. Validation par un architecte inscrit à l'Ordre requise avant dépôt du permis de bâtir. Hauteur sous plafond de référence : 2,70 m.";
  doc.text(doc.splitTextToSize(note, cw), ml, ph - 9);

  const safeName = `${projectName.replace(/[^a-zA-Z0-9-_]/g, "_")}_${floorLabel.replace(/\s+/g, "_")}`;
  doc.save(filename || `Plan-${safeName}.pdf`);
}