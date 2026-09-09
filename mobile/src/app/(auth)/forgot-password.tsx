import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { KeyRound, Lock, Mail } from "lucide-react-native";
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
import { radius, spacing } from "@/theme/tokens";

type Step = "email" | "code" | "password" | "success";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { signIn } = useAuthActions();
  const resetPassword = useMutation(api.users.resetPassword);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await signIn("email-otp", { email });
      setStep("code");
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (code.length !== 6) return;
    // Comportement identique à la plateforme Web : le code sert de
    // confirmation de possession de la boîte mail, puis nouveau mot de passe.
    setStep("password");
  };

  const reset = async () => {
    if (newPw !== confirmPw) return setError(t("auth.passwordMismatch"));
    if (newPw.length < 8) return setError(t("auth.passwordTooShort"));
    setLoading(true);
    setError(null);
    try {
      await resetPassword({ email, newPassword: newPw });
      setStep("success");
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {step === "email" && (
        <>
          <View style={styles.heading}>
            <View style={[styles.iconCircle, { backgroundColor: colors.authPrimary + "1A" }]}>
              <Lock size={22} color={colors.authPrimary} />
            </View>
            <Text variant="h3">{t("auth.forgotTitle")}</Text>
            <Text variant="small" color="muted" center>
              {t("auth.forgotSubtitle")}
            </Text>
          </View>
          <Input
            label={t("auth.email")}
            placeholder={t("auth.emailPlaceholder")}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            icon={<Mail size={16} color={colors.mutedForeground} />}
          />
          {error ? (
            <Text variant="small" center style={{ color: colors.destructive }}>
              {error}
            </Text>
          ) : null}
          <Button fullWidth size="lg" loading={loading} disabled={!email} onPress={sendCode}>
            {t("auth.sendCode")}
          </Button>
          <Button fullWidth variant="ghost" onPress={() => router.back()}>
            {t("common.back")}
          </Button>
        </>
      )}

      {step === "code" && (
        <>
          <View style={styles.heading}>
            <View style={[styles.iconCircle, { backgroundColor: colors.authAccent + "1A" }]}>
              <Mail size={22} color={colors.authAccent} />
            </View>
            <Text variant="h3">{t("auth.verifyTitle")}</Text>
            <Text variant="small" color="muted" center>
              {t("auth.verifySubtitle")} {email}
            </Text>
          </View>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.codeInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
          />
          <Button fullWidth size="lg" disabled={code.length !== 6} onPress={submitCode}>
            {t("common.next")}
          </Button>
          <Text variant="small" bold center style={{ color: colors.authPrimary }} onPress={sendCode}>
            {t("auth.resendCode")}
          </Text>
        </>
      )}

      {step === "password" && (
        <>
          <View style={styles.heading}>
            <View style={[styles.iconCircle, { backgroundColor: colors.authPrimary + "1A" }]}>
              <KeyRound size={22} color={colors.authPrimary} />
            </View>
            <Text variant="h3">{t("auth.newPassword")}</Text>
          </View>
          <Input
            label={t("auth.newPassword")}
            placeholder="Min. 8 caractères"
            secureTextEntry
            value={newPw}
            onChangeText={setNewPw}
            icon={<Lock size={16} color={colors.mutedForeground} />}
          />
          <Input
            label={t("auth.confirmPassword")}
            placeholder="Répéter"
            secureTextEntry
            value={confirmPw}
            onChangeText={setConfirmPw}
            icon={<Lock size={16} color={colors.mutedForeground} />}
          />
          {error ? (
            <Text variant="small" center style={{ color: colors.destructive }}>
              {error}
            </Text>
          ) : null}
          <Button fullWidth size="lg" loading={loading} onPress={reset}>
            {t("auth.resetPassword")}
          </Button>
        </>
      )}

      {step === "success" && (
        <View style={styles.heading}>
          <View style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
            <Text style={{ fontSize: 22 }}>✓</Text>
          </View>
          <Text variant="h3" center>
            {t("auth.resetSuccess")}
          </Text>
          <Text variant="small" color="muted" center>
            {t("auth.resetSuccessSubtitle")}
          </Text>
          <Button fullWidth size="lg" style={{ marginTop: spacing.md }} onPress={() => router.replace("/(auth)/sign-in")}>
            {t("auth.signIn")}
          </Button>
        </View>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: "center", gap: 8 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  codeInput: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 14,
    textAlign: "center",
  },
});