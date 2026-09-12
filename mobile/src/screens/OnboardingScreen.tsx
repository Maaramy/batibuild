import React, { useRef, useState } from "react";
import {
  FlatList,
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
  GUIDE_ILLUSTRATIONS,
  type IllusProps,
} from "../components/GuideIllustrations";
import { COLORS, useAppTheme } from "../theme";

/**
 * PARCOURS DE DÉMARRAGE — 7 GUIDES (application mobile Android uniquement).
 *
 * Remplace TOUS les anciens écrans d'introduction, guides et présentations :
 * il ne reste qu'un seul parcours, affiché au premier lancement.
 *
 * Chaque guide contient :
 *   - une illustration dédiée (voir `GuideIllustrations.tsx`) ;
 *   - un titre ;
 *   - un texte descriptif ;
 *   - l'indicateur de progression « n / 7 » + pastilles ;
 *   - un bouton « Suivant » (puis « Commencer » au 7ᵉ) ;
 *   - un bouton « Passer » toujours accessible.
 *
 * Aucun appel réseau, aucune image téléchargée : l'affichage est immédiat et
 * identique en mode clair, sombre ou système.
 *
 * PÉRIMÈTRE : mobile uniquement — la plateforme Web, le backend et Convex ne
 * sont pas concernés.
 */

type Slide = {
  key: string;
  title: string;
  text: string;
  Illustration: React.ComponentType<IllusProps>;
};

/** Les 7 guides, dans l'ordre imposé du parcours. */
const SLIDES: Slide[] = [
  {
    key: "overcosts",
    title: "Évitez les surcoûts",
    text: "L'IA détecte automatiquement les surfaces, les matériaux et les quantités — plus d'oublis, plus de mauvaises surprises en chantier.",
    Illustration: GUIDE_ILLUSTRATIONS[0],
  },
  {
    key: "quote",
    title: "Devis clé en main",
    text: "Importez une photo, un plan PDF, une image satellite ou un croquis à la main — l'IA fait le reste en quelques minutes.",
    Illustration: GUIDE_ILLUSTRATIONS[1],
  },
  {
    key: "materials",
    title: "Choisissez les meilleurs matériaux",
    text: "Comparez 3 options (Économique, Équilibré, Premium) pour chaque poste — l'IA recommande le meilleur rapport qualité/prix.",
    Illustration: GUIDE_ILLUSTRATIONS[2],
  },
  {
    key: "phases",
    title: "Ne perdez plus une seule étape",
    text: "Guide complet de 10 phases : démarches, budget, planning, contrôle de chantier — rien n'est oublié.",
    Illustration: GUIDE_ILLUSTRATIONS[3],
  },
  {
    key: "investment",
    title: "Investissez sans risque",
    text: "Return on Investment à 1/5/10 ans, flux de trésorerie, score IA /100 et 3 scénarios — comparez avant d'engager votre capital.",
    Illustration: GUIDE_ILLUSTRATIONS[4],
  },
  {
    key: "prices",
    title: "Suivez l'évolution des prix",
    text: "Base de 500+ matériaux actualisée en temps réel — anticipez les hausses et optimisez votre timing d'achat.",
    Illustration: GUIDE_ILLUSTRATIONS[5],
  },
  {
    key: "providers",
    title: "Trouvez les bons prestataires",
    text: "Annuaire vérifié d'architectes, ingénieurs et fournisseurs : spécialités, régions et recommandations ciblées.",
    Illustration: GUIDE_ILLUSTRATIONS[6],
  },
];

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const last = index === SLIDES.length - 1;

  // L'illustration occupe une part importante de l'écran sans jamais empêcher
  // la lecture du texte : elle est bornée en hauteur puis ajustée en largeur
  // (petits écrans, grands écrans, rotation).
  const illusMaxH = Math.min(Math.max(height * 0.38, 150), 280);
  const illusW = Math.min(width - 48, (illusMaxH * 4) / 3);

  const goNext = () => {
    if (last) {
      onDone();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.surface, paddingTop: insets.top },
      ]}
    >
      {/* En-tête discret : identité Batibuild + position dans le parcours. */}
      <View style={styles.topBar}>
        <View style={styles.brandWrap}>
          <Logo size={26} radiusRatio={0.28} />
          <Text style={[styles.brandName, { color: theme.onSurface }]}>BatiBuild</Text>
        </View>
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
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => {
          const Illustration = item.Illustration;
          return (
            <View style={{ width }}>
              {/* Défilement vertical de secours : sur un très petit écran, le
                  texte reste lisible dans son intégralité. */}
              <ScrollView
                contentContainerStyle={styles.slide}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.illusSlot}>
                  <Illustration width={illusW} theme={theme} />
                </View>
                <Text style={[styles.title, { color: theme.onSurface }]}>{item.title}</Text>
                <Text style={[styles.text, { color: theme.onSurfaceVariant }]}>{item.text}</Text>
              </ScrollView>
            </View>
          );
        }}
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                { backgroundColor: theme.outlineVariant },
                i === index && { width: 20, backgroundColor: theme.primary },
              ]}
            />
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
            accessibilityLabel={last ? "Commencer" : "Suivant"}
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
    paddingBottom: 4,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
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
  slide: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 8,
  },
  illusSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 18,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  text: {
    marginTop: 10,
    fontSize: 14.5,
    textAlign: "center",
    lineHeight: 21,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    paddingHorizontal: 10,
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
