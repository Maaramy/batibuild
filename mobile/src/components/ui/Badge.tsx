import { StyleSheet, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";

interface Props {
  label: string;
  color?: string;
  bg?: string;
  dot?: string;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function Badge({ label, color, bg, dot, icon, style }: Props) {
  const { colors } = useAppTheme();
  const fg = color ?? colors.mutedForeground;
  const background = bg ?? colors.muted;
  return (
    <View style={[styles.badge, { backgroundColor: background, borderColor: fg + "22" }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      {icon}
      <Text variant="small" bold style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});