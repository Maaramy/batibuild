import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";

interface Props extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle | ViewStyle[];
  inputStyle?: ViewStyle | ViewStyle[];
  keyboardType?: KeyboardTypeOptions;
}

export function Input({
  label,
  error,
  hint,
  icon,
  containerStyle,
  inputStyle,
  editable = true,
  ...rest
}: Props) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.destructive : focused ? colors.ring : colors.input;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: colors.card,
            opacity: editable ? 1 : 0.6,
          },
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          {...rest}
          editable={editable}
          placeholderTextColor={colors.mutedForeground}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: colors.foreground,
              paddingStart: icon ? 0 : spacing.md,
            },
            inputStyle,
          ]}
        />
      </View>
      {error ? (
        <Text variant="small" color={colors.destructive} style={styles.hint}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" color="muted" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, width: "100%" },
  label: { marginBottom: 0 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.sm,
    minHeight: 44, // cible tactile ≥ 44px
    paddingHorizontal: spacing.md,
  },
  icon: { marginEnd: spacing.sm },
  input: {
    flex: 1,
    fontSize: 16, // ≥16px pour éviter le zoom iOS
    paddingVertical: 12,
  },
  hint: { marginTop: 2 },
});