// ============================================================================
// EXPORT PDF « PLAN D'ARCHITECTE »
// ----------------------------------------------------------------------------
// Rend le plan 2D (SVG React) côté navigateur → PNG haute résolution → page PDF
// A4 avec entête (logo + variante + niveau), le plan pleine page et le tableau
// sommaire des surfaces.
// ============================================================================

import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { jsPDF } from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
import { FloorPlan2D } from "@/components/floorplan/FloorPlan2D";
import { SitePlan2D } from "@/components/floorplan/SitePlan2D";
import { summarizeSurfaces } from "@/lib/floorPlanEngine";
import type { FloorPlan, SitePlan, SurfaceBreakdown } from "@/lib/floorPlanEngine";
import { drawReportFooters, drawReportHeader } from "./pdfBranding";

applyAutotablePlugin(jsPDF);

export interface FloorPlanPdfOptions {
  plan: FloorPlan;
  projectName: string;
  variantName: string;
  floorLabel: string;
  /** Les trois catégories de surfaces de la variante (optionnel). */
  surfaces?: SurfaceBreakdown;
  /** Plan de masse de la variante (optionnel). */
  site?: SitePlan;
  filename?: string;
}

/** Rendu d'un SVG React en PNG (fond blanc). */
async function markupToPng(node: ReactElement): Promise<{ dataUrl: string; svgW: number; svgH: number }> {
  const markup = renderToStaticMarkup(node);

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

/** Rendu du plan 2D en PNG. */
async function planToPng(plan: FloorPlan) {
  return markupToPng(<FloorPlan2D plan={plan} />);
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
  surfaces,
  site,
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

  // ── En-tête commun (fond blanc pur + logo officiel) ──
  let y = drawReportHeader(doc, {
    title: "Plan d'architecte",
    subtitle: floorLabel,
    margin: ml,
    info: [
      `${stripEmojis(projectName)} · ${variantName} · ${floorLabel}`,
      "Échelle indicative — document non contractuel",
    ],
    meta: [`Généré le ${new Date().toLocaleDateString("fr-FR")}`],
  });

  // ── Les trois catégories de surfaces (jamais additionnées) ──
  if (surfaces) {
    const boxes: { label: string; value: string; note: string }[] = [
      { label: "Habitable intérieure", value: `${surfaces.interior.toFixed(1)} m²`, note: "pièces fermées, tous niveaux" },
      { label: "Bâtie complémentaire", value: `${surfaces.complementary.toFixed(1)} m²`, note: "garage, locaux couverts" },
      { label: "Extérieure aménagée", value: `${surfaces.exterior.toFixed(1)} m²`, note: `jardin ${surfaces.garden.toFixed(0)} m², non additionnée` },
    ];
    const bw = (cw - 8) / 3;
    boxes.forEach((b, i) => {
      const x = ml + i * (bw + 4);
      doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
      doc.setFillColor(250, 250, 248);
      doc.roundedRect(x, y, bw, 15, 1.5, 1.5, "FD");
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
      doc.text(b.label.toUpperCase(), x + 2.5, y + 4);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      doc.text(b.value, x + 2.5, y + 9);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
      doc.text(b.note, x + 2.5, y + 12.5);
    });
    if (site) {
      doc.setFontSize(5.5);
      doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
      doc.text(
        `Parcelle ${site.plot.area.toFixed(0)} m² (${site.plot.source === "projet" ? "projet" : "référence estimée"}) · bâti au sol ${site.building.area.toFixed(0)} m² · ${site.orientationLabel}`,
        ml,
        y + 19,
      );
      y += 6;
    }
    y += 17;
  }

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
  const roomSurfaces = summarizeSurfaces(plan);
  const body: [string, string, string][] = roomSurfaces.map((s) => [
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

  // ── Page 2 : plan de masse (extérieurs hors du bâti) ──
  if (site) {
    try {
      const sitePng = await markupToPng(<SitePlan2D site={site} />);
      doc.addPage("a4", sitePng.svgW > sitePng.svgH ? "landscape" : "portrait");
      const spw = doc.internal.pageSize.getWidth();
      const sph = doc.internal.pageSize.getHeight();
      const sy = drawReportHeader(doc, {
        title: "Plan de masse",
        subtitle: "Parcelle, bâti et aménagements extérieurs",
        margin: ml,
        info: [
          `${stripEmojis(projectName)} · ${variantName}`,
          site.plot.source === "projet" ? "Parcelle du projet" : "Parcelle de référence estimée — à confirmer",
        ],
        meta: [site.orientationLabel],
      });
      const sAvailW = spw - ml - mr;
      const sAvailH = sph - sy - 46;
      const sRatio = sitePng.svgW / sitePng.svgH;
      let sW = sAvailW;
      let sH = sAvailW / sRatio;
      if (sH > sAvailH) {
        sH = sAvailH;
        sW = sAvailH * sRatio;
      }
      doc.addImage(sitePng.dataUrl, "PNG", ml + (sAvailW - sW) / 2, sy, sW, sH, undefined, "FAST");
      let ty = sy + sH + 6;
      doc.setFontSize(7);
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      const lines = [
        `Parcelle : ${site.plot.length.toFixed(2)} × ${site.plot.width.toFixed(2)} m (${site.plot.area.toFixed(0)} m²)`,
        `Jardin : ${site.gardenArea.toFixed(0)} m² · Surface extérieure aménagée : ${site.exteriorArea.toFixed(0)} m²`,
        "La piscine, le jardin et la cuisine extérieure sont implantés exclusivement hors du bâti.",
      ];
      for (const line of lines) {
        doc.text(doc.splitTextToSize(line, sAvailW), ml, ty);
        ty += 5;
      }
      if (site.constraints.length > 0) {
        doc.setFontSize(6);
        doc.setTextColor(146, 64, 14);
        for (const c of site.constraints) {
          doc.text(doc.splitTextToSize(`Contrainte : ${c}`, sAvailW), ml, ty);
          ty += 4.5;
        }
      }
      drawReportFooters(doc, { left: "Plan de masse", right: variantName, margin: ml });
    } catch (err) {
      console.error("Plan de masse non ajouté au PDF :", err);
    }
  }

  // ── Retour à la page 1 pour son pied de page ──
  if (site) doc.setPage(1);

  // ── Pied de page ──
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.line(ml, ph - 16, pw - mr, ph - 16);
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
  const note =
    "Plan généré algorithmiquement à titre indicatif. Validation par un architecte inscrit à l'Ordre requise avant dépôt du permis de bâtir. Hauteur sous plafond de référence : 2,70 m.";
  doc.text(doc.splitTextToSize(note, cw), ml, ph - 11);
  drawReportFooters(doc, { left: "Plan d'architecte", right: floorLabel, margin: ml });

  const safeName = `${projectName.replace(/[^a-zA-Z0-9-_]/g, "_")}_${floorLabel.replace(/\s+/g, "_")}`;
  doc.save(filename || `Plan-${safeName}.pdf`);
}