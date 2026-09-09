import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/convex";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useAppTheme } from "@/hooks/use-theme";
import { friendlyMessage } from "@/lib/errors";
import { getPendingPassword, getPendingProfile, setPendingPassword, setPendingProfile } from "@/lib/pendingAuth";
import { radius, spacing } from "@/theme/tokens";

export default function VerifyScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; email?: string }>();
  const { signIn } = useAuthActions();
  const updateProfile = useMutation(api.users.updateProfile);
  const setUserRole = useMutation(api.users.setUserRole);

  const email = params.email ?? "";
  const mode = params.mode ?? "otp";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const savePendingProfile = async () => {
    const p = getPendingProfile();
    if (!p) return;
    try {
      await updateProfile({ name: p.name, phone: p.phone });
      await setUserRole({ userRole: p.userRole });
    } catch {
      // non bloquant
    } finally {
      setPendingProfile(null);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "password") {
        const pending = getPendingPassword();
        if (!pending) throw new Error(t("auth.badCredentials"));
        await signIn("password", {
          email: pending.email,
          password: pending.password,
          code,
          flow: "email-verification",
        });
        setPendingPassword(null);
      } else {
        await signIn("email-otp", { email, code });
      }
      await savePendingProfile();
      router.replace("/(tabs)");
    } catch (err) {
      setError(friendlyMessage(err));
      setCode("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "password") {
        const pending = getPendingPassword();
        if (!pending) throw new Error(t("auth.badCredentials"));
        await signIn("password", { email: pending.email, password: pending.password, flow: "signIn" });
      } else {
        await signIn("email-otp", { email });
      }
      Alert.alert(t("auth.verifyTitle"), t("auth.resendCode"));
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <View style={styles.heading}>
        <View style={[styles.iconCircle, { backgroundColor: colors.authAccent + "1A" }]}>
          <Mail size={22} color={colors.authAccent} />
        </View>
        <Text variant="h3">{t("auth.verifyTitle")}</Text>
        <Text variant="small" color="muted" center>
          {t("auth.verifySubtitle")}
        </Text>
        <Text variant="bodyStrong" center>
          {email}
        </Text>
      </View>

      <View>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(v) => {
            const digits = v.replace(/\D/g, "").slice(0, 6);
            setCode(digits);
            if (digits.length === 6) handleVerify();
          }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.codeInput,
            {
              color: colors.foreground,
              borderColor: error ? colors.destructive : colors.input,
              backgroundColor: colors.card,
            },
          ]}
        />
        <Text variant="micro" color="muted" center style={{ marginTop: 4 }}>
          {error ?? "••••••"}
        </Text>
      </View>

      <Button fullWidth size="lg" loading={loading} disabled={code.length !== 6} onPress={handleVerify}>
        {t("auth.verifyCode")}
      </Button>

      <View style={styles.row}>
        <Text variant="small" color="muted">
          {t("auth.verifySubtitle")}{" "}
        </Text>
        <Text variant="small" bold style={{ color: colors.authPrimary }} onPress={handleResend}>
          {t("auth.resendCode")}
        </Text>
      </View>
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
    marginBottom: 4,
  },
  codeInput: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 14,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  row: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
});