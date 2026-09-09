import { Pressable, StyleSheet, View } from "react-native";
import { Building2, Heart, HardHat, MoreHorizontal } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { STATUS_META, projectTypeLabel, regionLabel, type ProjectStatus } from "@/constants/catalog";
import { formatDateShort, formatM2, formatTnd } from "@/lib/format";
import type { Project } from "@/lib/convex";
import { useTranslation } from "react-i18next";

interface Props {
  project: Project;
  onPress?: () => void;
  onMenu?: () => void;
}

export function ProjectCard({ project, onPress, onMenu }: Props) {
  const { colors, shadows } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const status = (project.status ?? "draft") as ProjectStatus;
  const meta = STATUS_META[status] ?? STATUS_META.draft;

  const open = () => (onPress ? onPress() : router.push(`/project/${project._id}`));

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...shadows.soft,
        },
        pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: meta.dot }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.badgeRow}>
              <Badge label={t(meta.labelKey)} color={meta.color} bg={meta.bg} dot={meta.dot} />
              {project.isFavorite ? <Heart size={14} color="#F43F5E" fill="#F43F5E" /> : null}
            </View>
            <Text variant="bodyStrong" numberOfLines={1}>
              {project.name}
            </Text>
          </View>
          {onMenu ? (
            <Pressable hitSlop={8} onPress={onMenu} style={styles.menuBtn}>
              <MoreHorizontal size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Building2 size={12} color={colors.mutedForeground} />
            <Text variant="small" color="muted" numberOfLines={1}>
              {projectTypeLabel(project.category)}
            </Text>
          </View>
          {project.surface ? (
            <View style={styles.metaItem}>
              <HardHat size={12} color={colors.mutedForeground} />
              <Text variant="small" color="muted">
                {formatM2(project.surface)}
              </Text>
            </View>
          ) : null}
          <Text variant="small" color="muted" style={{ opacity: 0.6 }}>
            {formatDateShort(project.createdAt)}
          </Text>
        </View>

        {project.costEstimate ? (
          <View style={[styles.estimateRow, { borderTopColor: colors.border }]}>
            <View>
              <Text variant="micro" color="muted">
                Estimation
              </Text>
              <Text variant="bodyStrong" style={{ color: colors.primary, marginTop: 2 }}>
                {formatTnd(project.costEstimate.totalCost)}
              </Text>
            </View>
            {project.costEstimate.costPerSquareMeter ? (
              <View style={{ alignItems: "flex-end" }}>
                <Text variant="micro" color="muted">
                  Prix/m²
                </Text>
                <Text variant="small" bold style={{ marginTop: 2 }}>
                  {formatTnd(project.costEstimate.costPerSquareMeter)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.estimateRow, { borderTopColor: colors.border }]}>
            <Text variant="small" color="muted">
              {regionLabel(project.region)}
            </Text>
            <Text variant="small" color="muted" style={{ opacity: 0.7 }}>
              {project.status === "draft" ? "—" : project.status === "analyzing" ? "Analyse…" : ""}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  accent: { width: 3 },
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  estimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
});