// ============================================================================
// BudgetBati Mobile — Design Tokens
// Ported 1:1 from the web design system (src/DESIGN_SYSTEM.md, src/index.css)
// Source of truth: BatiBuild platform. No invented values.
// ============================================================================

export interface Palette {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  // Status colors
  success: string;
  warning: string;
  info: string;
  violet: string;
  indigo: string;
  // Chart colors (chart-1 … chart-5)
  chart: [string, string, string, string, string];
  // Auth palette (Tunisian construction theme — terracotta / Mediterranean)
  authPrimary: string;
  authPrimaryLight: string;
  authAccent: string;
  authGold: string;
  // Tinted backgrounds for status chips
  successBg: string;
  warningBg: string;
  errorBg: string;
  infoBg: string;
  violetBg: string;
  // Overlay
  overlay: string;
  transparent: string;
}

export const light: Palette = {
  background: "#F8FAFC", // oklch(0.985 0.002 250)
  foreground: "#1E293B", // oklch(0.145 0.015 260)
  card: "#FFFFFF", // oklch(1 0 0)
  cardForeground: "#1E293B",
  popover: "#FFFFFF",
  popoverForeground: "#1E293B",
  primary: "#10B981", // oklch(0.596 0.145 163.2) — emerald-500
  primaryForeground: "#FFFFFF", // oklch(0.985 0 0)
  secondary: "#F1F5F9", // oklch(0.968 0.002 248) — slate-100
  secondaryForeground: "#334155",
  muted: "#F1F5F9",
  mutedForeground: "#64748B", // oklch(0.556 0.02 257) — slate-500
  accent: "#F1F5F9",
  accentForeground: "#334155",
  destructive: "#EF4444", // red-500
  border: "#E2E8F0", // oklch(0.918 0.004 248) — slate-200
  input: "#E2E8F0",
  ring: "#10B981",
  success: "#059669", // emerald-600
  warning: "#D97706", // amber-600
  info: "#2563EB", // blue-600
  violet: "#7C3AED",
  indigo: "#6366F1",
  chart: ["#10B981", "#6366F1", "#F59E0B", "#3B82F6", "#D946EF"],
  authPrimary: "#B4532A", // terracotta
  authPrimaryLight: "#C96F3D",
  authAccent: "#2F6DB3", // Mediterranean blue
  authGold: "#D9A538",
  successBg: "#ECFDF5",
  warningBg: "#FFFBEB",
  errorBg: "#FEF2F2",
  infoBg: "#EFF6FF",
  violetBg: "#F5F3FF",
  overlay: "rgba(0,0,0,0.5)",
  transparent: "rgba(0,0,0,0)",
};

export const dark: Palette = {
  background: "#0F172A", // oklch(0.145 0.012 258) — slate-900
  foreground: "#F8FAFC", // oklch(0.985 0.002 250)
  card: "#1E293B", // oklch(0.185 0.014 258) — slate-800
  cardForeground: "#F8FAFC",
  popover: "#1E293B",
  popoverForeground: "#F8FAFC",
  primary: "#34D399", // oklch(0.696 0.17 162.5) — emerald-400
  primaryForeground: "#0F172A", // dark text on primary
  secondary: "#334155", // slate-700
  secondaryForeground: "#F8FAFC",
  muted: "#334155",
  mutedForeground: "#94A3B8", // oklch(0.708 0.02 256) — slate-400
  accent: "#334155",
  accentForeground: "#F8FAFC",
  destructive: "#F87171", // red-400
  border: "rgba(255,255,255,0.10)",
  input: "rgba(255,255,255,0.15)",
  ring: "#34D399",
  success: "#34D399", // emerald-400
  warning: "#FBBF24", // amber-400
  info: "#60A5FA", // blue-400
  violet: "#A78BFA",
  indigo: "#818CF8",
  chart: ["#34D399", "#818CF8", "#FBBF24", "#60A5FA", "#E879F9"],
  authPrimary: "#C96F3D",
  authPrimaryLight: "#D98A5C",
  authAccent: "#5B8FD4",
  authGold: "#E5B85C",
  successBg: "rgba(16,185,129,0.14)",
  warningBg: "rgba(245,158,11,0.14)",
  errorBg: "rgba(239,68,68,0.14)",
  infoBg: "rgba(59,130,246,0.14)",
  violetBg: "rgba(139,92,246,0.14)",
  overlay: "rgba(0,0,0,0.6)",
  transparent: "rgba(0,0,0,0)",
};

// ── Spacing (dominant values from the codebase) ─────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

// ── Border radius ────────────────────────────────────────────────────────────
export const radius = {
  sm: 6, // inputs, badges, buttons (rounded-md)
  md: 8, // cards, dialogs, dropdowns
  lg: 12, // cards default (rounded-xl)
  xl: 16, // rounded-2xl
  full: 999,
} as const;

// ── Typography hierarchy (from the web design system) ───────────────────────
export const fontSizes = {
  micro: 10, // label-overline
  xs: 12, // small text, captions
  sm: 14, // body, buttons, nav
  base: 16, // body large
  lg: 18, // H4
  xl: 20, // H3
  "2xl": 24, // H2
  "3xl": 30, // H2 large
  "4xl": 36, // H1
} as const;

export const fontWeights = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
  black: "900" as const,
};

export const lineHeights = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.7,
} as const;

// ── Shadows (soft elevation, from the design system) ────────────────────────
export interface ShadowSpec {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export function shadows(palette: Palette): Record<"none" | "xs" | "sm" | "md" | "soft" | "softLg" | "modal", ShadowSpec> {
  const base = palette.foreground;
  return {
    none: { shadowColor: base, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    xs: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    md: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
    soft: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    softLg: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 },
    modal: { shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 25, elevation: 12 },
  };
}

// ── Transitions (durations) ──────────────────────────────────────────────────
export const durations = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;