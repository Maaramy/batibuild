import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const SESSION_KEY = "analytics_session_id";

function getOrCreateSessionId(): string {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

interface GeoData {
  country: string;
  city?: string;
  region?: string;
  lat?: number;
  lng?: number;
}

/** Try to get geo data from ip-api.com (free, no key needed) */
async function fetchGeoData(): Promise<GeoData> {
  try {
    const res = await fetch("http://ip-api.com/json/?fields=country,regionName,city,lat,lon", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("Geo fetch failed");
    const data = await res.json();
    return {
      country: data.country || "Unknown",
      city: data.city || undefined,
      region: data.regionName || undefined,
      lat: data.lat || undefined,
      lng: data.lon || undefined,
    };
  } catch {
    return { country: "Unknown" };
  }
}

/**
 * Tracks the current user's connection for analytics.
 * - On mount: fetches geo data and records the connection
 * - Every 30s: sends a heartbeat
 * - On unmark: marks the session as disconnected
 */
export function useConnectionTracker() {
  const trackConnection = useMutation(api.analytics.trackConnection);
  const sendHeartbeat = useMutation(api.analytics.heartbeat);
  const sendDisconnect = useMutation(api.analytics.disconnect);
  const geoRef = useRef<GeoData | null>(null);
  const sessionIdRef = useRef<string>("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const sessionId = getOrCreateSessionId();
    sessionIdRef.current = sessionId;

    const track = async () => {
      // Fetch geo data once (cached in ref)
      if (!geoRef.current) {
        geoRef.current = await fetchGeoData();
      }
      const geo = geoRef.current;
      if (!mountedRef.current) return;

      try {
        await trackConnection({
          sessionId,
          country: geo.country,
          city: geo.city,
          region: geo.region,
          lat: geo.lat,
          lng: geo.lng,
          userAgent: navigator.userAgent,
          page: window.location.pathname,
        });
      } catch {
        // Silently ignore tracking errors
      }
    };

    track();

    // Heartbeat interval
    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      sendHeartbeat({
        sessionId,
        page: window.location.pathname,
      }).catch(() => {});
    }, HEARTBEAT_INTERVAL);

    // Disconnect on unload
    const handleUnload = () => {
      sendDisconnect({ sessionId }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      sendDisconnect({ sessionId }).catch(() => {});
    };
  }, [trackConnection, sendHeartbeat, sendDisconnect]);
}
