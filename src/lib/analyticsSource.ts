// ============================================================================
// DÉTECTION DE LA SOURCE D'UNE VISITE
//
// Alimente le champ `source` des événements `expertAnalytics` / `supplierAnalytics`
// (« direct », « search », « social », « other ») utilisé par le graphique
// « Sources de trafic » des statistiques professionnelles.
//
// Aucune donnée n'est inventée : la source est déduite du référent réel du
// navigateur (annuaire interne → recherche, moteur externe → recherche,
// réseau social → social, aucune référence → accès direct).
// ============================================================================

export type AnalyticsSource = "direct" | "search" | "social" | "other";

/** Domaines des moteurs de recherche reconnus (suffixes). */
const SEARCH_DOMAINS = [
  "google.",
  "bing.com",
  "duckduckgo.com",
  "qwant.com",
  "ecosia.org",
  "search.brave.com",
  "yahoo.com",
  "yandex.",
  "baidu.com",
];

/** Domaines des réseaux sociaux reconnus (suffixes). */
const SOCIAL_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "whatsapp.com",
  "wa.me",
  "t.me",
  "telegram.org",
  "youtube.com",
  "pinterest.",
  "snapchat.com",
];

/** Chemins internes qui correspondent à une recherche dans l'annuaire. */
const DIRECTORY_PATHS = [
  "/dashboard/professionals-directory",
  "/dashboard/suppliers-directory",
  "/professionals",
  "/professionnels",
  "/pros",
];

function hostMatches(host: string, suffix: string): boolean {
  const h = host.toLowerCase();
  return h === suffix || h.endsWith(`.${suffix}`) || h.includes(suffix);
}

/**
 * Déduit la source d'un événement à partir du référent et de l'hôte courant.
 * `referrer` vide ou non parsable → « direct » (sauf hôte externe inconnu).
 */
export function detectEventSource({
  referrer,
  host,
}: {
  referrer?: string;
  host?: string;
}): AnalyticsSource {
  if (!referrer) return "direct";

  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return "other";
  }

  const refHost = url.hostname;

  // Même site : l'annuaire compte comme une recherche, le reste est direct.
  if (host && refHost === host.split(":")[0]) {
    return DIRECTORY_PATHS.some((p) => url.pathname.startsWith(p))
      ? "search"
      : "direct";
  }

  if (SEARCH_DOMAINS.some((d) => hostMatches(refHost, d))) return "search";
  if (SOCIAL_DOMAINS.some((d) => hostMatches(refHost, d))) return "social";
  return "other";
}

/** Source de la visite en cours (lit le référent du navigateur). */
export function currentEventSource(): AnalyticsSource {
  if (typeof document === "undefined") return "direct";
  return detectEventSource({
    referrer: document.referrer || undefined,
    host: typeof window !== "undefined" ? window.location.host : undefined,
  });
}
