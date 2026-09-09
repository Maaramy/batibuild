import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { formatTnd } from "@/lib/format";
import type { Project } from "@/lib/convex";

interface Props {
  project: Project;
  colors?: ReturnType<typeof useAppTheme>["colors"];
}

export function BreakdownRows({ project, colors }: { project: Project; colors: ReturnType<typeof useAppTheme>["colors"] }) {
  const est = project.costEstimate;
  if (!est || !est.breakdown?.length) return null;
  return (
    <View style={{ gap: spacing.md }}>
      {est.breakdown.map((b, i) => (
        <View key={i}>
          <View style={styles.row}>
            <Text variant="body" bold style={{ flex: 1 }} numberOfLines={1}>
              {b.label}
            </Text>
            <Text variant="bodyStrong" style={{ color: colors.foreground }}>
              {formatTnd(b.estimatedCost)}
            </Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.barFill,
                { backgroundColor: colors.chart[i % colors.chart.length], width: `${Math.min(100, Math.max(2, b.percentage ?? 0))}%` },
              ]}
            />
          </View>
          <Text variant="micro" color="muted" style={{ marginTop: 4 }}>
            {Math.round(b.percentage ?? 0)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ScenarioCards({ project }: Props) {
  const { colors } = useAppTheme();
  const scenarios = project.costEstimate?.budgetScenarios;
  if (!scenarios) return null;
  const order = ["economique", "standard", "premium"] as const;
  const tones = [colors.warning, colors.primary, colors.violet];
  return (
    <View style={styles.scenarios}>
      {order.map((key, i) => {
        const s = scenarios[key];
        if (!s) return null;
        const active = project.costEstimate?.budgetScenarios?.standard?.totalCost === s.totalCost;
        return (
          <View
            key={key}
            style={[
              styles.scenario,
              {
                backgroundColor: colors.card,
                borderColor: active ? colors.ring : colors.border,
              },
            ]}
          >
            <Text variant="small" color="muted">
              {s.label}
            </Text>
            <Text variant="bodyStrong" style={{ color: tones[i], marginTop: 4 }}>
              {formatTnd(s.totalCost)}
            </Text>
            <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
              {formatTnd(s.costPerM2)}/m²
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  barTrack: { height: 6, borderRadius: radius.full, marginTop: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: radius.full },
  scenarios: { flexDirection: "row", gap: spacing.sm },
  scenario: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});