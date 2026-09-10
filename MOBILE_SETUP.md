# MOBILE_SETUP — BatiBuild Mobile (Expo + EAS + Android + iOS)

Guide complet de mise en place, de build et de publication de l'application
mobile BatiBuild. L'application est une coquille native (Expo + React Native)
qui charge la plateforme web existante dans une WebView (100 % WebView : toute
nouvelle page ajoutée à la plateforme web est automatiquement disponible dans
l'application, sans nouvelle version native).

- **Code mobile** : `mobile/`
- **URL de la plateforme web** : définie **une seule fois** dans
  `mobile/src/config.ts` (`WEB_APP_URL`). Surcharge possible via la variable
  `EXPO_PUBLIC_WEB_APP_URL` — ne jamais dupliquer l'URL ailleurs.
- **Identifiants** : Android `com.batibuild.app` · iOS `com.batibuild.app`
- **Version** : `1.0.0` (`android.versionCode` 1, `ios.buildNumber` 1)
  — l'incrémentation automatique en production est gérée par EAS
  (`eas.json` → `production.autoIncrement: true`).

**Deux chemins de build Android** :

1. **Gradle local / CI** (`./gradlew`) — le projet natif `mobile/android/` est
   **commité** ; c'est le chemin principal pour produire un **APK** (voir §11).
2. **EAS Build** (cloud) — pour iOS et les builds signés gérés par Expo
   (voir §3-§13).

---

## 1. Installation

Prérequis : **Node.js ≥ 20**, **Bun** (gestionnaire du projet), et une
connexion Internet pour EAS Build (pas de SDK Android ni Xcode nécessaire
pour les builds cloud).

```bash
cd mobile
bun install
bun run typecheck          # vérification TypeScript
bunx expo-doctor           # vérification de la configuration Expo
```

Lancer en développement :

```bash
bun run start              # QR code Expo Go (Android/iOS)
# ou sur simulateur/émulateur :
bun run android            # expo run:android
bun run ios                # expo run:ios (macOS + Xcode requis)
```

## 2. Configuration Expo

Fichiers :

- `mobile/app.json` — nom, slug, version, icônes, splash, permissions,
  `android.package` / `ios.bundleIdentifier` = `com.batibuild.app`.
- `mobile/src/config.ts` — **URL centralisée** de la plateforme web.
- `mobile/App.tsx` — machine à états : **Splash → (Onboarding si première
  installation) → WebView**.
- `mobile/android/` — projet natif Android **commité** (permet
  `./gradlew assembleRelease` directement). Ne pas l'éditer à la main sauf
  pour la signature (§9) : après une modification d'`app.json`, resynchroniser
  avec `bunx expo prebuild --platform android` puis réappliquer la signature
  avec `bun run signing:apply`.

Parcours de lancement :

```
Installation → Splash → Premier lancement ?
                          ├─ OUI → Guide (4 écrans) → WebView
                          └─ NON → WebView
```

Le flag `hasCompletedOnboarding` est mémorisé dans AsyncStorage (conservé
après mise à jour, effacé à la réinstallation). Un bouton
« Réinitialiser le guide (test) » dans les réglages (⚙) permet de tester
l'onboarding en développement.

## 3. Connexion EAS

```bash
cd mobile
bunx eas-cli login
bunx eas-cli whoami        # vérifier le compte connecté
```

## 4. `eas init`

Lie le projet Expo au compte EAS (ajoute `extra.eas.projectId` dans
`app.json`) :

```bash
cd mobile
bunx eas-cli init
```

## 5. `eas build:configure`

Génère/met à jour `eas.json` si besoin :

```bash
cd mobile
bunx eas-cli build:configure
```

Profils présents dans `eas.json` :

| Profil | Usage | Android | iOS |
|---|---|---|---|
| `development` | dev client | buildType apk | development client |
| `preview` | tests internes | **APK** | simulateur (aucun compte Apple requis) |
| `production` | stores | **AAB** (Google Play) | app-store-connect (TestFlight / App Store) |

## 6. Configuration GitHub

Deux workflows :

### 6a. `.github/workflows/android.yml` — APK/AAB par Gradle (recommandé)

Déclenché par un **push sur `main`** (fichiers `mobile/**`) ou manuellement
(`Actions → Run workflow`).

Il construit directement avec Gradle (le projet natif est commité) :

- `Batibuild-debug.apk` — signé clé debug (tests rapides) ;
- `Batibuild-release.apk` — signé clé **Release** si les secrets sont définis,
  sinon clé debug ;
- `Batibuild-release.aab` — pour Google Play (vraie clé Release requise).

Chaque fichier est téléchargeable dans l'onglet **Artifacts** du run
(30 jours). Secrets GitHub optionnels : `KEYSTORE_BASE64` (keystore encodé en
base64), `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS`.

### 6b. `.github/workflows/mobile-build.yml` — EAS (cloud)

- **Manuel** (`workflow_dispatch`) : choix `android` / `ios` / `all` et profil
  `preview` / `production`.
- **Push sur `main`** (fichiers `mobile/**`) : typecheck + APK Android
  *preview*, uploadé en artefact GitHub.

Le workflow **typecheck d'abord** (zéro crédit EAS consommé en cas d'erreur TS).

