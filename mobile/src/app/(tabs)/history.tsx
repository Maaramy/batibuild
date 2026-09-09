import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { CalendarClock, Search, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/convex";
import { useAppTheme } from "@/hooks/use-theme";
import { spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { ProjectCard } from "@/components/project/ProjectCard";
import { EmptyState, SkeletonList } from "@/components/ui/States";
import { Sheet } from "@/components/ui/Sheet";
import { friendlyMessage } from "@/lib/errors";
import type { Project } from "@/lib/convex";

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();

  const projects = useQuery(api.projects.getUserProjects, isAuthenticated ? {} : "skip") as Project[] | undefined;
  const deleteProject = useMutation(api.projects.deleteProject);
  const [search, setSearch] = useState("");
  const [menuEstimate, setMenuEstimate] = useState<Project | null>(null);

  const estimates = useMemo(() => {
    const list = (projects ?? []).filter((p) => p.status === "completed" && p.costEstimate);
    const q = search.trim().toLowerCase();
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [projects, search]);

  const handleDelete = (p: Project) => {
    setMenuEstimate(null);
    Alert.alert(t("history.title"), t("projects.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProject({ projectId: p._id });
          } catch (err) {
            Alert.alert(t("error.title"), friendlyMessage(err));
          }
        },
      },
    ]);
  };

  if (projects === undefined) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.lg }]}>
        <SkeletonList rows={4} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text variant="h3">{t("history.title")}</Text>
        <Text variant="small" color="muted" style={{ marginTop: 2 }}>
          {t("history.subtitle")}
        </Text>
        <Input
          placeholder={t("history.search")}
          value={search}
          onChangeText={setSearch}
          icon={<Search size={16} color={colors.mutedForeground} />}
          containerStyle={{ marginTop: spacing.md }}
        />
      </View>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {estimates.length === 0 ? (
          <EmptyState
            title={t("history.empty")}
            subtitle={t("history.emptySubtitle")}
            icon={<CalendarClock size={28} color={colors.mutedForeground} />}
          />
        ) : (
          <View style={{ gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
            {estimates.map((p) => (
              <ProjectCard key={p._id} project={p} onMenu={() => setMenuEstimate(p)} />
            ))}
          </View>
        )}
      </ScrollView>

      <Sheet visible={!!menuEstimate} title={menuEstimate?.name} onClose={() => setMenuEstimate(null)}>
        {menuEstimate ? (
          <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
            <Pressable
              onPress={() => {
                const p = menuEstimate;
                setMenuEstimate(null);
                router.push(`/project/${p._id}`);
              }}
              style={({ pressed }) => [styles.actionRow, { backgroundColor: pressed ? colors.accent : "transparent" }]}
            >
              <CalendarClock size={18} color={colors.primary} />
              <Text variant="body" style={{ color: colors.foreground, marginStart: spacing.md }}>
                {t("history.reopen")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleDelete(menuEstimate)}
              style={({ pressed }) => [styles.actionRow, { backgroundColor: pressed ? colors.accent : "transparent" }]}
            >
              <Trash2 size={18} color={colors.destructive} />
              <Text variant="body" bold style={{ color: colors.destructive, marginStart: spacing.md }}>
                {t("common.delete")}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  list: { flex: 1, paddingHorizontal: spacing.lg },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
});