import type { ReactNode } from "react";
import {
  Briefcase,
  Building2,
  Coffee,
  DoorOpen,
  HardHat,
  Home,
  Layers3,
  Store,
  UtensilsCrossed,
  Warehouse,
  Waves,
} from "lucide-react";
import type { FloorPlan, PlanRoom } from "@/lib/floorPlanEngine";
import {
  PLAN_MATERIALS as M,
  planEmergencyExit,
  planEntry,
  planHasExteriorThumbnail,
  planKeyElements,
  planLegend,
  planLevelLabel,
  planTypeMeta,
  type PlanLegendEntry,
  type PlanLegendSymbol,
  type PlanProjectGroup,
} from "@/lib/planPresentation";
import { cn } from "@/lib/utils";

// ============================================================================
// FEUILLE DE PRÉSENTATION COMMUNE DES PLANS (2D & 3D)
// ----------------------------------------------------------------------------
// Modèle graphique unique, repris de la maquette architecturale de référence :
//   · feuille blanc cassé, en-tête type de projet + niveau ;
//   · plan en grand format à gauche, panneau d'information beige à droite ;
//   · « Éléments clés » et légende graphique déduits du plan réel ;
//   · vignette extérieure axonométrique pour les typologies compatibles.
// Sur mobile le plan passe en premier, le panneau en dessous (aucune
// information masquée, aucune commande déplacée).
//
// Les surfaces affichées viennent des pièces du plan : ce composant ne modifie
// ni la géométrie, ni les surfaces, ni les métrés.
// ============================================================================

const GROUP_ICON: Record<PlanProjectGroup, typeof Home> = {
  residentiel: Home,
  restauration: UtensilsCrossed,
  commerce: Store,
  bureau: Briefcase,
  tourisme: Building2,
  piscine: Waves,
  generique: HardHat,
};

/** Icône du type exact, repli sur l'icône de famille. */
const TYPE_ICON: Record<string, typeof Home> = {
  maison: Home,
  maison_r_plus_1: Home,
  maison_r_plus_2: Home,
  villa: Building2,
  appartement: Building2,
  studio: DoorOpen,
  duplex: Layers3,
  immeuble: Building2,
  local_commercial: Store,
  commerce: Store,
  entrepot: Warehouse,
  bureau: Briefcase,
  cafe: Coffee,
  restaurant: UtensilsCrossed,
  piscine: Waves,
};

export interface PlanSheetProps {
  plan: FloorPlan;
  category?: string | null;
  projectName?: string;
  variantName?: string;
  /** Sélecteur de vue (Plan 2D / plan de masse / vue 3D). */
  viewSwitch?: ReactNode;
  /** Sélecteur de niveau (RDC, R+1…). */
  levelSwitch?: ReactNode;
  /** Commandes de zoom du plan (loupe +, loupe −, recadrage). */
  controls?: ReactNode;
  /** Plan 2D, 3D ou plan de masse. */
  children: ReactNode;
  /** Vignette extérieure : typologies compatibles uniquement. */
  showThumbnail?: boolean;
  className?: string;
}

