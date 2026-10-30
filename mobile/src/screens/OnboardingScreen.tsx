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
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "../components/Logo";
import {
  IllusDecision,
  IllusInvestment,
  IllusOvercosts,
  IllusPhases,
  IllusProviders,
  type IllusProps,
} from "../components/GuideIllustrations";
import { IllusPlanPreview } from "../components/GuidePlans";
import { GUIDE_ICONS } from "../components/icons";
import { BRAND_NAME } from "../config";
import { COLORS, themes } from "../theme";

/**
 * SPLASH GUIDE (ONBOARDING) — application mobile Android batibuild.
 *
 * Reprise complète du design du guide d'utilisation, dans un langage visuel
 * clair, minimaliste et premium :
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ [logo] batibuild                    1 / 5     │   en-tête
 *   │                                               │
 *   │        ╭───────────────────────────╮          │
 *   │        │   ILLUSTRATION VECTORIELLE │          │   illustration
 *   │        ╰───────────────────────────╯          │
 *   │                                               │
 *   │             Évitez les surcoûts               │   titre (centré, gras)
 *   │   Estimez précisément votre budget de…        │   description (gris)
 *   │                                               │
 *   │              ● ○ ○ ○ ○                        │   pagination
 *   │      [Passer]        [ Suivant → ]            │   actions
 *   └───────────────────────────────────────────────┘
 *
 * Interface VOLONTAIREMENT LIGHT (fond blanc, émeraude batibuild), comme la
 * référence : le thème sombre du téléphone ne s'applique pas à cet écran
 * d'accueil, qui doit être identique pour tous les utilisateurs.
 *
 * LES 5 ÉTAPES (une diapositive par fonctionnalité, dans l'ordre du parcours) :
 *   1. Coûts estimatifs          → « Évitez les surcoûts »
 *   2. Plans architecturaux IA   → « Imaginez votre future maison »
 *   3. Aide à la décision        → « Prenez les bonnes décisions »
 *   4. Mise en relation          → « Trouvez les bons professionnels »
 *   5. Investissement immobilier → « Investissez sans risque »
 *   6. Exécution & suivi         → « Suivez votre chantier en toute sérénité »
 *
 * Chaque illustration est VECTORIELLE, dessinée pour batibuild et représente
 * réellement la fonctionnalité (plan + détection des surcoûts, plan 2D → coté
 * → 3D, tableau de bord budgétaire, réseau de professionnels, avancement du
 * chantier). Aucune image générique, aucune capture d'un autre produit.
 *
 * NAVIGATION : glissement horizontal natif (pagination), « Précédent » (masqué
 * sur la 1ʳᵉ étape), « Passer » à gauche du bouton principal, et « Suivant »
 * qui devient le bouton final « Commencer » sur la 5ᵉ étape. Le bouton Retour
 * Android recule d'une étape. Aucun rechargement de l'application, aucun
 * dépassement au-delà de la 5ᵉ étape.
 *
 * Mémorisation : gérée par l'appelant (`App.tsx` → `storage.ts`,
 * `onboardingCompleted`), donc le guide ne réapparaît pas aux lancements
 * suivants. PÉRIMÈTRE : mobile uniquement — plateforme Web et backend intacts.
 */

type Slide = {
  /** Identifiant stable de l'étape (clé de liste, nom de la fonctionnalité, tests). */
  key: string;
  /** Nom de la fonctionnalité (surtitre discret). */
  tag: string;
  /** Titre principal (bénéfice), tel que défini dans la référence. */
  title: string;
  /** Explication courte, en français. */
  text: string;
  /** Illustration vectorielle dédiée à l'étape. */
  Art: (props: IllusProps) => React.ReactElement;
};

