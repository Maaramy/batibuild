import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";

interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: "default" | "flat" | "tinted";
  tintColor?: string;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  onPress?: () => void;
}

export function Card({
  children,
  variant = "default",
  tintColor,
  style,
  padded = true,
  onPress,
  ...rest
}: CardProps) {
  const { colors, shadows } = useAppTheme();
  const isFlat = variant === "flat";
  const isTinted = variant === "tinted";
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: isFlat ? "transparent" : isTinted ? (tintColor ?? colors.muted) : colors.card,
          borderWidth: isFlat ? 0 : 1,
          borderColor: isTinted ? "transparent" : colors.border,
          borderRadius: radius.lg,
          padding: padded ? spacing.lg : 0,
        },
        !isFlat && !isTinted && shadows.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function CardTitle({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <Text variant="h4" style={style}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <Text variant="small" color="muted" style={style}>
      {children}
    </Text>
  );
}

export function CardContent({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function CardFooter({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.footer, { borderTopColor: colors.border }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },
});