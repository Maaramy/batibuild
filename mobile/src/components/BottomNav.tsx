import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NAV_DESTINATIONS, type NavDestination, type NavId } from "../config";
import { NAV_ICONS, NAV_STROKE } from "./icons";
import { useAppTheme } from "../theme";

/**
 * Barre de navigation inférieure NATIVE (Android).
 *
 * DESIGN (maquette de référence) : barre PLATE pleine largeur, posée sur un fond
 * uni, sans capsule, sans coins arrondis, sans ombre et sans pastille active.
 *
 *   - fond : `theme.surface` (blanc en clair, surface sombre en sombre) ;
 *   - un simple filet de séparation en haut (`theme.outlineVariant`) : la page
 *     web étant blanche, ce filet est ce qui détache la barre du contenu (dans
 *     la maquette la séparation vient d'un fond gris autour de la barre) ;
 *   - 5 onglets de largeur égale : icône fine au-dessus, libellé en dessous ;
 *   - proportions COMPACTES : icônes 19 pt et libellés 10,5 pt (tailles
 *     volontairement réduites pour ne pas concurrencer le contenu web) ;
 *   - onglet ACTIF : icône et libellé en **émeraude BatiBuild** (`theme.primary`)
 *     et libellé en gras ;
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
  // dessiné — seule la structure reste celle de la maquette.
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
          backgroundColor: theme.surface,
          borderTopColor: theme.outlineVariant,
          // La barre est simplement posée au-dessus de la zone système.
          paddingBottom: Math.max(insets.bottom, 8),
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
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingTop: 6,
    // Filet de séparation : la barre se détache du contenu web, sans cadre ni
    // ombre (aucune bordure latérale, aucun coin arrondi).
    borderTopWidth: StyleSheet.hairlineWidth,
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
