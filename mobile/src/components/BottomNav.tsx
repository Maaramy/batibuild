import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NAV_DESTINATIONS, type NavDestination, type NavId } from "../config";
import { NAV_ICONS, NAV_STROKE } from "./icons";
import NavBadge from "./NavBadge";
import { COLORS, SHAPE } from "../theme";

/**
 * BARRE DE NAVIGATION INFÉRIEURE (application Android).
 *
 * Elle remplace le menu horizontal qui avait été placé dans l'en-tête : mêmes
 * sections (Profile · Mes projets · Home · Rapport · Message), mêmes routes,
 * mêmes icônes — mais dans une **barre fixe en bas de l'écran**, comme dans les
 * versions précédentes de l'application.
 *
 * « Rapport » remplace l'ancien onglet « ROI » : il ouvre la page existante
 * **Rapports PDF** (`/dashboard/reports`) avec l'icône document/téléchargement
 * (`FileDown`), identique à l'entrée « Rapports PDF » de la plateforme. Aucun
 * libellé « ROI » n'est plus affiché dans le menu mobile.
 *
 *   - **fixe en bas de l'écran** : elle est rendue APRÈS la WebView dans la
 *     colonne racine (et non en position absolue). Elle ne recouvre donc
 *     JAMAIS le contenu : la WebView occupe exactement la hauteur restante.
 *     Aucun padding artificiel n'est injecté dans la page Web.
 *   - **safe area** : la zone système basse (barre de navigation Android,
 *     gestes, encoche) est ajoutée en `paddingBottom` (`useSafeAreaInsets`) ;
 *     un minimum de 6 pt garantit une barre confortable sur les appareils sans
 *     inset bas.
 *   - **responsive** : chaque onglet fait `flex: 1` — la barre s'adapte à
 *     toutes les largeurs (petit téléphone, grand écran, tablette, paysage)
 *     sans débordement horizontal ; les libellés sont tronqués proprement
 *     (`numberOfLines={1}`) plutôt que de casser la mise en page.
 *   - **élément actif clairement identifié** : icône et libellé en teinte de
 *     marque, libellé en gras, et un **indicateur** émeraude au-dessus de
 *     l'icône. L'emplacement de l'indicateur est réservé sur TOUS les onglets
 *     (transparent) : la barre ne se décale jamais quand on change de section.
 *   - **états** : appui = légère atténuation (aucun fond de couleur) ; pas
 *     d'état « hover » (inutile au toucher) ; appui long → réglages natifs,
 *     comme avant.
 *
 * Elle ne fait que demander un changement de route à la WebView (`onSelect`) :
 * aucune page n'est créée, aucune logique métier n'est touchée. Le fond de la
 * barre est BLANC (#FFFFFF) — c'est le chrome natif de l'application,
 * indépendant du thème de la plateforme Web.
 *
 * PASTILLE ROUGE : chaque onglet peut recevoir un compteur non lu via `badges`
 * (en pratique, l'onglet « Messagerie »). Le compteur vient du SERVEUR — il est
 * publié par la page Web chargée dans la WebView, à partir de la requête Convex
 * temps réel (`api.messaging.unreadCount`, voir `MessagingBadgeSync`), puis
 * affiché par le composant réutilisable `NavBadge` (« 99+ » au-delà de 99, rien
 * du tout à 0). Le badge est posé en absolu au-dessus de l'icône : il ne
 * déplace jamais les autres icônes, quelle que soit la taille de l'écran.
 */

type ItemProps = {
  destination: NavDestination;
  selected: boolean;
  unreadCount?: number;
  onSelect: (destination: NavDestination) => void;
  onOpenSettings: () => void;
};

function NavItem({
  destination,
  selected,
  unreadCount,
  onSelect,
  onOpenSettings,
}: ItemProps) {
  const Icon = NAV_ICONS[destination.id];
  const color = selected ? COLORS.brand700 : COLORS.muted;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={destination.label}
      onPress={() => onSelect(destination)}
      // Appui long (n'importe où sur la barre) → réglages natifs, comme avant.
      onLongPress={onOpenSettings}
      delayLongPress={500}
      // Cible tactile élargie sans agrandir la barre (recommandation Android).
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      {/* Emplacement réservé sur tous les onglets : aucun décalage à la sélection. */}
      <View style={[styles.indicator, selected && styles.indicatorActive]} />
      {/* L'icône et sa pastille partagent le même conteneur : la pastille se
          place en haut à droite de l'icône sans agrandir la barre. */}
      <View style={styles.iconWrap}>
        <Icon
          size={19}
          color={color}
          strokeWidth={selected ? NAV_STROKE.active : NAV_STROKE.inactive}
        />
        <NavBadge count={unreadCount} />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.label, { color, fontWeight: selected ? "700" : "500" }]}
      >
        {destination.label}
      </Text>
    </Pressable>
  );
}

type Props = {
  /** Onglet courant (`null` hors de l'espace connecté). */
  active: NavId | null;
  /**
   * Compteurs non lus par onglet (issus du serveur). Un compteur nul ou absent
   * n'affiche aucune pastille.
   */
  badges?: Partial<Record<NavId, number>>;
  onSelect: (destination: NavDestination) => void;
  onOpenSettings: () => void;
};

export default function BottomNav({ active, badges, onSelect, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.root, { paddingBottom: Math.max(insets.bottom, 6) }]}
    >
      {NAV_DESTINATIONS.map((destination) => (
        <NavItem
          key={destination.id}
          destination={destination}
          selected={active === destination.id}
          unreadCount={badges?.[destination.id]}
          onSelect={onSelect}
          onOpenSettings={onOpenSettings}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "stretch",
    // Barre native toujours blanche (chrome de l'application).
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.line,
    paddingTop: 6,
    // Séparation discrète avec le contenu : la barre reste plate et lisible.
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  tab: {
    // Largeur partagée à parts égales : aucun débordement, toutes tailles d'écran.
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    borderRadius: SHAPE.sm,
  },
  tabPressed: {
    opacity: 0.6,
  },
  iconWrap: {
    // Conteneur de l'icône : la pastille (absolue) s'ancre ici, sans décaler
    // les autres onglets ni modifier la hauteur de la barre.
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  indicatorActive: {
    backgroundColor: COLORS.brand,
  },
  label: {
    marginTop: 3,
    fontSize: 10.5,
  },
});
