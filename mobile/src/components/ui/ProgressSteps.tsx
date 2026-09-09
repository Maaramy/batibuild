import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";

interface Props {
  steps: string[];
  current: number; // 0-indexed
}

export function ProgressSteps({ steps, current }: Props) {
  const { colors } = useAppTheme();
  const pct = ((current + 1) / steps.length) * 100;

  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
      </View>
      <View style={styles.labels}>
        {steps.map((s, i) => (
          <Text
            key={s}
            variant="micro"
            bold={i === current}
            style={{ color: i <= current ? colors.primary : colors.mutedForeground, textAlign: "center", flex: 1 }}
          >
            {s}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  track: { height: 6, borderRadius: radius.full, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full },
  labels: { flexDirection: "row" },
});