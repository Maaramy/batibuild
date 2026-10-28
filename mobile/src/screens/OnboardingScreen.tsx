import React, { useEffect, useRef } from "react";
import {
  Animated,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "../components/Logo";
import { BRAND_NAME, BRAND_TAGLINE } from "../config";
import { GUIDE_ICONS, type LucideIcon } from "../components/icons";
import { COLORS, useAppTheme } from "../theme";

/**
 * GUIDE D'UTILISATION — les 5 étapes du parcours batibuild.
 *
 * Affiché une seule fois, au premier lancement de l'installation (voir
 * `storage.ts` — `onboardingCompleted`), et consultable ensuite depuis
 * « Voir le guide » dans les réglages natifs.
 *
 * Les 5 étapes sont présentées en CARTES VERTICALES NUMÉROTÉES de 1 à 5, dans
 * l'ordre du parcours :
 *   1. Coûts estimatifs            (portefeuille)
 *   2. Plans architecturaux IA     (bâtiment)
 *   3. Aide à la décision          (graphique)
 *   4. Mise en relation            (utilisateurs)
 *   5. Exécution & suivi           (casque de chantier)
 *
 * Chaque carte affiche son numéro, une icône de la même famille lucide que le
 * reste de la coque, un titre et une description courte. Le défilement est
 * vertical et fluide : les cinq cartes tiennent sur un grand écran et restent
 * lisibles sur les petits écrans Android (aucun débordement horizontal, texte
 * jamais tronqué). Le bouton final « Commencer » ouvre l'écran d'entrée réel
 * de l'application (WebView batibuild), et « Passer » permet d'y aller
 * directement.
 *
 * Aucune fonctionnalité n'est décrite comme disponible pour tous : les étapes
 * dépendant des droits du compte le précisent explicitement.
 *
 * PÉRIMÈTRE : mobile uniquement — la plateforme Web et le backend ne sont pas
 * concernés.
 */

type Step = {
  key: string;
  title: string;
  text: string;
  /** Icône de l'étape (même famille lucide que le reste de la coque). */
  Icon: LucideIcon;
};

/** Les 5 étapes, dans l'ordre du parcours utilisateur. */
const STEPS: Step[] = [
  {
    key: "cost",
    title: "Coûts estimatifs",
    text: "Estimez le coût de votre construction ou rénovation selon la surface, le type de projet et les prix des matériaux et de la main-d'œuvre.",
    Icon: GUIDE_ICONS.wallet,
  },
  {
    key: "plans",
    title: "Plans architecturaux IA",
    text: "Générez des propositions de plans architecturaux assistées par l'intelligence artificielle, avec vues 2D et 3D lorsque le type de projet le permet.",
    Icon: GUIDE_ICONS.building,
  },
  {
    key: "decision",
    title: "Aide à la décision",
    text: "Comparez le coût estimé à votre budget disponible et prenez les décisions adaptées à votre projet.",
    Icon: GUIDE_ICONS.chartLine,
  },
  {
    key: "providers",
    title: "Mise en relation",
    text: "Recherchez et contactez des experts et des fournisseurs du bâtiment, selon les fonctionnalités et les droits d'accès de votre compte.",
    Icon: GUIDE_ICONS.users,
  },
  {
    key: "execution",
    title: "Exécution & suivi",
    text: "Organisez vos travaux, suivez l'avancement par catégorie et gardez le contrôle sur les coûts et les étapes de réalisation.",
    Icon: GUIDE_ICONS.hardHat,
  },
];

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  // ── Apparition douce du guide (fondu + léger glissement) ─────────────────
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(enter, { toValue: 1, duration: 360, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [enter]);

  // Bouton Retour Android : quitte le guide vers l'application (jamais de
  // fermeture brutale de l'application pendant la présentation).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onDone();
      return true;
    });
    return () => sub.remove();
  }, [onDone]);

  return (
    <View style={[styles.root, { backgroundColor: theme.surface, paddingTop: insets.top }]}>
      {/* ── En-tête : identité batibuild + sortie immédiate ── */}
      <View style={styles.topBar}>
        <View style={styles.brandWrap}>
          <Logo size={26} radiusRatio={0.28} />
          <Text style={[styles.brandName, { color: theme.onSurface }]}>{BRAND_NAME}</Text>
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

      <Animated.View
        style={[
          styles.stage,
          {
            opacity: enter,
            transform: [
              {
                translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Introduction ── */}
          <View style={styles.hero}>
            <Text style={[styles.overline, { color: theme.primary }]}>GUIDE D'UTILISATION</Text>
            <Text
              style={[styles.title, { color: theme.onSurface }]}
              accessibilityRole="header"
            >
              Les 5 étapes de votre projet
            </Text>
            <Text style={[styles.heroText, { color: theme.onSurfaceVariant }]}>
              {BRAND_TAGLINE} : voici comment batibuild vous accompagne, de l'estimation au
              suivi du chantier.
            </Text>
          </View>

          {/* ── Les 5 étapes, en cartes numérotées ── */}
          {STEPS.map((step, index) => {
            const StepIcon = step.Icon;
            return (
              <View
                key={step.key}
                accessible
                accessibilityLabel={`Étape ${index + 1} sur ${STEPS.length} — ${step.title}. ${step.text}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surfaceContainer,
                    borderColor: theme.outlineVariant,
                  },
                ]}
              >
                <View style={styles.cardHead}>
                  <View style={[styles.numBadge, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.numText, { color: theme.onPrimary }]}>{index + 1}</Text>
                  </View>
                  <View style={[styles.iconTile, { backgroundColor: theme.primaryContainer }]}>
                    <StepIcon size={17} color={theme.onPrimaryContainer} strokeWidth={2.2} />
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: theme.onSurface }]}>{step.title}</Text>
                <Text style={[styles.cardText, { color: theme.onSurfaceVariant }]}>
                  {step.text}
                </Text>
              </View>
            );
          })}

          {/* ── Fin du guide : entrée réelle de l'application ── */}
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Commencer et accéder à batibuild"
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.ctaText, { color: theme.onPrimary }]}>Commencer</Text>
            <GUIDE_ICONS.arrowRight size={18} color={theme.onPrimary} strokeWidth={2.4} />
          </Pressable>
          <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
            Vous pourrez revoir ce guide depuis les réglages de l'application.
          </Text>
        </ScrollView>
      </Animated.View>
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
    minWidth: 0,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  skipTop: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    minHeight: 44,
    justifyContent: "center",
  },
  skipTopText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  stage: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  hero: {
    marginBottom: 18,
  },
  overline: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  heroText: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  numBadge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    fontSize: 15,
    fontWeight: "800",
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    flexShrink: 1,
  },
  cardText: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  cta: {
    marginTop: 10,
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
});
