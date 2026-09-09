import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// ============================================================================
// Local persistence (offline support)
//  - Préférences (thème, langue) : AsyncStorage
//  - Brouillons de projet : AsyncStorage (JSON)
//  - Données sensibles (si besoin) : SecureStore (Keychain / Keystore)
// La synchronisation avec le backend se fait via Convex dès que la
// connexion est disponible (les brouillons sont poussés vers
// api.projects.createProject puis supprimés localement).
// ============================================================================

export const KEYS = {
  theme: "budgetbati-mobile-theme",
  language: "budgetbati-mobile-lang",
  projectDrafts: "budgetbati-mobile-drafts",
  lastEstimate: "budgetbati-mobile-last-estimate",
  notificationsEnabled: "budgetbati-mobile-notif",
} as const;

export interface DraftProject {
  id: string; // uuid local
  name: string;
  category: string;
  region?: string;
  surface?: number;
  floors?: number;
  description?: string;
  createdAt: number;
  syncedProjectId?: string;
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage plein ou indisponible — on ignore
  }
}

export async function getDrafts(): Promise<DraftProject[]> {
  return (await readJson<DraftProject[]>(KEYS.projectDrafts)) ?? [];
}

export async function saveDraft(draft: DraftProject): Promise<void> {
  const drafts = await getDrafts();
  const idx = drafts.findIndex((d) => d.id === draft.id);
  if (idx >= 0) drafts[idx] = draft;
  else drafts.push(draft);
  await writeJson(KEYS.projectDrafts, drafts);
}

export async function removeDraft(id: string): Promise<void> {
  const drafts = await getDrafts();
  await writeJson(
    KEYS.projectDrafts,
    drafts.filter((d) => d.id !== id),
  );
}

export async function saveLastEstimate(payload: unknown): Promise<void> {
  await writeJson(KEYS.lastEstimate, payload);
}

export async function getLastEstimate<T>(): Promise<T | null> {
  return readJson<T>(KEYS.lastEstimate);
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.notificationsEnabled, String(enabled));
  } catch {
    // ignore
  }
}

export async function isNotificationsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.notificationsEnabled)) !== "false";
  } catch {
    return true;
  }
}

// Secure storage (tokens / données sensibles) — prêt pour l'usage futur.
export async function secureSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}
export async function secureGet(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}
export async function secureDelete(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}