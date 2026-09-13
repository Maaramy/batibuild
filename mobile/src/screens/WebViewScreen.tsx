import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { File, Paths } from "expo-file-system";
import Constants from "expo-constants";
import { WebView, type WebViewNavigation } from "react-native-webview";

import BottomNav from "../components/BottomNav";
import { Logo } from "../components/Logo";
import TopNav from "../components/TopNav";
import { OFFLINE_ICON } from "../components/icons";
import {
  activeNavId,
  CHANGE_MAX_MS,
  DASHBOARD_PATH,
  ENTRY_URL,
  isAppUrl,
  isAuthRoute,
  isDashboardRoute,
  isLandingRoute,
  LOADING_MESSAGE,
  pathOfUrl,
  SETTINGS_PATH,
  shouldShowBottomNav,
  SUPPORT_PATH,
  type NavDestination,
  type NavId,
} from "../config";
import { BlobDownloadBridge, guessMime, shareFile } from "../download";
import {
  DOWNLOAD_BRIDGE_SCRIPT,
  ENTRY_GUARD_SCRIPT,
  MOBILE_CHROME_SCRIPT,
  navigateScript,
  SHARE_BRIDGE_SCRIPT,
} from "../injected";
import { COLORS, SHAPE, useAppTheme } from "../theme";

/**
 * Borne de 1 seconde pour TOUT écran de chargement — ouverture, page ou menu
 * (voir `CHANGE_MAX_MS`). Passé ce délai, la WebView reprend la main avec son
 * propre état de chargement : l'application ne reste jamais bloquée sur le
 * loader, et aucun écran de chargement ne dépasse une seconde.
 */
const CHANGE_LIMIT_MS = CHANGE_MAX_MS;

type Props = {
  onShowGuide: () => void;
  onResetGuide: () => void;
};

type WebViewError = { title: string; message: string };

