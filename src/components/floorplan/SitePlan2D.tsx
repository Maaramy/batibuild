import { useId, useMemo } from "react";
import type { SiteElement, SitePlan } from "@/lib/floorPlanEngine";
import { cn } from "@/lib/utils";

// ============================================================================
// PLAN DE MASSE 2D — parcelle, bâti et aménagements extérieurs
// ----------------------------------------------------------------------------
// Le jardin, la piscine, la terrasse et la cuisine extérieure sont dessinés
// DANS LA PARCELLE, autour du bâti, jamais à l'intérieur. Le plan est coté et
// orienté ; les surfaces affichées proviennent des rectangles réellement
// dessinés (aucune valeur décorative).
// ============================================================================

const INK = "#292524";
const PLOT = "#1f2937";
const GREEN = "#dcebc8";
const GREEN_LINE = "#9cb98a";
const PAPER = "#fbfaf6";
const DIM = "#78716c";

const ELEMENT_COLORS: Record<SiteElement["kind"], { fill: string; stroke: string; label: string }> = {
  terrasse: { fill: "#ead9bd", stroke: "#b79b72", label: "Terrasse" },
  piscine: { fill: "#a8dcf5", stroke: "#2b8fb8", label: "Piscine" },
  cuisine_exterieure: { fill: "#e7e5e4", stroke: "#78716c", label: "Cuisine extérieure" },
  jardin: { fill: GREEN, stroke: GREEN_LINE, label: "Jardin" },
  allee: { fill: "#eeebe4", stroke: "#a8a29e", label: "Allée" },
  stationnement: { fill: "#e2e0dc", stroke: "#8a8580", label: "Stationnement" },
  acces: { fill: "#eeebe4", stroke: "#a8a29e", label: "Accès" },
};

export interface SitePlan2DProps {
  site: SitePlan;
  className?: string;
  /** Affiche les cotes de parcelle (par défaut : oui). */
  showDimensions?: boolean;
}

