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
 *   5. 500+ matériaux + courbe des prix        → « Suivez l'évolution des prix »
 *   6. Annuaire vérifié + carte des régions    → « Trouvez les bons prestataires »
 *   7. Marque + piliers de la plateforme       → « Bienvenue sur batibuild »
 *   8. Formulaire type / région / surface      → « Créer un projet » *   9. Rapport PDF + accès Pro         → « Rapports PDF & abonnement Pro »
 *  10. Tableau de bord budgétaire      → « Prenez les bonnes décisions »
 *
 * Elles suivent le thème natif (clair / sombre / système) sans jamais toucher
 * au thème de la plateforme Web, et n'effectuent aucun appel réseau.
 *
 * PÉRIMÈTRE : mobile uniquement.
 */

/** Dimensions de conception : l'illustration est mise à l'échelle du téléphone. */
export const VIEW_W = 320;
export const VIEW_H = 240;

/** Couleurs des illustrations (aucune teinte inventée : palette de la plateforme). */
export type IllusPalette = {
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

export const LIGHT: IllusPalette = {
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

export const DARK: IllusPalette = {
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

export function Scene({
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
export function Box({
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
export function Lbl({
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

export function Icon({
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
/* 1 / 6 — Évitez les surcoûts                                         */
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
/* 2 / 6 — Devis clé en main                                           */
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
/* 3 / 6 — Choisissez les meilleurs matériaux                          */
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
/* 4 / 6 — Ne perdez plus une seule étape                              */
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
/* 5 / 6 — Suivez l'évolution des prix                                 */
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
/* 6 / 6 — Trouvez les bons prestataires                               */
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
/* 7 / 9 — Bienvenue sur batibuild                                     */
/* ------------------------------------------------------------------ */

export function IllusWelcome({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const pillars: { label: string; icon: keyof typeof GUIDE_ICONS; x: number }[] = [
    { label: "Coût", icon: "coins", x: 24 },
    { label: "Plans IA", icon: "pencilRuler", x: 96 },
    { label: "Matériaux", icon: "blocks", x: 168 },
    { label: "Suivi", icon: "hardHat", x: 240 },
  ];

  return (
    <Scene
      width={width}
      id="g8"
      p={p}
      labels={
        <>
          <Box s={s} x={42} y={44} w={64} h={64}>
            <Icon s={s} size={34} color={p.brand} name="building" />
          </Box>
          <Box s={s} x={118} y={52} w={164} h={20} align="flex-start">
            <Lbl s={s} size={16} color={p.brandDeep} weight="800" spacing={0.2}>
              batibuild
            </Lbl>
          </Box>
          <Box s={s} x={118} y={74} w={164} h={14} align="flex-start">
            <Lbl s={s} size={8.5} color={p.muted} weight="600" spacing={0}>
              De l'idée à la réalisation
            </Lbl>
          </Box>
          <Box s={s} x={118} y={94} w={164} h={14} align="flex-start">
            <Lbl s={s} size={8} color={p.brand} weight="700" spacing={0}>
              Construction & rénovation en Tunisie
            </Lbl>
          </Box>

          {pillars.map((pillar) => (
            <React.Fragment key={pillar.label}>
              <Box s={s} x={pillar.x + 6} y={170} w={52} h={16}>
                <Icon s={s} size={15} color={p.brand} name={pillar.icon} />
              </Box>
              <Box s={s} x={pillar.x + 2} y={190} w={60} h={12}>
                <Lbl s={s} size={8} color={p.ink} weight="700">
                  {pillar.label}
                </Lbl>
              </Box>
            </React.Fragment>
          ))}

          <Box s={s} x={24} y={214} w={272} h={16}>
            <Lbl s={s} size={8.5} color={p.muted} weight="600" spacing={0.2}>
              Estimation, plans, matériaux, experts et suivi de chantier
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={300} cy={30} r={70} fill={p.brandSoft} opacity={0.4} />
      <Circle cx={14} cy={224} r={62} fill={p.blueSoft} opacity={0.35} />

      <Rect x={24} y={26} width={272} height={120} rx={20} fill={p.panel} stroke={p.line} />
      <Rect
        x={42}
        y={44}
        width={64}
        height={64}
        rx={16}
        fill={p.brandSoft}
        stroke={p.brandLine}
      />

      {pillars.map((pillar) => (
        <Rect
          key={`card-${pillar.label}`}
          x={pillar.x}
          y={158}
          width={64}
          height={54}
          rx={14}
          fill={p.panel}
          stroke={p.line}
        />
      ))}
      <Rect x={24} y={214} width={272} height={18} rx={9} fill={p.panelAlt} stroke={p.line} />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* 8 / 9 — Créer un projet                                             */
/* ------------------------------------------------------------------ */

export function IllusNewProject({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const types: { label: string; x: number; w: number; active: boolean }[] = [
    { label: "Maison", x: 44, w: 70, active: true },
    { label: "Villa", x: 120, w: 64, active: false },
    { label: "Local", x: 190, w: 64, active: false },
  ];

  return (
    <Scene
      width={width}
      id="g9"
      p={p}
      labels={
        <>
          <Box s={s} x={44} y={28} w={200} h={16} align="flex-start">
            <Lbl s={s} size={11.5} color={p.ink} weight="800" spacing={0}>
              Nouveau projet
            </Lbl>
          </Box>

          <Box s={s} x={44} y={48} w={120} h={10} align="flex-start">
            <Lbl s={s} size={7.5} color={p.muted} weight="600" spacing={0.2}>
              Type de projet
            </Lbl>
          </Box>

          {types.map((type) => (
            <Box key={type.label} s={s} x={type.x} y={62} w={type.w} h={22}>
              <Lbl
                s={s}
                size={8.5}
                color={type.active ? p.brandDeep : p.muted}
                weight={type.active ? "800" : "600"}
              >
                {type.label}
              </Lbl>
            </Box>
          ))}

          <Box s={s} x={54} y={100} w={16} h={20}>
            <Icon s={s} size={12} color={p.brand} name="mapPin" />
          </Box>
          <Box s={s} x={78} y={97} w={180} h={10} align="flex-start">
            <Lbl s={s} size={7} color={p.muted} weight="600" spacing={0}>
              Région
            </Lbl>
          </Box>
          <Box s={s} x={78} y={107} w={180} h={14} align="flex-start">
            <Lbl s={s} size={9} color={p.ink} weight="700" spacing={0}>
              Tunis
            </Lbl>
          </Box>

          <Box s={s} x={54} y={138} w={16} h={20}>
            <Icon s={s} size={12} color={p.blue} name="ruler" />
          </Box>
          <Box s={s} x={78} y={135} w={180} h={10} align="flex-start">
            <Lbl s={s} size={7} color={p.muted} weight="600" spacing={0}>
              Surface couverte
            </Lbl>
          </Box>
          <Box s={s} x={78} y={145} w={180} h={14} align="flex-start">
            <Lbl s={s} size={9} color={p.ink} weight="700" spacing={0}>
              150 m²
            </Lbl>
          </Box>

          <Box s={s} x={44} y={178} w={210} h={30}>
            <Lbl s={s} size={10.5} color={p.onBrand} weight="800" spacing={0.3}>
              Créer le projet
            </Lbl>
          </Box>
          <Box s={s} x={244} y={184} w={20} h={18}>
            <Icon s={s} size={13} color={p.onBrand} name="arrowRight" />
          </Box>
        </>
      }
    >
      <Circle cx={302} cy={42} r={64} fill={p.brandSoft} opacity={0.4} />
      <Circle cx={20} cy={226} r={58} fill={p.blueSoft} opacity={0.35} />

      <Rect x={28} y={18} width={264} height={204} rx={18} fill={p.panel} stroke={p.line} />

      {types.map((type) => (
        <Rect
          key={`type-${type.label}`}
          x={type.x}
          y={62}
          width={type.w}
          height={22}
          rx={11}
          fill={type.active ? p.brandSoft : p.panelAlt}
          stroke={type.active ? p.brandLine : p.line}
        />
      ))}

      <Rect x={44} y={94} width={232} height={32} rx={10} fill={p.panelAlt} stroke={p.line} />
      <Rect x={44} y={132} width={232} height={32} rx={10} fill={p.panelAlt} stroke={p.line} />
      <Rect x={44} y={176} width={232} height={34} rx={12} fill={p.brand} />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* 9 / 9 — Rapports PDF & abonnement Pro                               */
/* ------------------------------------------------------------------ */

export function IllusReports({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;
  const lines = [
    { y: 82, w: 122 },
    { y: 94, w: 150 },
    { y: 106, w: 96 },
    { y: 118, w: 140 },
    { y: 130, w: 110 },
  ];

  return (
    <Scene
      width={width}
      id="g10"
      p={p}
      labels={
        <>
          <Box s={s} x={80} y={38} w={150} h={14} align="flex-start">
            <Lbl s={s} size={10.5} color={p.brandDeep} weight="800" spacing={0.5}>
              RAPPORT PDF
            </Lbl>
          </Box>
          <Box s={s} x={80} y={56} w={150} h={12} align="flex-start">
            <Lbl s={s} size={7.5} color={p.muted} weight="600" spacing={0}>
              Villa · 200 m² · Standard
            </Lbl>
          </Box>

          <Box s={s} x={82} y={147} w={64} h={22}>
            <Lbl s={s} size={8} color={p.ink} weight="700">
              Coût estimé
            </Lbl>
          </Box>
          <Box s={s} x={158} y={147} w={64} h={22}>
            <Lbl s={s} size={8} color={p.ink} weight="700">
              Suivi
            </Lbl>
          </Box>

          <Box s={s} x={204} y={12} w={54} h={24}>
            <Lbl s={s} size={9} color={p.amber} weight="800" spacing={0.6}>
              PRO
            </Lbl>
          </Box>

          <Box s={s} x={212} y={160} w={40} h={40}>
            <Icon s={s} size={18} color={p.onBrand} name="download" />
          </Box>

          <Box s={s} x={24} y={216} w={272} h={14}>
            <Lbl s={s} size={8} color={p.muted} weight="600" spacing={0.1}>
              Téléchargement PDF selon les droits d'abonnement
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={296} cy={40} r={68} fill={p.violetSoft} opacity={0.4} />
      <Circle cx={20} cy={226} r={58} fill={p.brandSoft} opacity={0.4} />

      <Rect x={88} y={40} width={176} height={168} rx={12} fill={p.panelAlt} stroke={p.line} />
      <Rect x={62} y={26} width={194} height={184} rx={14} fill={p.panel} stroke={p.line} />
      <Rect x={62} y={26} width={194} height={6} rx={3} fill={p.brandSoft} />

      {lines.map((line) => (
        <Rect
          key={`line-${line.y}`}
          x={80}
          y={line.y}
          width={line.w}
          height={5}
          rx={2.5}
          fill={p.strong}
          opacity={0.55}
        />
      ))}

      <Rect x={80} y={146} width={68} height={24} rx={8} fill={p.panelAlt} stroke={p.line} />
      <Rect x={156} y={146} width={68} height={24} rx={8} fill={p.panelAlt} stroke={p.line} />

      <Circle cx={232} cy={180} r={20} fill={p.brand} />
      <Rect x={204} y={12} width={54} height={24} rx={12} fill={p.amberSoft} stroke={p.amber} />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* Aide à la décision — tableau de bord budgétaire                     */
/* ------------------------------------------------------------------ */

/**
 * Tableau de bord de l'Aide à la décision : budget disponible vs coût estimé,
 * anneau d'analyse, écart et scénario retenu — exactement les indicateurs de
 * la page d'analyse de la plateforme (`/dashboard/decision/<id>`).
 */
export function IllusDecision({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;

  return (
    <Scene
      width={width}
      id="gdec"
      p={p}
      labels={
        <>
          {/* ── Carte gauche : budget vs coût estimé ── */}
          <Box s={s} x={32} y={42} w={158} h={12} align="flex-start">
            <Lbl s={s} size={7.5} color={p.muted} weight="700" spacing={0.9}>
              BUDGET DISPONIBLE
            </Lbl>
          </Box>
          <Box s={s} x={32} y={58} w={158} h={22} align="flex-start">
            <Lbl s={s} size={15} color={p.ink} weight="800">
              120 000 TND
            </Lbl>
          </Box>

          <Box s={s} x={32} y={84} w={50} h={12} align="flex-start">
            <Lbl s={s} size={7.5} color={p.muted} weight="600">
              Budget
            </Lbl>
          </Box>
          <Box s={s} x={32} y={106} w={50} h={12} align="flex-start">
            <Lbl s={s} size={7.5} color={p.muted} weight="600">
              Estimé
            </Lbl>
          </Box>

          <Box s={s} x={44} y={126} w={104} h={22} row gap={5}>
            <Icon s={s} size={11} color={p.brandDeep} name="circleCheck" />
            <Lbl s={s} size={7.5} color={p.brandDeep} weight="800">
              Écart : -5 500 TND
            </Lbl>
          </Box>

          {/* ── Carte droite : analyse IA ── */}
          <Box s={s} x={214} y={64} w={88} h={24}>
            <Lbl s={s} size={14} color={p.brandDeep} weight="800">
              78%
            </Lbl>
          </Box>
          <Box s={s} x={214} y={114} w={88} h={16}>
            <Lbl s={s} size={9.5} color={p.brandDeep} weight="800">
              Cohérent
            </Lbl>
          </Box>
          <Box s={s} x={214} y={134} w={88} h={14}>
            <Lbl s={s} size={7.5} color={p.muted} weight="600">
              Scénario Standard
            </Lbl>
          </Box>

          {/* ── Bandeau bas : lecture de l'analyse ── */}
          <Box s={s} x={34} y={188} w={252} h={40} row gap={7} align="flex-start">
            <Icon s={s} size={13} color={p.brand} name="chartLine" />
            <Lbl s={s} size={8.5} color={p.ink} weight="600">
              IA : budget, coût estimé et écart comparés
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={300} cy={214} r={72} fill={p.indigoSoft} opacity={0.35} />
      <Circle cx={22} cy={26} r={54} fill={p.brandSoft} opacity={0.45} />

      {/* Carte gauche : budget vs coût */}
      <Rect x={18} y={28} width={186} height={140} rx={16} fill={p.panel} stroke={p.line} />
      <Rect x={18} y={28} width={186} height={6} rx={3} fill={p.brandSoft} />

      {/* Barre budgétaire (100 %) */}
      <Rect x={86} y={86} width={104} height={8} rx={4} fill={p.brandSoft} />
      <Rect x={86} y={86} width={104} height={8} rx={4} fill={p.brand} />
      {/* Barre du coût estimé (92 % du budget) */}
      <Rect x={86} y={108} width={104} height={8} rx={4} fill={p.brandSoft} />
      <Rect x={86} y={108} width={96} height={8} rx={4} fill={p.brand} />

      {/* Pastille d'écart */}
      <Rect x={32} y={126} width={116} height={22} rx={11} fill={p.brandSoft} stroke={p.brandLine} />

      {/* Carte droite : anneau d'analyse IA */}
      <Rect x={214} y={28} width={88} height={140} rx={16} fill={p.panelAlt} stroke={p.line} />
      <Circle cx={258} cy={76} r={30} fill="none" stroke={p.line} strokeWidth={9} />
      <Path
        d="M 258 46 A 30 30 0 1 1 228.5 70.4"
        fill="none"
        stroke={p.brand}
        strokeWidth={9}
        strokeLinecap="round"
      />

      {/* Bandeau bas */}
      <Rect x={18} y={188} width={284} height={40} rx={16} fill={p.brandSoft} opacity={0.55} />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* 6 / 6 — Investissez sans risque (module Investissement)             */
/* ------------------------------------------------------------------ */

/**
 * Illustration du module « Investissement immobilier » : rapport de
 * rentabilité (ROI à 1, 5 et 10 ans), cash-flow, score IA sur 100 et les trois
 * scénarios (prudent / réaliste / optimiste). Mêmes briques et même palette
 * que les autres scènes du guide.
 */
export function IllusInvestment({ width, theme }: IllusProps) {
  const p = theme.dark ? DARK : LIGHT;
  const s = width / VIEW_W;

  return (
    <Scene
      width={width}
      id="ginv"
      p={p}
      labels={
        <>
          {/* ── Carte gauche : rapport de rentabilité ── */}
          <Box s={s} x={32} y={40} w={158} h={12} align="flex-start">
            <Lbl s={s} size={7.5} color={p.muted} weight="700" spacing={0.9}>
              RAPPORT INVESTISSEMENT
            </Lbl>
          </Box>

          <Box s={s} x={32} y={68} w={46} h={12} align="flex-start">
            <Lbl s={s} size={7.5} color={p.ink} weight="700">
              1 an
            </Lbl>
          </Box>
          <Box s={s} x={156} y={68} w={40} h={12} align="flex-end">
            <Lbl s={s} size={7.5} color={p.brandDeep} weight="800">
              +4,1%
            </Lbl>
          </Box>

          <Box s={s} x={32} y={90} w={46} h={12} align="flex-start">
            <Lbl s={s} size={7.5} color={p.ink} weight="700">
              5 ans
            </Lbl>
          </Box>
          <Box s={s} x={150} y={90} w={46} h={12} align="flex-end">
            <Lbl s={s} size={7.5} color={p.brandDeep} weight="800">
              +24,6%
            </Lbl>
          </Box>

          <Box s={s} x={32} y={112} w={46} h={12} align="flex-start">
            <Lbl s={s} size={7.5} color={p.ink} weight="700">
              10 ans
            </Lbl>
          </Box>
          <Box s={s} x={144} y={112} w={52} h={12} align="flex-end">
            <Lbl s={s} size={7.5} color={p.brandDeep} weight="800">
              +52,3%
            </Lbl>
          </Box>

          {/* Cash-flow mensuel */}
          <Box s={s} x={30} y={146} w={162} h={20} row gap={6} align="flex-start">
            <Icon s={s} size={12} color={p.brandDeep} name="chartLine" />
            <Lbl s={s} size={8} color={p.brandDeep} weight="800">
              Cash-flow +640 TND / mois
            </Lbl>
          </Box>

          {/* ── Carte droite : score IA ── */}
          <Box s={s} x={214} y={52} w={88} h={24}>
            <Lbl s={s} size={16} color={p.ink} weight="800">
              82
            </Lbl>
          </Box>
          <Box s={s} x={214} y={78} w={88} h={12}>
            <Lbl s={s} size={7} color={p.muted} weight="700">
              / 100
            </Lbl>
          </Box>
          <Box s={s} x={214} y={122} w={88} h={16}>
            <Lbl s={s} size={8.5} color={p.brandDeep} weight="800">
              Score IA
            </Lbl>
          </Box>

          {/* ── Bandeau : les trois scénarios ── */}
          <Box s={s} x={30} y={196} w={84} h={22}>
            <Lbl s={s} size={7.5} color={p.ink} weight="700">
              Prudent
            </Lbl>
            <Lbl s={s} size={7} color={p.muted} weight="600">
              6,2%
            </Lbl>
          </Box>
          <Box s={s} x={120} y={196} w={84} h={22}>
            <Lbl s={s} size={7.5} color={p.ink} weight="700">
              Réaliste
            </Lbl>
            <Lbl s={s} size={7} color={p.muted} weight="600">
              8,4%
            </Lbl>
          </Box>
          <Box s={s} x={210} y={196} w={84} h={22}>
            <Lbl s={s} size={7.5} color={p.ink} weight="700">
              Optimiste
            </Lbl>
            <Lbl s={s} size={7} color={p.muted} weight="600">
              11,1%
            </Lbl>
          </Box>
        </>
      }
    >
      <Circle cx={302} cy={210} r={70} fill={p.brandSoft} opacity={0.4} />
      <Circle cx={20} cy={24} r={52} fill={p.indigoSoft} opacity={0.35} />

      {/* Carte gauche : rapport de rentabilité */}
      <Rect x={18} y={26} width={186} height={150} rx={16} fill={p.panel} stroke={p.line} />
      <Rect x={18} y={26} width={186} height={6} rx={3} fill={p.brandSoft} />

      {/* Barres ROI : 1 an / 5 ans / 10 ans */}
      <Rect x={80} y={70} width={116} height={8} rx={4} fill={p.brandSoft} />
      <Rect x={80} y={70} width={26} height={8} rx={4} fill={p.brand} />
      <Rect x={80} y={92} width={116} height={8} rx={4} fill={p.brandSoft} />
      <Rect x={80} y={92} width={62} height={8} rx={4} fill={p.brand} />
      <Rect x={80} y={114} width={116} height={8} rx={4} fill={p.brandSoft} />
      <Rect x={80} y={114} width={104} height={8} rx={4} fill={p.brand} />

      {/* Cash-flow */}
      <Rect x={24} y={142} width={174} height={26} rx={13} fill={p.brandSoft} stroke={p.brandLine} />

      {/* Carte droite : anneau du score IA */}
      <Rect x={214} y={26} width={88} height={150} rx={16} fill={p.panelAlt} stroke={p.line} />
      <Circle cx={258} cy={70} r={28} fill="none" stroke={p.line} strokeWidth={8} />
      <Path
        d="M 258 42 A 28 28 0 1 1 233.9 61.5"
        fill="none"
        stroke={p.brand}
        strokeWidth={8}
        strokeLinecap="round"
      />

      {/* Bandeau des scénarios */}
      <Rect x={18} y={186} width={284} height={42} rx={16} fill={p.panel} stroke={p.line} />
      <Rect x={26} y={194} width={84} height={26} rx={9} fill={p.brandSoft} stroke={p.brandLine} />
      <Rect x={116} y={194} width={84} height={26} rx={9} fill={p.blueSoft} stroke={p.blueLine} />
      <Rect x={206} y={194} width={84} height={26} rx={9} fill={p.indigoSoft} stroke={p.violetLine} />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* Sélection                                                           */
/* ------------------------------------------------------------------ */

// L'ORDRE des illustrations n'est pas défini ici : le parcours de première
// utilisation (6 étapes) assemble ses visuels
// dans `OnboardingScreen.tsx`, en combinant ces scènes avec celles de
// `GuidePlans.tsx` (aperçus RÉELS de plans 2D / cotés / 3D). Chaque illustration
// reste exportée individuellement ci-dessus et réutilisable telle quelle.
