import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
 * PRÉSENTATION : un vrai CARROUSEL d'une diapositive par écran, et non une
 * liste de cartes. Chaque diapositive affiche :
 *   · le numéro de l'étape (« 1 / 5 »),
 *   · le titre de la fonctionnalité et une explication courte en français,
 *   · une VÉRITABLE CAPTURE D'ÉCRAN de la plateforme (voir `SHOTS`),
 *   · un indicateur de progression sur cinq étapes.
 *
 * Navigation : la barre de pied de page propose « Précédent » (désactivé sur la
 * première étape) et « Suivant » ; sur la cinquième étape, « Suivant » laisse
 * place au bouton final « Commencer », qui ouvre l'écran d'entrée réel de
 * l'application (WebView batibuild). « Passer » permet d'y aller directement.
 * Le changement d'étape ne recharge jamais l'application (défilement horizontal
 * natif, sans WebView).
 *
 * ── Les captures ──────────────────────────────────────────────────────────
 * Aucune illustration générique ni maquette : ce sont des captures de
 * l'application réelle, produites par `mobile/scripts/capture-guide-screenshots.mjs`
 * au format exact de la WebView mobile (390 × 844 à 2×, JPEG compressé).
 * Quatre écrans (plans IA, aide à la décision, mise en relation, exécution &
 * suivi) sont derrière l'authentification : tant que leur capture n'a pas été
 * produite avec un compte réel, la diapositive affiche l'illustration de
 * l'étape — jamais une fausse capture.
 *
 * Aucune fonctionnalité n'est décrite comme disponible pour tous : les étapes
 * dépendant des droits du compte le précisent explicitement.
 *
 * PÉRIMÈTRE : mobile uniquement — la plateforme Web et le backend ne sont pas
 * concernés.
 */

type Slide = {
  /** Identifiant stable de l'étape (clé de liste, nom de capture, tests). */
  key: string;
  title: string;
  text: string;
  /** Ce que montre réellement l'écran (affiché à défaut de capture). */
  preview: string;
  /** Icône de l'étape (même famille lucide que le reste de la coque). */
  Icon: LucideIcon;
};

/** Les 5 étapes, dans l'ordre du parcours utilisateur. */
const SLIDES: Slide[] = [
  {
    key: "cost",
    title: "Coûts estimatifs",
    text: "Créez votre projet — construction ou rénovation — avec sa surface et sa région. L'IA calcule les quantités, applique les prix du marché tunisien et affiche le coût total en dinars.",
    preview: "Type de projet · Surface · Catégories de travaux · Coût total en TND",
    Icon: GUIDE_ICONS.wallet,
  },
  {
    key: "plans",
    title: "Plans architecturaux IA",
    text: "Générez des propositions de plans architecturaux assistées par l'intelligence artificielle : pièces, cloisons, portes et fenêtres en 2D, et vues 3D lorsque le type de projet le permet.",
    preview: "Plans 2D · Vues 3D · Pièces, cloisons et dimensions",
    Icon: GUIDE_ICONS.building,
  },
  {
    key: "decision",
    title: "Aide à la décision",
    text: "Comparez le coût estimé à votre budget disponible, testez le scénario de construction adapté et lisez les résultats de l'analyse avant de vous engager.",
    preview: "Budget disponible · Scénario de construction · Résultats de l'analyse",
    Icon: GUIDE_ICONS.chartLine,
  },
  {
    key: "providers",
    title: "Mise en relation",
    text: "Recherchez des experts et des fournisseurs du bâtiment par spécialité et par région, consultez leurs profils et contactez-les, selon les droits d'accès de votre compte.",
    preview: "Profils · Spécialités · Filtres de recherche · Contact",
    Icon: GUIDE_ICONS.users,
  },
  {
    key: "execution",
    title: "Exécution & suivi",
    text: "Accompagnez le chantier jusqu'à sa réalisation : avancement des travaux par catégorie, coûts engagés et étapes déjà réalisées.",
    preview: "Avancement · Catégories de travaux · Suivi des coûts",
    Icon: GUIDE_ICONS.hardHat,
  },
];

/**
 * CAPTURES RÉELLES des écrans, une par étape.
 *
 * Fichiers produits par `mobile/scripts/capture-guide-screenshots.mjs` dans
 * `assets/guide/` — aucune image générique, aucune maquette. Une étape sans
 * fichier n'affiche pas de fausse capture : elle affiche l'illustration de
 * l'étape (`preview`). Pour activer une capture, il suffit d'ajouter sa ligne
 * ici après avoir lancé le script (`--all` avec un compte existant).
 */
