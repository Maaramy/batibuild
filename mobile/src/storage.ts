import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "hasCompletedOnboarding";

/** True once the user has seen the guide on this installation. */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === "true";
  } catch {
    return false;
  }
}

/** Persist the guide completion state (kept across app updates, cleared on reinstall). */
export async function setOnboardingCompleted(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, value ? "true" : "false");
  } catch {
    // Non-fatal: a storage failure only means the guide shows again next launch.
  }
}