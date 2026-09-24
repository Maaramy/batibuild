import React from "react";
import { StyleSheet, Text, View, type TextStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from "react-native-svg";

import { GUIDE_ICONS } from "./icons";
import type { AppTheme } from "../theme";

/**
 * ILLUSTRATIONS DES GUIDES — application mobile Android uniquement.
 *
 * Une illustration DÉDIÉE par guide, dans un style cohérent et premium :
 * construction / architecture / immobilier / IA, composition pensée pour un
 * écran de téléphone.
 *
 * Ce sont des illustrations VECTORIELLES dessinées pour batibuild (aucune image
 * générique, aucun placeholder, aucune icône seule) :
 *   1. Détection automatique sur le plan       → « Évitez les surcoûts »
 *   2. Import (photo, PDF, satellite, croquis) → « Devis clé en main »
 *   3. Trois niveaux de matériaux comparés     → « Meilleurs matériaux »
 *   4. 10 phases + jalons de chantier          → « Ne perdez plus une étape »
 *   5. ROI 1/5/10 ans + score IA + scénarios   → « Investissez sans risque »
 *   6. 500+ matériaux + courbe des prix        → « Suivez l'évolution des prix »
 *   7. Annuaire vérifié + carte des régions    → « Trouvez les bons prestataires »
 *
 * Elles suivent le thème natif (clair / sombre / système) sans jamais toucher
 * au thème de la plateforme Web, et n'effectuent aucun appel réseau.
 *
 * PÉRIMÈTRE : mobile uniquement.
 */

/** Dimensions de conception : l'illustration est mise à l'échelle du téléphone. */
const VIEW_W = 320;
const VIEW_H = 240;

/** Couleurs des illustrations (aucune teinte inventée : palette de la plateforme). */
type IllusPalette = {
  bg1: string;
  bg2: string;
  panel: string;
  panelAlt: string;
  line: string;
  strong: string;
  ink: string;
  muted: string;
  onBrand: string;
  brand: string;
  brandSoft: string;
  brandLine: string;
  brandDeep: string;
  blue: string;
  blueSoft: string;
  blueLine: string;
  violet: string;
  violetSoft: string;
  violetLine: string;
  indigo: string;
  indigoSoft: string;
  amber: string;
  amberSoft: string;
};

const LIGHT: IllusPalette = {
  bg1: "#FFFFFF",
  bg2: "#EFF6F3",
  panel: "#FFFFFF",
  panelAlt: "#F5F8F7",
  line: "#E2E8F0",
  strong: "#CBD5E1",
  ink: "#0F172A",
  muted: "#64748B",
  onBrand: "#FFFFFF",
  brand: "#059669",
  brandSoft: "#D1FAE5",
  brandLine: "#A7F3D0",
  brandDeep: "#047857",
  blue: "#2563EB",
  blueSoft: "#DBEAFE",
  blueLine: "#BFDBFE",
  violet: "#7C3AED",
  violetSoft: "#EDE9FE",
  violetLine: "#DDD6FE",
  indigo: "#4F46E5",
  indigoSoft: "#E0E7FF",
  amber: "#B45309",
  amberSoft: "#FDE68A",
};

const DARK: IllusPalette = {
  bg1: "#0B1220",
  bg2: "#101A2B",
  panel: "#111A2C",
  panelAlt: "#162236",
  line: "#1E293B",
  strong: "#334155",
  ink: "#F1F5F9",
  muted: "#94A3B8",
  onBrand: "#04231A",
  brand: "#34D399",
  brandSoft: "#0C3B2C",
  brandLine: "#12664A",
  brandDeep: "#6EE7B7",
  blue: "#60A5FA",
  blueSoft: "#16294A",
  blueLine: "#1E3A8A",
  violet: "#A78BFA",
  violetSoft: "#2A1E4D",
  violetLine: "#4C1D95",
  indigo: "#818CF8",
  indigoSoft: "#232A55",
  amber: "#FBBF24",
  amberSoft: "#3B2A08",
};

export type IllusProps = {
  /** Largeur réellement allouée à l'illustration (points). */
  width: number;
  theme: AppTheme;
};

/* ------------------------------------------------------------------ */
/* Briques de base                                                     */
/* ------------------------------------------------------------------ */

function Scene({
  width,
  id,
  p,
  children,
  labels,
}: {
  width: number;
  id: string;
  p: IllusPalette;
  /** Couche vectorielle (coordonnées en unités de conception). */
  children: React.ReactNode;
  /** Couche des textes / icônes (rendue en React Native, donc parfaitement nette). */
  labels?: React.ReactNode;
}) {
  return (
    // `overflow: hidden` + coins arrondis : les halos colorés restent
    // strictement à l'intérieur de la carte (aucun débordement dans les coins).
    <View
      style={{
        width,
        height: (width * VIEW_H) / VIEW_W,
        position: "relative",
        borderRadius: 26,
        overflow: "hidden",
      }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Defs>
          <LinearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={p.bg1} />
            <Stop offset="1" stopColor={p.bg2} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} rx={26} fill={`url(#${id}-bg)`} />
        {children}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {labels}
      </View>
    </View>
  );
}

/** Boîte de placement d'un texte / d'une icône, en unités de conception. */
function Box({
  s,
  x,
  y,
  w,
  h,
  align = "center",
  row = false,
  gap = 3,
  children,
}: {
  s: number;
  x: number;
  y: number;
  w: number;
  h: number;
  align?: "center" | "flex-start" | "flex-end";
  row?: boolean;
  gap?: number;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: x * s,
        top: y * s,
        width: w * s,
        height: h * s,
        flexDirection: row ? "row" : "column",
        alignItems: align,
        justifyContent: "center",
        gap: gap * s,
      }}
    >
      {children}
    </View>
  );
}