export default function WebViewScreen({ onShowGuide, onResetGuide }: Props) {
  const theme = useAppTheme();

  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const errorRef = useRef(false);
  /** Pile des routes visitées — sert uniquement au bouton Back Android. */
  const historyRef = useRef<string[]>([]);
  /** Route courante (ref) : garde les callbacks de navigation stables. */
  const currentPathRef = useRef<string>(pathOfUrl(ENTRY_URL) || DASHBOARD_PATH);

  /** Route demandée par la barre de navigation, en attente de confirmation. */
  const pendingPathRef = useRef<string | null>(null);

  const [currentPath, setCurrentPath] = useState<string>(currentPathRef.current);
  /**
   * Onglet explicitement choisi parmi ceux qui partagent la route `/dashboard`
   * (« Projets » et « Dashboard »). Il départage l'état actif de la barre du
   * bas ; remis à `null` dès qu'on quitte cette route.
   */
  const [navOverride, setNavOverride] = useState<NavId | null>(null);
  const [loading, setLoading] = useState(true);
  /** Incrémenté à chaque chargement / changement : ré-arme la borne de 1 s. */
  const [changeSeq, setChangeSeq] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<WebViewError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /**
   * Pont des téléchargements « blob: » (PDF jsPDF : estimation du coût de
   * construction, analyse des matériaux IA…). Une seule instance pour la durée
   * de vie de la WebView : les morceaux d'un même fichier sont rassemblés entre
   * deux messages.
   */
  const bridgeRef = useRef<BlobDownloadBridge | null>(null);
  if (!bridgeRef.current) bridgeRef.current = new BlobDownloadBridge();

  /**
   * Démarre un écran de chargement borné à 1 seconde.
   * Utilisé à l'ouverture, à chaque chargement de page et à chaque changement
   * de menu depuis la barre de navigation.
   */
  const beginChange = useCallback(() => {
    setLoading(true);
    setChangeSeq((n) => n + 1);
  }, []);

  const retry = useCallback(() => {
    errorRef.current = false;
    pendingPathRef.current = null;
    setError(null);
    setLoading(true);
    setChangeSeq((n) => n + 1);
    setProgress(0);
    historyRef.current = [];
    currentPathRef.current = pathOfUrl(ENTRY_URL) || DASHBOARD_PATH;
    setCurrentPath(currentPathRef.current);
    setReloadKey((k) => k + 1);
    // `webRef` est démonté pendant l'état d'erreur : le remontage via `reloadKey`
    // suffit à relancer le chargement.
  }, []);

  const confirmExit = useCallback(() => {
    Alert.alert("Quitter BatiBuild ?", "Voulez-vous quitter l'application ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Quitter", style: "destructive", onPress: () => BackHandler.exitApp() },
    ]);
  }, []);

  // ---------- Android hardware back ----------
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (errorRef.current) {
        // Retour depuis l'écran d'erreur = réessayer.
        retry();
        return true;
      }

      const stack = historyRef.current;
      const current = stack.length ? stack[stack.length - 1] : "";
      const previous = stack.length >= 2 ? stack[stack.length - 2] : "";

      // /auth et la page d'accueil publique sont des RACINES du parcours
      // mobile : y revenir en arrière créerait une boucle (la page /auth
      // redirige vers /dashboard) ou ferait réapparaître la landing page.
      const isRoot = isAuthRoute(current) || isLandingRoute(current);
      const previousIsRoot = !!previous && (isAuthRoute(previous) || isLandingRoute(previous));

      if (canGoBackRef.current && !isRoot && !previousIsRoot) {
        webRef.current?.goBack();
        return true;
      }

      confirmExit();
      return true;
    });
    return () => sub.remove();
  }, [retry, confirmExit]);

  // Règle unique : quel que soit l'écran (ouverture, page, menu), le loader
  // natif dure 1 seconde au maximum, puis la WebView s'affiche.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), CHANGE_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [loading, changeSeq]);

  // ---------- interception des navigations ----------
  const handleShouldStart = useCallback((request: WebViewNavigation) => {
    const url = request.url;
    if (!url) return true;

    // Contenu généré côté client (exports PDF, aperçus…).
    if (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("about:")) {
      return true;
    }

    const schemeName = url.split(":")[0].toLowerCase();
    const isWeb = schemeName === "http" || schemeName === "https";

    // Schémas applicatifs (mailto:, tel:, sms:, whatsapp:, intent:, geo:, …)
    // → application système.
    if (!isWeb) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    // Pages de la plateforme → restent TOUJOURS dans la WebView.
    if (isAppUrl(url)) return true;

    // Liens externes → navigateur système.
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  const handleOpenWindow = useCallback((event: { nativeEvent: { targetUrl?: string } }) => {
    const url = event.nativeEvent.targetUrl;
    if (url && !isAppUrl(url) && url.startsWith("http")) {
      Linking.openURL(url).catch(() => {});
    }
  }, []);

  const handleNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    canGoBackRef.current = nav.canGoBack;
    const path = pathOfUrl(nav.url ?? "");
    if (!path) return;

    currentPathRef.current = path;
    setCurrentPath(path);

    // Hors de `/dashboard`, le choix « Projets / Dashboard » n'a plus de sens.
    if (!isDashboardRoute(path)) setNavOverride(null);

    // Le routeur a confirmé la route demandée : le loader disparaît tout de
    // suite (sans attendre la borne de 1 s).
    const pending = pendingPathRef.current;
    if (pending && path.split("?")[0] === pending.split("?")[0]) {
      pendingPathRef.current = null;
      setLoading(false);
    }

    const stack = historyRef.current;
    if (stack[stack.length - 1] === path) return;
    stack.push(path);
    // Borne la pile : suffisant pour le bouton Back, mémoire négligeable.
    if (stack.length > 40) stack.shift();
  }, []);

  /**
   * Barre de navigation inférieure → plateforme.
   *
   * La WebView n'est PAS recréée : on demande au routeur de la plateforme de
   * changer de page. Session, cookies, état et historique sont conservés, et le
   * bouton Back Android continue de revenir sur la page précédente.
   *
   * AUCUN écran de chargement au clic sur la barre du bas : le changement de
   * section est direct (la WebView affiche son propre état si nécessaire).
   */
  const handleNavSelect = useCallback(
    (destination: NavDestination) => {
      const currentActive =
        isDashboardRoute(currentPathRef.current) && navOverride
          ? navOverride
          : activeNavId(currentPathRef.current);
      if (currentActive === destination.id) return;

      // « Projets » et « Dashboard » partagent `/dashboard` : on mémorise
      // l'onglet réellement choisi pour l'état actif.
      setNavOverride(isDashboardRoute(destination.path) ? destination.id : null);

      // Retour visuel immédiat (optimiste) ; la WebView confirme ensuite.
      currentPathRef.current = destination.path;
      setCurrentPath(destination.path);

      webRef.current?.injectJavaScript(navigateScript(destination.path));
    },
    [navOverride],
  );

  /**
   * En-tête natif → plateforme (Support / Paramètres).
   * Même mécanisme que le menu de navigation : `pushState` dans la WebView,
   * donc aucune recréation, session et historique préservés.
   */
  const goToPath = useCallback((path: string) => {
    setNavOverride(null);
    currentPathRef.current = path;
    setCurrentPath(path);
    webRef.current?.injectJavaScript(navigateScript(path));
  }, []);

  const handleOpenSupport = useCallback(() => goToPath(SUPPORT_PATH), [goToPath]);
  const handleOpenSettings = useCallback(() => goToPath(SETTINGS_PATH), [goToPath]);

  // ---------- erreurs / hors ligne ----------
  const handleError = useCallback((event: { nativeEvent: { code: number; description: string } }) => {
    const code = event.nativeEvent.code;
    const desc = (event.nativeEvent.description || "").toLowerCase();
    // Les chargements annulés surviennent quand on délègue au navigateur système.
    if (code === -3 || desc.includes("err_aborted") || desc.includes("aborted")) return;

    const offline =
      code === -2 || // ERROR_HOST_LOOKUP / ERR_NAME_NOT_RESOLVED
      code === -6 || // ERROR_CONNECT / ERR_CONNECTION_REFUSED
      code === -7 || // ERROR_TIMEOUT / ERR_CONNECTION_TIMED_OUT
      code === -8 || // ERROR_TOO_MANY_REQUESTS
      code === -201 || // ERROR_UNKNOWN_HOST
      desc.includes("internet") ||
      desc.includes("network") ||
      desc.includes("timed out") ||
      desc.includes("err_connection") ||
      desc.includes("err_name_not_resolved") ||
      desc.includes("err_address_unreachable") ||
      desc.includes("err_internet_disconnected") ||
      desc.includes("err_network_changed");

    errorRef.current = true;
    setLoading(false);
    setError(
      offline
        ? {
            title: "Impossible de charger BatiBuild",
            message: "Vérifiez votre connexion Internet puis réessayez.",
          }
        : {
            title: "Impossible de charger BatiBuild",
            message: "Une erreur est survenue. Réessayez dans quelques instants.",
          },
    );
  }, []);

  const handleHttpError = useCallback((event: { nativeEvent: { statusCode: number } }) => {
    if (event.nativeEvent.statusCode >= 500) {
      errorRef.current = true;
      setLoading(false);
      setError({
        title: "BatiBuild est momentanément indisponible",
        message: "Le service rencontre un problème. Réessayez dans quelques instants.",
      });
    }
  }, []);

  const handleRenderProcessGone = useCallback(() => {
    errorRef.current = true;
    setLoading(false);
    setError({
      title: "Impossible de charger BatiBuild",
      message: "Une erreur est survenue. Réessayez.",
    });
  }, []);

  // ---------- messages de la page (téléchargements « blob: » + partage) ----------
  const handleMessage = useCallback((event: { nativeEvent: { data?: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data ?? "{}");

      // Fichiers générés dans le navigateur (PDF jsPDF, exports CSV/texte) : le
      // pont les transforme en fichiers natifs puis ouvre la feuille de partage.
      if (bridgeRef.current?.handle(msg)) return;

      if (msg.type === "share") {
        const parts = [msg.text, msg.url].filter(Boolean);
        Share.share({
          title: msg.title || "BatiBuild",
          message: parts.join("\n"),
          ...(msg.url ? { url: msg.url } : {}),
        }).catch(() => {});
      }
    } catch {
      // Message non-JSON : ignoré.
    }
  }, []);

  // ---------- téléchargements par URL (pièces jointes, plans, exports…) ----------
  const handleDownload = useCallback(async (url: string) => {
    if (!url) return;
    try {
      const clean = url.split("#")[0].split("?")[0];
      const base = clean.split("/").pop() || "document";
      const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_");
      const name = `${Date.now()}-${safe || "document"}`;
      const file = await File.downloadFileAsync(url, new File(Paths.cache, name));
      await shareFile(file, guessMime(name), safe || "document");
    } catch {
      // Repli : on confie l'URL au gestionnaire de téléchargement du système.
      Linking.openURL(url).catch(() => {});
    }
  }, []);

  const handleFileDownload = useCallback(
    (event: { nativeEvent: { downloadUrl?: string } }) => {
      handleDownload(event.nativeEvent.downloadUrl ?? "");
    },
    [handleDownload],
  );

  // ---------- réglages (appui long sur la marque de l'en-tête ou sur la barre du bas) ----------
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const active =
    isDashboardRoute(currentPath) && navOverride ? navOverride : activeNavId(currentPath);

  /**
   * Barre de navigation INFÉRIEURE, fixe, rendue APRÈS la WebView dans la
   * colonne racine : la WebView occupe exactement la hauteur restante, donc la
   * barre ne recouvre jamais le contenu et aucun padding n'est à ajouter. Elle
   * est simplement masquée sur les écrans de connexion / inscription et sur
   * l'accueil public.
   */
  const showBottomNav = shouldShowBottomNav(currentPath);

  return (
    <View style={[styles.root, { backgroundColor: theme.surface }]}>
      {/* En-tête NATIF, sans aucun menu de navigation : logo + nom de la
          plateforme à gauche, Support et Paramètres à droite (aucun burger).
          Toute la navigation est dans la barre inférieure ci-dessous. */}
      <TopNav
        onOpenSupport={handleOpenSupport}
        onOpenSettings={handleOpenSettings}
        onOpenNativeSettings={openSettings}
      />

      {/* WebView (remontée via `key` lors d'un nouvel essai) */}
      <View style={styles.webWrap}>
        {error ? (
          <View style={[styles.errorWrap, { backgroundColor: theme.surface }]}>
            <Logo size={72} shadow />
            {/* Icône lucide, la même famille que la barre supérieure et la
                barre inférieure (aucun mélange de styles). */}
            <View style={styles.errorIcon}>
              <OFFLINE_ICON size={26} color={theme.onSurfaceVariant} strokeWidth={1.9} />
            </View>
            <Text style={[styles.errorTitle, { color: theme.onSurface }]}>{error.title}</Text>
            <Text style={[styles.errorMsg, { color: theme.onSurfaceVariant }]}>{error.message}</Text>
            <Pressable
              onPress={retry}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.retryBtn,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.retryText, { color: theme.onPrimary }]}>Réessayer</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={reloadKey}
            ref={webRef}
            // Démarre sur /dashboard : jamais sur la page d'accueil publique.
            source={{ uri: ENTRY_URL }}
            originWhitelist={["http://*", "https://*", "blob:*", "data:*", "about:*"]}
            // Session / stockage / cache persistants : la session survit au redémarrage.
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            cacheEnabled
            domStorageEnabled
            javaScriptEnabled
            incognito={false}
            // Permissions & médias
            geolocationEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            // Champs fichiers (photo / plan / document)
            allowFileAccess
            allowFileAccessFromFileURLs
            // Événements
            onShouldStartLoadWithRequest={handleShouldStart}
            onOpenWindow={handleOpenWindow}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={() => {
              setProgress(0.05);
              beginChange();
            }}
            onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
            onLoadEnd={() => setLoading(false)}
            onError={handleError}
            onHttpError={handleHttpError}
            onRenderProcessGone={handleRenderProcessGone}
            onContentProcessDidTerminate={handleRenderProcessGone}
            onFileDownload={handleFileDownload}
            onMessage={handleMessage}
            // `MOBILE_CHROME_SCRIPT` masque le burger de l'en-tête web dans
            // l'application (il ferait doublon avec la barre de navigation
            // native ; le reste de l'en-tête web est intact) et
            // `DOWNLOAD_BRIDGE_SCRIPT` rend les PDF « blob: » (estimation du
            // coût de construction, matériaux IA) réellement téléchargeables.
            injectedJavaScriptBeforeContentLoaded={`${DOWNLOAD_BRIDGE_SCRIPT}${MOBILE_CHROME_SCRIPT}${SHARE_BRIDGE_SCRIPT}${ENTRY_GUARD_SCRIPT}`}
            style={[styles.webview, { backgroundColor: theme.surface }]}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures={Platform.OS === "ios"}
            contentInsetAdjustmentBehavior="never"
            pullToRefreshEnabled={false}
            scalesPageToFit={false}
            overScrollMode="never"
          />
        )}

        {/* État de chargement soigné — fond BLANC, un seul message, 1 s max.
            Il couvre la WebView uniquement : la barre du bas reste accessible. */}
        {loading && !error && (
          <View
            style={[styles.loadingWrap, { backgroundColor: COLORS.white }]}
            pointerEvents="auto"
          >
            <Logo size={76} shadow />
            <Text style={styles.loadingText}>{LOADING_MESSAGE}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(6, Math.round(progress * 100))}%` },
                ]}
              />
            </View>
            <ActivityIndicator color={COLORS.brand} size="small" style={styles.loadingSpinner} />
          </View>
        )}
      </View>

      {/* Barre de navigation INFÉRIEURE — fixe en bas de l'écran, dans la
          colonne racine (jamais en position absolue) : elle ne recouvre donc
          jamais le contenu de la page. Mêmes sections et mêmes routes que
          l'ancienne barre (Profile · Projets · Home · ROI · Message). */}
      {showBottomNav && (
        <BottomNav active={active} onSelect={handleNavSelect} onOpenSettings={openSettings} />
      )}

      {/* Réglages natifs — appui long sur la marque (en-tête) ou sur la barre. */}
      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={closeSettings}>
        <Pressable style={styles.modalOverlay} onPress={closeSettings}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.surfaceContainerHigh }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Logo size={52} />
              <Text style={[styles.modalTitle, { color: theme.onSurface }]}>BatiBuild</Text>
              <Text style={[styles.modalVersion, { color: theme.onSurfaceVariant }]}>
                Version {Constants.expoConfig?.version ?? "1.0.0"}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                closeSettings();
                retry();
              }}
              style={({ pressed }) => [
                styles.modalAction,
                { backgroundColor: theme.primaryContainer },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.modalActionText, { color: theme.onPrimaryContainer }]}>
                Recharger l'application
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                closeSettings();
                onShowGuide();
              }}
              style={({ pressed }) => [
                styles.modalAction,
                { backgroundColor: theme.primaryContainer },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.modalActionText, { color: theme.onPrimaryContainer }]}>
                Voir le guide
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                closeSettings();
                onResetGuide();
              }}
              style={({ pressed }) => [
                styles.modalAction,
                styles.modalActionOutlined,
                { borderColor: theme.outlineVariant },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.modalActionDevText, { color: theme.onSurfaceVariant }]}>
                Réinitialiser le guide (test)
              </Text>
            </Pressable>
            <Pressable
              onPress={closeSettings}
              style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.modalCloseText, { color: theme.onSurfaceVariant }]}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 18,
    fontSize: 15,
    color: COLORS.inkSoft,
  },
  progressTrack: {
    marginTop: 14,
    width: 148,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(15,23,42,0.10)",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.brand,
  },
  loadingSpinner: {
    marginTop: 18,
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  errorIcon: {
    marginTop: 18,
  },
  errorTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  errorMsg: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 24,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 34,
    borderRadius: SHAPE.full,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(6,37,27,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: SHAPE.xl,
    padding: 24,
    alignItems: "center",
  },
  modalHeader: {
    alignItems: "center",
  },
  modalTitle: {
    marginTop: 12,
    fontSize: 19,
    fontWeight: "800",
  },
  modalVersion: {
    marginTop: 4,
    fontSize: 13,
  },
  modalAction: {
    marginTop: 18,
    width: "100%",
    minHeight: 48,
    justifyContent: "center",
    borderRadius: SHAPE.full,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalActionOutlined: {
    marginTop: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalActionDevText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalClose: {
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 10,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
