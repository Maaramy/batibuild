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
  MockAnalysisCard,
  MockImportCard,
  MockInvestmentCard,
  MockReportCard,
} from "../components/GuideCards";
import { GUIDE_ICONS, NAV_ICONS, SUPPORT_ICON, type LucideIcon } from "../components/icons";
import { COLORS, useAppTheme, type AppTheme } from "../theme";

/**
 * Guide de première visite — une CARTE par étape.
 *
 * Les écrans de la plateforme sont présentés dans l'ORDRE où la plateforme les
 * expose (`src/components/LandingMockScreens.tsx`) et où un projet se déroule :
 *
 *   1. Importer les documents        (« Importez vos documents »)
 *   2. Analyse par l'IA              (« Analyse en cours… »)
 *   3. Estimation & coûts            (« Coût total estimé »)
 *   4. Investissements               (« Score IA »)
 *
 * Chaque étape affiche : un repère d'étape, la carte, un titre, une description
 * détaillée et la liste de ce que l'étape permet de faire. Les icônes sont
 * celles de la barre de navigation et du tableau de bord (famille lucide,
 * `icons.ts`) : aucune icône générique, aucun mélange de styles.
 */
type Visual = "logo" | "icon" | "import" | "analysis" | "report" | "investment";

type Slide = {
  key: string;
  title: string;
  /** Description détaillée de l'étape. */
  lead: string;
  /** Points concrets : ce que l'utilisateur peut faire à cette étape. */
  details: string[];
  visual: Visual;
  /** Icône lucide des cartes « section » (même famille que la barre du bas). */
  icon?: LucideIcon;
};

const SLIDES: Slide[] = [
  {
    key: "welcome",
    title: "Bienvenue sur BatiBuild",
    lead: "Votre copilote IA pour estimer, suivre et piloter vos projets de construction, d'aménagement et de rénovation en Tunisie. Ce guide présente en quelques cartes tout ce que vous pouvez faire dans l'application.",
    details: [
      "Estimation automatique aux prix du marché tunisien",
      "Documents lus par l'IA : photo, plan, image satellite, croquis",
      "Projets, rapports et investissements réunis dans un seul espace",
    ],
    visual: "logo",
  },
  {
    key: "profile",
    title: "Mon profil",
    lead: "Votre espace personnel réunit vos informations, votre abonnement et vos préférences. Plus votre profil est complet, plus les estimations et les recommandations sont pertinentes.",
    details: [
      "Informations personnelles et coordonnées",
      "Abonnement et historique de vos estimations",
      "Préférences et sécurité de votre compte",
    ],
    visual: "icon",
    icon: NAV_ICONS.profile,
  },
  {
    key: "projects",
    title: "Projets",
    lead: "Créez un projet en important une photo du terrain, un plan (PDF, JPG, PNG), une image satellite ou un croquis. Vous pouvez aussi saisir simplement la région et la surface : BatiBuild prépare le dossier pour vous.",
    details: [
      "Choisissez le type : maison, villa, appartement ou piscine",
      "Importez un plan, une photo, une image satellite ou un croquis",
      "Sans dimensions ? l'IA les estime à partir de vos documents",
    ],
    visual: "import",
  },
  {
    key: "analysis",
    title: "Analyse IA",
    lead: "L'intelligence artificielle lit vos documents et reconstruit le projet : type de construction, dimensions réelles, surfaces construites, matériaux nécessaires, quantités et qualité de finition.",
    details: [
      "Type de projet et surface détectés automatiquement",
      "Matériaux identifiés et quantités estimées",
      "Un indice de confiance accompagne chaque détection",
    ],
    visual: "analysis",
  },
  {
    key: "report",
    title: "Estimation & coûts",
    lead: "Le rapport affiche le coût total estimé aux prix du marché tunisien, la répartition détaillée par lots et trois scénarios de qualité pour arbitrer votre budget.",
    details: [
      "Répartition gros œuvre, second œuvre et équipements",
      "Trois scénarios : Économique, Standard, Premium",
      "Rapport téléchargeable en PDF, prêt à partager",
    ],
    visual: "report",
  },
  {
    key: "investments",
    title: "Investissements",
    lead: "Évaluez la rentabilité d'un projet immobilier avant d'acheter, de construire ou de louer, pour décider en toute confiance.",
    details: [
      "Score IA sur 100 et niveau de confiance",
      "Rendement net, flux de trésorerie et retour sur investissement",
      "Prévisions de bénéfices sur 10 ans",
    ],
    visual: "investment",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    lead: "Votre tableau de bord réunit l'essentiel en un coup d'œil et suit l'avancement de tous vos dossiers.",
    details: [
      "Statistiques et dépenses de vos projets",
      "Vos dernières estimations enregistrées",
      "Recommandations de l'IA",
    ],
    visual: "icon",
    icon: NAV_ICONS.dashboard,
  },
  {
    key: "messages",
    title: "Messagerie",
    lead: "Échangez avec vos fournisseurs, vos experts et l'équipe BatiBuild, sans quitter l'application et sans perdre le fil de vos projets.",
    details: [
      "Un fil par projet ou par demande de devis",
      "Notification à chaque nouveau message",
      "Partage de documents et de photos",
    ],
    visual: "icon",
    icon: NAV_ICONS.messages,
  },
  {
    key: "support",
    title: "Support",
    lead: "Besoin d'aide ? L'icône Support de la barre supérieure vous met directement en relation avec notre équipe, en conservant votre session.",
    details: [
      "Questions fréquentes et prise en main rapide",
      "Ouvrez un ticket et suivez la réponse",
      "Votre demande reste rattachée à votre compte",
    ],
    visual: "icon",
    icon: SUPPORT_ICON,
  },
  {
    key: "start",
    title: "Prêt à commencer ?",
    lead: "Connectez-vous ou créez votre compte, puis lancez votre première estimation : l'IA s'occupe du reste, vous gardez la main sur les décisions.",
    details: [
      "Vos projets et vos estimations restent privés",
      "Ce guide reste accessible depuis les réglages",
    ],
    visual: "logo",
  },
];

