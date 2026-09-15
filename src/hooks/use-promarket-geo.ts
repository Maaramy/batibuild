import { useCallback, useState } from "react";

// ============================================================================
// ProMarket — géolocalisation (autorisation explicite, jamais bloquante)
//
// La position n'est demandée qu'au clic de l'utilisateur. En cas de refus,
// ProMarket reste entièrement utilisable (sélection manuelle du gouvernorat).
// ============================================================================

export type GeoStatus = "idle" | "loading" | "ready" | "denied" | "unsupported";

export function useProMarketGeo() {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: Number(position.coords.latitude.toFixed(4)),
          lng: Number(position.coords.longitude.toFixed(4)),
        });
        setStatus("ready");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setStatus("idle");
  }, []);

  return { status, coords, request, clear };
}
