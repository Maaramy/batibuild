# BudgetBati Mobile — Android + iOS

Application mobile **BudgetBati** (Android + iOS) construite avec **Expo (React Native) + Expo Router**,
réutilisant le **backend Convex existant** de la plateforme Web. Une seule base de code, un seul
backend, une seule base de données : les données sont synchronisées entre Web, Android et iOS.

> **Principe :** aucun calcul métier n'est réécrit. L'estimation passe par les mêmes fonctions
> Convex que le Web (`projects:createProject`, `projects:simulateAnalysis`…) — mêmes moteurs BIM,
> mêmes prix tunisiens 2026, mêmes résultats.

---

## 1. Structure du projet

```
mobile/
├── app.json                    # Identité, icônes, splash, bundle IDs, version
├── package.json                # Dépendances Expo SDK 57 (React Native 0.86)
├── tsconfig.json               # TS strict, inclut les types partagés du Web
├── metro.config.js             # watchFolders monorepo (import des modules Web partagés)
├── assets/images/              # Icônes & splash (générés par scripts/generate-brand-assets.mjs)
├── scripts/generate-brand-assets.mjs
└── src/
    ├── app/                    # Routes Expo Router
    │   ├── _layout.tsx         # Convex Auth + Thème + i18n + Stack
    │   ├── index.tsx           # Redirection selon l'authentification
    │   ├── (auth)/             # sign-in, sign-up, verify (OTP), forgot-password
    │   ├── (tabs)/             # Accueil, Projets, Historique, Profil
    │   └── project/            # new (formulaire), [id] (détail + estimation)
    ├── components/             # UI réutilisables (Button, Card, Input, Sheet…)
    ├── constants/              # Catalogue types de projets + régions (réutilisé du Web)
    ├── hooks/                  # use-theme (light/dark/system)
    ├── i18n/ + locales/        # fr / en / ar (RTL) — mêmes langues que le Web
    ├── lib/                    # convex, format TND, stockage local, erreurs, partage/PDF
    └── theme/                  # Design tokens portés depuis src/DESIGN_SYSTEM.md
```

## 2. Installation

Prérequis : **Bun** (ou npm), **Node 20+**, [Expo CLI](https://docs.expo.dev/get-started/set-up-your-environment/)
(`npx expo` fonctionne aussi sans installation globale).

```bash
cd mobile
bun install          # ou : npm install
```

Régénérer les assets de marque (optionnel) :

```bash
bun scripts/generate-brand-assets.mjs
```

## 3. Configuration

### 3.1 Connexion au backend Convex (obligatoire)

L'application utilise **le même déploiement Convex que la plateforme Web** (synchronisation
Web ⇄ Mobile immédiate). Créez un fichier `.env` dans `mobile/` :

```
# mobile/.env
EXPO_PUBLIC_CONVEX_URL=https://<votre-deploiement>.convex.cloud
```

> L'URL est identique à `VITE_CONVEX_URL` du projet Web (visible dans la console Convex).
> ⚠️ Ne mettez jamais de secret dans `EXPO_PUBLIC_*` : ces variables sont embarquées dans le bundle.

### 3.2 Identité de l'application (`app.json`)

| Champ | Valeur |
|---|---|
| Nom | BudgetBati |
| Scheme | `budgetbati` |
| Android package | `com.batibuild.budgetbati` |
| iOS bundle identifier | `com.batibuild.budgetbati` |
| Version | `1.0.0` (`versionCode` Android = 1) |

### 3.3 Auth

L'authentification réutilise **Convex Auth** (mêmes comptes que le Web) :
- Connexion / inscription par **mot de passe** (avec vérification e-mail par code OTP),
- Connexion rapide par **e-mail + code OTP**,
- Mot de passe oublié.

Le jeton est stocké de façon sécurisée via `@react-native-async-storage/async-storage`
(interface `TokenStorage` passée à `ConvexAuthProvider`).

## 4. Lancer l'application

```bash
cd mobile
bun start             # Expo dev server (QR code avec Expo Go)
bun run android       # émulateur Android
bun run ios           # simulateur iOS (macOS uniquement)
bun run web           # cible Web (optionnel, pour tester)
```

## 5. Builds de production

### 5.1 Android — APK (tests) et AAB (Google Play)

