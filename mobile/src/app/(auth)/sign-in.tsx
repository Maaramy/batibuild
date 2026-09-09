import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from "react-i18next";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useAppTheme } from "@/hooks/use-theme";
import { friendlyMessage } from "@/lib/errors";
import { setPendingPassword, setPendingProfile } from "@/lib/pendingAuth";

export default function SignInScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError(t("auth.badCredentials"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("password", { email, password, flow: "signIn" });
      if (!result.signingIn) {
        // E-mail non vérifié → code OTP requis
        setPendingPassword({ email, password, flow: "signIn" });
        setPendingProfile(null);
        router.push({ pathname: "/(auth)/verify", params: { mode: "password", email } });
        return;
      }
      // Authentifié — la redirection est gérée par RootNavigator
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <View style={styles.heading}>
        <Text variant="h3">{t("auth.signInTitle")}</Text>
        <Text variant="small" color="muted">
          {t("auth.signInSubtitle")}
        </Text>
      </View>

      <Input
        label={t("auth.email")}
        placeholder={t("auth.emailPlaceholder")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        icon={<Mail size={16} color={colors.mutedForeground} />}
        containerStyle={styles.field}
      />
      <Input
        label={t("auth.password")}
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        icon={<Lock size={16} color={colors.mutedForeground} />}
        containerStyle={styles.field}
      />

      {error ? (
        <Text variant="small" center style={{ ...styles.error, color: colors.destructive }}>
          {error}
        </Text>
      ) : null}

      <Link href="/(auth)/forgot-password" style={styles.forgot}>
        <Text variant="small" bold style={styles.forgotText}>
          {t("auth.forgotPassword")}
        </Text>
      </Link>

      <Button fullWidth size="lg" loading={loading} onPress={handleSubmit}>
        {t("auth.signIn")}
      </Button>

      <View style={styles.footer}>
        <Text variant="small" color="muted">
          {t("auth.noAccount")}{" "}
        </Text>
        <Link href="/(auth)/sign-up">
          <Text variant="small" bold style={styles.forgotText}>
            {t("auth.createOne")}
          </Text>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 4 },
  field: { marginTop: 0 },
  error: { marginTop: -8 },
  forgot: { alignSelf: "flex-end", marginTop: -4 },
  forgotText: { color: "#10B981" },
  forgotPrimary: {},
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
});