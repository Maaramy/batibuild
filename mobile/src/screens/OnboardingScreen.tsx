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
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Logo } from "../components/Logo";
import {
  MockAnalysisCard,
  MockImportCard,
  MockInvestmentCard,
  MockReportCard,
} from "../components/GuideCards";
import { COLORS, useAppTheme, type AppTheme } from "../theme";

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * Guide de première visite — une CARTE par étape.
 *
 * Les étapes qui correspondent à un écran de la plateforme affichent la carte
 * correspondante (recréée nativement dans `GuideCards.tsx`, à partir des écrans
 * de la plateforme) :
 *
 *   Projets → « Importez vos documents »   (nouveau projet)
 *   Analyse IA → « Analyse en cours… »     (reconnaissance par l'IA)
 *   Estimation → « Coût total estimé »     (rapport + scénarios)
 *   Investissements → « Score IA »         (analyse d'investissement)
 *
 * Les autres étapes (profil, dashboard, messagerie, support) gardent la carte
 * « section » avec l'icône EXACTE de la barre de navigation native.
 *
 * Chaque carte est suivie d'une description explicative.
 */
type Visual = "logo" | "icon" | "import" | "analysis" | "report" | "investment";

type Slide = {
  key: string;
  title: string;
  description: string;
  visual: Visual;
  /** Icône Material des cartes « section » (même famille que la barre du bas). */
  icon?: Glyph;
};

const SLIDES: Slide[] = [
  {
    key: "welcome",
    title: "Bienvenue sur BatiBuild",
    description:
      "Votre copilote IA pour estimer, suivre et piloter vos projets de construction, d'aménagement et de rénovation en Tunisie. Ce guide présente en quelques cartes tout ce que vous pouvez faire dans l'application.",
    visual: "logo",
  },
  {
    key: "profile",
    title: "Mon profil",
    description:
      "Renseignez vos informations, votre abonnement et vos préférences : tout est centralisé dans votre espace personnel, accessible depuis l'onglet « Mon profil ».",
    visual: "icon",
    icon: "account",
  },
  {
    key: "projects",
    title: "Projets",
    description:
      "Importez une photo du terrain, un plan (PDF, JPG, PNG), une image satellite ou un croquis — ou saisissez simplement la région et la surface. BatiBuild prépare le dossier du projet pour vous.",
    visual: "import",
  },
  {
    key: "analysis",
    title: "Analyse IA",
    description:
      "L'intelligence artificielle identifie le type de projet (maison, villa, appartement, piscine), estime les dimensions réelles, détecte les surfaces, la liste des matériaux et la qualité de finition — avec son niveau de confiance.",
    visual: "analysis",
  },
  {
    key: "report",
    title: "Estimation & coûts",
    description:
      "Obtenez le coût total estimé aux prix du marché tunisien, la répartition par lots (gros œuvre, second œuvre, équipements) et trois scénarios — Économique, Standard, Premium — exportables en PDF.",
    visual: "report",
  },
  {
    key: "investments",
    title: "Investissements",
    description:
      "Évaluez la rentabilité d'un projet immobilier : score IA, rendement net, flux de trésorerie et prévisions de bénéfices sur 10 ans, pour décider en toute confiance.",
    visual: "investment",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "Retrouvez en un coup d'œil vos statistiques, vos estimations enregistrées, vos favoris et les recommandations de l'IA.",
    visual: "icon",
    icon: "view-dashboard",
  },
  {
    key: "messages",
    title: "Messagerie",
    description:
      "Échangez avec vos fournisseurs et vos experts, et recevez vos devis et vos réponses au même endroit.",
    visual: "icon",
    icon: "message-text",
  },
  {
    key: "support",
    title: "Support",
    description:
      "Besoin d'aide ? L'icône Support de la barre supérieure vous met directement en relation avec notre équipe, sans quitter l'application.",
    visual: "icon",
    icon: "headset",
  },
  {
    key: "start",
    title: "Prêt à commencer ?",
    description:
      "Vos projets vous attendent : connectez-vous ou créez votre compte, et laissez BatiBuild estimer votre premier chantier.",
    visual: "logo",
  },
];

/** Carte « section » : icône Material + libellé + lignes de contenu. */
function SectionCard(icon: Glyph, cardW: number, theme: AppTheme) {
  return (
    <View
      style={[
        styles.card,
        { width: cardW, backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant },
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
function LogoCard(cardW: number, theme: AppTheme) {
  return (
    <View
      style={[
        styles.card,
        styles.logoCard,
        { width: cardW, backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant },
      ]}
    >
      <Logo size={Math.min(120, cardW * 0.46)} shadow />
      <View style={[styles.aiBadge, { backgroundColor: theme.primaryContainer }]}>
        <Text style={[styles.aiBadgeText, { color: theme.onPrimaryContainer }]}>
          Gestion • Suivi • Estimation • IA
        </Text>
      </View>
    </View>
  );
}

function visualFor(slide: Slide, cardW: number, theme: AppTheme) {
  switch (slide.visual) {
    case "import":
      return <MockImportCard width={cardW} theme={theme} />;
    case "analysis":
      return <MockAnalysisCard width={cardW} theme={theme} />;
    case "report":
      return <MockReportCard width={cardW} theme={theme} />;
    case "investment":
      return <MockInvestmentCard width={cardW} theme={theme} />;
    case "logo":
      return LogoCard(cardW, theme);
    default:
      return SectionCard(slide.icon ?? "account", cardW, theme);
  }
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
  // Les cartes des écrans de la plateforme sont larges : on leur laisse la
  // quasi-totalité de la largeur du téléphone, mises à l'échelle.
  const cardW = Math.min(width - 56, 300);

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
            {/* Défilement vertical : les cartes détaillées restent lisibles en
                entier, même sur un petit écran. */}
            <ScrollView
              style={styles.illus}
              contentContainerStyle={styles.illusContent}
              showsVerticalScrollIndicator={false}
            >
              {visualFor(item, cardW, theme)}
              <Text style={[styles.title, { color: theme.onSurface }]}>{item.title}</Text>
              <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
                {item.description}
              </Text>
            </ScrollView>
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
                i === index && { width: 18, backgroundColor: theme.primary },
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
  },
  illus: {
    flex: 1,
  },
  illusContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
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
    marginTop: 20,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
  },
  description: {
    marginTop: 10,
    fontSize: 14.5,
    textAlign: "center",
    lineHeight: 21,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
