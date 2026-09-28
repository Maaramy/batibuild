# Cookies Web + cache intelligent — batibuild

Système de **cookies non sensibles** et de **cache navigateur** destiné
exclusivement à la **version Web** de batibuild, afin d'accélérer l'accès et le
chargement de la plateforme. Il est **totalement désactivé dans l'application
Android** (WebView), qui conserve son propre stockage/session locaux.

---

## 1. Séparation Web / Android

La même plateforme Web est chargée dans deux contextes. Le runtime est détecté
par **trois signaux fiables** (jamais la taille de l'écran, jamais le seul
« Android » du User-Agent) — voir `src/lib/runtime.ts` :

| Signal | Posé par |
| --- | --- |
| `window.ReactNativeWebView` | `react-native-webview` (déjà présent sur les applications installées) |
| `window.__BATIBUILD_ANDROID_APP__ = true` | coque native, avant le premier rendu (`mobile/src/injected.ts`, `ANDROID_APP_MARKER_SCRIPT`) |
| `BatibuildApp/…` dans le User-Agent | `applicationNameForUserAgent` (`mobile/src/screens/WebViewScreen.tsx`) |

```
WEB_BROWSER  → cookies Web + cache navigateur + Service Worker ACTIFS
ANDROID_APP  → cookies Web DÉSACTIVÉS, aucun Service Worker, aucune bannière ;
               stockage/session propres à la coque native (AsyncStorage)
```

Conséquence importante : **Chrome Android (navigateur)** garde le système Web
complet — seule l'application Android est exclue.

Ce qui n'est **jamais** touché côté Android : écran de démarrage, guide de
première utilisation, menu et barre de navigation, notifications, messagerie.
Les seules modifications natives sont additives : le script marqueur injecté et
le jeton de User-Agent.

---

## 2. Cookies (Web uniquement)

Tous les cookies sont préfixés `bb_`, en `Path=/`, `SameSite=Lax`, `Secure` en
HTTPS, avec une durée de vie explicite.

