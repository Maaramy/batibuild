// ============================================================================
// PONT PUSH — application Android (coque WebView) → plateforme Web
// ----------------------------------------------------------------------------
// La coque native lit le token FCM et l'autorisation système, puis les publie
// dans `window.__BATIBUILD_PUSH__` (et via l'événement `batibuild:push`).
// La plateforme enregistre ce token auprès de Convex une fois l'utilisateur
// connecté. Le token n'est jamais placé dans l'URL, ni dans un cookie, ni
// exposé par une clé Firebase : la clé privée reste côté backend.
// ============================================================================

export type PushPermission = "granted" | "denied" | "default";

export type PushContext = {
  token: string | null;
  permission: PushPermission;
  deviceId?: string | null;
  platform?: string;
  /** Destination de la notification qui a ouvert l'application. */
  url?: string | null;
  /** Jeton opaque de la notification qui a ouvert l'application. */
  logToken?: string | null;
};

/** Clé de session : clic en attente de la destination réellement ouverte. */
export const PUSH_CLICK_STORAGE_KEY = "batibuild_push_click";

export function readPushContext(): PushContext | null {
  if (typeof window === "undefined") return null;
  const raw = (window as unknown as { __BATIBUILD_PUSH__?: unknown }).__BATIBUILD_PUSH__;
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const permission = value.permission;
  return {
    token: typeof value.token === "string" && value.token ? value.token : null,
    permission:
      permission === "granted" || permission === "denied" ? permission : "default",
    deviceId: typeof value.deviceId === "string" ? value.deviceId : null,
    platform: typeof value.platform === "string" ? value.platform : "android",
    url: typeof value.url === "string" && value.url ? value.url : null,
    logToken: typeof value.logToken === "string" && value.logToken ? value.logToken : null,
  };
}

/** S'abonne aux mises à jour publiées par la coque native. */
export function subscribePushContext(listener: (context: PushContext) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    const context = readPushContext();
    if (context) listener(context);
  };
  window.addEventListener("batibuild:push", handler);
  return () => window.removeEventListener("batibuild:push", handler);
}

type PendingClick = { token: string; path: string; at: number };

export function rememberPendingPushClick(token: string, path: string) {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingClick = { token, path, at: Date.now() };
    window.sessionStorage.setItem(PUSH_CLICK_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Stockage indisponible : le clic ne sera pas attribué, jamais inventé.
  }
}

export function takePendingPushClick(pathname: string, search: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PUSH_CLICK_STORAGE_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingClick;
    if (!pending?.token || typeof pending.path !== "string") return null;
    // Expire au bout de 10 minutes : aucune attribution tardive.
    if (Date.now() - (pending.at ?? 0) > 10 * 60_000) {
      window.sessionStorage.removeItem(PUSH_CLICK_STORAGE_KEY);
      return null;
    }
    const target = pending.path.split("?")[0].split("#")[0];
    const current = pathname.split("?")[0];
    const reached = current === target || target.startsWith(`${current}/`);
    if (!reached) return null;
    window.sessionStorage.removeItem(PUSH_CLICK_STORAGE_KEY);
    void search;
    return pending.token;
  } catch {
    return null;
  }
}

/** Chemin interne (avec query) d'une destination de notification. */
export function pushDestinationPath(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("/")) return value.startsWith("//") ? null : value;
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
