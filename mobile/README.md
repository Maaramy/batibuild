# batibuild — Application Mobile (Android + iOS)

Application mobile **native** (React Native / Expo SDK 57) qui embarque la plateforme
[batibuild](https://budgetbati.freebuff.app/) dans une **WebView optimisée**, avec un
**Splash Screen** (≤ 1 s), un **en-tête natif** (marque, Support, Paramètres — aucun menu),
une **barre de navigation inférieure FIXE** et un **Guide d'onboarding** natifs au premier
lancement.

```
Première installation :  Splash (≤ 1 s)  →  Guide « De l'idée à l'investissement » (6 étapes × 4 s, Passer)  →  WebView batibuild
Lancements suivants :    Splash (≤ 1 s)  →  WebView batibuild
```

### Coque native (Material Design 3)

```
Android Native Shell
│
├── Splash  « Chargement.... »  (fond BLANC, ≤ 1 s, jamais bloquant)
│      L'écran de démarrage natif est BLANC et SANS image : le logo sur fond
│      vert qui s'affichait avant le chargement a été supprimé.
│
├── Guide « De l'idée à l'investissement »  (1ʳᵉ installation uniquement)
│      1. Coût estimatif                    4. Consultations / Trouver un expert
│      2. Plans AI  (aperçus réels 2D/3D)   5. Exécution & suivi
│      3. Choix des matériaux               6. Investissement
│      Chaque étape : 4 s, avancement automatique, indicateur « n / 6 »,
│      barre de progression et bouton « Passer ».
│      Parcours : Idée → Coût → Plans → Matériaux → Experts → Exécution → Investissement
│
├── Header natif  (fond blanc — AUCUN menu de navigation)
│      Ligne unique : Logo + « batibuild »   Support   Paramètres
│      (aucun burger, aucune rangée d'onglets)
│
├── WebView  →  plateforme batibuild (inchangée)
│      Occupe exactement la hauteur restante : jamais recouverte par la barre.
│
└── Bottom Nav — BARRE DE NAVIGATION INFÉRIEURE (fond blanc, fixe)
       Profile · Mes projets · Home · Rapport · Message
       → « Mes projets » ouvre la page dédiée /dashboard/projects
         (UNIQUEMENT les projets de l'utilisateur connecté) ;
       → « Rapport » ouvre la page Rapports PDF /dashboard/reports
         (consulter / télécharger les rapports PDF de ses projets) ;
       → pastille ROUGE sur « Message » dès qu'un message non lu existe
         (compteur du serveur, temps réel, « 99+ » au-delà de 99).
       → visible dans TOUT l'espace connecté (/dashboard et ses sous-pages) ;
         masquée uniquement sur la connexion / inscription et l'accueil public ;
       → safe area basse gérée (barre système Android, gestes, encoche) ;
         onglets de largeur égale : aucun débordement, toutes tailles d'écran.
```

L'en-tête et la barre du bas sont **natifs** : ils ne défilent pas avec le contenu. L'en-tête
gère lui-même la zone système haute (barre de statut / encoche) et la barre gère la zone
système basse (barre de navigation Android, gestes, encoche). Aucun changement de section
n'entraîne le rechargement de la WebView (donc session, cookies, état et historique
préservés).

