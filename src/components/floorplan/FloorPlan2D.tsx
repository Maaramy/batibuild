import { useId, useMemo, useRef, useState } from "react";
import type { FloorPlan, PlanRoom } from "@/lib/floorPlanEngine";
import { FurnitureLayer } from "./FurnitureLayer";
import { PLAN_MATERIALS as M } from "@/lib/planPresentation";
import { cn } from "@/lib/utils";

// ============================================================================
// PLAN 2D STYLE « MAQUETTE D'ARCHITECTE »
// Même identité graphique que la vue 3D et la feuille de présentation :
// sols bois clair / pierre / béton, murs blancs à double trait, mobilier
// matériel, étiquettes pièces lisibles, enseigne verte « ENTRÉE PRINCIPALE »
// au-dessus de la porte d'entrée (avec habillage bois) et signalétique verte
// « SORTIE DE SECOURS » avec cheminement vers l'extérieur.
// Sélection de pièces : clic/tap → onSelectRoom (synchro 2D ↔ 3D) ; la pièce
// sélectionnée est surlignée. Perçage des murs élargi pour des ouvertures
// propres (pas de chevauchement poché/ouverture).
// ============================================================================

const INK = M.ink; // trait d'encre (murs, cotes)
const PAPER = M.paper; // fond papier
const DIMC = M.muted; // cotes
const SEL = M.selection; // sélection
const EXIT = M.exit; // sortie de secours
const ENTRY = M.entry; // entrée principale

/** Bornes du zoom du plan 2D : jamais plus petit que le plan entier, jamais
 *  au-delà de 3× (au-delà, les cotes deviennent illisibles et le plan se
 *  coupe au point de perdre des pièces). Le zoom se fait dans le viewBox SVG :
 *  proportions et netteté vectorielle sont conservées. */
export const PLAN_ZOOM_MIN = 1;
export const PLAN_ZOOM_MAX = 3;
export const PLAN_ZOOM_STEP = 0.25;

/**
 * Matière du sol par nature de pièce : parquet chêne clair partout où l'on vit,
 * pierre claire dans les pièces d'eau, béton pour les annexes et terrasses,
 * pelouse pour les extérieurs non couverts, eau pour le bassin. Même palette
 * que le rendu 3D : un plan et sa maquette restent visuellement identiques.
 */
type FloorKind = "oak" | "stone" | "concrete" | "grass" | "water";

const STONE_KINDS = new Set(["sdb", "wc", "sanitaire", "plonge", "buanderie", "chambre_froide"]);
const CONCRETE_KINDS = new Set(["garage", "local_technique", "terrasse", "logistique"]);

export function roomFloorKind(room: PlanRoom): FloorKind {
  if (room.kind === "bassin") return "water";
  if (room.exterior || room.kind === "patio") return "grass";
  if (STONE_KINDS.has(room.kind)) return "stone";
  if (CONCRETE_KINDS.has(room.kind)) return "concrete";
  return "oak";
}

export interface FloorPlan2DProps {
  plan: FloorPlan;
  /** Pièce sélectionnée (synchronisation 3D → 2D). */
  selectedRoomId?: string | null;
  onSelectRoom?: (roomId: string | null) => void;
  /** Afficher les chaînes de cotes globales (par défaut : oui). */
  showDimensions?: boolean;
  /** Facteur de zoom (1 = plan entier, 3 = maximum). Centré sur le plan. */
  zoom?: number;
  /** Zoom à la main (pincement) : remonte le nouveau facteur au parent. */
  onZoomChange?: (zoom: number) => void;
  className?: string;
}

