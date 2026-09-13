import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Suivi de session temps réel (analytique Admin).
 *
 * - Ouvre/actualise une session `connectionLogs` une fois authentifié, puis à
 *   chaque changement de page ;
 * - Heartbeat toutes les 45 s (fenêtre "en ligne" serveur : 2 min) ;
 * - Marque la session déconnectée au déchargement de la page.
 *
 * Données envoyées strictement anonymes : identifiant de session aléatoire
 * (sessionStorage), page courante, localisation approximative déduite du
 * fuseau horaire. Aucune donnée personnelle.
 */

const HEARTBEAT_MS = 45_000;

// Correspondance fuseau horaire → pays (fallback sans service externe).
const TZ_COUNTRY: Record<string, string> = {
  "Africa/Tunis": "Tunisia",
  "Europe/Paris": "France",
  "Africa/Algiers": "Algeria",
  "Africa/Casablanca": "Morocco",
  "Africa/Tripoli": "Libya",
  "Europe/Rome": "Italy",
  "Europe/Berlin": "Germany",
  "Europe/Madrid": "Spain",
  "Europe/Brussels": "Belgium",
  "Europe/Zurich": "Switzerland",
  "Europe/London": "United Kingdom",
  "Europe/Amsterdam": "Netherlands",
  "Europe/Istanbul": "Turkey",
  "Africa/Cairo": "Egypt",
  "Asia/Riyadh": "Saudi Arabia",
  "America/New_York": "United States",
  "America/Toronto": "Canada",
};

function getStoredSessionId(): string {
  try {
    let id = sessionStorage.getItem("bb_analytics_session");
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("bb_analytics_session", id);
    }
    return id;
  } catch {
    return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }
}

function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_COUNTRY[tz] ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

/** À monter une fois, sous ConvexAuthProvider. Sans effet si non connecté. */
export function useSessionTracking() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const track = useMutation(api.analytics.trackConnection);
  const heartbeat = useMutation(api.analytics.heartbeat);
  const disconnect = useMutation(api.analytics.disconnect);

  const sessionId = useRef<string>("");
  const country = useRef<string>("Unknown");

  // Session : ouverture (première page vue après auth) + à chaque navigation
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    if (!sessionId.current) {
      sessionId.current = getStoredSessionId();
      country.current = detectCountry();
    }

    track({
      sessionId: sessionId.current,
      country: country.current,
      page: location.pathname,
      userAgent: navigator.userAgent.slice(0, 300),
    }).catch(() => {
      /* silencieux : l'analytique ne doit jamais casser l'UX */
    });
  }, [isAuthenticated, isLoading, location.pathname, track]);

  // Heartbeat : maintient la session "en ligne" pendant toute la vie de l'onglet
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    if (!sessionId.current) {
      sessionId.current = getStoredSessionId();
      country.current = detectCountry();
    }
    const sid = sessionId.current;

    const interval = window.setInterval(() => {
      heartbeat({ sessionId: sid, page: window.location.pathname }).catch(() => {});
    }, HEARTBEAT_MS);

    const onLeave = () => {
      disconnect({ sessionId: sid }).catch(() => {});
    };
    window.addEventListener("pagehide", onLeave);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [isAuthenticated, isLoading, heartbeat, disconnect]);
}
