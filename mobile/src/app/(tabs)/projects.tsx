import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Heart, Plus, Search, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/convex";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { SegmentedScroll } from "@/components/ui/Segmented";
import { ProjectCard } from "@/components/project/ProjectCard";
import { EmptyState, ErrorState, LoadingState, SkeletonList } from "@/components/ui/States";
import { Sheet } from "@/components/ui/Sheet";
import { friendlyMessage } from "@/lib/errors";
import type { Project } from "@/lib/convex";

type Filter = "all" | "favorites" | "completed" | "drafts" | "analyzing";

export default function ProjectsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();

  const projects = useQuery(api.projects.getUserProjects, isAuthenticated ? {} : "skip") as Project[] | undefined;
  const toggleFavorite = useMutation(api.projects.toggleFavorite);
  const deleteProject = useMutation(api.projects.deleteProject);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [menuProject, setMenuProject] = useState<Project | null>(null);

  const filtered = useMemo(() => {
    const list = projects ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      if (filter === "favorites" && !p.isFavorite) return false;
      if (filter !== "all" && filter !== "favorites" && p.status !== filter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, filter, search]);

  const handleDelete = async (p: Project) => {
    setMenuProject(null);
    if (p.status === "completed") {
      Alert.alert(t("projects.title"), t("projects.deleteBlocked"));
      return;
    }
    Alert.alert(t("projects.title"), t("projects.deleteConfirm"), [
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
        <View style={styles.titleRow}>
          <Text variant="h3">{t("projects.title")}</Text>
          <Pressable
            onPress={() => router.push("/project/new")}
            style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
            accessibilityLabel={t("projects.create")}
          >
            <Plus size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <Input
          placeholder={t("projects.search")}
          value={search}
          onChangeText={setSearch}
          icon={<Search size={16} color={colors.mutedForeground} />}
          containerStyle={{ marginTop: spacing.md }}
        />
        <View style={{ marginTop: spacing.md }}>
          <SegmentedScroll
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            options={[
              { value: "all", label: t("projects.filterAll") },
              { value: "favorites", label: t("projects.filterFavorites") },
              { value: "completed", label: t("projects.filterCompleted") },
              { value: "drafts", label: t("projects.filterDrafts") },
            ]}
          />
        </View>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {filtered.length === 0 ? (
          <EmptyState
            title={t("projects.noProjectsYet")}
            subtitle={t("projects.createFirst")}
            action={
              <Pressable
                onPress={() => router.push("/project/new")}
                style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text variant="button" style={{ color: "#FFFFFF", marginStart: 6 }}>
                  {t("projects.create")}
                </Text>
              </Pressable>
            }
          />
        ) : (
          <View style={{ gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
            {filtered.map((p) => (
              <ProjectCard
                key={p._id}
                project={p}
                onMenu={() => setMenuProject(p)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Sheet
        visible={!!menuProject}
        title={menuProject?.name}
        onClose={() => setMenuProject(null)}
      >
        {menuProject ? (
          <View style={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
            <ActionRow
              icon={<Heart size={18} color={colors.primary} />}
              label={menuProject.isFavorite ? t("projects.unfavorite") : t("projects.favorite")}
              onPress={() => {
                const p = menuProject;
                setMenuProject(null);
                toggleFavorite({ projectId: p._id }).catch(() => {});
              }}
            />
            <ActionRow
              icon={<Search size={18} color={colors.foreground} />}
              label={t("projects.open")}
              onPress={() => {
                const p = menuProject;
                setMenuProject(null);
                router.push(`/project/${p._id}`);
              }}
            />
            <ActionRow
              icon={<Trash2 size={18} color={colors.destructive} />}
              label={t("common.delete")}
              destructive
              onPress={() => handleDelete(menuProject)}
            />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function ActionRow({ icon, label, onPress, destructive }: { icon: React.ReactNode; label: string; onPress: () => void; destructive?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, { borderBottomColor: colors.border, backgroundColor: pressed ? colors.accent : "transparent" }]}
    >
      {icon}
      <Text variant="body" bold={destructive} style={{ color: destructive ? colors.destructive : colors.foreground, marginStart: spacing.md }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fab: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flex: 1, paddingHorizontal: spacing.lg },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
  },
});