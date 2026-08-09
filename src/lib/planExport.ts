import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { GeneratedPlan } from "@/convex/planEngine";
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
