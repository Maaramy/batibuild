import { useId, useMemo } from "react";
import type { FloorPlan } from "@/lib/floorPlanEngine";
import { FurnitureLayer } from "./FurnitureLayer";

// ============================================================================
// PLAN 2D STYLE « DESSIN D'ARCHITECTE »
// Poché des murs (double trait fusionné), trame millimétrée légère, chaînes de
// cotes avec traits obliques, portes à vantail + arc, fenêtres triple trait,
// rose des vents et étiquettes pièces NOM + surface.
// ============================================================================

const INK = "#1c1917"; // trait d'encre (murs, cotes)
const PAPER = "#fdfdfb"; // fond papier
const GRID = "#e7e5e4"; // trame
const DIMC = "#78716c"; // cotes

/** Teintes très légères par nature de pièce (remplissage ~14 %). */
const ROOM_TINT: Record<string, string> = {
  sejour: "#f59e0b",
  cuisine: "#ef4444",
  chambre: "#3b82f6",
  sdb: "#06b6d4",
  wc: "#6366f1",
  couloir: "#a1a1aa",
  escalier: "#c026d3",
  bureau: "#22c55e",
  garage: "#6b7280",
  reception: "#ca8a04",
  openspace: "#10b981",
  reunion: "#ec4899",
  sanitaire: "#06b6d4",
  hall: "#a1a1aa",
  stockage: "#f97316",
  logistique: "#ea580c",
  vestiaire: "#8b5cf6",
  polyvalent: "#94a3b8",
  jardin: "#22c55e",
  piscine: "#0ea5e9",
  balcon: "#6366f1",
  veranda: "#f59e0b",
};