| Cookie | Contenu | Durée | Rôle |
| --- | --- | --- | --- |
| `bb_lang` | `fr` \| `en` \| `ar` | 1 an | langue restaurée avant le premier rendu (aucun clignotement, RTL correct) |
| `bb_theme` | `light` \| `dark` \| `system` | 1 an | thème appliqué avant le premier rendu (aucun flash de couleur) |
| `bb_session` | `1` | 30 j | **état de connexion** (indice d'affichage uniquement) |
| `bb_role` | `client` \| `supplier` \| `expert` | 30 j | type de profil, pour précharger le bon tableau de bord |
| `bb_home` | `/dashboard…` | 30 j | tableau de bord correspondant (indice de préchargement) |

Implémentation : `src/lib/webCookies.ts`.

### Ce qui n'est JAMAIS dans un cookie

* mot de passe, jeton d'accès, JWT, refresh token, clé d'API, OTP, IBAN, numéro
  de carte, identifiant utilisateur, e-mail ;
* aucune donnée permettant d'accéder à un compte.

Ces interdictions sont **actives**, pas seulement documentées : toute écriture
sur un nom ou une valeur sensible lève `UnsafeCookieError` et est refusée
(`assertCookieSafe`), et la couche ne peut manipuler que des noms `bb_*`.

### Session et authentification — pourquoi Convex Auth reste la source de vérité

La session réelle est gérée par **Convex Auth** (jeton côté client,
rafraîchissement côté serveur, validé par `RequireAuth`). Aucun cookie ne
participe à l'autorisation : `bb_session` dit seulement « une session était
active lors de la dernière visite », ce qui permet de restaurer l'interface et
de précharger le bon module.

Un cookie de session `HttpOnly` **n'est pas applicable ici** : Convex Auth
s'authentifie par en-tête (jeton) depuis une application React, jamais par
cookie de session serveur. Le choix retenu est donc celui qui ne casse rien :

* **aucun** jeton placé dans un cookie, une URL, un paramètre visible, un log ou
  la console ;
* le jeton reste dans le stockage du client (même origine, jamais mis en cache
  par le Service Worker) ;
* les cookies ajoutés ne contiennent **que** des valeurs énumérées ci-dessus, non
  sensibles, et `SameSite=Lax` protège des requêtes croisées.

### Compatibilité authentification (aucun changement de comportement)

| Cas | Comportement |
| --- | --- |
| Connexion / inscription | inchangé ; l'indice de session est écrit **après** confirmation de la session |
| Déconnexion | `clearSessionHint()` supprime `bb_session`, `bb_role`, `bb_home` |
| Expiration de session | `RequireAuth` redirige vers `/auth?returnTo=…` comme avant ; l'indice est effacé dès que l'état devient déconnecté |
| Changement de profil | `bb_role` / `bb_home` sont simplement réécrits (indice, jamais un droit) |
| Client Pro / Expert / Fournisseur / Admin | rôles et redirections par rôle inchangés (`dashboardPathForRole`) |
| Récupération de mot de passe, OTP | aucun cookie utilisé |

---

## 3. Cache navigateur

### 3.1 En-têtes HTTP (`vercel.json`)

| Chemin | `Cache-Control` |
| --- | --- |
| `/assets/*` (JS/CSS **versionnés par empreinte**) | `public, max-age=31536000, immutable` |
| polices (`woff2`, `ttf`, …) | `public, max-age=31536000, immutable` |
| images / icônes non versionnées | `public, max-age=86400, stale-while-revalidate=604800` |
| `manifest.webmanifest` | `public, max-age=3600, stale-while-revalidate=86400` |
| `sw.js` | `no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /` |
| tout le reste (HTML, routes) | `no-cache, must-revalidate` |

Vite nomme les fichiers `assets/<nom>-<empreinte>.<ext>` : une nouvelle version
produit de **nouvelles URLs**, donc le cache long est sûr. Le HTML, lui, est
toujours revalidé → **jamais d'ancienne version critique** après un déploiement.

### 3.2 Service Worker (`public/sw.js`)

Enregistré par `src/lib/webServiceWorker.ts` **uniquement** : Web + HTTPS +
build de production (`import.meta.env.PROD`). Jamais dans l'application Android,
jamais en développement (le HMR de l'aperçu est préservé).

| Type de requête | Stratégie |
| --- | --- |
| Navigation / HTML | **réseau d'abord**, cache en secours hors ligne (jamais de page figée) |
| `/assets/*-<empreinte>.*` | **cache d'abord** (immuable) |
| images, manifeste, CSS | revalidation en arrière-plan (`stale-while-revalidate`) |
| Google Fonts | `.woff2` en cache d'abord, CSS revalidé en arrière-plan |
| requêtes non `GET`, `Range` (PDF) | jamais interceptées |
| **Convex** (`*.convex.cloud`, `*.convex.site`, `*.convex.dev`, `*.convexusercontent.com`) et `/api/*` | **jamais mises en cache** (réseau direct) |

⇒ Aucune donnée personnelle, aucune réponse API authentifiée n'est stockée : il
n'existe donc aucun cache partagé entre utilisateurs. La politique des données
personnalisées reste `private` — elles ne passent pas par le cache.

Mise à jour : `activate` supprime tous les caches `batibuild-*` d'une autre
version ; la page peut demander une activation immédiate
(`BB_SKIP_WAITING`, fait automatiquement quand une nouvelle version est
détectée) ou une purge complète (`BB_CLEAR_CACHES`, exposé par `clearWebCaches()`).
Un seul rechargement est déclenché lors d'un changement de version (aucune
boucle).

### 3.3 Démarrage rapide (`src/components/WebBootSync.tsx`)

1. **thème + langue** appliqués avant le premier rendu par le script d'amorçage
   d'`index.html` (cookies `bb_theme` / `bb_lang`, repli `localStorage`) ;
2. **session détectée** par Convex Auth (temps réel) ; l'indice de connexion est
   rafraîchi ou effacé ;
3. **interface principale d'abord** : rien n'est bloqué par les cookies, le
   rendu suit le chemin normal (routes `lazy`) ;
4. **module de la page suivante préchargé** pendant un temps mort
   (`requestIdleCallback`) — tableau de bord pour un utilisateur dont la session
   était active ou déjà sur `/auth` ;
5. **modules secondaires** : chargés à la demande par le routeur (inchangé) ;
6. **aucun appel API inutile** : les requêtes utilisateur restent en `skip` tant
   que la session n'est pas établie (`HomeRoute`, `WebBootSync`) ; les requêtes
   identiques sont dédupliquées par le client Convex ;
7. **ressources déjà en cache** réutilisées (Service Worker + cache HTTP).

---

## 4. Pas de bannière cookies

Aucune bannière, popup ou demande de consentement n'est affichée — ni sur le
Web, ni dans l'application Android. Motif : les cookies utilisés sont
**strictement nécessaires** au fonctionnement et à la session (préférences
d'affichage, état de connexion, langue).

Aucun cookie marketing, publicitaire ou de suivi tiers n'existe, et aucun
mécanisme de consentement n'est donc requis. Si un cookie non essentiel était
ajouté un jour, il devrait être isolé dans un mécanisme de consentement
distinct — les cookies techniques et la session de batibuild ne doivent pas en
dépendre. Un test verrouille cet état (`src/lib/webServiceWorker.test.ts`).

---

## 5. Vérification

```bash
bunx tsc -b --noEmit                     # types
bunx vitest run                          # 65 fichiers / 1055 tests
node --check public/sw.js                # syntaxe du Service Worker
cd mobile && bunx tsc --noEmit           # coque Android
```

### Scénarios à tester

| Scénario | Attendu |
| --- | --- |
| Première ouverture (Web) | aucun clignotement de thème/langue ; cookies `bb_*` créés après connexion |
| Deuxième ouverture (Web) | thème et langue immédiats ; page affichée depuis le cache HTTP/SW |
| Utilisateur connecté | `bb_session=1`, `bb_role` correct ; tableau de bord du rôle |
| Utilisateur déconnecté | aucun cookie de session ; redirection vers `/auth` |
| Expiration de session | redirection propre vers `/auth?returnTo=…`, indice effacé |
| Nouvelle version déployée | le HTML est revalidé, les nouveaux `assets/*` sont chargés (l'ancien cache n'est pas servi) |
| Suppression du cache | la plateforme se recharge normalement (aucune erreur, aucun écran blanc) |
| Hors connexion | pages déjà visitées accessibles, polices/statiques servis depuis le cache |
| Onglet Application → Cookies | uniquement `bb_lang`, `bb_theme`, `bb_session`, `bb_role`, `bb_home` |
| Onglet Application → Cache Storage | uniquement `batibuild-shell-*`, `batibuild-static-*`, `batibuild-fonts-*` ; aucun appel Convex |
| Chrome Desktop / Firefox / Safari | mêmes comportements |
| Chrome Android (navigateur) | système Web actif (cookies + cache) |
| **Application Android** | **aucune bannière ni demande de consentement**, aucun `bb_*`, aucun Service Worker ; splash, guide, menu, notifications et navigation inchangés |

### Forcer un rafraîchissement complet

1. Web : DevTools → Application → Service Workers → *Unregister*, puis Clear
   storage (ou `clearWebCaches()` depuis la console) ;
2. version majeure : incrémenter `CACHE_VERSION` en tête de `public/sw.js` — tous
   les caches `batibuild-*` des versions précédentes sont supprimés
   automatiquement à l'activation.

---

## 6. Fichiers concernés

| Fichier | Rôle |
| --- | --- |
| `src/lib/runtime.ts` | détection fiable `WEB_BROWSER` / `ANDROID_APP` |
| `src/lib/webCookies.ts` | couche cookies (garde-fous, préférences, indices de session) |
| `src/lib/webServiceWorker.ts` | enregistrement et purge du cache avancé (Web uniquement) |
| `src/lib/routePrefetch.ts` | préchargement des modules de route pendant un temps mort |
| `src/components/WebBootSync.tsx` | câblage du démarrage rapide (monté dans `src/main.tsx`) |
| `public/sw.js` | stratégies de cache (navigation réseau d'abord, assets cache d'abord) |
| `index.html` | amorçage thème/langue avant le premier rendu (Web uniquement) |
| `vercel.json` | en-têtes `Cache-Control` |
| `src/i18n/config.ts` | détection de langue par cookie (Web) avec repli `localStorage` |
| `mobile/src/injected.ts`, `mobile/src/screens/WebViewScreen.tsx` | marqueur Android + jeton de User-Agent (ajout seul) |
