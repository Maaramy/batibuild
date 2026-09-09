import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { CloudOff, Save, Wand2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/convex";
import { useAppTheme } from "@/hooks/use-theme";
import { spacing, radius } from "@/theme/tokens";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Screen } from "@/components/ui/Screen";
import { ProgressSteps } from "@/components/ui/ProgressSteps";
import { projectTypeOptions, REGIONS } from "@/constants/catalog";
import { saveDraft, removeDraft, type DraftProject } from "@/lib/storage";
import { friendlyKind, friendlyMessage } from "@/lib/errors";

export default function NewProjectScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const createProject = useMutation(api.projects.createProject);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);

  // id local stable pour le brouillon (déduplication des sauvegardes)
  const draftId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).current;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("maison");
  const [region, setRegion] = useState<string | undefined>("tunis");
  const [surface, setSurface] = useState("");
  const [floors, setFloors] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);

  const surfaceNum = parseFloat(surface.replace(",", "."));
  const floorsNum = parseInt(floors, 10);
  const isValid = name.trim().length >= 2 && !Number.isNaN(surfaceNum) && surfaceNum > 0;

  const draft: DraftProject = {
    id: draftId,
    name: name.trim(),
    category,
    region,
    surface: surfaceNum,
    floors: Number.isNaN(floorsNum) ? undefined : floorsNum,
    description: description.trim() || undefined,
    createdAt: Date.now(),
  };

  const handleSaveDraft = async () => {
    if (!name.trim()) return;
    await saveDraft(draft);
    Alert.alert(t("projects.created"), t("projects.step1") + " — " + t("profile.offlineNote"));
  };

  const handleEstimate = async () => {
    if (!isValid) return;
    setSaving(true);
    setOffline(false);
    try {
      const projectId = await createProject({
        name: name.trim(),
        category: category as any,
        region: region as any,
        surface: surfaceNum,
        floors: Number.isNaN(floorsNum) ? undefined : floorsNum,
        description: description.trim() || undefined,
      });
      await simulateAnalysis({ projectId });
      // synchronisation : brouillon local supprimé, données sur le serveur
      await removeDraft(draft.id).catch(() => {});
      router.replace(`/project/${projectId}`);
    } catch (err) {
      if (friendlyKind(err) === "network") {
        setOffline(true);
        await saveDraft(draft);
        Alert.alert(t("common.offline"), t("error.network"));
      } else {
        Alert.alert(t("error.title"), friendlyMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen headerTitle={t("projects.newTitle")} showBack contentContainerStyle={{ paddingBottom: 48 }}>
        <ProgressSteps steps={[t("projects.step1"), t("projects.step2"), t("projects.step3")]} current={0} />

        <View style={styles.form}>
          <Input
            label={t("projects.name")}
            placeholder={t("projects.namePlaceholder")}
            value={name}
            onChangeText={setName}
          />
          <Select
            label={t("projects.type")}
            value={category}
            options={projectTypeOptions}
            onChange={setCategory}
          />
          <Select
            label={t("projects.region")}
            value={region}
            options={REGIONS}
            onChange={setRegion}
          />
          <Input
            label={t("projects.surface")}
            placeholder="150"
            keyboardType="numeric"
            value={surface}
            onChangeText={setSurface}
            hint="m²"
          />
          <Input
            label={t("projects.floors")}
            placeholder="1"
            keyboardType="number-pad"
            value={floors}
            onChangeText={setFloors}
          />
          <Input
            label={t("projects.description")}
            placeholder={t("projects.descriptionPlaceholder")}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {offline ? (
            <View style={[styles.offline, { backgroundColor: colors.warningBg, borderColor: colors.warning + "44" }]}>
              <CloudOff size={16} color={colors.warning} />
              <Text variant="small" style={{ color: colors.warning, flex: 1, marginStart: spacing.sm }}>
                {t("error.network")}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button variant="outline" onPress={handleSaveDraft} icon={<Save size={16} />} disabled={!name.trim()}>
              {t("common.save")}
            </Button>
            <Button
              loading={saving}
              disabled={!isValid}
              onPress={handleEstimate}
              icon={<Wand2 size={16} color="#FFFFFF" />}
              style={{ flex: 1 }}
            >
              {t("projects.estimate")}
            </Button>
          </View>

          <Pressable style={styles.hint} onPress={() => router.push("/(tabs)/projects")}>
            <Text variant="small" color="muted" center>
              {t("profile.synced")}
            </Text>
          </Pressable>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, marginTop: spacing.xl },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  offline: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  hint: { marginTop: spacing.md },
});