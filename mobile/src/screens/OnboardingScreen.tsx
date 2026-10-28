import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  type LayoutChangeEvent,
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
 * jamais tronqué).
 *
 * Navigation : la barre de pied de page propose « Précédent » (désactivé sur
 * la première étape) et « Suivant », qui amènent à l'étape correspondante avec
 * un défilement automatique. Sur la cinquième étape, « Suivant » laisse place
 * au bouton final « Commencer », qui ouvre l'écran d'entrée réel de
 * l'application (WebView batibuild) ; « Passer » permet d'y aller directement.
 *
 * Aucune fonctionnalité n'est décrite comme disponible pour tous : les étapes
 * dépendant des droits du compte le précisent explicitement.
 *
 * PÉRIMÈTRE : mobile uniquement — la plateforme Web et le backend ne sont pas
 * concernés.
 */

type Slide = {
  /** Identifiant stable de l'étape (utilisé comme clé de liste et par les tests). */
  key: string;
  title: string;
  text: string;
  /** Icône de l'étape (même famille lucide que le reste de la coque). */
  Icon: LucideIcon;
};

/** Les 5 étapes, dans l'ordre du parcours utilisateur. */
const SLIDES: Slide[] = [
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

  // ── Étape courante + positions mesurées des cartes ──────────────────────
  const [active, setActive] = useState(0);
  const isFirst = active <= 0;
  const isLast = active >= SLIDES.length - 1;

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);

  const handleCardLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    offsets.current[index] = event.nativeEvent.layout.y;
  }, []);

  const goTo = useCallback((index: number) => {
    const target = Math.min(Math.max(index, 0), SLIDES.length - 1);
    setActive(target);
  }, []);

  // Amène l'étape sélectionnée dans la zone visible (position mesurée au
  // layout : aucune valeur codée en dur, donc correct sur toutes les tailles).
  useEffect(() => {
    const y = offsets.current[active];
    if (typeof y === "number") {
      scrollRef.current?.scrollTo({ y: Math.max(y - 8, 0), animated: true });
    }
  }, [active]);

  // ── Apparition douce du guide (fondu + léger glissement) ─────────────────
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(enter, { toValue: 1, duration: 360, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [enter]);

  // Bouton Retour Android : recule d'une étape si possible, sinon quitte le
  // guide vers l'application (jamais de fermeture brutale de l'application).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (active > 0) {
        setActive((current) => Math.max(current - 1, 0));
        return true;
      }
      onDone();
      return true;
    });
    return () => sub.remove();
  }, [active, onDone]);

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
          ref={scrollRef}
          contentContainerStyle={styles.content}
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
          {SLIDES.map((slide, index) => {
            const SlideIcon = slide.Icon;
            const isActive = index === active;
            return (
              <View
                key={slide.key}
                onLayout={(event) => handleCardLayout(index, event)}
                accessible
                accessibilityLabel={`Étape ${index + 1} sur ${SLIDES.length} — ${slide.title}. ${slide.text}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: isActive ? theme.surfaceContainerHigh : theme.surfaceContainer,
                    borderColor: isActive ? theme.primary : theme.outlineVariant,
                  },
                ]}
              >
                <View style={styles.cardHead}>
                  <View style={[styles.numBadge, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.numText, { color: theme.onPrimary }]}>{index + 1}</Text>
                  </View>
                  <View style={[styles.iconTile, { backgroundColor: theme.primaryContainer }]}>
                    <SlideIcon size={17} color={theme.onPrimaryContainer} strokeWidth={2.2} />
                  </View>
                </View>

                <Text style={[styles.cardTitle, { color: theme.onSurface }]}>{slide.title}</Text>
                <Text style={[styles.cardText, { color: theme.onSurfaceVariant }]}>
                  {slide.text}
                </Text>
              </View>
            );
          })}

          <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
            Vous pourrez revoir ce guide depuis les réglages de l'application.
          </Text>
        </ScrollView>
      </Animated.View>

      {/* ── Navigation : Précédent / Suivant, puis bouton final ── */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: theme.surface,
            borderTopColor: theme.outlineVariant,
          },
        ]}
      >
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { color: theme.onSurfaceVariant }]}>
            Étape {active + 1} sur {SLIDES.length}
          </Text>
          <View style={styles.dots}>
            {SLIDES.map((slide, index) => (
              <View
                key={slide.key}
                style={[
                  styles.dot,
                  index === active
                    ? { width: 18, backgroundColor: theme.primary }
                    : { backgroundColor: theme.outlineVariant },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.navRow}>
          <Pressable
            onPress={() => goTo(active - 1)}
            disabled={isFirst}
            accessibilityRole="button"
            accessibilityLabel="Précédent"
            accessibilityState={{ disabled: isFirst }}
            style={({ pressed }) => [
              styles.navButton,
              styles.navSecondary,
              { borderColor: theme.outlineVariant },
              isFirst && styles.navDisabled,
              pressed && !isFirst && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.navSecondaryText, { color: theme.onSurface }]}>Précédent</Text>
          </Pressable>

          {isLast ? (
            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel="Commencer et accéder à batibuild"
              style={({ pressed }) => [
                styles.navButton,
                styles.navPrimary,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.navPrimaryText, { color: theme.onPrimary }]}>Commencer</Text>
              <GUIDE_ICONS.arrowRight size={17} color={theme.onPrimary} strokeWidth={2.4} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => goTo(active + 1)}
              accessibilityRole="button"
              accessibilityLabel="Suivant"
              style={({ pressed }) => [
                styles.navButton,
                styles.navPrimary,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.navPrimaryText, { color: theme.onPrimary }]}>Suivant</Text>
              <GUIDE_ICONS.arrowRight size={17} color={theme.onPrimary} strokeWidth={2.4} />
            </Pressable>
          )}
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
    paddingBottom: 18,
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
  hint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  progressText: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.2,
    flexShrink: 1,
    minWidth: 0,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "stretch",
    flexWrap: "wrap",
    gap: 10,
  },
  navButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  navPrimary: {
    shadowColor: COLORS.brand,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  navPrimaryText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  navSecondary: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  navSecondaryText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  navDisabled: {
    opacity: 0.45,
  },
});
