import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "../components/Logo";
import { BRAND_NAME } from "../config";
import {
  IllusInvestment,
  IllusMaterials,
  IllusOvercosts,
  IllusPhases,
  IllusProviders,
  type IllusProps,
} from "../components/GuideIllustrations";
import { IllusPlanPreview } from "../components/GuidePlans";
import { COLORS, useAppTheme } from "../theme";

/**
 * GUIDE DE PREMIÈRE UTILISATION — parcours « De l'idée à l'investissement ».
 *
 * Remplace TOUTES les anciennes présentations de démarrage : un seul parcours,
 * affiché au premier lancement de l'installation (voir `storage.ts` —
 * `onboardingCompleted`), jamais relancé ensuite.
 *
 * Les 6 étapes du parcours de la plateforme :
 *   1. Coût estimatif
 *   2. Plans AI            (aperçus RÉELS : plan 2D → coté → vue 3D)
 *   3. Choix des matériaux
 *   4. Consultations / Trouver un expert
 *   5. Exécution & suivi
 *   6. Investissement
 *
 * Animation : chaque étape reste affichée 4 secondes, puis la suivante apparaît
 * avec un fondu + léger glissement. Aucune intervention de l'utilisateur n'est
 * nécessaire ; après la 6ᵉ étape, le guide se termine et l'application s'ouvre
 * normalement. Un bouton « Passer » reste disponible à tout moment.
 *
 * Visuels : illustrations vectorielles de la plateforme (`GuideIllustrations`)
 * et plans réellement générés (`GuidePlans` + `guidePlans`) — compacts, à
 * l'échelle uniforme, sans déformation ni débordement sur tous les écrans
 * Android, en mode clair comme en mode sombre.
 *
 * PÉRIMÈTRE : mobile uniquement — la plateforme Web et le backend ne sont pas
 * concernés.
 */

type Slide = {
  key: string;
  title: string;
  text: string;
  Illustration: React.ComponentType<IllusProps>;
};

/** Durée d'affichage d'une étape (ms) — imposée par la spécification. */
const STEP_MS = 4000;

/** Les 6 étapes, dans l'ordre imposé du parcours. */
const SLIDES: Slide[] = [
  {
    key: "cost",
    title: "Coût estimatif",
    text: "Estimez le coût de votre projet.",
    Illustration: IllusOvercosts,
  },
  {
    key: "plans",
    title: "Plans AI",
    text: "Générez et visualisez vos plans architecturaux 2D/3D — des plans réels, produits à partir des données de votre projet.",
    Illustration: IllusPlanPreview,
  },
  {
    key: "materials",
    title: "Choix des matériaux",
    text: "Analysez et choisissez les matériaux adaptés à votre projet.",
    Illustration: IllusMaterials,
  },
  {
    key: "experts",
    title: "Consultations / Trouver un expert",
    text: "Trouvez les experts et prestataires adaptés à votre besoin.",
    Illustration: IllusProviders,
  },
  {
    key: "execution",
    title: "Exécution & suivi",
    text: "Suivez les étapes de réalisation de votre projet.",
    Illustration: IllusPhases,
  },
  {
    key: "investment",
    title: "Investissement",
    text: "Analysez les opportunités et indicateurs d'investissement.",
    Illustration: IllusInvestment,
  },
];

