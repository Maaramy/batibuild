# BatiBuild Mobile — Obtention des APK (GitHub Actions ⭐ ou local)

Deux façons d'obtenir `Batibuild-release.apk`, **sans EAS, sans compte Expo et
sans `EXPO_TOKEN`** :

| Méthode | Outils requis sur votre PC | Recommandé pour |
|---|---|---|
| **GitHub Actions** (§0-bis) ⭐ | **aucun** (ni JDK, ni SDK, ni Android Studio) | obtenir l'APK en un `git push` |
| Build local (§1 → §13) | JDK 17 + Android SDK | déboguer hors CI |

```
git push origin main → GitHub Actions (ubuntu-latest) → Batibuild-release.apk
```

---

## 0. Architecture (rappel)

```
BATIBUILD MOBILE
   ├── Splash natif          (expo-splash-screen + écran React Native)
   ├── Onboarding            (4 écrans, 1ʳᵉ installation — « Passer » / « Commencer »)
   └── WebView               → https://budgetbati.freebuff.app/
```

L'application est une **enveloppe WebView** : la plateforme Web BatiBuild reste la
seule source de l'interface, des calculs et des données. Toute mise à jour du site
est immédiatement visible dans l'application, **sans nouvelle APK**.

| Dossier | Rôle |
|---|---|
| `mobile/src/` | Couche native : Splash, onboarding, WebView, stockage, config |
| `mobile/src/config.ts` | **URL unique** de la plateforme (`EXPO_PUBLIC_WEB_APP_URL` pour surcharger) |
| `mobile/android/` | Projet natif Android (commité → build Gradle direct) |
| `mobile/scripts/` | Scripts de build local (`build-android.mjs`, keystore, signature) |
| `mobile/build/` | **Vos APK/AAB générés** (ignoré par Git) |

---

## 0-bis. Obtenir l'APK **sans rien installer sur votre PC** (GitHub Actions) ⭐

Le workflow `.github/workflows/android.yml` installe **tout** sur le runner
GitHub : Node.js 22, JDK 17, Android SDK (platform-tools, platform 36,
build-tools 36.0.0, NDK 27.1.12297006 — versions lues dans le projet),
dépendances, puis compile avec le Gradle Wrapper du dépôt.

```
git push origin main
        ↓
GitHub Actions (ubuntu-latest)
        ↓
Batibuild-debug.apk · Batibuild-release.apk · Batibuild-release.aab
        ↓
Artifacts du run (téléchargeables)
```

**Déclencher le build :**

1. Poussez sur `main` : le workflow démarre automatiquement (dès qu'un fichier
de `mobile/` change).
2. Ou manuellement : **GitHub → onglet Actions → « Android — APK & AAB » →
   Run workflow** (choix des ABI et option « forcer prebuild »).
3. Quand le run est vert (✅), ouvrez-le et téléchargez les 3 fichiers dans la
   section **Artifacts** en bas de page.

Installation sur le téléphone : copiez `Batibuild-release.apk` et ouvrez-le
(aucun câble, aucun SDK requis).

### Si un run échoue — où lire la vraie cause

Les tâches Gradle sont lancées via `mobile/scripts/ci-gradle.sh`. En cas
d'échec, ce script extrait automatiquement :

- la section **`* What went wrong:`** (la cause réelle, pas le pavé de
  stacktrace) ;
- la liste des **tâches en échec** (`> Task … FAILED`) ;
- les **signatures connues** : `OutOfMemoryError`, `Killed`,
  `No space left on device`, `ninja: build stopped`, `CMake Error`, `e: file` ;
- l'**espace disque** et la **mémoire** au moment de l'échec.

Ce bloc apparaît dans le log de l'étape, dans l'étape
« 🔍 Cause de l'échec (extrait des logs Gradle) » et dans le **résumé du run**
(page du run, lisible depuis le téléphone).

Environnement de build CI : `ubuntu-latest`, Node 22, JDK 17, Android SDK
platform 36 / build-tools 36.0.0 / NDK 27.1.12297006 / CMake 3.22.1, Gradle
Wrapper 9.3.1, 2 ABI (`arm64-v8a,armeabi-v7a`) et compilation C++ limitée à
2 processus parallèles (`CMAKE_BUILD_PARALLEL_LEVEL=2`) pour tenir dans la RAM
du runner.

### Clé de signature debug (à ne pas confondre avec le keystore Release)

