/**
 * Scripts injectés dans la WebView batibuild.
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
 * L'en-tête natif fournit déjà la marque, les actions (Support / Paramètres) et
 * le menu de navigation (menu horizontal scrollable) : le bouton
 * « burger » (les 3 tirets) de l'en-tête web ouvre un menu latéral qui ferait
 * doublon avec la barre de navigation native. Il est donc masqué dans
 * l'application.
 *
 * C'est une simple feuille de style injectée par le client mobile : AUCUN
 * fichier de la plateforme Web n'est modifié. Le reste de l'en-tête web
 * (titre de la page, notifications, menu du compte et déconnexion) reste
 * intact — aucune fonctionnalité n'est perdue.
 */
/**
 * MARQUEUR D'EXÉCUTION — APPLICATION ANDROID.
 *
 * Posé AVANT le premier rendu de la plateforme Web, il permet à celle-ci de
 * reconnaître de façon FIABLE le contexte Android (aucune détection fragile
 * basée sur la taille de l'écran ni sur le seul User-Agent).
 *
 * La plateforme Web s'en sert UNIQUEMENT pour désactiver ce qui ne doit pas
 * s'appliquer à l'application :
 *   · système de cookies Web (aucune lecture, aucune écriture) ;
 *   · cache navigateur avancé (Service Worker) ;
 *   · toute interface de consentement liée aux cookies (batibuild n'en affiche
 *     aucune : les cookies utilisés sont strictement nécessaires).
 *
 * Elle ne modifie NI l'écran de démarrage, NI le guide de première utilisation,
 * NI le menu, NI les notifications, NI la navigation de l'application : la
 * session et le stockage locaux restent ceux de la coque native
 * (`mobile/src/storage.ts`).
 *
 * La VALEUR du marqueur est partagée avec la plateforme Web : elle doit rester
 * identique à `ANDROID_APP_MARKER` dans `src/lib/runtime.ts`.
 */
export const ANDROID_APP_MARKER_SCRIPT = `
(function () {
  try {
    window.__BATIBUILD_ANDROID_APP__ = true;
    window.__BATIBUILD_RUNTIME__ = "ANDROID_APP";
  } catch (e) {}
})();
true;
`;

/**
 * Jeton ajouté au User-Agent par la WebView (`applicationNameForUserAgent`,
 * voir `WebViewScreen`) — second signal, stable et vérifiable côté serveur.
 * Identique à `ANDROID_APP_UA_TOKEN` dans `src/lib/runtime.ts`.
 */
