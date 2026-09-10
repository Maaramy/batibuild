import React, { useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HouseMark, Logo } from "../components/Logo";
import { COLORS } from "../theme";

type Slide = {
  key: string;
  title: string;
  description: string;
  render: (w: number) => React.ReactNode;
};

function IllustrationWelcome(w: number) {
  return (
    <View style={[styles.illusWrap, { width: w * 0.72 }]}>
      <Logo size={Math.min(150, w * 0.32)} shadow />
      <View style={styles.aiBadge}>
        <Text style={styles.aiBadgeText}>Copilote IA</Text>
      </View>
    </View>
  );
}

function IllustrationEstimate(w: number) {
  const cardW = w * 0.56;
  return (
    <View style={[styles.illusWrap, { width: w * 0.72 }]}>
      <View style={[styles.mockCard, { width: cardW }]}>
        <View style={styles.mockRow}>
          <Text style={styles.mockLabel}>Superficie</Text>
          <Text style={styles.mockValue}>150 m²</Text>
        </View>
        <View style={styles.mockDivider} />
        <View style={styles.mockRow}>
          <Text style={styles.mockLabel}>Estimation</Text>
          <Text style={[styles.mockValue, { color: COLORS.brand }]}>185 000 DT</Text>
        </View>
        <View style={styles.mockBars}>
          <View style={[styles.mockBar, { height: 18 }]} />
          <View style={[styles.mockBar, { height: 30 }]} />
          <View style={[styles.mockBar, { height: 24 }]} />
          <View style={[styles.mockBar, { height: 38 }]} />
        </View>
      </View>
    </View>
  );
}

function IllustrationProjects(w: number) {
  const cardW = w * 0.56;
  return (
    <View style={[styles.illusWrap, { width: w * 0.72 }]}>
      <View style={[styles.mockStackCard, { width: cardW, transform: [{ rotate: "-2.5deg" }] }]} />
      <View style={[styles.mockStackCard2, { width: cardW, transform: [{ rotate: "2deg" }] }]} />
      <View style={[styles.mockCard, { width: cardW }]}>
        <View style={styles.mockProjectRow}>
          <View style={styles.mockProjectDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.mockProjectName}>Villa — Carthage</Text>
            <Text style={styles.mockProjectMeta}>En cours · 320 000 DT</Text>
          </View>
        </View>
        <View style={styles.mockDivider} />
        <View style={styles.mockProjectRow}>
          <View style={[styles.mockProjectDot, { backgroundColor: COLORS.brand }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.mockProjectName}>Appartement — Sousse</Text>
            <Text style={styles.mockProjectMeta}>Brouillon · 145 000 DT</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function IllustrationStart(w: number) {
  return (
    <View style={[styles.illusWrap, { width: w * 0.72 }]}>
      <View style={styles.startRing}>
        <HouseMark size={w * 0.3} color={COLORS.brand} doorColor={COLORS.brandDeep} />
      </View>
    </View>
  );
}

const SLIDES: Slide[] = [
  {
    key: "welcome",
    title: "Bienvenue sur BatiBuild",
    description: "Votre copilote IA pour construire, rénover et investir.",
    render: IllustrationWelcome,
  },
  {
    key: "estimate",
    title: "Estimez votre projet",
    description:
      "Obtenez rapidement une estimation du coût de votre projet selon sa superficie, ses caractéristiques et les options choisies.",
    render: IllustrationEstimate,
  },
  {
    key: "projects",
    title: "Gardez vos projets à portée de main",
    description: "Retrouvez vos projets et vos estimations facilement depuis votre téléphone.",
    render: IllustrationProjects,
  },
  {
    key: "start",
    title: "Prêt à commencer ?",
    description: "Accédez à BatiBuild depuis votre application mobile.",
    render: IllustrationStart,
  },
];

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const last = index === SLIDES.length - 1;

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
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.topBar}>
        <Text style={styles.brandMini}>BatiBuild</Text>
        <Pressable onPress={onDone} hitSlop={12} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}>
          <Text style={styles.skipText}>Passer</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.illus}>{item.render(width)}</View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>{last ? "Commencer" : "Suivant"}</Text>
        </Pressable>
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
    paddingVertical: 10,
  },
  brandMini: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 0.2,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
  },
  illus: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  illusWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  aiBadge: {
    marginTop: 18,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.brand700,
  },
  mockCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  mockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mockLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  mockValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
  },
  mockDivider: {
    height: 1,
    backgroundColor: COLORS.line,
    marginVertical: 12,
  },
  mockBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 12,
    height: 40,
  },
  mockBar: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 6,
  },
  mockStackCard: {
    position: "absolute",
    backgroundColor: "#E7F6EF",
    borderRadius: 18,
    height: 110,
    top: -6,
  },
  mockStackCard2: {
    position: "absolute",
    backgroundColor: "#D3EFE2",
    borderRadius: 18,
    height: 120,
    top: 10,
  },
  mockProjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mockProjectDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
  },
  mockProjectName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
  },
  mockProjectMeta: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  startRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
    lineHeight: 31,
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D7E3DD",
  },
  dotActive: {
    width: 22,
    backgroundColor: COLORS.brand,
  },
  cta: {
    backgroundColor: COLORS.brand,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.brand,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaPressed: {
    backgroundColor: COLORS.brand600,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
});