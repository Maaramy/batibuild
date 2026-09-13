/**
 * Configuration centralisée de l'application mobile BatiBuild.
 *
 * SOURCE UNIQUE DE VÉRITÉ pour l'URL de la plateforme web chargée dans la
 * WebView. Ne jamais dupliquer cette URL ailleurs (app.json, composants, …).
 *
 * Pour changer d'environnement (dev / preview / prod), définir la variable
 * d'environnement EXPO_PUBLIC_WEB_APP_URL — aucune autre modification de code
 * n'est nécessaire.
 */

const DEFAULT_WEB_APP_URL = "https://budgetbati.freebuff.app/";

/** URL de la plateforme web chargée dans la WebView. */
export const WEB_APP_URL: string =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() || DEFAULT_WEB_APP_URL;

/** Origine de la plateforme (ex. `https://budgetbati.freebuff.app`), sans slash final. */
export const APP_ORIGIN: string = WEB_APP_URL.replace(/\/+$/, "");

/** Routes du parcours mobile (plateforme web). */
export const LOGIN_PATH = "/auth";
export const DASHBOARD_PATH = "/dashboard";

/**
 * Message de chargement unique (Splash natif et voile de chargement WebView).
 * Aucun autre texte ne doit être affiché sous ce message.
 */
export const LOADING_MESSAGE = "Chargement....";

/**
 * Durée MAXIMALE (1 seconde) de tout écran de chargement natif :
 *   - splash de démarrage ;
 *   - voile de chargement de la WebView ;
 *   - changement de page ou de menu depuis la barre de navigation.
 *
 * Aucun chargement ne dépasse cette borne : l'application affiche ensuite la
 * WebView avec son propre état de chargement, sans jamais rester bloquée.
 */
export const CHANGE_MAX_MS = 1000;

/**
 * Point d'entrée de la WebView.
 *
 * On démarre volontairement sur `/dashboard` et JAMAIS sur la page d'accueil
 * publique, car la plateforme web résout déjà les deux cas :
 *   - session valide  → le tableau de bord s'affiche directement ;
 *   - session absente → `RequireAuth` redirige vers `/auth?returnTo=/dashboard`.
 *
 * La page d'accueil marketing n'est donc jamais une étape du parcours mobile.
 */
export const ENTRY_URL: string = `${APP_ORIGIN}${DASHBOARD_PATH}`;

export function getHost(url: string): string {
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : "";
}

export const APP_HOST = getHost(WEB_APP_URL);

/**
 * Hôtes techniques de la plateforme qui doivent rester DANS la WebView.
 * Les endpoints d'authentification (Convex) sont sur `*.convex.site` /
 * `*.convex.cloud` : les ouvrir dans le navigateur casserait le login.
 */
const INTERNAL_HOST_SUFFIXES = [
  ".freebuff.app",
  ".convex.cloud",
  ".convex.site",
  ".convex.dev",
  ".convexusercontent.com",
];

/**
 * Une URL fait-elle partie de l'application BatiBuild (reste dans la WebView) ?
 * Même hôte, n'importe quel déploiement `*.freebuff.app` (aliases dev/preview/
 * prod) ou un domaine technique Convex.
 */
export function isAppUrl(url: string): boolean {
  const host = getHost(url);
  if (!host) return false;
  if (host === APP_HOST) return true;
  return INTERNAL_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/**
 * Chemin (+ query) d'une URL, sans l'origine ni le fragment.
 * Renvoie `""` pour les URLs non-web (`about:blank`, `data:`, …).
 */
export function pathOfUrl(url: string): string {
  const withoutOrigin = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i, "");
  if (!withoutOrigin.startsWith("/")) return "";
  return withoutOrigin.split("#")[0];
}

/** Chemin sans query — pratique pour comparer des routes. */
export function routeOfPath(path: string): string {
  return path.split("?")[0].replace(/\/+$/, "") || "/";
}

/** La route est-elle une page d'authentification ? */
export function isAuthRoute(path: string): boolean {
  const route = routeOfPath(path);
  return route === LOGIN_PATH || route === "/auth/password" || route.startsWith("/auth/");
}

/** La route est-elle la page d'accueil publique ? */
export function isLandingRoute(path: string): boolean {
  const route = routeOfPath(path);
  return route === "/" || route === "/index.html";
}

/* ------------------------------------------------------------------ *
 * Navigation native (barre de navigation inférieure)
 * ------------------------------------------------------------------ */

export type NavId =
  | "profile"
  | "projects"
  | "dashboard"
  | "investments"
  | "messages";

export type NavDestination = {
  id: NavId;
  /** Libellé toujours visible sous l'icône. */
  label: string;
  /** Route RÉELLE de la plateforme web (aucune URL inventée). */
  path: string;
};

