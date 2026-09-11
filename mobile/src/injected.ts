/**
 * Scripts injectés dans la WebView BatiBuild.
 *
 * Ils tournent AVANT le contenu (injectedJavaScriptBeforeContentLoaded) ou
 * juste après le chargement. Aucun ne modifie la logique métier de la
 * plateforme : ils ne font que normaliser la navigation côté mobile.
 */

/**
 * Navigation SPA depuis la barre de navigation native.
 *
 * La WebView n'est JAMAIS rechargée : on pousse simplement la route dans
 * l'historique du routeur existant (React Router) et on notifie le routeur via
 * `popstate`. Conséquence : session, cookies, `localStorage`, état et position
 * de défilement sont conservés, et le bouton Back Android continue de
 * fonctionner normalement.
 *
 * Si le routeur ignore le changement d'historique (cas rare), on retombe sur
 * une navigation classique — toujours à l'intérieur de la WebView car la route
 * appartient à la plateforme.
 */
export function navigateScript(path: string): string {
  const target = JSON.stringify(path);
  return `
(function () {
  try {
    var to = ${target};
    var query = to.indexOf("?");
    var route = query === -1 ? to : to.slice(0, query);

    // Déjà sur place : ne rien faire (aucun rechargement, aucune entrée).
    if (window.location.pathname === route) return true;

    var before = window.location.pathname + window.location.search;

    window.history.pushState(null, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));

    // Repli UNIQUEMENT si le routeur n'a pas réagi : si l'URL a changé (route
    // affichée, ou redirection volontaire du garde d'entrée vers /auth), on ne
    // force surtout pas une navigation complète.
    window.setTimeout(function () {
      var now = window.location.pathname + window.location.search;
      if (now === before && now !== to) {
        try { window.location.assign(to); } catch (e) {}
      }
    }, 350);
  } catch (e) {
    try { window.location.assign(${target}); } catch (e2) {}
  }
})();
true;
`;
}

/**
 * Chrome web masqué DANS L'APPLICATION UNIQUEMENT.
 *
 * La barre supérieure native fournit déjà la marque et les actions
 * (Support / Paramètres) et la barre du bas fournit la navigation : le bouton
 * « burger » (les 3 tirets) de l'en-tête web ouvre un menu latéral qui ferait
 * doublon avec la barre de navigation native. Il est donc masqué dans
 * l'application.
 *
 * C'est une simple feuille de style injectée par le client mobile : AUCUN
 * fichier de la plateforme Web n'est modifié. Le reste de l'en-tête web
 * (titre de la page, notifications, menu du compte et déconnexion) reste
 * intact — aucune fonctionnalité n'est perdue.
 */
export const MOBILE_CHROME_SCRIPT = `
(function () {
  try {
    var ID = "__batibuild-mobile-chrome";
    var apply = function () {
      if (document.getElementById(ID)) return;
      var root = document.head || document.documentElement;
      if (!root) return;
      var style = document.createElement("style");
      style.id = ID;
      // Seul le burger (bouton d'ouverture du menu latéral web, marqué
      // « lg:hidden ») est masqué : les boutons « retour » des autres pages
      // n'ont pas cette classe et restent visibles.
      style.appendChild(document.createTextNode(
        "header.glass-header button[class~='lg:hidden']{display:none !important;}"
      ));
      root.appendChild(style);
    };
    apply();
    document.addEventListener("DOMContentLoaded", apply);
    window.setTimeout(apply, 800);
  } catch (e) {}
})();
true;
`;

/**
 * Relais `navigator.share` → feuille de partage native.
 * Android WebView n'expose pas l'API Web Share ; sans ce patch, les boutons
 * « Partager » de la plateforme ne feraient rien.
 */
export const SHARE_BRIDGE_SCRIPT = `
(function () {
  try {
    if (window.ReactNativeWebView && !window.__batibuildSharePatched) {
      window.__batibuildSharePatched = true;
      window.navigator.share = function (data) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "share",
            title: (data && data.title) || "",
            text: (data && data.text) || "",
            url: (data && data.url) || ""
          }));
        } catch (e) {}
        return Promise.resolve({ status: "completed" });
      };
    }
  } catch (e) {}
})();
true;
`;