`android/app/build.gradle` déclare `signingConfigs.debug { storeFile file('debug.keystore') }`.
Le fichier **`mobile/android/app/debug.keystore` doit donc exister**, sinon Gradle
échoue (souvent après une longue compilation) avec :

```
Execution failed for task ':app:validateSigningDebug'.
> Keystore file '.../android/app/debug.keystore' not found for signing config 'debug'.
```

Ce n'est **pas un secret** : c'est la clé debug standard d'Android
(alias `androiddebugkey`, mot de passe `android`, dname `CN=Android Debug`).
Elle est **versionnée dans le dépôt** (`mobile/.gitignore` la réautorise
explicitement) et **régénérée automatiquement** si elle manque :

```bash
npm run keystore:debug        # crée android/app/debug.keystore si absent/invalide
```

Le workflow GitHub Actions exécute cette étape avant tout build, puis
`./gradlew :app:signingReport` qui échoue en quelques secondes (et non après
15 minutes de compilation) si une configuration de signature référence un
fichier absent.

> Un seul ABI est compilable via **Actions → Run workflow → architectures** :
> `arm64-v8a` divise encore le temps et la mémoire par deux (couvre tous les
> téléphones récents ; `armeabi-v7a` n'est utile qu'aux appareils 32 bits).

> Aucun outil Android (JDK, Android Studio, Gradle, SDK) n'est nécessaire sur
> votre machine. Les sections 1 à 13 ci-dessous ne concernent que le build
> **local**, utile uniquement pour déboguer hors CI.

### Scripts disponibles

| Commande | Effet |
|---|---|
| `npm run android:apk` | **APK Release** → `mobile/build/Batibuild-release.apk` |
| `npm run android:debug` | **APK Debug** → `mobile/build/Batibuild-debug.apk` |
| `npm run android:aab` | **AAB Release** → `mobile/build/Batibuild-release.aab` |
| `npm run android:install` | Installe l'APK sur l'appareil branché en USB (`adb install`) |
| `npm run android:clean` | `gradlew clean` (vide les sorties de build) |
| `npm run android:prebuild` | Resynchronise `android/` depuis `app.json` |
| `npm run signing:apply` | Réapplique la signature Release après un prebuild |
| `npm run keystore:generate` | Crée un keystore Release local + `keystore.properties` |
| `npm run keystore:debug` | Recrée la clé **debug** Android si `android/app/debug.keystore` manque |

> Gestionnaire de paquets : le projet utilise **Bun** (`bun.lock` présent). Les
> commandes `npm` ci-dessus fonctionnent à l'identique ; `bun run android:apk`
> fonctionne aussi.

---

## 1. Installation de Node.js

- **Node.js 20.19.4 ou plus récent** (recommandé : **Node 22 LTS**).
- Téléchargement : <https://nodejs.org> (installeur LTS) ou gestionnaire de version
  (`nvm`, `fnm`, `volta`).
- Vérification :

```bash
node --version    # ≥ v20.19.4
npm --version
```

Optionnel mais recommandé (lockfile du projet) :

```bash
npm install -g bun     # ou : curl -fsSL https://bun.sh/install | bash
```

## 2. Installation du Java / JDK

Le projet utilise **Gradle 9.3.1 + Android Gradle Plugin 8.12** → **JDK 17 requis**
(JDK 21 fonctionne également, JDK 11 **non**).

- Téléchargement : **Eclipse Temurin 17** — <https://adoptium.net/temurin/releases/?version=17>
- Windows / macOS : installeur `.msi` / `.pkg`
- Linux (Debian/Ubuntu) :

```bash
sudo apt install openjdk-17-jdk
```

Définir `JAVA_HOME` :