/**
 * Les 5 sections de la barre de navigation inférieure, dans l'ordre imposé :
 * Profile · Projets · Home · ROI · Message.
 *
 * Les routes sont celles qui existent déjà dans le routeur de la plateforme
 * (`src/main.tsx`) : la navigation ne crée aucune page et ne duplique rien.
 *
 * « Projets » et « Home » pointent tous les deux vers `/dashboard` (la
 * plateforme n'expose qu'une seule route d'accueil connectée, qui contient la
 * liste des projets). L'onglet visuellement actif suit le dernier onglet
 * choisi lorsque la WebView est sur `/dashboard` — voir `WebViewScreen`.
 *
 * « ROI » ouvre l'analyse immobilière (`/dashboard/investments`) : c'est la
 * page qui calcule le retour sur investissement, le rendement, les scénarios et
 * le score IA. Son icône (`TrendingUp`) est EXACTEMENT celle de l'action
 * « Return on Investment » affichée sur la page Résultats coût de construction
 * (voir `icons.ts`).
 */
export const NAV_DESTINATIONS: readonly NavDestination[] = [
  { id: "profile", label: "Profile", path: "/dashboard/profile" },
  { id: "projects", label: "Projets", path: DASHBOARD_PATH },
  { id: "dashboard", label: "Home", path: DASHBOARD_PATH },
  { id: "investments", label: "ROI", path: "/dashboard/investments" },
  { id: "messages", label: "Message", path: "/dashboard/messages" },
] as const;

/** Routes atteignables directement depuis l'en-tête natif. */
export const SUPPORT_PATH = "/dashboard/support";
export const SETTINGS_PATH = "/dashboard/settings";

/** Route normalisée (sans query ni slash final). */
function routeKey(path: string): string {
  return routeOfPath(path).split("?")[0];
}

/** La route appartient-elle à la section (elle-même ou une sous-page) ? */
function inSection(path: string, base: string): boolean {
  return path === base || path.startsWith(base + "/");
}

/**
 * Onglet actif pour une route donnée.
 *
 * `/dashboard` est l'accueil de l'espace connecté : c'est l'onglet central
 * (« Home ») qui est actif par défaut. « Projets » pointe sur la même
 * route : c'est le dernier onglet choisi par l'utilisateur qui départage les
 * deux (voir `WebViewScreen`).
 *
 * La page Support n'est plus une entrée du menu de l'en-tête (elle est
 * accessible depuis les icônes de l'en-tête) : aucune entrée n'est active sur
 * cette page.
 * Renvoie `null` hors de l'espace connecté (écran de connexion).
 */
export function activeNavId(path: string): NavId | null {
  const route = routeKey(path);
  if (inSection(route, "/dashboard/profile")) return "profile";
  if (inSection(route, "/dashboard/investments")) return "investments";
  if (inSection(route, "/dashboard/messages")) return "messages";
  if (inSection(route, "/dashboard/support")) return null;
  if (route === routeKey(DASHBOARD_PATH)) return "dashboard";
  if (inSection(route, DASHBOARD_PATH)) return "projects";
  return null;
}

/**
 * Onglets qui partagent la route `/dashboard` : « Projets » et « Home ».
 * Utilisé pour savoir si le choix de l'utilisateur doit être mémorisé.
 */
export function isDashboardRoute(path: string): boolean {
  return routeKey(path) === routeKey(DASHBOARD_PATH);
}

/* ------------------------------------------------------------------ *
 * Affichage de la barre de navigation inférieure
 * ------------------------------------------------------------------ */

/**
 * La barre de navigation inférieure est affichée dans TOUT l'espace connecté
 * (`/dashboard` et ses sous-pages : profils, investissements, messagerie,
 * support, paramètres, résultats d'estimation du coût de construction,
 * résultats de l'analyse des matériaux IA…).
 *
 * Elle est rendue APRÈS la WebView dans la colonne racine (aucune position
 * absolue) : la WebView occupe exactement la hauteur restante, donc la barre ne
 * recouvre jamais le contenu de la page et aucun padding artificiel n'est
 * ajouté au contenu Web.
 *
 * Elle est masquée uniquement là où la navigation n'a pas de sens : écran de
 * connexion / inscription (`/auth`) et page d'accueil publique.
 *
 * Ce sont des routes RÉELLES de la plateforme (`src/main.tsx`) : aucune page
 * n'est créée, dupliquée ni modifiée — l'affichage est purement natif.
 */
export function shouldShowBottomNav(path: string): boolean {
  if (isAuthRoute(path) || isLandingRoute(path)) return false;
  return inSection(routeKey(path), routeKey(DASHBOARD_PATH));
}
