import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Stockage local PERSISTANT de l'application mobile Android.
 *
 * `onboardingCompleted` mémorise que le guide de démarrage (6 étapes) a été
 * vu : il n'est donc affiché qu'au premier
 * lancement de l'installation. La valeur survit aux mises à jour de
 * l'application et est effacée à la réinstallation.
 *
 * Aucune donnée métier n'est stockée ici : uniquement l'état du guide.
 */
const ONBOARDING_KEY = "onboardingCompleted";

/** Le guide de démarrage a-t-il déjà été vu sur cette installation ? */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === "true";
  } catch {
    return false;
  }
}

/** Mémorise (ou réinitialise) l'état du guide de démarrage. */
export async function setOnboardingCompleted(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, value ? "true" : "false");
  } catch {
    // Non bloquant : en cas d'échec, le guide réapparaîtra au prochain lancement.
  }
}
