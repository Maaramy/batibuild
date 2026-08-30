import { jsPDF } from "jspdf";
import type { PlanVariant } from "@/lib/floorPlanEngine";
import { ROOM_COLORS } from "@/lib/floorPlanEngine";

/**
 * Export a plan variant to PDF (A4 landscape):
 * rasterized 2D plan + surface table + concept note + validation summary.
 */
export async function exportPlanToPdf(variant: PlanVariant, svgElement: SVGSVGElement): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // ── Header ──
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 37, 36);
  doc.text(`Plan Architectural — ${variant.label}`, 15, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 113, 108);
  doc.text(
    `${variant.levelSurface} m²/niveau · ${variant.totalLevels} niveau${variant.totalLevels > 1 ? "x" : ""} · ${variant.length.toFixed(1)} × ${variant.width.toFixed(1)} m · Score ${variant.score}/100`,
    15, 22,
  );

  // ── 2D Plan (rasterize SVG at 3x for high resolution) ──
  try {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    const SCALE = 3; // high-res rasterization
    const canvas = document.createElement("canvas");
    const imgW = img.naturalWidth || 480;
    const imgH = img.naturalHeight || 400;
    canvas.width = imgW * SCALE;
    canvas.height = imgH * SCALE;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");

    const drawW = 160;
    const drawH = (imgH / imgW) * drawW;
    doc.addImage(png, "PNG", 15, 28, drawW, drawH);
    URL.revokeObjectURL(url);
  } catch {
    doc.setFontSize(10);
    doc.setTextColor(180, 0, 0);
    doc.text("[Plan 2D non disponible]", 15, 60);
  }

  // ── Surface table (right column) ──
  const tx = 190;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 37, 36);
  doc.text("Tableau des Surfaces", tx, 30);

  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.text("Pièce", tx, 37);
  doc.text("Surface", tx + 55, 37);
  doc.text("%", tx + 80, 37);
  doc.line(tx, 39, tx + 90, 39);

  let row = 44;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(41, 37, 36);

  [...variant.rooms].sort((a, b) => b.area - a.area).forEach((r) => {
    if (row > ph - 45) return;
    const hex = ROOM_COLORS[r.kind] ?? "#e5e5e5";
    const rgb = hexToRgb(hex);
    if (rgb) {
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.circle(tx + 1.5, row - 1.2, 1.5, "F");
    }
    doc.text(r.label, tx + 5, row);
    doc.text(`${r.area.toFixed(1)} m²`, tx + 55, row);
    const pct = variant.totalArea > 0 ? ((r.area / variant.totalArea) * 100).toFixed(1) : "0";
    doc.text(`${pct}%`, tx + 80, row);
    row += 5;
  });

  row += 1;
  doc.setFont("helvetica", "bold");
  doc.line(tx, row, tx + 90, row);
  doc.text("Total", tx, row + 4);
  doc.text(`${variant.totalArea.toFixed(1)} m²`, tx + 55, row + 4);
  doc.text("100%", tx + 80, row + 4);

  // ── Validation summary ──
  row += 12;
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text("Validation spatiale", tx, row);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(87, 83, 78);
  const checks = [
    `${variant.validation.noOverlap ? "✓" : "✗"} Absence de chevauchement`,
    `${variant.validation.areaSumOk ? "✓" : "✗"} Cohérence somme des surfaces`,
    `${variant.validation.connectivityOk ? "✓" : "✗"} Graphe de connexité (accessibilité)`,
    `${variant.validation.multiLevelAligned ? "✓" : "✗"} Alignement multi-niveaux`,
  ];
  checks.forEach((c, i) => doc.text(c, tx, row + 5 + i * 4));

  // ── Concept note (bottom left) ──
  const noteY = Math.max(28 + (variant.rooms.length > 0 ? 120 : 60), 150);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("Note Conceptuelle IA", 15, noteY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(87, 83, 78);
  const lines = doc.splitTextToSize(variant.description, pw - 220);
  doc.text(lines, 15, noteY + 6);

  // ── Footer ──
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text("Généré par Freebuff — Plateforme IA de construction & d'investissement", 15, ph - 8);

  doc.save(`plan-architectural-${variant.id}.pdf`);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}
