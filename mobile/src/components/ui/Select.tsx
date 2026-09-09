import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Sheet } from "@/components/ui/Sheet";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
}

export function Select({ label, value, options, onChange, placeholder = "Sélectionner…", error }: Props) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          {
            borderColor: error ? colors.destructive : colors.input,
            backgroundColor: colors.card,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text variant="body" style={{ flex: 1, color: selected ? colors.foreground : colors.mutedForeground }} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </Pressable>
      {error ? (
        <Text variant="small" color={colors.destructive} style={styles.hint}>
          {error}
        </Text>
      ) : null}

      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        <View style={styles.list}>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: colors.border, backgroundColor: pressed ? colors.accent : "transparent" },
                ]}
              >
                <Text variant="body" bold={active} style={{ flex: 1, color: active ? colors.primary : colors.foreground }}>
                  {opt.label}
                </Text>
                {active ? <Check size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, width: "100%" },
  label: {},
  field: {
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  hint: { marginTop: 2 },
  list: { paddingBottom: spacing.xl },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});