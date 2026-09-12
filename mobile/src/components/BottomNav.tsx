import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NAV_DESTINATIONS, type NavDestination, type NavId } from "../config";
import { NAV_ICONS, NAV_STROKE } from "./icons";
import { SHAPE, useAppTheme } from "../theme";

/**
 * Barre de navigation inférieure NATIVE (Android).
 *
 * DESIGN : **capsule flottante** arrondie, posée sur une bande opaque.
 *
 *   - bande : pleine largeur, fond `theme.surface` — elle reste opaque, donc le
 *     contenu de la WebView n'apparaît jamais sous la capsule ;
 *   - capsule : coins très arrondis (`SHAPE.full`), fond `surfaceContainerHigh`,
 *     filet `outlineVariant` et ombre portée (`elevation 8`) qui la détachent du
 *     contenu web ;
 *   - 5 onglets de largeur égale : icône au-dessus, libellé en dessous ;
 *   - proportions COMPACTES : icônes 19 pt et libellés 10,5 pt (tailles
 *     volontairement réduites pour ne pas concurrencer le contenu web) ;
 *   - onglet ACTIF : icône et libellé en **émeraude BatiBuild** (`theme.primary`),
 *     trait légèrement épaissi et libellé en gras ; **aucun cercle ni pastille de
 *     fond** derrière l'onglet actif ;
 *   - onglets inactifs : icône et libellé en gris (`onSurfaceVariant`).
 *
 * Icônes : famille **lucide** (voir `icons.ts`), la MÊME que le tableau de bord
 * et le reste de la plateforme. Aucun mélange pleine/contour.
 *
 * Les libellés sont toujours visibles en entier (réduction automatique de la
 * taille sur très petit écran) et la barre reste compacte.
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
  // Le contraste de teinte porte l'état actif : émeraude de marque pour l'onglet
  // courant, gris pour les autres. Aucune pastille ni fond d'onglet n'est
  // dessiné.
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
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.65 }]}
    >
      <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
        <Icon
          size={19}
          color={color}
          strokeWidth={selected ? NAV_STROKE.active : NAV_STROKE.inactive}
        />
      </Animated.View>

      {/* Les libellés sont TOUJOURS visibles (pas de comportement « hover ») et
          se réduisent automatiquement s'il manque de la place sur un petit
          écran : aucun libellé n'est tronqué ni renvoyé à la ligne. */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.68}
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
          // Bande opaque : le contenu web ne se voit jamais dans cet espace.
          backgroundColor: theme.surface,
          // La capsule est simplement posée au-dessus de la zone système.
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View
        style={[
          styles.capsule,
          {
            backgroundColor: theme.surfaceContainerHigh,
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
    paddingTop: 6,
    paddingHorizontal: 12,
  },
  capsule: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: SHAPE.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 4,
    // Ombre portée : détache la capsule du contenu web, sans cadre lourd.
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  item: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 2,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 2,
    alignSelf: "stretch",
    textAlign: "center",
    fontSize: 10.5,
    lineHeight: 13,
  },
});
