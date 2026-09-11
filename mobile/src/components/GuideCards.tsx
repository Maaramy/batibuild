import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Logo } from "./Logo";
import { GUIDE_ICONS, type LucideIcon } from "./icons";
import type { AppTheme } from "../theme";

/**
 * Cartes illustratives du guide de première visite (application mobile Android).
 *
 * Ce sont des RECRÉATIONS NATIVES des écrans de la plateforme, dans l'ordre où
 * la plateforme les présente (`src/components/LandingMockScreens.tsx`) :
 *
 *   1. « Importez vos documents »      (nouveau projet — import)
 *   2. « Analyse en cours… »           (reconnaissance par l'IA)
 *   3. « Coût total estimé »           (rapport + scénarios)
 *   4. « Score IA »                    (analyse d'investissement)
 *
 * Les icônes sont les MÊMES que celles de la plateforme (famille lucide, via
 * `icons.ts`) : le guide est donc visuellement cohérent avec le tableau de bord,
 * en mode clair comme en mode sombre.
 *
 * Aucune nouvelle identité graphique, aucune page web reconstruite : ce ne sont
 * que des illustrations, sans interaction et sans appel réseau.
 *
 * PÉRIMÈTRE : mobile uniquement. Aucun fichier web / Convex n'est concerné.
 */

/** Largeur de conception des cartes : elles sont mises à l'échelle du téléphone. */
const DESIGN_W = 320;

/** Couleurs reprises des écrans de la plateforme (aucune teinte inventée). */
const C = {
  blue50: "#EFF6FF",
  blue200: "#BFDBFE",
  blue500: "#3B82F6",
  blue600: "#2563EB",
  blue700: "#1D4ED8",
  violet100: "#EDE9FE",
  violet500: "#8B5CF6",
  violet600: "#7C3AED",
  indigo100: "#E0E7FF",
  indigo200: "#C7D2FE",
  indigo500: "#6366F1",
  indigo600: "#4F46E5",
  emerald500: "#10B981",
  emerald600: "#059669",
  teal500: "#14B8A6",
} as const;

type CardProps = {
  /** Largeur réelle de la carte à l'écran (mise à l'échelle depuis DESIGN_W). */
  width: number;
  theme: AppTheme;
};

/* ------------------------------------------------------------------ */
/* Cadre : chrome de navigateur + mise à l'échelle                     */
/* ------------------------------------------------------------------ */

function MockChrome({ path, theme }: { path: string; theme: AppTheme }) {
  const urlBg = theme.dark ? "#1E293B" : "#F1F5F9";
  return (
    <View style={[styles.chrome, { borderBottomColor: theme.outlineVariant }]}>
      <View style={styles.chromeDots}>
        <View style={[styles.chromeDot, { backgroundColor: "#F87171" }]} />
        <View style={[styles.chromeDot, { backgroundColor: "#FBBF24" }]} />
        <View style={[styles.chromeDot, { backgroundColor: "#34D399" }]} />
      </View>
      <View style={[styles.chromeUrl, { backgroundColor: urlBg }]}>
        <Logo size={13} radiusRatio={0.26} />
        <Text style={[styles.chromeUrlText, { color: theme.onSurfaceVariant }]} numberOfLines={1}>
          app.batibuild.app
        </Text>
        <Text style={[styles.chromeUrlPath, { color: theme.onSurfaceVariant }]} numberOfLines={1}>
          {path}
        </Text>
      </View>
    </View>
  );
}

function MockFrame({
  width,
  theme,
  path,
  children,
}: {
  width: number;
  theme: AppTheme;
  path: string;
  children: ReactNode;
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const scale = width / DESIGN_W;

  return (
    <View style={styles.frameShadow}>
      <View
        style={[
          styles.frame,
          {
            width,
            height: contentHeight * scale,
            borderColor: theme.outlineVariant,
            backgroundColor: theme.dark ? theme.surfaceContainer : theme.surface,
          },
        ]}
      >
        <View
          style={{ width: DESIGN_W, transformOrigin: "top left", transform: [{ scale }] }}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          <MockChrome path={path} theme={theme} />
          <View style={styles.body}>{children}</View>
        </View>
      </View>
    </View>
  );
}

/** Pagination décorative du carrousel de la plateforme. */
function Dots({ index, theme }: { index: number; theme: AppTheme }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: theme.outlineVariant },
            i === index && { width: 18, backgroundColor: C.blue500 },
          ]}
        />
      ))}
    </View>
  );
}

