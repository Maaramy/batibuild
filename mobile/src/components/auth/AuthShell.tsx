import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HardHat } from "lucide-react-native";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { useTranslation } from "react-i18next";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const bgTop = colors.authPrimary;
  const bgBottom = colors.authAccent;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Bande décorative supérieure */}
      <View
        style={[
          styles.band,
          {
            paddingTop: insets.top + spacing.lg,
            backgroundColor: bgTop,
          },
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: bgBottom, opacity: 0.25 },
          ]}
        />
        <View style={styles.brandRow}>
          <View style={[styles.logoMark, { backgroundColor: "rgba(255,255,255,0.14)" }]}>
            <HardHat size={22} color="#FFFFFF" />
          </View>
          <View>
            <Text variant="h4" style={{ color: "#FFFFFF" }}>
              {t("app.name")}
            </Text>
            <Text variant="micro" style={{ color: "rgba(255,255,255,0.8)" }}>
              {t("app.tagline")}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.topBar, { backgroundColor: colors.authGold }]} />
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  band: {
    height: 148,
    justifyContent: "flex-end",
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: "hidden",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: spacing.lg, marginTop: -36 },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
});