## 7. Création du `EXPO_TOKEN`

1. https://expo.dev/settings/access-tokens → **Create token**.
2. Copier le token (affiché une seule fois).

## 8. Ajout du secret GitHub

1. Dépôt → **Settings → Secrets and variables → Actions → New repository secret**.
2. **Nom** : `EXPO_TOKEN` — **Valeur** : le token créé en §7.

> Le token n'est jamais écrit dans le dépôt : le workflow le lit uniquement
> via `${{ secrets.EXPO_TOKEN }}`.

## 9. Gestion du keystore Android

Deux modes selon le chemin de build :

### 9a. Build Gradle (local ou CI) — signature via `keystore.properties`

Le `build.gradle` Android lit un fichier **`mobile/android/keystore.properties`**
(gitignoré, jamais commité) :

```properties
storeFile=batibuild-release.keystore
storePassword=MOT_DE_PASSE
keyAlias=batibuild
keyPassword=MOT_DE_PASSE
```

Et le keystore lui-même doit se trouver dans `mobile/android/app/`
(ex. `mobile/android/app/batibuild-release.keystore`).

- **Avec** ce fichier → l'APK/AAB **release** est signé avec votre clé
  Release (obligatoire pour Google Play).
- **Sans** ce fichier → le build fonctionne quand même : l'APK release est
  signé avec la **clé debug** (installation manuelle OK, Play Store refuse).

Générer un keystore :

```bash
cd mobile/android
keytool -genkeypair -v -storetype PKCS12 -keystore app/batibuild-release.keystore \
  -alias batibuild -keyalg RSA -keysize 2048 -validity 10000
```

⚠ **Conservez ce fichier précieusement** (perdu = mise à jour Play Store
impossible). Ne le commitez jamais.

### 9b. Build EAS — keystore géré par Expo

EAS génère et stocke le keystore sur son serveur au premier build
(récupérable avec `eas credentials` si besoin).

## 10. Credentials iOS

Gérés par **EAS** également (certificat de distribution, provisioning
profiles). Aucun certificat Apple n'est commité.

Prérequis pour un build **production iOS** :

1. Compte **Apple Developer Program** (99 $/an) actif.
2. Dans `eas credentials` : renseigner l'**Apple Team ID**.
3. EAS génère les certificats/provisioning automatiquement.

> Build *preview* iOS (simulateur) : **aucun** compte Apple requis.

## 11. Build Android — APK local (Gradle)

Prérequis : **JDK 17** et **Android SDK** (Android Studio) installés.

```bash
cd mobile
bun run apk:debug        # → android/app/build/outputs/apk/debug/app-debug.apk
bun run apk:release      # → android/app/build/outputs/apk/release/app-release.apk
bun run aab              # → android/app/build/outputs/bundle/release/app-release.aab
# équivalent direct :
cd android && ./gradlew assembleDebug assembleRelease bundleRelease
```

