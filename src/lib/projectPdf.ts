import jsPDF from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";
import { toast } from "sonner";
import { drawBatiLogo } from "./pdfLogo";

applyAutotablePlugin(jsPDF);

export const REGION_LABELS: Record<string, string> = {
  tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
  nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
  jendouba: "Jendouba", le_kef: "Le Kef", siliana: "Siliana", kairouan: "Kairouan",
  kasserine: "Kasserine", sidi_bouzid: "Sidi Bouzid", sousse: "Sousse",
  monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès",
  medenine: "Médenine", tataouine: "Tataouine", gafsa: "Gafsa", tozeur: "Tozeur",
  kebili: "Kébili",
};

// PDF-safe text: strip emojis that jspdf can't render
const stripEmojis = (text: string) => text.replace(/[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu, "").trim();

// PDF-specific formatter: dots as thousand separators, explicit "TND" suffix
const fmtPdf = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const parts = Math.floor(Math.abs(n)).toString().split("");
  let result = "";
  for (let i = parts.length - 1, j = 1; i >= 0; i--, j++) {
    result = parts[i] + (j > 1 && (j - 1) % 3 === 0 ? "." : "") + result;
  }
  return `${sign}${result} TND`;
};

export interface ProjectPdfOptions {
  project: any;
  ce: any;
  ai: any;
  scenarios: any;
  scenario: string;
  onStart: () => void;
  onProgress: (step: number) => void;
  onSuccess: () => void;
  onFinish: () => void;
  consumeDownload: () => Promise<unknown>;
}

/**
 * Generates the full batibuild App estimate PDF (A4, programmatic jsPDF — no
 * html2canvas, no oklch). All page-level side effects are routed through the
 * `on*` callbacks so this module stays a pure, testable utility.
 */
