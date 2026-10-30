import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
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
import { BRAND_NAME } from "../config";
import { GUIDE_ICONS } from "../components/icons";
import {
  IllusDecision,
  IllusOvercosts,
  IllusPhases,
  IllusProviders,
  type IllusProps,
} from "../components/GuideIllustrations";
import { IllusPlanPreview } from "../components/GuidePlans";
import { COLORS, themes } from "../theme";

/**
 * GUIDE D'UTILISATION — les 5 étapes du parcours batibuild.
 *
 * Affiché une seule fois, au premier lancement (voir `storage.ts` —
 * `onboardingCompleted`) et consultable depuis « Voir le guide » dans les
 * réglages natifs.
 *
 * DESIGN : fond blanc, mise en page minimaliste, vert émeraude de marque.
 *   · en-tête : logo officiel + « batibuild » à gauche, indicateur **n / 5**
 *     à droite ;
 *   · grande illustration vectorielle centrale dans un conteneur aux coins
 *     arrondis (scènes dédiées, aucune image générique) ;
 *   · titre gras, grande taille, centré ; description en gris, centrée ;
 *   · pagination en bas (pastilles, l'étape active est verte et élargie) ;
 *   · bouton **Suivant** vert, large, arrondi, légère ombre ; bouton **Passer**
 *     à sa gauche, et **Précédent** dès la deuxième étape.
 *
 * NAVIGATION : carrousel horizontal (glissement libre) — le changement d'étape
 * ne recharge jamais l'application et ne peut pas dépasser la 5ᵉ étape. Sur la
 * dernière étape, « Suivant » devient **« Commencer »** et ouvre l'écran
 * d'entrée réel de l'application (WebView batibuild). Le bouton Retour Android
 * revient à l'étape précédente, puis quitte le guide.
 *
 * AUCUN ÉLÉMENT EXISTANT N'EST MODIFIÉ : ni routes, ni authentification, ni
 * Convex, ni autres modules de la plateforme — uniquement le visuel de ce
 * guide. Les zones système (encoche, barre de gestes) sont gérées par
 * `useSafeAreaInsets`, et la mise en page est fluide de 320 à 428 px.
 *
 * PÉRIMÈTRE : mobile uniquement.
 */

type Slide = {
  /** Identifiant stable de l'étape (clé de liste et tests automatisés). */
  key: string;
  title: string;
  text: string;
  /** Illustration vectorielle dédiée de l'étape (dessin de la plateforme). */
  Illustration: React.ComponentType<IllusProps>;
  /** Description parlée de l'illustration (lecteur d'écran). */
  alt: string;
};