| OS | Variable |
|---|---|
| Windows | `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17...` (variables d'environnement système) |
| macOS/Linux | `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` (macOS) ou chemin du JDK dans `~/.zshrc` / `~/.bashrc` |

Vérification :

```bash
java -version     # doit afficher 17.x
echo $JAVA_HOME   # doit pointer vers le JDK 17
keytool -help     # requis pour la signature (§11)
```

## 3. Installation d'Android Studio

1. Télécharger **Android Studio** : <https://developer.android.com/studio>
2. À l'installation, cocher **Android SDK**, **Android SDK Platform**, **Android
   Virtual Device** (émulateur) et **Android SDK Command-line Tools**.
3. Lancer Android Studio une première fois et laisser l'assistant terminer
   l'installation du SDK.

Le projet fonctionne aussi **sans Android Studio** (SDK command-line tools +
platform-tools suffisent), mais Android Studio est recommandé pour déboguer.

## 4. Configuration du SDK Android

Dans Android Studio : **Settings → Languages & Frameworks → Android SDK**

| Onglet | À installer |
|---|---|
| **SDK Platforms** | **Android 16 (API 36)** — cible de compilation du projet |
| **SDK Tools** | *Android SDK Build-Tools*, *Android SDK Platform-Tools*, *Android SDK Command-line Tools*, *NDK (Side by side)*, *CMake* |

Définir la variable d'environnement du SDK :

| OS | Valeur |
|---|---|
| Windows | `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk` |
| macOS | `ANDROID_HOME=$HOME/Library/Android/sdk` |
| Linux | `ANDROID_HOME=$HOME/Android/Sdk` |

Ajouter au `PATH` : `$ANDROID_HOME/platform-tools` et `$ANDROID_HOME/cmdline-tools/latest/bin`.

Vérification :

```bash
echo $ANDROID_HOME
ls $ANDROID_HOME/platforms        # doit contenir android-36
```

> Les versions cibles (`compileSdk`, `targetSdk`, `minSdk`, `buildTools`, `ndk`)
> sont définies par Expo SDK 57 — **ne pas les modifier** : le build local les
> résout automatiquement.

## 5. Configuration d'ADB

`adb` est fourni par *Android Platform-Tools* (installé en §4).

1. Sur le téléphone : **Paramètres → À propos → Numéro de build** (7 taps) pour
   activer le mode développeur.
2. **Options pour les développeurs → Débogage USB** → activer.
3. Brancher en USB, accepter la demande d'autorisation sur le téléphone.
4. Vérifier :

```bash
adb devices
# List of devices attached
# R58M12ABCDE     device      ← « device » = prêt
```

> Sous Linux, des règles udev peuvent être nécessaires pour voir l'appareil.
> En cas de problème réseau : `adb kill-server && adb start-server`.

## 6. Installation des dépendances du projet (build local)

```bash
cd mobile
npm install          # ou : bun install
```

Ce que fait `npm install` :

- installe Expo SDK 57, React Native 0.86, `react-native-webview`, etc. ;
- prépare `node_modules` utilisés par le Gradle Wrapper (`react-native`,
  `expo`, `@expo/cli`) — **indispensable avant tout build Gradle**.

Le projet natif `android/` est **déjà présent dans le dépôt** : aucun
`expo prebuild` n'est nécessaire pour compiler. Ne le lancer que si vous modifiez
`app.json` :

```bash
npm run android:prebuild     # resynchronise android/ depuis app.json
npm run signing:apply        # réapplique la signature Release (prebuild l'efface)
```

## 7. Génération de l'APK Debug

```bash
npm run android:debug
```

Sortie :

```
mobile/build/Batibuild-debug.apk
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

L'APK debug est **auto-signé** et utilisable immédiatement pour tester sur un
téléphone. Équivalent direct :

```bash
cd android && ./gradlew assembleDebug          # macOS / Linux
cd android && gradlew.bat assembleDebug        # Windows (cmd / PowerShell)
```

## 8. Génération de l'APK Release

```bash
npm run android:apk
```

Sortie :

```
mobile/build/Batibuild-release.apk        ← à transférer / installer
```

- Si un keystore Release est configuré (§11) → APK **signé avec votre clé**.
- Sinon → repli automatique sur la clé debug (installable pour tester, **refusé
  par Google Play**). Le script affiche un avertissement dans ce cas.

Équivalent direct :

```bash
cd android && ./gradlew assembleRelease        # macOS / Linux
cd android && gradlew.bat assembleRelease      # Windows
```

**Build plus rapide** (uniquement les ABI des téléphones réels) :

```bash
ARCHS=arm64-v8a,armeabi-v7a npm run android:apk          # macOS / Linux
set ARCHS=arm64-v8a,armeabi-v7a && npm run android:apk   # Windows cmd
```

Pour forcer la resynchronisation du projet natif dans la même commande : `PREBUILD=1 npm run android:apk`.

## 9. Génération de l'AAB (Google Play)

```bash
npm run android:aab
```

Sortie :

```
mobile/build/Batibuild-release.aab
```

Le `.aab` est le format exigé par Google Play Console. Il doit être signé avec
votre clé Release (§11).

## 10. Installation sur un téléphone

**Par USB (recommandé) :**

```bash
npm run android:install
# ou manuellement :
adb install -r mobile/build/Batibuild-release.apk
```

**Par transfert de fichier :**

1. Copiez `mobile/build/Batibuild-release.apk` sur le téléphone (USB, cloud, e-mail).
2. Ouvrez le fichier depuis le téléphone et autorisez « Installer des
   applications inconnues » pour votre gestionnaire de fichiers.

**Émulateur Android** : `npm run android:dev` (ou `npx expo run:android`) compile et
installe l'app sur l'émulateur en une commande.

## 11. Configuration du keystore (signature Release)

Un keystore identifie définitivement votre application. **Conservez-le** : sans lui,
impossible de publier une mise à jour sur Google Play.

### Génération locale (recommandée)

```bash
npm run keystore:generate
```

Le script crée :

- `mobile/android/keystore/batibuild-release.keystore` (fichier binaire)
- `mobile/android/keystore.properties` (chemin, alias, mots de passe)

…puis affiche **une seule fois** le mot de passe généré : notez-le dans un
gestionnaire de mots de passe.

Personnalisation :

```bash
ANDROID_KEY_ALIAS=batibuild \
ANDROID_KEYSTORE_PASSWORD='MonMotDePasseSolide' \
npm run keystore:generate
```

### Ou avec keytool directement

```bash
keytool -genkeypair -v \
  -keystore mobile/android/keystore/batibuild-release.keystore \
  -alias batibuild -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12
```

puis créez `mobile/android/keystore.properties` :

```properties
storeFile=keystore/batibuild-release.keystore
storePassword=********
keyAlias=batibuild
keyPassword=********
```

### Deux modes supportés par Gradle

Gradle résout la signature dans cet ordre (voir `android/app/build.gradle`) :

1. **`android/keystore.properties`** (chemin relatif à `mobile/android/`) ;
2. **Variables d'environnement** :

| Variable | Rôle |
|---|---|
| `ANDROID_KEYSTORE_PATH` | chemin du `.keystore` (absolu ou relatif à `mobile/android/`) |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | alias de la clé |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé (défaut : celui du keystore) |

Exemple ponctuel sans rien écrire sur le disque :

```bash
ANDROID_KEYSTORE_PATH=keystore/batibuild-release.keystore \
ANDROID_KEYSTORE_PASSWORD='…' ANDROID_KEY_ALIAS=batibuild \
npm run android:apk
```

### Sécurité

- `keystore.properties`, `android/keystore/`, `*.jks`, `*.keystore`, `*.p12` sont
  **ignorés par Git** (voir `mobile/.gitignore`). Seule exception :
  `android/app/debug.keystore`, la clé **debug** publique du modèle Android
  (alias `androiddebugkey`, mot de passe `android`, `CN=Android Debug`), qui
  **doit** être versionnée pour que `:app:validateSigningDebug` passe sur un
  clone ou un runner vierge. Elle ne sert jamais à publier sur Google Play.
- Aucun mot de passe n'est écrit dans le code ni affiché dans les logs Gradle.
- Sauvegardez keystore + mots de passe **hors du dépôt** (coffre-fort, disque chiffré).

## 12. Build iOS (macOS uniquement)

Le build iOS **n'existe que sur macOS** (Xcode). Aucun EAS n'est utilisé.

```bash
cd mobile
npm install
npx expo prebuild --platform ios       # génère ios/ (non commité : CNG)
npx expo run:ios                       # compile et lance sur simulateur/appareil
```

Pour distribuer (TestFlight / App Store) : ouvrez `mobile/ios/*.xcworkspace`
dans **Xcode**, configurez votre équipe de signature, puis
**Product → Archive → Distribute App**. Compte Apple Developer requis.

## 12b. Pourquoi `expo-doctor` montre un contrôle désactivé ?

`npx expo-doctor` signale que `appConfigFieldsNotSyncedCheck` est désactivé
(`package.json` → `expo.doctor`). C'est **volontaire** : ce contrôle avertit que
les propriétés natives d'`app.json` ne sont pas resynchronisées automatiquement
lorsque `android/` est présent dans le dépôt.

Or ici `android/` **doit** être commité pour permettre le build Gradle direct
(`./gradlew assembleRelease`) sans montage CNG ni service cloud. La
synchronisation reste possible et explicite :

```bash
npm run android:prebuild   # applique app.json → android/
npm run signing:apply      # réapplique la signature Release
```

Toutes les autres vérifications de `expo-doctor` restent actives (20/20 ✅).

## 13. Dépannage

| Symptôme | Cause / solution |
|---|---|
| `JAVA_HOME is not set` ou « Could not determine java version » | JDK 17 non installé ou `JAVA_HOME` mal défini → §2 |
| `SDK location not found. Define a valid SDK location` | `ANDROID_HOME` absent, ou créez `mobile/android/local.properties` avec `sdk.dir=/chemin/vers/Android/Sdk` |
| `Failed to install the following Android SDK packages ... build-tools` | Ouvrez le SDK Manager → cochez **Android SDK Build-Tools** (§4) |
| `Gradle build daemon disappeared unexpectedly` / build très long | Mémoire insuffisante (4 ABI). Utilisez `ARCHS=arm64-v8a,armeabi-v7a npm run android:apk` ; `org.gradle.jvmargs` est déjà à 4096m dans `android/gradle.properties` |
| `Execution failed for task ':app:createBundleReleaseJsAndAssets'` (heap) | Augmentez la mémoire Node : `NODE_OPTIONS=--max-old-space-size=8192 npm run android:apk` |
| `adb: command not found` | Ajoutez `$ANDROID_HOME/platform-tools` au `PATH` → §5 |
| `adb devices` vide | Débogage USB non activé, câble de données, ou autorisation refusée sur le téléphone → §5 |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Une version de l'app est déjà installée avec une autre clé → `adb uninstall com.batibuild.app` |
| `Execution failed for task ':app:validateSigningDebug'` → `Keystore file '…/android/app/debug.keystore' not found` | La clé **debug** manque (clone frais / `android/` régénéré) → `npm run keystore:debug` (ou `expo prebuild` régénère le fichier d'origine) |
| **CI** : `:app:validateSigningDebug` échoue | Le workflow lance `node scripts/ensure-debug-keystore.mjs` avant les builds : si l'échec persiste, vérifiez que `keytool` est bien disponible (étape *Setup JDK 17*) et que `android/app/debug.keystore` est présent dans le dépôt |
| **CI** : `:app:signingReport` échoue juste après les diagnostics | Une configuration de signature pointe vers un fichier absent — c'est volontaire : l'échec survient en quelques secondes au lieu d'après 15 min de compilation. Regardez la section « What went wrong » du log `signing` |
| APK installé mais « Application non installée » | Signature release avec clé debug sur un appareil exigeant une signature, ou APK corrompu : régénérez via `npm run android:apk` |
| Écran blanc / « Impossible de charger BatiBuild » **dans l'app** | Problème réseau côté téléphone — l'écran natif propose **Réessayer** |
| Le guide réapparaît à chaque lancement | Stockage local effacé (désinstallation/réinstallation) — comportement attendu |
| `Cannot find module 'react-native/package.json'` au build Gradle | `npm install` non lancé dans `mobile/` → §6 |
| `gradlew: Permission denied` (macOS/Linux) | `chmod +x mobile/android/gradlew` |
| Erreur de licence SDK | `yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses` |
| **CI** : `Killed` / `OutOfMemoryError` / `Java heap space` pendant la compilation C++ | RAM du runner saturée par la compilation parallèle → le workflow limite déjà CMake à 2 processus ; relancez avec `arm64-v8a` seul (Actions → Run workflow → architectures) |
| **CI** : `No space left on device` | Disque du runner plein → le workflow supprime déjà les NDK/émulateurs/sources inutilisés ; relancez avec `arm64-v8a` seul |
| **CI** : `CMake '3.22.1' was not found in SDK, PATH, or by cmake.dir property` | Le workflow installe `cmake;3.22.1` explicitement — si l'erreur revient, vérifiez l'étape « Installation des composants Android SDK du projet » |

### Android Studio (alternative au terminal)

1. Android Studio → **Open** → sélectionnez `mobile/android` ;
2. laissez Gradle se synchroniser (JDK 17 dans *Settings → Build → Build Tools → Gradle*) ;
3. choisissez un appareil dans la barre d'outils → **Run** ▶ ;
4. **Build → Generate Signed App Bundle / APK** pour produire un APK Release signé.

Aucune connexion EAS/Expo n'est nécessaire.

---

## Récapitulatif — du code à l'APK

```bash
# 1. Dépendances (une seule fois)
cd mobile && npm install

# 2. Keystore Release (une seule fois)
npm run keystore:generate

# 3. Build 100 % local
npm run android:apk          # → mobile/build/Batibuild-release.apk
npm run android:aab          # → mobile/build/Batibuild-release.aab

# 4. Installation
npm run android:install
```

Aucun `eas build`, aucun `EXPO_TOKEN`, aucun compte Expo, aucun service cloud.