export function FloorPlan2D({
  plan,
  selectedRoomId,
  onSelectRoom,
  showDimensions = true,
  zoom = 1,
  onZoomChange,
  className,
}: FloorPlan2DProps) {
  const clipId = useId();
  const oakId = useId();
  const stoneId = useId();
  const concreteId = useId();
  const grassId = useId();
  const shadowId = useId();
  const floorUrl = (room: PlanRoom) => {
    switch (roomFloorKind(room)) {
      case "stone":
        return `url(#${stoneId})`;
      case "concrete":
        return `url(#${concreteId})`;
      case "grass":
        return `url(#${grassId})`;
      case "water":
        return "#BAE0EF";
      default:
        return `url(#${oakId})`;
    }
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  // Empêche la sélection d'une pièce lorsqu'un glissement vient d'avoir lieu.
  const suppressClickRef = useRef(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

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

  const handleRoomClick = (roomId: string) => {
    if (suppressClickRef.current) return;
    onSelectRoom?.(selectedRoomId === roomId ? null : roomId);
  };

  // Zoom centré sur le plan : le viewBox se resserre symétriquement, donc le
  // plan grossit sans se déformer et reste net (aucune pixellisation).
  const z = Math.min(PLAN_ZOOM_MAX, Math.max(PLAN_ZOOM_MIN, zoom));
  const VB_W = W + PAD * 2;
  const VB_H = H + PAD * 2;
  const VIEW_W = VB_W / z;
  const VIEW_H = VB_H / z;
  // Déplacement à la main : borné aux bords du plan, jamais dans le vide.
  const MAX_PAN_X = Math.max(0, (VB_W - VIEW_W) / 2);
  const MAX_PAN_Y = Math.max(0, (VB_H - VIEW_H) / 2);
  const clampPan = (x: number, y: number) => ({
    x: Math.max(-MAX_PAN_X, Math.min(MAX_PAN_X, x)),
    y: Math.max(-MAX_PAN_Y, Math.min(MAX_PAN_Y, y)),
  });
  const clampedPan = clampPan(pan.x, pan.y);
  const VIEW_X = -PAD + (VB_W - VIEW_W) / 2 + clampedPan.x;
  const VIEW_Y = -PAD + (VB_H - VIEW_H) / 2 + clampedPan.y;

  const clampZoom = (value: number) =>
    Math.round(Math.min(PLAN_ZOOM_MAX, Math.max(PLAN_ZOOM_MIN, value)) * 100) / 100;

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      // Deux doigts : pincement = zoom centré sur le plan.
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        zoom: z,
      };
      dragRef.current = null;
      suppressClickRef.current = true;
      setDragging(false);
      return;
    }
    if (event.isPrimary && z > PLAN_ZOOM_MIN) {
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
        moved: false,
      };
      setDragging(true);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const tracked = pointersRef.current.get(event.pointerId);
    if (!tracked) return;
    tracked.x = event.clientX;
    tracked.y = event.clientY;

    if (pointersRef.current.size >= 2 && pinchRef.current && onZoomChange) {
      const [a, b] = [...pointersRef.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const next = clampZoom(pinchRef.current.zoom * (distance / pinchRef.current.distance));
      if (Math.abs(next - z) > 0.005) onZoomChange(next);
      return;
    }

    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || !svg) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 4) {
      drag.moved = true;
      suppressClickRef.current = true;
    }
    if (!drag.moved) return;
    const rect = svg.getBoundingClientRect();
    const ratio = rect.width > 0 ? VIEW_W / rect.width : 1;
    setPan(clampPan(drag.panX - dx * ratio, drag.panY - dy * ratio));
  };

  const endPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setDragging(false);
    }
    // Laisse le clic éventuel se produire avant de réarmer la sélection.
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`}
      data-zoom={z}
      className={cn("w-full h-auto select-none", className)}
      role="img"
      aria-label={`Plan 2D — ${plan.rooms.length} pièces`}
      style={{
        fontFamily: "inherit",
        cursor: z > PLAN_ZOOM_MIN ? (dragging ? "grabbing" : "grab") : "default",
        touchAction: z > PLAN_ZOOM_MIN ? "none" : "pan-y",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
    >
      {/* ── Papier + emprise ── */}
      <rect x={-PAD / 2} y={-PAD / 2} width={W + PAD} height={H + PAD} rx={3} fill={PAPER} />
      <defs>
        {/* Parquet chêne : lames larges, veinage discret. */}
        <pattern id={oakId} width={S * 1.5} height={S * 0.22} patternUnits="userSpaceOnUse">
          <rect width={S * 1.5} height={S * 0.22} fill={M.oak} />
          <path
            d={`M 0 ${S * 0.11} H ${S * 1.5} M ${S * 0.75} 0 V ${S * 0.22}`}
            stroke={M.oakDark}
            strokeWidth={0.45}
            opacity={0.45}
            fill="none"
          />
          <path d={`M 0 ${S * 0.05} H ${S * 1.5}`} stroke={M.oakLight} strokeWidth={0.9} opacity={0.55} />
        </pattern>
        {/* Pierre claire : carrelage 40 cm, joints fins. */}
        <pattern id={stoneId} width={S * 0.8} height={S * 0.8} patternUnits="userSpaceOnUse">
          <rect width={S * 0.8} height={S * 0.8} fill={M.stone} />
          <path d={`M 0 0 H ${S * 0.8} V ${S * 0.8}`} stroke={M.stoneEdge} strokeWidth={0.6} fill="none" />
        </pattern>
        {/* Béton : dalle mate. */}
        <pattern id={concreteId} width={S} height={S} patternUnits="userSpaceOnUse">
          <rect width={S} height={S} fill={M.concrete} />
          <circle cx={S * 0.28} cy={S * 0.34} r={0.55} fill="#C7C2B7" opacity={0.5} />
          <circle cx={S * 0.72} cy={S * 0.61} r={0.45} fill="#E2DED5" opacity={0.6} />
        </pattern>
        {/* Pelouse : extérieurs non couverts. */}
        <pattern id={grassId} width={S * 0.5} height={S * 0.5} patternUnits="userSpaceOnUse">
          <rect width={S * 0.5} height={S * 0.5} fill={M.grass} opacity={0.55} />
          <path
            d={`M ${S * 0.14} ${S * 0.4} q 1 -3 2 0 M ${S * 0.36} ${S * 0.22} q 1 -3 2 0`}
            stroke="#8CA36F"
            strokeWidth={0.6}
            fill="none"
            opacity={0.6}
          />
        </pattern>
        <filter id={shadowId} x="-18%" y="-18%" width="136%" height="136%">
          <feDropShadow dx="0.5" dy="0.9" stdDeviation="0.11" floodColor={M.ink} floodOpacity="0.2" />
        </filter>
      </defs>
      <clipPath id={clipId}>
        <rect x={0} y={0} width={W} height={H} />
      </clipPath>
      <rect x={0} y={0} width={W} height={H} fill={PAPER} />

      {/* ── Passe 1 : remplissages de pièces (teinte légère) ── */}
      <g clipPath={`url(#${clipId})`}>
        {rooms.map((r) => (
          <rect
            key={`f-${r.id}`}
            x={r.x * S}
            y={r.y * S}
            width={r.w * S}
            height={r.h * S}
            fill={floorUrl(r)}
          />
        ))}
        {/* Bassin : lignes d'eau (lecture immédiate du plan de piscine) */}
        {rooms
          .filter((r) => r.kind === "bassin")
          .map((r) => {
            const rx = r.x * S, ry = r.y * S, rw = r.w * S, rh = r.h * S;
            const lines = Math.max(2, Math.floor(rh / 16));
            return (
              <g key={`water-${r.id}`} stroke="#0284c7" strokeWidth={0.75} opacity={0.4} fill="none">
                {Array.from({ length: lines }, (_, i) => {
                  const y = ry + rh * ((i + 0.8) / (lines + 0.6));
                  return (
                    <path
                      key={i}
                      d={`M ${rx + rw * 0.07} ${y} q ${rw * 0.09} -3 ${rw * 0.18} 0 t ${rw * 0.18} 0 t ${rw * 0.18} 0 t ${rw * 0.18} 0`}
                    />
                  );
                })}
              </g>
            );
          })}

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
      <g clipPath={`url(#${clipId})`} filter={`url(#${shadowId})`}>
        <FurnitureLayer plan={plan} S={S} />
      </g>

      {/* ── Passe 2 : murs blancs pochés, trait d'encre sur chaque face ── */}
      <g clipPath={`url(#${clipId})`}>
        {rooms.map((r) => {
          if (r.kind === "bassin") {
            return (
              <rect
                key={`w-${r.id}`}
                x={r.x * S}
                y={r.y * S}
                width={r.w * S}
                height={r.h * S}
                fill="none"
                stroke="#0284c7"
                strokeWidth={1.6}
              />
            );
          }
          if (r.exterior) {
            return (
              <rect
                key={`w-${r.id}`}
                x={r.x * S}
                y={r.y * S}
                width={r.w * S}
                height={r.h * S}
                fill="none"
                stroke="#7F9268"
                strokeWidth={1.1}
                strokeDasharray="4 3"
              />
            );
          }
          const band = INT;
          return (
            <g key={`w-${r.id}`}>
              <rect
                x={r.x * S}
                y={r.y * S}
                width={r.w * S}
                height={r.h * S}
                fill="none"
                stroke={M.wall}
                strokeWidth={band + 1.4}
              />
              <rect
                x={r.x * S + band / 2}
                y={r.y * S + band / 2}
                width={Math.max(0, r.w * S - band)}
                height={Math.max(0, r.h * S - band)}
                fill="none"
                stroke={INK}
                strokeWidth={0.85}
              />
            </g>
          );
        })}
      </g>
      {/* Murs extérieurs : 20 cm, faces d'encre, aucun cadre parasite */}
      {plan.rooms.some((r) => r.kind === "bassin") ? (
        <rect x={0} y={0} width={W} height={H} fill="none" stroke={INK} strokeWidth={1.2} />
      ) : (
        <>
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="none"
            stroke={M.wall}
            strokeWidth={EXT + 1.4}
            clipPath={`url(#${clipId})`}
          />
          <rect
            x={EXT / 2}
            y={EXT / 2}
            width={Math.max(0, W - EXT)}
            height={Math.max(0, H - EXT)}
            fill="none"
            stroke={INK}
            strokeWidth={0.95}
          />
          <rect x={0} y={0} width={W} height={H} fill="none" stroke={INK} strokeWidth={1.1} />
        </>
      )}

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
                  band={isEdge(d.wall === "N" ? r.y : d.wall === "S" ? r.y + r.h - plan.width : d.wall === "W" ? r.x : d.wall === "E" ? r.x + r.w - plan.length : 0) ? EXT : INT}
                  inward={d.wall === "N" ? 1 : d.wall === "S" ? -1 : d.wall === "W" ? 1 : -1}
                  vertical={d.wall === "W" || d.wall === "E"}
                  isEntry={!!d.isEntry}
                  isEmergency={!!d.isEmergency}
                />
              ))}
            </g>
          );
        })}
      </g>

      {/* ── Passe 4 : zones cliquables + étiquettes des pièces ── */}
      <g clipPath={`url(#${clipId})`}>
        {/* Zone de clic transparente par pièce (synchro 2D ↔ 3D) */}
        {rooms.map((r) => (
          <rect
            key={`hit-${r.id}`}
            x={r.x * S}
            y={r.y * S}
            width={r.w * S}
            height={r.h * S}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => handleRoomClick(r.id)}
          >
            <title>{`${r.label} — ${r.area.toFixed(2)} m²`}</title>
          </rect>
        ))}
        {selectedRoomId && (() => {
          const r = rooms.find((x) => x.id === selectedRoomId);
          if (!r) return null;
          return (
            <rect
              x={r.x * S + 1.5}
              y={r.y * S + 1.5}
              width={Math.max(0, r.w * S - 3)}
              height={Math.max(0, r.h * S - 3)}
              fill={SEL}
              opacity={0.16}
              stroke={SEL}
              strokeWidth={1.6}
              strokeDasharray="6 3"
              rx={2}
              pointerEvents="none"
            />
          );
        })()}
        {rooms.map((r) => {
          const cx = (r.x + r.w / 2) * S;
          const cy = (r.y + r.h / 2) * S;
          const big = r.w * S > 58 && r.h * S > 36;
          const mid = r.w * S > 34 && r.h * S > 22;
          const nameSize = Math.max(7.5, Math.min(11, S * 0.32));
          if (!mid) return null;
          return (
            <g key={`l-${r.id}`} textAnchor="middle" pointerEvents="none">
              <text
                x={cx}
                y={big ? cy - 2 : cy + 3}
                fontSize={nameSize}
                fontWeight={700}
                letterSpacing={0.8}
                fill={M.ink}
                stroke={M.paper}
                strokeWidth={2.2}
                paintOrder="stroke"
              >
                {r.label.toUpperCase()}
              </text>
              {big && (
                <>
                  <text
                    x={cx}
                    y={cy + nameSize + 4}
                    fontSize={nameSize - 1.5}
                    fill="#4C443A"
                    stroke={M.paper}
                    strokeWidth={1.8}
                    paintOrder="stroke"
                  >
                    {r.area.toFixed(2)} m²
                  </text>
                  {(r.w * S > 86 && r.h * S > 52) && (
                    <text
                      x={cx}
                      y={cy + nameSize + 15}
                      fontSize={nameSize - 2.5}
                      fill={M.muted}
                      stroke={M.paper}
                      strokeWidth={1.6}
                      paintOrder="stroke"
                    >
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
      {showDimensions && (
        <>
          <DimChain from={0} to={W} at={-EXT / 2 - 14} label={`${plan.length.toFixed(2)} m`} />
          <DimChain vertical from={0} to={H} at={-EXT / 2 - 14} label={`${plan.width.toFixed(2)} m`} />
        </>
      )}

      {/* ── Rose des vents ── */}
      <NorthArrow cx={W + PAD * 0.55} cy={-PAD * 0.45} r={11} />

      {/* ── Entrée principale : habillage bois + enseigne verte ── */}
      {rooms.map((r) =>
        r.doors.filter((d) => d.isEntry).map((d, i) => {
          const horizontal = d.wall === "N" || d.wall === "S";
          const cx = horizontal
            ? (r.x + d.position + d.width / 2) * S
            : (d.wall === "W" ? r.x : r.x + r.w) * S;
          const cy = horizontal
            ? (d.wall === "N" ? r.y : r.y + r.h) * S
            : (r.y + d.position + d.width / 2) * S;
          const outward = d.wall === "N" || d.wall === "W" ? -1 : 1;
          const doorHalf = (d.width * S) / 2 + 4;
          // Pergola bois : lames parallèles juste devant la porte, jamais sur
          // une circulation technique ni une porte de secours.
          const slats = 5;
          const wood = (
            <g>
              <rect
                x={horizontal ? cx - doorHalf : cx + outward * 2}
                y={horizontal ? cy + outward * 2 : cy - doorHalf}
                width={horizontal ? doorHalf * 2 : 6}
                height={horizontal ? 6 : doorHalf * 2}
                rx={1}
                fill={M.wood}
              />
              {Array.from({ length: slats }, (_, k) => {
                const t = (k + 0.5) / slats;
                return horizontal ? (
                  <line
                    key={k}
                    x1={cx - doorHalf + doorHalf * 2 * t}
                    y1={cy + outward * 2.4}
                    x2={cx - doorHalf + doorHalf * 2 * t}
                    y2={cy + outward * 7.6}
                    stroke={M.woodDark}
                    strokeWidth={0.6}
                  />
                ) : (
                  <line
                    key={k}
                    x1={cx + outward * 2.4}
                    y1={cy - doorHalf + doorHalf * 2 * t}
                    x2={cx + outward * 7.6}
                    y2={cy - doorHalf + doorHalf * 2 * t}
                    stroke={M.woodDark}
                    strokeWidth={0.6}
                  />
                );
              })}
            </g>
          );
          // Enseigne posée à l'extérieur, au-delà des chaînes de cotes.
          const signX = horizontal ? cx : cx + outward * 34;
          const signY = horizontal ? cy + outward * 34 : cy;
          return (
            <g key={`e-${r.id}-${i}`} pointerEvents="none">
              {wood}
              <g transform={horizontal ? undefined : `rotate(-90 ${signX} ${signY})`}>
                <rect
                  x={signX - 42}
                  y={signY - 7}
                  width={84}
                  height={14}
                  rx={2.6}
                  fill={ENTRY}
                  stroke="#FFFFFF"
                  strokeWidth={0.7}
                />
                <text
                  x={signX}
                  y={signY + 2.3}
                  textAnchor="middle"
                  fontSize={6.3}
                  fontWeight={700}
                  letterSpacing={0.5}
                  fill="#FFFFFF"
                >
                  ENTRÉE PRINCIPALE
                </text>
              </g>
            </g>
          );
        }),
      )}

      {/* ── Sortie de secours : signalétique verte + cheminement extérieur ── */}
      {rooms.map((r) =>
        r.doors.filter((d) => d.isEmergency).map((d, i) => {
          const horizontal = d.wall === "N" || d.wall === "S";
          const cx = horizontal
            ? (r.x + d.position + d.width / 2) * S
            : (d.wall === "W" ? r.x : r.x + r.w) * S;
          const cy = horizontal
            ? (d.wall === "N" ? r.y : r.y + r.h) * S
            : (r.y + d.position + d.width / 2) * S;
          if (d.width * S < 14) return null;
          const outward = d.wall === "N" || d.wall === "W" ? -1 : 1;
          const signX = horizontal ? cx : cx + outward * 34;
          const signY = horizontal ? cy + outward * 34 : cy;
          // Cheminement continu vers l'extérieur : flèche depuis le seuil.
          const fromX = horizontal ? cx : cx + outward * 4;
          const fromY = horizontal ? cy + outward * 4 : cy;
          const toX = horizontal ? cx : cx + outward * 19;
          const toY = horizontal ? cy + outward * 19 : cy;
          return (
            <g key={`x-${r.id}-${i}`} pointerEvents="none">
              <line
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                stroke={EXIT}
                strokeWidth={1.4}
                strokeDasharray="3 2"
              />
              <path
                d={
                  horizontal
                    ? `M ${toX} ${toY} l -2.6 ${outward * -4.4} l 5.2 0 z`
                    : `M ${toX} ${toY} l ${outward * -4.4} -2.6 l 0 5.2 z`
                }
                fill={EXIT}
              />
              <g transform={horizontal ? undefined : `rotate(-90 ${signX} ${signY})`}>
                <rect
                  x={signX - 42}
                  y={signY - 7}
                  width={84}
                  height={14}
                  rx={2.6}
                  fill={EXIT}
                  stroke="#FFFFFF"
                  strokeWidth={0.7}
                />
                <text
                  x={signX}
                  y={signY + 2.3}
                  textAnchor="middle"
                  fontSize={6.3}
                  fontWeight={700}
                  letterSpacing={0.5}
                  fill="#FFFFFF"
                >
                  SORTIE DE SECOURS
                </text>
              </g>
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
  p1, len, line, band, inward, vertical, isEntry, isEmergency,
}: {
  wall: string; p1: number; len: number; line: number; band: number; inward: number; vertical: boolean; isEntry: boolean; isEmergency?: boolean;
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
  const leafColor = isEmergency ? EXIT : isEntry ? "#15803d" : INK;
  return (
    <g>
      {patch}
      {/* Vantail */}
      <line x1={hx} y1={hy} x2={lx} y2={ly} stroke={leafColor} strokeWidth={1.3} />
      {/* Arc de gissement */}
      <path
        d={`M ${lx} ${ly} A ${len} ${len} 0 0 ${sweep} ${bx} ${by}`}
        fill="none"
        stroke={isEmergency ? EXIT : isEntry ? "#15803d" : DIMC}
        strokeWidth={0.9}
        strokeDasharray={isEntry ? undefined : "3 2.5"}
      />
      {/* Seuil */}
      <line
        x1={vertical ? line : p1}
        y1={vertical ? p1 : line}
        x2={vertical ? line : p1 + len}
        y2={vertical ? p1 + len : line}
        stroke={isEmergency ? EXIT : isEntry ? "#15803d" : "#d6d3d1"}
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