const SHOTS: Partial<Record<string, ImageSourcePropType>> = {
  cost: require("../../assets/guide/step-1-couts-estimatifs.jpg"),
};

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();

  // ── Étape courante ──────────────────────────────────────────────────────
  const [active, setActive] = useState(0);
  const isFirst = active <= 0;
  const isLast = active >= SLIDES.length - 1;

  const pagerRef = useRef<ScrollView>(null);

  // Déplacement demandé par les boutons : on laisse le défilement natif faire
  // l'animation, puis `onMomentumScrollEnd` confirme l'étape réellement visible.
  const goTo = useCallback(
    (index: number) => {
      const target = Math.min(Math.max(index, 0), SLIDES.length - 1);
      setActive(target);
      pagerRef.current?.scrollTo({ x: target * width, animated: true });
    },
    [width],
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!width) return;
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setActive(Math.min(Math.max(index, 0), SLIDES.length - 1));
    },
    [width],
  );

  // ── Chargement discret des captures (jamais de cadre blanc) ─────────────
  const [loadedShots, setLoadedShots] = useState<Record<string, boolean>>({});
  const markShot = useCallback((key: string, done: boolean) => {
    setLoadedShots((current) =>
      current[key] === done ? current : { ...current, [key]: done },
    );
  }, []);

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
        goTo(active - 1);
        return true;
      }
      onDone();
      return true;
    });
    return () => sub.remove();
  }, [active, goTo, onDone]);

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

      {/* ── Carrousel : une diapositive par étape ── */}
      <Animated.View
        style={[
          styles.stage,
          {
            opacity: enter,
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            ],
          },
        ]}
      >
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          keyboardShouldPersistTaps="handled"
        >
          {SLIDES.map((slide, index) => {
            const SlideIcon = slide.Icon;
            const shot = SHOTS[slide.key];
            const shotLoaded = Boolean(loadedShots[slide.key]);
            return (
              <View key={slide.key} style={{ width }}>
                <ScrollView
                  contentContainerStyle={styles.slideContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Numéro de l'étape + icône */}
                  <View style={styles.slideHead}>
                    <View style={[styles.stepBadge, { backgroundColor: theme.primaryContainer }]}>
                      <Text style={[styles.stepBadgeText, { color: theme.onPrimaryContainer }]}>
                        {index + 1} / {SLIDES.length}
                      </Text>
                    </View>
                    <View style={[styles.iconTile, { backgroundColor: theme.primaryContainer }]}>
                      <SlideIcon size={16} color={theme.onPrimaryContainer} strokeWidth={2.3} />
                    </View>
                  </View>

                  <Text
                    style={[styles.title, { color: theme.onSurface }]}
                    accessibilityRole="header"
                  >
                    {slide.title}
                  </Text>
                  <Text style={[styles.text, { color: theme.onSurfaceVariant }]}>{slide.text}</Text>

                  {/* ── Capture réelle de l'écran (ou illustration de l'étape) ── */}
                  <View
                    style={[
                      styles.shotFrame,
                      {
                        backgroundColor: theme.surfaceContainer,
                        borderColor: theme.outlineVariant,
                      },
                    ]}
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={
                      shot
                        ? `Capture d'écran de l'application : ${slide.title}`
                        : `Illustration de l'étape ${slide.title}`
                    }
                  >
                    {shot ? (
                      <>
                        <Image
                          source={shot}
                          style={styles.shot}
                          resizeMode="cover"
                          onLoadStart={() => markShot(slide.key, false)}
                          onLoadEnd={() => markShot(slide.key, true)}
                          onError={() => markShot(slide.key, true)}
                        />
                        {!shotLoaded && (
                          <View style={styles.shotLoading} pointerEvents="none">
                            <ActivityIndicator size="small" color={theme.primary} />
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={[styles.shotFallback, { backgroundColor: theme.primaryContainer }]}>
                        <SlideIcon
                          size={38}
                          color={theme.onPrimaryContainer}
                          strokeWidth={1.7}
                        />
                        <Text style={[styles.shotFallbackText, { color: theme.onPrimaryContainer }]}>
                          {slide.preview}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>
                    Vous pourrez revoir ce guide depuis les réglages de l'application.
                  </Text>
                </ScrollView>
              </View>
            );
          })}
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
  slideContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  slideHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stepBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    flexShrink: 0,
  },
  stepBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    marginTop: 10,
    fontSize: 23,
    fontWeight: "800",
    lineHeight: 29,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  text: {
    marginTop: 7,
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  shotFrame: {
    marginTop: 14,
    flex: 1,
    minHeight: 240,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  shot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  shotLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  shotFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 22,
  },
  shotFallbackText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.85,
  },
  hint: {
    marginTop: 10,
    fontSize: 11.5,
    lineHeight: 16,
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
