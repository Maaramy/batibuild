import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { NAV_DESTINATIONS, type NavDestination, type NavId } from "../config";
import { SHAPE, useAppTheme } from "../theme";

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * Icônes Material (famille MaterialCommunityIcons, la même pour les 5 entrées)
 * avec variante pleine (actif) / contour (inactif) — donc jamais de mélange de
 * styles. Noms choisis d'après les suggestions : Person, Folder, AccountBalance,
 * Chat/Mail, SupportAgent.
 */
const ICONS: Record<NavId, { active: Glyph; inactive: Glyph }> = {
  profile: { active: "account", inactive: "account-outline" },
  projects: { active: "folder", inactive: "folder-outline" },
  investments: { active: "bank", inactive: "bank-outline" },
  messages: { active: "message-text", inactive: "message-text-outline" },
  support: { active: "account-supervisor", inactive: "account-supervisor-outline" },
};

type ItemProps = {
  destination: NavDestination;
  selected: boolean;
  onSelect: (destination: NavDestination) => void;
  onOpenSettings: () => void;
};

function NavItem({ destination, selected, onSelect, onOpenSettings }: ItemProps) {
  const theme = useAppTheme();
  // Animation légère (180 ms, pilote natif) : aucun impact sur la WebView.
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: selected ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [selected, progress]);

  const iconScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={destination.label}
      onPress={() => onSelect(destination)}
      // Appui long (n'importe où sur la barre) → réglages natifs. Le menu ne
      // s'affiche jamais en permanence : aucun espace vertical n'est consommé.
      onLongPress={onOpenSettings}
      delayLongPress={500}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.pillWrap}>
        <Animated.View
          style={[styles.pill, { backgroundColor: theme.primaryContainer, opacity: progress }]}
        />
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <MaterialCommunityIcons
            name={selected ? ICONS[destination.id].active : ICONS[destination.id].inactive}
            size={22}
            color={selected ? theme.onPrimaryContainer : theme.onSurfaceVariant}
          />
        </Animated.View>
      </View>

      {/*
        Les libellés sont TOUJOURS visibles (pas de comportement « hover ») et
        se réduisent automatiquement s'il manque de la place sur un petit écran :
        aucun libellé n'est tronqué ni renvoyé à la ligne.
      */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        allowFontScaling={false}
        style={[
          styles.label,
          {
            color: selected ? theme.onSurface : theme.onSurfaceVariant,
            fontWeight: selected ? "700" : "500",
          },
        ]}
      >
        {destination.label}
      </Text>
    </Pressable>
  );
}

type Props = {
  /** Onglet courant (`null` hors de l'espace connecté). */
  active: NavId | null;
  onSelect: (destination: NavDestination) => void;
  onOpenSettings: () => void;
};

/**
 * Barre de navigation native fixe (Material 3 NavigationBar).
 *
 * Elle est le SEUL élément affiché au-dessus de la WebView, ne défile jamais
 * avec le contenu, et respecte la zone système basse (gestures / boutons).
 */
export default function BottomNav({ active, onSelect, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: theme.surfaceContainer,
          borderTopColor: theme.outlineVariant,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.row}>
        {NAV_DESTINATIONS.map((destination) => (
          <NavItem
            key={destination.id}
            destination={destination}
            selected={active === destination.id}
            onSelect={onSelect}
            onOpenSettings={onOpenSettings}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  item: {
    flex: 1,
    minHeight: 56,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pillWrap: {
    width: 56,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: SHAPE.full,
  },
  label: {
    marginTop: 2,
    alignSelf: "stretch",
    textAlign: "center",
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: -0.2,
  },
});
