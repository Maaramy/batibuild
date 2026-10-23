# batibuild Mobile — Obtention des APK (GitHub Actions ⭐ ou local)

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
batibuild MOBILE
   ├── Splash natif          (expo-splash-screen + écran React Native)
   ├── Onboarding            (4 écrans, 1ʳᵉ installation — « Passer » / « Commencer »)
   └── WebView               → https://batibuild.app/
```

L'application est une **enveloppe WebView** : la plateforme Web batibuild reste la
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
Batibuild-release.apk · Batibuild-release.aab
        ↓
Upload Nexus 3 (dépôt RAW) : Batibuild-release.apk + Batibuild-release.aab
(chacun VÉRIFIÉ : taille, ZIP, entrées, signature — un seul upload, hors quota)
        +
GitHub Release (tag `v*`, lancement manuel — `publish_release` par défaut —
ou push de branche en pré-version) : les 2 mêmes fichiers
```

**Déclencher le build :**

1. Poussez sur `main` : le workflow démarre automatiquement (dès qu'un fichier
de `mobile/` change).
2. Ou manuellement : **GitHub → onglet Actions → « Android — APK & AAB » →
   Run workflow** (choix des ABI et option « forcer prebuild »).
3. Quand le run est vert (✅), récupérez les fichiers depuis le **Nexus 3**
   (dépôt RAW `NEXUS_REPOSITORIES`, chemin `NEXUS_PATH`, par défaut
   `/batibuild/`). Si le run publie une **GitHub Release**, les 2 mêmes fichiers
   y sont **aussi** attachés : téléchargez-les depuis l'onglet **Releases**.

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

### Publication des APK/AAB — GitHub Release + Nexus 3 (+ artefact de secours)

Historique : le stockage d'artefacts GitHub Actions renvoyait

```
Failed to CreateArtifact: Artifact storage quota has been hit.
Unable to upload any new artifacts. Usage is recalculated every 6-12 hours.
```

Cette erreur ne venait **ni du code Android ni de Gradle** : elle venait du
**stockage des artefacts GitHub Actions**, partagé par tous les runs du dépôt.
La copie durable ne dépend donc plus de ce stockage : les APK/AAB sont attachés
à une **GitHub Release** (stockage distinct, aucune limite de 90 jours) et,
si les secrets existent, poussés dans le **Nexus 3 Repository Manager** (dépôt
RAW) via `astertom/nexus-upload-artifact@v1`. L'artefact GitHub Actions n'est
plus qu'un **complément de secours**, non bloquant (5 jours de rétention).

| Élément | Configuration |
|---|---|
| Dépôt(s) Nexus | `NEXUS_REPOSITORIES` (variable de dépôt, défaut `raw`) — liste séparée par des virgules |
| Chemin dans le dépôt RAW | `NEXUS_PATH` (variable de dépôt, défaut `/batibuild/`) |
| Identifiants | **secrets** `NEXUS_HOST_URL`, `NEXUS_USER`, `NEXUS_TOKEN` — jamais en clair |
| Fichiers publiés | **`Batibuild-release.apk`** et **`Batibuild-release.aab`** uniquement (jamais l'APK debug, ni `node_modules`, caches Gradle ou logs) |
| Garde-fou | exécuté **après** la publication : il vérifie via l'API GitHub que la Release contient réellement les 2 fichiers, ou que l'upload Nexus a réussi. Aucune copie durable → le run **échoue** avec la cause exacte (jamais de build silencieusement perdu) |

Les 2 fichiers sont d'abord recopiés dans `mobile/artifacts-release/` sur le
runner — l'action Nexus cherche dans `GITHUB_WORKSPACE` (`directory` est relatif
à la racine du dépôt) — puis envoyés en **un seul upload**.

> **Si les secrets `NEXUS_*` sont absents**, l'étape Nexus est simplement
> ignorée : la **GitHub Release** publiée juste après (voir la section
> suivante) assure la copie durable, et le garde-fou passe au vert sans aucun
> secret Nexus.
>
> Un upload Nexus **en échec** n'invalide plus le run dès que la Release a
> réellement été créée avec ses 2 fichiers : la copie durable existe.

Le nettoyage des artefacts GitHub est **conservé** : le job `cleanup-artifacts`
purge à chaque run les artefacts résiduels laissés par les anciens runs
(`continue-on-error: true` : il ne bloque jamais le build).

Utilitaires locaux :

