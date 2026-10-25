import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
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
import { GUIDE_ICONS, type LucideIcon } from "../components/icons";
import {
  IllusMaterials,
  IllusPhases,
  IllusProviders,
  IllusQuote,
  type IllusProps,
} from "../components/GuideIllustrations";
import { IllusPlanPreview } from "../components/GuidePlans";
import { COLORS, useAppTheme } from "../theme";

/**
 * GUIDE DE PREMIÈRE UTILISATION — les 5 fonctionnalités clés de batibuild.
 *
 * Affiché une seule fois, au premier lancement de l'installation (voir
 * `storage.ts` — `onboardingCompleted`), et consultable ensuite depuis
 * « Voir le guide » dans l'application.
 *
 * Les 5 étapes, dans cet ordre :
 *   1. Coût estimatif            (portefeuille)
 *   2. Aide à la décision        (graphique)
 *   3. Plans architecturaux IA   (bâtiment)
 *   4. Mise en relation          (utilisateurs)
 *   5. Exécution & suivi         (casque de chantier)
 *
 * Navigation MANUELLE : chaque changement d'étape s'accompagne d'un fondu +
 * léger glissement. L'utilisateur avance avec « Suivant », revient avec
 * « Précédent », peut passer le guide à tout moment, et termine avec
 * « Commencer » à la dernière étape. Aucun minuteur ne fait défiler le guide.
 *
 * Visuels : illustrations vectorielles de la plateforme (`GuideIllustrations`)
 * et plans réellement générés (`GuidePlans`) — compacts, à l'échelle uniforme,
 * sans déformation ni débordement sur tous les écrans Android, en mode clair
 * comme en mode sombre.
 *
 * PÉRIMÈTRE : mobile uniquement — la plateforme Web et le backend ne sont pas
 * concernés.
 */

type Slide = {
  key: string;
  /** Libellé court affiché dans le fil du parcours. */
  short: string;
  title: string;
  text: string;
  /** Icône de l'étape (même famille lucide que le reste de la coque). */
  Icon: LucideIcon;
  Illustration: React.ComponentType<IllusProps>;
};

/** Les 5 étapes, dans l'ordre du parcours. */
const SLIDES: Slide[] = [
  {
    key: "cost",
    short: "Coût",
    title: "Coût estimatif",
    text: "Estimez le coût de votre projet grâce à un quantitatif détaillé et aux prix du marché tunisien.",
    Icon: GUIDE_ICONS.wallet,
    Illustration: IllusQuote,
  },
  {
    key: "decision",
    short: "Décision",
    title: "Aide à la décision",
    text: "Analysez votre budget et découvrez les meilleures options pour concrétiser votre projet.",
    Icon: GUIDE_ICONS.chartLine,
    Illustration: IllusMaterials,
  },
  {
    key: "plans",
    short: "Plans",
    title: "Plans architecturaux IA",
    text: "Générez des plans architecturaux 2D et 3D adaptés à votre projet.",
    Icon: GUIDE_ICONS.building,
    Illustration: IllusPlanPreview,
  },
  {
    key: "providers",
    short: "Experts",
    title: "Mise en relation",
    text: "Trouvez des fournisseurs et des professionnels du BTP adaptés à vos besoins.",
    Icon: GUIDE_ICONS.users,
    Illustration: IllusProviders,
  },
  {
    key: "execution",
    short: "Suivi",
    title: "Exécution & suivi",
    text: "Organisez vos travaux et suivez l'avancement de votre projet jusqu'à sa réalisation.",
    Icon: GUIDE_ICONS.hardHat,
    Illustration: IllusPhases,
  },
];

/** Fil du parcours, affiché en bas de chaque étape (les 5 étapes). */
const JOURNEY = SLIDES.map((s) => ({ key: s.key, label: s.short }));

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

  const goNext = useCallback(() => {
    if (index >= SLIDES.length - 1) onDone();
    else setIndex((i) => i + 1);
  }, [index, onDone]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  // Bouton Retour Android : étape précédente, puis sortie du guide (jamais de
  // fermeture brutale de l'application pendant la présentation).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (index > 0) setIndex((i) => i - 1);
      else onDone();
      return true;
    });
    return () => sub.remove();
  }, [index, onDone]);

  const Illustration = slide.Illustration;
  const StepIcon = slide.Icon;

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

          <View style={styles.kickerRow}>
            <View style={[styles.iconBadge, { backgroundColor: theme.primaryContainer }]}>
              <StepIcon size={15} color={theme.onPrimaryContainer} strokeWidth={2.2} />
            </View>
            <Text style={[styles.kicker, { color: theme.primary }]}>
              ÉTAPE {index + 1} SUR {SLIDES.length}
            </Text>
          </View>
          <Text style={[styles.title, { color: theme.onSurface }]}>{slide.title}</Text>
          <Text style={[styles.text, { color: theme.onSurfaceVariant }]}>{slide.text}</Text>
        </ScrollView>
      </Animated.View>

      {/* ── Pied : fil du parcours + progression + actions ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {/* Fil du parcours : Coût → Décision → Plans → Experts → Suivi
            (l'étape courante est mise en avant). */}
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

        {/* Progression : une barre par étape ; les étapes atteintes sont remplies. */}
        <View style={styles.bars}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.barTrack, { backgroundColor: theme.outlineVariant }]}>
              {i <= index && (
                <View style={[styles.barFill, { width: "100%", backgroundColor: theme.primary }]} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={goPrev}
            disabled={index === 0}
            accessibilityRole="button"
            accessibilityLabel="Étape précédente"
            accessibilityState={{ disabled: index === 0 }}
            style={({ pressed }) => [
              styles.secondary,
              {
                borderColor: theme.outlineVariant,
                opacity: index === 0 ? 0.4 : 1,
              },
              pressed && { opacity: 0.65 },
            ]}
          >
            <Text style={[styles.secondaryText, { color: theme.onSurfaceVariant }]}>
              Précédent
            </Text>
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
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 14,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
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
    fontSize: 8.5,
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
  secondary: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  cta: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
  },
});
