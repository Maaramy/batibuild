# MOBILE_SETUP — BatiBuild Mobile (Expo + EAS + Android + iOS)

Guide complet de mise en place, de build et de publication de l'application
mobile BatiBuild. L'application est une coquille native (Expo + React Native)
qui charge la plateforme web existante dans une WebView.

- **Code mobile** : `mobile/`
- **URL de la plateforme web** : définie **une seule fois** dans
  `mobile/src/config.ts` (`WEB_APP_URL`). Surcharge possible via la variable
  `EXPO_PUBLIC_WEB_APP_URL` — ne jamais dupliquer l'URL ailleurs.
- **Identifiants** : Android `com.batibuild.app` · iOS `com.batibuild.app`
- **Version** : `1.0.0` (`android.versionCode` 1, `ios.buildNumber` 1)
  — l'incrémentation automatique en production est gérée par EAS
  (`eas.json` → `production.autoIncrement: true`).

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

Le workflow `.github/workflows/mobile-build.yml` :

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

Le keystore de signature est **géré par EAS** (créé automatiquement au premier
build). Aucun fichier `.jks`/`.keystore` n'est stocké dans le dépôt.

- Premier build : EAS génère et stocke le keystore sur son serveur
  (récupérable avec `eas credentials` si besoin).
- Pour conserver une copie locale : `bunx eas-cli credentials` →
  *Android → Manage your Android Keystore* → download.

## 10. Credentials iOS

Gérés par **EAS** également (certificat de distribution, provisioning
profiles). Aucun certificat Apple n'est commité.

Prérequis pour un build **production iOS** :

1. Compte **Apple Developer Program** (99 $/an) actif.
2. Dans `eas credentials` : renseigner l'**Apple Team ID**.
3. EAS génère les certificats/provisioning automatiquement.

> Build *preview* iOS (simulateur) : **aucun** compte Apple requis.

## 11. Build Android

```bash
cd mobile
# Test : APK installable directement
bunx eas-cli build --platform android --profile preview
# Store : AAB pour Google Play
bunx eas-cli build --platform android --profile production
```

Sorties : `build-output/` locale avec `--output ./build-output`, sinon lien
téléchargeable dans le dashboard EAS.

## 12. Build iOS

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

## 13. Build Android + iOS

```bash
cd mobile
bunx eas-cli build --platform all --profile preview
```

Ou en CI : workflow `Mobile Build (EAS)` → plateforme **all**.

## 14. Publication future Play Store

1. Créer le compte **Google Play Console** (25 $, une fois).
2. Créer l'application (nom *BatiBuild*, package `com.batibuild.app`).
3. Générer le **AAB** : `eas build --platform android --profile production`.
4. Téléverser l'AAB dans **Play Console → Production → Version**.
5. (Optionnel) soumission automatisée :
   - Téléverser la clé du compte de service Google Play dans
     `mobile/secrets/google-play-service-account.json` (⚠ fichier gitignoré),
   - puis `bunx eas-cli submit --platform android --profile production`.

## 15. Publication future App Store

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
| Lier le projet EAS | `cd mobile && bunx eas-cli login && bunx eas-cli init` |
| Keystore Android | EAS le génère au premier build (aucune action requise) |
| Apple Developer + Team ID | `bunx eas-cli credentials` (compte Apple payant requis) |
| Google Play Console | compte + téléversement du AAB |
| App Store Connect | compte + soumission du build |
| URL personnalisée | `EXPO_PUBLIC_WEB_APP_URL` (voir `mobile/.env.example`) — variables `EXPO_PUBLIC_*` sont **publiques**, n'y jamais mettre de secret |

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