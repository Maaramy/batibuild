import jsPDF from "jspdf";
import { applyPlugin as applyAutotablePlugin } from "jspdf-autotable";

applyAutotablePlugin(jsPDF);

// PDF-safe text: strip emojis that jspdf can't render
const stripEmojis = (text: string) =>
  text
    .replace(/[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu, "")
    .trim();

// Dots as thousand separators + TND suffix (PDF-safe, no narrow NBSP)
const fmtTnd = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const parts = Math.floor(Math.abs(n)).toString().split("");
  let result = "";
  for (let i = parts.length - 1, j = 1; i >= 0; i--, j++) {
    result = parts[i] + (j > 1 && (j - 1) % 3 === 0 ? "." : "") + result;
  }
  return `${sign}${result} TND`;
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const PROFILE_COLORS: Record<string, [number, number, number]> = {
  economique: [5, 150, 105],   // emerald
  equilibre: [37, 99, 235],    // blue
  premium: [147, 51, 234],     // violet
};

const PROFILE_LABEL: Record<string, string> = {
  economique: "Économique",
  equilibre: "Équilibrée",
  premium: "Premium",
};

const CRITERIA: { key: keyof any; label: string }[] = [
  { key: "prix", label: "Prix" },
  { key: "qualite", label: "Qualité" },
  { key: "durabilite", label: "Durabilité" },
  { key: "isolationThermique", label: "Isolation thermique" },
  { key: "isolationAcoustique", label: "Isolation acoustique" },
  { key: "resistance", label: "Résistance" },
  { key: "entretien", label: "Entretien" },
  { key: "disponibilite", label: "Disponibilité" },
  { key: "impactEnvironnemental", label: "Impact environnemental" },
];

export function generateMaterialReportPdf(input: {
  result: any; // RecommendResult
  optimization?: any; // BudgetOptimization
  performance?: any; // PerformanceImprovement
  comparison?: any; // MaterialComparison
}) {
  const { result, optimization, performance, comparison } = input;
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 14;
  const mr = 14;
  const cw = pw - ml - mr;
  let y = ml;

  const C = {
    primary: [37, 99, 235] as [number, number, number],
    primaryLight: [219, 234, 254] as [number, number, number],
    text: [31, 41, 55] as [number, number, number],
    textSecondary: [107, 114, 128] as [number, number, number],
    textLight: [156, 163, 175] as [number, number, number],
    border: [229, 231, 235] as [number, number, number],
    bgLight: [249, 250, 251] as [number, number, number],
    success: [5, 150, 105] as [number, number, number],
    warn: [217, 119, 6] as [number, number, number],
  };

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > ph - ml) {
      doc.addPage();
      y = ml;
    }
  };

  const sectionTitle = (text: string, color: [number, number, number] = C.primary) => {
    addPageIfNeeded(16);
    y += 4;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(ml, y, 2.5, 5, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.text(text, ml + 5, y + 4.3);
    y += 8;
  };

  const labelValue = (label: string, value: string) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    doc.text(label + " : ", ml, y);
    const labelW = doc.getTextWidth(label + " : ");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.text(stripEmojis(value), ml + labelW, y);
    y += 4.5;
  };

  const dateStr = fmtDate(Date.now());
  const ctx = result.context || {};
  const built = Math.round((ctx.surface || 0) * Math.max(1, ctx.floors || 1));
  const safeName = (ctx.projectName || "Analyse-matériaux").replace(/[^a-zA-Z0-9-_]/g, "_");

  // ═══ HEADER ════════════════════════════════════════════════
  doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.rect(0, 0, pw, 24, "F");
  // Accent line
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 24, pw, 2, "F");

  // Logo (building)
  doc.setFillColor(255, 255, 255);
  const lx = ml + 1;
  const ly = 5.5;
  doc.triangle(lx + 5.5, ly, lx, ly + 5.5, lx + 11, ly + 5.5, "F");
  doc.rect(lx + 1, ly + 5.5, 9, 8.5, "F");
  doc.setFillColor(C.primary[0], C.primary[1], C.primary[2]);
  doc.rect(lx + 4, ly + 9, 3.5, 5, "F");
  doc.rect(lx + 2.3, ly + 7, 1.8, 1.8, "F");
  doc.rect(lx + 6.9, ly + 7, 1.8, 1.8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("batibuild App", ml + 16, 10);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport Assistant Matériaux IA — Tunisie 2026", ml + 16, 15.5);
  doc.setFontSize(6);
  doc.text("Choix des matériaux · Recommandation comparative · Prix indicatifs", ml + 16, 19.5);

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text(`N° ${new Date().getFullYear()}-MAT-${String(Math.floor(10000 + Math.random() * 90000))}`, pw - mr, 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Généré le ${dateStr}`, pw - mr, 13, { align: "right" });
  doc.text("Document non contractuel", pw - mr, 17, { align: "right" });

  y = 32;

  // ═══ 1. INFORMATIONS DU PROJET ═════════════════════════════
  sectionTitle("1. Informations du projet");
  doc.setFillColor(C.bgLight[0], C.bgLight[1], C.bgLight[2]);
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.rect(ml, y, cw, 30, "F");
  doc.rect(ml, y, cw, 30, "S");
  y += 6;
  labelValue("Projet", ctx.projectName || "Non renseigné");
  labelValue("Type de projet", ctx.projectCategory || "Non renseigné");
  labelValue("Surface construite", ctx.surface ? `${ctx.surface} m² × ${ctx.floors || 1} niveau(x) = ${built} m²` : "Non renseignée");
  labelValue("Localisation", [ctx.region, ctx.city, ctx.quarter].filter(Boolean).join(" · ") || "Non précisée");
  labelValue("Année de construction", String(ctx.year || "Non précisée"));
  y += 3;

  // ═══ 2. BESOINS DE L'UTILISATEUR ═══════════════════════════
  sectionTitle("2. Besoins de l'utilisateur");
  labelValue("Niveau de standing", ctx.standing || "Standard");
  labelValue("Budget", (() => {
    const b = (ctx.budgetMode || "moyen");
    return `${b}${ctx.budgetAmount ? ` — ${fmtTnd(ctx.budgetAmount)}` : ""}`;
  })());
  labelValue("Catégories analysées", result.categories.map((c: any) => c.label).join(", ") || "—");
  labelValue("Priorités", (() => {
    const p = ctx.priorities || {};
    const items = [
      p.price ? `Prix ${p.price}` : "",
      p.quality ? `Qualité ${p.quality}` : "",
      p.isolation ? `Isolation ${p.isolation}` : "",
      p.durability ? `Durabilité ${p.durability}` : "",
      p.eco ? `Écologie ${p.eco}` : "",
    ].filter(Boolean);
    return items.join(" · ") || "Pondération standard";
  })());
  y += 2;

  // ═══ 3 & 4. MATÉRIAUX ANALYSÉS + CRITÈRES ══════════════════
  sectionTitle("3. Matériaux analysés & critères de comparaison");
  labelValue("Références examinées", String(result.categories.reduce((s: number, c: any) => s + c.candidatesCount, 0)));
  labelValue("Critères", "Prix · Qualité · Durabilité · Isolation thermique/acoustique · Résistance · Entretien · Disponibilité · Impact environnemental");
  labelValue("Notation", "Scores sur 100, pondérés selon le profil (économique / équilibré / premium) et vos priorités");
  if (result.missingData && result.missingData.length) {
    y += 1;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(C.warn[0], C.warn[1], C.warn[2]);
    doc.text("Données non disponibles (signalées, jamais inventées) :", ml, y);
    y += 4;
    for (const m of result.missingData.slice(0, 5)) {
      doc.text("• " + stripEmojis(m), ml + 2, y);
      y += 4;
    }
  }
  y += 2;

  // ═══ 5 & 6. RECOMMANDATIONS PAR CATÉGORIE ══════════════════
  sectionTitle("4. Matériaux recommandés (3 solutions par catégorie)");
  for (const cat of result.categories) {
    addPageIfNeeded(12 + cat.solutions.length * 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.text(`${cat.label} — ${cat.candidatesCount} matériaux analysés`, ml, y);
    y += 3;

    for (const s of cat.solutions) {
      const color = PROFILE_COLORS[s.profile] || C.primary;
      const boxH = 26;
      addPageIfNeeded(boxH + 2);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(ml, y, cw, boxH, "F");
      doc.rect(ml, y, cw, boxH, "S");
      // White panel content
      doc.setFillColor(255, 255, 255);
      doc.rect(ml + 1, y + 1, cw - 2, boxH - 2, "F");

      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(`Solution ${s.profile === "economique" ? "A" : s.profile === "equilibre" ? "B" : "C"} — ${PROFILE_LABEL[s.profile]}`, ml + 3, y + 4.5);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      doc.text(stripEmojis(s.material.name), ml + 3, y + 9.5);

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
      doc.text(`Score ${s.scores.noteGlobale}/100 · ${s.material.band.avg.toFixed(2)} TND/${s.material.unit} · Qté ${s.material.quantity} ${s.material.quantityUnit}`, ml + 3, y + 13.5);
      doc.text(
        `Coût matériaux : ${fmtTnd(s.material.materialCost)} · Total pose incluse : ${fmtTnd(s.material.totalCost)}` +
        (s.suppliers.length ? ` · Fournisseur dès ${s.suppliers[0].price.toFixed(2)} TND (${s.suppliers[0].name})` : ""),
        ml + 3,
        y + 17,
      );
      doc.setFont("helvetica", "italic");
      doc.setTextColor(C.textLight[0], C.textLight[1], C.textLight[2]);
      const prosLine = s.pros.slice(0, 2).join(" · ");
      doc.text(stripEmojis(prosLine).slice(0, 105), ml + 3, y + 20.5);
      doc.text(stripEmojis(s.cons.slice(0, 1).join(" · ")).slice(0, 105), ml + 3, y + 24);
      y += boxH + 3;
    }
    y += 2;
  }

  // ═══ 7. TABLEAU COMPARATIF (première catégorie ou synthèse) ═
  sectionTitle("5. Tableau comparatif (critères sur 100)");
  const catForTable = result.categories[0];
  if (catForTable) {
    const solutions = catForTable.solutions;
    const head = [
      { content: "Critère", styles: { halign: "left" as const } },
      ...solutions.map((s: any) => ({
        content: PROFILE_LABEL[s.profile],
        styles: { halign: "right" as const, textColor: PROFILE_COLORS[s.profile] },
      })),
    ];
    const body = [
      ...CRITERIA.map((crit) => [
        crit.label,
        ...solutions.map((s: any) => String(s.scores[crit.key] ?? 0)),
      ]),
      ["Note globale", ...solutions.map((s: any) => String(s.scores.noteGlobale))],
    ];
    (doc as any).autoTable({
      startY: y,
      margin: { left: ml, right: mr },
      tableWidth: cw,
      head: [head],
      body,
      theme: "grid",
      styles: { fontSize: 6.5, cellPadding: 1.6, textColor: C.text, lineColor: C.border, lineWidth: 0.3 },
      headStyles: { fillColor: C.primary, textColor: 255, fontStyle: "bold", fontSize: 7 },
      alternatingRowBackground: true,
      alternatingRowBackgroundColor: [249, 250, 251],
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 5;
  }

  // ═══ 8-10. COÛT TOTAL ═════════════════════════════════════
  sectionTitle("6. Coût total estimatif (matériaux recommandés)");
  const cost = result.cost;
  const costRows = [
    ["Matériaux", fmtTnd(cost.materials)],
    ["Main-d'œuvre (pose)", fmtTnd(cost.pose)],
    ["Transport", fmtTnd(cost.transport)],
    ["Déchets / pertes (5%)", fmtTnd(cost.waste)],
    ["Accessoires (6%)", fmtTnd(cost.accessories)],
    ["TVA (19%)", fmtTnd(cost.tva)],
    ["TOTAL ESTIMÉ", fmtTnd(cost.total)],
    ["Fourchette", `${fmtTnd(cost.min)} — ${fmtTnd(cost.probable !== undefined ? cost.probable : cost.total)} — ${fmtTnd(cost.max)}`],
    ["Prix au m² construit", fmtTnd(cost.perM2)],
  ];
  (doc as any).autoTable({
    startY: y,
    margin: { left: ml, right: mr },
    tableWidth: cw,
    head: [[{ content: "Poste", styles: { halign: "left" } }, { content: "Montant", styles: { halign: "right" } }]],
    body: costRows.map((r, i) => [
      { content: r[0], styles: { fontStyle: i === 6 ? "bold" : "normal", fontSize: 6.5 } },
      { content: r[1], styles: { halign: "right", fontStyle: i === 6 ? "bold" : "normal", textColor: i === 6 ? C.primary : C.text, fontSize: 6.5 } },
    ]),
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 1.6, textColor: C.text, lineColor: C.border, lineWidth: 0.3 },
    headStyles: { fillColor: C.primary, textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternatingRowBackground: true,
    alternatingRowBackgroundColor: [249, 250, 251],
  });
  y = ((doc as any).lastAutoTable?.finalY || y) + 4;
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(C.textLight[0], C.textLight[1], C.textLight[2]);
  doc.text(
    "Prix indicatif du marché — dernière mise à jour : " + fmtDate(cost.priceDate || Date.now()) + ". Estimations TND, hypothèses datées.",
    ml, y,
  );
  y += 5;

  // ═══ 11. FOURNISSEURS ═════════════════════════════════════
  sectionTitle("7. Fournisseurs disponibles (meilleures offres)");
  const supplierRows: any[][] = [];
  for (const cat of result.categories) {
    const s = cat.solutions.find((x: any) => x.profile === "equilibre") || cat.solutions[0];
    for (const sup of s.suppliers.slice(0, 2)) {
      supplierRows.push([cat.label, stripEmojis(s.material.name), sup.name, sup.governorate || "—", `${sup.price.toFixed(2)} TND/${sup.unit || ""}`]);
    }
  }
  if (supplierRows.length) {
    (doc as any).autoTable({
      startY: y,
      margin: { left: ml, right: mr },
      tableWidth: cw,
      head: [[
        { content: "Catégorie", styles: { halign: "left" } },
        { content: "Matériau", styles: { halign: "left" } },
        { content: "Fournisseur", styles: { halign: "left" } },
        { content: "Localisation", styles: { halign: "left" } },
        { content: "Prix min", styles: { halign: "right" } },
      ]],
      body: supplierRows,
      theme: "grid",
      styles: { fontSize: 6.5, cellPadding: 1.5, textColor: C.text, lineColor: C.border, lineWidth: 0.3 },
      headStyles: { fillColor: C.primary, textColor: 255, fontStyle: "bold", fontSize: 7 },
      alternatingRowBackground: true,
      alternatingRowBackgroundColor: [249, 250, 251],
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 4;
  } else {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    doc.text("Aucune offre fournisseur recensée pour les matériaux recommandés.", ml, y);
    y += 5;
  }

  // ═══ 12. ALTERNATIVES (solutions A & C vs recommandée) ══════
  sectionTitle("8. Alternatives");
  for (const cat of result.categories) {
    const rec = cat.solutions.find((x: any) => x.profile === "equilibre") || cat.solutions[0];
    const alts = cat.solutions.filter((x: any) => x.material.id !== rec.material.id);
    if (!alts.length) continue;
    addPageIfNeeded(8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.text[0], C.text[1], C.text[2]);
    doc.text(stripEmojis(cat.label), ml, y);
    y += 4;
    for (const a of alts) {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
      doc.text(`• ${PROFILE_LABEL[a.profile]} : ${stripEmojis(a.material.name)} — ${a.material.band.avg.toFixed(2)} TND/${a.material.unit} (score ${a.scores.noteGlobale}/100)`, ml + 2, y);
      y += 4;
    }
    y += 1;
  }

  // ═══ 13. OPTIMISATION BUDGÉTAIRE ═══════════════════════════
  if (optimization) {
    sectionTitle("9. Optimisation budgétaire");
    labelValue("Budget initial", fmtTnd(optimization.originalTotal));
    labelValue("Budget optimisé", fmtTnd(optimization.optimizedTotal));
    labelValue("Économie potentielle", `${fmtTnd(optimization.savings)} (${optimization.savingsPct}%)`);
    y += 2;
    if (optimization.changes?.length) {
      for (const ch of optimization.changes.slice(0, 8)) {
        addPageIfNeeded(5);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
        doc.text(`• ${stripEmojis(ch.categoryLabel)} : ${stripEmojis(ch.from)} → ${stripEmojis(ch.to)} (−${fmtTnd(ch.saving)})`, ml + 2, y);
        y += 4;
      }
    }
    if (optimization.summary) {
      addPageIfNeeded(8);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(C.text[0], C.text[1], C.text[2]);
      const lines = doc.splitTextToSize(stripEmojis(optimization.summary), cw - 4);
      doc.text(lines, ml + 2, y);
      y += lines.length * 3.5 + 2;
    }
  }

  // ═══ 14. PERFORMANCE ÉNERGÉTIQUE ═══════════════════════════
  if (performance && performance.improvements?.length) {
    sectionTitle("10. Amélioration de la performance énergétique");
    for (const imp of performance.improvements.slice(0, 6)) {
      addPageIfNeeded(5);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
      doc.text(`• ${stripEmojis(imp.categoryLabel)} : ${stripEmojis(imp.from)} → ${stripEmojis(imp.to)} — ${stripEmojis(imp.benefit)} (économie estimée ${imp.estimatedSavingPct}%)`, ml + 2, y);
      y += 4;
    }
    y += 1;
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(C.warn[0], C.warn[1], C.warn[2]);
    const noteLines = doc.splitTextToSize(stripEmojis(performance.note || ""), cw);
    doc.text(noteLines, ml, y);
    y += noteLines.length * 3 + 2;
  }

  // ═══ 15. RECOMMANDATION FINALE ═════════════════════════════
  sectionTitle("11. Recommandation finale");
  const rec = result.recommendation;
  addPageIfNeeded(34);
  const rc = PROFILE_COLORS[rec.solution] || C.primary;
  doc.setFillColor(rc[0], rc[1], rc[2]);
  doc.rect(ml, y, cw, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Solution recommandée : ${PROFILE_LABEL[rec.solution] || rec.solution} — Score ${rec.score}/100`, ml + 3, y + 5.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(stripEmojis(`Matériau clé : ${rec.materialName} (${rec.categoryLabel})`), ml + 3, y + 10);
  y += 16;

  const explanationLines = doc.splitTextToSize(stripEmojis(rec.explanation || ""), cw);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(C.text[0], C.text[1], C.text[2]);
  doc.text(explanationLines, ml, y);
  y += explanationLines.length * 3.5 + 3;

  if (rec.advantages?.length) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.success[0], C.success[1], C.success[2]);
    doc.text("Avantages", ml, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    for (const a of rec.advantages.slice(0, 4)) {
      addPageIfNeeded(5);
      doc.text("• " + stripEmojis(a), ml + 2, y);
      y += 4;
    }
    y += 1;
  }
  if (rec.limits?.length) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(C.warn[0], C.warn[1], C.warn[2]);
    doc.text("Limites", ml, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textSecondary[0], C.textSecondary[1], C.textSecondary[2]);
    for (const l of rec.limits.slice(0, 3)) {
      addPageIfNeeded(5);
      doc.text("• " + stripEmojis(l), ml + 2, y);
      y += 4;
    }
    y += 2;
  }

  // ═══ DISCLAIMER ════════════════════════════════════════════
  addPageIfNeeded(30);
  y = Math.max(y, ph - 40);
  doc.setDrawColor(C.border[0], C.border[1], C.border[2]);
  doc.line(ml, y, ml + cw, y);
  y += 4;
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(C.textLight[0], C.textLight[1], C.textLight[2]);
  const disclaimer =
    "Avertissement : ce rapport est un document d'aide à la décision généré automatiquement. Les prix sont des estimations " +
    "indicatives du marché tunisien (catalogue 2026, relevés datés) et ne constituent ni un devis contractuel, ni une validation " +
    "d'ingénieur ou d'architecte. Pour les éléments structurels ou liés à la sécurité, la validation d'un professionnel qualifié est requise. " +
    `Données de prix : dernière mise à jour ${fmtDate(cost.priceDate || Date.now())}.`;
  const discLines = doc.splitTextToSize(disclaimer, cw);
  doc.text(discLines, ml, y);

  // Footer on all pages
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(C.textLight[0], C.textLight[1], C.textLight[2]);
    doc.text(`batibuild App — Assistant Matériaux IA — Page ${i}/${pages}`, ml, ph - 4);
    doc.text("Prix indicatifs TND · Tunisie 2026", pw - mr, ph - 4, { align: "right" });
  }

  const filename = `Rapport-Materiaux-${safeName}.pdf`;
  doc.save(filename);
  return filename;
}
