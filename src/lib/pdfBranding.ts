// ============================================================================
// IDENTITÉ PDF — EN-TÊTE / PIED DE PAGE COMMUNS
// ----------------------------------------------------------------------------
// Tous les générateurs de rapports PDF (devis, quantitatif, matériaux IA,
// plans, guide construction, rapports administratifs)
// utilisent cet en-tête unique :
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │  [logo officiel]  batibuild            N° … · date · auteur   │
//   │  Titre du rapport                                             │
//   │  Informations du projet / du document                         │
//   └──────────────────────────────────────────────────────────────┘
//
// Contraintes respectées :
//   • fond de l'en-tête BLANC PUR (#FFFFFF) — aucun aplat coloré, aucun dégradé ;
//   • logo officiel réel (asset de la plateforme), ratio conservé, non déformé ;
//   • marges et alignements professionnels, contraste suffisant ;
//   • même rendu sur toutes les pages et tous les types de rapports ;
//   • aucun doublon de logo (le logo n'apparaît qu'en tête de la page 1).
// ============================================================================

import type jsPDF from "jspdf";

// `brandCore` (et non `branding`) : ce module est aussi compilé dans le bundle
// Convex pour la facture PDF jointe aux e-mails, où les imports d'assets Vite
// de `./branding` ne sont pas résolubles.
import {
  BRAND_LOGO_DATA_URL,
  BRAND_NAME,
  BRAND_RGB,
  BRAND_TAGLINE,
} from "./brandCore";

/** Couleurs neutres partagées par tous les rapports PDF. */
export const PDF_COLORS = {
  text: [31, 41, 55] as [number, number, number],
  textSecondary: [107, 114, 128] as [number, number, number],
  textLight: [156, 163, 175] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  bgLight: [249, 250, 251] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
} as const;

export interface ReportHeaderOptions {
  /** Titre fonctionnel du rapport (ex. « Devis estimatif », « Quantitatif détaillé »). */
  title: string;
  /** Sous-titre optionnel affiché à droite du titre. */
  subtitle?: string;
  /**
   * Informations projet / document, une ligne par entrée, affichées sous le
   * titre. Les lignes trop longues sont tronquées proprement.
   */
  info?: string[];
  /** Métadonnées alignées à droite dans la bande du logo (n° doc., date, auteur). */
  meta?: string[];
  /** Marge gauche / droite en mm (défaut : 15). */
  margin?: number;
  /** Taille du logo en mm (défaut : 16). */
  logoSize?: number;
}

/**
 * Dessine le logo officiel de la plateforme. Le ratio est conservé : la tuile
 * du logo est carrée, `size` est donc à la fois la largeur et la hauteur.
 */
export function drawBrandLogo(doc: jsPDF, x: number, y: number, size = 16) {
  // Filet de sécurité : le logo officiel est une tuile carrée.
  doc.addImage(BRAND_LOGO_DATA_URL, "PNG", x, y, size, size, undefined, "FAST");
}

/**
 * Dessine l'en-tête standard (fond blanc pur + logo officiel + titre +
 * informations) et renvoie l'ordonnée `y` à laquelle le contenu peut démarrer.
 */
export function drawReportHeader(doc: jsPDF, options: ReportHeaderOptions): number {
  const {
    title,
    subtitle,
    info = [],
    meta = [],
    margin = 15,
    logoSize = 16,
  } = options;

  const pw = doc.internal.pageSize.getWidth();
  const cw = pw - margin * 2;

  // ── Géométrie verticale ────────────────────────────────────────────────
  const logoY = 9;
  const logoBottom = logoY + logoSize; // 25 mm par défaut
  const titleY = logoBottom + 6; // titre
  const firstInfoY = titleY + 5.4; // première ligne d'informations
  const infoStep = 4.4;
  const lastInfoY = info.length > 0 ? firstInfoY + (info.length - 1) * infoStep : titleY;
  const headerBottom = lastInfoY + 4;
  const accentTop = headerBottom;

  // ── Fond BLANC PUR (#FFFFFF) ───────────────────────────────────────────
  const white = PDF_COLORS.white;
  doc.setFillColor(white[0], white[1], white[2]);
  doc.rect(0, 0, pw, headerBottom, "F");

  // ── Logo officiel ──────────────────────────────────────────────────────
  drawBrandLogo(doc, margin, logoY, logoSize);

  // ── Nom officiel de la plateforme ──────────────────────────────────────
  const textX = margin + logoSize + 4;
  const text = PDF_COLORS.text;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(text[0], text[1], text[2]);
  doc.text(BRAND_NAME, textX, logoY + 7);

  const light = PDF_COLORS.textSecondary;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(light[0], light[1], light[2]);
  doc.text(BRAND_TAGLINE, textX, logoY + 12.2);

  // ── Métadonnées alignées à droite dans la bande du logo ────────────────
  if (meta.length > 0) {
    doc.setFontSize(6.8);
    meta.forEach((line, index) => {
      doc.setFont("helvetica", index === 0 ? "bold" : "normal");
      doc.setTextColor(
        index === 0 ? text[0] : light[0],
        index === 0 ? text[1] : light[1],
        index === 0 ? text[2] : light[2],
      );
      doc.text(line, pw - margin, logoY + 6 + index * 4.6, {
        align: "right",
        maxWidth: Math.max(40, cw * 0.45),
      });
    });
  }

  // ── Titre du rapport ───────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(text[0], text[1], text[2]);
  const titleLine = subtitle ? `${title} — ${subtitle}` : title;
  doc.text(
    doc.splitTextToSize(titleLine, cw) as string[],
    margin,
    titleY,
  );

  // ── Informations du projet / du document ───────────────────────────────
  if (info.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(light[0], light[1], light[2]);
    info.forEach((line, index) => {
      const truncated = doc.splitTextToSize(line, cw) as string[];
      doc.text(truncated[0] ?? "", margin, firstInfoY + index * infoStep);
    });
  }

  // ── Filet de séparation (accent de marque, pas un aplat de fond) ───────
  doc.setFillColor(BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]);
  doc.rect(0, accentTop, pw, 0.9, "F");

  return accentTop + 9;
}

/**
 * Pied de page commun à TOUTES les pages : identité de marque à gauche,
 * informations complémentaires à droite, pagination `Page i/N`.
 * Le logo n'est jamais répété (pas de doublon).
 */
export function drawReportFooters(
  doc: jsPDF,
  options: { left?: string; right?: string; margin?: number } = {},
) {
  const { left, right, margin = 15 } = options;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  const light = PDF_COLORS.textLight;

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(light[0], light[1], light[2]);
    doc.text(
      `${BRAND_NAME}${left ? ` — ${left}` : ""} — Page ${i}/${pages}`,
      margin,
      ph - 5,
    );
    if (right) {
      doc.text(right, pw - margin, ph - 5, { align: "right" });
    }
  }
}