/** Texte des illustrations : taille et épaisseur mises à l'échelle. */
function Lbl({
  s,
  size = 9,
  color,
  weight = "600",
  spacing = -0.1,
  children,
}: {
  s: number;
  size?: number;
  color: string;
  weight?: TextStyle["fontWeight"];
  spacing?: number;
  children: React.ReactNode;
}) {
  return (
    <Text
      numberOfLines={1}
      allowFontScaling={false}
      style={{
        fontSize: size * s,
        color,
        fontWeight: weight,
        letterSpacing: spacing,
        textAlign: "center",
      }}
    >
      {children}
    </Text>
  );
}

function Icon({
  s,
  size = 14,
  color,
  strokeWidth = 2,
  name,
}: {
  s: number;
  size?: number;
  color: string;
  strokeWidth?: number;
  name: keyof typeof GUIDE_ICONS;
}) {
  const Cmp = GUIDE_ICONS[name];
  return <Cmp size={size * s} color={color} strokeWidth={strokeWidth} />;
}

/* ------------------------------------------------------------------ */
/* 1 / 7 — Évitez les surcoûts                                         */
/* ------------------------------------------------------------------ */

const GRID_V = [38, 56, 74, 92, 110, 128, 146, 164, 182, 200];
const GRID_H = [48, 66, 84, 102, 120, 138, 156, 174];

