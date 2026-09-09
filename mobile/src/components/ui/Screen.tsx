import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useAppTheme } from "@/hooks/use-theme";
import { spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";

interface Props {
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  style?: ViewStyle;
  headerTitle?: string;
  headerRight?: ReactNode;
  showBack?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  children,
  scroll = true,
  contentContainerStyle,
  style,
  headerTitle,
  headerRight,
  showBack = false,
  padded = true,
  refreshing,
  onRefresh,
}: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const header = headerTitle || showBack || headerRight ? (
    <View style={[styles.header, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.headerInner}>
        {showBack ? (
          <View style={styles.headerSide}>
            <View
              style={[styles.iconBtn, { borderColor: colors.border }]}
              onTouchEnd={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
            >
              <ArrowLeft size={18} color={colors.foreground} />
            </View>
          </View>
        ) : (
          <View style={styles.headerSide} />
        )}
        <View style={styles.headerTitleWrap}>
          {headerTitle ? (
            <Text variant="h4" numberOfLines={1}>
              {headerTitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.headerSide, { alignItems: "flex-end" }]}>{headerRight}</View>
      </View>
    </View>
  ) : null;

  if (!scroll) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }, style]}>
        {header}
        <View style={[styles.body, padded && { paddingHorizontal: spacing.lg }]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }, style]}>
      {header}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.body,
          padded && { paddingHorizontal: spacing.lg },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControlCompat refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

// Import nécessaire pour le RefreshControl (web-safe)
import { RefreshControl } from "react-native";
function RefreshControlCompat(props: { refreshing: boolean; onRefresh: () => void; colors?: string[]; tintColor?: string }) {
  return <RefreshControl {...props} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: spacing.sm },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    minHeight: 44,
  },
  headerSide: { width: 40, alignItems: "flex-start" },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flexGrow: 1, paddingBottom: 32 },
});