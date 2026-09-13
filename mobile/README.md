# BatiBuild — Application Mobile (Android + iOS)

Application mobile **native** (React Native / Expo SDK 57) qui embarque la plateforme
[BatiBuild](https://budgetbati.freebuff.app/) dans une **WebView optimisée**, avec un
**Splash Screen** (≤ 1 s), un **en-tête natif** (marque, Support / Paramètres et **menu de
navigation horizontal scrollable**) et un **Guide d'onboarding** natifs au premier lancement.
Aucune barre de navigation en bas de l'écran.

```
Première installation :  Splash (≤ 1 s)  →  7 guides (Suivant / Passer)  →  WebView BatiBuild
Lancements suivants :    Splash (≤ 1 s)  →  WebView BatiBuild
```

### Coque native (Material Design 3)

```
Android Native Shell
│
├── Splash  « Chargement.... »  (fond BLANC, ≤ 1 s, jamais bloquant)
│      L'écran de démarrage natif est BLANC et SANS image : le logo sur fond
│      vert qui s'affichait avant le chargement a été supprimé.
│
├── 7 guides de démarrage  (1ʳᵉ installation uniquement)
│      1. Évitez les surcoûts            5. Investissez sans risque
│      2. Devis clé en main              6. Suivez l'évolution des prix
│      3. Choisissez les meilleurs       7. Trouvez les bons prestataires
│         matériaux
│      4. Ne perdez plus une seule étape
│
├── Header natif  (fond blanc)
│      Ligne 1 : Logo + « batibuild App »   Support   Paramètres   (aucun burger)
│      Ligne 2 : MENU DE NAVIGATION horizontal scrollable —
│                Profile · Projets · Home · ROI · Message
│      → visible dans TOUT l'espace connecté (/dashboard et ses sous-pages) ;
│        masqué uniquement sur la connexion / inscription et l'accueil public ;
│      → défile de gauche à droite dès que les éléments ne tiennent pas à
│        l'écran : aucun élément coupé, masqué ni déformé.
│
└── WebView  →  plateforme Batibuild (inchangée)
```

L'en-tête est **natif** : il ne défile pas avec le contenu, gère lui-même la zone système
haute (barre de statut / encoche) et n'entraîne **jamais** le rechargement de la WebView
(donc session, cookies, état et historique préservés). Son **menu de navigation**
(`HeaderNav.tsx`) aligne les 5 sections (`Profile · Projets · Home · ROI · Message`) dans une
rangée **horizontalement scrollable** : chaque élément garde sa largeur naturelle (icône
lucide 15 pt + libellé 12 pt) — rien n'est coupé, tronqué ni déformé — et la rangée défile
au doigt dès que la place manque. L'élément **actif** est mis en évidence (fond
`primaryContainer` émeraude, icône et libellé en teinte de marque, libellé en gras),
les autres restent en gris ; l'état pressé applique un léger voile neutre, comme les
boutons de l'en-tête. Contrairement à l'ancienne barre du bas — qui recouvrait le contenu
sur les pages de résultats et avait dû être masquée hors `/dashboard` — le menu vit dans
l'en-tête et reste donc accessible **partout** dans l'espace connecté, sans empiéter sur le
contenu Web ni consommer la zone système basse.

### Icônes harmonisées avec la plateforme