```bash
npm run android:artifacts:test      # vérifie la politique de nettoyage (hors ligne)
npm run android:artifacts:cleanup   # purge les artefacts GitHub résiduels (GITHUB_TOKEN requis)
```

### Publication en GitHub Release — conserver un build durablement

En complément du Nexus 3, les APK/AAB sont **aussi attachés à une GitHub
Release** (stockage distinct, sans limite de 90 jours) : ce canal est conservé
tel quel.

| Déclencheur | Résultat |
|---|---|
| `git push origin v1.3.3` (tag **`v*`**) | Build complet puis Release **`v1.3.3`** contenant `Batibuild-release.apk` et `Batibuild-release.aab` |
| *Actions → Run workflow* (**`publish_release`** = true par défaut) | Release **`v<version>-build<numéro de run>`** marquée *pré-version*, créée sur le commit lancé |
| `push` sur `main` | Release **`v<version>-build<numéro de run>`** (pré-version) — chaque build réussi est conservé, sans secret Nexus |
| *Run workflow* + **`publish_release`** = false | Aucune Release : seule une copie Nexus (si configurée) est produite, sinon le garde-fou final échoue explicitement |

```bash
git tag v1.3.3 && git push origin v1.3.3     # build + Release
```

Points importants :

- **Le tag doit correspondre à `mobile/app.json`** (`expo.version`). Un tag
  `v1.4.0` qui produirait l'APK `1.3.3` est **refusé** : aucune Release
  trompeuse ne peut exister. Mettez à jour `expo.version` /
  `expo.android.versionCode`, committez, puis créez le tag.
- Un tag avec suffixe (`v1.3.3-rc1`, `-beta.2`…) produit une **pré-version**,
  jamais proposée comme « dernière version ».
- La Release est publiée **même si l'upload Nexus a échoué** : un APK reste
  récupérable même si le Nexus est indisponible.
- **Idempotent** : relancer le workflow sur le même tag met à jour les fichiers
  joints au lieu d'échouer (`release already exists`).
- Les notes de version contiennent la version, le `versionCode`, les ABI
  compilées, la commande `adb install` et les **empreintes SHA-256** des deux
  fichiers ; le **résumé du run** affiche le lien de la Release.
- Les `paths` du workflow ne s'appliquent pas aux tags : un tag `v*` déclenche
  donc toujours le build.

Vérification hors ligne (aucune publication) :

```bash
cd mobile && bash scripts/publish-release.sh --dry-run
```

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
| `npm run android:preflight` | **Pré-vérifications seules** (dépendances, config Android, routes de la plateforme, assets, icônes, contrat WebView ↔ natif, workflow CI / artefacts, TypeScript) — aucune compilation |
| `npm run android:verify` | **Vérifie l'artefact** déjà généré (`build/Batibuild-release.apk`) : taille, structure ZIP, entrées obligatoires, signature |
| `npm run android:artifacts:test` | **Politique de nettoyage des artefacts** (hors ligne, sans réseau) |
| `npm run android:artifacts:cleanup` | Supprime les **anciens artefacts GitHub Actions** (quota) — nécessite `GITHUB_TOKEN` et `GITHUB_REPOSITORY` |
| `npm run android:artifacts:verify` | Confirme que l'artefact du run a bien été **publié et n'est pas vide** |
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
mobile/build/Batibuild-release.apk        ← à transférer / installer (vérifié)
mobile/build/BUILD-INFO.txt               ← version, versionCode, taille, SHA-256
mobile/build/logs/gradle-apk.log          ← journal complet du build
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

## 8-bis. Vérifications automatiques — une APK incomplète ne peut plus être publiée

Chaque `npm run android:apk|debug|aab` exécute maintenant une chaîne de contrôle
complète, et **s'arrête net** dès qu'un problème est détecté (jamais d'APK
partielle, jamais de fichier tronqué publié).

### Avant le build — `scripts/preflight-android.mjs`

