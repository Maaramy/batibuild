import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useConvexAuth, useQuery } from "convex/react";
import { ChevronRight, FolderKanban, History, Megaphone, Plus, Sparkles, Wallet } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Project } from "@/lib/convex";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProjectCard } from "@/components/project/ProjectCard";
import { EmptyState } from "@/components/ui/States";
import { formatTnd } from "@/lib/format";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();

  const user = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  const projects = (useQuery(api.projects.getUserProjects, isAuthenticated ? {} : "skip") ?? []) as Project[];
  const announcements = useQuery(api.announcements.getAnnouncementsForUser, isAuthenticated ? {} : "skip") ?? [];

  const completed = projects.filter((p) => p.status === "completed");
  const drafts = projects.filter((p) => p.status === "draft");
  const totalCost = completed.reduce((s, p) => s + (p.costEstimate?.totalCost ?? 0), 0);
  const avgM2 = (() => {
    const withM2 = completed.filter((p) => p.costEstimate?.costPerSquareMeter);
    if (!withM2.length) return null;
    return withM2.reduce((s, p) => s + (p.costEstimate?.costPerSquareMeter ?? 0), 0) / withM2.length;
  })();

  const quickActions = [
    { key: "new", label: t("home.newEstimate"), icon: <Plus size={22} color="#FFFFFF" />, bg: colors.primary, onPress: () => router.push("/project/new") },
    { key: "projects", label: t("home.myProjects"), icon: <FolderKanban size={22} color={colors.primary} />, bg: colors.primary + "14", onPress: () => router.push("/(tabs)/projects") },
    { key: "history", label: t("home.communications"), icon: <Megaphone size={22} color={colors.authGold} />, bg: colors.authGold + "1A", onPress: () => router.push("/(tabs)/history") },
  ];

  const recent = [...projects].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.xl, backgroundColor: colors.card }]}>
        <Text variant="h4" style={{ color: colors.mutedForeground }}>
          {t("home.welcome")} 👋
        </Text>
        <Text variant="h2" style={{ marginTop: 2 }}>
          {user?.name?.split(" ")[0] ?? "BudgetBati"}
        </Text>
        <Text variant="small" color="muted" style={{ marginTop: 2 }}>
          {t("home.subtitle")}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Actions rapides */}
      <View style={styles.actions}>
        {quickActions.map((a) => (
          <Pressable
            key={a.key}
            onPress={a.onPress}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: a.bg, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {a.icon}
            <Text variant="small" bold style={{ color: colors.foreground, marginTop: 8, textAlign: "center" }}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Statistiques */}
      <View style={styles.stats}>
        <StatCard label={t("home.totalProjects")} value={String(projects.length)} icon={<FolderKanban size={16} color={colors.primary} />} tone={colors.primary} />
        <StatCard label={t("home.completed")} value={String(completed.length)} icon={<Sparkles size={16} color={colors.success} />} tone={colors.success} />
      </View>
      <View style={styles.stats}>
        <StatCard label={t("home.totalEstimatedCost")} value={formatTnd(totalCost)} icon={<Wallet size={16} color={colors.warning} />} tone={colors.warning} />
        <StatCard label={t("home.priceM2")} value={avgM2 ? formatTnd(avgM2) : "—"} icon={<Sparkles size={16} color={colors.info} />} tone={colors.info} />
      </View>

      {/* Projets récents */}
      <View style={styles.section}>
        <Pressable style={styles.sectionHeader} onPress={() => router.push("/(tabs)/projects")}>
          <Text variant="h4">{t("home.recentProjects")}</Text>
          <View style={styles.viewAll}>
            <Text variant="small" bold style={{ color: colors.primary }}>
              {t("home.viewAll")}
            </Text>
            <ChevronRight size={14} color={colors.primary} />
          </View>
        </Pressable>

        {projects.length === 0 ? (
          <Card>
            <EmptyState
              title={t("projects.noProjectsYet")}
              subtitle={t("projects.createFirst")}
              action={
                <Pressable
                  onPress={() => router.push("/project/new")}
                  style={({ pressed }) => [
                    styles.cta,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text variant="button" style={{ color: "#FFFFFF", marginStart: 6 }}>
                    {t("home.estimateCta")}
                  </Text>
                </Pressable>
              }
            />
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {recent.map((p) => (
              <ProjectCard key={p._id} project={p} />
            ))}
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
});