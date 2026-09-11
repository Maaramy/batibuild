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
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Logo } from "../components/Logo";
import { COLORS, useAppTheme, type AppTheme } from "../theme";

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * Guide de première visite — une CARTE par section de l'application.
 *
 * Chaque carte reprend l'icône et le libellé EXACTS de la barre de navigation
 * (native), avec une description explicative : l'utilisateur retrouve ensuite
 * immédiatement les mêmes repères dans l'application.
 */
type Slide = {
  key: string;
  title: string;
  description: string;
  /** Icône Material de la carte (même famille que la barre du bas). */
  icon?: Glyph;
  /** Carte « logo officiel » (bienvenue / démarrage). */
  logo?: boolean;
};

const SLIDES: Slide[] = [
  {
    key: "welcome",
    title: "Bienvenue sur BatiBuild",
    description:
      "Votre copilote IA pour estimer, suivre et piloter vos projets de construction, d'aménagement et de rénovation en Tunisie.",
    logo: true,
  },
  {
    key: "profile",
    title: "Mon profil",
    description:
      "Renseignez vos informations, votre abonnement et vos préférences : tout est centralisé dans votre espace personnel.",
    icon: "account",
  },
  {
    key: "projects",
    title: "Projets",
    description:
      "Créez un projet à partir d'un plan, d'une photo ou d'un simple croquis, puis suivez son avancement, son budget et ses estimations.",
    icon: "folder",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "Retrouvez en un coup d'œil vos statistiques, vos estimations enregistrées, vos favoris et les recommandations de l'IA.",
    icon: "view-dashboard",
  },
  {
    key: "investments",
    title: "Investissements",
    description:
      "Analysez la rentabilité d'un projet immobilier et comparez plusieurs scénarios avant de vous engager.",
    icon: "bank",
  },
  {
    key: "messages",
    title: "Messagerie",
    description:
      "Échangez avec vos fournisseurs et vos experts, et recevez vos devis et réponses au même endroit.",
    icon: "message-text",
  },
  {
    key: "support",
    title: "Support",
    description:
      "Besoin d'aide ? L'icône Support de la barre supérieure vous met directement en relation avec notre équipe.",
    icon: "headset",
  },
  {
    key: "start",
    title: "Prêt à commencer ?",
    description:
      "Accédez à BatiBuild depuis votre application : vos projets vous attendent.",
    logo: true,
  },
];

/** Carte « section » : icône Material + libellé + lignes de contenu. */
function SectionCard(icon: Glyph, w: number, theme: AppTheme) {
  const cardW = Math.min(280, w * 0.64);
  return (
    <View
      style={[
        styles.card,
        {
          width: cardW,
          backgroundColor: theme.surfaceContainer,
          borderColor: theme.outlineVariant,
        },
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: theme.primaryContainer }]}>
        <MaterialCommunityIcons name={icon} size={34} color={theme.onPrimaryContainer} />
      </View>
      <View style={[styles.ghostLine, { backgroundColor: theme.outlineVariant, width: "78%" }]} />
      <View style={[styles.ghostLine, { backgroundColor: theme.outlineVariant, width: "52%" }]} />
      <View style={[styles.ghostBlock, { backgroundColor: theme.surfaceContainerHigh }]} />
    </View>
  );
}

/** Carte « logo officiel » (bienvenue / démarrage). */
function LogoCard(w: number, theme: AppTheme) {
  const size = Math.min(280, w * 0.64);
  return (
    <View
      style={[
        styles.card,
        styles.logoCard,
        { width: size, backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant },
      ]}
    >
      <Logo size={Math.min(132, w * 0.3)} shadow />
      <View style={[styles.aiBadge, { backgroundColor: theme.primaryContainer }]}>
        <Text style={[styles.aiBadgeText, { color: theme.onPrimaryContainer }]}>
          Gestion • Suivi • Estimation • IA
        </Text>
      </View>
    </View>
  );
}

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
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
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.surface,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.topBar}>
        <View style={styles.brandMiniWrap}>
          <Logo size={24} radiusRatio={0.28} />
          <Text style={[styles.brandMini, { color: theme.onSurface }]}>BatiBuild</Text>
        </View>
        <Pressable
          onPress={onDone}
          hitSlop={12}
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.skipText, { color: theme.onSurfaceVariant }]}>Passer</Text>
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
            <View style={styles.illus}>
              {item.logo ? LogoCard(width, theme) : SectionCard(item.icon as Glyph, width, theme)}
            </View>
            <Text style={[styles.title, { color: theme.onSurface }]}>{item.title}</Text>
            <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
              {item.description}
            </Text>
          </View>
        )}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                { backgroundColor: theme.outlineVariant },
                i === index && { width: 22, backgroundColor: theme.primary },
              ]}
            />
          ))}
        </View>
        <Pressable
          onPress={goNext}
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
  brandMiniWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandMini: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
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
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  logoCard: {
    paddingVertical: 30,
  },
  iconTile: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostLine: {
    height: 9,
    borderRadius: 5,
    marginTop: 14,
  },
  ghostBlock: {
    marginTop: 16,
    width: "100%",
    height: 46,
    borderRadius: 14,
  },
  aiBadge: {
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 31,
  },
  description: {
    marginTop: 10,
    fontSize: 15,
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
  },
  cta: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
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
