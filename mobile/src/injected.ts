/**
 * Scripts injectés dans la WebView BatiBuild.
 *
 * Ils tournent AVANT le contenu (injectedJavaScriptBeforeContentLoaded) ou
 * juste après le chargement. Aucun ne modifie la logique métier de la
 * plateforme : ils ne font que normaliser la navigation côté mobile.
 */

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