export async function generateProjectPdf({
  project,
  ce,
  ai,
  scenarios,
  scenario,
  onStart,
  onProgress,
  onSuccess,
  onFinish,
  consumeDownload,
}: ProjectPdfOptions) {
  onStart();
  onProgress(0);

  try {
    await new Promise((r) => setTimeout(r, 400));
    onProgress(1);
    await new Promise((r) => setTimeout(r, 300));

    const scenarioData = scenarios?.[scenario];
    const totalCost = scenarioData?.totalCost || ce.totalCost;
    const costPerM2 = scenarioData?.costPerM2 || ce.costPerSquareMeter || 0;
    const scenarioLabel =
      scenario === "economique"
        ? "Économique"
        : scenario === "premium"
          ? "Premium"
          : "Standard";

    // Build breakdown for the selected scenario
    const isStandardScenario = scenario === "standard";
    const sf =
      isStandardScenario || !scenarios?.standard
        ? 1
        : (scenarioData?.totalCost || 0) / (scenarios.standard.totalCost || 1);
    const breakdown =
      sf === 1
        ? ce.breakdown
        : ce.breakdown.map((cat: any) => ({
            ...cat,
            estimatedCost: Math.round(cat.estimatedCost * sf),
            items: cat.items?.map((item: any) => ({
              ...item,
              totalPrice: Math.round(item.totalPrice * sf),
            })),
          }));

    onProgress(2);
    await new Promise((r) => setTimeout(r, 400));

    // Main-d'œuvre : quantité non communiquée dans le devis (N/A)
    const hasLabor = true;

    // ── Build PDF programmatically (no html2canvas, no oklch!) ──
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const ml = 15;
    const mr = 15;
    const cw = pw - ml - mr;
    let y = ml;

    const addPageIfNeeded = (needed: number) => {
      if (y + needed > ph - ml) {
        doc.addPage();
        y = ml;
      }
    };

    // Colors (all hex — no oklch!)
    const C = {
      primary: [5, 150, 105] as [number, number, number],
      primaryLight: [209, 250, 229] as [number, number, number],
      text: [31, 41, 55] as [number, number, number],
      textSecondary: [107, 114, 128] as [number, number, number],
      textLight: [156, 163, 175] as [number, number, number],
      border: [229, 231, 235] as [number, number, number],
      bgLight: [249, 250, 251] as [number, number, number],
    };

    const BIM_RGB: Record<string, [number, number, number]> = {
      gros_oeuvre: [59, 130, 246],
      second_oeuvre: [245, 158, 11],
      equipements: [139, 92, 246],
      main_oeuvre: [34, 197, 94],
      transport: [132, 204, 22],
      etudes_imprevus: [239, 68, 68],
    };

    const regionName = project.region
      ? REGION_LABELS[project.region] ?? project.region
      : "Non définie";
    const dateStr = new Date().toLocaleDateString("fr-FR");
    const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, "_");

    // ═══ HEADER BAR ════════════════════════════════════════════════
    // Top accent line
    doc.setFillColor(4, 120, 87);
    doc.rect(0, 0, pw, 2.5, "F");
    // Main header background
    doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.rect(0, 2.5, pw, 20, "F");

    // ── Draw batibuild App logo (casque blanc, carré vert) ──
    const logoX = ml;
    const logoY = 5;
    drawBatiLogo(doc, logoX, logoY, 13);

    // ── Title next to logo ──
    const titleX = ml + 17;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("batibuild App", titleX, 10);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Devis estimatif — Prix Tunisie 2026", titleX, 16);

    // ── Right side info ──
    const devisNum = `DEV-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`;
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(`N° ${devisNum}`, pw - mr, 8, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`${dateStr} · ${scenarioLabel}`, pw - mr, 14, { align: "right" });
    doc.text("Document non contractuel", pw - mr, 18, { align: "right" });

    y = 26;

    // ═══ PROJECT INFO BOX ══════════════════════════════════════════
    // Composition du bien (pièces) si renseignée
    const roomParts = [
      project.bedrooms ? `${project.bedrooms} chambre${project.bedrooms > 1 ? "s" : ""}` : "",
      project.bathrooms ? `${project.bathrooms} sdb` : "",
      project.kitchens ? `${project.kitchens} cuisine${project.kitchens > 1 ? "s" : ""}` : "",
      project.livingRooms ? `${project.livingRooms} salon${project.livingRooms > 1 ? "s" : ""}` : "",
      project.garages ? `${project.garages} garage${project.garages > 1 ? "s" : ""}` : "",
      project.wcs ? `${project.wcs} WC` : "",
      project.pools && project.category === "villa" ? `${project.pools} piscine${project.pools > 1 ? "s" : ""}` : "",
    ].filter(Boolean);
    const hasRooms = roomParts.length > 0;
    const boxH = hasRooms || hasLabor ? 24 : 16;

    doc.setFillColor(C.bgLight[0], C.bgLight[1], C.bgLight[2]);
    doc.rect(ml, y, cw, boxH, "F");
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.rect(ml, y, cw, boxH, "S");

    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(stripEmojis(project.name), ml + 3, y + 5.5);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    const infoRow = [
      `Catégorie: ${ai.category || "Non définie"}`,
      `Région: ${regionName}`,
      `Surface couverte: ${project.surface ? `${project.surface} m²` : "Non définie"}`,
      `Durée: ${ai.estimatedDuration || "Non définie"}`,
    ];
    let xInfo = ml + 3;
    infoRow.forEach((item) => {
      doc.text(item, xInfo, y + 11.5);
      xInfo += doc.getTextWidth(item) + 10;
    });

    if (hasRooms || hasLabor) {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
      if (hasRooms) doc.text(`Pièces: ${roomParts.join(" · ")}`, ml + 3, y + 16.5);
      if (hasLabor) doc.text("Main d'œuvre: N/A", ml + 3, y + (hasRooms ? 21 : 16.5));
    }

    y += boxH + 5;

    // ═══ TOTAL COST HERO ═══════════════════════════════════════════
    addPageIfNeeded(28);

    doc.setFillColor(C.primaryLight[0], C.primaryLight[1], C.primaryLight[2]);
    doc.rect(ml, y, cw, 26, "F");
    doc.setDrawColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.rect(ml, y, cw, 26, "S");

    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("COÛT TOTAL ESTIMÉ TTC", ml + 3, y + 5);

    const totalStr = fmtPdf(totalCost);
    doc.setTextColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(totalStr, ml + cw - 3, y + 17, { align: "right" });

    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtPdf(costPerM2)} /m² · ${scenarioLabel}`, ml + 3, y + 17);

    y += 31;

    // ═══ CONFIDENCE BAR ════════════════════════════════════════════
    addPageIfNeeded(12);

    const confPct = ai.confidence ? Math.round(ai.confidence * 100) : 0;
    const confLabel =
      confPct >= 80 ? "Fiable" : confPct >= 60 ? "Moyenne" : "Indicative";

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    doc.text(`Indice de confiance: ${confPct}% — ${confLabel}`, ml, y);

    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.setFillColor(C.bgLight[0], C.bgLight[1], C.bgLight[2]);
    doc.rect(ml, y + 2, cw, 4, "F");
    doc.rect(ml, y + 2, cw, 4, "S");

    const confColor: [number, number, number] =
      confPct >= 80
        ? [16, 185, 129]
        : confPct >= 60
          ? [245, 158, 11]
          : [239, 68, 68];
    doc.setFillColor(confColor[0], confColor[1], confColor[2]);
    doc.rect(ml, y + 2, cw * (confPct / 100), 4, "F");

    y += 12;

    // ═══ CATEGORY BREAKDOWN TABLE ══════════════════════════════════
    addPageIfNeeded(8 + breakdown.length * 5.5 + 10);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.text("Répartition par catégorie", ml, y);
    y += 2;

    // Table header row
    doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.rect(ml, y + 4, cw, 4.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("Catégorie", ml + 2, y + 7);
    doc.text("%", ml + cw * 0.55, y + 7, { align: "right" });
    doc.text("Montant", ml + cw * 0.75, y + 7, { align: "right" });

    const sortedBD = [...breakdown].sort(
      (a: any, b: any) => b.estimatedCost - a.estimatedCost,
    );

    y += 8.5;

    sortedBD.forEach((cat: any, i: number) => {
      addPageIfNeeded(5.5);

      if (i % 2 === 0) {
        doc.setFillColor(C.bgLight[0], C.bgLight[1], C.bgLight[2]);
        doc.rect(ml, y, cw, 5, "F");
      }
      doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
      doc.line(ml, y + 5, ml + cw, y + 5);

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      doc.text(cat.label, ml + 2, y + 3.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
      doc.text(`${cat.percentage}%`, ml + cw * 0.55, y + 3.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      doc.text(fmtPdf(cat.estimatedCost), ml + cw * 0.75, y + 3.5, { align: "right" });

      // Colored bar
      const barColor =
        BIM_RGB[cat.category] || (C.primary as [number, number, number]);
      doc.setFillColor(barColor[0], barColor[1], barColor[2]);
      doc.rect(ml + cw * 0.56, y + 1.5, cw * 0.17 * (cat.percentage / 100), 2.5, "F");

      y += 5;
    });

    // Contingency row
    addPageIfNeeded(6);
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.line(ml, y, ml + cw, y);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text("Imprévus", ml + 2, y + 3.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    doc.text(`${ce.contingencyPercentage}%`, ml + cw * 0.55, y + 3.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text(
      fmtPdf(Math.round(ce.contingencyBuffer * sf)),
      ml + cw * 0.75,
      y + 3.5,
      { align: "right" },
    );

    y += 10;

    // ═══ BUDGET SCENARIOS COMPARISON ═══════════════════════════════
    if (scenarios) {
      addPageIfNeeded(22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      doc.text("Scénarios budgétaires", ml, y);
      y += 6;

      const scKeys = ["economique", "standard", "premium"];
      const scLabels = ["Économique", "Standard", "Premium"];
      const scColors: [number, number, number][] = [
        [16, 185, 129],
        [59, 130, 246],
        [139, 92, 246],
      ];
      const scColW = cw / 3;

      scKeys.forEach((key, i) => {
        const s = scenarios[key as keyof typeof scenarios];
        if (!s) return;
        const x = ml + i * scColW;
        const isSel = key === scenario;

        doc.setFillColor(
          isSel ? C.primaryLight[0] : C.bgLight[0],
          isSel ? C.primaryLight[1] : C.bgLight[1],
          isSel ? C.primaryLight[2] : C.bgLight[2],
        );
        doc.rect(x, y, scColW - 2, 18, "F");
        doc.setDrawColor(
          isSel ? C.primary[0] : C.border[0],
          isSel ? C.primary[1] : C.border[1],
          isSel ? C.primary[2] : C.border[2],
        );
        doc.rect(x, y, scColW - 2, 18, "S");

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(scColors[i][0], scColors[i][1], scColors[i][2]);
        doc.text(scLabels[i], x + 2, y + 4);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(
          isSel ? C.primary[0] : C.text[0],
          isSel ? C.primary[1] : C.text[1],
          isSel ? C.primary[2] : C.text[2],
        );
        doc.text(fmtPdf(s.totalCost), x + 2, y + 10);

        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(
          C.textSecondary[0],
          C.textSecondary[1],
          C.textSecondary[2],
        );
        doc.text(`${fmtPdf(s.costPerM2)} /m²`, x + 2, y + 15);
      });

      y += 24;
    }

    // ═══ QUANTITATIF DÉTAILLÉ (autoTable) ══════════════════════════
    onProgress(2);

    const hasItems = breakdown.some((b: any) => b.items?.length > 0);
    if (hasItems) {
      addPageIfNeeded(12);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      doc.text(`Quantitatif détaillé — ${scenarioLabel}`, ml, y);
      y += 6;

      const totalItemsCount = breakdown.reduce(
        (s: number, b: any) => s + (b.items?.length || 0),
        0,
      );
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(
        C.textSecondary[0],
        C.textSecondary[1],
        C.textSecondary[2],
      );
      doc.text(`${totalItemsCount} postes de travaux`, ml, y);
      y += 4;

      // Build autoTable data
      const tableBody: any[][] = [];
      breakdown.forEach((cat: any) => {
        const catItems = cat.items || [];
        if (catItems.length === 0) return;
        // Category header row
        tableBody.push([
          {
            content: cat.label,
            styles: {
              fontStyle: "bold",
              fontSize: 7,
              fillColor: [243, 244, 246],
              textColor: C.text,
              halign: "left" as const,
            },
          },
          {
            content: `${catItems.length} postes`,
            styles: {
              fontSize: 6.5,
              fillColor: [243, 244, 246],
              textColor: C.textLight,
              halign: "right" as const,
            },
          },
          {
            content: "",
            styles: { fillColor: [243, 244, 246] },
          },
          {
            content: fmtPdf(cat.estimatedCost),
            styles: {
              fontSize: 7,
              fontStyle: "bold",
              halign: "right" as const,
              fillColor: [243, 244, 246],
            },
          },
        ]);
        // Item rows
        catItems.forEach((item: any) => {
          tableBody.push([
            {
              content: item.name,
              styles: { fontSize: 6.5, halign: "left" as const },
            },
            {
              content: `${item.quantity} ${item.unit}`,
              styles: {
                fontSize: 6.5,
                halign: "right" as const,
                textColor: C.textSecondary,
              },
            },
            {
              content: fmtPdf(item.unitPrice),
              styles: {
                fontSize: 6.5,
                halign: "right" as const,
                textColor: C.textSecondary,
              },
            },
            {
              content: fmtPdf(item.totalPrice),
              styles: {
                fontSize: 6.5,
                halign: "right" as const,
                fontStyle: "bold",
              },
            },
          ]);
        });
      });

      (doc as any).autoTable({
        startY: y,
        margin: { left: ml, right: mr },
        tableWidth: cw,
        head: [
          [
            { content: "Matériau / Prestation", styles: { halign: "left" } },
            { content: "Qté", styles: { halign: "right" } },
            { content: "P.U.", styles: { halign: "right" } },
            { content: "Total", styles: { halign: "right" } },
          ],
        ],
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          textColor: C.text,
          lineColor: C.border,
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: C.primary,
          textColor: 255,
          fontStyle: "bold",
          fontSize: 7,
          cellPadding: 2,
        },
        alternatingRowBackground: true,
        alternatingRowBackgroundColor: [249, 250, 251],
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          // Footer line
          doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
          doc.line(ml, ph - 8, pw - mr, ph - 8);
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(
            C.textLight[0],
            C.textLight[1],
            C.textLight[2],
          );
          doc.text(
            `batibuild App — Devis estimatif — Page ${pageCount}`,
            ml,
            ph - 4,
          );
          doc.text(
            "Document généré automatiquement — Prix Tunisie 2026",
            pw - mr,
            ph - 4,
            { align: "right" },
          );
        },
      });

      y = (doc as any).lastAutoTable?.finalY || y;
      y += 8;
    }

    // ═══ ANOMALIES ═════════════════════════════════════════════════
    if (ai.anomalies && ai.anomalies.length > 0) {
      addPageIfNeeded(10 + ai.anomalies.length * 6);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(185, 28, 28);
      doc.text("Anomalies détectées", ml, y);
      y += 5;

      ai.anomalies.forEach((a: any) => {
        addPageIfNeeded(6);

        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(254, 202, 202);
        doc.rect(ml, y, cw, 5.5, "F");
        doc.rect(ml, y, cw, 5.5, "S");

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(185, 28, 28);
        doc.text(a.type || "", ml + 2, y + 3.5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(
          C.textSecondary[0],
          C.textSecondary[1],
          C.textSecondary[2],
        );
        doc.text(a.description || "", ml + 35, y + 3.5);

        y += 7;
      });

      y += 3;
    }

    // ═══ STAMP & SIGNATURE ═══════════════════════════════════════
    addPageIfNeeded(55);

    const stampW = 90;
    const stampH = 46;
    const stampX = pw - mr - stampW;
    let stampY = Math.max(y, ph - 60);

    // Outer stamp border (double rectangle for official look)
    doc.setDrawColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.setLineWidth(0.8);
    doc.rect(stampX - 1, stampY - 1, stampW + 2, stampH + 2, "S");
    doc.setLineWidth(0.4);
    doc.rect(stampX, stampY, stampW, stampH, "S");

    // Inner fill (very light)
    doc.setFillColor(239, 246, 255);
    doc.rect(stampX + 0.5, stampY + 0.5, stampW - 1, stampH - 1, "F");

    // Decorative top bar
    doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.rect(stampX + 2, stampY + 3, stampW - 4, 0.8, "F");

    // Company name
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.primary[0], C.primary[1], C.primary[2]);
    doc.text("GALISKON", stampX + stampW / 2, stampY + 10, { align: "center" });

    // Decorative bar
    doc.rect(stampX + 2, stampY + 12.5, stampW - 4, 0.8, "F");

    // Tagline
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.text("Devis créé par les experts de batibuild App", stampX + stampW / 2, stampY + 20, { align: "center" });

    // Separator bar
    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.setLineWidth(0.2);
    doc.line(stampX + 12, stampY + 24, stampX + stampW - 12, stampY + 24);

    // Signature line
    doc.setDrawColor(C.text[0], C.text[1], C.text[2]);
    doc.setLineWidth(0.3);
    doc.line(stampX + 12, stampY + 34, stampX + stampW - 12, stampY + 34);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(C.textLight[0], C.textLight[1], C.textLight[2]);
    doc.text("Signature", stampX + stampW / 2, stampY + 40, { align: "center" });

    // Update y to continue after stamp
    y = stampY + stampH + 6;

    // ═══ DISCLAIMER ════════════════════════════════════════════════
    addPageIfNeeded(15);
    y = Math.max(y, ph - 25);

    doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
    doc.line(ml, y, ml + cw, y);
    y += 3;

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(C.textLight[0], C.textLight[1], C.textLight[2]);
    const disclaimer =
      "Ce document est un devis estimatif généré automatiquement par batibuild App. " +
      "Les prix indiqués sont basés sur les moyennes du marché tunisien 2026 et sont " +
      "donnés à titre indicatif. Ils ne constituent pas un engagement contractuel. " +
      "Pour un devis précis, veuillez consulter un professionnel du bâtiment.";
    const discLines = doc.splitTextToSize(disclaimer, cw);
    doc.text(discLines, ml, y + 3);

    // ═══ SAVE PDF ══════════════════════════════════════════════════
    onProgress(3);
    const filename = `Devis-${scenarioLabel}-${safeName}.pdf`;
    doc.save(filename);

    // Show success animation before completing
    onSuccess();
    await new Promise((r) => setTimeout(r, 800));

    try {
      await consumeDownload();
    } catch {
      // Silently fail
    }
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "Erreur lors de la génération du PDF";
    console.error("PDF generation error:", err);
    toast.error(`Échec du téléchargement : ${msg}`);
  } finally {
    onFinish();
  }
}
