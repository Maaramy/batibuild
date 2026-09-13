import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { NAV_DESTINATIONS, type NavDestination, type NavId } from "../config";
import { NAV_ICONS, NAV_STROKE } from "./icons";
import { COLORS, SHAPE } from "../theme";

/**
 * MENU DE NAVIGATION DE L'EN-TÊTE (application Android).
 *
 * Remplace l'ancienne barre de navigation inférieure : les mêmes sections
 * (Profile · Projets · Home · ROI · Message), les mêmes routes, les mêmes
 * icônes — mais dans l'en-tête, sous forme de **menu horizontal scrollable**.
 *
 *   - les éléments gardent leur largeur naturelle (`flexShrink: 0`) : ils ne
 *     sont jamais coupés, tronqués ni déformés ;
 *   - dès que la rangée dépasse la largeur de l'écran, elle défile
 *     horizontalement — défilement natif (`ScrollView`), fluide sur Android et
 *     iPhone, avec verrouillage directionnel pour ne pas gêner le défilement
 *     vertical de la page ;
 *   - l'élément correspondant à la page COURANTE est mis en évidence (fond
 *     `primaryContainer` émeraude + libellé et icône en teinte de marque,
 *     libellé en gras) ; les autres restent en gris ;
 *   - état pressé : léger voile neutre + réduction (comme les boutons de la
 *     barre supérieure) ; aucun état « hover » (inutile au toucher).
 *
 * Le menu ne fait que demander un changement de route à la WebView
 * (`onSelect`) : aucune page n'est créée, aucune logique métier n'est touchée.
 */

type ItemProps = {
  destination: NavDestination;
  selected: boolean;
  onSelect: (destination: NavDestination) => void;
  onOpenSettings: () => void;
};

function NavItem({ destination, selected, onSelect, onOpenSettings }: ItemProps) {
  const Icon = NAV_ICONS[destination.id];
  const color = selected ? COLORS.brand700 : COLORS.inkSoft;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={destination.label}
      onPress={() => onSelect(destination)}
      // Appui long (n'importe où sur le menu) → réglages natifs, comme avant.
      onLongPress={onOpenSettings}
      delayLongPress={500}
      style={({ pressed }) => [
        styles.item,
        selected && styles.itemActive,
        pressed && styles.itemPressed,
      ]}
    >
      <Icon size={15} color={color} strokeWidth={selected ? NAV_STROKE.active : NAV_STROKE.inactive} />
      <Text numberOfLines={1} style={[styles.label, { color, fontWeight: selected ? "700" : "500" }]}>
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

export default function HeaderNav({ active, onSelect, onOpenSettings }: Props) {
  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Défilement fluide et naturel, sans rebond élastique en fin de liste.
        bounces={false}
        alwaysBounceHorizontal={false}
        // N'intercepte que les gestes horizontaux : le défilement vertical de
        // la page (WebView) reste parfaitement fluide.
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // Même surface blanche que la barre supérieure native : un seul chrome.
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  item: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SHAPE.full,
  },
  itemActive: {
    // Teinte de marque, cohérente avec les onglets et les boutons actifs de la
    // plateforme (mêmes teintes que le mode clair : la barre reste blanche).
    backgroundColor: COLORS.accentSoft,
  },
  itemPressed: {
    // Voile neutre : lisible sur le fond blanc, quel que soit le mode système.
    backgroundColor: "rgba(15,23,42,0.06)",
  },
  label: {
    fontSize: 12,
  },
});