export function PlanSheet({
  plan,
  category,
  projectName,
  variantName,
  viewSwitch,
  levelSwitch,
  controls,
  children,
  showThumbnail = planHasExteriorThumbnail(category),
  className,
}: PlanSheetProps) {
  const meta = planTypeMeta(category);
  const Icon = TYPE_ICON[(category ?? "").trim()] ?? GROUP_ICON[meta.group];
  const levelLabel = planLevelLabel(plan.level);
  const keyElements = planKeyElements(plan, category);
  const legend = planLegend(plan, category);

  return (
    <article
      data-slot="plan-sheet"
      className={cn(
        "overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(35,32,28,0.05),0_12px_32px_-24px_rgba(35,32,28,0.35)]",
        className,
      )}
      style={{ background: M.paper, borderColor: M.panelEdge, color: M.ink }}
    >
      {/* ── En-tête : type de projet, nom, niveau ── */}
      <header
        className="flex flex-wrap items-center gap-3 border-b px-3 py-2.5 sm:px-4"
        style={{ borderColor: M.panelEdge }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
          style={{ background: M.panel, borderColor: M.panelEdge, color: M.ink }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: M.muted }}
          >
            Plan architectural · {meta.label}
          </p>
          <h3 className="truncate text-[13px] font-semibold leading-tight sm:text-sm">
            {projectName ?? variantName ?? meta.label}
          </h3>
        </div>
        <div className="ml-auto text-right">
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: M.muted }}
          >
            Niveau affiché
          </p>
          <p className="text-[11px] font-semibold leading-tight">{levelLabel}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem]">
        {/* ── Zone principale : plan ── */}
        <div className="min-w-0 p-2.5 sm:p-3.5">
          {(viewSwitch || levelSwitch) && (
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              {viewSwitch}
              {levelSwitch}
            </div>
          )}
          <div
            className="relative overflow-hidden rounded-xl border"
            style={{ background: M.paper, borderColor: M.panelEdge }}
          >
            {children}
          </div>
          {controls && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[10px] leading-tight" style={{ color: M.muted }}>
                Glissez ou pincez le plan · boutons pour zoomer
              </p>
              {controls}
            </div>
          )}
        </div>

        {/* ── Panneau d'information latéral ── */}
        <aside
          className="border-t p-3 sm:p-4 lg:border-l lg:border-t-0"
          style={{ background: M.panel, borderColor: M.panelEdge }}
        >
          {/* 1–3. Icône, type de projet, niveau */}
          <div className="flex items-start gap-2.5">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white/70"
              style={{ borderColor: M.panelEdge }}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: M.muted }}
              >
                Type de projet
              </p>
              <p className="text-[13px] font-semibold leading-tight">{meta.label}</p>
              <p className="text-[10px] leading-snug" style={{ color: M.muted }}>
                {meta.caption}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1">
            <SheetTag label={levelLabel} />
            <SheetTag label={`${plan.rooms.filter((r) => !r.exterior).length} pièces`} />
            {planEntry(plan) ? <SheetTag label="Entrée repérée" tone="entry" /> : null}
            {planEmergencyExit(plan) ? <SheetTag label="Évacuation vérifiée" tone="exit" /> : null}
          </div>

          {/* 4. Éléments clés */}
          <SheetSectionTitle>Éléments clés</SheetSectionTitle>
          <dl className="space-y-1">
            {keyElements.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-2 border-b border-dashed pb-1 last:border-0"
                style={{ borderColor: M.panelEdge }}
              >
                <dt className="text-[10px] leading-snug" style={{ color: M.muted }}>
                  {item.label}
                </dt>
                <dd className="shrink-0 text-[10px] font-semibold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>

          {/* 5. Légende graphique */}
          <SheetSectionTitle>Légende</SheetSectionTitle>
          <ul className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2 lg:grid-cols-1">
            {legend.map((entry) => (
              <li key={`${entry.symbol}-${entry.label}`} className="flex items-center gap-1.5">
                <LegendGlyph entry={entry} />
                <span className="text-[10px] leading-snug">{entry.label}</span>
              </li>
            ))}
          </ul>

          {/* 6. Vignette extérieure */}
          {showThumbnail && (
            <>
              <SheetSectionTitle>Vue extérieure 3D</SheetSectionTitle>
              <PlanAxon plan={plan} />
              <p className="mt-1 text-[9px] leading-snug" style={{ color: M.faint }}>
                Maquette indicative — volumes, ouvertures et bois d'entrée du niveau.
              </p>
            </>
          )}
        </aside>
      </div>
    </article>
  );
}

function SheetSectionTitle({ children }: { children: ReactNode }) {
  return (
    <p
      className="mb-1.5 mt-3.5 text-[9px] font-semibold uppercase tracking-[0.16em]"
      style={{ color: M.muted }}
    >
      {children}
    </p>
  );
}

