# BatiBuild — Application Mobile (Android + iOS)

Application mobile **native** (React Native / Expo SDK 57) qui embarque la plateforme
[BatiBuild](https://budgetbati.freebuff.app/) dans une **WebView optimisée**, avec un
**Splash Screen** (≤ 1 s), une **barre de navigation basse** Material Design 3 et un
**Guide d'onboarding** natifs au premier lancement.

```
Première installation :  Splash (≤ 1 s)  →  Guide (4 écrans / Passer)  →  WebView BatiBuild
Lancements suivants :    Splash (≤ 1 s)  →  WebView BatiBuild
```

### Coque native (Material Design 3)

```
Android Native Shell
│
├── Splash  « Chargement.... »  (≤ 1 s, jamais bloquant)
│
├── Bottom Navigation  (5 sections, fixe, libellés toujours visibles)
│      Mon profil · Projets · Investissements · Messagerie · Support
│
└── WebView  →  plateforme Batibuild (inchangée)
```

**Aucune barre d'application (Top App Bar) au-dessus de la WebView** : seul l'inset
de la barre de statut est conservé. La barre basse est le seul chrome natif ; elle est
fixe, ne défile pas avec le contenu, respecte la zone système basse (gestes / boutons)
et n'entraîne **jamais** le rechargement de la WebView (donc session, cookies, état et
historique préservés).

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
├── assets/                        # Icône, icône adaptative, logo de splash (PNG)
├── src/
│   ├── screens/
│   │   ├── SplashScreen.tsx       # Splash natif (logo, nom, tagline, « Chargement.... »)
│   │   ├── OnboardingScreen.tsx   # Guide 4 écrans + « Passer » (1ʳᵉ installation)
│   │   └── WebViewScreen.tsx      # WebView BatiBuild (toutes les options)
│   ├── components/
│   │   ├── Logo.tsx               # Logo officiel BatiBuild (React Native Views)
│   │   └── BottomNav.tsx          # Barre de navigation Material 3 (5 sections)
│   ├── storage.ts                 # hasCompletedOnboarding (AsyncStorage)
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
| **Splash** | Logo officiel + « BatiBuild » + slogan, et **un seul message : « Chargement.... »**. Durée **≤ 1 s** (900 ms) : aucune attente du réseau, aucun délai artificiel. |
| **Barre de navigation** | 5 sections Material 3 (Mon profil · Projets · Investissements · Messagerie · Support), toujours visibles, libellés permanents (jamais de « hover »), icônes pleines (actif) / contour (inactif) + indicateur `primary-container`. |
| **Top App Bar** | **Aucune** : la WebView occupe tout l'espace sous la barre de statut. |
| **Thème natif** | Material Design 3 clair / sombre / système (`useColorScheme`), sans toucher au thème de la plateforme Web. |
| **Onboarding** | 4 écrans (Bienvenue, Estimation, Projets, Commencer) + bouton **Passer**. Mémorisé via `hasCompletedOnboarding` (AsyncStorage). |
| **Réinstallation** | Le stockage local est effacé → le guide réapparaît (comportement attendu). |
| **Mise à jour** | `hasCompletedOnboarding` est conservé → pas de guide à chaque mise à jour. |
| **Revoir le guide** | **Appui long** sur la barre de navigation (n'importe quelle entrée) → « Voir le guide » (ne supprime aucune donnée). Le menu n'occupe aucune place à l'écran. |
| **Session** | Cookies, stockage local, cache persistants entre les lancements (`sharedCookiesEnabled`, `thirdPartyCookiesEnabled`, `cacheEnabled`, `domStorageEnabled`). |
| **Navigation interne** | Toutes les pages `*.freebuff.app` restent dans la WebView. |
| **Liens externes** | Sites partenaires, réseaux sociaux, documents externes → navigateur système (`Linking`). |
| **Navigation des 5 sections** | Routes **réelles** de la plateforme (`/dashboard/profile`, `/dashboard`, `/dashboard/investments`, `/dashboard/messages`, `/dashboard/support`) via `history.pushState` + `popstate` : la WebView n'est pas recréée, la session reste active. |
| **Retour Android** | Historique WebView → page précédente ; sinon confirmation « Voulez-vous quitter BatiBuild ? » (Annuler / Quitter). |
| **Chargement** | Écran de chargement natif (logo + « Chargement.... » + barre de progression) — jamais de page blanche. |
| **Hors ligne / erreurs** | Écran natif « Connexion Internet indisponible » / « Impossible de charger BatiBuild » + bouton **Réessayer** (codes `ERR_*` mappés en messages lisibles). |
| **Upload** | `<input type="file">` natif : galerie, photo (caméra), fichiers (permissions CAMERA / READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE). |
| **Téléchargements** | PDF et documents : téléchargés en cache puis ouverts via la feuille de partage native (`expo-file-system` + `expo-sharing`). |
| **Partage natif** | `navigator.share` de la plateforme Web est intercepté et ouvre le menu de partage natif (WhatsApp, e-mail, messages…). |
| **Safe Area** | Contenu WebView en dessous de la barre de statut / encoche / Dynamic Island (barre supérieure + bande inférieure natives). |

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
de la barre de navigation et le message de chargement.

Seule dépendance ajoutée pour la coque native : **`@expo/vector-icons`**
(icônes Material `MaterialCommunityIcons`, version alignée sur Expo SDK 57).
Aucun service cloud n'est introduit.

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
| Version | 1.0.0 (versionCode 1, buildNumber 1 — à incrémenter dans `app.json` avant publication) |

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

- **Le guide ne réapparaît pas** après mise à jour : normal — le flag `hasCompletedOnboarding`
  est persistant. Il réapparaît après **désinstallation/réinstallation** (stockage effacé).
- **Écran « Connexion Internet indisponible »** : la WebView ne charge pas ; vérifiez la
  connexion puis touchez **Réessayer** (recharge complète).
- **Un lien externe s'ouvre dans le WebView** : seuls les hôtes `*.freebuff.app` restent
  internes ; tout autre domaine est routé vers le navigateur système.
- **Le téléchargement ne se partage pas** : sur iOS, certains documents s'affichent dans la
  WebView (lecture intégrée) ; les PDF servis en pièce jointe déclenchent la feuille de partage.
- **Modifier le projet natif** : `android/` est **commité** ; après un changement
  d'`app.json`, resynchroniser avec `npm run android:prebuild` puis réappliquer la
  signature : `npm run signing:apply`. `ios/` est en CNG (régénéré par
  `expo prebuild` sur macOS).
- **Note de build** : les APK/AAB sont produits **par GitHub Actions**
  (`.github/workflows/android.yml` → Artifacts du run, aucun outil Android sur
  votre PC) ou, localement, par Gradle (`npm run android:apk`). Aucun EAS.