Via **EAS Build** (recommandé) :

```bash
# 1. Installer eas-cli
npm i -g eas-cli

# 2. Connexion + configuration (crée eas.json)
eas login
eas build:configure

# 3. APK de test
eas build --platform android --profile preview        # APK

# 4. AAB pour Google Play
eas build --platform android --profile production     # AAB
```

Construire en local (nécessite Android SDK) :

```bash
cd mobile && npx expo prebuild --platform android
cd android && ./gradlew assembleRelease               # APK
cd android && ./gradlew bundleRelease                 # AAB
```

### 5.2 iOS — TestFlight et App Store

```bash
eas build --platform ios --profile preview            # build de test
eas build --platform ios --profile production         # App Store
eas submit --platform ios                             # soumission TestFlight / App Store
```

> Les builds iOS nécessitent un compte Apple Developer. Le bundle identifier
> `com.batibuild.budgetbati` doit être enregistré dans votre compte.

### 5.3 Icône et splash screen

Les assets sont générés par `scripts/generate-brand-assets.mjs` (marque : fond vert profond
+ losange émeraude). Remplacez-les par vos versions finales en gardant les mêmes noms de
fichiers : `icon.png` (1024×1024), `adaptive-icon.png` (1024×1024),
`adaptive-icon-monochrome.png`, `splash-icon.png` (512×512), `favicon.png`.

## 6. Architecture

```
Web (React/Vite) ─┐
                  ├──► Convex (backend unique) ──► Base de données unique
Android (Expo)   ─┤        (projets, estimations, comptes, matériaux)
iOS (Expo)       ─┘
```

- **Backend** : 100 % réutilisé (`src/convex/` du Web). Les mutations `projects:createProject`
  et `projects:simulateAnalysis` exécutent le moteur BIM (prix Tunisie 2026) côté serveur.
- **Calculs** : aucun dupliqué. Les libellés des types de projets sont importés depuis
  `src/convex/projectTypes.ts` (fichier pur, sans dépendance Convex).
- **Design system** : tokens portés depuis `src/DESIGN_SYSTEM.md` → `src/theme/tokens.ts`
  (couleurs light/dark OKLCH→HEX, spacing, radius, shadows, typographie, transitions).
- **i18n** : `fr` / `en` / `ar` avec support **RTL** (I18nManager + style `direction`),
  langue persistée localement, sélectionnable depuis le Profil.
- **Thème** : Light / Dark / System, persisté localement (`AsyncStorage`).
- **Hors-ligne** : les brouillons de projet sont sauvegardés localement
  (`src/lib/storage.ts`) et synchronisés vers Convex dès que la connexion revient ;
  les erreurs réseau sont traduites en messages clairs avec bouton « Réessayer ».
- **Partage** : partage natif (WhatsApp, e-mail, …), copie du résumé, et **PDF professionnel**
  généré via `expo-print` (logo, informations projet, paramètres, détail des coûts,
  scénarios, total, date, devise TND) partagé via `expo-sharing`.

### Extensibilité future

L'architecture prépare : notifications push (`expo-notifications`, préférence déjà exposée
dans le Profil), IA / analyse de plans et photos (via les actions Convex existantes
`aiMaterialsActions:recommendMaterials`, `projects:startAnalysis`), géolocalisation,
marketplace fournisseurs — sans changement structurel.

## 7. Résolution de problèmes

| Problème | Solution |
|---|---|
| `EXPO_PUBLIC_CONVEX_URL is not defined` | Créer `mobile/.env` (voir §3.1) puis relancer `bun start` |
| Données absentes / « Session expirée » | Vérifier que le compte existe sur le Web et que l'URL Convex est la bonne |
| Erreur réseau en estimation | Vérifier la connexion ; le brouillon reste enregistré localement |
| RTL arabe non appliqué immédiatement sur iOS | L'application complète applique le RTL au redémarrage ; le style `direction` est appliqué en attendant |
| `bun tsc` : erreurs | `bun run typecheck` dans `mobile/` ; le typecheck Web (`tsc -b` à la racine) est indépendant |

## 8. Vérifications

- `cd mobile && bun run typecheck` — typecheck mobile (exit 0)
- `bun tsc -b --noEmit` (racine) — plateforme Web intacte (exit 0)