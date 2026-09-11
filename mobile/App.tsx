import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import SplashScreenView from "./src/screens/SplashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import WebViewScreen from "./src/screens/WebViewScreen";
import { hasCompletedOnboarding, setOnboardingCompleted } from "./src/storage";
import { COLORS } from "./src/theme";

/**
 * Durée minimale du splash (1 à 2 s). Elle ne bloque jamais plus longtemps que
 * nécessaire : dès que l'initialisation ET cette durée sont terminées, on passe
 * à l'écran suivant. Aucun padding artificiel au-delà.
 */
const MIN_SPLASH_MS = 1200;

/**
 * Parcours mobile :
 *
 *   Splash → (Guide si première visite) → WebView
 *
 * La WebView démarre directement sur `/dashboard`, ce qui résout les deux cas
 * côté plateforme web : session valide → tableau de bord, sinon redirection
 * vers `/auth`. La page d'accueil publique ne fait jamais partie du parcours.
 */
type Phase = "splash" | "onboarding" | "webview";

const STAGES = [
  "Initialisation…",
  "Connexion à BatiBuild…",
  "Chargement de votre espace…",
] as const;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function App() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [status, setStatus] = useState<string>(STAGES[0]);

  useEffect(() => {
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Le splash React est visuellement identique au splash natif : on peut
    // masquer le natif immédiatement sans « flash » blanc.
    SplashScreen.hideAsync().catch(() => {});

    // Messages d'état réels : initialisation, puis session, puis espace.
    timers.push(
      setTimeout(() => {
        if (active) setStatus(STAGES[1]);
      }, 420),
    );
    timers.push(
      setTimeout(() => {
        if (active) setStatus(STAGES[2]);
      }, 850),
    );

    (async () => {
      const [done] = await Promise.all([hasCompletedOnboarding(), sleep(MIN_SPLASH_MS)]);
      if (active) setPhase(done ? "webview" : "onboarding");
    })();

    return () => {
      active = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  const handleOnboardingDone = useCallback(() => {
    // Persisté : le guide ne réapparaît plus aux lancements suivants.
    setOnboardingCompleted(true).then(() => setPhase("webview"));
  }, []);

  const handleShowGuide = useCallback(() => {
    // « Voir le guide » depuis les réglages : ne supprime aucune donnée.
    setStatus(STAGES[0]);
    setPhase("onboarding");
  }, []);

  const handleResetGuide = useCallback(() => {
    // Test uniquement : réaffiche le guide au prochain lancement.
    setOnboardingCompleted(false).then(() => {
      setStatus(STAGES[0]);
      setPhase("onboarding");
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        {phase === "splash" && <SplashScreenView status={status} />}
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
    backgroundColor: COLORS.brandDeep,
  },
});
