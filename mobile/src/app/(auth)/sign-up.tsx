import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Briefcase, Lock, Mail, Phone, Store, User } from "lucide-react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/convex";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useAppTheme } from "@/hooks/use-theme";
import { friendlyMessage } from "@/lib/errors";
import { setPendingPassword, setPendingProfile } from "@/lib/pendingAuth";
import { radius, spacing } from "@/theme/tokens";

type Role = "client" | "supplier" | "expert";

const ROLES: { value: Role; labelKey: string; descKey: string; icon: React.ReactNode }[] = [
  { value: "client", labelKey: "auth.roleClient", descKey: "auth.roleClientDesc", icon: <User size={18} /> },
  { value: "supplier", labelKey: "auth.roleSupplier", descKey: "auth.roleSupplierDesc", icon: <Store size={18} /> },
  { value: "expert", labelKey: "auth.roleExpert", descKey: "auth.roleExpertDesc", icon: <Briefcase size={18} /> },
];

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { signIn } = useAuthActions();
  const updateProfile = useMutation(api.users.updateProfile);
  const setUserRole = useMutation(api.users.setUserRole);

  const [role, setRole] = useState<Role>("client");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveProfileAfterAuth = async () => {
    try {
      await updateProfile({ name, phone });
      await setUserRole({ userRole: role });
    } catch {
      // le profil pourra être complété depuis l'écran Profil
    }
  };

  const handleSubmit = async () => {
    if (name.trim().length < 2) return setError(t("auth.invalidName"));
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return setError(t("auth.invalidPhone"));
    if (password !== confirm) return setError(t("auth.passwordMismatch"));
    if (password.length < 8) return setError(t("auth.passwordTooShort"));
    if (!accepted) {
      Alert.alert(t("auth.signUpTitle"), t("auth.acceptTerms"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await signIn("password", {
        email,
        password,
        name,
        phone,
        flow: "signUp",
      });
      if (!result.signingIn) {
        // Nouveau compte : vérification e-mail requise avant l'accès
        setPendingPassword({ email, password, flow: "signUp" });
        setPendingProfile({ name, phone, userRole: role });
        router.push({ pathname: "/(auth)/verify", params: { mode: "password", email } });
        return;
      }
      await saveProfileAfterAuth();
      setPendingProfile(null);
      // Redirection gérée par RootNavigator
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <View style={styles.heading}>
        <Text variant="h3">{t("auth.signUpTitle")}</Text>
        <Text variant="small" color="muted">
          {t("auth.signUpSubtitle")}
        </Text>
      </View>

      <View style={styles.roles}>
        {ROLES.map((r) => {
          const active = role === r.value;
          return (
            <Pressable
              key={r.value}
              onPress={() => setRole(r.value)}
              style={[
                styles.role,
                {
                  borderColor: active ? colors.authPrimary : colors.border,
                  backgroundColor: active ? colors.authPrimary + "12" : "transparent",
                },
              ]}
            >
              <View style={[styles.roleIcon, { backgroundColor: active ? colors.authPrimary : colors.accent }]}>
                <View style={{ opacity: active ? 1 : 0.6 }}>{r.icon}</View>
              </View>
              <Text variant="small" bold style={{ color: active ? colors.authPrimary : colors.foreground }}>
                {t(r.labelKey)}
              </Text>
              <Text variant="micro" color="muted" numberOfLines={1}>
                {t(r.descKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input label={t("auth.name")} placeholder="Votre nom" value={name} onChangeText={setName} icon={<User size={16} color={colors.mutedForeground} />} />
      <Input label={t("auth.phone")} placeholder="+216 XX XXX XXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} icon={<Phone size={16} color={colors.mutedForeground} />} />
      <Input label={t("auth.email")} placeholder={t("auth.emailPlaceholder")} keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} icon={<Mail size={16} color={colors.mutedForeground} />} />
      <Input label={t("auth.password")} placeholder="Min. 8 caractères" secureTextEntry value={password} onChangeText={setPassword} icon={<Lock size={16} color={colors.mutedForeground} />} />
      <Input label={t("auth.confirmPassword")} placeholder="Répéter" secureTextEntry value={confirm} onChangeText={setConfirm} icon={<Lock size={16} color={colors.mutedForeground} />} />

      <Pressable onPress={() => setAccepted(!accepted)} style={[styles.terms, { borderColor: colors.authPrimary + "33", backgroundColor: colors.authPrimary + "08" }]}>
        <View style={[styles.checkbox, { borderColor: accepted ? colors.authPrimary : colors.input, backgroundColor: accepted ? colors.authPrimary : "transparent" }]}>
          {accepted ? <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</Text> : null}
        </View>
        <Text variant="small" style={{ flex: 1 }}>
          {t("auth.acceptTerms")}
        </Text>
      </Pressable>

      {error ? (
        <Text variant="small" center style={{ color: colors.destructive }}>
          {error}
        </Text>
      ) : null}

      <Button fullWidth size="lg" loading={loading} onPress={handleSubmit}>
        {t("auth.signUp")}
      </Button>

      <View style={styles.footer}>
        <Text variant="small" color="muted">
          {t("auth.hasAccount")}{" "}
        </Text>
        <Link href="/(auth)/sign-in">
          <Text variant="small" bold style={{ color: colors.authPrimary }}>
            {t("auth.signInInstead")}
          </Text>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 4 },
  roles: { flexDirection: "row", gap: spacing.sm },
  role: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 4,
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  terms: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
});