/**
 * Garde de navigation du parcours mobile.
 *
 * Deux règles, toutes deux appliquées avant que React Router ne démarre (script
 * injecté avant le contenu) et à chaque navigation SPA (`pushState` /
 * `replaceState` / `popstate`) :
 *
 *   1. La page d'accueil publique (`/`) ne doit JAMAIS s'afficher dans
 *      l'application, y compris après une déconnexion (la plateforme web fait
 *      `signOut()` puis `navigate("/")`) ou un clic sur le logo. Elle est
 *      remplacée par `/dashboard` (session présente) ou `/auth` (sinon).
 *
 *   2. Au démarrage, une route protégée (`/dashboard…`) sans session est
 *      remplacée par `/auth?returnTo=…` AVANT le rendu : l'utilisateur
 *      non connecté voit directement l'écran de connexion, sans passer par
 *      l'interface applicative. Après connexion, il revient sur la page visée.
 *
 * Dans les deux cas, la redirection se fait via `replaceState` : aucune entrée
 * n'est ajoutée à l'historique, donc le bouton Back Android ne peut pas ramener
 * l'utilisateur vers la page d'accueil (ni boucler sur `/auth`).
 *
 * Détection de session : Convex Auth stocke son JWT dans `localStorage` sous
 * une clé `__convexAuthJWT_<namespace>` (voir `@convex-dev/auth`). On ne lit
 * aucune donnée sensible : seul le préfixe de la clé est testé.
 */
export const ENTRY_GUARD_SCRIPT = `
(function () {
  try {
    if (window.__batibuildEntryGuard) return;
    window.__batibuildEntryGuard = true;

    var DASHBOARD = "/dashboard";
    var LOGIN = "/auth";

    /** Une session Convex Auth est-elle stockée localement ? */
    function hasSession() {
      try {
        var store = window.localStorage;
        if (!store) return false;
        for (var i = 0; i < store.length; i++) {
          var key = store.key(i);
          if (key && key.indexOf("__convexAuthJWT") === 0) {
            var value = store.getItem(key);
            if (value && value.length > 12) return true;
          }
        }
      } catch (e) {}
      return false;
    }

    function currentPath() {
      return window.location.pathname || "";
    }

    function isLanding(p) {
      return p === "" || p === "/" || p === "/index.html";
    }

    /** Zone réservée aux utilisateurs connectés (/dashboard…). */
    function isProtected(p) {
      return p === DASHBOARD || p.indexOf(DASHBOARD + "/") === 0;
    }

    /**
     * Route de remplacement, ou null si la page courante est valide.
     * L'écran /auth d'une session active n'est jamais réécrit : la plateforme
     * gère elle-même la redirection vers le tableau de bord (et l'utilisateur
     * peut ouvrir un lien de connexion avec un autre compte).
     */
    function replacementFor(p) {
      if (isLanding(p)) return hasSession() ? DASHBOARD : LOGIN;
      if (isProtected(p) && !hasSession()) {
        return LOGIN + "?returnTo=" + encodeURIComponent(p);
      }
      return null;
    }

    function normalize() {
      // Uniquement sur de vraies pages web : jamais sur about:blank, data:
      // ou blob: (au tout début du chargement, l'URL peut être provisoire).
      var proto = window.location.protocol;
      if (proto !== "http:" && proto !== "https:") return;

      var p = currentPath();
      var to = replacementFor(p);
      if (to === null) return;

      if (window.__batibuildRedirecting) return;
      window.__batibuildRedirecting = true;

      try {
        window.history.replaceState(null, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (e) {
        try { window.location.replace(to); return; } catch (e2) {}
      }

      // Si le routeur a ignoré le changement d'historique, on force une vraie
      // navigation (dernier recours, ne devrait jamais arriver).
      window.setTimeout(function () {
        if (currentPath() === p) {
          try { window.location.replace(to); } catch (e) {}
        }
        window.__batibuildRedirecting = false;
      }, 300);
    }

    // Intercepte les navigations SPA (React Router) qui reviennent vers "/"
    // ou vers une zone protégée sans session.
    var wrap = function (name) {
      var original = window.history[name];
      if (typeof original !== "function") return;
      window.history[name] = function () {
        var result = original.apply(this, arguments);
        try { normalize(); } catch (e) {}
        return result;
      };
    };
    wrap("pushState");
    wrap("replaceState");

    window.addEventListener("popstate", function () {
      window.__batibuildRedirecting = false;
      normalize();
    });

    normalize();
  } catch (e) {}
})();
true;
`;
