import React from "react";
import { Image, StyleSheet, View } from "react-native";

/**
 * Logo OFFICIEL de la plateforme batibuild.
 *
 * C'est exactement le même dessin que sur le Web (`src/components/Logo.tsx` et
 * `public/logo.svg`) : un casque de chantier blanc dans une tuile émeraude
 * (#059669). L'asset `assets/logo.png` est la version haute définition de ce
 * logo — aucun logo n'est redessiné ni remplacé côté mobile.
 *
 * PÉRIMÈTRE : mobile uniquement.
 */

const LOGO_TILE = require("../../assets/logo.png");

type Props = {
  /** Côté de la tuile, en points. */
  size?: number;
  /** Rayon des coins, en proportion de `size` (identique au `rounded-xl` du Web). */
  radiusRatio?: number;
  /** Ombre portée (splash, chargement, erreur…). */
  shadow?: boolean;
};

/** Tuile du logo officiel, coins arrondis comme sur la plateforme Web. */
export function Logo({ size = 96, radiusRatio = 0.26, shadow = false }: Props) {
  const radius = size * radiusRatio;
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: radius }, shadow && styles.shadow]}>
      {/* Le clip applique les coins arrondis à l'image, sans masquer l'ombre. */}
      <View style={[styles.clip, { borderRadius: radius }]}>
        <Image source={LOGO_TILE} style={styles.image} resizeMode="cover" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: "#059669",
  },
  clip: {
    flex: 1,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  shadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
