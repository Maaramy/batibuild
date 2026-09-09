import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Copy, FileDown, Heart, Loader2, MapPin, Share2, Trash2, Wand2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Project } from "@/lib/convex";
import { useAppTheme } from "@/hooks/use-theme";
import { radius, spacing } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Screen } from "@/components/ui/Screen";
import { DonutChart } from "@/components/ui/DonutChart";
import { BreakdownRows, ScenarioCards } from "@/components/estimate/EstimateCard";
import { EmptyState, ErrorState, LoadingState, SkeletonList } from "@/components/ui/States";
import { STATUS_META, projectTypeLabel, regionLabel, type ProjectStatus } from "@/constants/catalog";
import { formatDate, formatM2, formatTnd } from "@/lib/format";
import { estimateShareText, shareEstimatePdf, shareText, copyLink } from "@/lib/share";
import { friendlyMessage } from "@/lib/errors";

export default function ProjectDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const project = useQuery(api.projects.getProject, { projectId: id as any }) as Project | null | undefined;
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);
  const toggleFavorite = useMutation(api.projects.toggleFavorite);
  const deleteProject = useMutation(api.projects.deleteProject);

  const [running, setRunning] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const donutSlices = useMemo(() => {
    const est = project?.costEstimate;
    if (!est?.breakdown?.length) return [];
    return est.breakdown.map((b, i) => ({
      value: b.estimatedCost,
      color: colors.chart[i % colors.chart.length],
    }));
  }, [project, colors]);

  if (project === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 16 }}>
        <SkeletonList rows={5} />
      </View>
    );
  }

  if (project === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ErrorState message={t("error.unexpected")} onRetry={() => router.back()} />
      </View>
    );
  }

  const status = (project.status ?? "draft") as ProjectStatus;
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const est = project.costEstimate;

  const handleEstimate = async () => {
    setRunning(true);
    try {
      await simulateAnalysis({ projectId: project._id });
      Alert.alert(t("projects.estimateReady"), t("estimate.saved"));
    } catch (err) {
      Alert.alert(t("error.title"), friendlyMessage(err));
    } finally {
      setRunning(false);
    }
  };

  const handleShare = async () => {
    if (!est) return;
    await shareText(project.name, estimateShareText(project));
  };

  const handlePdf = async () => {
    if (!est) return;
    setPdfBusy(true);
    const result = await shareEstimatePdf(project);
    if (result === "unavailable") {
      // Repli : partage texte
      await shareText(project.name, estimateShareText(project));
    }
    setPdfBusy(false);
  };

  const handleCopyLink = async () => {
    if (!est) return;
    const ok = await copyLink(estimateShareText(project));
    Alert.alert(ok ? t("common.copied") : t("error.title"), estimateShareText(project));
  };

  const handleDelete = () => {
    if (status === "completed") {
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
            await deleteProject({ projectId: project._id });
            router.replace("/(tabs)/projects");
          } catch (err) {
            Alert.alert(t("error.title"), friendlyMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <Screen headerTitle={t("projects.details")} showBack headerRight={
      <View style={{ flexDirection: "row", gap: 4 }}>
        <Pressable hitSlop={8} onPress={() => toggleFavorite({ projectId: project._id }).catch(() => {})}>
          <Heart size={18} color={project.isFavorite ? "#F43F5E" : colors.mutedForeground} fill={project.isFavorite ? "#F43F5E" : "transparent"} />
        </Pressable>
        {status !== "completed" ? (
          <Pressable hitSlop={8} onPress={handleDelete}>
            <Trash2 size={18} color={colors.destructive} />
          </Pressable>
        ) : null}
      </View>
    }>
      {/* En-tête projet */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Badge label={t(meta.labelKey)} color={meta.color} bg={meta.bg} dot={meta.dot} />
          <Text variant="micro" color="muted">
            {formatDate(project.createdAt)}
          </Text>
        </View>
        <Text variant="h2" style={{ marginTop: spacing.sm }}>
          {project.name}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text variant="small" color="muted">{t("projects.type")}</Text>
            <Text variant="small" bold>{projectTypeLabel(project.category)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text variant="small" color="muted">{t("projects.surface")}</Text>
            <Text variant="small" bold>{formatM2(project.surface)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text variant="small" color="muted">{t("projects.floors")}</Text>
            <Text variant="small" bold>{project.floors ?? "—"}</Text>
          </View>
        </View>
        {project.region ? (
          <View style={styles.regionRow}>
            <MapPin size={12} color={colors.mutedForeground} />
            <Text variant="small" color="muted">{regionLabel(project.region)}</Text>
          </View>
        ) : null}
        {project.description ? (
          <Text variant="small" color="muted" style={{ marginTop: spacing.sm }}>
            {project.description}
          </Text>
        ) : null}
      </View>

      {status === "draft" || status === "analyzing" ? (
        <Card style={{ marginTop: spacing.lg }}>
          <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm }}>
            {status === "analyzing" || running ? (
              <>
                <Loader2 size={28} color={colors.primary} />
                <Text variant="body" color="muted">{t("projects.pendingAnalysis")}</Text>
              </>
            ) : (
              <>
                <Text variant="bodyStrong">{t("estimate.noEstimate")}</Text>
                <Text variant="small" color="muted" center>
                  {t("projects.createFirst")}
                </Text>
                <Button loading={running} onPress={handleEstimate} icon={<Wand2 size={16} color="#FFFFFF" />} style={{ marginTop: spacing.sm }}>
                  {t("estimate.runNow")}
                </Button>
              </>
            )}
          </View>
        </Card>
      ) : est ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          {/* Total + scénarios */}
          <Card padded>
            <View style={styles.totalRow}>
              <View>
                <Text variant="overline" style={{ color: colors.mutedForeground }}>{t("estimate.total")}</Text>
                <Text variant="h2" style={{ color: colors.primary, marginTop: 4 }}>
                  {formatTnd(est.totalCost)}
                </Text>
                <Text variant="small" color="muted" style={{ marginTop: 4 }}>
                  {t("estimate.contingency")} : {formatTnd(est.contingencyBuffer)} ({Math.round(est.contingencyPercentage)}%)
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text variant="overline" style={{ color: colors.mutedForeground }}>{t("estimate.costPerM2")}</Text>
                <Text variant="h4" style={{ marginTop: 4 }}>
                  {formatTnd(est.costPerSquareMeter)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Répartition (donut) */}
          <Card>
            <Text variant="h4">{t("estimate.byCategory")}</Text>
            <View style={{ alignItems: "center", marginTop: spacing.md }}>
              <DonutChart
                slices={donutSlices}
                centerLabel={formatTnd(est.totalCost)}
                centerSubLabel={t("estimate.total")}
              />
            </View>
            <View style={styles.legend}>
              {est.breakdown.slice(0, 5).map((b, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: colors.chart[i % colors.chart.length] }]} />
                  <Text variant="small" style={{ flex: 1 }} numberOfLines={1}>{b.label}</Text>
                  <Text variant="small" bold>{Math.round(b.percentage ?? 0)}%</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Scénarios */}
          <ScenarioCards project={project} />

          {/* Détail par poste */}
          <Card>
            <Text variant="h4" style={{ marginBottom: spacing.md }}>{t("estimate.breakdown")}</Text>
            <BreakdownRows project={project} colors={colors} />
          </Card>

          {/* Actions de partage */}
          <View style={styles.shareRow}>
            <Button variant="outline" onPress={handleShare} icon={<Share2 size={16} />} style={{ flex: 1 }}>
              {t("common.share")}
            </Button>
            <Button variant="outline" loading={pdfBusy} onPress={handlePdf} icon={<FileDown size={16} />} style={{ flex: 1 }}>
              {t("estimate.pdf")}
            </Button>
            <Button variant="ghost" onPress={handleCopyLink} icon={<Copy size={16} />} style={{ flex: 1 }}>
              {t("estimate.copyLink")}
            </Button>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.sm },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  metaChip: { flexDirection: "column", gap: 2 },
  regionRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  legend: { gap: spacing.sm, marginTop: spacing.lg },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  shareRow: { flexDirection: "row", gap: spacing.sm },
});