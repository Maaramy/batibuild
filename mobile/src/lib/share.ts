import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import i18n from "@/i18n";
import { formatDate, formatTnd } from "@/lib/format";
import type { Project } from "@/lib/convex";

export async function shareText(title: string, message: string): Promise<void> {
  try {
    await Share.share({ title, message });
  } catch {
    // utilisateur a annulé
  }
}

export async function copyLink(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

export function estimateShareText(project: Project): string {
  const est = project.costEstimate;
  if (!est) return `${project.name} — BudgetBati`;
  return [
    `🏗️ ${project.name} — BudgetBati`,
    i18n.t("estimate.total") + " : " + formatTnd(est.totalCost),
    i18n.t("estimate.costPerM2") + " : " + formatTnd(est.costPerSquareMeter) + i18n.t("common.perM2"),
    i18n.t("estimate.date") + " : " + formatDate(project.updatedAt),
  ].join("\n");
}

function esc(s: string | number | undefined | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Génère un PDF professionnel (logo, projet, paramètres, détail, total, date, TND). */
export async function generateEstimatePdf(project: Project): Promise<string | null> {
  const est = project.costEstimate;
  if (!est) return null;

  const rows = (est.breakdown ?? [])
    .map(
      (b) => `
      <tr>
        <td class="cat">${esc(b.label)}</td>
        <td class="num">${formatTnd(b.estimatedCost)}</td>
        <td class="num">${Math.round(b.percentage ?? 0)}%</td>
      </tr>`,
    )
    .join("");

  const scenarios = est.budgetScenarios
    ? `
    <div class="scenarios">
      ${["economique", "standard", "premium"]
        .map((key) => {
          const s = est.budgetScenarios![key as keyof typeof est.budgetScenarios];
          if (!s) return "";
          return `<div class="scenario"><span>${esc(s.label)}</span><strong>${formatTnd(s.totalCost)}</strong><small>${formatTnd(s.costPerM2)}${i18n.t("common.perM2")}</small></div>`;
        })
        .join("")}
    </div>`
    : "";

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1E293B; padding: 28px; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10B981; padding-bottom: 16px; margin-bottom: 20px; }
      .brand { display: flex; align-items: center; gap: 10px; }
      .brand-mark { width: 34px; height: 34px; border-radius: 8px; background: #0B3B2E; color: #6EE7B7; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; }
      .brand-name { font-size: 20px; font-weight: 800; color: #0B3B2E; }
      .brand-tag { font-size: 11px; color: #64748B; }
      .doc-title { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #64748B; text-align: right; }
      h1 { font-size: 18px; margin: 4px 0 18px; color: #1E293B; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; }
      .meta div { font-size: 12px; }
      .meta .k { color: #64748B; display: block; margin-bottom: 2px; }
      .meta .v { font-weight: 700; color: #1E293B; }
      .total { background: linear-gradient(135deg, #0B3B2E, #10B981); color: #fff; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .total .k { font-size: 12px; opacity: .85; }
      .total .v { font-size: 22px; font-weight: 900; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; }
      th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
      td { padding: 9px 10px; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
      td.cat { font-weight: 600; }
      td.num { text-align: right; font-variant-numeric: tabular-nums; }
      tr:nth-child(odd) td { background: #F8FAFC; }
      .scenarios { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 12px 0 20px; }
      .scenario { border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px; text-align: center; }
      .scenario span { display: block; font-size: 11px; color: #64748B; }
      .scenario strong { display: block; font-size: 14px; color: #0B3B2E; margin: 2px 0; }
      .scenario small { font-size: 10px; color: #94A3B8; }
      .footer { margin-top: 16px; font-size: 10px; color: #94A3B8; text-align: center; border-top: 1px solid #F1F5F9; padding-top: 12px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand">
        <div class="brand-mark">B</div>
        <div>
          <div class="brand-name">BudgetBati</div>
          <div class="brand-tag">${esc(i18n.t("app.tagline"))}</div>
        </div>
      </div>
      <div>
        <div class="doc-title">${esc(i18n.t("estimate.title"))}</div>
        <div style="font-size:12px;color:#94A3B8;text-align:right">${formatDate(project.updatedAt)}</div>
      </div>
    </div>
    <h1>${esc(project.name)}</h1>
    <div class="meta">
      <div><span class="k">${esc(i18n.t("projects.type"))}</span><span class="v">${esc((project as any).categoryLabel ?? project.category)}</span></div>
      <div><span class="k">${esc(i18n.t("projects.surface"))}</span><span class="v">${esc(project.surface ?? "—")} m²</span></div>
      <div><span class="k">${esc(i18n.t("projects.floors"))}</span><span class="v">${esc(project.floors ?? "—")}</span></div>
      <div><span class="k">${esc(i18n.t("projects.region"))}</span><span class="v">${esc((project as any).regionLabel ?? project.region ?? "—")}</span></div>
    </div>
    <div class="total">
      <span class="k">${esc(i18n.t("estimate.total"))}</span>
      <span class="v">${formatTnd(est.totalCost)}</span>
    </div>
    <table>
      <thead><tr><th>${esc(i18n.t("estimate.breakdown"))}</th><th style="text-align:right">${esc(i18n.t("estimate.totalPrice"))}</th><th style="text-align:right">%</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${scenarios}
    <div class="footer">
      ${esc(i18n.t("estimate.saved"))} · ${esc(i18n.t("app.name"))} · ${esc(i18n.t("common.currency"))}
    </div>
  </body>
  </html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch {
    return null;
  }
}

export async function shareEstimatePdf(project: Project): Promise<"shared" | "unavailable"> {
  const uri = await generateEstimatePdf(project);
  if (!uri) return "unavailable";
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: project.name,
      UTI: "com.adobe.pdf",
    });
    return "shared";
  }
  return "unavailable";
}