/** Fil du parcours, affiché en bas de chaque étape (origine + 6 étapes). */
const JOURNEY: { key: string; label: string }[] = [
  { key: "idea", label: "Idée" },
  { key: "cost", label: "Coût" },
  { key: "plans", label: "Plans" },
  { key: "materials", label: "Matériaux" },
  { key: "experts", label: "Experts" },
  { key: "execution", label: "Exécution" },
  { key: "investment", label: "Investissement" },
];

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  // L'illustration occupe une part importante de l'écran sans jamais empêcher
  // la lecture du texte : bornée en hauteur puis ajustée en largeur (petits et
  // grands écrans, rotation, encoches).
  const illusMaxH = Math.min(Math.max(height * 0.34, 138), 248);
  const illusW = Math.min(width - 48, (illusMaxH * 4) / 3);

  // ── Animation d'entrée de chaque étape (fondu + glissement) ───────────────
  const enter = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    enter.setValue(0);
    const anim = Animated.timing(enter, { toValue: 1, duration: 420, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [index, enter]);

  // ── Avancement AUTOMATIQUE : 4 s par étape, puis fin du guide ─────────────
  useEffect(() => {
    const id = setTimeout(() => {
      if (index >= SLIDES.length - 1) onDone();
      else setIndex((i) => i + 1);
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [index, onDone]);

  // Remplissage de la barre de progression de l'étape en cours (4 s).
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fill.setValue(0);
    const anim = Animated.timing(fill, {
      toValue: 1,
      duration: STEP_MS,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [index, fill]);

  const goNext = useCallback(() => {
    if (index >= SLIDES.length - 1) onDone();
    else setIndex((i) => i + 1);
  }, [index, onDone]);

  const Illustration = slide.Illustration;

  return (
    <View style={[styles.root, { backgroundColor: theme.surface, paddingTop: insets.top }]}>
      {/* ── En-tête : identité batibuild + position dans le parcours ── */}
      <View style={styles.topBar}>
        <View style={styles.brandWrap}>
          <Logo size={26} radiusRatio={0.28} />
          <Text style={[styles.brandName, { color: theme.onSurface }]}>{BRAND_NAME}</Text>
        </View>

        <View style={styles.topRight}>
          <View
            style={[
              styles.stepChip,
              { backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant },
            ]}
          >
            <Text style={[styles.stepChipText, { color: theme.primary }]}>
              {index + 1} / {SLIDES.length}
            </Text>
          </View>
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Passer le guide et ouvrir l'application"
            hitSlop={10}
            style={({ pressed }) => [styles.skipTop, pressed && { opacity: 0.55 }]}
          >
            <Text style={[styles.skipTopText, { color: theme.onSurfaceVariant }]}>Passer</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Étape courante ── */}
      <Animated.View
        style={[
          styles.stage,
          {
            opacity: enter,
            transform: [
              {
                translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.slide}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.illusSlot}>
            <Illustration width={illusW} theme={theme} />
          </View>

          <Text style={[styles.kicker, { color: theme.primary }]}>
            ÉTAPE {index + 1} SUR {SLIDES.length}
          </Text>
          <Text style={[styles.title, { color: theme.onSurface }]}>{slide.title}</Text>
          <Text style={[styles.text, { color: theme.onSurfaceVariant }]}>{slide.text}</Text>
        </ScrollView>
      </Animated.View>

      {/* ── Pied : fil du parcours + progression + actions ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {/* Fil du parcours : Idée → Coût → Plans → Matériaux → Experts →
            Exécution → Investissement (l'étape courante est mise en avant). */}
        <View style={styles.journey}>
          {JOURNEY.map((step, i) => {
            const active = step.key === slide.key;
            // Flèche + pastille dans un même groupe insécable : le retour à la
            // ligne ne peut jamais laisser une flèche orpheline en fin de ligne.
            return (
              <View key={step.key} style={styles.journeyGroup}>
                {i > 0 && (
                  <Text style={[styles.journeyArrow, { color: theme.outlineVariant }]}>›</Text>
                )}
                <View
                  style={[
                    styles.journeyChip,
                    {
                      backgroundColor: active ? theme.primaryContainer : theme.surfaceContainer,
                      borderColor: active ? theme.primary : theme.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    allowFontScaling={false}
                    style={[
                      styles.journeyText,
                      { color: active ? theme.onPrimaryContainer : theme.onSurfaceVariant },
                      active && styles.journeyTextActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Progression : une barre par étape, l'étape courante se remplit en 4 s */}
        <View style={styles.bars}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.barTrack,
                { backgroundColor: theme.outlineVariant },
                i === index && { backgroundColor: theme.surfaceContainerHigh },
              ]}
            >
              {i < index && (
                <View style={[styles.barFill, { width: "100%", backgroundColor: theme.primary }]} />
              )}
              {i === index && (
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: theme.primary,
                      width: fill.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Passer le guide"
            hitSlop={10}
            style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.skipText, { color: theme.onSurfaceVariant }]}>Passer</Text>
          </Pressable>

          <Pressable
            onPress={goNext}
            accessibilityRole="button"
            accessibilityLabel={last ? "Commencer" : "Étape suivante"}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.ctaText, { color: theme.onPrimary }]}>
              {last ? "Commencer" : "Suivant"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  stepChipText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  skipTop: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  skipTopText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  stage: {
    flex: 1,
  },
  slide: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 6,
  },
  illusSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    marginTop: 14,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  journey: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 12,
  },
  journeyGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  journeyChip: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  journeyText: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  journeyTextActive: {
    fontWeight: "800",
  },
  journeyArrow: {
    fontSize: 11,
    fontWeight: "700",
  },
  bars: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 14,
  },
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  skip: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  cta: {
    flexGrow: 1,
    maxWidth: 240,
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
