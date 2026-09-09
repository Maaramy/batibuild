import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "gradient";
type Size = "sm" | "md" | "lg" | "icon";

interface Props {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

const HEIGHTS: Record<Size, number> = { sm: 32, md: 44, lg: 48, icon: 44 };
const PADDING_X: Record<Size, number> = { sm: spacing.md, md: spacing.lg, lg: spacing["2xl"], icon: 0 };
const RADIUS: Record<Size, number> = { sm: radius.sm, md: radius.md, lg: radius.md, icon: radius.md };

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onPress,
  icon,
  children,
  style,
  fullWidth,
  accessibilityLabel,
}: Props) {
  const { colors, shadows } = useAppTheme();
  const isDisabled = disabled || loading;

  const bg: ViewStyle["backgroundColor"] | undefined = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: "transparent",
    ghost: "transparent",
    destructive: colors.destructive,
    gradient: colors.primary,
  }[variant];

  const fg: string = {
    primary: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    outline: colors.foreground,
    ghost: colors.foreground,
    destructive: "#FFFFFF",
    gradient: "#FFFFFF",
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          paddingHorizontal: PADDING_X[size],
          borderRadius: RADIUS[size],
          backgroundColor: bg,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: variant === "outline" ? colors.input : undefined,
          opacity: isDisabled ? 0.5 : 1,
        },
        variant === "primary" && shadows.xs,
        variant === "gradient" && { shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
        variant === "destructive" && shadows.sm,
        (pressed && !isDisabled) && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        fullWidth && { width: "100%" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.content}>
          {icon}
          {children ? <View style={icon ? styles.iconGap : undefined}>{children}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconGap: {
    marginStart: spacing.sm,
  },
});