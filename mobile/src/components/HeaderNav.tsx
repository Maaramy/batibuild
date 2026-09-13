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
 * FOND BLANC (demande explicite) : la barre est peinte en #FFFFFF et aucune
 * surface de couleur n'est appliquée aux onglets — ni au repos, ni à l'appui.
 *
 *   - les éléments gardent leur largeur naturelle (`flexShrink: 0`) : ils ne
 *     sont jamais coupés, tronqués ni déformés ;
 *   - dès que la rangée dépasse la largeur de l'écran, elle défile
 *     horizontalement — défilement natif (`ScrollView`), fluide sur Android et
 *     iPhone, avec verrouillage directionnel pour ne pas gêner le défilement
 *     vertical de la page ;
 *   - le FOND de la barre est BLANC (#FFFFFF) dans TOUS les états et dans les
 *     trois modes d'affichage (clair / sombre / système) : aucun onglet, aucun
 *     appui ne teinte la surface — voir `styles.root`, `styles.itemActive` et
 *     `styles.itemPressed`.
 *   - l'élément correspondant à la page COURANTE est mis en évidence par un
 *     **anneau émeraude** (`COLORS.brandRing`), une icône et un libellé en
 *     teinte de marque (`COLORS.brand700`) et un libellé en gras — sans
 *     remplir le fond ; les autres restent en gris ;
 *   - état pressé : léger retrait (opacité + échelle), SANS fond de couleur,
 *     pour que la barre reste parfaitement blanche ; aucun état « hover »
 *     (inutile au toucher).
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
      // Zone tactile élargie SANS agrandir la barre : la puce ne fait que
      // ~30 pt de haut, en dessous des 48 dp recommandés par Android. Aucun
      // `android_ripple` : la barre doit rester parfaitement blanche, y compris
      // à l'appui (le retour tactile est le léger retrait de `itemPressed`).
      hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
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
    // Barre TOUJOURS blanche (#FFFFFF), comme la barre supérieure native : un
    // seul chrome, identique en mode clair, sombre et système.
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
    // Anneau transparent par défaut : l'ajouter sur l'onglet actif ne décale
    // jamais la rangée (mêmes dimensions dans tous les états).
    borderWidth: 1,
    borderColor: "transparent",
  },
  itemActive: {
    // L'onglet actif se distingue par un anneau émeraude (`COLORS.brandRing`,
    // issu de `COLORS.brand`), l'icône et le libellé colorés (voir `NavItem`) :
    // aucune surface colorée dans la barre, dont le fond blanc vient de `root`.
    borderColor: COLORS.brandRing,
  },
  itemPressed: {
    // Aucun fond de couleur : le retour au toucher est un léger retrait, donc
    // la barre reste blanche même pendant l'appui.
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: 12,
  },
});
