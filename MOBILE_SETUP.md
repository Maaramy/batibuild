# MOBILE_SETUP — BatiBuild Mobile (Expo + Gradle local, sans EAS)

Mise en place de l'application mobile BatiBuild : enveloppe **WebView** native
(Splash + onboarding) autour de <https://budgetbati.freebuff.app/>.

> ⚠️ **Aucun service cloud n'est utilisé.** EAS Build a été retiré du projet :
> plus de `eas.json`, plus de workflow EAS, plus de `EXPO_TOKEN`.
> Toutes les compilations se font **en local** avec le **Gradle Wrapper** du projet.
>
> 📘 Procédure détaillée pas à pas (Node, JDK, SDK, ADB, keystore, dépannage) :
> **[`MOBILE_BUILD.md`](./MOBILE_BUILD.md)**.

---

## 1. Prérequis

| Outil | Version | Notes |
|---|---|---|
| Node.js | ≥ 20.19.4 (22 LTS conseillé) | requis par Expo SDK 57 |
| Bun (optionnel) | dernière | `bun.lock` est le lockfile du projet |
| JDK | **17** (Temurin) | requis par Gradle 9.3.1 / AGP 8.12 |
| Android SDK | API 36 + Build-Tools + Platform-Tools + NDK | via Android Studio |
| `ANDROID_HOME` / `JAVA_HOME` | définis | voir `MOBILE_BUILD.md` §2 et §4 |
| macOS + Xcode | pour iOS uniquement | aucun EAS requis |

## 2. Installation

```bash
cd mobile
npm install          # ou : bun install
```

Le projet natif `android/` est **commité** : il n'y a pas de `prebuild`
obligatoire avant de compiler.

## 3. Développement local

```bash
npm run start              # Metro (serveur de dev local)
npm run android            # compile + installe sur émulateur/appareil (expo run:android)
npm run ios                # idem iOS (macOS + Xcode requis)
npm run typecheck          # tsc --noEmit
```

## 4. Build Android local (APK / AAB)

```bash
npm run android:debug      # APK debug  → build/Batibuild-debug.apk
npm run android:apk        # APK release → build/Batibuild-release.apk
npm run android:aab        # AAB release → build/Batibuild-release.aab
npm run android:install    # adb install du dernier APK généré
npm run android:clean      # ./gradlew clean
```

Équivalents directs :

```bash
cd android && ./gradlew assembleRelease     # macOS / Linux
cd android && gradlew.bat assembleRelease   # Windows (cmd / PowerShell)
```

Les fichiers produits restent également dans
`android/app/build/outputs/apk/...` et `.../bundle/release/...`.

### Build plus rapide (téléphones réels uniquement)

```bash
ARCHS=arm64-v8a,armeabi-v7a npm run android:apk     # macOS / Linux
set ARCHS=arm64-v8a,armeabi-v7a && npm run android:apk   # Windows cmd
```

## 5. Signature Release (keystore local)

```bash
npm run keystore:generate
```

Crée `android/keystore/batibuild-release.keystore` +
`android/keystore.properties` (tous deux **ignorés par Git**) et affiche une
seule fois le mot de passe généré — conservez-le hors du dépôt.

Gradle accepte deux sources de configuration, dans cet ordre :

1. `android/keystore.properties` ;
2. variables d'environnement `ANDROID_KEYSTORE_PATH`,
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

Sans keystore, l'APK/AAB release est signé avec la **clé debug** : installable
pour tester, mais **refusé par Google Play**. Aucun mot de passe n'est jamais
commité ni affiché dans les logs.

## 6. Synchronisation avec `app.json`

`expo prebuild` régénère `android/` et **écrase** les personnalisations
(`build.gradle`). Après toute modification d'`app.json` (permissions, nom,
version, icônes, splash) :

```bash
npm run android:prebuild   # resynchronise android/
npm run signing:apply      # réapplique la signature Release (idempotent)
```

## 7. Environnement d'exécution

L'URL de la plateforme est définie **une seule fois** dans
`mobile/src/config.ts` (défaut : `https://budgetbati.freebuff.app/`).
Pour la surcharger sans toucher au code : `EXPO_PUBLIC_WEB_APP_URL`.

Seuls les hôtes `*.freebuff.app` restent dans la WebView ; les autres domaines
s'ouvrent dans le navigateur système.

## 8. Intégration continue (optionnelle)

`.github/workflows/android.yml` construit les mêmes trois artefacts avec le
**Gradle Wrapper** sur un runner GitHub (aucun crédit EAS, aucun cloud de build
tiers). Ce workflow est **facultatif** : le build de référence reste local.

## 9. iOS (macOS uniquement)

```bash
npm run prebuild
npx expo run:ios
```

Pour TestFlight / App Store : ouvrez `mobile/ios/*.xcworkspace` dans Xcode,
configurez la signature (compte Apple Developer), puis **Product → Archive**.

## 10. Dépannage rapide

| Problème | Solution |
|---|---|
| `SDK location not found` | définir `ANDROID_HOME` (ou `android/local.properties`) — `MOBILE_BUILD.md` §4 |
| Build très long / daemon tué | `ARCHS=arm64-v8a,armeabi-v7a npm run android:apk` |
| `adb: command not found` | ajouter `$ANDROID_HOME/platform-tools` au `PATH` |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | `adb uninstall com.batibuild.app` |
| Signature release en clé debug | `npm run keystore:generate` puis rebuild |

Table de dépannage complète : `MOBILE_BUILD.md` §13.
