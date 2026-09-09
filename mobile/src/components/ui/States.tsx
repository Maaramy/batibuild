import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { AlertTriangle, RefreshCw, Inbox } from "lucide-react-native";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";

// ── Loading (spinner + texte) ────────────────────────────────────────────────
export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text variant="small" color="muted" style={{ marginTop: spacing.md }}>
        {label}
      </Text>
    </View>
  );
}

// ── Skeleton (blocs animés) ──────────────────────────────────────────────────
export function Skeleton({ width = "100%", height = 14, radius: r = 6, style }: { width?: number | string; height?: number; radius?: number; style?: object }) {
  const { colors } = useAppTheme();
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.9, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: r, backgroundColor: colors.accent, opacity: anim }, style]}
    />
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: spacing.lg }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.skeletonCard, { borderColor: "transparent" }]}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
          <Skeleton width="30%" height={20} />
        </View>
      ))}
    </View>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.center, { paddingVertical: spacing["4xl"] }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
        {icon ?? <Inbox size={28} color={colors.mutedForeground} />}
      </View>
      <Text variant="bodyStrong" center style={{ marginTop: spacing.lg }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="small" color="muted" center style={{ marginTop: 4, maxWidth: 260 }}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

// ── Error state (message compréhensible + Réessayer) ────────────────────────
export function ErrorState({ message, onRetry, title }: { message: string; onRetry?: () => void; title?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.center, { paddingVertical: spacing["4xl"] }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.errorBg }]}>
        <AlertTriangle size={26} color={colors.warning} />
      </View>
      <Text variant="bodyStrong" center style={{ marginTop: spacing.lg }}>
        {title ?? "Une erreur est survenue"}
      </Text>
      <Text variant="small" color="muted" center style={{ marginTop: 4, maxWidth: 300 }}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryBtn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <RefreshCw size={16} color={colors.foreground} />
          <Text variant="button" style={{ marginStart: 6 }}>
            Réessayer
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  iconCircle: { width: 64, height: 64, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  skeletonCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
});