import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Check, Cloud, Globe, LogOut, Moon, Palette, Sun } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";

import { api } from "@/lib/convex";
import { useAppTheme, type ThemeMode } from "@/hooks/use-theme";
import { setLanguage } from "@/i18n";
import { setNotificationsEnabled, isNotificationsEnabled } from "@/lib/storage";
import { spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { AvatarWithInitials } from "@/components/AvatarWithInitials";
import { initials } from "@/lib/format";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors, mode, setMode, resolved } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  const user = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  const [lang, setLang] = useState("fr");
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    isNotificationsEnabled().then(setNotifEnabled).catch(() => {});
  }, []);

  useEffect(() => {
    import("@/i18n").then((m) => setLang(m.default.language));
  }, []);

  const handleSignOut = () => {
    Alert.alert(t("profile.signOut"), t("profile.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.logout"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: t("profile.modeLight"), icon: <Sun size={16} color={colors.warning} /> },
    { value: "dark", label: t("profile.modeDark"), icon: <Moon size={16} color={colors.info} /> },
    { value: "system", label: t("profile.modeSystem"), icon: <Palette size={16} color={colors.mutedForeground} /> },
  ];

  const langOptions = [
    { value: "fr", label: "Français" },
    { value: "en", label: "English" },
    { value: "ar", label: "العربية" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.xl, paddingBottom: 48 }}
      >
        <Text variant="h3">{t("profile.title")}</Text>

        {/* Carte identité */}
        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.identity}>
            <AvatarWithInitials name={user?.name} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {user?.name ?? "Utilisateur"}
              </Text>
              <Text variant="small" color="muted" numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
              <View style={styles.planRow}>
                <Text variant="micro" bold style={{ color: colors.primary }}>
                  {user?.subscriptionPlan === "pro" || user?.subscriptionPlan === "expert"
                    ? t("profile.proPlan")
                    : t("profile.freePlan")}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Langue */}
        <Text variant="overline" style={{ color: colors.mutedForeground, marginTop: spacing.xl, marginBottom: spacing.md }}>
          {t("profile.language")}
        </Text>
        <Card padded={false} style={{ overflow: "hidden" }}>
          {langOptions.map((opt, i) => {
            const active = lang === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={async () => {
                  setLang(opt.value);
                  await setLanguage(opt.value);
                }}
                style={({ pressed }) => [
                  styles.optionRow,
                  { borderBottomColor: colors.border, backgroundColor: pressed ? colors.accent : "transparent" },
                  i === langOptions.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Globe size={16} color={active ? colors.primary : colors.mutedForeground} />
                <Text variant="body" bold={active} style={{ color: active ? colors.primary : colors.foreground, marginStart: spacing.md, flex: 1 }}>
                  {opt.label}
                </Text>
                {active ? <Check size={16} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </Card>

        {/* Thème */}
        <Text variant="overline" style={{ color: colors.mutedForeground, marginTop: spacing.xl, marginBottom: spacing.md }}>
          {t("profile.theme")}
        </Text>
        <Card padded={false} style={{ overflow: "hidden" }}>
          {themeOptions.map((opt, i) => {
            const active = mode === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setMode(opt.value)}
                style={({ pressed }) => [
                  styles.optionRow,
                  { borderBottomColor: colors.border, backgroundColor: pressed ? colors.accent : "transparent" },
                  i === themeOptions.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                {opt.icon}
                <Text variant="body" bold={active} style={{ color: active ? colors.primary : colors.foreground, marginStart: spacing.md, flex: 1 }}>
                  {opt.label}
                </Text>
                {active ? <Check size={16} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </Card>

        {/* Notifications (préférence locale, prête pour push) */}
        <Card style={{ marginTop: spacing.xl }}>
          <View style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{t("profile.notifications")}</Text>
              <Text variant="small" color="muted" style={{ marginTop: 2 }}>
                {t("profile.offlineNote")}
              </Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={async (v) => {
                setNotifEnabled(v);
                await setNotificationsEnabled(v);
              }}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Synchronisation */}
        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.notifRow}>
            <Cloud size={18} color={colors.success} />
            <View style={{ flex: 1, marginStart: spacing.md }}>
              <Text variant="bodyStrong">{t("profile.syncStatus")}</Text>
              <Text variant="small" color="muted" style={{ marginTop: 2 }}>
                {t("profile.synced")}
              </Text>
            </View>
            <Text variant="micro" bold style={{ color: colors.success }}>
              {t("profile.online")}
            </Text>
          </View>
        </Card>

        {/* Version */}
        <Text variant="small" color="muted" center style={{ marginTop: spacing.xl }}>
          {t("profile.about")} · {t("profile.version")} {Constants.expoConfig?.version ?? "1.0.0"}
        </Text>

        {/* Déconnexion */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOut,
            { borderColor: colors.destructive + "55", opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <LogOut size={18} color={colors.destructive} />
          <Text variant="button" style={{ color: colors.destructive, marginStart: spacing.sm }}>
            {t("profile.signOut")}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifRow: { flexDirection: "row", alignItems: "center" },
  signOut: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});