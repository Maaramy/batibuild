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
├── android/                       # Projet natif Android (expo prebuild)
└── ios/                           # Projet natif iOS (expo prebuild)
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

L'URL de la plateforme est définie dans `app.json` → `expo.extra.webUrl`
(par défaut : `https://budgetbati.freebuff.app/`).

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

### En local (avec Android Studio / SDK)

```bash
cd mobile/android
./gradlew assembleRelease
# APK : android/app/build/outputs/apk/release/app-release.apk
```

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

## 9. CI — Build automatique de l'APK (GitHub Actions + EAS)

Un workflow est fourni : `.github/workflows/eas-build-android.yml`.

**Comportement** : à chaque `push` (toutes branches) — et manuellement via l'onglet
Actions — le projet est typechecké, puis l'APK est construit sur EAS Build et
**téléchargé dans les Artifacts du run** (`batibuild-apk-<sha>`).

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
4. Push une modification → l'APK apparaît dans les Artifacts du run.

### Personnalisation

- **Restreindre aux push sur `main`** : dans le workflow, remplacer
  `branches: ["**"]` par `branches: ["main"]`.
- **Limiter la conso de crédits EAS** : le job `typecheck` échoue vite en cas
  d'erreur TS, avant de déclencher le build cloud.
- **Build iOS en CI** : ajouter un job avec
  `eas build --platform ios --profile production --non-interactive --no-wait`
  (nécessite `EXPO_APPLE_TEAM_ID` et un compte Apple Developer).

## 10. Notes & dépannage

- **Le guide ne réapparaît pas** après mise à jour : normal — le flag `hasCompletedOnboarding`
  est persistant. Il réapparaît après **désinstallation/réinstallation** (stockage effacé).
- **Écran « Connexion Internet indisponible »** : la WebView ne charge pas ; vérifiez la
  connexion puis touchez **Réessayer** (recharge complète).
- **Un lien externe s'ouvre dans le WebView** : seuls les hôtes `*.freebuff.app` restent
  internes ; tout autre domaine est routé vers le navigateur système.
- **Le téléchargement ne se partage pas** : sur iOS, certains documents s'affichent dans la
  WebView (lecture intégrée) ; les PDF servis en pièce jointe déclenchent la feuille de partage.
- **Modifier le projet natif** : `android/` et `ios/` sont générés par `expo prebuild`
  (exécuter `bunx expo prebuild` après un changement d'`app.json`).
- **Note de build** : cet environnement ne disposant ni du SDK Android ni de macOS,
  les artefacts APK/IPA sont générés via **EAS Build** (cloud) avec les commandes ci-dessus.