/** Indicateur tournant de la carte « Analyse en cours… ». */
function Spinner({ color }: { color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const Icon = GUIDE_ICONS.loader;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Icon size={16} color={color} />
    </Animated.View>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  theme,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  theme: AppTheme;
}) {
  return (
    <View style={[styles.field, { borderColor: theme.outlineVariant }]}>
      <View style={styles.fieldHead}>
        <Icon size={13} color={theme.onSurfaceVariant} />
        <Text style={[styles.fieldLabel, { color: theme.onSurface }]}>{label}</Text>
      </View>
      <View
        style={[
          styles.fieldInput,
          {
            borderColor: theme.outlineVariant,
            backgroundColor: theme.dark ? theme.surface : "#FFFFFF",
          },
        ]}
      >
        <Text style={[styles.fieldValue, { color: theme.onSurface }]}>{value}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 1. « Nouveau projet » — import des documents                        */
/* ------------------------------------------------------------------ */

export function MockImportCard({ width, theme }: CardProps) {
  const Upload = GUIDE_ICONS.upload;
  const Check = GUIDE_ICONS.check;

  return (
    <MockFrame width={width} theme={theme} path="/nouveau-projet">
      <View style={styles.typesRow}>
        {["Maison", "Villa", "Appartement", "Piscine"].map((t, i) => (
          <View
            key={t}
            style={[
              styles.typeChip,
              i === 0
                ? { borderColor: C.blue200, backgroundColor: theme.dark ? "#1E3A8A33" : C.blue50 }
                : { borderColor: theme.outlineVariant },
            ]}
          >
            <Text
              style={[
                styles.typeChipText,
                { color: i === 0 ? (theme.dark ? "#93C5FD" : C.blue700) : theme.onSurfaceVariant },
                i === 0 && styles.bold,
              ]}
            >
              {t}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.dropzone,
          { borderColor: C.blue200, backgroundColor: theme.dark ? "#1E3A8A1F" : "#EFF6FF66" },
        ]}
      >
        <Upload size={22} color={C.blue500} />
        <Text style={[styles.dropTitle, { color: theme.onSurface }]}>Importez vos documents</Text>
        <Text style={[styles.dropSub, { color: theme.onSurfaceVariant }]}>
          Photo, plan PDF, image satellite
        </Text>
        <View style={[styles.fileChip, { backgroundColor: "#3B82F61A" }]}>
          <Check size={11} color={C.blue600} />
          <Text style={[styles.fileChipText, { color: C.blue600 }]}>Plan_maison.pdf</Text>
        </View>
      </View>

      <Field icon={GUIDE_ICONS.mapPin} label="Région" value="Tunis" theme={theme} />
      <Field icon={GUIDE_ICONS.ruler} label="Surface (m²)" value="150" theme={theme} />

      <View style={styles.rowEnd}>
        <View style={[styles.primaryBtn, { backgroundColor: C.blue500 }]}>
          <GUIDE_ICONS.cpu size={13} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Analyser mon projet</Text>
        </View>
      </View>

      <Dots index={0} theme={theme} />
    </MockFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 2. « Analyse en cours » — reconnaissance par l'IA                   */
/* ------------------------------------------------------------------ */

export function MockAnalysisCard({ width, theme }: CardProps) {
  const tiles: { label: string; value: string; Icon: LucideIcon }[] = [
    { label: "Type de projet", value: "Maison à étage", Icon: GUIDE_ICONS.building },
    { label: "Surface détectée", value: "150 m²", Icon: GUIDE_ICONS.ruler },
    { label: "Matériaux", value: "24 identifiés", Icon: GUIDE_ICONS.layers },
    { label: "Qualité", value: "Standard", Icon: GUIDE_ICONS.sparkles },
  ];

  return (
    <MockFrame width={width} theme={theme} path="/nouveau-projet">
      <View style={styles.analysisHead}>
        <View style={[styles.spinnerTile, { backgroundColor: theme.dark ? "#7C3AED33" : C.violet100 }]}>
          <Spinner color={C.violet600} />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.cardTitle, { color: theme.onSurface }]}>Analyse en cours...</Text>
          <Text style={[styles.cardSub, { color: theme.onSurfaceVariant }]}>
            Reconnaissance du projet par l'IA
          </Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.surfaceContainerHigh }]}>
        <View style={[styles.progressFill, { backgroundColor: C.violet500 }]} />
      </View>

      <View style={styles.grid2}>
        {tiles.map(({ label, value, Icon }) => (
          <View
            key={label}
            style={[
              styles.detectTile,
              {
                borderColor: theme.dark ? "#7C3AED4D" : "#DDD6FE",
                backgroundColor: theme.dark ? theme.surface : "#FFFFFF99",
              },
            ]}
          >
            <View style={styles.detectHead}>
              <Icon size={11} color={C.violet500} />
              <Text style={[styles.detectLabel, { color: theme.onSurfaceVariant }]}>{label}</Text>
            </View>
            <Text style={[styles.detectValue, { color: theme.onSurface }]}>{value}</Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.iaBadge,
          { borderColor: theme.dark ? "#7C3AED4D" : "#DDD6FE", backgroundColor: "#8B5CF60D" },
        ]}
      >
        <GUIDE_ICONS.sparkles size={13} color={C.violet500} />
        <Text style={[styles.iaBadgeText, { color: theme.onSurfaceVariant }]}>
          IA :{" "}
          <Text style={[styles.bold, { color: theme.onSurface }]}>
            Projet détecté avec 92% de confiance
          </Text>
        </Text>
      </View>

      <Dots index={1} theme={theme} />
    </MockFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 3. « Coût total estimé » — rapport et scénarios                     */
/* ------------------------------------------------------------------ */

export function MockReportCard({ width, theme }: CardProps) {
  const breakdown = [
    { label: "Gros œuvre", pct: 38, color: C.blue500 },
    { label: "Second œuvre", pct: 29, color: C.violet500 },
    { label: "Équipements", pct: 15, color: C.emerald500 },
  ];
  const scenarios = [
    { label: "Économique", value: "163 590 TND", active: false },
    { label: "Standard", value: "253 590 TND", active: true },
    { label: "Premium", value: "398 475 TND", active: false },
  ];

  return (
    <MockFrame width={width} theme={theme} path="/nouveau-projet">
      <View
        style={[
          styles.totalBox,
          { borderColor: theme.dark ? "#0596694D" : "#A7F3D0", backgroundColor: "#10B98114" },
        ]}
      >
        <Text style={[styles.totalLabel, { color: theme.onSurfaceVariant }]}>COÛT TOTAL ESTIMÉ</Text>
        <Text style={styles.totalValue}>253 590 TND</Text>
        <Text style={[styles.totalSub, { color: theme.onSurfaceVariant }]}>
          Marché tunisien 2026 • Prix TTC
        </Text>
      </View>

      <View style={styles.grid3}>
        {breakdown.map((b) => (
          <View key={b.label} style={[styles.breakTile, { borderColor: theme.outlineVariant }]}>
            <View style={styles.breakHead}>
              <View style={[styles.breakDot, { backgroundColor: b.color }]} />
              <Text style={[styles.breakPct, { color: theme.onSurfaceVariant }]}>{b.pct}%</Text>
            </View>
            <Text style={[styles.breakLabel, { color: theme.onSurface }]} numberOfLines={1}>
              {b.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid3}>
        {scenarios.map((s) => (
          <View
            key={s.label}
            style={[
              styles.scenarioTile,
              s.active
                ? { borderColor: C.emerald500, backgroundColor: "#10B9810D" }
                : { borderColor: theme.outlineVariant, opacity: 0.7 },
            ]}
          >
            <Text style={[styles.scenarioLabel, { color: theme.onSurfaceVariant }]}>{s.label}</Text>
            <Text
              style={[
                styles.scenarioValue,
                { color: s.active ? C.emerald600 : theme.onSurface },
              ]}
              numberOfLines={1}
            >
              {s.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <View style={[styles.outlineBtn, { borderColor: theme.outlineVariant }]}>
          <GUIDE_ICONS.download size={13} color={theme.onSurfaceVariant} />
          <Text style={[styles.outlineBtnText, { color: theme.onSurfaceVariant }]}>
            Télécharger PDF
          </Text>
        </View>
        <View style={[styles.outlineBtn, { backgroundColor: C.emerald500, borderColor: C.emerald500 }]}>
          <GUIDE_ICONS.fileText size={13} color="#FFFFFF" />
          <Text style={[styles.outlineBtnText, { color: "#FFFFFF" }]}>Voir le rapport</Text>
        </View>
      </View>

      <Dots index={2} theme={theme} />
    </MockFrame>
  );
}

/* ------------------------------------------------------------------ */
/* 4. « Analyse d'investissement » — score IA et prévisions            */
/* ------------------------------------------------------------------ */

const FORECAST_BARS = [18, 26, 34, 42, 51, 60, 70, 81, 92, 100];

/** Cadran du score — même tracé SVG que la plateforme (94 %). */
function ScoreRing({ theme }: { theme: AppTheme }) {
  const R = 23;
  const CIRC = 2 * Math.PI * R;

  return (
    <View style={styles.scoreRingWrap}>
      <Svg width={56} height={56} viewBox="0 0 56 56" style={styles.scoreRingSvg}>
        <Circle
          cx={28}
          cy={28}
          r={R}
          fill="none"
          strokeWidth={5}
          stroke={theme.outlineVariant}
        />
        <Circle
          cx={28}
          cy={28}
          r={R}
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          stroke={C.indigo500}
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - 0.94)}
        />
      </Svg>
      <Text style={[styles.scoreValue, { color: theme.onSurface }]}>94</Text>
    </View>
  );
}

export function MockInvestmentCard({ width, theme }: CardProps) {
  const kpis = [
    { label: "Rendement net", value: "6,2%", color: C.emerald600, Icon: GUIDE_ICONS.percent },
    { label: "Flux de trésorerie", value: "+980 TND", color: C.blue600, Icon: GUIDE_ICONS.wallet },
    { label: "Return on Invest.", value: "82%", color: C.indigo600, Icon: GUIDE_ICONS.trending },
  ];

  return (
    <MockFrame width={width} theme={theme} path="/analyse-investissement">
      <View
        style={[
          styles.scoreBox,
          { borderColor: theme.dark ? "#6366F14D" : C.indigo200, backgroundColor: "#6366F114" },
        ]}
      >
        <ScoreRing theme={theme} />
        <View style={styles.flex1}>
          <Text style={[styles.cardTitle, { color: theme.onSurface }]}>Score IA</Text>
          <Text style={[styles.cardSub, { color: theme.onSurfaceVariant }]}>
            Excellent investissement
          </Text>
          <View style={styles.confidenceRow}>
            <GUIDE_ICONS.check size={11} color={C.emerald600} />
            <Text style={styles.confidenceText}>Confiance IA 92%</Text>
          </View>
        </View>
      </View>

      <View style={styles.grid3}>
        {kpis.map(({ label, value, color, Icon }) => (
          <View key={label} style={[styles.kpiTile, { borderColor: theme.outlineVariant }]}>
            <Icon size={13} color={color} />
            <Text style={[styles.kpiValue, { color }]}>{value}</Text>
            <Text style={[styles.kpiLabel, { color: theme.onSurfaceVariant }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.chartBox, { borderColor: theme.outlineVariant }]}>
        <View style={styles.chartHead}>
          <Text style={[styles.chartTitle, { color: theme.onSurfaceVariant }]}>
            Prévisions des bénéfices (10 ans)
          </Text>
          <Text style={[styles.chartTotal, { color: C.indigo600 }]}>+428 000 TND</Text>
        </View>
        <View style={styles.chart}>
          {FORECAST_BARS.map((h, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: `${h}%`,
                  backgroundColor: i === FORECAST_BARS.length - 1 ? C.indigo600 : "#6366F140",
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.chartAxis}>
          <Text style={[styles.axisLabel, { color: theme.onSurfaceVariant }]}>An 1</Text>
          <Text style={[styles.axisLabel, { color: theme.onSurfaceVariant }]}>An 3</Text>
          <Text style={[styles.axisLabel, { color: theme.onSurfaceVariant }]}>An 5</Text>
          <Text style={[styles.axisLabel, { color: theme.onSurfaceVariant }]}>An 10</Text>
        </View>
      </View>

      <View
        style={[
          styles.iaBadge,
          { borderColor: theme.dark ? "#6366F14D" : C.indigo200, backgroundColor: "#6366F10D" },
        ]}
      >
        <GUIDE_ICONS.bot size={13} color={C.indigo500} />
        <Text style={[styles.iaBadgeText, { color: theme.onSurfaceVariant }]}>
          Assistant IA :{" "}
          <Text style={[styles.bold, { color: theme.onSurface }]}>
            « Cet investissement est-il rentable ? »
          </Text>
        </Text>
      </View>

      <View style={[styles.primaryBtn, styles.investCta, { backgroundColor: C.indigo500 }]}>
        <GUIDE_ICONS.sparkles size={13} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Analyser mon investissement</Text>
        <GUIDE_ICONS.arrowRight size={13} color="#FFFFFF" />
      </View>

      <Dots index={2} theme={theme} />
    </MockFrame>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  frameShadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  frame: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chromeDots: {
    flexDirection: "row",
    gap: 5,
  },
  chromeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chromeUrl: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chromeUrlText: {
    fontSize: 9.5,
    fontWeight: "600",
  },
  chromeUrlPath: {
    flexShrink: 1,
    fontSize: 9.5,
  },
  body: {
    padding: 13,
  },
  flex1: {
    flex: 1,
  },
  bold: {
    fontWeight: "700",
  },

  /* Types de projet */
  typesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: "500",
  },

  /* Zone d'import */
  dropzone: {
    marginTop: 13,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 13,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  dropTitle: {
    marginTop: 6,
    fontSize: 11.5,
    fontWeight: "600",
  },
  dropSub: {
    marginTop: 2,
    fontSize: 9.5,
  },
  fileChip: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  fileChipText: {
    fontSize: 9.5,
    fontWeight: "600",
  },

  /* Champs */
  field: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 11,
    padding: 9,
  },
  fieldHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  fieldValue: {
    fontSize: 11.5,
  },

  /* Boutons */
  rowEnd: {
    marginTop: 13,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  primaryBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  investCta: {
    marginTop: 13,
    justifyContent: "center",
  },
  actionsRow: {
    marginTop: 13,
    flexDirection: "row",
    gap: 8,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  outlineBtnText: {
    fontSize: 10,
    fontWeight: "600",
  },

  /* Analyse */
  analysisHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  spinnerTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  cardSub: {
    fontSize: 9.5,
  },
  progressTrack: {
    marginTop: 13,
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    width: "78%",
    height: "100%",
    borderRadius: 999,
  },
  grid2: {
    marginTop: 13,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detectTile: {
    width: (DESIGN_W - 26 - 8) / 2,
    borderWidth: 1,
    borderRadius: 11,
    padding: 9,
  },
  detectHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detectLabel: {
    fontSize: 9.5,
  },
  detectValue: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: "700",
  },
  iaBadge: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  iaBadgeText: {
    flex: 1,
    fontSize: 9.5,
  },

  /* Rapport */
  totalBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 9.5,
    letterSpacing: 1,
    fontWeight: "600",
  },
  totalValue: {
    marginTop: 3,
    fontSize: 26,
    fontWeight: "800",
    color: C.emerald600,
    letterSpacing: -0.3,
  },
  totalSub: {
    marginTop: 2,
    fontSize: 9.5,
  },
  grid3: {
    marginTop: 11,
    flexDirection: "row",
    gap: 7,
  },
  breakTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  breakHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  breakDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  breakPct: {
    fontSize: 9.5,
  },
  breakLabel: {
    fontSize: 9,
    fontWeight: "600",
  },
  scenarioTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  scenarioLabel: {
    fontSize: 8.5,
  },
  scenarioValue: {
    marginTop: 1,
    fontSize: 9.5,
    fontWeight: "700",
  },

  /* Investissement */
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
  },
  scoreRingWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingSvg: {
    // Le cadran démarre en haut, comme sur la plateforme.
    transform: [{ rotate: "-90deg" }],
  },
  scoreValue: {
    position: "absolute",
    fontSize: 17,
    fontWeight: "800",
  },
  confidenceRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: "600",
    color: C.emerald600,
  },
  kpiTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 3,
    alignItems: "center",
  },
  kpiValue: {
    marginTop: 3,
    fontSize: 11.5,
    fontWeight: "800",
  },
  kpiLabel: {
    marginTop: 1,
    fontSize: 8,
  },
  chartBox: {
    marginTop: 11,
    borderWidth: 1,
    borderRadius: 11,
    padding: 10,
  },
  chartHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 9.5,
    fontWeight: "600",
  },
  chartTotal: {
    fontSize: 9,
    fontWeight: "700",
  },
  chart: {
    height: 74,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chartAxis: {
    marginTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisLabel: {
    fontSize: 8,
  },

  /* Pagination */
  dots: {
    marginTop: 13,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