export function IllusOvercosts({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;

  const chips: { value: string; caption: string; icon: keyof typeof GUIDE_ICONS; y: number; accent: boolean }[] = [
    { value: "150 m²", caption: "Surface", icon: "ruler", y: 44, accent: false },
    { value: "24", caption: "Matériaux", icon: "layers", y: 88, accent: false },
    { value: "0", caption: "Surcoût", icon: "shieldCheck", y: 132, accent: true },
  ];

  return (
    <Scene
      width={width}
      id="g1"
      p={p}
      labels={
        <>
          {[
            { label: "Séjour", x: 34, y: 58, w: 80 },
            { label: "Chambre", x: 122, y: 58, w: 74 },
            { label: "Cuisine", x: 34, y: 118, w: 80 },
            { label: "Garage", x: 122, y: 118, w: 74 },
          ].map((r) => (
            <Box key={r.label} s={s} x={r.x} y={r.y} w={r.w} h={14}>
              <Lbl s={s} size={8.5} color={p.muted} weight="600" spacing={0.3}>
                {r.label}
              </Lbl>
            </Box>
          ))}

          {chips.map((c) => (
            <Box key={c.caption} s={s} x={226} y={c.y} w={78} h={32} gap={2}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 * s }}>
                <Icon s={s} size={12} color={c.accent ? p.brand : p.muted} name={c.icon} />
                <Lbl s={s} size={10} color={c.accent ? p.brand : p.ink} weight="800">
                  {c.value}
                </Lbl>
              </View>
              <Lbl s={s} size={7.5} color={c.accent ? p.brandDeep : p.muted}>
                {c.caption}
              </Lbl>
            </Box>
          ))}

          <Box s={s} x={20} y={194} w={284} h={32} row gap={7}>
            <Icon s={s} size={13} color={p.brand} name="shieldCheck" />
            <Lbl s={s} size={8.5} color={p.ink} weight="600">
              Détection IA des surfaces, matériaux et quantités
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={282} cy={42} r={74} fill={p.brandSoft} opacity={0.5} />
      <Circle cx={24} cy={214} r={54} fill={p.blueSoft} opacity={0.35} />

      {/* Plan / maquette du projet */}
      <Rect x={20} y={30} width={196} height={152} rx={16} fill={p.panel} stroke={p.line} />
      {GRID_V.map((x) => (
        <Line key={`v${x}`} x1={x} y1={38} x2={x} y2={174} stroke={p.line} strokeWidth={0.7} />
      ))}
      {GRID_H.map((y) => (
        <Line key={`h${y}`} x1={28} y1={y} x2={208} y2={y} stroke={p.line} strokeWidth={0.7} />
      ))}

      {/* Murs */}
      <Rect
        x={38}
        y={48}
        width={162}
        height={116}
        rx={3}
        fill="none"
        stroke={p.ink}
        strokeWidth={4}
        opacity={0.82}
      />
      <Line x1={118} y1={48} x2={118} y2={108} stroke={p.ink} strokeWidth={3.4} opacity={0.82} />
      <Line x1={38} y1={108} x2={200} y2={108} stroke={p.ink} strokeWidth={3.4} opacity={0.82} />
      <Path
        d="M118 122 A14 14 0 0 0 132 108"
        fill="none"
        stroke={p.muted}
        strokeWidth={1.2}
        strokeDasharray={[3, 3]}
      />
      {/* Fenêtres */}
      <Line x1={58} y1={48} x2={84} y2={48} stroke={p.blue} strokeWidth={4.5} />
      <Line x1={152} y1={48} x2={178} y2={48} stroke={p.blue} strokeWidth={4.5} />
      <Line x1={38} y1={72} x2={38} y2={92} stroke={p.blue} strokeWidth={4.5} />

      {/* Balayage de l'IA */}
      <Rect x={38} y={92} width={162} height={14} rx={3} fill={p.brand} opacity={0.16} />
      <Line x1={38} y1={99} x2={200} y2={99} stroke={p.brand} strokeWidth={1.8} />

      {/* Repères des trois détections */}
      <Line x1={216} y1={60} x2={226} y2={60} stroke={p.brand} strokeWidth={1.4} strokeDasharray={[3, 3]} opacity={0.7} />
      <Line x1={216} y1={104} x2={226} y2={104} stroke={p.brand} strokeWidth={1.4} strokeDasharray={[3, 3]} opacity={0.7} />
      <Line x1={216} y1={148} x2={226} y2={148} stroke={p.brand} strokeWidth={1.4} strokeDasharray={[3, 3]} opacity={0.7} />

      {/* Cadre de détection */}
      <Path d="M20 46 V30 H36" fill="none" stroke={p.brand} strokeWidth={3} strokeLinecap="round" />
      <Path d="M200 30 H216 V46" fill="none" stroke={p.brand} strokeWidth={3} strokeLinecap="round" />
      <Path d="M20 166 V182 H36" fill="none" stroke={p.brand} strokeWidth={3} strokeLinecap="round" />
      <Path d="M200 182 H216 V166" fill="none" stroke={p.brand} strokeWidth={3} strokeLinecap="round" />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* 2 / 7 — Devis clé en main                                           */
/* ------------------------------------------------------------------ */

const SOURCES: { label: string; icon: keyof typeof GUIDE_ICONS; y: number }[] = [
  { label: "Photo", icon: "image", y: 20 },
  { label: "Plan PDF", icon: "fileText", y: 72 },
  { label: "Satellite", icon: "satellite", y: 124 },
  { label: "Croquis", icon: "penLine", y: 176 },
];

export function IllusQuote({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const node = { x: 128, y: 86, w: 60, h: 60 };

  return (
    <Scene
      width={width}
      id="g2"
      p={p}
      labels={
        <>
          {SOURCES.map((src) => (
            <Box key={src.label} s={s} x={14} y={src.y} w={58} h={40} gap={4}>
              <Icon s={s} size={15} color={p.blue} name={src.icon} />
              <Lbl s={s} size={7.5} color={p.muted} weight="600">
                {src.label}
              </Lbl>
            </Box>
          ))}

          <Box s={s} x={node.x} y={node.y + 10} w={node.w} h={40} gap={4}>
            <Icon s={s} size={22} color={p.brand} name="sparkles" />
            <Lbl s={s} size={10} color={p.brandDeep} weight="800" spacing={0.6}>
              IA
            </Lbl>
          </Box>

          <Box s={s} x={112} y={152} w={92} h={24} row gap={5}>
            <Icon s={s} size={12} color={p.muted} name="clock" />
            <Lbl s={s} size={8.5} color={p.ink} weight="600">
              ≈ 3 min
            </Lbl>
          </Box>

          <Box s={s} x={222} y={44} w={74} h={26}>
            <Lbl s={s} size={9.5} color={p.brandDeep} weight="800" spacing={0.4}>
              Devis
            </Lbl>
          </Box>

          <Box s={s} x={222} y={132} w={74} h={20}>
            <Lbl s={s} size={11} color={p.brand} weight="800">
              253 590
            </Lbl>
          </Box>
          <Box s={s} x={222} y={150} w={74} h={14}>
            <Lbl s={s} size={7.5} color={p.muted} weight="600" spacing={0.5}>
              TND ESTIMÉS
            </Lbl>
          </Box>

          <Box s={s} x={222} y={172} w={74} h={24} row gap={5}>
            <Icon s={s} size={11} color={p.brand} name="circleCheck" />
            <Lbl s={s} size={8} color={p.ink} weight="600">
              PDF prêt
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={30} cy={44} r={58} fill={p.blueSoft} opacity={0.4} />
      <Circle cx={292} cy={214} r={64} fill={p.brandSoft} opacity={0.45} />

      {/* Sources d'import */}
      {SOURCES.map((src) => (
        <Rect
          key={src.label}
          x={14}
          y={src.y}
          width={58}
          height={40}
          rx={12}
          fill={p.panel}
          stroke={p.line}
        />
      ))}

      {/* Convergence vers l'IA */}
      <Path
        d="M72 40 C 100 40 100 100 126 100"
        fill="none"
        stroke={p.muted}
        strokeWidth={1.5}
        strokeDasharray={[4, 4]}
        opacity={0.6}
      />
      <Path
        d="M72 92 C 100 92 100 106 126 106"
        fill="none"
        stroke={p.muted}
        strokeWidth={1.5}
        strokeDasharray={[4, 4]}
        opacity={0.6}
      />
      <Path
        d="M72 144 C 100 144 100 112 126 112"
        fill="none"
        stroke={p.muted}
        strokeWidth={1.5}
        strokeDasharray={[4, 4]}
        opacity={0.6}
      />
      <Path
        d="M72 196 C 100 196 100 118 126 118"
        fill="none"
        stroke={p.muted}
        strokeWidth={1.5}
        strokeDasharray={[4, 4]}
        opacity={0.6}
      />

      {/* Nœud IA */}
      <Rect x={node.x} y={node.y} width={node.w} height={node.h} rx={20} fill={p.brandSoft} />
      <Rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={20}
        fill="none"
        stroke={p.brandLine}
        strokeWidth={1.5}
      />

      {/* IA → devis */}
      <Path d="M190 116 H 206" fill="none" stroke={p.brand} strokeWidth={2.5} strokeLinecap="round" />
      <Polygon points="205,110 213,116 205,122" fill={p.brand} />

      {/* Document devis */}
      <Rect x={214} y={36} width={90} height={168} rx={14} fill={p.panel} stroke={p.line} />
      <Rect x={222} y={44} width={74} height={26} rx={9} fill={p.brandSoft} stroke={p.brandLine} />
      <Rect x={222} y={80} width={74} height={6} rx={3} fill={p.line} />
      <Rect x={222} y={92} width={74} height={6} rx={3} fill={p.line} />
      <Rect x={222} y={104} width={74} height={6} rx={3} fill={p.line} />
      <Rect x={222} y={116} width={52} height={6} rx={3} fill={p.line} />
      <Rect x={222} y={132} width={74} height={32} rx={9} fill={p.brandSoft} stroke={p.brandLine} />
      <Rect x={222} y={172} width={74} height={24} rx={8} fill={p.panelAlt} stroke={p.line} />
      <Circle cx={300} cy={44} r={12} fill={p.panel} />
      <Circle cx={300} cy={44} r={10} fill={p.brand} />
      <Path
        d="M295.5 44 L 299 47.5 L 305 40.5"
        fill="none"
        stroke={p.onBrand}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* 3 / 7 — Choisissez les meilleurs matériaux                          */
/* ------------------------------------------------------------------ */

const TIERS: {
  name: string;
  x: number;
  icon: keyof typeof GUIDE_ICONS;
  price: string;
  bars: number[];
}[] = [
  { name: "Économique", x: 16, icon: "blocks", price: "163 590", bars: [48, 30, 26] },
  { name: "Équilibré", x: 118, icon: "package", price: "253 590", bars: [56, 50, 46] },
  { name: "Premium", x: 220, icon: "star", price: "398 475", bars: [60, 62, 60] },
];

export function IllusMaterials({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const accents = [
    { fillSoft: p.panelAlt, line: p.line, color: p.muted, price: p.ink },
    { fillSoft: p.brandSoft, line: p.brand, color: p.brand, price: p.brand },
    { fillSoft: p.violetSoft, line: p.line, color: p.violet, price: p.violet },
  ];

  return (
    <Scene
      width={width}
      id="g3"
      p={p}
      labels={
        <>
          <Box s={s} x={104} y={24} w={112} h={26} row gap={5}>
            <Icon s={s} size={12} color={p.amber} name="star" />
            <Lbl s={s} size={9} color={p.ink} weight="700">
              IA recommande
            </Lbl>
          </Box>

          <Box s={s} x={16} y={60} w={288} h={16}>
            <Lbl s={s} size={8.5} color={p.muted} weight="600" spacing={0.9}>
              PRIX • QUALITÉ • PERFORMANCE
            </Lbl>
          </Box>

          {TIERS.map((t, i) => (
            <React.Fragment key={t.name}>
              <Box s={s} x={t.x + 28} y={96} w={28} h={28}>
                <Icon s={s} size={16} color={accents[i].color} name={t.icon} />
              </Box>
              <Box s={s} x={t.x + 6} y={128} w={72} h={18}>
                <Lbl s={s} size={10.5} color={accents[i].price} weight="800">
                  {t.price}
                </Lbl>
              </Box>
              <Box s={s} x={t.x + 6} y={146} w={72} h={12}>
                <Lbl s={s} size={7} color={p.muted} weight="600" spacing={0.5}>
                  TND / SCÉNARIO
                </Lbl>
              </Box>
              <Box s={s} x={t.x} y={196} w={84} h={18}>
                <Lbl
                  s={s}
                  size={9.5}
                  color={accents[i].price}
                  weight={i === 1 ? "800" : "600"}
                >
                  {t.name}
                </Lbl>
              </Box>
            </React.Fragment>
          ))}
        </>
      }
    >
      <Circle cx={160} cy={22} r={64} fill={p.brandSoft} opacity={0.35} />
      <Circle cx={296} cy={226} r={60} fill={p.violetSoft} opacity={0.4} />

      {/* Option mise en avant (halo) */}
      <Rect x={114} y={84} width={92} height={108} rx={18} fill={p.brand} opacity={0.07} />

      {TIERS.map((t, i) => (
        <React.Fragment key={t.name}>
          <Rect
            x={t.x}
            y={88}
            width={84}
            height={100}
            rx={14}
            fill={p.panel}
            stroke={i === 1 ? p.brand : p.line}
            strokeWidth={i === 1 ? 2 : 1}
          />
          <Rect x={t.x + 28} y={96} width={28} height={28} rx={9} fill={accents[i].fillSoft} />
          {t.bars.map((w, b) => (
            <Rect
              key={b}
              x={t.x + 12}
              y={162 + b * 10}
              width={w}
              height={5}
              rx={2.5}
              fill={accents[i].color}
              opacity={[0.95, 0.7, 0.45][b]}
            />
          ))}
        </React.Fragment>
      ))}

      {/* Étoile de recommandation sur l'option équilibrée */}
      <Circle cx={196} cy={94} r={11} fill={p.amber} />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* 4 / 7 — Ne perdez plus une seule étape                              */
/* ------------------------------------------------------------------ */

const PHASES = Array.from({ length: 10 }, (_, i) => i);
const MILESTONES: { label: string; icon: keyof typeof GUIDE_ICONS; x: number }[] = [
  { label: "Démarches", icon: "fileText", x: 16 },
  { label: "Budget & planning", icon: "calendar", x: 116 },
  { label: "Contrôle chantier", icon: "shieldCheck", x: 216 },
];

export function IllusPhases({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;

  return (
    <Scene
      width={width}
      id="g4"
      p={p}
      labels={
        <>
          <Box s={s} x={157} y={22} w={90} h={26} row gap={5}>
            <Icon s={s} size={12} color={p.brand} name="clock" />
            <Lbl s={s} size={9} color={p.ink} weight="700">
              Phase 7 / 10
            </Lbl>
          </Box>

          {PHASES.map((i) => (
            <Box key={i} s={s} x={16 + i * 29} y={60} w={24} h={44}>
              <Lbl
                s={s}
                size={10}
                color={i < 4 ? p.onBrand : i < 7 ? p.brandDeep : p.muted}
                weight="800"
              >
                {i + 1}
              </Lbl>
            </Box>
          ))}

          {MILESTONES.map((m) => (
            <React.Fragment key={m.label}>
              <Box s={s} x={m.x + 36} y={134} w={16} h={16}>
                <Icon s={s} size={15} color={p.brand} name={m.icon} />
              </Box>
              <Box s={s} x={m.x + 4} y={156} w={80} h={14}>
                <Lbl s={s} size={8} color={p.ink} weight="600">
                  {m.label}
                </Lbl>
              </Box>
            </React.Fragment>
          ))}

          <Box s={s} x={16} y={186} w={288} h={32} row gap={7}>
            <Icon s={s} size={13} color={p.brand} name="circleCheck" />
            <Lbl s={s} size={8.5} color={p.ink} weight="600">
              10 phases : démarches, budget, planning, contrôle
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={160} cy={236} r={78} fill={p.brandSoft} opacity={0.4} />

      {/* Bandeau des 10 phases */}
      {PHASES.map((i) => (
        <Rect
          key={i}
          x={16 + i * 29}
          y={60}
          width={24}
          height={44}
          rx={8}
          fill={i < 4 ? p.brand : i < 7 ? p.brandSoft : p.panelAlt}
          stroke={i < 4 ? p.brand : i < 7 ? p.brandLine : p.line}
        />
      ))}
      <Polygon points="196,52 202,60 208,52" fill={p.brand} />

      {/* Progression : 4 phases terminées sur 10 */}
      <Rect x={16} y={112} width={288} height={4} rx={2} fill={p.line} />
      <Rect x={16} y={112} width={186} height={4} rx={2} fill={p.brand} />
      {MILESTONES.map((m) => (
        <Circle key={`d-${m.label}`} cx={m.x + 44} cy={114} r={4} fill={p.brand} />
      ))}

      {/* Jalons de chantier (reliés à la progression) */}
      {MILESTONES.map((m) => (
        <Rect key={m.label} x={m.x} y={126} width={88} height={48} rx={14} fill={p.panel} stroke={p.line} />
      ))}
      {MILESTONES.map((m) => (
        <Line
          key={`l-${m.label}`}
          x1={m.x + 44}
          y1={116}
          x2={m.x + 44}
          y2={126}
          stroke={p.line}
          strokeWidth={1.5}
        />
      ))}
      <Rect x={16} y={186} width={288} height={32} rx={16} fill={p.panelAlt} stroke={p.line} />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* 5 / 7 — Investissez sans risque                                     */
/* ------------------------------------------------------------------ */

const ROI_BARS = [10, 17, 24, 30, 36, 42, 48, 54, 60, 68];
const SCENARIOS = ["Prudent", "Réaliste", "Optimiste"];
const RING_R = 29;

/**
 * Arc du cadran « Score IA » : tracé par calcul (aucune rotation), donc rendu
 * identique sur toutes les versions de react-native-svg. L'arc démarre à
 * midi et couvre la fraction demandée.
 */
function ringArc(cx: number, cy: number, r: number, fraction: number): string {
  const start = -Math.PI / 2;
  const end = start + 2 * Math.PI * fraction;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = fraction > 0.5 ? 1 : 0;
  const round = (v: number) => Math.round(v * 100) / 100;
  return `M${round(x1)} ${round(y1)} A${r} ${r} 0 ${large} 1 ${round(x2)} ${round(y2)}`;
}

export function IllusInvestment({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const kpis: { label: string; value: string; icon: keyof typeof GUIDE_ICONS; color: string; x: number }[] = [
    { label: "ROI 10 ans", value: "82%", icon: "chartLine", color: p.indigo, x: 122 },
    { label: "Cash-flow", value: "+980", icon: "wallet", color: p.blue, x: 185 },
    { label: "Rendement", value: "6,2%", icon: "percent", color: p.brand, x: 248 },
  ];

  return (
    <Scene
      width={width}
      id="g5"
      p={p}
      labels={
        <>
          <Box s={s} x={36} y={44} w={60} h={26}>
            <Lbl s={s} size={21} color={p.ink} weight="800" spacing={-0.6}>
              94
            </Lbl>
          </Box>
          <Box s={s} x={36} y={70} w={60} h={14}>
            <Lbl s={s} size={8.5} color={p.muted} weight="600">
              sur 100
            </Lbl>
          </Box>
          <Box s={s} x={16} y={100} w={100} h={16}>
            <Lbl s={s} size={9.5} color={p.ink} weight="700">
              Score IA
            </Lbl>
          </Box>
          <Box s={s} x={10} y={116} w={112} h={14}>
            <Lbl s={s} size={7.5} color={p.brandDeep} weight="600">
              Excellent investissement
            </Lbl>
          </Box>

          {kpis.map((k) => (
            <React.Fragment key={k.label}>
              <Box s={s} x={k.x + 21} y={44} w={14} h={14}>
                <Icon s={s} size={14} color={k.color} name={k.icon} />
              </Box>
              <Box s={s} x={k.x + 2} y={60} w={52} h={14}>
                <Lbl s={s} size={9.5} color={k.color} weight="800">
                  {k.value}
                </Lbl>
              </Box>
              <Box s={s} x={k.x + 2} y={74} w={52} h={12}>
                <Lbl s={s} size={7} color={p.muted} weight="600">
                  {k.label}
                </Lbl>
              </Box>
            </React.Fragment>
          ))}

          <Box s={s} x={204} y={94} w={100} h={20}>
            <Lbl s={s} size={8.5} color={p.indigo} weight="800">
              +428 000 TND
            </Lbl>
          </Box>

          <Box s={s} x={4} y={186} w={48} h={14}>
            <Lbl s={s} size={8} color={p.muted}>
              1 an
            </Lbl>
          </Box>
          <Box s={s} x={121} y={186} w={48} h={14}>
            <Lbl s={s} size={8} color={p.muted}>
              5 ans
            </Lbl>
          </Box>
          <Box s={s} x={268} y={186} w={48} h={14}>
            <Lbl s={s} size={8} color={p.muted}>
              10 ans
            </Lbl>
          </Box>

          {SCENARIOS.map((name, i) => (
            <Box key={name} s={s} x={16 + i * 99} y={206} w={90} h={26}>
              <Lbl
                s={s}
                size={9}
                color={i === 1 ? p.brandDeep : p.muted}
                weight={i === 1 ? "800" : "600"}
              >
                {name}
              </Lbl>
            </Box>
          ))}
        </>
      }
    >
      <Circle cx={44} cy={48} r={66} fill={p.indigoSoft} opacity={0.55} />

      {/* Score IA (94 / 100) */}
      <Circle cx={66} cy={64} r={RING_R} fill="none" stroke={p.line} strokeWidth={7} />
      <Path
        d={ringArc(66, 64, RING_R, 0.94)}
        fill="none"
        stroke={p.indigo}
        strokeWidth={7}
        strokeLinecap="round"
      />

      {/* Indicateurs */}
      {kpis.map((k) => (
        <Rect key={k.label} x={k.x} y={38} width={56} height={50} rx={12} fill={p.panel} stroke={p.line} />
      ))}

      {/* Prévisions */}
      <Rect x={16} y={182} width={288} height={1.5} rx={0.75} fill={p.line} />
      {ROI_BARS.map((h, i) => (
        <Rect
          key={i}
          x={16 + i * 29.33}
          y={182 - h}
          width={24}
          height={h}
          rx={3}
          fill={i === ROI_BARS.length - 1 ? p.indigo : p.indigoSoft}
        />
      ))}

      {/* Scénarios */}
      {SCENARIOS.map((name, i) => (
        <Rect
          key={name}
          x={16 + i * 99}
          y={206}
          width={90}
          height={26}
          rx={13}
          fill={i === 1 ? p.brandSoft : p.panel}
          stroke={i === 1 ? p.brandLine : p.line}
        />
      ))}
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* 6 / 7 — Suivez l'évolution des prix                                 */
/* ------------------------------------------------------------------ */

const PRICE_PATH = "M146 128 L164 118 L182 122 L200 104 L218 108 L236 88 L254 78 L272 62 L290 46";
const PRICE_AREA = `${PRICE_PATH} L290 136 L146 136 Z`;

export function IllusPrices({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const materials: { label: string; y: number }[] = [
    { label: "Briques", y: 30 },
    { label: "Ciment", y: 30 },
    { label: "Acier", y: 92 },
    { label: "Carrelage", y: 92 },
  ];

  return (
    <Scene
      width={width}
      id="g6"
      p={p}
      labels={
        <>
          {materials.map((m, i) => (
            <Box key={m.label} s={s} x={16 + (i % 2) * 58} y={m.y + 40} w={52} h={12}>
              <Lbl s={s} size={7.5} color={p.muted} weight="600">
                {m.label}
              </Lbl>
            </Box>
          ))}

          <Box s={s} x={16} y={156} w={116} h={30} row gap={5}>
            <Icon s={s} size={12} color={p.brand} name="blocks" />
            <Lbl s={s} size={9} color={p.brandDeep} weight="800">
              500+ matériaux
            </Lbl>
          </Box>

          <Box s={s} x={252} y={32} w={40} h={18}>
            <Lbl s={s} size={8} color={p.brandDeep} weight="800">
              +7,8%
            </Lbl>
          </Box>

          <Box s={s} x={148} y={138} w={30} h={12}>
            <Lbl s={s} size={7.5} color={p.muted}>
              Jan
            </Lbl>
          </Box>
          <Box s={s} x={246} y={138} w={30} h={12}>
            <Lbl s={s} size={7.5} color={p.muted}>
              Déc
            </Lbl>
          </Box>

          <Box s={s} x={136} y={162} w={168} h={24} row gap={5}>
            <Icon s={s} size={12} color={p.violet} name="arrowUpRight" />
            <Lbl s={s} size={8.5} color={p.ink} weight="600">
              Tendance haussière
            </Lbl>
          </Box>

          <Box s={s} x={16} y={196} w={288} h={32} row gap={7}>
            <Icon s={s} size={13} color={p.brand} name="clock" />
            <Lbl s={s} size={8.5} color={p.ink} weight="600">
              Prix mis à jour en temps réel
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={44} cy={36} r={60} fill={p.amberSoft} opacity={0.4} />
      <Circle cx={290} cy={60} r={62} fill={p.brandSoft} opacity={0.4} />

      {/* Catalogue de matériaux */}
      {materials.map((m, i) => (
        <Rect
          key={m.label}
          x={16 + (i % 2) * 58}
          y={m.y}
          width={52}
          height={56}
          rx={12}
          fill={p.panel}
          stroke={p.line}
        />
      ))}
      {/* Briques */}
      {[0, 1, 2].map((r) => (
        <React.Fragment key={`b${r}`}>
          <Rect x={28 + (r % 2) * 10} y={38 + r * 10} width={20} height={8} rx={2} fill={p.amberSoft} stroke={p.amber} />
          <Rect x={28 + (r % 2) * 10 + 22} y={38 + r * 10} width={12} height={8} rx={2} fill={p.amberSoft} stroke={p.amber} />
        </React.Fragment>
      ))}
      {/* Sac de ciment */}
      <Rect x={74} y={38} width={28} height={30} rx={7} fill={p.panelAlt} stroke={p.strong} />
      <Line x1={80} y1={46} x2={96} y2={46} stroke={p.strong} strokeWidth={1.4} />
      {/* Acier */}
      <Line x1={30} y1={128} x2={54} y2={104} stroke={p.strong} strokeWidth={2.6} strokeLinecap="round" />
      <Line x1={38} y1={130} x2={62} y2={106} stroke={p.strong} strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={30} cy={128} r={2.4} fill={p.strong} />
      <Circle cx={62} cy={106} r={2.4} fill={p.strong} />
      {/* Carrelage */}
      <Rect x={82} y={100} width={28} height={28} rx={4} fill={p.panelAlt} stroke={p.line} />
      <Line x1={82} y1={114} x2={110} y2={114} stroke={p.line} strokeWidth={1.2} />
      <Line x1={96} y1={100} x2={96} y2={128} stroke={p.line} strokeWidth={1.2} />

      {/* Évolution des prix */}
      <Rect x={136} y={24} width={168} height={130} rx={14} fill={p.panel} stroke={p.line} />
      <Line x1={146} y1={70} x2={294} y2={70} stroke={p.line} strokeWidth={1} strokeDasharray={[3, 3]} />
      <Line x1={146} y1={110} x2={294} y2={110} stroke={p.line} strokeWidth={1} strokeDasharray={[3, 3]} />
      <Path d={PRICE_AREA} fill={p.brand} opacity={0.14} />
      <Path
        d={PRICE_PATH}
        fill="none"
        stroke={p.brand}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={290} y1={46} x2={290} y2={136} stroke={p.brand} strokeWidth={1} strokeDasharray={[3, 3]} opacity={0.7} />
      <Circle cx={290} cy={46} r={3.5} fill={p.brand} />
      <Rect x={252} y={32} width={40} height={18} rx={9} fill={p.brandSoft} />

      {/* Bandeaux */}
      <Rect x={16} y={156} width={116} height={30} rx={15} fill={p.brandSoft} stroke={p.brandLine} />
      <Rect x={136} y={162} width={168} height={24} rx={12} fill={p.panel} stroke={p.line} />
      <Rect x={16} y={196} width={288} height={32} rx={16} fill={p.panelAlt} stroke={p.line} />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* 7 / 7 — Trouvez les bons prestataires                               */
/* ------------------------------------------------------------------ */

const DOTS_X = [32, 56, 80, 104, 128, 152, 176, 200, 224, 248, 272, 288];
const DOTS_Y = [68, 92, 116, 136];

const PROS: {
  name: string;
  rating: string;
  x: number;
  tone: "brand" | "blue" | "violet";
}[] = [
  { name: "Architecte", rating: "4,9", x: 16, tone: "brand" },
  { name: "Ingénieur", rating: "4,8", x: 116, tone: "blue" },
  { name: "Fournisseur", rating: "4,7", x: 216, tone: "violet" },
];

export function IllusProviders({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const pins: { x: number; y: number; color: string; label: string }[] = [
    { x: 70, y: 118, color: p.brand, label: "Tunis" },
    { x: 160, y: 96, color: p.violet, label: "Sousse" },
    { x: 248, y: 128, color: p.blue, label: "Sfax" },
  ];
  const avatarTone = {
    brand: { fill: p.brandSoft, line: p.brandLine, ink: p.brandDeep },
    blue: { fill: p.blueSoft, line: p.blueLine, ink: p.blue },
    violet: { fill: p.violetSoft, line: p.violetLine, ink: p.violet },
  } as const;

  return (
    <Scene
      width={width}
      id="g7"
      p={p}
      labels={
        <>
          <Box s={s} x={30} y={14} w={16} h={30}>
            <Icon s={s} size={14} color={p.muted} name="search" />
          </Box>
          <Box s={s} x={50} y={14} w={250} h={30} align="flex-start">
            <Lbl s={s} size={8.5} color={p.muted} weight="600" spacing={0}>
              Architecte, ingénieur, fournisseur…
            </Lbl>
          </Box>

          {pins.map((pin) => (
            <Box key={pin.label} s={s} x={pin.x + 10} y={pin.y - 4} w={48} h={14} align="flex-start">
              <Lbl s={s} size={8.5} color={p.ink} weight="700" spacing={0}>
                {pin.label}
              </Lbl>
            </Box>
          ))}

          {PROS.map((pro) => (
            <React.Fragment key={pro.name}>
              <Box s={s} x={pro.x + 4} y={200} w={80} h={14}>
                <Lbl s={s} size={9} color={p.ink} weight="700">
                  {pro.name}
                </Lbl>
              </Box>
              <Box s={s} x={pro.x + 42} y={212} w={30} h={14} align="flex-start">
                <Lbl s={s} size={8} color={p.muted} weight="600" spacing={0}>
                  {pro.rating}
                </Lbl>
              </Box>
              <Box s={s} x={pro.x + 24} y={212} w={14} h={14}>
                <Icon s={s} size={10} color={p.amber} name="star" />
              </Box>
            </React.Fragment>
          ))}
        </>
      }
    >
      <Circle cx={300} cy={40} r={64} fill={p.blueSoft} opacity={0.4} />
      <Circle cx={20} cy={230} r={58} fill={p.brandSoft} opacity={0.4} />

      {/* Recherche */}
      <Rect x={16} y={14} width={288} height={30} rx={15} fill={p.panel} stroke={p.line} />

      {/* Carte des régions */}
      <Rect x={16} y={52} width={288} height={96} rx={16} fill={p.panelAlt} stroke={p.line} />
      {DOTS_Y.map((y) =>
        DOTS_X.map((x) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={p.strong} opacity={0.5} />
        )),
      )}
      {pins.map((pin) => (
        <React.Fragment key={pin.label}>
          <Path
            d={`M${pin.x} ${pin.y} C ${pin.x - 4} ${pin.y - 5}, ${pin.x - 9} ${pin.y - 9}, ${pin.x - 9} ${pin.y - 15} A 9 9 0 1 1 ${pin.x + 9} ${pin.y - 15} C ${pin.x + 9} ${pin.y - 9}, ${pin.x + 4} ${pin.y - 5}, ${pin.x} ${pin.y} Z`}
            fill={pin.color}
          />
          <Circle cx={pin.x} cy={pin.y - 15} r={3.2} fill={p.panel} />
        </React.Fragment>
      ))}

      {/* Prestataires vérifiés */}
      {PROS.map((pro) => (
        <Rect key={pro.name} x={pro.x} y={156} width={88} height={72} rx={14} fill={p.panel} stroke={p.line} />
      ))}

      {PROS.map((pro) => (
        <React.Fragment key={`av-${pro.name}`}>
          <Circle
            cx={pro.x + 44}
            cy={182}
            r={15}
            fill={avatarTone[pro.tone].fill}
            stroke={avatarTone[pro.tone].line}
          />
          <Circle cx={pro.x + 44} cy={177} r={5} fill={avatarTone[pro.tone].ink} />
          <Path
            d={`M${pro.x + 35} 194 A 9 8 0 0 1 ${pro.x + 53} 194 Z`}
            fill={avatarTone[pro.tone].ink}
          />
          <Circle cx={pro.x + 56} cy={172} r={6.5} fill={p.brand} />
          <Path
            d={`M${pro.x + 52.6} 172 L ${pro.x + 55} 174.4 L ${pro.x + 59} 169.6`}
            fill="none"
            stroke={p.onBrand}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </React.Fragment>
      ))}
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* Sélection                                                           */
/* ------------------------------------------------------------------ */

/** Les 7 illustrations, dans l'ordre imposé du parcours. */
export const GUIDE_ILLUSTRATIONS = [
  IllusOvercosts,
  IllusQuote,
  IllusMaterials,
  IllusPhases,
  IllusInvestment,
  IllusPrices,
  IllusProviders,
] as const;