export const ANDROID_APP_UA_TOKEN = "BatibuildApp";

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
 * Relais de téléchargement des fichiers générés DANS LE NAVIGATEUR.
 *
 * PROBLÈME
 * --------
 * Les PDF de la plateforme (devis d'estimation du coût de construction,
 * rapport de l'analyse des matériaux IA, etc.) sont fabriqués côté client avec
 * jsPDF, puis « téléchargés » via une URL `blob:` et un lien `<a download>`.
 * Les navigateurs de bureau enregistrent ce fichier ; la WebView Android, elle,
 * ne sait pas écrire une URL `blob:` sur le disque — le clic ne produisait donc
 * AUCUN fichier (les PDF « ne se téléchargeaient pas »).
 *
 * SOLUTION (100 % côté application mobile)
 * ----------------------------------------
 * Ce script, injecté AVANT le contenu, retient chaque Blob exporté par la page
 * (`URL.createObjectURL`) et, au moment du clic de téléchargement, l'envoie au
 * code natif en base64, par morceaux (voir `src/download.ts`, qui rassemble les
 * morceaux, écrit le fichier et ouvre la feuille de partage Android).
 *
 * Le contenu, la logique métier et les fichiers de la plateforme Web ne sont
 * pas modifiés : on ne fait que remplacer le transport `blob:` par un transport
 * natif, strictement équivalent d'un point de vue utilisateur.
 */
export const DOWNLOAD_BRIDGE_SCRIPT = `
(function () {
  try {
    if (window.__batibuildDownloadBridge) return;
    window.__batibuildDownloadBridge = true;
    if (!window.ReactNativeWebView) return;

    // 256 Ko par message : le pont Android ne reçoit jamais une chaîne énorme
    // d'un seul coup (aucun risque de saturation, mémoire bornée côté natif).
    var CHUNK = 262144;
    // Nombre de Blobs conservés simultanément (purge des plus anciens).
    var MAX_BLOBS = 24;
    var MAX_AGE = 120000;
    var blobs = {};
    var order = [];

    function post(payload) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
    }

    function remember(url, blob) {
      blobs[url] = { blob: blob, at: Date.now() };
      order.push(url);
      while (order.length > MAX_BLOBS) delete blobs[order.shift()];
    }

    function sweep() {
      var now = Date.now();
      var keys = Object.keys(blobs);
      for (var i = 0; i < keys.length; i++) {
        if (now - blobs[keys[i]].at > MAX_AGE) delete blobs[keys[i]];
      }
    }

    // 1) On retient chaque fichier exporté par la page (jsPDF, exports CSV,
    //    exports texte…). Le Blob reste accessible même si la page révoque son
    //    URL juste après le clic (cas des exports CSV de la plateforme).
    var createObjectURL = window.URL && window.URL.createObjectURL;
    if (typeof createObjectURL === "function") {
      window.URL.createObjectURL = function (blob) {
        var url = createObjectURL.apply(this, arguments);
        try {
          if (url && url.indexOf("blob:") === 0 && blob) {
            sweep();
            remember(url, blob);
          }
        } catch (e) {}
        return url;
      };
    }

    // 2) Envoi du fichier au code natif : base64, découpé en morceaux numérotés.
    function exportBlob(blob, name) {
      var id = "bb" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      try {
        post({
          type: "download:start",
          id: id,
          name: name || "document",
          mime: (blob && blob.type) || "application/octet-stream",
          size: (blob && blob.size) || 0
        });
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var result = String(reader.result || "");
            var comma = result.indexOf(",");
            var base64 = comma === -1 ? "" : result.slice(comma + 1);
            var total = Math.ceil(base64.length / CHUNK);
            for (var n = 0; n < total; n++) {
              post({
                type: "download:chunk",
                id: id,
                index: n,
                data: base64.substr(n * CHUNK, CHUNK)
              });
            }
            post({ type: "download:end", id: id, total: total });
          } catch (e) {
            post({ type: "download:error", id: id });
          }
        };
        reader.onerror = function () { post({ type: "download:error", id: id }); };
        reader.readAsDataURL(blob);
      } catch (e) {
        post({ type: "download:error", id: id });
      }
      return true;
    }

    // Le clic vient-il d'un lien de téléchargement <a download href="blob:…"> ?
    function intercept(anchor) {
      try {
        if (!anchor || !anchor.getAttribute || anchor.__batibuildExport) return false;
        var href = anchor.getAttribute("href") || "";
        if (href.indexOf("blob:") !== 0) return false;
        var entry = blobs[href];
        if (!entry || !entry.blob) return false;
        anchor.__batibuildExport = true;
        return exportBlob(entry.blob, anchor.getAttribute("download") || "document");
      } catch (e) {
        return false;
      }
    }

    // 2a) jsPDF (et FileSaver) déclenchent un MouseEvent « click » qui NE REMONTE
    //     PAS (bubbles: false) : on intercepte donc l'envoi de l'événement.
    var dispatchEvent = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (event) {
      try {
        if (event && event.type === "click" && this && this.tagName === "A" && intercept(this)) {
          return true;
        }
      } catch (e) {}
      return dispatchEvent.apply(this, arguments);
    };

    // 2b) Cas « a.click() » (exports CSV / texte de la plateforme).
    var click = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function () {
      try {
        if (this && this.tagName === "A" && intercept(this)) return undefined;
      } catch (e) {}
      return click.apply(this, arguments);
    };

    // 2c) Filet de sécurité : lien de téléchargement réellement présent dans la
    //     page. La WebView Android n'exécute pas un téléchargement « blob: » :
    //     on prend donc le relais nous-mêmes.
    document.addEventListener(
      "click",
      function (event) {
        try {
          var node = event.target;
          var anchor = node && node.closest ? node.closest("a[href^='blob:']") : null;
          if (anchor && intercept(anchor)) {
            event.preventDefault();
            event.stopPropagation();
          }
        } catch (e) {}
      },
      true
    );
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
