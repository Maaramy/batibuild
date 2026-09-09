import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { useAppTheme } from "@/hooks/use-theme";
import { fontSizes, fontWeights, lineHeights, type Palette } from "@/theme/tokens";

type Variant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body"
  | "bodyStrong"
  | "small"
  | "micro"
  | "overline"
  | "label"
  | "button"
  | "caption";

interface Props extends TextProps {
  variant?: Variant;
  /** Couleur hex/rgba ou nom sémantique : "muted", "primary", "destructive", "success", "warning", "info", "white" */
  color?: string;
  bold?: boolean;
  center?: boolean;
  numberOfLines?: number;
}

const VARIANT_STYLES: Record<Variant, TextStyle> = {
  h1: { fontSize: fontSizes["4xl"], fontWeight: fontWeights.bold, lineHeight: fontSizes["4xl"] * lineHeights.tight },
  h2: { fontSize: fontSizes["3xl"], fontWeight: fontWeights.bold, lineHeight: fontSizes["3xl"] * lineHeights.tight },
  h3: { fontSize: fontSizes["2xl"], fontWeight: fontWeights.semibold, lineHeight: fontSizes["2xl"] * lineHeights.snug },
  h4: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, lineHeight: fontSizes.lg * lineHeights.snug },
  body: { fontSize: fontSizes.sm, fontWeight: fontWeights.normal, lineHeight: fontSizes.sm * lineHeights.normal },
  bodyStrong: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, lineHeight: fontSizes.sm * lineHeights.normal },
  small: { fontSize: fontSizes.xs, fontWeight: fontWeights.normal, lineHeight: fontSizes.xs * lineHeights.normal },
  micro: { fontSize: fontSizes.micro, fontWeight: fontWeights.normal, lineHeight: fontSizes.micro * lineHeights.normal },
  overline: { fontSize: fontSizes.micro, fontWeight: fontWeights.semibold, textTransform: "uppercase", letterSpacing: 1.8, lineHeight: fontSizes.micro * lineHeights.normal },
  label: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, lineHeight: fontSizes.sm * lineHeights.normal },
  button: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, lineHeight: fontSizes.sm * lineHeights.normal },
  caption: { fontSize: fontSizes.xs, fontWeight: fontWeights.normal, lineHeight: fontSizes.xs * lineHeights.normal },
};

function resolveColor(color: string | undefined, colors: Palette, fallback: string): string {
  if (!color) return fallback;
  switch (color) {
    case "muted":
      return colors.mutedForeground;
    case "primary":
      return colors.primary;
    case "destructive":
      return colors.destructive;
    case "success":
      return colors.success;
    case "warning":
      return colors.warning;
    case "info":
      return colors.info;
    case "white":
      return "#FFFFFF";
    default:
      return color;
  }
}

export function Text({ variant = "body", color, bold, center, style, ...rest }: Props) {
  const { colors } = useAppTheme();
  return (
    <RNText
      {...rest}
      style={[
        VARIANT_STYLES[variant],
        { color: resolveColor(color, colors, variant === "caption" ? colors.mutedForeground : colors.foreground) },
        bold && { fontWeight: fontWeights.bold },
        center && { textAlign: "center" },
        style,
      ]}
    />
  );
}