function SheetTag({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "entry" | "exit";
}) {
  const color = tone === "entry" ? M.entry : tone === "exit" ? M.exit : M.muted;
  return (
    <span
      className="inline-flex items-center rounded-full border bg-white/60 px-1.5 py-0.5 text-[9px] font-medium"
      style={{ borderColor: M.panelEdge, color }}
    >
      {label}
    </span>
  );
}

// ── Légende : pictogrammes cohérents avec le plan ──────────────────────────

function LegendGlyph({ entry }: { entry: PlanLegendEntry }) {
  const color =
    entry.tone === "entry"
      ? M.entry
      : entry.tone === "exit"
        ? M.exit
        : entry.tone === "wood"
          ? M.wood
          : entry.tone === "oak"
            ? M.oakDark
            : entry.tone === "water"
              ? "#2E86AB"
              : entry.tone === "muted"
                ? M.muted
                : M.ink;
  const paths: Record<PlanLegendSymbol, ReactNode> = {
    wall: (
      <>
        <rect x="2.5" y="5" width="15" height="2.4" fill={color} opacity="0.14" stroke="none" />
        <path d="M2.5 5h15M2.5 7.4h15" stroke={color} strokeWidth="1" />
      </>
    ),
    door: (
      <>
        <path d="M5 15V5h6" stroke={color} strokeWidth="1.2" fill="none" />
        <path d="M5 5a7 7 0 0 1 7 7" stroke={color} strokeWidth="0.8" strokeDasharray="2 1.6" fill="none" />
      </>
    ),
    window: (
      <>
        <path d="M3 7h14M3 10h14M3 13h14" stroke={color} strokeWidth="1" />
      </>
    ),
    entry: (
      <>
        <rect x="2.5" y="3.5" width="13" height="4.6" rx="1" fill={color} />
        <text x="9" y="7" textAnchor="middle" fontSize="4" fontWeight="700" fill="#fff">
          ENT
        </text>
        <path d="M9 10v5.5M6.5 13L9 15.5 11.5 13" stroke={color} strokeWidth="1.2" fill="none" />
      </>
    ),
    emergency: (
      <>
        <rect x="2.5" y="3.5" width="13" height="4.6" rx="1" fill={color} />
        <text x="9" y="7" textAnchor="middle" fontSize="4" fontWeight="700" fill="#fff">
          SORTIE
        </text>
        <path d="M4 15h9M10 12l3 3-3 3" stroke={color} strokeWidth="1.2" fill="none" />
      </>
    ),
    service: (
      <>
        <path d="M4 15V5h6" stroke={color} strokeWidth="1.2" fill="none" />
        <rect x="11" y="8" width="5" height="5" fill="none" stroke={color} strokeWidth="1" />
      </>
    ),
    stairs: (
      <>
        <path d="M3 15h3v-3h3V9h3V6h3" stroke={color} strokeWidth="1.2" fill="none" />
      </>
    ),
    furniture: (
      <>
        <rect x="4" y="6" width="9" height="7" rx="1" fill="none" stroke={color} strokeWidth="1" />
        <path d="M4 9h9" stroke={color} strokeWidth="0.8" />
      </>
    ),
    corridor: (
      <>
        <path d="M3 5h2v8H3M13 5h2v8h-2" stroke={color} strokeWidth="1.1" fill="none" />
        <path d="M6 9h6" stroke={color} strokeWidth="1" strokeDasharray="2 1.5" />
      </>
    ),
    wood: (
      <>
        <rect x="3" y="4" width="2.6" height="12" rx="0.6" fill={color} />
        <rect x="7.2" y="4" width="2.6" height="12" rx="0.6" fill={color} opacity="0.75" />
        <rect x="11.4" y="4" width="2.6" height="12" rx="0.6" fill={color} opacity="0.55" />
      </>
    ),
    terrace: (
      <>
        <rect x="3" y="4.5" width="12" height="10" rx="1" fill={color} opacity="0.18" stroke="none" />
        <rect
          x="3.5"
          y="5"
          width="11"
          height="9"
          rx="1"
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeDasharray="2.4 1.6"
        />
      </>
    ),
    counter: (
      <>
        <rect x="3" y="7" width="12" height="3" rx="0.8" fill={color} />
        <path d="M5 10v4M13 10v4" stroke={color} strokeWidth="1" />
      </>
    ),
    pool: (
      <>
        <rect x="2.5" y="5" width="13" height="9" rx="2" fill={color} opacity="0.22" stroke="none" />
        <path
          d="M4 9c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0M4 12c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0"
          stroke="#2E86AB"
          strokeWidth="1"
          fill="none"
        />
      </>
    ),
  };
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      {paths[entry.symbol]}
    </svg>
  );
}

