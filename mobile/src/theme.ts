/**
 * Thème natif de l'application mobile BatiBuild — Material Design 3.
 *
 * PÉRIMÈTRE : mobile uniquement. La plateforme Web garde son propre thème
 * (`src/index.css`) ; rien de ce fichier n'est partagé avec elle.
 *
 * La palette Material 3 est dérivée des couleurs BatiBuild DÉJÀ définies dans
 * l'application (émeraude) : aucune nouvelle identité graphique n'est créée.
 */

import { useColorScheme } from "react-native";

/** Palette de marque historique — conservée telle quelle (composants existants). */
export const COLORS = {
  brand: "#059669",
  brand600: "#047857",
  brand700: "#065F46",
  brandDeep: "#06251B",
  brandDeep2: "#0A3D2C",
  accent: "#34D399",
  accentSoft: "#D1FAE5",

  ink: "#0F172A",
  inkSoft: "#334155",
  muted: "#64748B",
  line: "#E2E8F0",

  surface: "#FFFFFF",
  surfaceDark: "#0B1220",
  surfaceDark2: "#111A2C",

  white: "#FFFFFF",
} as const;

export const FONT = {
  // System fonts (SF Pro on iOS, Roboto on Android) — native look, no downloads.
  regular: undefined,
  semibold: undefined,
  bold: undefined,
} as const;

/** Échelle de formes Material 3 (coins arrondis). */
export const SHAPE = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  full: 999,
} as const;

/** Rôles de couleur Material 3 utilisés par la coque native. */
export type AppTheme = {
  dark: boolean;
  /** M3 primary / on-primary (actions principales). */
  primary: string;
  onPrimary: string;
  /** M3 primary-container — teinte d'état actif de la navigation. */
  primaryContainer: string;
  onPrimaryContainer: string;
  /** M3 surface / surface-container. */
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  onSurface: string;
  onSurfaceVariant: string;
  outlineVariant: string;
  /** Chrome de marque : bande d'état (barre système haute). */
  brandChrome: string;
  onBrandChrome: string;
};

const LIGHT_THEME: AppTheme = {
  dark: false,
  primary: COLORS.brand600,
  onPrimary: COLORS.white,
  primaryContainer: COLORS.accentSoft,
  onPrimaryContainer: COLORS.brand700,
  surface: "#FFFFFF",
  surfaceContainer: "#F6F8F7",
  surfaceContainerHigh: "#EDF2EF",
  onSurface: COLORS.ink,
  onSurfaceVariant: COLORS.muted,
  outlineVariant: COLORS.line,
  brandChrome: COLORS.brandDeep,
  onBrandChrome: COLORS.white,
};

const DARK_THEME: AppTheme = {
  dark: true,
  primary: COLORS.accent,
  onPrimary: COLORS.brandDeep,
  primaryContainer: COLORS.brandDeep2,
  onPrimaryContainer: "#A7F3D0",
  surface: COLORS.surfaceDark,
  surfaceContainer: COLORS.surfaceDark2,
  surfaceContainerHigh: "#162236",
  onSurface: "#F1F5F9",
  onSurfaceVariant: "#94A3B8",
  outlineVariant: "#1E293B",
  brandChrome: COLORS.brandDeep,
  onBrandChrome: COLORS.white,
};

export const themes = { light: LIGHT_THEME, dark: DARK_THEME } as const;

/**
 * Thème natif courant. `useColorScheme()` renvoie le mode système
 * (clair / sombre) : le mode « System Default » d'Android est donc respecté
 * sans modifier le thème de la plateforme Web.
 */
export function useAppTheme(): AppTheme {
  return useColorScheme() === "dark" ? DARK_THEME : LIGHT_THEME;
}
