// Logo officiel batibuild App pour les rapports PDF — identique au logo de la
// landing page : un casque de chantier blanc dans un carré arrondi vert
// (emerald-600 ≈ --primary). Utilisé par tous les exports PDF (devis,
// rapport matériaux IA, guide construction A-Z).

import type jsPDF from "jspdf";

/** Vert de marque (emerald-600, ≈ var(--primary) de l'application). */
export const BRAND_RGB: [number, number, number] = [5, 150, 105];

/**
 * Dessine le logo batibuild App (casque blanc dans un carré arrondi vert).
 * @param doc instance jsPDF
 * @param x coin supérieur gauche (mm)
 * @param y coin supérieur gauche (mm)
 * @param size côté du carré logo en mm
 */
export function drawBatiLogo(doc: jsPDF, x: number, y: number, size = 14) {
  // Carré arrondi vert
  doc.setFillColor(BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]);
  doc.roundedRect(x, y, size, size, size * 0.22, size * 0.22, "F");

  // Casque blanc
  doc.setFillColor(255, 255, 255);
  const cx = x + size / 2;
  // Bouton supérieur
  doc.rect(cx - size * 0.05, y + size * 0.06, size * 0.1, size * 0.14, "F");
  // Dôme
  doc.ellipse(cx, y + size * 0.32, size * 0.3, size * 0.16, "F");
  // Bandeau (recouvre la base du dôme)
  doc.rect(x + size * 0.08, y + size * 0.42, size * 0.84, size * 0.12, "F");
  // Montants
  doc.rect(cx - size * 0.05, y + size * 0.52, size * 0.1, size * 0.28, "F");
  doc.rect(x + size * 0.16, y + size * 0.52, size * 0.09, size * 0.2, "F");
  doc.rect(x + size * 0.75, y + size * 0.52, size * 0.09, size * 0.2, "F");
}
