import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";

interface Props {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: string; // couleur d'accent (ex: colors.primary)
  onPress?: () => void;
}

export function StatCard({ label, value, icon, tone, onPress }: Props) {
  const { colors, shadows } = useAppTheme();
  const accent = tone ?? colors.primary;
  return (
    <View
      onTouchEnd={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...shadows.soft,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text variant="overline" style={{ color: colors.mutedForeground, flex: 1 }}>
          {label}
        </Text>
        {icon ? <View style={[styles.iconWrap, { backgroundColor: accent + "1A" }]}>{icon}</View> : null}
      </View>
      <Text variant="h3" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: spacing.xs }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    flex: 1,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});