export function SitePlan2D({ site, className, showDimensions = true }: SitePlan2DProps) {
  const hatchId = useId();
  const waterId = useId();
  const woodId = useId();

  const S = useMemo(
    () => Math.max(10, Math.min(38, 660 / site.plot.length, 430 / site.plot.width)),
    [site.plot.length, site.plot.width],
  );
  const W = site.plot.length * S;
  const H = site.plot.width * S;
  const PAD = 46;

  const b = site.building;
  const bx = b.x * S;
  const by = b.y * S;
  const bw = b.w * S;
  const bh = b.h * S;

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`}
      className={cn("w-full h-auto select-none", className)}
      role="img"
      aria-label={`Plan de masse — parcelle de ${site.plot.area.toFixed(0)} m², bâti de ${site.building.area.toFixed(0)} m²`}
      style={{ fontFamily: "inherit" }}
    >
      <defs>
        <pattern id={hatchId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={6} stroke="#d6d3d1" strokeWidth={1} />
        </pattern>
        <pattern id={waterId} width={10} height={7} patternUnits="userSpaceOnUse">
          <path d="M 0 3 q 2.5 -2 5 0 t 5 0" fill="none" stroke="#5cb6d8" strokeWidth={0.8} opacity={0.7} />
        </pattern>
        <pattern id={woodId} width={7} height={7} patternUnits="userSpaceOnUse">
          <line x1={0} y1={0} x2={7} y2={0} stroke="#cbb18a" strokeWidth={0.7} />
        </pattern>
      </defs>

      {/* ── Papier + parcelle ── */}
      <rect x={-PAD / 2} y={-PAD / 2} width={W + PAD} height={H + PAD} rx={3} fill={PAPER} />
      <rect x={0} y={0} width={W} height={H} fill={GREEN} />
      <rect x={0} y={0} width={W} height={H} fill={`url(#${hatchId})`} opacity={0.18} />

      {/* ── Voirie au sud (accès) ── */}
      <g>
        <rect x={0} y={H} width={W} height={16} fill="#d6d3d1" />
        <line x1={0} y1={H + 8} x2={W} y2={H + 8} stroke="#a8a29e" strokeWidth={1} strokeDasharray="10 8" />
        <text x={W / 2} y={H + 27} textAnchor="middle" fontSize={8} fontWeight={700} letterSpacing={1.6} fill={DIM}>
          VOIRIE
        </text>
      </g>

      {/* ── Limite de parcelle ── */}
      <rect x={0} y={0} width={W} height={H} fill="none" stroke={PLOT} strokeWidth={1.6} strokeDasharray="7 4" />
      <text x={4} y={-8} fontSize={7.5} fontWeight={700} letterSpacing={1} fill={PLOT}>
        LIMITE DE PARCELLE
      </text>

      {/* ── Aménagements extérieurs ── */}
      {site.elements.map((el) => {
        const c = ELEMENT_COLORS[el.kind];
        const x = el.x * S;
        const y = el.y * S;
        const w = el.w * S;
        const h = el.h * S;
        const small = w < 54 || h < 30;
        return (
          <g key={el.id}>
            <rect x={x} y={y} width={w} height={h} fill={c.fill} stroke={c.stroke} strokeWidth={1.2} rx={el.kind === "piscine" ? 4 : 1.5} />
            {el.kind === "terrasse" && (
              <rect x={x} y={y} width={w} height={h} fill={`url(#${woodId})`} opacity={0.6} rx={1.5} />
            )}
            {el.kind === "piscine" && (
              <>
                <rect x={x} y={y} width={w} height={h} fill={`url(#${waterId})`} rx={4} />
                <rect x={x + 2} y={y + 2} width={Math.max(0, w - 4)} height={Math.max(0, h - 4)} fill="none" stroke="#e0f2fe" strokeWidth={0.9} rx={3} />
              </>
            )}
            {el.kind === "cuisine_exterieure" && (
              <>
                <rect x={x + 3} y={y + 3} width={Math.max(0, w * 0.5)} height={Math.max(0, h - 6)} fill="#d6d3d1" stroke="#a8a29e" strokeWidth={0.7} rx={1} />
                <circle cx={x + w * 0.75} cy={y + h * 0.5} r={Math.min(4, h * 0.16)} fill="none" stroke="#78716c" strokeWidth={0.9} />
              </>
            )}
            {el.kind === "stationnement" && (
              <line x1={x + w / 2} y1={y + 3} x2={x + w / 2} y2={y + h - 3} stroke="#a8a29e" strokeWidth={0.8} strokeDasharray="4 3" />
            )}
            {!small && (
              <text x={x + w / 2} y={y + h / 2 + 2.5} textAnchor="middle" fontSize={Math.max(7, Math.min(9, S * 0.36))} fontWeight={600} fill={INK}>
                {el.kind === "piscine" ? `${el.label} · ${el.w.toFixed(1)} × ${el.h.toFixed(1)} m` : el.label}
              </text>
            )}
            {small && el.kind !== "allee" && (
              <text x={x + w / 2} y={y + h / 2 + 2} textAnchor="middle" fontSize={6.5} fontWeight={600} fill={INK}>
                {c.label}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Bâti ── */}
      <g>
        <rect x={bx} y={by} width={bw} height={bh} fill="#fffdf8" stroke={INK} strokeWidth={3} />
        <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke={INK} strokeWidth={0.8} strokeDasharray="2 2" opacity={0.5} />
        {/* Patios : espaces extérieurs intégrés au volume, rendus en jardin */}
        {(site.patios ?? []).map((p, i) => {
          const x = p.x * S;
          const y = p.y * S;
          const w = p.w * S;
          const h = p.h * S;
          return (
            <g key={`patio-${i}`}>
              <rect x={x} y={y} width={w} height={h} fill={GREEN} stroke={GREEN_LINE} strokeWidth={1.2} />
              <rect x={x} y={y} width={w} height={h} fill={`url(#${hatchId})`} opacity={0.25} />
              {w > 42 && h > 26 && (
                <text x={x + w / 2} y={y + h / 2 + 2.5} textAnchor="middle" fontSize={7} fontWeight={700} fill="#3f6212">
                  PATIO
                </text>
              )}
            </g>
          );
        })}
        <text
          x={bx + 5}
          y={by + 11}
          fontSize={Math.max(7.5, Math.min(10, S * 0.34))}
          fontWeight={800}
          letterSpacing={1}
          fill={INK}
        >
          BÂTI
        </text>
        <text x={bx + 5} y={by + 19} fontSize={7.5} fill={DIM}>
          {b.area.toFixed(0)} m² au sol
        </text>
      </g>

      {/* ── Cotes de parcelle ── */}
      {showDimensions && (
        <g stroke={DIM} strokeWidth={0.8}>
          <line x1={0} y1={-20} x2={W} y2={-20} />
          <line x1={0} y1={-26} x2={0} y2={-14} />
          <line x1={W} y1={-26} x2={W} y2={-14} />
          <text x={W / 2} y={-25} textAnchor="middle" fontSize={8.5} fontWeight={600} fill={DIM} stroke="none">
            {site.plot.length.toFixed(2)} m
          </text>
          <line x1={-22} y1={0} x2={-22} y2={H} />
          <line x1={-28} y1={0} x2={-16} y2={0} />
          <line x1={-28} y1={H} x2={-16} y2={H} />
          <text
            x={-26}
            y={H / 2}
            textAnchor="middle"
            fontSize={8.5}
            fontWeight={600}
            fill={DIM}
            stroke="none"
            transform={`rotate(-90 -26 ${H / 2})`}
          >
            {site.plot.width.toFixed(2)} m
          </text>
        </g>
      )}

      {/* ── Rose des vents ── */}
      <g transform={`translate(${W - 18} ${-22})`}>
        <circle r={11} fill="none" stroke={DIM} strokeWidth={1} />
        <path d="M 0 -9 L -3.5 4 L 0 1.5 L 3.5 4 Z" fill={INK} />
        <text x={0} y={-14} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={DIM}>
          N
        </text>
      </g>

      {/* ── Échelle graphique ── */}
      <g transform={`translate(0 ${H + 34})`}>
        <line x1={0} y1={0} x2={S * 5} y2={0} stroke={INK} strokeWidth={1} />
        {[0, 1, 2, 3, 4, 5].map((m) => (
          <line key={m} x1={m * S} y1={-3} x2={m * S} y2={3} stroke={INK} strokeWidth={0.9} />
        ))}
        <text x={S * 5 + 6} y={3} fontSize={7.5} fill={DIM}>
          5 m
        </text>
      </g>

      {/* ── Mention source de parcelle ── */}
      <text x={W} y={H + 47} textAnchor="end" fontSize={7} fill={DIM}>
        {site.plot.source === "projet" ? "Parcelle du projet" : "Parcelle de référence estimée"}
      </text>
    </svg>
  );
}

export function SiteLegend({ site }: { site: SitePlan }) {
  const present = new Set(site.elements.map((e) => e.kind));
  const items: { kind: SiteElement["kind"]; label: string }[] = [
    { kind: "terrasse", label: "Terrasse" },
    { kind: "piscine", label: "Piscine" },
    { kind: "cuisine_exterieure", label: "Cuisine extérieure" },
    { kind: "stationnement", label: "Stationnement" },
    { kind: "allee", label: "Allée" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border border-stone-500 bg-[#fffdf8]" />
        Bâti
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border border-lime-700/40 bg-[#dcebc8]" />
        Jardin (reste de parcelle)
      </span>
      {items
        .filter((i) => present.has(i.kind))
        .map((i) => (
          <span key={i.kind} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm border"
              style={{
                background: ELEMENT_COLORS[i.kind].fill,
                borderColor: ELEMENT_COLORS[i.kind].stroke,
              }}
            />
            {i.label}
          </span>
        ))}
    </div>
  );
}