/** Les 5 étapes, dans l'ordre du parcours utilisateur. */
const SLIDES: Slide[] = [
  {
    key: "cost",
    title: "Évitez les surcoûts",
    text: "Estimez précisément votre budget de construction grâce à l'IA et anticipez vos dépenses avant de commencer les travaux.",
    Illustration: IllusOvercosts,
    alt: "Plan architectural avec surfaces, matériaux et quantités détectés par l'IA",
  },
  {
    key: "plans",
    title: "Imaginez votre future maison",
    text: "Générez des plans architecturaux intelligents adaptés à vos besoins, à votre terrain et à votre budget.",
    Illustration: IllusPlanPreview,
    alt: "Plan architectural en 2D qui se transforme en vue 3D",
  },
  {
    key: "decision",
    title: "Prenez les bonnes décisions",
    text: "L'intelligence artificielle analyse votre projet et vous aide à choisir les meilleures solutions pour maîtriser votre investissement.",
    Illustration: IllusDecision,
    alt: "Tableau de bord : budget disponible, coût estimé, écart et analyse IA",
  },
  {
    key: "providers",
    title: "Trouvez les bons professionnels",
    text: "Accédez à un réseau de professionnels du bâtiment et trouvez les partenaires adaptés à votre projet.",
    Illustration: IllusProviders,
    alt: "Réseau de professionnels : architectes, ingénieurs, entrepreneurs et fournisseurs",
  },
  {
    key: "execution",
    title: "Suivez votre chantier en toute sérénité",
    text: "Organisez, suivez et contrôlez l'avancement de vos travaux depuis une seule plateforme.",
    Illustration: IllusPhases,
    alt: "Chantier avec phases, jalons et indicateurs d'avancement",
  },
];

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Guide TOUJOURS en clair (fond blanc), quel que soit le thème système :
  // c'est l'écran de marque, identique à la charte de référence.
  const c = themes.light;
  /** Vert émeraude de marque (accents : compteur, pastilles, bouton). */
  const brand = COLORS.brand;
  /** Gris de texte secondaire (descriptions). */
  const gray = COLORS.muted;
  /** Filet clair (pastilles inactives, séparateurs). */
  const line = COLORS.line;

  // ── Étape courante ──────────────────────────────────────────────────────
  const [active, setActive] = useState(0);
  const isFirst = active <= 0;
  const isLast = active >= SLIDES.length - 1;

  const pagerRef = useRef<ScrollView>(null);

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

  // ── Apparition douce (fondu + léger glissement) ──────────────────────────
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(enter, { toValue: 1, duration: 360, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [enter]);

  // Bouton Retour Android : recule d'une étape, puis quitte le guide.
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

  // Largeur de l'illustration : pleine largeur, bornée pour rester lisible
  // sur tablette, centrée dans la colonne.
  const illusW = Math.max(240, Math.min(width - 40, 420));

  return (
    <View style={[styles.root, { backgroundColor: c.surface, paddingTop: insets.top }]}>
      {/* ── En-tête : logo + nom à gauche, indicateur « n / 5 » à droite ── */}
      <View style={styles.topBar}>
        <View style={styles.brandWrap}>
          <Logo size={26} radiusRatio={0.28} />
          <Text style={[styles.brandName, { color: c.onSurface }]}>{BRAND_NAME}</Text>
        </View>

        <View
          style={styles.stepCounter}
          accessibilityRole="text"
          accessibilityLabel={`Étape ${active + 1} sur ${SLIDES.length}`}
        >
          <Text style={styles.stepCounterValue}>{active + 1}</Text>
          <Text style={styles.stepCounterTotal}> / {SLIDES.length}</Text>
        </View>
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
            const SlideIllus = slide.Illustration;
            return (
              <View key={slide.key} style={{ width }}>
                <ScrollView
                  contentContainerStyle={styles.slideContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Grande illustration centrale (conteneur arrondi) */}
                  <View
                    style={styles.illusWrap}
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={slide.alt}
                  >
                    <SlideIllus width={illusW} theme={c} />
                  </View>

                  {/* Titre + description */}
                  <Text
                    style={[styles.title, { color: c.onSurface }]}
                    accessibilityRole="header"
                  >
                    {slide.title}
                  </Text>
                  <Text style={[styles.text, { color: gray }]}>{slide.text}</Text>
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ── Pagination + actions ── */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: c.surface,
            borderTopColor: line,
          },
        ]}
      >
        {/* Pagination : pastille verte élargie sur l'étape active */}
        <View
          style={styles.dots}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: SLIDES.length, now: active + 1 }}
        >
          {SLIDES.map((slide, index) => (
            <Pressable
              key={slide.key}
              onPress={() => goTo(index)}
              accessibilityRole="button"
              accessibilityLabel={`Aller à l'étape ${index + 1}`}
              hitSlop={6}
              style={styles.dotHit}
            >
              <View
                style={[
                  styles.dot,
                  index === active
                    ? { width: 22, backgroundColor: brand }
                    : { backgroundColor: line },
                ]}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Passer le guide et ouvrir l'application"
            hitSlop={6}
            style={({ pressed }) => [styles.ghostText, pressed && { opacity: 0.55 }]}
          >
            <Text style={[styles.ghostTextValue, { color: gray }]}>Passer</Text>
          </Pressable>

          {!isFirst && (
            <Pressable
              onPress={() => goTo(active - 1)}
              accessibilityRole="button"
              accessibilityLabel="Précédent"
              style={({ pressed }) => [
                styles.ghostButton,
                { borderColor: line },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.ghostButtonValue, { color: c.onSurface }]}>Précédent</Text>
            </Pressable>
          )}

          <Pressable
            onPress={isLast ? onDone : () => goTo(active + 1)}
            accessibilityRole="button"
            accessibilityLabel={isLast ? "Commencer et accéder à batibuild" : "Suivant"}
            style={({ pressed }) => [
              styles.primary,
              pressed && { opacity: 0.92, transform: [{ translateY: 1 }] },
            ]}
          >
            <Text style={styles.primaryValue}>{isLast ? "Commencer" : "Suivant"}</Text>
            <GUIDE_ICONS.arrowRight size={18} color="#FFFFFF" strokeWidth={2.6} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
    minWidth: 0,
  },
  brandName: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  stepCounter: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "flex-end",
    minWidth: 56,
  },
  stepCounterValue: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.4,
  },
  stepCounterTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.4,
  },
  stage: {
    flex: 1,
  },
  slideContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },
  illusWrap: {
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  title: {
    marginTop: 26,
    maxWidth: 330,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  text: {
    marginTop: 12,
    maxWidth: 340,
    fontSize: 14.5,
    lineHeight: 21.5,
    textAlign: "center",
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 24,
  },
  dotHit: {
    paddingVertical: 6,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  ghostText: {
    minHeight: 54,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  ghostTextValue: {
    fontSize: 15.5,
    fontWeight: "700",
  },
  ghostButton: {
    minHeight: 54,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
  },
  ghostButtonValue: {
    fontSize: 15.5,
    fontWeight: "700",
  },
  primary: {
    flexGrow: 1,
    flexBasis: 132,
    minHeight: 54,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
});
