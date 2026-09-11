import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Logo } from "./Logo";
import { COLORS, SHAPE } from "../theme";

type Props = {
  /** Ouvre la section Support de la plateforme. */
  onOpenSupport: () => void;
  /** Ouvre les paramètres de la plateforme. */
  onOpenSettings: () => void;
};

/**
 * Barre de navigation SUPÉRIEURE native (Android).
 *
 * - Fond BLANC (#FFFFFF), même en thème sombre : c'est le chrome natif de
 *   l'application, indépendant du thème de la plateforme Web.
 * - À gauche : logo officiel Batibuild + nom de la plateforme.
 * - À droite : icônes Support et Paramètres (aucun menu burger).
 *
 * Elle gère elle-même la zone système haute (barre de statut / encoche) : le
 * contenu de la WebView ne passe jamais dessous. Aucune barre d'application
 * web n'est ajoutée ni modifiée.
 */
export default function TopNav({ onOpenSupport, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.brand}>
          <Logo size={30} radiusRatio={0.28} />
          <Text style={styles.brandName} numberOfLines={1}>
            BatiBuild
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onOpenSupport}
            accessibilityRole="button"
            accessibilityLabel="Support"
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <MaterialCommunityIcons name="headset" size={22} color={COLORS.inkSoft} />
          </Pressable>

          <Pressable
            onPress={onOpenSettings}
            accessibilityRole="button"
            accessibilityLabel="Paramètres"
            hitSlop={6}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <MaterialCommunityIcons name="cog-outline" size={22} color={COLORS.inkSoft} />
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
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: 0.2,
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
    backgroundColor: "#F1F5F4",
  },
});
