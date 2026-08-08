// ============================================================================
// « Générateur de plans architecturaux par Intelligence Artificielle »
// ----------------------------------------------------------------------------
// Composant autonome intégré à la page résultat de l'estimation d'un bien :
// - Moteur de plans 2D (floor plan) piloté par les caractéristiques du projet
// - Panneau de paramètres (type de bien, surface, étages, chambres, variante)
// - Export PNG / JPG / PDF
// - Avertissement légal affiché sous chaque plan (UI + documents exportés)
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Download,
  FileImage,
  FileText,
  RefreshCw,
  Loader2,
  Info,
  DraftingCompass,
  Ruler,
  Layers,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  generatePlan,
  isHousingType,
  PLAN_TYPES,
  type PlanLayout,
  type PlanParams,
  type PlanTypeId,
  type Room,
  type DoorSpec,
  type WinSpec,
} from "./plan-engine";

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Avertissement affiché sous chaque plan (texte exact demandé). */
const DISCLAIMER_LINES = [
  "Plan généré automatiquement par Intelligence Artificielle à titre indicatif.",
  "Ce plan ne constitue pas un document architectural ou administratif officiel.",
  "Il doit être vérifié, adapté et validé par un architecte ou un professionnel habilité avant toute réalisation ou utilisation administrative.",
];

const GEN_STEPS = [
  "Analyse des contraintes du projet…",
  "Zonage paramétrique des espaces…",
  "Placement des portes, fenêtres et cotes…",
];

