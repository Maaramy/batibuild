import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "../components/Logo";
import { BRAND_NAME, BRAND_TAGLINE, LOADING_MESSAGE } from "../config";
import { COLORS } from "../theme";

/**
 * Splash de l'application mobile batibuild.
 *
 * Contenu, dans cet ordre : le logo OFFICIEL batibuild (aucun logo redessiné),
 * le nom de la plateforme, puis le message de bienvenue
 * « De votre idée à la réalisation de votre projet ». Un seul texte technique
 * complète l'écran, « Chargement… », avec son indicateur.
 *
 * Sa durée maximale est décidée dans `App.tsx` (1 seconde, jamais plus) : cet
 * écran ne bloque JAMAIS le démarrage et n'attend ni le réseau ni la WebView.
 * Aucune page d'accueil supplémentaire n'est ajoutée après le splash.
 *
 * PÉRIMÈTRE : mobile uniquement.
 */
export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  // Apparition douce (fondu + très léger zoom) — courte et non bloquante.
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 28) },
      ]}
    >
      <Animated.View
        style={[
          styles.center,
          {
            opacity: fade,
            transform: [
              {
                scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
              },
            ],
          },
        ]}
      >
        <Logo size={104} shadow />
        <Text style={styles.name} accessibilityRole="header">
          {BRAND_NAME}
        </Text>
        <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
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
    paddingHorizontal: 32,
  },
  name: {
    marginTop: 20,
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: COLORS.ink,
  },
  tagline: {
    marginTop: 8,
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: COLORS.inkSoft,
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
