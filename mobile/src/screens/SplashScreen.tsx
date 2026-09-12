import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "../components/Logo";
import { LOADING_MESSAGE } from "../config";
import { COLORS } from "../theme";

/**
 * Splash MINIMAL de l'application mobile BatiBuild.
 *
 * Volontairement réduit au strict nécessaire : le logo OFFICIEL Batibuild sur
 * fond blanc, un indicateur discret et un seul texte — « Chargement.... ».
 * Aucun slogan, aucun écran de présentation, aucune ancienne image : les
 * anciens splash et écrans d'introduction ont été supprimés.
 *
 * Sa durée maximale est décidée dans `App.tsx` (1 seconde, jamais plus) : cet
 * écran ne bloque JAMAIS le démarrage et n'attend ni le réseau ni la WebView.
 *
 * PÉRIMÈTRE : mobile uniquement.
 */
export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;

  // Apparition douce — courte et non bloquante.
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 28) },
      ]}
    >
      <Animated.View style={[styles.center, { opacity: fade }]}>
        <Logo size={104} shadow />
      </Animated.View>

      <View style={styles.footer}>
        <ActivityIndicator color={COLORS.brand} size="small" />
        <Text style={styles.status}>{LOADING_MESSAGE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fond de chargement BLANC (identique en mode clair et en mode sombre) : le
  // logo officiel reste parfaitement lisible.
  root: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 44,
    alignItems: "center",
  },
  status: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.inkSoft,
    letterSpacing: 0.2,
  },
});