/** Correspondance catégorie de projet → gabarit de plan. */
const CATEGORY_TO_PLAN: Record<string, PlanTypeId> = {
  maison: "maison",
  maison_r_1: "maison",
  "maison_r+1": "maison",
  villa: "villa",
  immeuble_residentiel: "immeuble",
  local_commercial: "commerce",
  cafe: "commerce",
  restaurant: "restaurant",
  hotel: "restaurant",
  bureau: "bureau",
  entrepot: "entrepot",
  depot: "entrepot",
  garage: "entrepot",
  parking: "entrepot",
  atelier: "atelier",
  usine: "atelier",
  ferme: "ferme",
  serre_agricole: "ferme",
  ecole: "ecole",
  mosquee: "mosquee",
  extension_batiment: "maison",
  renovation_interieure: "appartement",
  terrasse: "appartement",
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "plan";
const fmtM = (n: number) => `${n.toFixed(2).replace(".", ",")} m`;

// ─── Helpers de rendu SVG ───────────────────────────────────────────────────

type WallSeg = { axis: "h" | "v"; at: number; from: number; to: number; exterior: boolean };

function computeWalls(rooms: Room[], W: number, H: number): WallSeg[] {
  const eps = 0.02;
  const seen = new Map<string, WallSeg>();
  for (const r of rooms) {
    const edges: { edge: "top" | "bottom" | "left" | "right"; axis: "h" | "v"; at: number; from: number; to: number }[] = [
      { edge: "top", axis: "h", at: r.y, from: r.x, to: r.x + r.w },
      { edge: "bottom", axis: "h", at: r.y + r.h, from: r.x, to: r.x + r.w },
      { edge: "left", axis: "v", at: r.x, from: r.y, to: r.y + r.h },
      { edge: "right", axis: "v", at: r.x + r.w, from: r.y, to: r.y + r.h },
    ];
    for (const e of edges) {
      if (r.glassEdge?.includes(e.edge)) continue;
      if (e.to - e.from < 0.05) continue;
      const exterior = e.axis === "h" ? e.at <= eps || e.at >= H - eps : e.at <= eps || e.at >= W - eps;
      const key = `${e.axis}|${e.at.toFixed(3)}|${e.from.toFixed(3)}|${e.to.toFixed(3)}`;
      if (seen.has(key)) {
        seen.set(key, { ...seen.get(key)!, exterior: false });
      } else {
        seen.set(key, { axis: e.axis, at: e.at, from: e.from, to: e.to, exterior });
      }
    }
  }
  return [...seen.values()];
}

function clipSegments(from: number, to: number, breaks: { from: number; to: number }[]): [number, number][] {
  if (breaks.length === 0) return [[from, to]];
  const sorted = [...breaks].sort((a, b) => a.from - b.from);
  const out: [number, number][] = [];
  let cursor = from;
  for (const br of sorted) {
    const bf = Math.max(br.from, from);
    const bt = Math.min(br.to, to);
    if (bt <= from || bf >= to) continue;
    if (bf > cursor) out.push([cursor, bf]);
    cursor = Math.max(cursor, bt);
  }
  if (cursor < to) out.push([cursor, to]);
  return out;
}

const ROOM_FILLS = ["#ffffff", "#f8fafc", "#f1f5f9", "#fdf2f8", "#f0fdf4", "#f5f3ff"];
const fillFor = (r: Room, i: number) => {
  switch (r.kind) {
    case "corridor":
      return "#eef2f7";
    case "wet":
      return "#eff6ff";
    case "terrace":
    case "balcon":
      return "#fefce8";
    case "shopfloor":
      return "#f8fafc";
    case "quai":
      return "#e2e8f0";
    case "priere":
      return "#fdfaf3";
    default:
      return ROOM_FILLS[i % ROOM_FILLS.length];
  }
};

// ─── Rendu SVG du plan ───────────────────────────────────────────────────────

const PX = 46; // px par mètre
const PAD = 56;
const GUT = 52;
const HDR = 78;
const DISC = 64;

function PlanSvg({ layout }: { layout: PlanLayout }) {
  const { width: W, height: H, rooms, doors, windows } = layout;
  const ox = PAD;
  const oy = HDR + 26;
  const totalW = ox + W * PX + GUT + 22;
  const totalH = oy + H * PX + GUT + 22 + DISC;
  const X = (m: number) => ox + m * PX;
  const Y = (m: number) => oy + m * PX;

  const walls = useMemo(() => computeWalls(rooms, W, H), [rooms, W, H]);

  // Coupes des murs : portes + fenêtres
  const breaksMap = useMemo(() => {
    const map = new Map<string, { from: number; to: number }[]>();
    const push = (axis: "h" | "v", at: number, from: number, to: number) => {
      const k = `${axis}|${at.toFixed(3)}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push({ from, to });
    };
    for (const d of doors) {
      const c = (d.from + d.to) / 2;
      const pad = d.big ? 0.25 : 0.15;
      push(d.axis, d.at, c - d.len / 2 - pad, c + d.len / 2 + pad);
    }
    for (const w of windows) {
      const c = (w.from + w.to) / 2;
      push(w.axis, w.at, c - w.len / 2 - 0.12, c + w.len / 2 + 0.12);
    }
    return map;
  }, [doors, windows]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="block w-full h-auto"
      fontFamily="'Segoe UI', system-ui, -apple-system, sans-serif"
      role="img"
      aria-label={`Plan architectural ${layout.typeLabel} généré par IA`}
    >
      <defs>
        <pattern id="bb-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#93c5fd" strokeWidth="1" />
        </pattern>
      </defs>

      <rect x="0" y="0" width={totalW} height={totalH} fill="#ffffff" />

      {/* ═══ Header ═══ */}
      <rect x="0" y="0" width={totalW} height={HDR} fill="#0f172a" />
      <rect x="0" y={HDR - 3} width={totalW} height="3" fill="#3b82f6" />
      {/* Logo */}
      <rect x="18" y="16" width="14" height="14" rx="3" fill="#3b82f6" />
      <path d="M 21 18 l 4 4 M 29 18 l -4 4" stroke="#0f172a" strokeWidth="1.4" />
      <text x="40" y="26" fill="#ffffff" fontSize="16" fontWeight="700">
        BudgetBati
      </text>
      <text x="40" y="40" fill="#cbd5e1" fontSize="10">
        Générateur de plans architecturaux par Intelligence Artificielle
      </text>
      {/* Méta projet */}
      <text x={totalW - 18} y="22" fill="#ffffff" fontSize="13" fontWeight="700" textAnchor="end">
        {layout.projectName}
      </text>
      <text x={totalW - 18} y="38" fill="#cbd5e1" fontSize="10" textAnchor="end">
        {layout.typeLabel} · {layout.perFloor} m²/niveau · {layout.floors} étage{layout.floors > 1 ? "s" : ""}
        {layout.region ? ` · ${layout.region}` : ""}
      </text>
      <text x={totalW - 18} y="54" fill="#94a3b8" fontSize="9.5" textAnchor="end">
        Généré le {layout.generatedAt} · Échelle indicative 1 : 50
      </text>
      <rect x="18" y="50" width="86" height="16" rx="8" fill="#3b82f6" opacity="0.18" />
      <text x="61" y="61" fill="#60a5fa" fontSize="9" fontWeight="700" textAnchor="middle">
        PLAN GÉNÉRÉ PAR IA
      </text>

      {/* ═══ Zones (remplissages) ═══ */}
      {rooms.map((r, i) => (
        <g key={r.id}>
          <rect x={X(r.x)} y={Y(r.y)} width={r.w * PX} height={r.h * PX} fill={fillFor(r, i)} stroke="none" />
          {(r.kind === "wet" || r.kind === "quai") && (
            <rect x={X(r.x)} y={Y(r.y)} width={r.w * PX} height={r.h * PX} fill="url(#bb-hatch)" opacity="0.3" />
          )}
        </g>
      ))}

      {/* ═══ Vitrines (façade vitrée) ═══ */}
      {rooms
        .filter((r) => r.glassEdge?.length)
        .flatMap((r) =>
          (r.glassEdge ?? []).map((edge) => ({ r, edge })),
        )
        .map(({ r, edge }, idx) => {
          if (edge === "bottom") {
            const y = Y(r.y + r.h);
            const x1 = X(r.x);
            const x2 = X(r.x + r.w);
            const mullions: number[] = [];
            for (let m = Math.ceil(r.x / 1.2) * 1.2; m < r.x + r.w - 0.1; m += 1.2) mullions.push(X(m));
            return (
              <g key={`glass-${r.id}-${idx}`}>
                <line x1={x1} y1={y - 3.2} x2={x2} y2={y - 3.2} stroke="#38bdf8" strokeWidth="1.4" />
                <line x1={x1} y1={y} x2={x2} y2={y} stroke="#38bdf8" strokeWidth="1.8" />
                <line x1={x1} y1={y + 3.2} x2={x2} y2={y + 3.2} stroke="#38bdf8" strokeWidth="1.4" />
                {mullions.map((mx, k) => (
                  <line key={k} x1={mx} y1={y - 3.4} x2={mx} y2={y + 3.4} stroke="#38bdf8" strokeWidth="1" />
                ))}
              </g>
            );
          }
          return null;
        })}

      {/* ═══ Murs (avec découpes portes / fenêtres) ═══ */}
      {walls.map((seg, i) => {
        const breaks = breaksMap.get(`${seg.axis}|${seg.at.toFixed(3)}`) ?? [];
        const parts = clipSegments(seg.from, seg.to, breaks);
        return (
          <g key={`wall-${i}`}>
            {parts.map(([f, t], k) =>
              seg.axis === "h" ? (
                <line
                  key={k}
                  x1={X(f)}
                  y1={Y(seg.at)}
                  x2={X(t)}
                  y2={Y(seg.at)}
                  stroke={seg.exterior ? "#1e293b" : "#64748b"}
                  strokeWidth={seg.exterior ? 5 : 2.8}
                />
              ) : (
                <line
                  key={k}
                  x1={X(seg.at)}
                  y1={Y(f)}
                  x2={X(seg.at)}
                  y2={Y(t)}
                  stroke={seg.exterior ? "#1e293b" : "#64748b"}
                  strokeWidth={seg.exterior ? 5 : 2.8}
                />
              ),
            )}
          </g>
        );
      })}

      {/* ═══ Niche du mihrab (mosquée) ═══ */}
      {rooms
        .filter((r) => r.kind === "priere")
        .map((r) => {
          const cx = X(r.x + r.w / 2);
          const cy = Y(r.y);
          return (
            <g key="mihrab">
              <path
                d={`M ${cx - 12} ${cy} A 12 12 0 0 0 ${cx + 12} ${cy}`}
                fill="#fdfaf3"
                stroke="#1e293b"
                strokeWidth="2.2"
              />
            </g>
          );
        })}

      {/* ═══ Fenêtres ═══ */}
      {windows.map((w: WinSpec, i) => {
        const c = (w.from + w.to) / 2;
        if (w.axis === "h") {
          const x = X(c);
          const y = Y(w.at);
          const len = w.len * PX;
          return (
            <g key={`win-${i}`}>
              <rect x={x - len / 2} y={y - 3.2} width={len} height="6.4" fill="#ffffff" />
              <line x1={x - len / 2} y1={y - 2.2} x2={x + len / 2} y2={y - 2.2} stroke="#0ea5e9" strokeWidth="1.8" />
              <line x1={x - len / 2} y1={y + 2.2} x2={x + len / 2} y2={y + 2.2} stroke="#0ea5e9" strokeWidth="1.8" />
              <line x1={x - len / 2} y1={y - 3.6} x2={x - len / 2} y2={y + 3.6} stroke="#0ea5e9" strokeWidth="1.1" />
              <line x1={x + len / 2} y1={y - 3.6} x2={x + len / 2} y2={y + 3.6} stroke="#0ea5e9" strokeWidth="1.1" />
            </g>
          );
        }
        const x = X(w.at);
        const y = Y(c);
        const len = w.len * PX;
        return (
          <g key={`win-${i}`}>
            <rect x={x - 3.2} y={y - len / 2} width="6.4" height={len} fill="#ffffff" />
            <line x1={x - 2.2} y1={y - len / 2} x2={x - 2.2} y2={y + len / 2} stroke="#0ea5e9" strokeWidth="1.8" />
            <line x1={x + 2.2} y1={y - len / 2} x2={x + 2.2} y2={y + len / 2} stroke="#0ea5e9" strokeWidth="1.8" />
            <line x1={x - 3.6} y1={y - len / 2} x2={x + 3.6} y2={y - len / 2} stroke="#0ea5e9" strokeWidth="1.1" />
            <line x1={x - 3.6} y1={y + len / 2} x2={x + 3.6} y2={y + len / 2} stroke="#0ea5e9" strokeWidth="1.1" />
          </g>
        );
      })}

      {/* ═══ Portes ═══ */}
      {doors.map((d: DoorSpec, i) => {
        const c = (d.from + d.to) / 2;
        const cx = X(d.axis === "h" ? c : d.at);
        const cy = Y(d.axis === "h" ? d.at : c);
        const r = (d.len * PX) / 2;
        const gap = d.len * PX;
        const gapTh = d.big ? 13 : 9;
        const hinge = d.axis === "h" ? [cx, cy] : [cx, cy];
        const leaf =
          d.axis === "h"
            ? { x1: cx, y1: cy, x2: cx, y2: cy + d.swing * r }
            : { x1: cx, y1: cy, x2: cx + d.swing * r, y2: cy };
        const arc =
          d.axis === "h"
            ? d.swing === 1
              ? `M ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy + r}`
              : `M ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy - r}`
            : d.swing === 1
              ? `M ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
              : `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx - r} ${cy}`;
        return (
          <g key={`door-${i}`}>
            {d.axis === "h" ? (
              <rect x={cx - gap / 2 - 1} y={cy - gapTh / 2} width={gap + 2} height={gapTh} fill="#ffffff" />
            ) : (
              <rect x={cx - gapTh / 2} y={cy - gap / 2 - 1} width={gapTh} height={gap + 2} fill="#ffffff" />
            )}
            {d.big ? (
              <>
                <line x1={cx - gap / 2} y1={cy - 4} x2={cx - gap / 2} y2={cy + 4} stroke="#334155" strokeWidth="2" />
                <line x1={cx + gap / 2} y1={cy - 4} x2={cx + gap / 2} y2={cy + 4} stroke="#334155" strokeWidth="2" />
                <line x1={cx - gap / 2 + 6} y1={cy} x2={cx + gap / 2 - 6} y2={cy} stroke="#334155" strokeWidth="1.4" />
              </>
            ) : (
              <>
                <path d={arc} fill="none" stroke="#334155" strokeWidth="1.6" />
                <line
                  x1={hinge[0]}
                  y1={hinge[1]}
                  x2={leaf.x2}
                  y2={leaf.y2}
                  stroke="#334155"
                  strokeWidth="1.6"
                />
              </>
            )}
          </g>
        );
      })}

      {/* ═══ Libellés des pièces ═══ */}
      {rooms.map((r) => {
        const cx = X(r.x + r.w / 2);
        const cy = Y(r.y + r.h / 2);
        const wPx = r.w * PX;
        const hPx = r.h * PX;
        const area = r.w * r.h;
        if (r.kind === "corridor") {
          return (
            <text
              key={`lbl-${r.id}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(-90 ${cx} ${cy})`}
              fontSize="10"
              fill="#64748b"
              fontWeight="600"
            >
              {r.name}
            </text>
          );
        }
        if (wPx < 34 || hPx < 26) return null;
        return (
          <g key={`lbl-${r.id}`}>
            <text x={cx} y={hPx < 46 ? cy + 2 : cy - 1} textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="700">
              {r.name}
            </text>
            {hPx >= 46 && (
              <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9.5" fill="#64748b">
                {area.toFixed(1).replace(".", ",")} m²
              </text>
            )}
          </g>
        );
      })}

      {/* ═══ Cotes extérieures ═══ */}
      <g stroke="#64748b" strokeWidth="1">
        {/* Bas */}
        <line x1={X(0)} y1={Y(H)} x2={X(0)} y2={Y(H) + 18} />
        <line x1={X(W)} y1={Y(H)} x2={X(W)} y2={Y(H) + 18} />
        <line x1={X(0)} y1={Y(H) + 18} x2={X(W)} y2={Y(H) + 18} />
        <line x1={X(0)} y1={Y(H) + 14} x2={X(0) - 5} y2={Y(H) + 18} />
        <line x1={X(0) + 5} y1={Y(H) + 18} x2={X(0)} y2={Y(H) + 22} />
        <line x1={X(W)} y1={Y(H) + 14} x2={X(W) + 5} y2={Y(H) + 18} />
        <line x1={X(W) - 5} y1={Y(H) + 18} x2={X(W)} y2={Y(H) + 22} />
        <text x={X(W / 2)} y={Y(H) + 36} textAnchor="middle" fontSize="11" fill="#334155" fontWeight="600">
          {fmtM(W)}
        </text>
        {/* Droite */}
        <line x1={X(W)} y1={Y(0)} x2={X(W) + 18} y2={Y(0)} />
        <line x1={X(W)} y1={Y(H)} x2={X(W) + 18} y2={Y(H)} />
        <line x1={X(W) + 18} y1={Y(0)} x2={X(W) + 18} y2={Y(H)} />
        <line x1={X(W) + 14} y1={Y(0)} x2={X(W) + 18} y2={Y(0) - 5} />
        <line x1={X(W) + 18} y1={Y(0) + 5} x2={X(W) + 22} y2={Y(0)} />
        <line x1={X(W) + 14} y1={Y(H)} x2={X(W) + 18} y2={Y(H) + 5} />
        <line x1={X(W) + 18} y1={Y(H) - 5} x2={X(W) + 22} y2={Y(H)} />
        <text x={X(W) + 30} y={Y(H / 2)} textAnchor="middle" fontSize="11" fill="#334155" fontWeight="600" transform={`rotate(90 ${X(W) + 30} ${Y(H / 2)})`}>
          {fmtM(H)}
        </text>
      </g>

      {/* ═══ Rose des vents + échelle graphique ═══ */}
      <g>
        <circle cx={ox + 24} cy={oy + 28} r="13" fill="none" stroke="#94a3b8" strokeWidth="1" />
        <path d={`M ${ox + 24} ${oy + 16} L ${ox + 19} ${oy + 31} L ${ox + 24} ${oy + 27} L ${ox + 29} ${oy + 31} Z`} fill="#3b82f6" />
        <text x={ox + 24} y={oy + 47} textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">
          N
        </text>
      </g>
      <g>
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const bx = ox + 24 + k * (PX / 2);
          return (
            <g key={k}>
              <line x1={bx} y1={totalH - DISC - 34} x2={bx} y2={totalH - DISC - 26} stroke="#334155" strokeWidth="1" />
              <rect x={bx} y={totalH - DISC - 32} width={PX / 2} height="6" fill={k % 2 === 0 ? "#1e293b" : "#ffffff"} stroke="#334155" strokeWidth="0.6" />
            </g>
          );
        })}
        <text x={ox + 24} y={totalH - DISC - 20} fontSize="9" fill="#64748b">
          0
        </text>
        <text x={ox + 24 + 5 * (PX / 2)} y={totalH - DISC - 20} fontSize="9" fill="#64748b" textAnchor="middle">
          5 m
        </text>
      </g>

      {/* ═══ Avertissement légal (bandeau) ═══ */}
      <g>
        <rect x="0" y={totalH - DISC} width={totalW} height={DISC} fill="#fffbeb" />
        <rect x="0" y={totalH - DISC} width={totalW} height="2.5" fill="#f59e0b" />
        <text x="18" y={totalH - DISC + 20} fontSize="11.5" fontWeight="700" fill="#92400e">
          ⚠ Avertissement — Plan indicatif généré par Intelligence Artificielle
        </text>
        {DISCLAIMER_LINES.map((line, i) => (
          <text key={i} x="18" y={totalH - DISC + 38 + i * 15} fontSize="10.5" fill="#b45309">
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}

// ─── Helpers d'export ────────────────────────────────────────────────────────

function serializeSvg(el: SVGSVGElement): string {
  el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(el);
}

function renderCanvas(svgEl: SVGSVGElement): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const svgStr = serializeSvg(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const vw = svgEl.viewBox.baseVal.width || svgEl.width.baseVal.value;
      const vh = svgEl.viewBox.baseVal.height || svgEl.height.baseVal.value;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vw * 2);
      canvas.height = Math.round(vh * 2);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas non disponible"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Rendu SVG impossible"));
    };
    img.src = url;
  });
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function PlanGenerator({
  projectName,
  category,
  surface: surfaceProp,
  floors: floorsProp,
  region,
}: {
  projectName: string;
  category?: string;
  surface?: number;
  floors?: number;
  region?: string;
}) {
  const initType = (CATEGORY_TO_PLAN[category ?? ""] ?? "generique") as PlanTypeId;
  const initSurface = Math.max(30, surfaceProp ?? 80);
  const initFloors = Math.max(1, floorsProp ?? 1);

  const [type, setType] = useState<PlanTypeId>(initType);
  const [surface, setSurface] = useState(initSurface);
  const [floors, setFloors] = useState(initFloors);
  const [bedrooms, setBedrooms] = useState(() => clamp(Math.round(initSurface / initFloors / 22), 1, 5));
  const [seed, setSeed] = useState(1);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const layout = useMemo<PlanLayout>(
    () =>
      generatePlan({
        type,
        surface,
        floors,
        bedrooms,
        seed,
        projectName,
        region,
      }),
    [type, surface, floors, bedrooms, seed, projectName, region],
  );

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!generating) return;
    const t1 = setTimeout(() => setGenStep(1), 450);
    const t2 = setTimeout(() => setGenStep(2), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [generating]);

  const regenerate = () => {
    if (generating) return;
    setGenerating(true);
    setGenStep(0);
    window.setTimeout(() => setSeed((s) => s + 1), 1150);
    window.setTimeout(() => setGenerating(false), 1150);
  };

  const handleTypeChange = (t: PlanTypeId) => {
    setType(t);
    if (isHousingType(t)) {
      setBedrooms(clamp(Math.round(surface / Math.max(1, floors) / 22), 1, 5));
    }
  };

  const busy = !ready || generating;

  const doExport = async (fmt: "png" | "jpg" | "pdf") => {
    const el = svgRef.current;
    if (!el || busy) return;
    try {
      const canvas = await renderCanvas(el);
      const base = `plan_architectural_${slugify(projectName)}_${slugify(layout.typeLabel)}`;
      if (fmt === "pdf") {
        const img = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        let w = pw - 24;
        let h = (w * canvas.height) / canvas.width;
        if (h > ph - 24) {
          h = ph - 24;
          w = (h * canvas.width) / canvas.height;
        }
        pdf.setProperties({ title: `Plan architectural — ${projectName}` });
        pdf.addImage(img, "PNG", (pw - w) / 2, (ph - h) / 2, w, h);
        pdf.save(`${base}.pdf`);
      } else {
        const mime = fmt === "png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mime, 0.92);
        triggerDownload(dataUrl, `${base}.${fmt}`);
      }
      toast.success(`Plan exporté en ${fmt.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err?.message || "Échec de l'export du plan");
    }
  };

  return (
    <div className="space-y-4">
      {/* ═══ Bandeau descriptif ═══ */}
      <div className="flex items-start gap-2.5 rounded-lg border border-primary/15 bg-primary/[0.04] p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DraftingCompass className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold">Moteur de génération paramétrique (IA)</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Le plan d'étage est généré automatiquement à partir du type de bien, de la surface, des étages
            et des chambres. Régénérez une variante pour explorer d'autres dispositions.
          </p>
        </div>
      </div>

      {/* ═══ Contrôles ═══ */}
      <div className="flex flex-wrap items-end gap-2.5">
        <Field label="Type de bien">
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as PlanTypeId)}
            className="h-8 rounded-lg border border-border/40 bg-background px-2 text-xs outline-none focus:border-primary cursor-pointer"
          >
            {PLAN_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Surface totale (m²)">
          <input
            type="number"
            min={30}
            step={5}
            value={surface}
            onChange={(e) => setSurface(Math.max(30, Number(e.target.value) || 30))}
            className="h-8 w-28 rounded-lg border border-border/40 bg-background px-2 text-xs outline-none focus:border-primary"
          />
        </Field>
        <Field label="Étages">
          <input
            type="number"
            min={1}
            max={10}
            step={1}
            value={floors}
            onChange={(e) => setFloors(Math.max(1, Math.round(Number(e.target.value) || 1)))}
            className="h-8 w-20 rounded-lg border border-border/40 bg-background px-2 text-xs outline-none focus:border-primary"
          />
        </Field>
        {isHousingType(type) && (
          <Field label="Chambres">
            <input
              type="number"
              min={1}
              max={6}
              step={1}
              value={bedrooms}
              onChange={(e) => setBedrooms(clamp(Math.round(Number(e.target.value) || 1), 1, 6))}
              className="h-8 w-20 rounded-lg border border-border/40 bg-background px-2 text-xs outline-none focus:border-primary"
            />
          </Field>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={regenerate}
          disabled={busy}
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Régénérer une variante
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Layers className="h-3 w-3" />
            {layout.perFloor} m²/niveau · {layout.rooms.length} espaces
          </span>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => doExport("png")} disabled={busy}>
            <Download className="h-3.5 w-3.5" />
            PNG
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => doExport("jpg")} disabled={busy}>
            <FileImage className="h-3.5 w-3.5" />
            JPG
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => doExport("pdf")} disabled={busy}>
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* ═══ Aperçu du plan ═══ */}
      <div className="relative overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <svg ref={svgRef} className="block w-full h-auto min-w-[640px]">
            <PlanSvg layout={layout} />
          </svg>
        </div>
        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <DraftingCompass className="h-5 w-5 animate-pulse" />
            </div>
            <p className="text-xs font-medium text-foreground/80">{GEN_STEPS[genStep]}</p>
            <div className="flex gap-1.5">
              {GEN_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn("h-1.5 w-6 rounded-full transition-colors", i <= genStep ? "bg-primary" : "bg-muted")}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Légende + avertissement sous le plan ═══ */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Ruler className="h-3 w-3" /> Échelle indicative 1 : 50 — cotes réelles en mètres
        </span>
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" /> {layout.typeLabel} — surface utile ≈ {layout.perFloor} m²/niveau
        </span>
      </div>
      <div className="rounded-lg border border-amber-300/50 bg-amber-50 p-3">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
          <Info className="h-3.5 w-3.5" />
          Avertissement — Plan indicatif généré par Intelligence Artificielle
        </p>
        <p className="text-[11px] leading-relaxed text-amber-800/90">{DISCLAIMER_LINES.join(" ")}</p>
      </div>
    </div>
  );
}

// ─── Sous-composants UI ──────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-[104px] flex-col gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