/** Carte « section » : icône lucide + lignes de contenu. */
function SectionCard(icon: LucideIcon, cardW: number, theme: AppTheme) {
  const Icon = icon;
  return (
    <View
      style={[
        styles.card,
        { width: cardW, backgroundColor: theme.surfaceContainer, borderColor: theme.outlineVariant },
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: theme.primaryContainer }]}>
        <Icon size={34} color={theme.onPrimaryContainer} strokeWidth={1.9} />
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
      return SectionCard(slide.icon ?? NAV_ICONS.profile, cardW, theme);
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

  const Check = GUIDE_ICONS.check;

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
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { width }]}>
            {/* Défilement vertical : les cartes détaillées restent lisibles en
                entier, même sur un petit écran. */}
            <ScrollView
              style={styles.illus}
              contentContainerStyle={styles.illusContent}
              showsVerticalScrollIndicator={false}
            >
              {visualFor(item, cardW, theme)}
              <Text style={[styles.step, { color: theme.primary }]}>
                Étape {i + 1} / {SLIDES.length}
              </Text>
              <Text style={[styles.title, { color: theme.onSurface }]}>{item.title}</Text>
              <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
                {item.lead}
              </Text>

              <View style={styles.details}>
                {item.details.map((d) => (
                  <View key={d} style={styles.detailRow}>
                    <Check size={15} color={theme.primary} strokeWidth={2.4} />
                    <Text style={[styles.detailText, { color: theme.onSurface }]}>{d}</Text>
                  </View>
                ))}
              </View>
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
  step: {
    marginTop: 20,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
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
  details: {
    marginTop: 16,
    alignSelf: "stretch",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
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
