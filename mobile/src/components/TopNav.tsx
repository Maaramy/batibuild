import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HeaderNav from "./HeaderNav";
import { Logo } from "./Logo";
import { SETTINGS_ICON, STROKE, SUPPORT_ICON } from "./icons";
import { COLORS, SHAPE } from "../theme";
import type { NavDestination, NavId } from "../config";

type Props = {
  /** Ouvre la section Support de la plateforme. */
  onOpenSupport: () => void;
  /** Ouvre les paramètres de la plateforme. */
  onOpenSettings: () => void;
  /** Affiche le menu de navigation (masqué sur la connexion / l'accueil public). */
  showNav: boolean;
  /** Onglet courant du menu de navigation. */
  activeNav: NavId | null;
  /** Change de section depuis le menu de navigation. */
  onNavSelect: (destination: NavDestination) => void;
  /** Réglages natifs (appui long sur la marque — le menu garde ce raccourci). */
  onOpenNativeSettings: () => void;
};

/**
 * EN-TÊTE NATIF de l'application (Android).
 *
 * Il regroupe désormais TOUTE la navigation de la coque native : il remplace
 * l'ancienne barre de navigation inférieure, qui a été supprimée.
 *
 *   - ligne 1 — fond BLANC (#FFFFFF), même en thème sombre : c'est le chrome
 *     natif de l'application, indépendant du thème de la plateforme Web.
 *     À gauche : logo officiel Batibuild + nom de la plateforme.
 *     À droite : icônes Support et Paramètres (aucun menu burger).
 *   - ligne 2 — **menu de navigation horizontal scrollable** (`HeaderNav`) :
 *     Profile · Projets · Home · ROI · Message, les mêmes sections que
 *     l'ancienne barre du bas, avec l'élément courant mis en évidence.
 *
 * Les icônes viennent de la famille **lucide** (`icons.ts`), exactement comme
 * le tableau de bord de la plateforme.
 *
 * Elle gère elle-même la zone système haute (barre de statut / encoche) : le
 * contenu de la WebView ne passe jamais dessous. Aucune barre d'application web
 * n'est ajoutée ni modifiée.
 */
export default function TopNav({
  onOpenSupport,
  onOpenSettings,
  showNav,
  activeNav,
  onNavSelect,
  onOpenNativeSettings,
}: Props) {
  const insets = useSafeAreaInsets();

  const SupportIcon = SUPPORT_ICON;
  const SettingsIcon = SETTINGS_ICON;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable
          // Appui long sur la marque → réglages natifs (l'ancien appui long sur
          // la barre du bas est conservé, sans ajouter de bouton visible).
          onLongPress={onOpenNativeSettings}
          delayLongPress={500}
          accessibilityRole="button"
          accessibilityLabel="batibuild App"
          accessibilityHint="Appui long : réglages de l'application"
          style={styles.brand}
        >
          <Logo size={30} radiusRatio={0.28} />
          {/* Wordmark officiel de la plateforme (`src/components/Logo.tsx`). */}
          <Text style={styles.brandName} numberOfLines={1}>
            batibuild App
          </Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={onOpenSupport}
            accessibilityRole="button"
            accessibilityLabel="Support"
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <SupportIcon size={22} color={COLORS.inkSoft} strokeWidth={STROKE.inactive} />
          </Pressable>

          <Pressable
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Paramètres"
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <SettingsIcon size={22} color={COLORS.inkSoft} strokeWidth={STROKE.inactive} />
          </Pressable>
        </View>
      </View>

      {/* Navigation de l'en-tête — menu horizontal scrollable. */}
      {showNav && (
        <HeaderNav active={activeNav} onSelect={onNavSelect} onOpenSettings={onOpenNativeSettings} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // Barre native toujours blanche (demande explicite).
    backgroundColor: COLORS.white,
  },
  bar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
  },
  brandName: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: SHAPE.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnPressed: {
    // Voile neutre : lisible sur le fond blanc de la barre, quel que soit le
    // mode d'affichage du système.
    backgroundColor: "rgba(15,23,42,0.06)",
  },
});