| Contrôle | Détail |
|---|---|
| **Nettoyage** | supprime les fichiers temporaires/partiels (`*.tmp`, `*.part`, `*.partial`) des dossiers de sortie |
| **Dépendances** | chaque dépendance de `package.json` est présente dans `node_modules` + 12 modules critiques de la coque + catalogue React Native (`libs.versions.toml`) |
| **Configuration Android** | `app.json` (nom, version, `android.package`, `versionCode`, icônes), projet natif complet (Gradle, manifest, `MainActivity.kt`), permission `INTERNET`, clé `android/app/debug.keystore` |
| **Routes de la plateforme** | `/auth`, `/dashboard`, `/dashboard/profile`, `/dashboard/projects`, `/dashboard/reports`, `/dashboard/messages`, `/dashboard/support`, `/dashboard/settings` doivent exister dans `src/main.tsx` (sinon le menu mobile pointerait dans le vide) |
| **Contrat WebView ↔ natif** | le type `batibuild:unread` est identique des deux côtés, `MessagingBadgeSync` est monté dans `src/main.tsx`, `api.messaging.unreadCount` existe, l'onglet « Message » est présent, **aucun libellé « ROI »** ne subsiste, « Rapport » et « Mes projets » sont bien déclarés |
| **Assets / icônes** | fichiers de `mobile/assets/` non vides, assets référencés par `app.json` présents, composant `Logo` natif présent |
| **Icônes lucide** | `FileDown`, `User`, `HardHat`, `LayoutDashboard`, `MessageSquare`, `Headset`, `Settings`, `CloudOff` réellement exportées par la version installée |
| **Workflow CI** | `.github/workflows/android.yml` : **un seul** upload Nexus 3 (`astertom/nexus-upload-artifact@v1` : APK release + AAB release, jamais l'APK debug), identifiants en secrets (`NEXUS_HOST_URL` / `NEXUS_USER` / `NEXUS_TOKEN`), garde-fou « copie durable » (Nexus ou Release), GitHub Release conservée, nettoyage des artefacts GitHub résiduels (`artifact-storage.mjs cleanup`), motif d'upload strict, actions en **runtime Node 24** |
| **TypeScript** | `tsc --noEmit` du projet mobile (`SKIP_TYPECHECK=1` pour l'ignorer) |

### Corrections automatiques (avant d'échouer)

- projet natif `android/` absent ou incomplet → `expo prebuild` puis réapplication de la signature ;
- clé de signature **debug** manquante → régénération ;
- signature Release effacée par un prebuild → `apply-signing` ;
- bit exécutable de `gradlew` perdu (clone Windows → Linux) → `chmod +x` ;
- échec Gradle d'origine réparable (`validateSigning`, `Keystore file …`) → correction puis **une seule** nouvelle tentative.

### Après le build — `scripts/verify-artifact.mjs`

Ce script est la **porte d'entrée de toute publication** : il est exécuté par
`build-android.mjs`, par la CI (locale et GitHub Actions) et refuse de laisser
passer un APK qu'Android rejetterait.

> ⚠️ Il ne se contente plus de chercher la chaîne « APK Sig Block 42 » : cette
> ancienne heuristique pouvait déclarer « signé » un APK qui ne l'était pas.
> Toutes les valeurs sont désormais **lues, recalculées et vérifiées**.

| Contrôle | Détail |
|---|---|
| Existence / taille | fichier présent, ≥ 1 Mo et < 600 Mo (détecte un build interrompu) |
| Structure ZIP | en-tête `PK\x03\x04`, End Of Central Directory cohérent, répertoire central **entièrement** lisible, entrées en double refusées (détecte un APK **tronqué**) |
| Entrées obligatoires | APK : `AndroidManifest.xml`, `classes.dex`, `resources.arsc` · AAB : `BundleConfig.pb`, `base/manifest/AndroidManifest.xml` |
| Manifeste | lecture du manifeste binaire : `package`, `versionCode`, `minSdk`/`targetSdk`, refus si `testOnly="true"` ; comparaison possible au `applicationId` et au `versionCode` attendus (`--expect-package`, `--expect-version-code`) |
| Signature | schémas **réellement présents** (v1 JAR, v2, v3) ; un APK sans aucune signature est refusé (Android : « le package semble ne pas être valide ») |
| Intégrité | digest de contenu du schéma v2 **recalculé** (chunks de 1 Mo) et comparé au digest signé — détecte toute modification après signature (re-zip, recompression, `zipalign` après coup) |
| Signature cryptographique | vérification RSA PKCS#1 / RSA-PSS / ECDSA / DSA des données signées avec la clé du certificat |
| Certificat | sujet, empreinte SHA-256, dates de validité ; alerte explicite si la clé est la clé **debug** Android ; comparaison à une empreinte attendue (`--expect-cert-sha256`) |
| Installation Android | `resources.arsc` non compressé et aligné 4 octets (targetSdk ≥ 30), bibliothèques natives non compressées et alignées 4 Ko, au moins une ABI ARM |
| Empreinte | SHA-256 affiché dans les logs et dans `mobile/build/BUILD-INFO.txt` |

```bash
npm run android:verify        # sur mobile/build/Batibuild-release.apk
# ou, avec les contrôles attendus :
node scripts/verify-artifact.mjs build/Batibuild-release.apk \
  --expect-package com.batibuild.app --expect-version-code 13 \
  --require-schemes v1,v2 --require-release-cert \
  --expect-cert-sha256 AB:CD:…
```

### Logs et conservation des fichiers

```
mobile/build/Batibuild-release.apk   ← artefact vérifié (jamais supprimé par un autre mode)
mobile/build/Batibuild-debug.apk     ← conservé si déjà généré
mobile/build/Batibuild-release.aab   ← conservé si déjà généré
mobile/build/BUILD-INFO.txt          ← version, versionCode, taille, SHA-256, ABI, source, log
mobile/build/logs/gradle-<mode>.log  ← sortie Gradle complète
```

Chaque exécution se termine par un bandeau explicite :

```
════════════════════════════════════════════════════════════
 BUILD SUCCESS
════════════════════════════════════════════════════════════
```

ou, en cas d'échec, par le **BUILD FAILED** accompagné de la cause exacte
(section « What went wrong » de Gradle, tâches en échec, signatures connues :
`OutOfMemoryError`, disque plein, `ninja: build stopped`, `Keystore file … not found`…)
— l'artefact invalide est supprimé au lieu d'être distribué.

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

## 11bis. « Le package semble ne pas être valide » — diagnostic et correctif

### Ce qui se passait

L'APK publié (`Batibuild-release.apk`, ~41,5 Mo) était un **vrai APK** :
conteneur ZIP complet, `applicationId` `com.batibuild.app`, `versionCode 13`,
`minSdk 24` / `targetSdk 36`, deux ABI (`arm64-v8a` + `armeabi-v7a`),
bibliothèques natives alignées. Sa structure n'était donc pas en cause.

Deux défauts réels ont été constatés sur ce fichier :

| Constat | Conséquence |
|---|---|
| Signature assurée par la clé **debug** Android (`CN=Android Debug`, empreinte `FA:C6:17:45:…`) — aucun keystore de production n'était configuré | Un APK debug-signed **ne peut pas remplacer** une application signée avec une autre clé : Android refusa la mise à jour (« le package semble ne pas être valide »). Il est également refusé par Google Play. |
| Signature **v2 uniquement** (aucune signature v1/JAR) : AGP désactive v1 dès que `minSdk ≥ 24` | Plusieurs analyseurs de paquets et installateurs ne lisent que les signatures JAR ; sans `META-INF/*.RSA`, ils rejettent le fichier avant même de vérifier sa version d'Android. |
| Contrôle CI trop faible | `apksigner verify … \| head -6` perdait le code de sortie d'`apksigner` (celui de `head` vaut 0), et `verify-artifact.mjs` cherchait simplement la chaîne « APK Sig Block 42 » dans le fichier : un APK mal signé pouvait donc être publié. |

### Ce qui a été corrigé

1. **Signature v1 + v2 + v3 posée par `apksigner`** (étape CI
   « Signer l'APK release (apksigner — JAR v1 + v2 + v3) »).
   `android/app/build.gradle` demande bien `enableV1Signing`/`enableV2Signing`
   (réappliqué par `npm run signing:apply`), mais **AGP n'ajoute la signature
   JAR que si `minSdk < 24`** : notre `minSdk` est 24, et le `signingConfig`
   peut de surcroît être réécrit par `expo prebuild` ou le React Native Gradle
   Plugin. D'où l'échec CI « ❌ Signature v1 (JAR) absente » : le drapeau Gradle
   ne suffit pas à garantir le schéma v1 sur l'APK release.
   La CI ne dépend donc plus de ce comportement : elle **réaligne** l'APK
   (`zipalign -P 16 -p -f 4`, pages 16 Ko pour les `.so`) puis le **signe
   elle-même** :

   ```bash
   apksigner sign --ks "$ANDROID_KEYSTORE_PATH" --ks-key-alias "$ANDROID_KEY_ALIAS" \
     --ks-pass env:ANDROID_KEYSTORE_PASSWORD --key-pass env:ANDROID_KEY_PASSWORD \
     --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
     --out /tmp/dist/Batibuild-release.apk /tmp/dist/Batibuild-aligned.apk
   ```

   L'APK ainsi signé **remplace** la sortie Gradle dans `/tmp/dist` : c'est ce
   fichier exact qui est contrôlé, publié et retéléchargé plus bas. Sans
   secrets `KEYSTORE_*`, la même commande utilise la clé debug versionnée
   (installation sur téléphone vierge uniquement) ; si `ANDROID_KEYSTORE_PATH`
   est défini mais introuvable, le job **échoue** au lieu de signer en debug.
   Le `.idsig` de la v4 est supprimé (aucun fichier parasite publié).
2. **Contrôles bloquants** dans GitHub Actions, avant toute publication :
   `apksigner verify --verbose --print-certs` (code retour **capturé**),
   présence effective et **valide** des schémas `v1` et `v2` (v3 signalée),
   entrées `META-INF/*.SF` + `META-INF/*.RSA` retrouvées dans l'archive,
   `zipalign -c -p 4` **après** signature, `aapt2 dump badging` (package,
   `versionCode`, SDK, ABI), puis `verify-artifact.mjs` (digest de contenu +
   signature cryptographique + certificat). Aucun de ces contrôles n'est
   désactivable pour « faire passer » un APK.
3. **Fidélité du fichier publié** : l'APK est **retéléchargé** depuis la
   GitHub Release et son SHA-256 doit être identique à l'artefact vérifié.
4. **Certificat surveillé** : empreinte SHA-256 du keystore affichée dans le
   résumé du run et comparée à celle de l'APK ; si les secrets `KEYSTORE_*`
   sont définis, un APK signé avec la clé debug est **refusé**.

### Installer l'APK sans erreur

1. Télécharger `Batibuild-release.apk` depuis la GitHub Release du run.
2. Vérifier le fichier (ordinateur, outillage Android installé) :

   ```bash
   apksigner verify --verbose --print-certs Batibuild-release.apk
   # doit afficher : Verified using v1 scheme … true / v2 scheme … true
   ```

   ou, sans SDK : `node mobile/scripts/verify-artifact.mjs Batibuild-release.apk`.
3. Si un message du type **« package semble ne pas être valide »** apparaît :
   une version de batibuild signée avec une **autre clé** est déjà installée.
   Désinstaller l'ancienne application (`adb uninstall com.batibuild.app`, ou
   Paramètres → Applications → batibuild → Désinstaller), puis réinstaller.
   Les données locales de l'application (guide, préférences) sont perdues ;
   les projets et le compte restent sur Convex, donc rien n'est perdu côté
   serveur.

### Configurer la clé de production (recommandé, obligatoire pour Google Play)

1. Générer le keystore une seule fois (voir §11) : `npm run keystore:generate`.
2. Ajouter trois secrets dans **Settings → Secrets and variables → Actions** :
   `KEYSTORE_BASE64` (`base64 -w0 keystore.jks`), `KEYSTORE_PASSWORD`,
   `KEYSTORE_ALIAS`.
3. Relancer le workflow : l'APK est signé avec cette clé, son empreinte est
   affichée dans le résumé, et toute publication avec une autre clé échoue.

> Conservez ce keystore hors du dépôt : **sans lui, aucune mise à jour de
> l'application publiée n'est possible** (Android refuse un changement de
> signature).

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
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` ou message Android **« L'application n'a pas été installée, car le package semble ne pas être valide »** | Une version de batibuild est déjà installée et signée avec une **autre clé** (voir §11bis) → désinstaller l'ancienne application, puis réinstaller l'APK. L'APK lui-même n'est pas corrompu si `npm run android:verify` passe |
| `Execution failed for task ':app:validateSigningDebug'` → `Keystore file '…/android/app/debug.keystore' not found` | La clé **debug** manque (clone frais / `android/` régénéré) → `npm run keystore:debug` (ou `expo prebuild` régénère le fichier d'origine) |
| **CI** : `:app:validateSigningDebug` échoue | Le workflow lance `node scripts/ensure-debug-keystore.mjs` avant les builds : si l'échec persiste, vérifiez que `keytool` est bien disponible (étape *Setup JDK 17*) et que `android/app/debug.keystore` est présent dans le dépôt |
| **CI** : `:app:signingReport` échoue juste après les diagnostics | Une configuration de signature pointe vers un fichier absent — c'est volontaire : l'échec survient en quelques secondes au lieu d'après 15 min de compilation. Regardez la section « What went wrong » du log `signing` |
| APK installé mais « Application non installée » | Signature release avec clé debug sur un appareil exigeant une signature, ou APK corrompu : régénérez via `npm run android:apk` |
| Écran blanc / « Impossible de charger batibuild » **dans l'app** | Problème réseau côté téléphone — l'écran natif propose **Réessayer** |
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
