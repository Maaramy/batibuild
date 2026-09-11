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
 * Objectif : la page d'accueil publique (`/`) ne doit JAMAIS s'afficher dans
 * l'application, y compris après une déconnexion (la plateforme web fait
 * `signOut()` puis `navigate("/")`) ou un clic sur un logo.
 *
 * On l'intercepte à la source en enveloppant `history.pushState` /
 * `history.replaceState` : dès que l'URL devient `/`, on la remplace
 * (`replaceState`, donc pas d'entrée ajoutée à l'historique → le bouton Back
 * ne peut pas y revenir) par :
 *   - `/dashboard` si une session Convex Auth existe ;
 *   - `/auth`      sinon.
 *
 * Comme le script est injecté avant le contenu, il est déjà actif quand React
 * Router démarre : la redirection est donc invisible pour l'utilisateur.
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

    function target() {
      return hasSession() ? DASHBOARD : LOGIN;
    }

    function isLanding() {
      var p = window.location.pathname;
      return p === "" || p === "/" || p === "/index.html";
    }

    function redirectAway() {
      if (!isLanding()) return;
      if (window.__batibuildRedirecting) return;
      window.__batibuildRedirecting = true;
      var to = target();
      try {
        window.history.replaceState(null, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch (e) {
        try { window.location.replace(to); return; } catch (e2) {}
      }
      // Si le routeur a ignoré le changement d'historique, on force une vraie
      // navigation (dernier recours, ne devrait jamais arriver).
      window.setTimeout(function () {
        if (isLanding()) {
          try { window.location.replace(to); } catch (e) {}
        }
        window.__batibuildRedirecting = false;
      }, 300);
    }

    // Intercepte les navigations SPA (React Router) qui reviennent vers "/".
    var wrap = function (name) {
      var original = window.history[name];
      if (typeof original !== "function") return;
      window.history[name] = function () {
        var result = original.apply(this, arguments);
        try { redirectAway(); } catch (e) {}
        return result;
      };
    };
    wrap("pushState");
    wrap("replaceState");

    window.addEventListener("popstate", function () {
      window.__batibuildRedirecting = false;
      redirectAway();
    });

    redirectAway();
  } catch (e) {}
})();
true;
`;
