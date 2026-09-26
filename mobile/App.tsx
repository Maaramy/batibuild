import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import SplashScreenView from "./src/screens/SplashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import WebViewScreen from "./src/screens/WebViewScreen";
import { CHANGE_MAX_MS } from "./src/config";
import { hasCompletedOnboarding, setOnboardingCompleted } from "./src/storage";
import { COLORS } from "./src/theme";

/**
 * Durée maximale du splash natif : 1 seconde, jamais plus (même borne que
 * toutes les pages et tous les menus — voir `CHANGE_MAX_MS`).
 *
 * Rien de lourd n'est fait avant l'affichage de la WebView : la seule opération
 * attendue est la lecture LOCALE du drapeau « guide déjà vu » (AsyncStorage),
 * qui dure quelques millisecondes. Aucun appel réseau, aucune attente de la
 * WebView, aucun délai artificiel au-delà de cette borne.
 */
const SPLASH_MAX_MS = CHANGE_MAX_MS;

/**
 * Parcours mobile (application Android) :
 *
 *   Splash (≤ 1 s, « Chargement.... »)
 *        ↓
 *   Guide « De l'idée à l'investissement » — 6 étapes de 4 s, automatiques
 *   (premier lancement uniquement, ou depuis « Voir le guide »)
 *        ↓
 *   WebView batibuild (login si aucune session, dashboard sinon)
 *
 * La WebView démarre directement sur `/dashboard` : session valide → tableau de
 * bord, sinon redirection vers `/auth`. La page d'accueil publique ne fait
 * jamais partie du parcours, et le splash ne bloque jamais sur le réseau.
 */
type Phase = "splash" | "onboarding" | "webview";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function App() {
  const [phase, setPhase] = useState<Phase>("splash");

  useEffect(() => {
    let active = true;

    // Le splash React est visuellement identique au splash natif : on peut
    // masquer le natif immédiatement sans « flash » blanc.
    SplashScreen.hideAsync().catch(() => {});

    // Aucune police d'icônes à charger : toutes les icônes de la coque native
    // sont des SVG lucide (`src/components/icons.ts`), et les illustrations des
    // guides sont des scènes vectorielles (`GuideIllustrations.tsx`) : rendues
    // immédiatement, identiques en mode clair comme en mode sombre, sans aucun
    // téléchargement d'image.

    (async () => {
      // Lecture locale + borne de 1 s, menées en parallèle.
      const [done] = await Promise.all([hasCompletedOnboarding(), sleep(SPLASH_MAX_MS)]);
      if (active) setPhase(done ? "webview" : "onboarding");
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleOnboardingDone = useCallback(() => {
    // Persisté (`onboardingCompleted = true`) : le guide ne réapparaît plus aux
    // lancements suivants (ni après une mise à jour de l'application).
    setOnboardingCompleted(true).then(() => setPhase("webview"));
  }, []);

  const handleShowGuide = useCallback(() => {
    // « Voir le guide » depuis les réglages : ne supprime aucune donnée.
    setPhase("onboarding");
  }, []);

  const handleResetGuide = useCallback(() => {
    // Test uniquement : réaffiche le guide au prochain lancement.
    setOnboardingCompleted(false).then(() => setPhase("onboarding"));
  }, []);

  return (
    <SafeAreaProvider>
      {/*
        Tout le chrome natif est blanc (chargement, guide et barre supérieure) :
        les icônes de la barre système sont donc toujours sombres.
      */}
      <StatusBar style="dark" />
      <View style={styles.root}>
        {phase === "splash" && <SplashScreenView />}
        {phase === "onboarding" && <OnboardingScreen onDone={handleOnboardingDone} />}
        {phase === "webview" && (
          <WebViewScreen onShowGuide={handleShowGuide} onResetGuide={handleResetGuide} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Fond de chargement blanc (aucun flash sombre au démarrage).
    backgroundColor: COLORS.white,
  },
});