L'**APK release** est signé avec la clé Release si `android/keystore.properties`
existe (§9a), sinon avec la clé debug (installable pour tests).

> Après une modification d'`app.json` : `bunx expo prebuild --platform android`
> puis `bun run signing:apply` (le prebuild écrase `build.gradle`).

## 12. Build Android — EAS (cloud)

```bash
cd mobile
# Test : APK installable directement
bunx eas-cli build --platform android --profile preview
# Store : AAB pour Google Play
bunx eas-cli build --platform android --profile production
```

Sorties : `build-output/` locale avec `--output ./build-output`, sinon lien
téléchargeable dans le dashboard EAS.

## 13. Build iOS

```bash
cd mobile
# Test : build simulateur
bunx eas-cli build --platform ios --profile preview
# TestFlight / App Store
bunx eas-cli build --platform ios --profile production
```

Puis, si le build production a été soumis :

```bash
bunx eas-cli submit --platform ios --profile production
```

## 14. Build Android + iOS

```bash
cd mobile
bunx eas-cli build --platform all --profile preview
```

Ou en CI : workflow `Mobile Build (EAS)` → plateforme **all**.

## 15. Publication future Play Store

1. Créer le compte **Google Play Console** (25 $, une fois).
2. Créer l'application (nom *BatiBuild*, package `com.batibuild.app`).
3. Générer le **AAB** : `eas build --platform android --profile production`.
4. Téléverser l'AAB dans **Play Console → Production → Version**.
5. (Optionnel) soumission automatisée :
   - Téléverser la clé du compte de service Google Play dans
     `mobile/secrets/google-play-service-account.json` (⚠ fichier gitignoré),
   - puis `bunx eas-cli submit --platform android --profile production`.

## 16. Publication future App Store

1. Compte **Apple Developer Program** actif.
2. Renseigner les credentials dans `eas credentials` (Apple Team ID).
3. `eas build --platform ios --profile production` (génère l'archive
   app-store-connect).
4. `bunx eas-cli submit --platform ios --profile production`
   (ou via App Store Connect / Transporter).
5. Remplir les informations App Store Connect (captures d'écran, descriptions,
   confidentialité), puis soumettre pour **App Review**.

---

## Actions manuelles requises (non automatisables ici)

| Action | Commande / lieu |
|---|---|
| APK via GitHub Actions | push sur `main` ou Actions → *Run workflow* (`android.yml`) ; télécharger dans **Artifacts** |
| Signature Release (CI) | Secrets GitHub : `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS` |
| Signature Release (local) | créer `mobile/android/keystore.properties` + keystore (voir §9a) |
| Lier le projet EAS | `cd mobile && bunx eas-cli login && bunx eas-cli init` |
| Keystore EAS | EAS le génère au premier build EAS (aucune action requise) |
| Apple Developer + Team ID | `bunx eas-cli credentials` (compte Apple payant requis) |
| Google Play Console | compte + téléversement du AAB (§15) |
| App Store Connect | compte + soumission du build (§16) |
| URL personnalisée | `EXPO_PUBLIC_WEB_APP_URL` — variables `EXPO_PUBLIC_*` sont **publiques**, n'y jamais mettre de secret |

## Vérifications de référence

```bash
cd mobile
bun run typecheck          # tsc --noEmit
bunx expo-doctor           # configuration Expo
bunx eas-cli project:info  # projet lié (après §4)
```

## Sécurité — rappel

- Aucun secret dans `app.json`, `eas.json`, le code source ou le workflow.
- `EXPO_TOKEN` provient **uniquement** de GitHub Secrets.
- Les variables `EXPO_PUBLIC_*` sont embarquées dans le bundle → publiques.
- Le backend, l'authentification, Convex et tous les secrets restent côté
  plateforme web — l'application mobile n'expose rien.