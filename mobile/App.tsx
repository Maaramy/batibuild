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

const MIN_SPLASH_MS = 1500;

type Phase = "splash" | "onboarding" | "webview";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function App() {
  const [phase, setPhase] = useState<Phase>("splash");

  useEffect(() => {
    let active = true;
    (async () => {
      // The React splash screen is visually identical to the native one, so we
      // can drop the native splash immediately and keep the branded screen
      // visible for the minimum display time while we check the onboarding flag.
      SplashScreen.hideAsync().catch(() => {});
      const [done] = await Promise.all([hasCompletedOnboarding(), sleep(MIN_SPLASH_MS)]);
      if (active) setPhase(done ? "webview" : "onboarding");
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleOnboardingDone = useCallback(() => {
    // Persisted: the guide won't reappear on next launches (until reinstall).
    setOnboardingCompleted(true).then(() => setPhase("webview"));
  }, []);

  const handleShowGuide = useCallback(() => {
    // "Voir le guide" from settings: re-runs onboarding WITHOUT clearing user data.
    setPhase("onboarding");
  }, []);

  const handleResetGuide = useCallback(() => {
    // Dev/test only: clears the persisted flag so the guide shows again on next launch.
    setOnboardingCompleted(false).then(() => setPhase("onboarding"));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        {phase === "splash" && <SplashScreenView />}
        {phase === "onboarding" && <OnboardingScreen onDone={handleOnboardingDone} />}
        {phase === "webview" && <WebViewScreen onShowGuide={handleShowGuide} onResetGuide={handleResetGuide} />}
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