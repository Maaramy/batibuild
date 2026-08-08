// ============================================================================
// « Générateur de plans architecturaux par Intelligence Artificielle »
// ----------------------------------------------------------------------------
// Composant autonome intégré à la page résultat de l'estimation d'un bien :
// - Moteur de plans 2D (floor plan) piloté par les caractéristiques du projet
// - Détection automatique du type de bien à partir de la surface du terrain
// - Variantes plafonnées à 10 par type de bien (le plan change à chaque clic)
// - Panneau de paramètres (type, surface, étages, chambres, variante)
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
  Box,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  generatePlan,
  detectPlanTypeFromSurface,
  isHousingType,
  PLAN_TYPES,
  type PlanLayout,
  type PlanParams,
  type PlanTypeId,
  type Room,
  type DoorSpec,
  type WinSpec,
} from "./plan-engine";
import { Plan3dSvg } from "./plan-3d";

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
    case "stairs":
      return "#f5f3ff";
    default:
      return ROOM_FILLS[i % ROOM_FILLS.length];
  }
};

// ─── Rendu SVG du plan ───────────────────────────────────────────────────────

const PX = 46; // px par mètre
const PAD = 56;
const GUT = 52;
const HDR = 78;
const LEG = 96;
const DISC = 64;

function PlanSvg({ layout }: { layout: PlanLayout }) {
  const { width: W, height: H, rooms, doors, windows } = layout;
  const ox = PAD;
  const oy = HDR + 26;
  const totalW = ox + W * PX + GUT + 22;
  const planBottom = oy + H * PX;
  const legendY = planBottom + GUT + 10;
  const totalH = legendY + LEG + DISC;
  const restaurant = rooms.some((r) => r.id === "cuisine");
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

      {/* ═══ Escaliers (girons + flèche de montée) ═══ */}
      {rooms
        .filter((r) => r.kind === "stairs")
        .map((r) => {
          const x0 = X(r.x);
          const y0 = Y(r.y);
          const wpx = r.w * PX;
          const hpx = r.h * PX;
          const steps = Math.max(3, Math.floor(hpx / 15));
          const treads = [];
          for (let k = 1; k < steps; k++) {
            const ty = y0 + (k * hpx) / steps;
            treads.push(<line key={k} x1={x0 + 3} y1={ty} x2={x0 + wpx - 3} y2={ty} stroke="#c4b5fd" strokeWidth="1.2" />);
          }
          const ax = x0 + wpx / 2;
          return (
            <g key={r.id}>
              {treads}
              <line x1={ax} y1={y0 + hpx - 9} x2={ax} y2={y0 + 9} stroke="#8b5cf6" strokeWidth="1.5" />
              <path d={`M ${ax - 4} ${y0 + 12} L ${ax} ${y0 + 6} L ${ax + 4} ${y0 + 12}`} fill="none" stroke="#8b5cf6" strokeWidth="1.4" />
            </g>
          );
        })}

      {/* ═══ Mobilier symbolique par pièce ═══ */}
      {rooms.map((r) => (
        <RoomFurniture key={`fur-${r.id}`} r={r} X={X} Y={Y} restaurant={restaurant} />
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
        if (r.kind === "stairs") return null;
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

      {/* ═══ Rose des vents ═══ */}
      <g>
        <circle cx={ox + 24} cy={oy + 28} r="13" fill="none" stroke="#94a3b8" strokeWidth="1" />
        <path d={`M ${ox + 24} ${oy + 16} L ${ox + 19} ${oy + 31} L ${ox + 24} ${oy + 27} L ${ox + 29} ${oy + 31} Z`} fill="#3b82f6" />
        <text x={ox + 24} y={oy + 47} textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">
          N
        </text>
      </g>

      {/* ═══ Échelle graphique (coin bas-droit du plan) ═══ */}
      <g>
        <rect x={totalW - 178} y={planBottom - 46} width="150" height="40" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const bx = totalW - 166 + k * (PX / 2);
          return (
            <g key={k}>
              <line x1={bx} y1={planBottom - 26} x2={bx} y2={planBottom - 18} stroke="#334155" strokeWidth="1" />
              <rect x={bx} y={planBottom - 24} width={PX / 2} height="6" fill={k % 2 === 0 ? "#1e293b" : "#ffffff"} stroke="#334155" strokeWidth="0.6" />
            </g>
          );
        })}
        <text x={totalW - 166} y={planBottom - 12} fontSize="8.5" fill="#64748b">
          0
        </text>
        <text x={totalW - 166 + 5 * (PX / 2)} y={planBottom - 12} fontSize="8.5" fill="#64748b" textAnchor="middle">
          5 m
        </text>
        <text x={totalW - 166} y={planBottom - 34} fontSize="8.5" fontWeight="600" fill="#475569">
          Échelle indicative
        </text>
      </g>

      {/* ═══ Légende ═══ */}
      <g>
        <rect x="0" y={legendY} width={totalW} height={LEG} fill="#f8fafc" />
        <rect x="0" y={legendY} width={totalW} height="1.5" fill="#e2e8f0" />
        <text x="18" y={legendY + 22} fontSize="11" fontWeight="700" fill="#334155">
          Légende
        </text>
        {LEGEND_ITEMS.map((item, i) => {
          const slot = (totalW - 36) / 4;
          const sx = 18 + (i % 4) * slot;
          const sy = legendY + (Math.floor(i / 4) === 0 ? 52 : 84);
          const swatchX = sx + (slot - 24) / 2;
          return (
            <g key={item.label}>
              <g transform={`translate(${swatchX} ${sy})`}>{item.draw}</g>
              <text x={sx + slot / 2} y={sy + 4} textAnchor="middle" fontSize="9.5" fill="#475569">
                {item.label}
              </text>
            </g>
          );
        })}
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

// ─── Légende + mobilier (rendu 2D) ───────────────────────────────────────────

const LEGEND_ITEMS: { label: string; draw: ReactNode }[] = [
  { label: "Mur extérieur", draw: <line x1="0" y1="8" x2="24" y2="8" stroke="#1e293b" strokeWidth="4" /> },
  { label: "Mur intérieur", draw: <line x1="0" y1="8" x2="24" y2="8" stroke="#64748b" strokeWidth="2" /> },
  {
    label: "Porte",
    draw: (
      <>
        <path d="M 4 12 A 8 8 0 0 1 12 4" fill="none" stroke="#334155" strokeWidth="1.4" />
        <line x1="4" y1="12" x2="12" y2="12" stroke="#334155" strokeWidth="1.4" />
      </>
    ),
  },
  {
    label: "Fenêtre",
    draw: (
      <>
        <line x1="0" y1="6" x2="24" y2="6" stroke="#0ea5e9" strokeWidth="1.6" />
        <line x1="0" y1="10" x2="24" y2="10" stroke="#0ea5e9" strokeWidth="1.6" />
      </>
    ),
  },
  {
    label: "Vitrine",
    draw: (
      <>
        <line x1="0" y1="4" x2="24" y2="4" stroke="#38bdf8" strokeWidth="1.4" />
        <line x1="0" y1="8" x2="24" y2="8" stroke="#38bdf8" strokeWidth="1.8" />
        <line x1="0" y1="12" x2="24" y2="12" stroke="#38bdf8" strokeWidth="1.4" />
        <line x1="12" y1="3" x2="12" y2="13" stroke="#38bdf8" strokeWidth="1" />
      </>
    ),
  },
  {
    label: "Escalier",
    draw: (
      <>
        <line x1="0" y1="2" x2="24" y2="6" stroke="#a78bfa" strokeWidth="1.2" />
        <line x1="0" y1="6" x2="24" y2="10" stroke="#a78bfa" strokeWidth="1.2" />
        <line x1="0" y1="10" x2="24" y2="14" stroke="#a78bfa" strokeWidth="1.2" />
      </>
    ),
  },
  {
    label: "Mobilier",
    draw: (
      <>
        <rect x="1" y="4" width="22" height="10" rx="2" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
        <rect x="2" y="4" width="6" height="4" rx="1" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
      </>
    ),
  },
  {
    label: "Salle humide",
    draw: (
      <>
        <rect x="1" y="1" width="22" height="14" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1" />
        <line x1="3" y1="15" x2="8" y2="1" stroke="#93c5fd" strokeWidth="0.8" />
        <line x1="11" y1="15" x2="16" y2="1" stroke="#93c5fd" strokeWidth="0.8" />
        <line x1="19" y1="15" x2="24" y2="1" stroke="#93c5fd" strokeWidth="0.8" />
      </>
    ),
  },
];

const FURN = "#94a3b8";

/** Mobilier symbolique dessiné dans chaque pièce (lits, canapés, tables…). */
function RoomFurniture({
  r,
  X,
  Y,
  restaurant,
}: {
  r: Room;
  X: (m: number) => number;
  Y: (m: number) => number;
  restaurant: boolean;
}) {
  const w = r.w;
  const h = r.h;
  const id = r.id;
  if (Math.min(w * PX, h * PX) < 36) return null;

  // ══ Chambres : lit + armoire ══
  if (/^ch\d+$/.test(id)) {
    const bedW = Math.min(w - 1.2, h - 1.2);
    const bedH = 1.7;
    const bx = X(r.x + (w - bedW) / 2);
    const by = Y(r.y + (h - bedH) / 2);
    const bw = bedW * PX;
    const bh = bedH * PX;
    return (
      <g>
        <rect x={bx} y={by} width={bw} height={bh} rx="3" fill="#ffffff" stroke={FURN} strokeWidth="1.3" />
        <rect x={bx + 3} y={by + 3} width={Math.min(16, bw * 0.3)} height={bh - 6} rx="2" fill="#eef2f7" stroke={FURN} strokeWidth="0.9" />
        <line x1={bx + bw - 7} y1={by + 3} x2={bx + bw - 7} y2={by + bh - 3} stroke={FURN} strokeWidth="1" />
        {w >= 2.6 && (
          <rect x={X(r.x + w - 0.75)} y={Y(r.y + 0.45)} width="8" height={h * PX - 18} fill="#f8fafc" stroke={FURN} strokeWidth="1" />
        )}
      </g>
    );
  }

  // ══ Séjour / salon ══
  if (id === "salon") {
    const s = 0.55;
    const cw = Math.min(2.0, w - 1.0);
    const ch = Math.min(1.5, h - 1.0);
    return (
      <g>
        <rect x={X(r.x + 0.4)} y={Y(r.y + h - 0.95)} width={cw * PX} height={s * PX} rx="3" fill="#ffffff" stroke={FURN} strokeWidth="1.3" />
        <rect x={X(r.x + 0.4)} y={Y(r.y + h - 0.95 - ch)} width={s * PX} height={ch * PX} rx="3" fill="#ffffff" stroke={FURN} strokeWidth="1.3" />
        <rect x={X(r.x + w / 2 - 0.45)} y={Y(r.y + h / 2 + 0.15)} width="18" height="12" rx="2" fill="#ffffff" stroke={FURN} strokeWidth="1.1" />
        <rect x={X(r.x + w - 0.9)} y={Y(r.y + 0.6)} width="9" height={Math.min(1.2, h * 0.4) * PX} fill="#f8fafc" stroke={FURN} strokeWidth="1" />
      </g>
    );
  }

  // ══ Cuisine ══
  if (id === "cuisine") {
    const cw = Math.min(w - 0.8, 2.8);
    return (
      <g>
        <rect x={X(r.x + 0.4)} y={Y(r.y + 0.4)} width={cw * PX} height="26" fill="#ffffff" stroke={FURN} strokeWidth="1.3" />
        {cw >= 1.7 && (
          <>
            <rect x={X(r.x + 0.7)} y={Y(r.y + 0.7)} width="14" height="12" rx="2" fill="#e0f2fe" stroke={FURN} strokeWidth="0.9" />
            <circle cx={X(r.x + cw - 1.2)} cy={Y(r.y + 1.3)} r="4.5" fill="#ffffff" stroke={FURN} strokeWidth="0.9" />
            <circle cx={X(r.x + cw - 0.55)} cy={Y(r.y + 1.3)} r="4.5" fill="#ffffff" stroke={FURN} strokeWidth="0.9" />
          </>
        )}
      </g>
    );
  }

  // ══ Salle de bain : baignoire + lavabo + WC ══
  if (id === "sdb") {
    const bathW = Math.min(w - 0.8, 1.6);
    return (
      <g>
        <rect x={X(r.x + 0.4)} y={Y(r.y + 0.4)} width={bathW * PX} height="24" rx="4" fill="#e0f2fe" stroke={FURN} strokeWidth="1.2" />
        <line x1={X(r.x + 0.4)} y1={Y(r.y + 1.15)} x2={X(r.x + 0.4 + bathW)} y2={Y(r.y + 1.15)} stroke={FURN} strokeWidth="0.8" />
        <circle cx={X(r.x + w - 0.9)} cy={Y(r.y + 0.9)} r="6" fill="#ffffff" stroke={FURN} strokeWidth="1" />
        {h >= 1.7 && (
          <g>
            <rect x={X(r.x + w - 1.05)} y={Y(r.y + h - 1.15)} width="8" height="6" fill="#f8fafc" stroke={FURN} strokeWidth="0.9" />
            <ellipse cx={X(r.x + w - 0.95)} cy={Y(r.y + h - 0.55)} rx="5.5" ry="6.5" fill="#ffffff" stroke={FURN} strokeWidth="1" />
          </g>
        )}
      </g>
    );
  }

  // ══ WC / sanitaires ══
  if (id === "wc" || id === "sanitaire" || id === "sanitaires") {
    return (
      <g>
        <rect x={X(r.x + w - 1.0)} y={Y(r.y + h - 1.1)} width="8" height="6" fill="#f8fafc" stroke={FURN} strokeWidth="0.9" />
        <ellipse cx={X(r.x + w - 0.9)} cy={Y(r.y + h - 0.5)} rx="5.5" ry="6.5" fill="#ffffff" stroke={FURN} strokeWidth="1" />
        <circle cx={X(r.x + 0.6)} cy={Y(r.y + 0.7)} r="6" fill="#ffffff" stroke={FURN} strokeWidth="1" />
      </g>
    );
  }

  // ══ Buanderie ══
  if (id === "buanderie") {
    return (
      <g>
        <rect x={X(r.x + 0.45)} y={Y(r.y + h - 1.15)} width="21" height="21" rx="3" fill="#ffffff" stroke={FURN} strokeWidth="1.3" />
        <circle cx={X(r.x + 0.45) + 8} cy={Y(r.y + h - 1.15) + 8} r="3.5" fill="#e0f2fe" stroke={FURN} strokeWidth="0.8" />
      </g>
    );
  }

  // ══ Dressing / armoire ══
  if (id === "dressing") {
    const dw = Math.min(w - 0.7, 2.0);
    const dh = Math.min(h - 0.7, 2.0);
    return (
      <g>
        <rect x={X(r.x + 0.35)} y={Y(r.y + 0.35)} width={dw * PX} height={dh * PX} fill="#ffffff" stroke={FURN} strokeWidth="1.2" />
        <line x1={X(r.x + 0.35)} y1={Y(r.y + 0.35 + dh / 2)} x2={X(r.x + 0.35 + dw)} y2={Y(r.y + 0.35 + dh / 2)} stroke={FURN} strokeWidth="0.9" />
      </g>
    );
  }

  // ══ Bureaux ══
  if (id === "bureau1" || id === "bureau2") {
    return (
      <g>
        <rect x={X(r.x + 0.5)} y={Y(r.y + h - 1.3)} width={Math.min(w - 1.0, 1.6) * PX} height="12" fill="#ffffff" stroke={FURN} strokeWidth="1.2" />
        <circle cx={X(r.x + 0.7)} cy={Y(r.y + h - 0.6)} r="4.5" fill="#ffffff" stroke={FURN} strokeWidth="0.9" />
      </g>
    );
  }

  // ══ Salle de réunion ══
  if (id === "reunion") {
    const tw = Math.min(w - 0.8, 2.4);
    const th = Math.min(h - 0.8, 1.2);
    const tx = X(r.x + (w - tw) / 2);
    const ty = Y(r.y + (h - th) / 2);
    const chairs = [-1, 1].flatMap((sx) =>
      [-1, 1].map((sy) => (
        <circle
          key={`${sx}${sy}`}
          cx={tx + (tw * PX) / 2 + sx * ((tw * PX) / 2 + 5)}
          cy={ty + (th * PX) / 2 + sy * ((th * PX) / 2 + 5)}
          r="4"
          fill="#ffffff"
          stroke={FURN}
          strokeWidth="0.9"
        />
      )),
    );
    return (
      <g>
        <rect x={tx} y={ty} width={tw * PX} height={th * PX} rx="6" fill="#ffffff" stroke={FURN} strokeWidth="1.3" />
        {chairs}
      </g>
    );
  }

  // ══ Open space ══
  if (id === "openspace") {
    const cols = 2;
    const rows = 2;
    const desks = [];
    for (let rr = 0; rr < rows; rr++) {
      for (let cc = 0; cc < cols; cc++) {
        const dw = (w - 1.4) / cols;
        const dh = (h - 1.4) / rows;
        desks.push(
          <rect
            key={`${rr}${cc}`}
            x={X(r.x + 0.7 + cc * dw)}
            y={Y(r.y + 0.7 + rr * dh)}
            width={dw * PX * 0.55}
            height="12"
            fill="#ffffff"
            stroke={FURN}
            strokeWidth="1"
          />,
        );
      }
    }
    return <g>{desks}</g>;
  }

  // ══ Accueil / comptoir ══
  if (id === "accueil") {
    return (
      <g>
        <rect x={X(r.x + 0.4)} y={Y(r.y + h - 0.75)} width={Math.min(w - 0.8, 2.4) * PX} height="14" fill="#ffffff" stroke={FURN} strokeWidth="1.2" />
      </g>
    );
  }

  // ══ Salle de restaurant : tables ══
  if (r.kind === "shopfloor" && restaurant) {
    const perCol = Math.max(1, Math.min(3, Math.floor(h / 2.6)));
    const perRow = Math.max(1, Math.min(3, Math.floor(w / 2.6)));
    const startX = r.x + (w - perRow * 2.6) / 2 + 1.3;
    const startY = r.y + (h - perCol * 2.6) / 2 + 1.3;
    const tables = [];
    for (let rr = 0; rr < perCol; rr++) {
      for (let cc = 0; cc < perRow; cc++) {
        const cx = X(startX + cc * 2.6);
        const cy = Y(startY + rr * 2.6);
        tables.push(
          <g key={`${rr}${cc}`}>
            <circle cx={cx} cy={cy} r="7.5" fill="#ffffff" stroke={FURN} strokeWidth="1.2" />
            {[
              [0, -12],
              [0, 12],
              [-12, 0],
              [12, 0],
            ].map(([dx, dy], k) => (
              <circle key={k} cx={cx + dx} cy={cy + dy} r="3.5" fill="#ffffff" stroke={FURN} strokeWidth="0.8" />
            ))}
          </g>,
        );
      }
    }
    return <g>{tables}</g>;
  }

  // ══ Local commercial : rayonnages ══
  if (r.kind === "shopfloor") {
    const rows = Math.max(1, Math.min(3, Math.floor(h / 2.8)));
    const racks = [];
    for (let rr = 0; rr < rows; rr++) {
      const y = Y(r.y + (h * (rr + 1)) / (rows + 1));
      racks.push(
        <g key={rr}>
          <line x1={X(r.x + 0.5)} y1={y} x2={X(r.x + w - 0.5)} y2={y} stroke={FURN} strokeWidth="2.5" />
          <line x1={X(r.x + 0.5)} y1={y + 3} x2={X(r.x + w - 0.5)} y2={y + 3} stroke={FURN} strokeWidth="0.8" />
        </g>,
      );
    }
    return <g>{racks}</g>;
  }

  // ══ Réserves / stockage : rayonnages ══
  if (id === "reserve" || id === "stockage" || id === "rangement" || id === "vestiaire" || id === "vestiaires") {
    const cols = Math.max(1, Math.min(3, Math.floor(w / 1.7)));
    const racks = [];
    const rw = Math.min(0.55, (w - 0.8) / cols / 2) * PX;
    for (let k = 0; k < cols; k++) {
      const rx = X(r.x + 0.4 + k * ((w - 0.8) / cols));
      const rh = h * PX - 30;
      racks.push(
        <g key={k}>
          <rect x={rx} y={Y(r.y + 0.4)} width={rw} height={rh} fill="#ffffff" stroke={FURN} strokeWidth="1.1" />
          <line x1={rx} y1={Y(r.y + 0.4) + rh / 2} x2={rx + rw} y2={Y(r.y + 0.4) + rh / 2} stroke={FURN} strokeWidth="0.8" />
        </g>,
      );
    }
    return <g>{racks}</g>;
  }

  // ══ Hangar / étable ══
  if (id === "hangar") {
    const stalls = Math.max(2, Math.min(5, Math.floor(w / 2.4)));
    const lines = [];
    for (let k = 1; k < stalls; k++) {
      lines.push(
        <line
          key={k}
          x1={X(r.x + (k * w) / stalls)}
          y1={Y(r.y + 0.5)}
          x2={X(r.x + (k * w) / stalls)}
          y2={Y(r.y + h - 0.5)}
          stroke={FURN}
          strokeWidth="0.9"
          strokeDasharray="3 3"
        />,
      );
    }
    return <g>{lines}</g>;
  }

  // ══ Salles de classe ══
  if (/^classe\d+$/.test(id)) {
    const perRow = Math.max(2, Math.min(4, Math.floor(w / 1.4)));
    const perCol = Math.max(1, Math.min(3, Math.floor(h / 1.8)));
    const startX = r.x + (w - perRow * 1.3) / 2 + 0.4;
    const startY = r.y + 1.2;
    const desks = [
      <rect key="teacher" x={X(r.x + w / 2 - 0.35)} y={Y(r.y + 0.45)} width="14" height="9" fill="#ffffff" stroke={FURN} strokeWidth="1" />,
    ];
    for (let rr = 0; rr < perCol; rr++) {
      for (let cc = 0; cc < perRow; cc++) {
        desks.push(
          <rect
            key={`${rr}${cc}`}
            x={X(startX + cc * 1.3)}
            y={Y(startY + rr * 1.7)}
            width="10"
            height="8"
            fill="#ffffff"
            stroke={FURN}
            strokeWidth="0.9"
          />,
        );
      }
    }
    return <g>{desks}</g>;
  }

  // ══ Salle de prière : rangées ══
  if (r.kind === "priere") {
    const rows = Math.max(2, Math.min(6, Math.floor(h / 1.6)));
    const lines = [];
    for (let k = 1; k < rows; k++) {
      lines.push(
        <line
          key={k}
          x1={X(r.x + 0.6)}
          y1={Y(r.y + (h * k) / rows)}
          x2={X(r.x + w - 0.6)}
          y2={Y(r.y + (h * k) / rows)}
          stroke={FURN}
          strokeWidth="0.8"
          strokeDasharray="4 3"
        />,
      );
    }
    return <g>{lines}</g>;
  }

  // ══ Bibliothèque ══
  if (id === "biblio") {
    const cols = Math.max(1, Math.min(3, Math.floor(w / 1.4)));
    const racks = [];
    for (let k = 0; k < cols; k++) {
      const rx = X(r.x + 0.4 + k * ((w - 0.8) / cols));
      racks.push(
        <rect key={k} x={rx} y={Y(r.y + 0.4)} width="10" height={Math.min(1.1, h - 0.8) * PX} fill="#ffffff" stroke={FURN} strokeWidth="1" />,
      );
    }
    return <g>{racks}</g>;
  }

  // ══ Entrée : console ══
  if (id === "entree") {
    return (
      <g>
        <rect x={X(r.x + 0.5)} y={Y(r.y + h - 0.6)} width={Math.min(w - 1.0, 1.2) * PX} height="10" fill="#ffffff" stroke={FURN} strokeWidth="1.1" />
      </g>
    );
  }

  return null;
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
  const initSurface = Math.max(30, surfaceProp ?? 80);
  const initFloors = Math.max(1, floorsProp ?? 1);
  const mappedType = CATEGORY_TO_PLAN[category ?? ""];
  const initType = (mappedType ?? detectPlanTypeFromSurface(initSurface)) as PlanTypeId;

  const [type, setType] = useState<PlanTypeId>(initType);
  const [surface, setSurface] = useState(initSurface);
  const [floors, setFloors] = useState(initFloors);
  const [bedrooms, setBedrooms] = useState(() => clamp(Math.round(initSurface / initFloors / 22), 1, 5));
  const [variant, setVariant] = useState(1);
  const [generated, setGenerated] = useState<Record<string, number>>({});
  const [autoType, setAutoType] = useState(!mappedType);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  /** Nombre maximal de variantes explorables par type de bien. */
  const MAX_VARIANTS = 10;

  // Vue 2D / 3D + rotation de la vue 3D
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [yaw, setYaw] = useState(38);
  const [autoRotate, setAutoRotate] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; yaw: number } | null>(null);

  const layout = useMemo<PlanLayout>(
    () =>
      generatePlan({
        type,
        surface,
        floors,
        bedrooms,
        seed: variant,
        projectName,
        region,
      }),
    [type, surface, floors, bedrooms, variant, projectName, region],
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
    window.setTimeout(() => {
      setVariant((v) => {
        const next = (v % MAX_VARIANTS) + 1;
        if (next === 1) {
          toast.info(`Les ${MAX_VARIANTS} variantes de ce type ont été explorées — retour à la variante 1`);
        }
        return next;
      });
      setGenerated((g) => ({ ...g, [type]: Math.min(MAX_VARIANTS, (g[type] ?? 0) + 1) }));
      setGenerating(false);
    }, 1150);
  };

  const maxed = (generated[type] ?? 0) >= MAX_VARIANTS;

  /** Détection automatique du type de bien à partir de la surface (m²). */
  const detectType = (surfaceM2: number) => {
    const t = detectPlanTypeFromSurface(surfaceM2);
    setType(t);
    setVariant(1);
    if (isHousingType(t)) {
      setBedrooms(clamp(Math.round(surfaceM2 / Math.max(1, floors) / 22), 1, 5));
    }
  };

  const handleTypeChange = (t: PlanTypeId) => {
    setType(t);
    setAutoType(false);
    setVariant(1);
    if (isHousingType(t)) {
      setBedrooms(clamp(Math.round(surface / Math.max(1, floors) / 22), 1, 5));
    }
  };

  const busy = !ready || generating;

  // Rotation automatique lente de la vue 3D (mode « Auto »)
  useEffect(() => {
    if (!autoRotate || view !== "3d" || busy) return;
    const id = window.setInterval(() => setYaw((y) => (y + 0.4) % 360), 40);
    return () => window.clearInterval(id);
  }, [autoRotate, view, busy]);

  const resetView3d = () => {
    setYaw(38);
    setAutoRotate(false);
  };

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
            Le type de bien est détecté automatiquement à partir de la surface du terrain (mode « Auto »). Le
            plan 2D et sa vue 3D sont générés depuis le type, la surface, les étages et les chambres — régénérez
            pour explorer jusqu'à {MAX_VARIANTS} variantes par type de bien.
          </p>
        </div>
      </div>

      {/* ═══ Contrôles ═══ */}
      <div className="flex flex-wrap items-end gap-2.5">
        <Field label="Type de bien">
          <div className="flex items-center gap-1.5">
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
            <button
              type="button"
              onClick={() => {
                setAutoType(true);
                detectType(surface);
              }}
              className={cn(
                "flex h-8 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition-all cursor-pointer",
                autoType
                  ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                  : "border-border/40 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              title="Détecter automatiquement le type de bien à partir de la surface du terrain"
            >
              <Sparkles className="h-3 w-3" />
              Auto
            </button>
          </div>
          {autoType && (
            <span className="text-[9px] text-primary/80">Type détecté automatiquement via la surface</span>
          )}
        </Field>
        <Field label="Surface totale (m²)">
          <input
            type="number"
            min={30}
            step={5}
            value={surface}
            onChange={(e) => {
              const v = Math.max(30, Number(e.target.value) || 30);
              setSurface(v);
              if (autoType) detectType(v);
            }}
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
          title={
            maxed
              ? `Les ${MAX_VARIANTS} variantes de ce type ont été explorées — le bouton revient à la variante 1`
              : `Générer la variante suivante (actuellement ${variant}/${MAX_VARIANTS})`
          }
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Régénérer
        </Button>
        <span
          className={cn(
            "inline-flex h-8 items-center rounded-lg border px-2.5 text-[10px] font-semibold",
            maxed
              ? "border-amber-300/60 bg-amber-50 text-amber-700"
              : "border-border/40 bg-background text-muted-foreground",
          )}
          title={
            maxed
              ? "10 variantes générées pour ce type — le bouton « Régénérer » revient à la variante 1"
              : "Variante affichée / nombre maximal de variantes pour ce type de bien"
          }
        >
          Variante {variant}/{MAX_VARIANTS}
        </span>
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

      {/* ═══ Sélecteur de vue 2D / 3D ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center rounded-lg border border-border/40 bg-muted/20 p-0.5">
          {(["2d", "3d"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all cursor-pointer",
                view === v
                  ? "border border-border/40 bg-background text-foreground shadow-sm"
                  : "border border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "2d" ? <FileText className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
              {v === "2d" ? "Plan 2D" : "Vue 3D"}
            </button>
          ))}
        </div>
        {view === "3d" && (
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <MousePointer2 className="h-3 w-3" />
              Glisser pour pivoter
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[11px]"
              onClick={resetView3d}
              title="Réinitialiser l'angle de vue"
            >
              <RotateCcw className="h-3 w-3" />
              Angle
            </Button>
            <Button
              size="sm"
              variant={autoRotate ? "default" : "outline"}
              className="h-7 gap-1.5 text-[11px]"
              onClick={() => setAutoRotate((v) => !v)}
              title={autoRotate ? "Arrêter la rotation automatique" : "Rotation automatique"}
            >
              {autoRotate ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {autoRotate ? "Arrêter" : "Auto"}
            </Button>
          </div>
        )}
      </div>

      {/* ═══ Aperçu (plan 2D ou vue 3D) ═══ */}
      <div className="relative overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {view === "2d" ? (
            <svg ref={svgRef} className="block w-full h-auto min-w-[640px]">
              <PlanSvg layout={layout} />
            </svg>
          ) : (
            <svg
              ref={svgRef}
              className="block w-full h-auto min-w-[560px]"
              style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
              onPointerDown={(e) => {
                if (busy) return;
                setDragging(true);
                dragStartRef.current = { x: e.clientX, yaw };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!dragging || !dragStartRef.current) return;
                const dx = e.clientX - dragStartRef.current.x;
                setYaw((((dragStartRef.current.yaw + dx * 0.4) % 360) + 360) % 360);
              }}
              onPointerUp={(e) => {
                setDragging(false);
                dragStartRef.current = null;
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  /* déjà relâché */
                }
              }}
              onPointerCancel={() => {
                setDragging(false);
                dragStartRef.current = null;
              }}
            >
              <Plan3dSvg layout={layout} yaw={yaw} disclaimer={DISCLAIMER_LINES} />
            </svg>
          )}
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
        {view === "2d" ? (
          <>
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-3 w-3" /> Échelle indicative 1 : 50 — cotes réelles en mètres
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3 w-3" /> {layout.typeLabel} — surface utile ≈ {layout.perFloor} m²/niveau
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1">
              <Box className="h-3 w-3" /> Vue 3D — {layout.floors} niveau{layout.floors > 1 ? "x" : ""} · {fmtM(layout.width)} × {fmtM(layout.height)} au sol · hauteur ≈ {((layout.floors * 3).toFixed(1)).replace(".", ",")} m
            </span>
            <span className="inline-flex items-center gap-1">
              <MousePointer2 className="h-3 w-3" /> Glissez sur l'image pour faire pivoter le bâtiment
            </span>
          </>
        )}
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