/** Les 5 étapes, dans l'ordre du parcours utilisateur. */
const SLIDES: Slide[] = [
  {
    key: "cost",
    tag: "Coûts estimatifs",
    title: "Évitez les surcoûts",
    text: "Estimez précisément votre budget de construction grâce à l'IA et anticipez vos dépenses avant de commencer les travaux.",
    Art: IllusOvercosts,
  },
  {
    key: "plans",
    tag: "Plans architecturaux IA",
    title: "Imaginez votre future maison",
    text: "Générez des plans architecturaux intelligents adaptés à vos besoins, à votre terrain et à votre budget.",
    Art: IllusPlanPreview,
  },
  {
    key: "decision",
    tag: "Aide à la décision",
    title: "Prenez les bonnes décisions",
    text: "L'intelligence artificielle analyse votre projet et vous aide à choisir les meilleures solutions pour maîtriser votre investissement.",
    Art: IllusDecision,
  },
  {
    key: "providers",
    tag: "Mise en relation",
    title: "Trouvez les bons professionnels",
    text: "Accédez à un réseau de professionnels du bâtiment et trouvez les partenaires adaptés à votre projet.",
    Art: IllusProviders,
  },
  {
    key: "investment",
    tag: "Investissement immobilier",
    title: "Investissez sans risque",
    text: "Mesurez le ROI à 1, 5 et 10 ans, le cash-flow, le score IA sur 100 et comparez les scénarios prudent, réaliste et optimiste avant de décider.",
    Art: IllusInvestment,
  },
  {
    key: "execution",
    tag: "Exécution & suivi",
    title: "Suivez votre chantier en toute sérénité",
    text: "Organisez, suivez et contrôlez l'avancement de vos travaux depuis une seule plateforme.",
    Art: IllusPhases,
  },
];

/** Palette de l'écran : LIGHT uniquement (référence), teintes de la marque. */
const LIGHT = themes.light;
const UI = {
  surface: "#FFFFFF",
  surfaceSoft: "#F4F8F6",
  ink: "#0F172A",
  inkSoft: "#334155",
  muted: "#64748B",
  line: "#E5EDE9",
  brand: COLORS.brand, // #059669
  brandDeep: COLORS.brand600,
  dot: "#D6E3DC",
} as const;

