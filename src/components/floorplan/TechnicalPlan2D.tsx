import { useId, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { FloorPlan, PlanRoom, WallSide } from "@/lib/floorPlanEngine";
import { PLAN_ROOM_COLORS } from "@/lib/floorPlanEngine";
import type {
  ElectricalCircuit,
  ElectricalPoint,
  PlumbingAccessory,
  PlumbingFixture,
  Pt,
  TechnicalPlan,
} from "@/lib/technicalPlanEngine";
import { electricalCircuitColor } from "@/lib/technicalPlanEngine";
import { cn } from "@/lib/utils";

// ============================================================================
// PLAN TECHNIQUE 2D — SUPERPOSITION AU PLAN ARCHITECTURAL
// ----------------------------------------------------------------------------
// Le fond reprend la géométrie EXACTE du plan (`FloorPlan` : mêmes mètres,
// mêmes murs, mêmes ouvertures) ; les réseaux sont dessinés dans le même
// repère. Zoom / déplacement, calques activables et points déplaçables
// (plomberie et électricité) sont gérés ici ; l'enregistrement et l'export
// restent pilotés par le panneau parent.
// ============================================================================

const INK = "#1c1917";
const PAPER = "#fdfdfb";
const GRID = "#e7e5e4";
const DIMC = "#78716c";
const SELECTED = "#7c3aed";

const PIPE_STYLE: Record<string, { color: string; width: number; dash?: string }> = {
  eau_froide: { color: "#0284c7", width: 2.2 },
  eau_chaude: { color: "#dc2626", width: 2.2 },
  evacuation: { color: "#44403c", width: 3.2 },
  ventilation: { color: "#a16207", width: 1.6, dash: "5 3" },
};

const ELECTRICAL_GROUP: Record<string, string> = {
  luminaire: "eclairage",
  luminaire_ext: "eclairage",
  interrupteur: "eclairage",
  prise: "prises",
  prise_specialisee: "specialises",
  chauffe_eau: "specialises",
  climatiseur: "climatisation",
  tableau: "tableau",
  terre: "tableau",
};

function layerOn(layers: Record<string, boolean>, key: string): boolean {
  return layers[key] !== false;
}

function symbolSize(S: number): number {
  return Math.max(4, Math.min(12, 0.24 * S));
}

function labelSize(S: number): number {
  return Math.max(6.5, Math.min(10, 0.24 * S));
}

export interface TechnicalPlan2DProps {
  plan: FloorPlan;
  technical: TechnicalPlan;
  layers: Record<string, boolean>;
  zoom?: number;
  pan?: Pt;
  onPanChange?: (pan: Pt) => void;
  /** Mode édition : les points deviennent déplaçables (sinon déplacement du plan). */
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMovePoint?: (id: string, position: Pt) => void;
  className?: string;
}

export function TechnicalPlan2D({
  plan,
  technical,
  layers,
  zoom = 1,
  pan = { x: 0, y: 0 },
  onPanChange,
  editable = false,
  selectedId,
  onSelect,
  onMovePoint,
  className,
}: TechnicalPlan2DProps) {
  const clipId = useId();
  const gridId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 });

  // Même échelle et même marge que le plan architectural : les réseaux se
  // superposent au millimètre près.
  const S = useMemo(() => Math.max(14, Math.min(44, 640 / plan.length)), [plan.length]);
  const W = plan.length * S;
  const H = plan.width * S;
  const PAD = 50;
  const EXT = Math.max(4.5, 0.2 * S);
  const INT = Math.max(2.5, 0.08 * S);
  const R = symbolSize(S);
  const FS = labelSize(S);

  const toPlanPoint = (event: ReactPointerEvent<Element>): Pt | null => {
    const group = groupRef.current;
    const svg = svgRef.current;
    if (!group || !svg) return null;
    const ctm = group.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x / S, y: local.y / S };
  };

  const handleBackgroundDown = (event: ReactPointerEvent<SVGRectElement>) => {
    if (editable || !onPanChange) return;
    setPanning(true);
    panStart.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: pan.x,
      y: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragId && onMovePoint) {
      const point = toPlanPoint(event);
      if (!point) return;
      const snapped = {
        x: Math.round(point.x * 20) / 20,
        y: Math.round(point.y * 20) / 20,
      };
      onMovePoint(dragId, snapped);
      return;
    }
    if (!panning || !onPanChange) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = rect.width > 0 ? (W + PAD * 2) / rect.width : 1;
    onPanChange({
      x: panStart.current.x + (event.clientX - panStart.current.clientX) * ratio,
      y: panStart.current.y + (event.clientY - panStart.current.clientY) * ratio,
    });
  };

  const endInteraction = () => {
    setDragId(null);
    setPanning(false);
  };

  const startDrag = (event: ReactPointerEvent<SVGElement>, id: string) => {
    if (!editable || !onMovePoint) return;
    event.stopPropagation();
    onSelect?.(id);
    setDragId(id);
    const target = event.currentTarget as SVGElement;
    target.setPointerCapture?.(event.pointerId);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`}
      className={cn("w-full h-auto select-none touch-none", className)}
      role="img"
      aria-label={`Plan technique ${technical.kind === "plomberie" ? "de plomberie" : "électrique"} — ${plan.rooms.length} pièces`}
      style={{ fontFamily: "inherit", cursor: editable ? "crosshair" : panning ? "grabbing" : "grab" }}
      onPointerMove={handlePointerMove}
      onPointerUp={endInteraction}
      onPointerCancel={endInteraction}
      onPointerLeave={endInteraction}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
        <pattern id={gridId} width={S} height={S} patternUnits="userSpaceOnUse">
          <path d={`M ${S} 0 L 0 0 0 ${S}`} fill="none" stroke={GRID} strokeWidth={0.6} />
        </pattern>
      </defs>

      <g ref={groupRef} transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
        {/* Papier (hors clip pour capter le déplacement du plan) */}
        <rect
          x={-PAD / 2}
          y={-PAD / 2}
          width={W + PAD}
          height={H + PAD}
          rx={3}
          fill={PAPER}
          onPointerDown={handleBackgroundDown}
        />
        <rect x={0} y={0} width={W} height={H} fill={`url(#${gridId})`} pointerEvents="none" />

        {/* ── Fond architectural : pièces, murs, ouvertures, étiquettes ── */}
        {layerOn(layers, "architecture") && (
          <g pointerEvents="none">
            <g clipPath={`url(#${clipId})`}>
              {plan.rooms.map((room) => (
                <rect
                  key={`f-${room.id}`}
                  x={room.x * S}
                  y={room.y * S}
                  width={room.w * S}
                  height={room.h * S}
                  fill={PLAN_ROOM_COLORS[room.kind] ?? "#f5f5f4"}
                  opacity={0.55}
                />
              ))}
            </g>
            <g clipPath={`url(#${clipId})`}>
              {plan.rooms.map((room) => (
                <rect
                  key={`w-${room.id}`}
                  x={room.x * S}
                  y={room.y * S}
                  width={room.w * S}
                  height={room.h * S}
                  fill="none"
                  stroke="#a8a29e"
                  strokeWidth={INT}
                />
              ))}
            </g>
            <rect x={0} y={0} width={W} height={H} fill="none" stroke="#57534e" strokeWidth={EXT} />

            {/* Ouvertures : percements blancs dans les murs */}
            <g clipPath={`url(#${clipId})`}>
              {plan.rooms.flatMap((room) => [
                ...room.doors.map((d, i) => (
                  <Opening
                    key={`d-${room.id}-${i}`}
                    room={room}
                    wall={d.wall}
                    position={d.position}
                    width={d.width}
                    S={S}
                    band={EXT}
                    entry={!!d.isEntry}
                  />
                )),
                ...room.windows.map((w, i) => (
                  <Opening
                    key={`win-${room.id}-${i}`}
                    room={room}
                    wall={w.wall}
                    position={w.position}
                    width={w.width}
                    S={S}
                    band={EXT}
                    window
                  />
                )),
              ])}
            </g>

            {/* Étiquettes de pièces discrètes (le plan technique reste lisible) */}
            <g clipPath={`url(#${clipId})`}>
              {plan.rooms.map((room) => {
                const cx = (room.x + room.w / 2) * S;
                const cy = (room.y + room.h / 2) * S;
                if (room.w * S < 34 || room.h * S < 22) return null;
                return (
                  <g key={`lbl-${room.id}`} textAnchor="middle" opacity={0.62}>
                    <text
                      x={cx}
                      y={cy - 1}
                      fontSize={FS * 0.85}
                      fontWeight={700}
                      letterSpacing={0.4}
                      fill="#57534e"
                    >
                      {room.label.toUpperCase()}
                    </text>
                    {room.w * S > 54 && room.h * S > 34 && (
                      <text x={cx} y={cy + FS + 2} fontSize={FS * 0.8} fill="#78716c">
                        {room.w.toFixed(2)} × {room.h.toFixed(2)} m · {room.area.toFixed(1)} m²
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        )}

        {/* ── Réseaux techniques ── */}
        {technical.kind === "plomberie" ? (
          <PlumbingLayer
            technical={technical}
            layers={layers}
            S={S}
            R={R}
            FS={FS}
            editable={editable}
            selectedId={selectedId}
            onSelect={onSelect}
            onStartDrag={startDrag}
          />
        ) : (
          <ElectricalLayer
            technical={technical}
            layers={layers}
            S={S}
            R={R}
            FS={FS}
            editable={editable}
            selectedId={selectedId}
            onSelect={onSelect}
            onStartDrag={startDrag}
          />
        )}

        {/* ── Cotes générales ── */}
        {layerOn(layers, "cotes") && (
          <g pointerEvents="none">
            <DimChain from={0} to={W} at={-EXT / 2 - 16} label={`${plan.length.toFixed(2)} m`} />
            <DimChain
              vertical
              from={0}
              to={H}
              at={-EXT / 2 - 16}
              label={`${plan.width.toFixed(2)} m`}
            />
            <NorthArrow cx={W + PAD * 0.56} cy={-PAD * 0.42} r={11} />
            <ScaleBar x={0} y={H + 26} S={S} />
          </g>
        )}
      </g>
    </svg>
  );
}

// ── Fond : ouvertures ───────────────────────────────────────────────────────

function Opening({
  room,
  wall,
  position,
  width,
  S,
  band,
  entry,
  window,
}: {
  room: PlanRoom;
  wall: WallSide;
  position: number;
  width: number;
  S: number;
  band: number;
  entry?: boolean;
  window?: boolean;
}) {
  const thick = window ? band * 0.35 : band * 0.9;
  const color = window ? "#ffffff" : entry ? "#ffffff" : "#ffffff";
  const vertical = wall === "W" || wall === "E";
  const x = (wall === "W" || wall === "E" ? room.x + (wall === "W" ? 0 : room.w) : room.x + position) * S;
  const y = (wall === "N" || wall === "S" ? room.y + (wall === "N" ? 0 : room.h) : room.y + position) * S;
  return (
    <line
      x1={x}
      y1={y}
      x2={vertical ? x : x + width * S}
      y2={vertical ? y + width * S : y}
      stroke={color}
      strokeWidth={thick}
      strokeLinecap="butt"
    />
  );
}

// ── Réseau de plomberie ─────────────────────────────────────────────────────

function PlumbingLayer({
  technical,
  layers,
  S,
  R,
  FS,
  editable,
  selectedId,
  onSelect,
  onStartDrag,
}: {
  technical: Extract<TechnicalPlan, { kind: "plomberie" }>;
  layers: Record<string, boolean>;
  S: number;
  R: number;
  FS: number;
  editable: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onStartDrag: (event: ReactPointerEvent<SVGElement>, id: string) => void;
}) {
  const handle = (event: ReactPointerEvent<SVGElement>, id: string) => {
    event.stopPropagation();
    if (editable) onStartDrag(event, id);
    else onSelect?.(selectedId === id ? null : id);
  };

  return (
    <>
      {/* Conduites */}
      <g pointerEvents="none">
        {technical.pipes
          .filter((pipe) => layerOn(layers, pipe.network))
          .map((pipe) => {
            const style = PIPE_STYLE[pipe.network] ?? PIPE_STYLE.eau_froide;
            return (
              <g key={pipe.id}>
                <polyline
                  points={pipe.points.map((p) => `${p.x * S},${p.y * S}`).join(" ")}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={style.width + (pipe.trunk ? 2.4 : 1.4)}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={0.85}
                />
                <polyline
                  points={pipe.points.map((p) => `${p.x * S},${p.y * S}`).join(" ")}
                  fill="none"
                  stroke={style.color}
                  strokeWidth={pipe.trunk ? style.width : Math.max(1.2, style.width - 0.7)}
                  strokeDasharray={style.dash}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
      </g>

      {/* Annotations de diamètres / pentes */}
      {layerOn(layers, "diametres") && (
        <g pointerEvents="none">
          {technical.pipes
            .filter((pipe) => pipe.trunk && layerOn(layers, pipe.network))
            .map((pipe) => {
              const mid = pipe.points[Math.floor(pipe.points.length / 2)];
              if (!mid) return null;
              const style = PIPE_STYLE[pipe.network] ?? PIPE_STYLE.eau_froide;
              const text =
                pipe.network === "evacuation"
                  ? `Ø${pipe.dn} · pente ${pipe.slopePct ?? 2} %`
                  : pipe.network === "ventilation"
                    ? `VP Ø${pipe.dn}`
                    : `Ø${pipe.dn}`;
              return (
                <text
                  key={`ann-${pipe.id}`}
                  x={mid.x * S + 4}
                  y={mid.y * S - 5}
                  fontSize={FS * 0.75}
                  fontWeight={600}
                  fill={style.color}
                  paintOrder="stroke"
                  stroke="#ffffff"
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                >
                  {text}
                </text>
              );
            })}
          {technical.pipes
            .filter((p) => p.network === "evacuation" && !p.trunk)
            .map((pipe) => (
              <text
                key={`dn-${pipe.id}`}
                x={pipe.points[0].x * S + 3}
                y={pipe.points[0].y * S + 9}
                fontSize={FS * 0.65}
                fill="#57534e"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth={2}
              >
                Ø{pipe.dn}
              </text>
            ))}
        </g>
      )}

      {/* Appareils */}
      {layerOn(layers, "appareils") && (
        <g>
          {technical.fixtures.map((fixture) => (
            <PlumbingFixtureGlyph
              key={fixture.id}
              fixture={fixture}
              S={S}
              R={R}
              FS={FS}
              selected={selectedId === fixture.id}
              editable={editable}
              onPointerDown={(e) => handle(e, fixture.id)}
            />
          ))}
        </g>
      )}

      {/* Accessoires */}
      {layerOn(layers, "accessoires") && (
        <g>
          {technical.accessories.map((accessory) => (
            <AccessoryGlyph
              key={accessory.id}
              accessory={accessory}
              S={S}
              R={R * 0.8}
              FS={FS}
              selected={selectedId === accessory.id}
              editable={editable}
              onPointerDown={(e) => handle(e, accessory.id)}
            />
          ))}
        </g>
      )}
    </>
  );
}

function PlumbingFixtureGlyph({
  fixture,
  S,
  R,
  FS,
  selected,
  editable,
  onPointerDown,
}: {
  fixture: PlumbingFixture;
  S: number;
  R: number;
  FS: number;
  selected: boolean;
  editable: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGElement>) => void;
}) {
  const cx = fixture.x * S;
  const cy = fixture.y * S;
  const color = "#0f766e";
  const fill = "#ccfbf1";
  const common = {
    stroke: color,
    strokeWidth: 1.4,
    fill,
    onPointerDown,
    style: { cursor: editable ? "move" : "pointer" },
  } as const;

  return (
    <g>
      {fixture.kind === "wc" && (
        <g {...common}>
          <ellipse cx={cx} cy={cy + R * 0.22} rx={R * 0.62} ry={R * 0.78} />
          <rect x={cx - R * 0.62} y={cy - R * 0.95} width={R * 1.24} height={R * 0.42} rx={1.5} />
        </g>
      )}
      {fixture.kind === "lavabo" && (
        <g {...common}>
          <rect x={cx - R * 0.85} y={cy - R * 0.55} width={R * 1.7} height={R * 1.1} rx={R * 0.24} />
          <ellipse cx={cx} cy={cy} rx={R * 0.55} ry={R * 0.36} fill="#ffffff" />
        </g>
      )}
      {fixture.kind === "douche" && (
        <g {...common}>
          <rect x={cx - R * 0.9} y={cy - R * 0.9} width={R * 1.8} height={R * 1.8} rx={1.5} />
          <line x1={cx - R * 0.9} y1={cy - R * 0.9} x2={cx + R * 0.9} y2={cy + R * 0.9} strokeWidth={0.9} />
          <circle cx={cx} cy={cy} r={R * 0.16} />
        </g>
      )}
      {fixture.kind === "baignoire" && (
        <g {...common}>
          <rect x={cx - R * 1.35} y={cy - R * 0.72} width={R * 2.7} height={R * 1.44} rx={R * 0.3} />
          <ellipse cx={cx} cy={cy} rx={R * 1.05} ry={R * 0.46} fill="#ffffff" />
        </g>
      )}
      {fixture.kind === "evier" && (
        <g {...common}>
          <rect x={cx - R * 1.1} y={cy - R * 0.7} width={R * 2.2} height={R * 1.4} rx={1.5} />
          <circle cx={cx - R * 0.45} cy={cy} r={R * 0.35} fill="#ffffff" />
          <circle cx={cx + R * 0.45} cy={cy} r={R * 0.35} fill="#ffffff" />
        </g>
      )}
      {(fixture.kind === "lave_vaisselle" || fixture.kind === "lave_linge") && (
        <g {...common}>
          <rect x={cx - R * 0.9} y={cy - R * 0.9} width={R * 1.8} height={R * 1.8} rx={1.5} />
          <circle cx={cx} cy={cy} r={R * 0.52} fill="#ffffff" />
          <circle cx={cx} cy={cy} r={R * 0.16} fill={color} stroke="none" />
        </g>
      )}
      {fixture.kind === "chauffe_eau" && (
        <g {...common}>
          <circle cx={cx} cy={cy} r={R * 0.9} />
          <text
            x={cx}
            y={cy + FS * 0.32}
            textAnchor="middle"
            fontSize={FS * 0.72}
            fontWeight={700}
            fill={color}
            stroke="none"
          >
            CE
          </text>
        </g>
      )}
      {selected && (
        <circle
          cx={cx}
          cy={cy}
          r={R * 1.5}
          fill="none"
          stroke={SELECTED}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
      <text
        x={cx}
        y={cy + R * 1.85}
        textAnchor="middle"
        fontSize={FS * 0.68}
        fill="#115e59"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth={2.2}
        pointerEvents="none"
      >
        {fixture.label}
      </text>
    </g>
  );
}

function AccessoryGlyph({
  accessory,
  S,
  R,
  FS,
  selected,
  editable,
  onPointerDown,
}: {
  accessory: PlumbingAccessory;
  S: number;
  R: number;
  FS: number;
  selected: boolean;
  editable: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGElement>) => void;
}) {
  const cx = accessory.x * S;
  const cy = accessory.y * S;
  const color = "#7c3aed";
  const common = {
    stroke: color,
    strokeWidth: 1.4,
    fill: "#f5f3ff",
    onPointerDown,
    style: { cursor: editable ? "move" : "pointer" },
  } as const;
  return (
    <g>
      {accessory.kind === "vanne" && (
        <g {...common}>
          <path d={`M ${cx - R} ${cy - R} L ${cx + R} ${cy + R} L ${cx + R} ${cy - R} L ${cx - R} ${cy + R} Z`} />
        </g>
      )}
      {accessory.kind === "collecteur" && (
        <g {...common}>
          <rect x={cx - R * 1.2} y={cy - R * 0.42} width={R * 2.4} height={R * 0.84} rx={1.2} />
          {[-0.7, 0, 0.7].map((o) => (
            <line key={o} x1={cx + o * R} y1={cy - R * 0.42} x2={cx + o * R} y2={cy + R * 0.42} />
          ))}
        </g>
      )}
      {accessory.kind === "regard" && (
        <g {...common}>
          <rect x={cx - R} y={cy - R} width={R * 2} height={R * 2} rx={1} />
          <line x1={cx - R} y1={cy - R} x2={cx + R} y2={cy + R} />
          <line x1={cx + R} y1={cy - R} x2={cx - R} y2={cy + R} />
        </g>
      )}
      {accessory.kind === "chute" && (
        <g {...common}>
          <circle cx={cx} cy={cy} r={R} />
          <circle cx={cx} cy={cy} r={R * 0.55} fill="#ffffff" />
        </g>
      )}
      {accessory.kind === "clapet" && (
        <g {...common}>
          <circle cx={cx} cy={cy} r={R * 0.9} />
          <path d={`M ${cx - R * 0.45} ${cy - R * 0.35} L ${cx + R * 0.35} ${cy} L ${cx - R * 0.45} ${cy + R * 0.35} Z`} fill={color} />
        </g>
      )}
      {selected && (
        <circle
          cx={cx}
          cy={cy}
          r={R * 1.7}
          fill="none"
          stroke={SELECTED}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
      <text
        x={cx}
        y={cy + R * 2}
        textAnchor="middle"
        fontSize={FS * 0.64}
        fill="#6d28d9"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth={2.2}
        pointerEvents="none"
      >
        {accessory.label}
      </text>
    </g>
  );
}

// ── Réseau électrique ───────────────────────────────────────────────────────

function ElectricalLayer({
  technical,
  layers,
  S,
  R,
  FS,
  editable,
  selectedId,
  onSelect,
  onStartDrag,
}: {
  technical: Extract<TechnicalPlan, { kind: "electricite" }>;
  layers: Record<string, boolean>;
  S: number;
  R: number;
  FS: number;
  editable: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onStartDrag: (event: ReactPointerEvent<SVGElement>, id: string) => void;
}) {
  const handle = (event: ReactPointerEvent<SVGElement>, id: string) => {
    event.stopPropagation();
    if (editable) onStartDrag(event, id);
    else onSelect?.(selectedId === id ? null : id);
  };
  const circuitById = new Map(technical.circuits.map((c, i) => [c.id, { circuit: c, index: i }]));

  return (
    <>
      {/* Cheminements de câbles */}
      {layerOn(layers, "cheminements") && (
        <g pointerEvents="none">
          {technical.cables.map((cable) => {
            const info = circuitById.get(cable.circuitId);
            const color = info ? electricalCircuitColor(info.index) : "#7c3aed";
            return (
              <g key={cable.id}>
                <polyline
                  points={cable.points.map((p) => `${p.x * S},${p.y * S}`).join(" ")}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={2.6}
                  strokeLinejoin="round"
                  opacity={0.65}
                />
                <polyline
                  points={cable.points.map((p) => `${p.x * S},${p.y * S}`).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.95}
                  strokeDasharray="5 3"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              </g>
            );
          })}
        </g>
      )}

      {/* Points et appareillage */}
      <g>
        {technical.points.map((point) => {
          const group = ELECTRICAL_GROUP[point.kind] ?? "eclairage";
          if (!layerOn(layers, group)) return null;
          return (
            <ElectricalGlyph
              key={point.id}
              point={point}
              circuit={point.circuitId ? circuitById.get(point.circuitId)?.circuit ?? null : null}
              S={S}
              R={R}
              FS={FS}
              selected={selectedId === point.id}
              editable={editable}
              showCalibers={layerOn(layers, "calibres")}
              onPointerDown={(e) => handle(e, point.id)}
            />
          );
        })}
      </g>

      {/* Gaine technique verticale : même position sur tous les niveaux */}
      {layerOn(layers, "tableau") && (
        <g pointerEvents="none">
          <rect
            x={technical.riser.x * S - R * 0.8}
            y={technical.riser.y * S - R * 0.8}
            width={R * 1.6}
            height={R * 1.6}
            fill="#f8fafc"
            stroke="#111827"
            strokeWidth={1.2}
            strokeDasharray="3 2"
          />
          <line
            x1={technical.riser.x * S - R * 0.8}
            y1={technical.riser.y * S - R * 0.8}
            x2={technical.riser.x * S + R * 0.8}
            y2={technical.riser.y * S + R * 0.8}
            stroke="#111827"
            strokeWidth={0.9}
          />
          <text
            x={technical.riser.x * S}
            y={technical.riser.y * S + R * 2.1}
            textAnchor="middle"
            fontSize={FS * 0.62}
            fontWeight={600}
            fill="#111827"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth={2.2}
          >
            Gaine verticale
          </text>
        </g>
      )}

      {/* Synthèse du tableau (calibres calculés uniquement) */}
      {layerOn(layers, "calibres") && (
        <g pointerEvents="none">
          <TableSummary technical={technical} S={S} FS={FS} />
        </g>
      )}
    </>
  );
}

function ElectricalGlyph({
  point,
  circuit,
  S,
  R,
  FS,
  selected,
  editable,
  showCalibers,
  onPointerDown,
}: {
  point: ElectricalPoint;
  circuit: ElectricalCircuit | null;
  S: number;
  R: number;
  FS: number;
  selected: boolean;
  editable: boolean;
  showCalibers: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGElement>) => void;
}) {
  const cx = point.x * S;
  const cy = point.y * S;
  const colors: Record<string, string> = {
    luminaire: "#ca8a04",
    luminaire_ext: "#ca8a04",
    interrupteur: "#a16207",
    prise: "#2563eb",
    prise_specialisee: "#dc2626",
    climatiseur: "#0d9488",
    chauffe_eau: "#dc2626",
    tableau: "#111827",
    terre: "#166534",
  };
  const color = colors[point.kind] ?? "#111827";
  const common = {
    stroke: color,
    strokeWidth: 1.4,
    fill: "#ffffff",
    onPointerDown,
    style: { cursor: editable ? "move" : "pointer" },
  } as const;
  const caliber =
    showCalibers && circuit?.computed && circuit.breakerA
      ? `${circuit.breakerA} A · ${circuit.sectionMm2} mm²`
      : null;

  return (
    <g>
      {point.kind === "luminaire" && (
        <g {...common}>
          <circle cx={cx} cy={cy} r={R * 0.72} />
          <line x1={cx - R * 0.5} y1={cy - R * 0.5} x2={cx + R * 0.5} y2={cy + R * 0.5} strokeWidth={1} />
          <line x1={cx + R * 0.5} y1={cy - R * 0.5} x2={cx - R * 0.5} y2={cy + R * 0.5} strokeWidth={1} />
        </g>
      )}
      {point.kind === "luminaire_ext" && (
        <g {...common}>
          <circle cx={cx} cy={cy} r={R * 0.78} />
          <line x1={cx - R * 0.55} y1={cy} x2={cx + R * 0.55} y2={cy} />
          <line x1={cx} y1={cy - R * 0.55} x2={cx} y2={cy + R * 0.55} />
          <path d={`M ${cx} ${cy - R * 1.35} l ${-R * 0.28} ${R * 0.45} l ${R * 0.56} 0 Z`} fill={color} stroke="none" />
        </g>
      )}
      {point.kind === "interrupteur" && (
        <g {...common}>
          <circle cx={cx} cy={cy} r={R * 0.3} />
          <line x1={cx} y1={cy} x2={cx + R * 0.95} y2={cy - R * 0.65} strokeWidth={1.8} />
          <circle cx={cx + R * 0.95} cy={cy - R * 0.65} r={R * 0.14} fill={color} stroke="none" />
        </g>
      )}
      {point.kind === "prise" && (
        <g {...common}>
          <path d={`M ${cx - R * 0.85} ${cy + R * 0.35} A ${R * 0.85} ${R * 0.85} 0 0 1 ${cx + R * 0.85} ${cy + R * 0.35}`} />
          <line x1={cx - R * 0.85} y1={cy + R * 0.35} x2={cx + R * 0.85} y2={cy + R * 0.35} />
          <line x1={cx - R * 0.28} y1={cy + R * 0.35} x2={cx - R * 0.28} y2={cy - R * 0.05} />
          <line x1={cx + R * 0.28} y1={cy + R * 0.35} x2={cx + R * 0.28} y2={cy - R * 0.05} />
        </g>
      )}
      {point.kind === "prise_specialisee" && (
        <g {...common}>
          <path d={`M ${cx - R * 0.95} ${cy + R * 0.4} A ${R * 0.95} ${R * 0.95} 0 0 1 ${cx + R * 0.95} ${cy + R * 0.4}`} />
          <path d={`M ${cx - R * 0.65} ${cy + R * 0.4} A ${R * 0.65} ${R * 0.65} 0 0 1 ${cx + R * 0.65} ${cy + R * 0.4}`} strokeWidth={0.9} />
          <line x1={cx - R * 0.95} y1={cy + R * 0.4} x2={cx + R * 0.95} y2={cy + R * 0.4} />
        </g>
      )}
      {point.kind === "climatiseur" && (
        <g {...common}>
          <rect x={cx - R * 1.05} y={cy - R * 0.55} width={R * 2.1} height={R * 1.1} rx={R * 0.22} />
          <text x={cx} y={cy + FS * 0.3} textAnchor="middle" fontSize={FS * 0.66} fontWeight={700} fill={color} stroke="none">
            AC
          </text>
        </g>
      )}
      {point.kind === "chauffe_eau" && (
        <g {...common}>
          <circle cx={cx} cy={cy} r={R * 0.82} />
          <text x={cx} y={cy + FS * 0.3} textAnchor="middle" fontSize={FS * 0.6} fontWeight={700} fill={color} stroke="none">
            CE
          </text>
        </g>
      )}
      {point.kind === "tableau" && (
        <g {...common}>
          <rect x={cx - R * 0.85} y={cy - R * 1.05} width={R * 1.7} height={R * 2.1} rx={1.4} fill="#1f2937" />
          <text x={cx} y={cy + FS * 0.32} textAnchor="middle" fontSize={FS * 0.72} fontWeight={700} fill="#ffffff" stroke="none">
            T
          </text>
        </g>
      )}
      {point.kind === "terre" && (
        <g {...common}>
          <line x1={cx} y1={cy - R * 0.8} x2={cx} y2={cy} />
          <line x1={cx - R * 0.75} y1={cy} x2={cx + R * 0.75} y2={cy} />
          <line x1={cx - R * 0.48} y1={cy + R * 0.32} x2={cx + R * 0.48} y2={cy + R * 0.32} />
          <line x1={cx - R * 0.22} y1={cy + R * 0.64} x2={cx + R * 0.22} y2={cy + R * 0.64} />
        </g>
      )}
      {selected && (
        <circle
          cx={cx}
          cy={cy}
          r={R * 1.55}
          fill="none"
          stroke={SELECTED}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
      {caliber && (
        <text
          x={cx + R * 1.15}
          y={cy - R * 0.9}
          fontSize={FS * 0.62}
          fill="#374151"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth={2}
          pointerEvents="none"
        >
          {caliber}
        </text>
      )}
      {point.kind === "tableau" && (
        <text
          x={cx}
          y={cy + R * 1.8}
          textAnchor="middle"
          fontSize={FS * 0.68}
          fontWeight={700}
          fill="#111827"
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth={2.2}
          pointerEvents="none"
        >
          {point.label.startsWith("Tableau secondaire") ? "TS" : "TGBT"}
        </text>
      )}
    </g>
  );
}

function TableSummary({
  technical,
  S,
  FS,
}: {
  technical: Extract<TechnicalPlan, { kind: "electricite" }>;
  S: number;
  FS: number;
}) {
  if (!technical.mainBreakerA) return null;
  const x = technical.panel.x * S + 14;
  const y = technical.panel.y * S - 8;
  return (
    <g>
      <rect
        x={x - 4}
        y={y - FS * 1.3}
        width={FS * 3.2}
        height={FS * 2.4}
        fill="#ffffff"
        stroke="#d1d5db"
        strokeWidth={0.8}
        rx={2}
      />
      <text x={x} y={y} fontSize={FS * 0.72} fontWeight={700} fill="#111827">
        {technical.mainBreakerA} A
      </text>
      <text x={x} y={y + FS * 0.82} fontSize={FS * 0.62} fill="#4b5563">
        {technical.diversifiedVA} VA foisonnés
      </text>
    </g>
  );
}

// ── Cotes, rose des vents, échelle ─────────────────────────────────────────

function DimChain({
  from,
  to,
  at,
  label,
  vertical,
}: {
  from: number;
  to: number;
  at: number;
  label: string;
  vertical?: boolean;
}) {
  const tick = 4;
  const mid = (from + to) / 2;
  return (
    <g stroke={DIMC} strokeWidth={0.8}>
      {vertical ? <line x1={at} y1={from} x2={at} y2={to} /> : <line x1={from} y1={at} x2={to} y2={at} />}
      {[from, to].map((t, i) =>
        vertical ? (
          <line key={i} x1={at - tick} y1={t + tick} x2={at + tick} y2={t - tick} strokeWidth={1.1} />
        ) : (
          <line key={i} x1={t - tick} y1={at + tick} x2={t + tick} y2={at - tick} strokeWidth={1.1} />
        ),
      )}
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

function ScaleBar({ x, y, S }: { x: number; y: number; S: number }) {
  return (
    <g stroke={DIMC} strokeWidth={0.9}>
      <line x1={x} y1={y} x2={x + 2 * S} y2={y} />
      {[0, 1, 2].map((i) => (
        <line key={i} x1={x + i * S} y1={y - 3} x2={x + i * S} y2={y + 3} />
      ))}
      <text x={x + 2 * S + 6} y={y + 3} fontSize={8} fill={DIMC} stroke="none">
        0 — 2 m (échelle graphique)
      </text>
    </g>
  );
}
