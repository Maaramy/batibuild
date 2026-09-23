import React from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * PASTILLE DE NOTIFICATION RÉUTILISABLE — coque native Android.
 *
 * Composant unique, utilisé par la barre de navigation inférieure (icône
 * « Messagerie ») — et réutilisable par tout autre écran qui afficherait un
 * compteur (aucune logique dupliquée).
 *
 *   - **rouge** : fond rouge vif, texte BLANC, lisible en mode clair comme en
 *     mode sombre (la barre native est toujours blanche, la pastille est donc
 *     également cerclée de blanc pour rester nette par-dessus l'icône) ;
 *   - **petite et bien visible** : pastille compacte de 16 pt minimum,
 *     positionnée en HAUT À DROITE de l'icône, sans jamais déplacer les autres
 *     icônes (positionnement absolu, emplacement réservé) ;
 *   - **plafonnée à 99+** : au-delà de 99 messages non lus, le texte affiché
 *     devient « 99+ » (la pastille s'élargit, la barre ne se décale pas) ;
 *   - **aucun faux compteur** : un compteur nul, absent ou non numérique ne
 *     rend RIEN du tout (jamais de badge « 0 »).
 *
 * La taille de police est fixe (`allowFontScaling={false}`) : sur les écrans
 * Android très petits ou avec une police système agrandie, la pastille reste
 * parfaitement lisible sans casser la mise en page de la barre.
 */

/** Au-delà de ce nombre, la pastille affiche « 99+ ». */
export const BADGE_MAX = 99;

/**
 * Libellé de la pastille : `"3"`, `"99+"`… ou `null` quand aucun badge ne doit
 * être affiché (0, valeur absente ou invalide).
 */
export function badgeLabel(count: number | null | undefined): string | null {
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) return null;
  return count > BADGE_MAX ? `${BADGE_MAX}+` : String(Math.floor(count));
}

/** Fond rouge de la pastille (identique en mode clair et sombre). */
const BADGE_RED = "#E11D48";

export default function NavBadge({ count }: { count?: number | null }) {
  const label = badgeLabel(count);
  if (!label) return null;

  return (
    <View style={[styles.badge, label.length > 2 && styles.badgeWide]} pointerEvents="none">
      <Text style={styles.text} numberOfLines={1} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BADGE_RED,
    // Cerclage blanc : lisibilité maximale sur la barre native blanche et
    // détachement net de l'icône, en mode clair comme en mode sombre.
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    elevation: 3,
  },
  badgeWide: {
    minWidth: 22,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    lineHeight: 12,
  },
});
