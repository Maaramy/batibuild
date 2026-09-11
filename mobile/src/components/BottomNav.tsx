import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NAV_DESTINATIONS, type NavDestination, type NavId } from "../config";
import { NAV_ICONS, STROKE } from "./icons";
import { SHAPE, useAppTheme } from "../theme";

/**
 * Barre de navigation inférieure NATIVE (Android) — capsule flottante.
 *
 * Icônes : famille **lucide** (voir `icons.ts`), la MÊME que le tableau de bord
 * et le reste de la plateforme. Aucun mélange pleine/contour : l'état actif est
 * signalé par la couleur de marque, la graisse du libellé et une épaisseur de
 * trait légèrement supérieure — lisible en mode clair comme en mode sombre.
 *
 * Elle ne défile jamais avec le contenu de la WebView, reste au-dessus de la
 * zone système basse (gestes ou boutons) et ne recrée jamais la WebView au clic.
 */

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

  const iconScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const Icon = NAV_ICONS[destination.id];
  const color = selected ? theme.primary : theme.onSurfaceVariant;

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
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
        <Icon size={23} color={color} strokeWidth={selected ? STROKE.active : STROKE.inactive} />
      </Animated.View>

      {/* Les libellés sont TOUJOURS visibles (pas de comportement « hover ») et
          se réduisent automatiquement s'il manque de la place sur un petit
          écran : aucun libellé n'est tronqué ni renvoyé à la ligne. */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        allowFontScaling={false}
        style={[
          styles.label,
          {
            color,
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

export default function BottomNav({ active, onSelect, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.band,
        {
          backgroundColor: theme.surface,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View
        style={[
          styles.capsule,
          {
            // En clair : capsule blanche posée sur la page (ombre portée).
            // En sombre : une surface légèrement plus claire que la bande, car
            // une ombre ne se voit pas sur fond sombre (élévation Material 3).
            backgroundColor: theme.dark ? theme.surfaceContainer : theme.surface,
            borderColor: theme.outlineVariant,
          },
        ]}
      >
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
  band: {
    paddingTop: 8,
    paddingHorizontal: 14,
  },
  capsule: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: SHAPE.full,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    // Ombre douce : la barre semble posée sur la page (design flottant).
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  item: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 6,
    paddingHorizontal: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SHAPE.lg,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 3,
    alignSelf: "stretch",
    textAlign: "center",
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: -0.2,
  },
});