// ── Vignette extérieure : axonométrie de la maquette ───────────────────────

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);
const THUMB_W = 240;
const THUMB_H = 138;
const WALL_H_THUMB = 1.15;

function axono(x: number, y: number, z = 0) {
  return { x: (x - y) * COS30, y: (x + y) * SIN30 - z };
}

function roomFill(room: PlanRoom): string {
  if (room.kind === "bassin") return "#9BD3E8";
  if (room.kind === "terrasse" || room.exterior) return M.concrete;
  if (
    room.kind === "sdb" ||
    room.kind === "wc" ||
    room.kind === "sanitaire" ||
    room.kind === "plonge" ||
    room.kind === "buanderie"
  ) {
    return M.stone;
  }
  if (room.kind === "garage") return M.concrete;
  return M.oak;
}

/** Maquette axonométrique compacte : sols matière, murs blancs coupés, bois à l'entrée. */
export function PlanAxon({ plan }: { plan: FloorPlan }) {
  const { length: L, width: W } = plan;
  const project = (x: number, y: number, z = 0) => axono(x, y, z);
  // Cadrage : tout l'emprise + hauteur des murs, centré dans la vignette.
  const candidates = [
    project(0, 0),
    project(L, 0),
    project(0, W),
    project(L, W),
    project(0, 0, WALL_H_THUMB),
    project(L, W, WALL_H_THUMB),
  ];
  const xs = candidates.map((p) => p.x);
  const ys = candidates.map((p) => p.y);
  const minX = Math.min(...xs) - 10;
  const maxX = Math.max(...xs) + 10;
  const minY = Math.min(...ys) - 8;
  const maxY = Math.max(...ys) + 8;
  const scale = Math.min(THUMB_W / (maxX - minX), THUMB_H / (maxY - minY));
  const tx = (THUMB_W - (maxX - minX) * scale) / 2 - minX * scale;
  const ty = (THUMB_H - (maxY - minY) * scale) / 2 - minY * scale;
  const T = (p: { x: number; y: number }) => ({ x: p.x * scale + tx, y: p.y * scale + ty });

  // Arêtes de murs uniques (murs extérieurs + cloisons réelles).
  const seen = new Set<string>();
  const walls: { x1: number; y1: number; x2: number; y2: number; depth: number }[] = [];
  const pushWall = (x1: number, y1: number, x2: number, y2: number) => {
    const key = [x1, y1, x2, y2].map((v) => v.toFixed(2)).sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    walls.push({ x1, y1, x2, y2, depth: x1 + x2 + y1 + y2 });
  };
  for (const r of plan.rooms) {
    pushWall(r.x, r.y, r.x + r.w, r.y);
    pushWall(r.x, r.y + r.h, r.x + r.w, r.y + r.h);
    pushWall(r.x, r.y, r.x, r.y + r.h);
    pushWall(r.x + r.w, r.y, r.x + r.w, r.y + r.h);
  }
  walls.sort((a, b) => a.depth - b.depth);

  const entry = planEntry(plan);
  const exit = planEmergencyExit(plan);

  return (
    <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: M.panelEdge }}>
      <svg
        viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Vue extérieure axonométrique du plan"
      >
        <defs>
          <linearGradient id="axon-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FDFCF9" />
            <stop offset="100%" stopColor="#F4EFE5" />
          </linearGradient>
        </defs>
        <rect width={THUMB_W} height={THUMB_H} fill="url(#axon-sky)" />

        {/* Végétation extérieure (maquette) */}
        {plan.rooms.some((r) => !r.exterior) &&
          [0.03, 0.97].map((t, i) => {
            const p = T(project(t * L, i === 0 ? -1.1 : W + 1.1));
            return (
              <g key={`tree-${i}`}>
                <ellipse cx={p.x} cy={p.y + 4} rx="5.4" ry="2" fill="#7C8C66" opacity="0.18" />
                <circle cx={p.x} cy={p.y} r="4.6" fill="#8FA877" />
                <circle cx={p.x - 2} cy={p.y + 1.6} r="3" fill="#9DB886" />
              </g>
            );
          })}

        {/* Sols des pièces */}
        {plan.rooms.map((r) => {
          const pts = [
            project(r.x, r.y),
            project(r.x + r.w, r.y),
            project(r.x + r.w, r.y + r.h),
            project(r.x, r.y + r.h),
          ].map(T);
          return (
            <polygon
              key={`floor-${r.id}`}
              points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={roomFill(r)}
              stroke={M.wallShade}
              strokeWidth="0.5"
            />
          );
        })}

        {/* Murs blancs coupés */}
        {walls.map((w, i) => {
          const a0 = T(project(w.x1, w.y1));
          const b0 = T(project(w.x2, w.y2));
          const a1 = T(project(w.x1, w.y1, WALL_H_THUMB));
          const b1 = T(project(w.x2, w.y2, WALL_H_THUMB));
          return (
            <g key={`wall-${i}`}>
              <polygon
                points={`${a0.x},${a0.y} ${b0.x},${b0.y} ${b1.x},${b1.y} ${a1.x},${a1.y}`}
                fill={M.wall}
                stroke={M.wallShade}
                strokeWidth="0.5"
              />
              <path
                d={`M ${a1.x} ${a1.y} L ${b1.x} ${b1.y}`}
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Bois de l'entrée principale */}
        {entry &&
          (() => {
            const r = entry.room;
            const horizontal = entry.door.wall === "N" || entry.door.wall === "S";
            const base = horizontal
              ? (entry.door.wall === "N" ? r.y : r.y + r.h) + (entry.door.wall === "N" ? -0.55 : 0.55)
              : 0;
            const along = (horizontal ? r.x : r.y) + entry.door.position + entry.door.width / 2;
            const ax = horizontal ? along : (entry.door.wall === "W" ? r.x - 0.55 : r.x + r.w + 0.55);
            const ay = horizontal ? base : along;
            const p = T(project(ax, ay, 0.02));
            return (
              <rect
                x={p.x - 3.2}
                y={p.y - 1.4}
                width="6.4"
                height="2.6"
                rx="1"
                fill={M.wood}
                stroke="#fff"
                strokeWidth="0.6"
              />
            );
          })()}

        {/* Repères entrée / secours */}
        {[
          { item: entry, color: M.entry },
          { item: exit, color: M.exit },
        ].map(({ item, color }, i) => {
          if (!item) return null;
          const r = item.room;
          const horizontal = item.door.wall === "N" || item.door.wall === "S";
          const x = horizontal ? r.x + item.door.position + item.door.width / 2 : item.door.wall === "W" ? r.x : r.x + r.w;
          const y = horizontal ? (item.door.wall === "N" ? r.y : r.y + r.h) : r.y + item.door.position + item.door.width / 2;
          const p = T(project(x, y, 1.4));
          return <circle key={`mark-${i}`} cx={p.x} cy={p.y} r="2.4" fill={color} stroke="#fff" strokeWidth="0.8" />;
        })}
      </svg>
    </div>
  );
}