/** Marges latérales de la maquette de référence. */
const SIDE_PADDING = 24;
/** Largeur maximale de l'illustration (tablettes : jamais gigantesque). */
const ART_MAX = 400;

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [active, setActive] = useState(0);
  const isFirst = active <= 0;
  const isLast = active >= SLIDES.length - 1;

  const artWidth = Math.min(Math.round(width - SIDE_PADDING * 2), ART_MAX);

  const pagerRef = useRef<ScrollView>(null);

  // Navigation par bouton : le défilement natif fait l'animation, l'étape est
  // ensuite confirmée par `onMomentumScrollEnd` (source de vérité = position).
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

  // Fondu très court à l'ouverture du guide (aucun délai perçu).
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(enter, { toValue: 1, duration: 260, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [enter]);

  // Bouton Retour Android : recule d'une étape, sinon quitte le guide.
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
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── En-tête : marque à gauche, progression à droite ── */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <Logo size={30} radiusRatio={0.3} />
          <Text style={styles.brandName} maxFontSizeMultiplier={1.2}>
            {BRAND_NAME}
          </Text>
        </View>

        <View
          style={styles.counter}
          accessible
          accessibilityLabel={`Étape ${active + 1} sur ${SLIDES.length}`}
        >
          <Text style={styles.counterText} maxFontSizeMultiplier={1.2}>
            {active + 1} / {SLIDES.length}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.stage,
          {
            opacity: enter,
            transform: [
              { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
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
          contentContainerStyle={styles.pagerContent}
        >
          {SLIDES.map((slide, index) => {
            const Art = slide.Art;
            return (
              <View key={slide.key} style={{ width }}>
                {/* Défilement vertical de secours : sur un écran très court
                    (paysage, petit 5″), rien n'est coupé — rien ne déborde
                    jamais horizontalement. */}
                <ScrollView
                  style={styles.pageScroll}
                  contentContainerStyle={styles.slide}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Illustration de la fonctionnalité, dans son conteneur
                      arrondi (léger relief, coins 26 pt). */}
                  <View
                    style={styles.artFrame}
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={`Illustration : ${slide.tag}`}
                  >
                    <Art width={artWidth} theme={LIGHT} />
                  </View>

                  <Text style={styles.tag} maxFontSizeMultiplier={1.2}>
                    {slide.tag.toUpperCase()}
                  </Text>

                  <Text
                    style={styles.title}
                    maxFontSizeMultiplier={1.2}
                    accessibilityRole="header"
                  >
                    {slide.title}
                  </Text>

                  <Text style={styles.text} maxFontSizeMultiplier={1.3}>
                    {slide.text}
                  </Text>
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ── Pied : pagination + actions ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {SLIDES.map((slide, index) => (
            <View
              key={slide.key}
              style={[styles.dot, index === active && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          {!isFirst && (
            <Pressable
              onPress={() => goTo(active - 1)}
              accessibilityRole="button"
              accessibilityLabel="Précédent"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <GUIDE_ICONS.arrowRight
                size={15}
                color={UI.inkSoft}
                strokeWidth={2.4}
                // Flèche retournée : même icône que le reste de la coque.
                style={{ transform: [{ rotate: "180deg" }] }}
              />
              <Text style={styles.secondaryText} maxFontSizeMultiplier={1.2}>
                Précédent
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Passer le guide et ouvrir l'application"
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <Text style={styles.skipText} maxFontSizeMultiplier={1.2}>
              Passer
            </Text>
          </Pressable>

          {isLast ? (
            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLabel="Commencer et accéder à batibuild"
              style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
            >
              <Text style={styles.primaryText} maxFontSizeMultiplier={1.2}>
                Commencer
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => goTo(active + 1)}
              accessibilityRole="button"
              accessibilityLabel="Suivant"
              style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
            >
              <Text style={styles.primaryText} maxFontSizeMultiplier={1.2}>
                Suivant
              </Text>
              <GUIDE_ICONS.arrowRight size={17} color="#FFFFFF" strokeWidth={2.6} />
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
    backgroundColor: UI.surface,
  },

  /* ── En-tête ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 12,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
    minWidth: 0,
  },
  brandName: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: UI.ink,
  },
  counter: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: UI.surfaceSoft,
    borderWidth: 1,
    borderColor: UI.line,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  counterText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: UI.brandDeep,
  },

  /* ── Diapositive ── */
  stage: {
    flex: 1,
  },
  // Les pages occupent toute la hauteur du carrousel (aucun alignement en
  // haut) : le contenu est verticalement centré, comme sur la référence.
  pagerContent: {
    flexGrow: 1,
  },
  pageScroll: {
    flex: 1,
  },
  slide: {
    flexGrow: 1,
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  artFrame: {
    borderRadius: 26,
    // Léger relief : l'illustration « flotte » sur le fond blanc.
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    backgroundColor: UI.surface,
  },
  tag: {
    marginTop: 26,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: UI.brandDeep,
    textAlign: "center",
  },
  title: {
    marginTop: 9,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: UI.ink,
    textAlign: "center",
    alignSelf: "stretch",
  },
  text: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: UI.muted,
    textAlign: "center",
    alignSelf: "stretch",
  },

  /* ── Pied ── */
  footer: {
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 6,
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: UI.dot,
  },
  dotActive: {
    width: 24,
    backgroundColor: UI.brand,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 50,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.line,
    backgroundColor: UI.surface,
    flexShrink: 0,
  },
  secondaryText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: UI.inkSoft,
  },
  skip: {
    minHeight: 50,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  skipText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: UI.muted,
  },
  primary: {
    flex: 1,
    minWidth: 110,
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: UI.brand,
    shadowColor: UI.brand,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  primaryPressed: {
    backgroundColor: UI.brandDeep,
    opacity: 0.95,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.1,
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.6,
  },
});
