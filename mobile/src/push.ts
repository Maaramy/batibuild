import { NativeModules, Platform } from "react-native";

/**
 * Accès au module natif Android `BatibuildPush`.
 *
 * Sur iOS / développement sans build natif, tout est inerte : l'application
 * fonctionne exactement comme avant (aucune erreur, aucune promesse rejetée).
 */
export type PushPermission = "granted" | "denied" | "default";

export type PushState = {
  token: string | null;
  permission: PushPermission;
  deviceId: string | null;
  platform: "android";
  /** Firebase réellement configuré dans cet APK (google-services.json). */
  configured: boolean;
};

type NativePushModule = {
  getState(): Promise<{
    token?: string | null;
    permission?: string;
    deviceId?: string | null;
    configured?: boolean;
  }>;
  fetchToken(): Promise<string | null>;
  requestPermission(): Promise<string>;
  consumePendingUrl(): Promise<{ url?: string | null; logToken?: string | null }>;
  openNotificationSettings(): Promise<boolean>;
};

const native: NativePushModule | undefined =
  Platform.OS === "android" ? (NativeModules.BatibuildPush as NativePushModule | undefined) : undefined;

export function pushNativeAvailable(): boolean {
  return !!native;
}

function normalizePermission(value: string | undefined): PushPermission {
  if (value === "granted" || value === "denied") return value;
  return "default";
}

/** État courant (token conservé nativement, autorisation système, appareil). */
export async function readPushState(): Promise<PushState | null> {
  if (!native) return null;
  try {
    const state = await native.getState();
    return {
      token: state.token ?? null,
      permission: normalizePermission(state.permission),
      deviceId: state.deviceId ?? null,
      platform: "android",
      configured: state.configured === true,
    };
  } catch {
    return null;
  }
}

/** Récupère / rafraîchit le token FCM auprès de Firebase puis relit l'état. */
export async function refreshPushToken(): Promise<PushState | null> {
  if (!native) return null;
  try {
    await native.fetchToken();
  } catch {
    // Firebase non configuré : on garde l'état local.
  }
  return readPushState();
}

export async function requestPushPermission(): Promise<PushPermission> {
  if (!native) return "denied";
  try {
    return normalizePermission(await native.requestPermission());
  } catch {
    return "denied";
  }
}

/** Route et jeton de la notification qui vient d'ouvrir l'application. */
export async function consumePendingPush(): Promise<{
  url: string | null;
  logToken: string | null;
}> {
  if (!native) return { url: null, logToken: null };
  try {
    const result = await native.consumePendingUrl();
    return { url: result.url ?? null, logToken: result.logToken ?? null };
  } catch {
    return { url: null, logToken: null };
  }
}

export async function openNotificationSettings(): Promise<void> {
  try {
    await native?.openNotificationSettings();
  } catch {
    // Ignoré : l'utilisateur peut passer par les réglages Android.
  }
}
