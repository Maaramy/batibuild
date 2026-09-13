import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "./Logo";
import { SETTINGS_ICON, STROKE, SUPPORT_ICON } from "./icons";
import { COLORS, SHAPE } from "../theme";

type Props = {
  /** Ouvre la section Support de la plateforme. */
  onOpenSupport: () => void;
  /** Ouvre les paramètres de la plateforme. */
  onOpenSettings: () => void;
  /** Réglages natifs (appui long sur la marque). */
  onOpenNativeSettings: () => void;
};

/**
 * EN-TÊTE NATIF de l'application (Android).
 *
 * Il ne contient plus AUCUN menu de navigation : la navigation est assurée par
 * la **barre de navigation inférieure** (`BottomNav.tsx`). L'en-tête est donc
 * réduit au strict nécessaire :
 *
 *   - fond BLANC (#FFFFFF), même en thème sombre : c'est le chrome natif de
 *     l'application, indépendant du thème de la plateforme Web ;
 *   - à gauche : logo officiel Batibuild + nom de la plateforme ;
 *   - à droite : icônes Support et Paramètres (aucun menu burger) ;
 *   - appui long sur la marque → réglages natifs de l'application.
 *
 * Aucune hauteur résiduelle n'est conservée pour l'ancien menu : la WebView
 * dispose de toute la place disponible au-dessus de la barre du bas.
 *
 * Les icônes viennent de la famille **lucide** (`icons.ts`), exactement comme
 * le tableau de bord de la plateforme.
 *
 * Il gère lui-même la zone système haute (barre de statut / encoche) : le
 * contenu de la WebView ne passe jamais dessous. Aucune barre d'application web
 * n'est ajoutée ni modifiée.
 */
export default function TopNav({ onOpenSupport, onOpenSettings, onOpenNativeSettings }: Props) {
  const insets = useSafeAreaInsets();

  const SupportIcon = SUPPORT_ICON;
  const SettingsIcon = SETTINGS_ICON;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable
          // Appui long sur la marque → réglages natifs (l'ancien appui long sur
          // la barre de navigation inférieure est conservé, sans bouton visible).
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
