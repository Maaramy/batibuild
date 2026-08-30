import { jsPDF } from "jspdf";
import type { PlanVariant } from "@/lib/floorPlanEngine";
import { ROOM_COLORS } from "@/lib/floorPlanEngine";

/**
 * Export a plan variant to a downloadable PDF (A4 landscape).
 * Draws the 2D plan, surface table, and concept note.
 */
export async function exportPlanToPdf(variant: PlanVariant, svgElement: SVGSVGElement): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // ── Header ──
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Plan Architectural — ${variant.label}`, 15, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 113, 108);
  doc.text(
    `${variant.levelSurface} m²/niveau · ${variant.totalLevels} niveau${variant.totalLevels > 1 ? "x" : ""} · ${variant.length.toFixed(1)} × ${variant.width.toFixed(1)} m · Score ${variant.score}/100`,
    15, 22,
  );

  // ── 2D Plan from SVG ──
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
    const canvas = document.createElement("canvas");
    const maxW = 160;
    const scale = maxW / (img.naturalWidth || 480);
    canvas.width = maxW;
    canvas.height = (img.naturalHeight || 400) * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pngData = canvas.toDataURL("image/png");
    doc.addImage(pngData, "PNG", 15, 28, maxW, canvas.height * (maxW / canvas.width));
    URL.revokeObjectURL(url);
  } catch {
    doc.setFontSize(10);
    doc.setTextColor(180, 0, 0);
    doc.text("[Plan 2D non disponible dans le PDF]", 15, 60);
  }

  // ── Surface table ──
  const tableX = 190;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 37, 36);
  doc.text("Tableau des Surfaces", tableX, 30);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 113, 108);
  doc.text("Pièce", tableX, 37);
  doc.text("Surface", tableX + 60, 37);
  doc.text("%", tableX + 85, 37);

  let row = 42;
  const sorted = [...variant.rooms].sort((a, b) => b.area - a.area);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(41, 37, 36);

  sorted.forEach((r) => {
    if (row > ph - 35) return;
    doc.text(r.label, tableX, row);
    doc.text(`${r.area.toFixed(1)} m²`, tableX + 60, row);
    const pct = variant.totalArea > 0 ? ((r.area / variant.totalArea) * 100).toFixed(1) : "0";
    doc.text(`${pct}%`, tableX + 85, row);

    // Color dot
    const hex = ROOM_COLORS[r.kind] ?? "#e5e5e5";
    const rgb = hexToRgb(hex);
    if (rgb) {
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.circle(tableX - 4, row - 1.2, 1.5, "F");
    }

    row += 5;
  });

  // Total
  row += 2;
  doc.setFont("helvetica", "bold");
  doc.line(tableX, row - 2, tableX + 95, row - 2);
  doc.text("Total", tableX, row + 2);
  doc.text(`${variant.totalArea.toFixed(1)} m²`, tableX + 60, row + 2);
  doc.text("100%", tableX + 85, row + 2);

  // ── Concept note ──
  const noteY = Math.max(row + 12, 120);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("Note Conceptuelle IA", 15, noteY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 113, 108);
  const lines = doc.splitTextToSize(variant.description, pw - 30);
  doc.text(lines, 15, noteY + 6);

  // ── Footer ──
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text("Généré par Freebuff — Plateforme IA de construction", 15, ph - 8);

  doc.save(`plan-${variant.id}.pdf`);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}
