import i18n from "@/i18n";

// ============================================================================
// Gestion des erreurs : aucune erreur technique n'est montrée brute à
// l'utilisateur. Les messages Convex (ex: "CLIENT_PRO_ACCESS:...") sont
// détectés et traduits en messages compréhensibles.
// ============================================================================

export type FriendlyError =
  | "network"
  | "server"
  | "timeout"
  | "session"
  | "proAccess"
  | "unknown";

function detectKind(message: string): FriendlyError {
  if (/CLIENT_PRO_ACCESS:/.test(message)) return "proAccess";
  if (/UNAUTHENTICATED|token|session|expired/i.test(message)) return "session";
  if (/Failed to fetch|Network request failed|ENOTFOUND|ECONNREFUSED|NetworkError/i.test(message))
    return "network";
  if (/timeout|timed out/i.test(message)) return "timeout";
  if (/ConvexServerError|Server Error|Internal/i.test(message)) return "server";
  return "unknown";
}

export function friendlyMessage(err: unknown): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "unknown";
  const kind = detectKind(raw);
  const map: Record<FriendlyError, string> = {
    network: i18n.t("error.network"),
    server: i18n.t("error.server"),
    timeout: i18n.t("error.timeout"),
    session: i18n.t("error.session"),
    proAccess: i18n.t("error.proAccess"),
    unknown: i18n.t("error.unexpected"),
  };
  return map[kind];
}

export function friendlyKind(err: unknown): FriendlyError {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "unknown";
  return detectKind(raw);
}