Toute la coque native (en-tête, menu de navigation, guide, écran d'erreur) utilise
**la même famille d'icônes que le tableau de bord de la plateforme : lucide**
(`lucide-react-native`, via le module unique `src/components/icons.ts`) :

| Élément | Icône |
|---|---|
| Profile | `User` |
| Projets | `HardHat` |
| Home | `LayoutDashboard` |
| ROI | `TrendingUp` (celle de l'action « Return on Investment » de la page Résultats coût de construction) |
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
Web est **masqué** : l'en-tête natif fournit déjà la marque, les actions (Support /
Paramètres) et le menu de navigation. C'est une simple feuille
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
│   │   ├── OnboardingScreen.tsx   # Parcours de 7 guides (image + titre + texte) + Passer
│   │   └── WebViewScreen.tsx      # WebView BatiBuild (toutes les options)
│   ├── components/
│   │   ├── icons.ts               # Jeu d'icônes UNIQUE (lucide) : en-tête, guides, erreurs
│   │   ├── Logo.tsx               # Logo officiel de la plateforme (tuile émeraude + casque blanc)
│   │   ├── TopNav.tsx             # En-tête natif : logo + nom, Support, Paramètres + menu
│   │   ├── HeaderNav.tsx          # Menu de navigation horizontal scrollable (5 sections)
│   │   └── GuideIllustrations.tsx # 7 illustrations dédiées (scènes vectorielles SVG)
│   ├── download.ts                # Téléchargements natifs : URL http(s) ET PDF « blob: »
│   ├── storage.ts                 # onboardingCompleted (AsyncStorage)
│   ├── theme.ts                   # Jetons Material 3 (clair / sombre) issus de la charte BatiBuild
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
| **Changement de section (menu de l'en-tête)** | **Aucun écran de chargement** : le changement est direct, la WebView n'est pas recréée. |
| **Menu de navigation (en-tête)** | **Menu horizontal scrollable** intégré à l'en-tête (`HeaderNav.tsx`) : 5 sections (Profile · Projets · Home · ROI · Message), icône **lucide 15 pt** + libellé **12 pt** dans une puce arrondie, **jamais coupés ni déformés** (largeur naturelle + défilement au doigt sur Android et iPhone). **Fond de la barre : BLANC (#FFFFFF) dans tous les états et dans les trois modes d'affichage.** Élément **actif** : **anneau émeraude** (fond blanc conservé), icône et libellé en teinte de marque, libellé en gras ; inactifs en gris ; état pressé = léger retrait (opacité + échelle), sans fond de couleur. **Aucune barre de navigation en bas de l'écran** : le menu vit dans l'en-tête et reste donc visible dans tout l'espace connecté — voir `shouldShowHeaderNav()` dans `src/config.ts`. |
| **En-tête (natif)** | Fond **blanc**, logo officiel + wordmark de la plateforme (« batibuild App ») à gauche, icônes **Support** et **Paramètres** à droite. Aucun menu burger — celui de l'en-tête web est masqué dans l'application. **Appui long sur la marque** (ou sur le menu) → réglages natifs. |
| **Thème natif** | Material Design 3 clair / sombre / système (`useColorScheme`), sans toucher au thème de la plateforme Web. Les icônes étant des SVG (lucide), elles conservent exactement le même dessin et un contraste correct dans les trois modes. |
| **Guides de démarrage** | **7 guides**, un seul parcours (les anciens écrans d'introduction ont été supprimés) : **Évitez les surcoûts · Devis clé en main · Choisissez les meilleurs matériaux · Ne perdez plus une seule étape · Investissez sans risque · Suivez l'évolution des prix · Trouvez les bons prestataires**. Chaque guide = **illustration dédiée** + **titre** + **texte descriptif** + indicateur **« n / 7 »** (pastilles) + bouton **Suivant** (puis **Commencer** au 7ᵉ) + bouton **Passer**. Les illustrations sont des **scènes vectorielles dessinées pour BatiBuild** (`GuideIllustrations.tsx`, voir la note ci-dessous). Mémorisé via `onboardingCompleted` (AsyncStorage). |
| **Illustrations des guides** | Aucune image générique, aucun placeholder, aucune icône seule : chaque guide affiche une **scène SVG dédiée** (détection IA sur le plan, convergence import → IA → devis, comparaison Économique / Équilibré / Premium, 10 phases de chantier, ROI 1/5/10 ans + score IA + scénarios, 500+ matériaux et courbe des prix, annuaire vérifié + carte des régions). Elles sont **vectorielles donc nettes sur tous les écrans**, suivent le **thème clair / sombre / système** et n'entraînent **aucun téléchargement**. |
| **Réinstallation** | Le stockage local est effacé → les guides réapparaissent (comportement attendu). |
| **Mise à jour** | `onboardingCompleted` est conservé → pas de guides à chaque mise à jour. |
| **Revoir le guide** | **Appui long** sur la marque de l'en-tête (ou sur n'importe quelle entrée du menu de navigation) → « Voir le guide » (ne supprime aucune donnée). Aucun bouton supplémentaire n'est ajouté à l'écran. |
| **Session** | Cookies, stockage local, cache persistants entre les lancements (`sharedCookiesEnabled`, `thirdPartyCookiesEnabled`, `cacheEnabled`, `domStorageEnabled`). |
| **Navigation interne** | Toutes les pages `*.freebuff.app` restent dans la WebView. |
| **Liens externes** | Sites partenaires, réseaux sociaux, documents externes → navigateur système (`Linking`). |
| **Navigation des 5 sections** | Routes **réelles** de la plateforme (`/dashboard/profile`, `/dashboard`, `/dashboard/investments`, `/dashboard/messages`) via `history.pushState` + `popstate` : la WebView n'est pas recréée, la session reste active. « Projets » et « Home » ouvrent tous les deux `/dashboard` ; l'onglet actif suit le dernier onglet choisi. « ROI » ouvre `/dashboard/investments` (analyse du retour sur investissement) et porte l'icône `TrendingUp`, la même que l'action « Return on Investment » de la page Résultats coût de construction. |
| **Support / Paramètres** | Barre supérieure → `/dashboard/support` et `/dashboard/settings` (mêmes routes web, aucun écran dupliqué). |
| **Retour Android** | Historique WebView → page précédente ; sinon confirmation « Voulez-vous quitter BatiBuild ? » (Annuler / Quitter). |
| **Chargement** | Écran de chargement natif (logo officiel + « Chargement.... » + barre de progression), **borné à 1 s** — jamais de page blanche ni de loader bloqué. |
| **Hors ligne / erreurs** | Écran natif « Connexion Internet indisponible » / « Impossible de charger BatiBuild » + bouton **Réessayer** (codes `ERR_*` mappés en messages lisibles). |
| **Upload** | `<input type="file">` natif : galerie, photo (caméra), fichiers (permissions CAMERA / READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE). |
| **Téléchargements** | PDF et documents : écrits dans le cache puis remis à la feuille de partage native (`expo-file-system` + `expo-sharing`) — l'utilisateur enregistre (Fichiers, Drive…) ou envoie le fichier. Deux sources : une URL `http(s)://` (`onFileDownload`) **et** les fichiers fabriqués dans le navigateur (PDF jsPDF, exports CSV/texte), qui utilisent une URL `blob:` — voir la note ci-dessous. |
| **PDF « blob: » (Android)** | Les PDF de l'estimation du coût de construction et de l'analyse des matériaux IA sont générés **dans la page** (jsPDF) puis « téléchargés » par une URL `blob:`, que la WebView Android ne sait pas écrire sur le disque (le clic ne produisait donc aucun fichier). Un pont injecté (`DOWNLOAD_BRIDGE_SCRIPT` dans `src/injected.ts`) capture le Blob au clic et l'envoie en **base64 par morceaux de 256 Ko** au code natif (`src/download.ts`), qui reconstitue le fichier, l'écrit dans le cache et ouvre la feuille de partage Android. Mémoire bornée (~32 Mo max, morceaux hors limite rejetés) et transferts interrompus oubliés au bout d'une minute. Aucun fichier Web ni backend n'est modifié. |
| **Partage natif** | `navigator.share` de la plateforme Web est intercepté et ouvre le menu de partage natif (WhatsApp, e-mail, messages…). |
| **Safe Area** | Contenu WebView sous l'en-tête natif, qui gère lui-même l'inset haut (barre de statut / encoche). Aucune barre basse n'occupe plus la zone système basse. |

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
du menu de navigation de l'en-tête et le message de chargement.

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
| Nom de l'application | BatiBuild |
| Package Android | `com.batibuild.app` |
| Bundle ID iOS | `com.batibuild.app` |
| Version | **1.2.1** — `versionCode 8` (Android), `buildNumber 1` (iOS). À incrémenter **dans `app.json` ET dans `android/app/build.gradle`** (`versionCode` / `versionName`) avant chaque nouvelle APK destinée à une mise à jour : Android n'accepte pas d'installer par-dessus une APK de `versionCode` inférieur. |
| Contenu de la 1.2.1 | **Fond du menu de navigation = BLANC** (`HeaderNav.tsx`) : la barre est peinte en `#FFFFFF` et **aucune surface de couleur n'est appliquée aux onglets** — la pastille émeraude de l'onglet actif est remplacée par un **anneau émeraude** (fond blanc conservé), et l'état pressé n'est plus un voile gris mais un léger retrait (opacité + échelle), ondulation Android désactivée. La barre reste blanche en mode clair, sombre et système. |
| Contenu de la 1.2.0 | **Refonte de la navigation** : toutes les barres de navigation inférieures sont supprimées ; leurs sections passent dans un **menu horizontal scrollable de l'en-tête** (`HeaderNav.tsx`) — Profile · Projets · Home · ROI · Message, mêmes routes et mêmes icônes, élément actif en émeraude, aucun élément coupé, visible dans tout l'espace connecté. Réglages natifs : appui long sur la marque de l'en-tête. |
| Contenu de la 1.1.3 | Barre du bas (supprimée en 1.2.0) : libellés **Profile · Projets · Home · ROI · Message** ; l'onglet **ROI** (analyse du retour sur investissement, `/dashboard/investments`) porte l'icône `TrendingUp`, identique à l'action « Return on Investment » de la page Résultats coût de construction. |
| Contenu de la 1.1.2 | Retour de la barre du bas à sa **capsule flottante** (design précédent) — la refonte « barre plate » est annulée ; icônes 19 pt / libellés 10,5 pt conservés, onglet actif en émeraude de marque. |
| Contenu de la 1.1.1 | Barre du bas **plus compacte** : icônes fines **19 pt** et libellés **10,5 pt**, hauteur d'onglet réduite (40 pt). |
| Contenu de la 1.1.0 | Barre affichée **uniquement sur `/dashboard`** ; téléchargement des **PDF générés dans la page** (estimation du coût de construction, matériaux IA) via le pont natif ; guide d'accueil (7 étapes) libellé d'après les noms actuels de la plateforme. |

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
Artifacts : Batibuild-debug.apk · Batibuild-release.apk · Batibuild-release.aab
```

Le **résumé du run** affiche la version réellement compilée (`1.1.0 — versionCode 3`),
la taille de chaque fichier, les ABI compilées et la commande d'installation
(`adb install -r Batibuild-release.apk`).

### Déclencher

- **Automatique** : `push` sur `main` dès qu'un fichier de `mobile/` change.
- **Manuel** : *Actions → Android — APK & AAB → Run workflow*
  (choix des ABI, option « forcer `expo prebuild` »).

### Récupérer l'APK

Ouvrez le run ✅ → section **Artifacts** en bas de page → téléchargez
`Batibuild-release.apk` → copiez-le sur le téléphone et installez-le.

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
- **Écran « Connexion Internet indisponible »** : la WebView ne charge pas ; vérifiez la
  connexion puis touchez **Réessayer** (recharge complète).
- **Un lien externe s'ouvre dans le WebView** : seuls les hôtes `*.freebuff.app` restent
  internes ; tout autre domaine est routé vers le navigateur système.
- **Le téléchargement ne se partage pas** : sur iOS, certains documents s'affichent dans la
  WebView (lecture intégrée) ; les PDF servis en pièce jointe déclenchent la feuille de partage.
- **Les PDF (estimation du coût, matériaux IA) ne se téléchargeaient pas** : c'est corrigé —
  ces PDF sont fabriqués dans la page (`blob:`) et passent désormais par le pont natif
  (`src/download.ts`), qui les écrit puis ouvre la feuille de partage Android. Enregistrez le
  fichier depuis cette feuille (Fichiers, Drive…) ou envoyez-le directement.
- **Le menu de navigation est dans l'en-tête** : il remplace l'ancienne barre du bas, qui a été
  supprimée. Il défile horizontalement si les 5 sections ne tiennent pas à l'écran et reste
  visible sur toutes les pages de l'espace connecté ; il est masqué uniquement sur la
  connexion / inscription et l'accueil public.
- **Modifier le projet natif** : `android/` est **commité** ; après un changement
  d'`app.json`, resynchroniser avec `npm run android:prebuild` puis réappliquer la
  signature : `npm run signing:apply`. `ios/` est en CNG (régénéré par
  `expo prebuild` sur macOS).
- **Note de build** : les APK/AAB sont produits **par GitHub Actions**
  (`.github/workflows/android.yml` → Artifacts du run, aucun outil Android sur
  votre PC) ou, localement, par Gradle (`npm run android:apk`). Aucun EAS.