export function FloorPlan2D({ plan }: { plan: FloorPlan }) {
  const clipId = useId();
  const gridId = useId();

  // Échelle adaptative : le plan tient toujours dans ~660 px de large
  const S = useMemo(
    () => Math.max(14, Math.min(44, 640 / plan.length)),
    [plan.length],
  );
  const W = plan.length * S;
  const H = plan.width * S;
  const PAD = 46; // marge pour cotes + rose des vents

  // Épaisseurs de mur (px) : porte-à-faux extérieur 20 cm, cloisons 8 cm
  const EXT = Math.max(4.5, 0.2 * S);
  const INT = Math.max(2.5, 0.08 * S);

  const rooms = useMemo(() => plan.rooms, [plan]);

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label={`Plan 2D — ${plan.rooms.length} pièces`}
      style={{ fontFamily: "inherit" }}
    >
      {/* ── Papier + emprise ── */}
      <rect x={-PAD / 2} y={-PAD / 2} width={W + PAD} height={H + PAD} rx={3} fill={PAPER} />
      <clipPath id={clipId}>
        <rect x={0} y={0} width={W} height={H} />
      </clipPath>
      <pattern id={gridId} width={S} height={S} patternUnits="userSpaceOnUse">
        <path d={`M ${S} 0 L 0 0 0 ${S}`} fill="none" stroke={GRID} strokeWidth={0.6} />
      </pattern>
      <rect x={0} y={0} width={W} height={H} fill={`url(#${gridId})`} />

      {/* ── Passe 1 : remplissages de pièces (teinte légère) ── */}
      <g clipPath={`url(#${clipId})`}>
        {rooms.map((r) => (
          <rect
            key={`f-${r.id}`}
            x={r.x * S}
            y={r.y * S}
            width={r.w * S}
            height={r.h * S}
            fill={ROOM_TINT[r.kind] ?? ROOM_TINT.polyvalent}
            opacity={0.13}
          />
        ))}
        {/* Escalier : marches dessinées */}
        {rooms
          .filter((r) => r.kind === "escalier")
          .map((r) => {
            const rx = r.x * S, ry = r.y * S, rw = r.w * S, rh = r.h * S;
            const steps = Math.max(4, Math.floor((r.w > r.h ? rw : rh) / 7));
            const horiz = rw >= rh;
            return (
              <g key={`st-${r.id}`} stroke="#a855f7" strokeWidth={1} opacity={0.65}>
                {Array.from({ length: steps - 1 }, (_, i) => {
                  const t = ((i + 1) / steps);
                  return horiz ? (
                    <line key={i} x1={rx + rw * t} y1={ry} x2={rx + rw * t} y2={ry + rh} />
                  ) : (
                    <line key={i} x1={rx} y1={ry + rh * t} x2={rx + rw} y2={ry + rh * t} />
                  );
                })}
                {/* Sens de montée */}
                <line
                  x1={rx + rw * 0.15} y1={ry + rh * 0.75}
                  x2={rx + rw * 0.85} y2={ry + rh * 0.25}
                  strokeWidth={1.2}
                />
                <path
                  d={`M ${rx + rw * 0.85} ${ry + rh * 0.25} l -5 1 l 3 4 z`}
                  fill="#a855f7" stroke="none"
                />
              </g>
            );
          })}
      </g>

      {/* ── Passe 1b : aménagement intérieur (mobilier) ── */}
      <g clipPath={`url(#${clipId})`}>
        <FurnitureLayer plan={plan} S={S} />
      </g>

      {/* ── Passe 2 : poché des murs (traits fusionnés) ── */}
      <g clipPath={`url(#${clipId})`}>
        {rooms.map((r) => (
          <rect
            key={`w-${r.id}`}
            x={r.x * S}
            y={r.y * S}
            width={r.w * S}
            height={r.h * S}
            fill="none"
            stroke={INK}
            strokeWidth={INT}
          />
        ))}
      </g>
      {/* Murs extérieurs plus épais */}
      <rect x={0} y={0} width={W} height={H} fill="none" stroke={INK} strokeWidth={EXT} />

      {/* ── Passe 3 : ouvertures (percées dans le poché) ── */}
      <g clipPath={`url(#${clipId})`}>
        {rooms.map((r) => {
          const rx = r.x * S, ry = r.y * S, rw = r.w * S, rh = r.h * S;
          return (
            <g key={`o-${r.id}`}>
              {r.windows.map((win, i) => (
                <WindowSym
                  key={`wi-${i}`}
                  wall={win.wall}
                  p1={(win.wall === "N" || win.wall === "S" ? r.x + win.position : r.y + win.position) * S}
                  len={win.width * S}
                  line={win.wall === "N" ? ry : win.wall === "S" ? ry + rh : win.wall === "W" ? rx : rx + rw}
                  band={isEdge(win.wall === "N" ? r.y : win.wall === "S" ? r.y + r.h - plan.width : win.wall === "W" ? r.x : r.x + r.w - plan.length) ? EXT : INT}
                  inward={win.wall === "N" ? 1 : win.wall === "S" ? -1 : win.wall === "W" ? 1 : -1}
                  vertical={win.wall === "W" || win.wall === "E"}
                />
              ))}
              {r.doors.map((d, i) => (
                <DoorSym
                  key={`do-${i}`}
                  wall={d.wall}
                  p1={(d.wall === "N" || d.wall === "S" ? r.x + d.position : r.y + d.position) * S}
                  len={d.width * S}
                  line={d.wall === "N" ? ry : d.wall === "S" ? ry + rh : d.wall === "W" ? rx : rx + rw}
                  band={isEdge(d.wall === "N" ? r.y : d.wall === "S" ? r.y + r.h - plan.width : d.wall === "W" ? r.x : r.x + r.w - plan.length) ? EXT : INT}
                  inward={d.wall === "N" ? 1 : d.wall === "S" ? -1 : d.wall === "W" ? 1 : -1}
                  vertical={d.wall === "W" || d.wall === "E"}
                  isEntry={!!d.isEntry}
                />
              ))}
            </g>
          );
        })}
      </g>

      {/* ── Passe 4 : étiquettes des pièces ── */}
      <g clipPath={`url(#${clipId})`}>
        {rooms.map((r) => {
          const cx = (r.x + r.w / 2) * S;
          const cy = (r.y + r.h / 2) * S;
          const big = r.w * S > 58 && r.h * S > 36;
          const mid = r.w * S > 34 && r.h * S > 22;
          const nameSize = Math.max(7.5, Math.min(11, S * 0.32));
          if (!mid) return null;
          return (
            <g key={`l-${r.id}`} textAnchor="middle">
              <text
                x={cx}
                y={big ? cy - 2 : cy + 3}
                fontSize={nameSize}
                fontWeight={700}
                letterSpacing={0.8}
                fill="#292524"
              >
                {r.label.toUpperCase()}
              </text>
              {big && (
                <>
                  <text x={cx} y={cy + nameSize + 4} fontSize={nameSize - 1.5} fill="#57534e">
                    {r.area.toFixed(2)} m²
                  </text>
                  {(r.w * S > 86 && r.h * S > 52) && (
                    <text x={cx} y={cy + nameSize + 15} fontSize={nameSize - 2.5} fill="#79716b">
                      {r.w.toFixed(2)} × {r.h.toFixed(2)} m
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* ── Chaînes de cotes ── */}
      <DimChain from={0} to={W} at={-EXT / 2 - 14} label={`${plan.length.toFixed(2)} m`} />
      <DimChain vertical from={0} to={H} at={-EXT / 2 - 14} label={`${plan.width.toFixed(2)} m`} />

      {/* ── Rose des vents ── */}
      <NorthArrow cx={W + PAD * 0.55} cy={-PAD * 0.45} r={11} />

      {/* Flèche d'entrée : sous la première porte isEntry trouvée */}
      {rooms.map((r) =>
        r.doors.filter((d) => d.isEntry).map((d, i) => {
          const ex = (d.wall === "N" || d.wall === "S" ? r.x + d.position + d.width / 2 : d.wall === "W" ? r.x : r.x + r.w) * S;
          const ey = (d.wall === "N" ? r.y : d.wall === "S" ? r.y + r.h : r.y + d.position + d.width / 2) * S;
          return (
            <g key={`e-${r.id}-${i}`}>
              <line x1={ex} y1={ey + 16} x2={ex} y2={ey + 5} stroke={INK} strokeWidth={1.2} />
              <path d={`M ${ex} ${ey + 3} l -3 6 l 6 0 z`} fill={INK} />
              <text x={ex} y={ey + 26} textAnchor="middle" fontSize={7.5} fontWeight={600} letterSpacing={1} fill={DIMC}>
                ENTRÉE
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

// ── Helpers géométriques ─────────────────────────────────────────────────────

function isEdge(distToEmpriseEdge: number): boolean {
  return Math.abs(distToEmpriseEdge) < 0.01;
}

/** Fenêtre : percement + triple trait normalisé. */
function WindowSym({
  wall, p1, len, line, band, inward, vertical,
}: {
  wall: string; p1: number; len: number; line: number; band: number; inward: number; vertical: boolean;
}) {
  const gap = band / 2 + 1.5;
  const patch = vertical ? (
    <rect x={line - gap} y={p1 - 1} width={gap * 2} height={len + 2} fill={PAPER} />
  ) : (
    <rect x={p1 - 1} y={line - gap} width={len + 2} height={gap * 2} fill={PAPER} />
  );
  const offsets = [-band / 4, 0, band / 4];
  const lines = offsets.map((o, i) =>
    vertical ? (
      <line key={i} x1={line + o} y1={p1} x2={line + o} y2={p1 + len} stroke={INK} strokeWidth={0.9} />
    ) : (
      <line key={i} x1={p1} y1={line + o} x2={p1 + len} y2={line + o} stroke={INK} strokeWidth={0.9} />
    ),
  );
  void wall; void inward;
  return (
    <g>
      {patch}
      {lines}
    </g>
  );
}

/** Porte : percement + vantail perpendiculaire + arc de débattement. */
function DoorSym({
  p1, len, line, band, inward, vertical, isEntry,
}: {
  wall: string; p1: number; len: number; line: number; band: number; inward: number; vertical: boolean; isEntry: boolean;
}) {
  const gap = band / 2 + 1.5;
  const patch = vertical ? (
    <rect x={line - gap} y={p1 - 1} width={gap * 2} height={len + 2} fill={PAPER} />
  ) : (
    <rect x={p1 - 1} y={line - gap} width={len + 2} height={gap * 2} fill={PAPER} />
  );
  // Charnière à p1 ; vantail perpendiculaire au mur vers l'intérieur ;
  // arc de gissement du bout du vantail jusqu'au mur.
  const hx = vertical ? line : p1;
  const hy = vertical ? p1 : line;
  const lx = vertical ? line + inward * len : p1 + len;
  const ly = vertical ? p1 + len : line + inward * len;
  const bx = vertical ? line : p1 + len;
  const by = vertical ? p1 + len : line + inward * len;
  const sweep = vertical ? (inward > 0 ? 0 : 1) : inward > 0 ? 0 : 1;
  return (
    <g>
      {patch}
      {/* Vantail */}
      <line x1={hx} y1={hy} x2={lx} y2={ly} stroke={isEntry ? "#15803d" : INK} strokeWidth={1.3} />
      {/* Arc de gissement */}
      <path
        d={`M ${lx} ${ly} A ${len} ${len} 0 0 ${sweep} ${bx} ${by}`}
        fill="none"
        stroke={isEntry ? "#15803d" : DIMC}
        strokeWidth={0.9}
        strokeDasharray={isEntry ? undefined : "3 2.5"}
      />
      {/* Seuil */}
      <line
        x1={vertical ? line : p1}
        y1={vertical ? p1 : line}
        x2={vertical ? line : p1 + len}
        y2={vertical ? p1 + len : line}
        stroke={isEntry ? "#15803d" : "#d6d3d1"}
        strokeWidth={Math.max(1, band * 0.5)}
      />
    </g>
  );
}

/** Chaîne de cote avec traits obliques (style archi). */
function DimChain({
  from, to, at, label, vertical,
}: {
  from: number; to: number; at: number; label: string; vertical?: boolean;
}) {
  const tick = 4;
  const mid = (from + to) / 2;
  return (
    <g stroke={DIMC} strokeWidth={0.8}>
      {/* Ligne de cote */}
      {vertical ? (
        <line x1={at} y1={from} x2={at} y2={to} />
      ) : (
        <line x1={from} y1={at} x2={to} y2={at} />
      )}
      {/* Traits obliques aux extrémités */}
      {[from, to].map((t, i) =>
        vertical ? (
          <line key={i} x1={at - tick} y1={t + tick} x2={at + tick} y2={t - tick} strokeWidth={1.1} />
        ) : (
          <line key={i} x1={t - tick} y1={at + tick} x2={t + tick} y2={at - tick} strokeWidth={1.1} />
        ),
      )}
      {/* Texte */}
      <text
        x={vertical ? at - 5 : mid}
        y={vertical ? mid : at - 5}
        textAnchor="middle"
        fontSize={8.5}
        fontWeight={500}
        fill={DIMC}
        stroke="none"
        transform={vertical ? `rotate(-90 ${at - 5} ${mid})` : undefined}
      >
        {label}
      </text>
    </g>
  );
}

function NorthArrow({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={DIMC} strokeWidth={1} />
      <path d={`M ${cx} ${cy - r + 1.5} L ${cx - 4} ${cy + r * 0.55} L ${cx} ${cy + r * 0.2} L ${cx + 4} ${cy + r * 0.55} Z`} fill={INK} />
      <text x={cx} y={cy + r + 9} textAnchor="middle" fontSize={8} fontWeight={700} fill={DIMC}>
        N
      </text>
    </g>
  );
}
