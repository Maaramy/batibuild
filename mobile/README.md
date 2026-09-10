# BatiBuild — Application Mobile (Android + iOS)

Application mobile **native** (React Native / Expo SDK 57) qui embarque la plateforme
[BatiBuild](https://budgetbati.freebuff.app/) dans une **WebView optimisée**, avec un
**Splash Screen** et un **Guide d'onboarding** natifs au premier lancement.

```
Première installation :  Splash  →  Guide (4 écrans / Passer)  →  WebView BatiBuild
Lancements suivants :    Splash court  →  WebView BatiBuild
```

> La plateforme Web n'est **pas modifiée** : elle s'affiche simplement dans la WebView.
> Les écrans Splash et Guide sont natifs (React Native).

---

## 1. Structure

```
mobile/
├── App.tsx                        # Machine à états : Splash → Onboarding → WebView
├── index.ts                       # Entrée (garde le splash natif pendant le boot JS)
├── app.json                       # Identifiants, permissions, splash, icônes
├── eas.json                       # Profils de build EAS (APK / AAB / iOS)
├── assets/                        # Icône, icône adaptative, logo de splash (PNG)
├── src/
│   ├── screens/
│   │   ├── SplashScreen.tsx       # Splash natif (logo, nom, tagline, ~1,5 s)
│   │   ├── OnboardingScreen.tsx   # Guide 4 écrans + « Passer » (1ʳᵉ installation)
│   │   └── WebViewScreen.tsx      # WebView BatiBuild (toutes les options)
│   ├── components/Logo.tsx        # Logo maison (purement React Native Views)
│   ├── storage.ts                 # hasCompletedOnboarding (AsyncStorage)
│   └── theme.ts                   # Couleurs BatiBuild (émeraude)
├── android/                       # Projet natif Android — COMMITÉ (build Gradle direct)
├── ios/                           # Projet natif iOS (régénéré par expo prebuild / EAS)
└── scripts/apply-signing.mjs      # Réapplique la signature Release après un prebuild
```

## 2. Fonctionnalités

| Fonctionnalité | Comportement |
|---|---|
| **Splash** | Logo + « BatiBuild » + « Votre budget de construction, simplement. » (~1,5 s max). Pendant ce temps : vérification du premier lancement et préparation. |
| **Onboarding** | 4 écrans (Bienvenue, Estimation, Projets, Commencer) + bouton **Passer**. Mémorisé via `hasCompletedOnboarding` (AsyncStorage). |
| **Réinstallation** | Le stockage local est effacé → le guide réapparaît (comportement attendu). |
| **Mise à jour** | `hasCompletedOnboarding` est conservé → pas de guide à chaque mise à jour. |
| **Revoir le guide** | Menu ⚙ (barre du haut de la WebView) → « Voir le guide » (ne supprime aucune donnée). |
| **Session** | Cookies, stockage local, cache persistants entre les lancements (`sharedCookiesEnabled`, `thirdPartyCookiesEnabled`, `cacheEnabled`, `domStorageEnabled`). |
| **Navigation interne** | Toutes les pages `*.freebuff.app` restent dans la WebView. |
| **Liens externes** | Sites partenaires, réseaux sociaux, documents externes → navigateur système (`Linking`). |
| **Retour Android** | Historique WebView → page précédente ; sinon confirmation « Voulez-vous quitter BatiBuild ? » (Annuler / Quitter). |
| **Chargement** | Écran de chargement de marque (logo + « Chargement… » + barre de progression) — jamais de page blanche. |
| **Hors ligne / erreurs** | Écran natif « Connexion Internet indisponible » / « Impossible de charger BatiBuild » + bouton **Réessayer** (codes `ERR_*` mappés en messages lisibles). |
| **Upload** | `<input type="file">` natif : galerie, photo (caméra), fichiers (permissions CAMERA / READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE). |
| **Téléchargements** | PDF et documents : téléchargés en cache puis ouverts via la feuille de partage native (`expo-file-system` + `expo-sharing`). |
| **Partage natif** | `navigator.share` de la plateforme Web est intercepté et ouvre le menu de partage natif (WhatsApp, e-mail, messages…). |
| **Safe Area** | Contenu WebView en dessous de la barre de statut / encoche / Dynamic Island (barre supérieure + bande inférieure natives). |

## 3. Prérequis

- Node.js 20+ et **Bun** (ou npm)
- Compte [Expo](https://expo.dev) + CLI EAS : `npm i -g eas-cli` (ou `bunx eas-cli`)
- Android : **Android Studio / SDK** pour un build local, ou EAS Build (cloud)
- iOS : **macOS + Xcode** pour un build local, ou EAS Build (cloud, Macs)

## 4. Démarrage local

```bash
cd mobile
bun install

# Dev (Metro) — scanner le QR code avec Expo Go ou un simulateur
bunx expo start

# Simulateur/émulateur natif (compile les projets android/ et ios/ générés)
bunx expo run:android     # nécessite Android SDK
bunx expo run:ios         # nécessite macOS + Xcode
```

L'URL de la plateforme est définie **une seule fois** dans `src/config.ts`
(par défaut : `https://budgetbati.freebuff.app/` ; surcharge possible via
`EXPO_PUBLIC_WEB_APP_URL`).

## 5. Build Android — APK / AAB

### Via EAS Build (cloud, recommandé — aucun SDK local requis)

```bash
cd mobile
bunx eas-cli login
bunx eas-cli build -p android --profile preview      # → APK installable (test)
bunx eas-cli build -p android --profile production   # → AAB (Google Play)
```

- **preview** → `android.buildType: apk` (fichier `.apk` à installer directement).
- **production** → `android.buildType: app-bundle` (fichier `.aab` pour la Play Console).
- La première exécution demande de créer le projet EAS (identifiants de signature
  Android générés automatiquement ; conservez-les pour les mises à jour).

### Via Gradle (local ou CI — projet natif commité)

Prérequis : **JDK 17** + **Android SDK** (Android Studio).

```bash
cd mobile
bun run apk:debug        # → android/app/build/outputs/apk/debug/app-debug.apk
bun run apk:release      # → android/app/build/outputs/apk/release/app-release.apk
bun run aab              # → android/app/build/outputs/bundle/release/app-release.aab

# équivalent direct :
cd android && ./gradlew assembleDebug assembleRelease bundleRelease
```

**Signature Release** : l'APK/AAB release est signé avec la clé Release si
`mobile/android/keystore.properties` + le keystore existent (voir
`MOBILE_SETUP.md` §9a) ; sinon il est signé avec la clé debug (installable,
mais refusé par Google Play).

> Après une modification d'`app.json` : `bunx expo prebuild --platform android`
> puis `bun run signing:apply` (le prebuild écrase `build.gradle`).

## 6. Build iOS — TestFlight / App Store

```bash
cd mobile
bunx eas-cli login
bunx eas-cli build -p ios --profile preview          # → build simulateur (test rapide)
bunx eas-cli build -p ios --profile production       # → build App Store
bunx eas-cli submit -p ios --profile production      # → TestFlight / App Store Connect
```

- Le build iOS s'exécute sur les serveurs macOS d'EAS (pas de Mac nécessaire localement).
- Renseignez votre `appleId` / `appleTeamId` / `ascAppId` dans `eas.json` (section `submit`)
  et créez l'application dans App Store Connect.
- Local : `bunx expo run:ios` (macOS + Xcode uniquement).

## 7. Identifiants

| | Valeur |
|---|---|
| Nom de l'application | BatiBuild |
| Package Android | `com.batibuild.app` |
| Bundle ID iOS | `com.batibuild.app` |
| Version | 1.0.0 (versionCode 1, buildNumber 1 — auto-incrément via EAS `autoIncrement`) |

## 8. Permissions (déclarées)

- **Caméra** — photos de chantier/terrain depuis l'upload de la plateforme
- **Galerie / stockage** — import photos, plans, croquis ; enregistrement des téléchargements
- **Localisation** — estimation des coûts selon la région (Tunisie)

Descriptions iOS complètes dans `app.json` → `ios.infoPlist`.

## 9. CI — Build automatique Android (GitHub Actions)

Deux workflows sont fournis :

### 9a. `.github/workflows/android.yml` — APK/AAB par Gradle (recommandé)

- **Push sur `main`** (fichiers `mobile/**`) ou manuellement
  (`Actions → Run workflow`).
- Construit directement avec Gradle : **Batibuild-debug.apk**,
  **Batibuild-release.apk** et **Batibuild-release.aab**, téléchargeables dans
  les **Artifacts du run**.
- Signature Release via secrets GitHub optionnels : `KEYSTORE_BASE64`,
  `KEYSTORE_PASSWORD`, `KEYSTORE_ALIAS` (sans eux : release signé clé debug).

### 9b. `.github/workflows/mobile-build.yml` — EAS (cloud, Android + iOS)

**Comportement** :
- **Manuel** (onglet Actions → *Run workflow*) : choix de la plateforme
  (`android` / `ios` / `all`) et du profil (`preview` / `production`).
- **Push sur `main`** (fichiers `mobile/**` uniquement) : typecheck + build
  Android **preview** (APK installable), téléchargé dans les **Artifacts du run**.

Le projet est d'abord typechecké (job `typecheck` — échoue vite, sans
consommer de crédits EAS), puis construit sur EAS Build par plateforme.

### Mise en place (une seule fois)

1. **Token Expo** : https://expo.dev/settings/access-tokens → *Create token*.
2. **Secret GitHub** : dans le dépôt → *Settings → Secrets and variables →
   Actions → New repository secret* — nom `EXPO_TOKEN`, valeur = le token.
3. **Lier le projet EAS** (recommandé avant le premier run CI) :
   ```bash
   cd mobile
   bunx eas-cli login
   bunx eas-cli build:configure   # crée eas.json si besoin
   bunx eas-cli init              # lie le projet (ajoute extra.eas.projectId à app.json)
   bunx eas-cli build -p android --profile preview   # 1er build : génère le keystore
   ```
   Si cette étape n'est pas faite, le workflow exécute `eas init` automatiquement
   (nécessite uniquement `EXPO_TOKEN`).
4. Push une modification sur `main` (ou lancement manuel) → l'artefact apparaît
   dans les Artifacts du run.

### Notes CI

- **android.yml** ne consomme **aucun crédit EAS** (build Gradle sur runner
  GitHub) — c'est le workflow à utiliser pour produire l'APK.
- **iOS preview** : build simulateur — aucun compte Apple Developer requis.
- **iOS production** : EAS gère les certificats/provisioning via le compte
  Apple Developer lié au compte Expo ; sans credentials Apple dans EAS, ce
  build échouera proprement (voir `MOBILE_SETUP.md`).
- **Crédits EAS** : limités (plan gratuit ≈ 30 builds/mois) — c'est pourquoi
  le push `main` ne déclenche que le profil *preview* Android sur ce workflow.
- **URL de la plateforme** : définie une seule fois dans `src/config.ts`
  (surcharge possible via `EXPO_PUBLIC_WEB_APP_URL`, voir `.env.example`
  et `MOBILE_SETUP.md`).

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
  d'`app.json`, resynchroniser avec `bunx expo prebuild --platform android` puis
  réappliquer la signature : `bun run signing:apply`. `ios/` est régénéré par
  `expo prebuild`/EAS.
- **Note de build** : cet environnement ne disposant ni du SDK Android ni de macOS,
  les artefacts APK sont générés par le workflow **GitHub Actions `android.yml`**
  (artifacts du run) ou via **EAS Build** (cloud) avec les commandes ci-dessus.