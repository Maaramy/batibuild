import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";

export interface SegmentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface Props {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
}

export function Segmented({ options, value, onChange }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.muted }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.segment,
              active && { backgroundColor: colors.card, ...(active ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 } : {}) },
              pressed && !active && { opacity: 0.7 },
            ]}
          >
            <View style={styles.inner}>
              {opt.icon}
              <Text
                variant="small"
                bold={active}
                numberOfLines={1}
                style={active ? { color: colors.foreground } : { color: colors.mutedForeground }}
              >
                {opt.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SegmentedScroll({ options, value, onChange }: Props) {
  const { colors } = useAppTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.track, { alignSelf: "flex-start" }]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && { backgroundColor: colors.card }]}
          >
            <Text variant="small" bold={active} style={active ? { color: colors.foreground } : { color: colors.mutedForeground }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radius.sm,
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    borderRadius: radius.sm - 2,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});