La **barre de navigation inférieure** (`BottomNav.tsx`) aligne les 5 sections
(`Profile · Mes projets · Home · Rapport · Message`) dans une barre **fixe en bas de l'écran**, à
onglets de largeur égale (icône lucide 19 pt + libellé 10,5 pt) : elle s'adapte donc à toutes
les tailles d'écran (petit téléphone, grand écran, tablette, paysage) sans jamais déborder.
L'élément **actif** est clairement identifié (icône et libellé en teinte de marque, libellé en
gras, indicateur émeraude au-dessus de l'icône) ; l'état pressé applique une légère
atténuation. Elle est rendue **après** la WebView dans la colonne racine — et non en position
absolue : la WebView occupe exactement la hauteur restante, la barre **ne recouvre donc jamais
le contenu** (aucun padding artificiel n'est injecté dans la page Web) et elle reste accessible
**partout** dans l'espace connecté, y compris sur les pages de résultats.

### Icônes harmonisées avec la plateforme

Toute la coque native (en-tête, barre de navigation inférieure, guide, écran d'erreur) utilise
**la même famille d'icônes que le tableau de bord de la plateforme : lucide**
(`lucide-react-native`, via le module unique `src/components/icons.ts`) :

| Élément | Icône |
|---|---|
| Profile | `User` |
| Mes projets | `HardHat` |
| Home | `LayoutDashboard` |
| Rapport | `FileDown` (document + téléchargement — celle de l'entrée « Rapports PDF » du menu de la plateforme) |
| Message | `MessageSquare` |
| Support (en-tête) | `Headset` |
| Paramètres (en-tête) | `Settings` |
| Hors ligne / erreur | `CloudOff` |

Aucun mélange de styles (pas d'icônes pleines à côté d'icônes contour) : seule
l'épaisseur de trait change entre l'état actif et l'état inactif (`STROKE` dans
`icons.ts`). Les icônes sont des **SVG** : elles se recolorent instantanément et sont
identiques en mode clair, sombre et système — aucune police d'icônes à charger (le
préchargement de police a donc été supprimé du démarrage).

Dans l'application, le **bouton « burger » (les 3 tirets)** de l'en-tête de la plateforme
Web est **masqué** : la barre de navigation inférieure fournit déjà les 5 sections
principales et l'en-tête natif la marque et les actions (Support / Paramètres). C'est une simple feuille
de style injectée par le client mobile (`MOBILE_CHROME_SCRIPT` dans `src/injected.ts`) :
**aucun fichier de la plateforme Web n'est modifié**, et le reste de l'en-tête web
(titre, notifications, menu du compte, déconnexion) reste intact.

### Parcours de navigation mobile

La WebView démarre directement sur `/dashboard` : **la page d'accueil publique
n'est jamais une étape du parcours mobile**. Le script injecté (`src/injected.ts`)
normalise la navigation avant le rendu, via `replaceState` (donc sans entrée
d'historique : le bouton Back Android ne peut pas revenir à l'accueil) :

| Situation | Destination |
|---|---|
| Session valide (JWT Convex Auth présent) | `/dashboard` |
| Aucune session, route protégée (`/dashboard…`) | `/auth?returnTo=…` |
| Navigation vers `/` (logo, déconnexion) | `/dashboard` (session) ou `/auth` (sinon) |
| Après connexion | la page demandée (`returnTo`), sinon `/dashboard` |
| Après déconnexion | `/auth` |

La session (cookies, `localStorage`, tokens) est conservée entre les lancements :
un redémarrage de la WebView ne déconnecte jamais l'utilisateur.

> La plateforme Web n'est **pas modifiée** : elle s'affiche simplement dans la WebView.
> Les écrans Splash et Guide sont natifs (React Native).

> 🛠️ **Build 100 % local, sans EAS ni cloud.** L'APK est produit par votre propre
> Gradle Wrapper : `npm run android:apk` → `build/Batibuild-release.apk`.
> Procédure complète : **[`../MOBILE_BUILD.md`](../MOBILE_BUILD.md)** · installation : [`../MOBILE_SETUP.md`](../MOBILE_SETUP.md).

---

## 1. Structure

```
mobile/
├── App.tsx                        # Machine à états : Splash → Onboarding → WebView
├── index.ts                       # Entrée (garde le splash natif pendant le boot JS)
├── app.json                       # Identifiants, permissions, splash, icônes
├── assets/                        # Logo officiel, icône, icône adaptative ; splash natif transparent
├── src/
│   ├── screens/
│   │   ├── SplashScreen.tsx       # Splash minimal : logo officiel + « Chargement.... »
│   │   ├── OnboardingScreen.tsx   # Guide 6 étapes « De l'idée à l'investissement » (4 s/étape, auto + Passer)
│   │   └── WebViewScreen.tsx      # WebView batibuild (toutes les options)
│   ├── components/
│   │   ├── icons.ts               # Jeu d'icônes UNIQUE (lucide) : en-tête, guides, erreurs
│   │   ├── Logo.tsx               # Logo officiel de la plateforme (tuile émeraude + casque blanc)
│   │   ├── TopNav.tsx             # En-tête natif : logo + nom, Support, Paramètres (aucun menu)
│   │   ├── BottomNav.tsx          # Barre de navigation inférieure fixe (5 sections)
│   │   ├── GuideIllustrations.tsx # Illustrations dédiées (scènes vectorielles SVG)
│   │   ├── GuidePlans.tsx         # Aperçus RÉELS de plans (2D → coté → 3D) de l'étape « Plans AI »
│   │   └── guidePlans.ts          # Générateur de plans (portage du moteur de la plateforme)
│   ├── download.ts                # Téléchargements natifs : URL http(s) ET PDF « blob: »
│   ├── storage.ts                 # onboardingCompleted (AsyncStorage)
│   ├── theme.ts                   # Jetons Material 3 (clair / sombre) issus de la charte batibuild
├── android/                       # Projet natif Android — COMMITÉ (build Gradle local direct)
├── ios/                           # Projet natif iOS (CNG : généré par `expo prebuild`, macOS)
├── build/                         # APK/AAB générés localement (ignoré par Git)
└── scripts/
    ├── build-android.mjs          # Build local Gradle (apk / debug / aab / clean)
    ├── install-android.mjs        # adb install du dernier APK
    ├── generate-keystore.mjs      # Keystore Release local
    ├── ensure-debug-keystore.mjs  # Recrée la clé debug Android si elle manque
    └── apply-signing.mjs          # Réapplique la signature Release après un prebuild
```

## 2. Fonctionnalités

| Fonctionnalité | Comportement |
|---|---|
| **Splash** | **Fond BLANC**, logo officiel et **un seul message : « Chargement.... »** (aucun slogan, aucune image de présentation). Durée **≤ 1 s** (constante `CHANGE_MAX_MS`) : aucune attente du réseau, aucun délai artificiel. L'écran de démarrage natif (avant le JS) est lui aussi **blanc et sans image** — il n'affiche plus le logo sur fond vert. |
| **Chargement (pages)** | **Fond BLANC**, borne de **1 seconde maximum** : ouverture et chargement d'une page (masquée dès que le routeur confirme la route). |
| **Changement de section (barre du bas)** | **Aucun écran de chargement** : le changement est direct, la WebView n'est pas recréée. |
| **Barre de navigation inférieure** | **Barre FIXE en bas de l'écran** (`BottomNav.tsx`) : 5 sections (Profile · **Mes projets** · Home · **Rapport** · Message), icône **lucide 19 pt** + libellé **10,5 pt**, onglets de **largeur égale** (`flex: 1`) donc aucun débordement sur petit ou grand écran. Élément **actif** : icône et libellé en teinte de marque (`brand700`), libellé en gras, **indicateur émeraude** au-dessus de l'icône (emplacement réservé sur tous les onglets → aucun décalage) ; inactifs en gris ; état pressé = légère atténuation. Fond **blanc**, safe area basse gérée (`useSafeAreaInsets`, minimum 6 pt). Rendue **après** la WebView (jamais en position absolue) : elle ne recouvre jamais le contenu. Visible dans tout l'espace connecté — voir `shouldShowBottomNav()` dans `src/config.ts`. |
| **En-tête (natif)** | Fond **blanc**, logo officiel + wordmark de la plateforme (« batibuild ») à gauche, icônes **Support** et **Paramètres** à droite. **Aucun menu de navigation** (et aucun burger : celui de l'en-tête web est masqué dans l'application). **Appui long sur la marque** (ou sur la barre du bas) → réglages natifs. |
| **Thème natif** | Material Design 3 clair / sombre / système (`useColorScheme`), sans toucher au thème de la plateforme Web. Les icônes étant des SVG (lucide), elles conservent exactement le même dessin et un contraste correct dans les trois modes. |
| **Guide de démarrage** | **6 étapes**, un seul parcours « **De l'idée à l'investissement** » (les anciens écrans d'introduction ont été supprimés) : **1. Coût estimatif · 2. Plans AI · 3. Choix des matériaux · 4. Consultations / Trouver un expert · 5. Exécution & suivi · 6. Investissement**. Chaque étape = **illustration dédiée** + **titre** + **texte descriptif**, reste affichée **4 secondes** puis la suivante apparaît avec un **fondu + glissement** (avancement **automatique**, sans intervention). Indicateur **« n / 6 »**, **barre de progression segmentée** (remplissage de l'étape en cours), **fil du parcours** (Idée → Coût → Plans → Matériaux → Experts → Exécution → Investissement) et bouton **Passer**. Après la 6ᵉ étape, le guide se termine et l'application s'ouvre normalement. Mémorisé via `onboardingCompleted` (AsyncStorage). |
| **Illustrations des étapes** | Aucune image générique, aucun placeholder, aucune icône seule : chaque étape affiche une **scène SVG dédiée** (détection IA sur le plan, comparaison Économique / Équilibré / Premium, 10 phases de chantier, ROI 1/5/10 ans + score IA + scénarios, annuaire vérifié + carte des régions). Elles sont **vectorielles donc nettes sur tous les écrans**, suivent le **thème clair / sombre / système** et n'entraînent **aucun téléchargement**. |
| **Aperçus réels de plans (étape « Plans AI »)** | L'étape affiche **le même plan réel**, généré par un **portage du moteur de plans de la plateforme** (`guidePlans.ts` : partition BSP, programme résidentiel R+0 de 150 m², portes, fenêtres — déterministe), sous **trois vues qui s'enchaînent toutes les 1,4 s** : **plan 2D**, **plan coté** (emprise + dimensions de chaque pièce), **vue 3D** (extrusion isométrique). Mise à l'échelle **uniforme** (aucune déformation, aucun débordement) et cadre à coins arrondis **qui coupe tout dépassement**. |
| **Réinstallation** | Le stockage local est effacé → les guides réapparaissent (comportement attendu). |
| **Mise à jour** | `onboardingCompleted` est conservé → pas de guides à chaque mise à jour. |
| **Revoir le guide** | **Appui long** sur la marque de l'en-tête (ou sur la barre de navigation inférieure) → « Voir le guide » (ne supprime aucune donnée). Aucun bouton supplémentaire n'est ajouté à l'écran. |
| **Session** | Cookies, stockage local, cache persistants entre les lancements (`sharedCookiesEnabled`, `thirdPartyCookiesEnabled`, `cacheEnabled`, `domStorageEnabled`). |
| **Navigation interne** | Toutes les pages `*.freebuff.app` restent dans la WebView. |
| **Liens externes** | Sites partenaires, réseaux sociaux, documents externes → navigateur système (`Linking`). |
| **Navigation des 5 sections** | Depuis la **barre inférieure**, routes **réelles** de la plateforme (`/dashboard/profile`, `/dashboard/projects`, `/dashboard`, `/dashboard/reports`, `/dashboard/messages`) via `history.pushState` + `popstate` : la WebView n'est pas recréée, la session reste active. « Mes projets » ouvre la **page dédiée `/dashboard/projects`** (tous les projets de l'utilisateur connecté : en cours, terminés, réalisés, archivés) ; l'onglet reste actif pendant la consultation d'un projet ouvert depuis cette liste. « Home » reste l'accueil connecté (`/dashboard`). « **Rapport** » ouvre la page **Rapports PDF `/dashboard/reports`** (consulter / télécharger les PDF des projets) et porte l'icône `FileDown` — la même que l'entrée « Rapports PDF » du menu de la plateforme. L'ancien onglet « ROI » (`/dashboard/investments`) n'est plus dans le menu mobile : l'analyse de rentabilité reste accessible depuis le projet. |
| **Pastille de la Messagerie** | Pastille **rouge** (composant réutilisable `NavBadge.tsx`) posée en haut à droite de l'icône « Message » : texte blanc, cerclage blanc (lisible en mode clair comme sombre), **jamais de déplacement des autres icônes** (positionnement absolu), plafond **« 99+ »** et **rien du tout à 0**. Le compteur vient du **serveur** : la plateforme Web, chargée dans la WebView, publie en **temps réel** le nombre de messages non lus de l'utilisateur connecté (`api.messaging.unreadCount` → `src/lib/nativeBridge.ts` → `postMessage`, lue par `WebViewScreen`) — donc **sans rechargement** et sans pastille « 0 » fantôme au démarrage. En cas d'erreur de synchronisation, le dernier compteur fiable reste affiché. Ouvrir la messagerie marque les messages comme lus : la pastille disparaît dès que tout est lu. |
| **Support / Paramètres** | Barre supérieure → `/dashboard/support` et `/dashboard/settings` (mêmes routes web, aucun écran dupliqué). |
| **Retour Android** | Historique WebView → page précédente ; sinon confirmation « Voulez-vous quitter batibuild ? » (Annuler / Quitter). |
| **Chargement** | Écran de chargement natif (logo officiel + « Chargement.... » + barre de progression), **borné à 1 s** — jamais de page blanche ni de loader bloqué. |
| **Hors ligne / erreurs** | Écran natif « Connexion Internet indisponible » / « Impossible de charger batibuild » + bouton **Réessayer** (codes `ERR_*` mappés en messages lisibles). |
| **Upload** | `<input type="file">` natif : galerie, photo (caméra), fichiers (permissions CAMERA / READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE). |
| **Téléchargements** | PDF et documents : écrits dans le cache puis remis à la feuille de partage native (`expo-file-system` + `expo-sharing`) — l'utilisateur enregistre (Fichiers, Drive…) ou envoie le fichier. Deux sources : une URL `http(s)://` (`onFileDownload`) **et** les fichiers fabriqués dans le navigateur (PDF jsPDF, exports CSV/texte), qui utilisent une URL `blob:` — voir la note ci-dessous. |
| **PDF « blob: » (Android)** | Les PDF de l'estimation du coût de construction et de l'analyse des matériaux IA sont générés **dans la page** (jsPDF) puis « téléchargés » par une URL `blob:`, que la WebView Android ne sait pas écrire sur le disque (le clic ne produisait donc aucun fichier). Un pont injecté (`DOWNLOAD_BRIDGE_SCRIPT` dans `src/injected.ts`) capture le Blob au clic et l'envoie en **base64 par morceaux de 256 Ko** au code natif (`src/download.ts`), qui reconstitue le fichier, l'écrit dans le cache et ouvre la feuille de partage Android. Mémoire bornée (~32 Mo max, morceaux hors limite rejetés) et transferts interrompus oubliés au bout d'une minute. Aucun fichier Web ni backend n'est modifié. |
| **Partage natif** | `navigator.share` de la plateforme Web est intercepté et ouvre le menu de partage natif (WhatsApp, e-mail, messages…). |
| **Safe Area** | Contenu WebView entre l'en-tête natif (qui gère l'inset haut : barre de statut / encoche) et la **barre de navigation inférieure** (qui gère l'inset bas : barre système Android, gestes, encoche). Aucune surface flottante ne recouvre le contenu. |

## 3. Prérequis

- **Node.js 20.19.4+** (22 LTS conseillé) et **Bun** (ou npm) — pas de compte Expo
- **JDK 17** (Temurin) + **Android SDK** (Android Studio) pour le build Android local
- **macOS + Xcode** pour iOS uniquement
- Aucun compte Expo, aucun `EXPO_TOKEN`, aucun service cloud

Détails d'installation : [`../MOBILE_BUILD.md`](../MOBILE_BUILD.md) §1 à §5.

## 4. Démarrage local

```bash
cd mobile
npm install

# Serveur de développement local (Metro) — aucun service cloud
npm run start

# Compilation + installation natives (100 % local)
npm run android           # nécessite JDK 17 + Android SDK
npm run ios               # nécessite macOS + Xcode
```

L'URL de la plateforme est définie **une seule fois** dans `src/config.ts`
(par défaut : `https://budgetbati.freebuff.app/` ; surcharge possible via
`EXPO_PUBLIC_WEB_APP_URL`). C'est aussi ce fichier qui contient les 5 destinations
de la barre de navigation inférieure et le message de chargement.

Dépendances ajoutées pour la coque native : **`lucide-react-native`** + **`react-native-svg`**
(icônes et tracés SVG — mêmes icônes que la plateforme Web, version `react-native-svg`
alignée sur Expo SDK 57). Aucun service cloud n'est introduit : les icônes sont
embarquées dans le bundle et rendues hors ligne.

## 5. Build Android — APK / AAB (100 % local)

> ⭐ Pour obtenir l'APK **sans rien installer**, utilisez GitHub Actions (§9).
> Cette section ne sert qu'au build local (débogage hors CI).

Prérequis : **JDK 17** + **Android SDK** (Android Studio) — voir
[`../MOBILE_BUILD.md`](../MOBILE_BUILD.md) §2 et §4.

```bash
cd mobile
npm run android:debug    # → build/Batibuild-debug.apk
npm run android:apk      # → build/Batibuild-release.apk
npm run android:aab      # → build/Batibuild-release.aab
npm run android:install  # adb install du dernier APK
npm run android:clean    # ./gradlew clean
```

Les sorties Gradle d'origine restent disponibles :
`android/app/build/outputs/apk/{debug,release}/` et `.../bundle/release/`.

**Build plus rapide** (téléphones réels uniquement) :
`ARCHS=arm64-v8a,armeabi-v7a npm run android:apk`.

**Clé debug** : `android/app/build.gradle` référence `app/debug.keystore`. Ce
fichier est **versionné** (clé debug standard d'Android : alias
`androiddebugkey`, mot de passe `android` — ce n'est pas un secret). S'il manque,
le build échoue sur `:app:validateSigningDebug` ; le script de build et la CI le
régénèrent automatiquement (`npm run keystore:debug` pour le faire à la main).

**Signature Release** : l'APK/AAB release est signé avec votre clé Release si
`android/keystore.properties` existe (ou via les variables
`ANDROID_KEYSTORE_PATH` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS`) ;
sinon il est signé avec la clé debug (installable pour tester, mais refusé par
Google Play). Créez votre keystore local avec `npm run keystore:generate`
(voir [`../MOBILE_BUILD.md`](../MOBILE_BUILD.md) §11).

> Après une modification d'`app.json` : `npm run android:prebuild`
> puis `npm run signing:apply` (le prebuild écrase `build.gradle`).

Aucun EAS, aucun compte Expo, aucun build cloud.

## 6. Build iOS — TestFlight / App Store (macOS uniquement)

```bash
cd mobile
npm run prebuild            # génère ios/ (CNG)
npx expo run:ios            # compile + lance sur simulateur / appareil
```

Pour distribuer : ouvrez `mobile/ios/*.xcworkspace` dans **Xcode**, configurez
votre équipe de signature (compte Apple Developer requis), puis
**Product → Archive → Distribute App** (TestFlight / App Store Connect).

Aucun service cloud de compilation n'est utilisé.

## 7. Identifiants

| | Valeur |
|---|---|
| Nom de l'application | batibuild |
| Package Android | `com.batibuild.app` |
| Bundle ID iOS | `com.batibuild.app` |
| Version | **1.3.2** — `versionCode 12` (Android), `buildNumber 3` (iOS). À incrémenter **dans `app.json` ET dans `android/app/build.gradle`** (`versionCode` / `versionName`) avant chaque nouvelle APK destinée à une mise à jour : Android n'accepte pas d'installer par-dessus une APK de `versionCode` inférieur. |
| Contenu de la 1.3.2 | **Régénération complète de l'application Android** : le projet natif `android/` est reconstruit depuis `app.json` (`expo prebuild`) — `versionCode 12`, `versionName 1.3.2`, manifest et icônes resynchronisés — puis la clé debug est assurée et la signature Release réappliquée. Une seule commande régénère tout de bout en bout : `PREBUILD=1 npm run android:apk` (projet natif → signature → pré-vérifications → Gradle → vérification de l'artefact). |
| Contenu de la 1.3.1 | **Menu mobile** : l'onglet « ROI » est remplacé par « **Rapport** » (icône `FileDown`, page existante **Rapports PDF** `/dashboard/reports`) ; « Projets » devient « **Mes projets** » (`/dashboard/projects`, uniquement les projets de l'utilisateur connecté) ; la pastille rouge de « Message » reste alimentée par le serveur (temps réel, « 99+ »). **Build Android renforcé** : pré-vérifications obligatoires (`npm run android:preflight`) et vérification de l'artefact (`npm run android:verify`) — aucune APK vide, tronquée, incomplète ou non signée ne peut plus être publiée (bandeaux `BUILD SUCCESS` / `BUILD FAILED`). |
| Contenu de la 1.3.0 | **Retour de la barre de navigation inférieure** : le menu horizontal de l'en-tête est supprimé et remplacé par une **barre de navigation fixe en bas de l'écran** (`BottomNav.tsx`) — Profile · Projets · Home · ROI · Message, mêmes routes et mêmes icônes, élément actif clairement identifié (teinte de marque + indicateur émeraude), safe area basse gérée, onglets de largeur égale (aucun débordement). L'en-tête natif est réduit au nécessaire (marque, Support, Paramètres) et la barre ne recouvre jamais le contenu de la page. |
| Contenu de la 1.2.0 | *(remplacé en 1.3.0)* Menu de navigation horizontal scrollable dans l'en-tête, en remplacement de la barre du bas. |
| Contenu de la 1.1.3 | Barre du bas (supprimée en 1.2.0) : libellés **Profile · Projets · Home · ROI · Message** ; l'onglet **ROI** (analyse du retour sur investissement, `/dashboard/investments`) porte l'icône `TrendingUp`, identique à l'action « Return on Investment » de la page Résultats coût de construction. |
| Contenu de la 1.1.2 | Retour de la barre du bas à sa **capsule flottante** (design précédent) — la refonte « barre plate » est annulée ; icônes 19 pt / libellés 10,5 pt conservés, onglet actif en émeraude de marque. |
| Contenu de la 1.1.1 | Barre du bas **plus compacte** : icônes fines **19 pt** et libellés **10,5 pt**, hauteur d'onglet réduite (40 pt). |
| Contenu de la 1.1.0 | Barre affichée **uniquement sur `/dashboard`** ; téléchargement des **PDF générés dans la page** (estimation du coût de construction, matériaux IA) via le pont natif ; guide d'accueil libellé d'après les noms actuels de la plateforme. |

## 8. Permissions (déclarées)

- **Caméra** — photos de chantier/terrain depuis l'upload de la plateforme
- **Galerie / stockage** — import photos, plans, croquis ; enregistrement des téléchargements
- **Localisation** — estimation des coûts selon la région (Tunisie)

Descriptions iOS complètes dans `app.json` → `ios.infoPlist`.

> ℹ️ `expo-doctor` affiche volontairement le contrôle
> `appConfigFieldsNotSyncedCheck` comme désactivé (`package.json` → `expo.doctor`) :
> le projet natif `android/` est **commité exprès** pour permettre le build Gradle
> direct. La synchronisation depuis `app.json` se fait explicitement avec
> `npm run android:prebuild` (voir [`../MOBILE_BUILD.md`](../MOBILE_BUILD.md) §6).

## 9. Build automatique — GitHub Actions ⭐ (rien à installer sur votre PC)

`.github/workflows/android.yml` construit **tout sur le runner GitHub** : aucun
JDK, Android SDK, Android Studio ou Gradle n'est requis localement.

```
git push origin main
      ↓
Actions → « Android — APK & AAB »
      ↓
Install deps → prebuild (si android/ absent) → Android SDK du projet
      ↓
clé debug (assurée) → signingReport → assembleDebug · assembleRelease · bundleRelease
      ↓
Artifact : batibuild-v<version>-code<versionCode>-run<N>
           (APK debug + APK release + AAB release — conservé 5 jours)
      ↓  (si le run vient d'un tag `v*`)
GitHub Release v<version> : APK release + AAB release + APK debug attachés
           (conservée durablement — hors quota d'artefacts)
```

Le **résumé du run** affiche la version réellement compilée (`1.3.2 — versionCode 12`),
le nom de l'artefact publié, la taille de chaque fichier, les ABI compilées et la
commande d'installation (`adb install -r Batibuild-release.apk`).

> **Quota d'artefacts** — l'erreur
> `Failed to CreateArtifact: Artifact storage quota has been hit` vient du
> stockage GitHub Actions, pas du code : les 3 fichiers sont publiés dans **un
> seul artefact**, conservé **5 jours**, et un job **`cleanup-artifacts`**
> supprime avant chaque build les anciens artefacts temporaires (jamais les
> sources, le code ni les releases). Si le quota est déjà saturé, supprimez les
> anciens artefacts dans *Actions → run → Artifacts* puis relancez le workflow.
>
> Pour **conserver un build durablement**, posez un tag `v*` : il est publié en
> GitHub Release, en dehors de ce quota (voir « Publier une Release » plus bas).

### Déclencher

- **Automatique** : `push` sur `main` dès qu'un fichier de `mobile/` change.
- **Manuel** : *Actions → Android — APK & AAB → Run workflow*
  (choix des ABI, option « forcer `expo prebuild` », option « publier une
  Release »).
- **Release** : `git tag v1.3.2 && git push origin v1.3.2` → build puis
  publication de la Release `v1.3.2` avec les APK/AAB attachés.

### Récupérer l'APK

Ouvrez le run ✅ → section **Artifacts** en bas de page → téléchargez
`batibuild-v…-code…-run…` (archive contenant `Batibuild-debug.apk`,
`Batibuild-release.apk` et `Batibuild-release.aab`) → extrayez
`Batibuild-release.apk` → copiez-le sur le téléphone et installez-le.

L'artefact reste téléchargeable **5 jours** (rétention configurable au lancement
manuel via l'entrée `retention_days`) ; le build précédent est conservé jusqu'au
suivant, les plus anciens sont nettoyés automatiquement avant chaque build.

### Publier une Release (conservation durable) ⭐

Le stockage d'artefacts est limité et partagé : pour garder un build par
version, attachez-le à une **GitHub Release**, dont le stockage est distinct et
bien plus large.

```bash
git tag v1.3.2 && git push origin v1.3.2
```

| Déclencheur | Résultat |
|---|---|
| Tag **`v*`** poussé | Release **`v1.3.2`** (APK release, AAB release, APK debug) |
| *Run workflow* + **publish_release** | Release **`v<version>-build<run>`**, marquée pré-version, créée sur le commit lancé |
| `push` sur `main` | Aucune Release |

- Le tag **doit** correspondre à `expo.version` de `app.json` : sinon la
  publication est refusée (pas de Release trompeuse).
- Un tag `v1.3.3-rc1` produit une **pré-version**.
- La Release est publiée **même si le quota d'artefacts bloque l'upload** de
  l'artefact du run — c'est justement là qu'elle est utile.
- Relancer le workflow sur le même tag met à jour les fichiers (`--clobber`).
- Le **résumé du run** affiche le lien de la Release ; les notes de version
  contiennent les **empreintes SHA-256** des trois fichiers.
- Vérification hors ligne : `cd mobile && bash scripts/publish-release.sh --dry-run`.

### Ce que le workflow installe lui-même

| Composant | Source |
|---|---|
| Node.js 22 LTS + Bun | `actions/setup-node`, `oven-sh/setup-bun` |
| JDK 17 (Temurin) | `actions/setup-java` |
| Android SDK / cmdline-tools / licences | `android-actions/setup-android` |
| platform 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1, platform-tools | `sdkmanager` — versions lues dans le projet (`node_modules/react-native/gradle/libs.versions.toml`) |
| Dépendances JS | `bun install --frozen-lockfile` (ou `npm ci` si un `package-lock.json` apparaît) |
| Gradle | **wrapper du dépôt** (`./gradlew`, version épinglée 9.3.1) |

### Signature debug (obligatoire, automatique)

`android/app/build.gradle` référence `app/debug.keystore` : le workflow l'assure
avant tout build (`node scripts/ensure-debug-keystore.mjs`, la clé debug standard
d'Android est versionnée dans le dépôt) puis lance `:app:signingReport`, qui
détecte en quelques secondes toute configuration pointant vers un fichier absent
— au lieu d'échouer après 15 minutes de compilation.

### Signature Release (optionnelle)

Secrets GitHub *Settings → Secrets and variables → Actions* : `KEYSTORE_BASE64`,
`KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`. Le keystore est décodé hors du dépôt
(`$RUNNER_TEMP`) puis validé par `keytool` **avant** le build.

Sans secrets, le workflow réussit quand même : l'APK/AAB release est signé avec
la clé debug (installable pour tester, refusé par Google Play). Aucun secret
n'est jamais affiché dans les logs ; aucun `EXPO_TOKEN` n'est utilisé.

### Notes CI

- Aucun crédit / compte cloud consommé : on exécute `./gradlew` sur le runner.
- Le workflow cible `arm64-v8a,armeabi-v7a` (téléphones réels) pour tenir dans
  la mémoire du runner ; en local, les 4 ABI restent actives.
- Avant la compilation, le runner **libère de l'espace disque** (NDK non
  utilisés, images d'émulateur, sources, anciennes platforms/build-tools) et
  limite la compilation C++ à 2 processus parallèles
  (`CMAKE_BUILD_PARALLEL_LEVEL=2`) : sans cela, les 2 ABI compilées en parallèle
  saturent la RAM et le noyau tue les compilateurs (`Killed`).
- **Artefacts** : un seul artefact par build (nom unique : version, versionCode,
  numéro de run), `retention-days` explicite, publication confirmée via l'API
  GitHub, et nettoyage automatique des anciennes générations avant le build
  (`mobile/scripts/artifact-storage.mjs`) — le quota de stockage d'artefacts ne
  peut plus bloquer la publication d'un APK.
- **GitHub Release** : sur un tag `v*` (ou sur demande), les APK/AAB sont
  attachés à une Release par `mobile/scripts/publish-release.sh` — conservation
  durable, indépendante du quota d'artefacts. Le job de build porte pour cela la
  permission `contents: write` ; aucune Release n'est publiée sur un push de
  branche.
- **Actions Node 24** : `checkout@v5`, `setup-node@v5`, `setup-java@v5`,
  `cache@v6`, `upload-artifact@v7` (Node 20 a été retiré des runners GitHub) —
  plus d'avertissement « Node.js 20 actions are deprecated ».
- **Si un run échoue**, la cause réelle est extraite automatiquement par
  `mobile/scripts/ci-gradle.sh` (section `* What went wrong:`, tâches en échec,
  signatures OOM/disque/CMake) et publiée dans l'étape
  « 🔍 Cause de l'échec » + le **résumé du run** — plus besoin de lire 900
  lignes de stacktrace.
- **URL de la plateforme** : définie une seule fois dans `src/config.ts`
  (surcharge possible via `EXPO_PUBLIC_WEB_APP_URL`).

## 10. Notes & dépannage

- **Les guides ne réapparaissent pas** après mise à jour : normal — le flag `onboardingCompleted`
  est persistant. Ils réapparaissent après **désinstallation/réinstallation** (stockage effacé),
  ou immédiatement via l'appui long sur la marque de l'en-tête → « Voir le guide ».
- **La barre du bas a disparu d'une page** : elle est masquée sur `/auth` (connexion /
  inscription) et sur l'accueil public — c'est volontaire ; elle réapparaît dès l'entrée dans
  l'espace connecté.
- **Un lien externe s'ouvre dans le WebView** : seuls les hôtes `*.freebuff.app` restent
  internes ; tout autre domaine est routé vers le navigateur système.
- **Le téléchargement ne se partage pas** : sur iOS, certains documents s'affichent dans la
  WebView (lecture intégrée) ; les PDF servis en pièce jointe déclenchent la feuille de partage.
- **Les PDF (estimation du coût, matériaux IA) ne se téléchargeaient pas** : c'est corrigé —
  ces PDF sont fabriqués dans la page (`blob:`) et passent désormais par le pont natif
  (`src/download.ts`), qui les écrit puis ouvre la feuille de partage Android. Enregistrez le
  fichier depuis cette feuille (Fichiers, Drive…) ou envoyez-le directement.
- **Le menu de navigation est dans la barre du bas** : les 5 sections (Profile · **Mes projets** ·
  Home · **Rapport** · Message) sont dans la **barre fixe inférieure**, visible sur toutes les pages de
  l'espace connecté et masquée uniquement sur la connexion / inscription et l'accueil public.
- **Aucune pastille rouge sur « Message »** : elle n'apparaît que si des messages non lus
  existent réellement pour l'utilisateur connecté (compteur du serveur). Ouvrir la messagerie
  les marque comme lus et fait disparaître la pastille ; il n'y a jamais de badge « 0 ».
- **La barre du bas ne recouvre pas le contenu** : elle est rendue après la WebView dans la
  colonne racine — la page occupe exactement la hauteur restante, aucun padding n'est à ajouter.
- **Modifier le projet natif** : `android/` est **commité** ; après un changement
  d'`app.json`, resynchroniser avec `npm run android:prebuild` puis réappliquer la
  signature : `npm run signing:apply`. `ios/` est en CNG (régénéré par
  `expo prebuild` sur macOS).
- **Note de build** : les APK/AAB sont produits **par GitHub Actions**
  (`.github/workflows/android.yml` → Artifacts du run, aucun outil Android sur
  votre PC) ou, localement, par Gradle (`npm run android:apk`). Aucun EAS.