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
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { Logo } from "../components/Logo";
import { COLORS } from "../theme";
import { ENTRY_URL, isAppUrl, isAuthRoute, isLandingRoute, pathOfUrl } from "../config";
import { ENTRY_GUARD_SCRIPT, SHARE_BRIDGE_SCRIPT } from "../injected";

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  dwg: "application/acad",
  dxf: "image/vnd.dxf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  csv: "text/csv",
  zip: "application/zip",
  txt: "text/plain",
};

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/** Le WebView n'affiche jamais une erreur brute au bout de quelques secondes. */
const LOADING_SAFETY_TIMEOUT_MS = 15000;

type Props = {
  onShowGuide: () => void;
  onResetGuide: () => void;
};

type WebViewError = { title: string; message: string };

export default function WebViewScreen({ onShowGuide, onResetGuide }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const errorRef = useRef(false);
  /** Pile des routes visitées — sert uniquement au bouton Back Android. */
  const historyRef = useRef<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<WebViewError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const retry = useCallback(() => {
    errorRef.current = false;
    setError(null);
    setLoading(true);
    setProgress(0);
    historyRef.current = [];
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

  // Sécurité : la superposition de chargement ne doit jamais bloquer
  // durablement l'interface si `onLoadEnd` n'est pas émis.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), LOADING_SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

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
    const stack = historyRef.current;
    if (stack[stack.length - 1] === path) return;
    stack.push(path);
    // Borne la pile : suffisant pour le bouton Back, mémoire négligeable.
    if (stack.length > 40) stack.shift();
  }, []);

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

  // ---------- pont de partage natif (navigator.share) ----------
  const handleMessage = useCallback((event: { nativeEvent: { data?: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data ?? "{}");
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

  // ---------- téléchargements (PDF, plans, exports…) ----------
  const handleDownload = useCallback(async (url: string) => {
    if (!url) return;
    try {
      const clean = url.split("#")[0].split("?")[0];
      const base = clean.split("/").pop() || "document";
      const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_");
      const name = `${Date.now()}-${safe || "document"}`;
      const dest = new File(Paths.cache, name);
      const file = await File.downloadFileAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: guessMime(name), dialogTitle: name, UTI: guessMime(name) });
      } else {
        await Linking.openURL(file.uri);
      }
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

  // ---------- réglages ----------
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const stripBg = dark ? COLORS.brandDeep : COLORS.brand;
  const bottomBg = dark ? COLORS.surfaceDark : COLORS.surface;

  return (
    <View style={styles.root}>
      {/* Bandeau supérieur : garde le contenu hors de la barre de statut / encoche. */}
      <View style={[styles.topStrip, { backgroundColor: stripBg, paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>BatiBuild</Text>
          <Pressable
            onPress={openSettings}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Réglages"
            style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.settingsGlyph}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {/* WebView (remontée via `key` lors d'un nouvel essai) */}
      <View style={[styles.webWrap, { marginBottom: insets.bottom }]}>
        {error ? (
          <View style={[styles.errorWrap, dark && styles.errorWrapDark]}>
            <Logo size={72} shadow />
            <Text style={[styles.errorTitle, dark && styles.errorTitleDark]}>{error.title}</Text>
            <Text style={[styles.errorMsg, dark && styles.errorMsgDark]}>{error.message}</Text>
            <Pressable
              onPress={retry}
              accessibilityRole="button"
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.retryText}>Réessayer</Text>
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
              setLoading(true);
              setProgress(0.05);
            }}
            onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
            onLoadEnd={() => setLoading(false)}
            onError={handleError}
            onHttpError={handleHttpError}
            onRenderProcessGone={handleRenderProcessGone}
            onContentProcessDidTerminate={handleRenderProcessGone}
            onFileDownload={handleFileDownload}
            onMessage={handleMessage}
            injectedJavaScriptBeforeContentLoaded={`${SHARE_BRIDGE_SCRIPT}${ENTRY_GUARD_SCRIPT}`}
            style={styles.webview}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures={Platform.OS === "ios"}
            contentInsetAdjustmentBehavior="never"
            pullToRefreshEnabled={false}
            scalesPageToFit={false}
            overScrollMode="never"
          />
        )}

        {/* État de chargement soigné — jamais de page blanche */}
        {loading && !error && (
          <View style={styles.loadingWrap} pointerEvents="auto">
            <Logo size={76} shadow />
            <Text style={styles.loadingText}>Chargement de votre espace…</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(6, Math.round(progress * 100))}%` },
                ]}
              />
            </View>
            <ActivityIndicator color={COLORS.accent} size="small" style={styles.loadingSpinner} />
          </View>
        )}
      </View>

      {/* Bandeau inférieur (zone sûre) */}
      <View style={[styles.bottomStrip, { backgroundColor: bottomBg, height: insets.bottom }]} />

      {/* Réglages */}
      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={closeSettings}>
        <Pressable style={styles.modalOverlay} onPress={closeSettings}>
          <Pressable
            style={[styles.modalCard, dark && styles.modalCardDark]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Logo size={52} />
              <Text style={[styles.modalTitle, dark && styles.modalTitleDark]}>BatiBuild</Text>
              <Text style={[styles.modalVersion, dark && styles.modalMsgDark]}>
                Version {Constants.expoConfig?.version ?? "1.0.0"}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                closeSettings();
                retry();
              }}
              style={({ pressed }) => [styles.modalAction, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.modalActionText}>Recharger l'application</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                closeSettings();
                onShowGuide();
              }}
              style={({ pressed }) => [styles.modalAction, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.modalActionText}>Voir le guide</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                closeSettings();
                onResetGuide();
              }}
              style={({ pressed }) => [styles.modalAction, styles.modalActionDev, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.modalActionDevText}>Réinitialiser le guide (test)</Text>
            </Pressable>
            <Pressable
              onPress={closeSettings}
              style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.modalCloseText, dark && styles.modalMsgDark]}>Fermer</Text>
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
    backgroundColor: COLORS.brandDeep,
  },
  topStrip: {
    backgroundColor: COLORS.brand,
  },
  topBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsGlyph: {
    fontSize: 18,
    color: COLORS.white,
  },
  webWrap: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loadingWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 18,
    fontSize: 15,
    color: "#9FE3C4",
  },
  progressTrack: {
    marginTop: 14,
    width: 148,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  loadingSpinner: {
    marginTop: 18,
  },
  errorWrap: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  errorWrapDark: {
    backgroundColor: COLORS.surfaceDark,
  },
  errorTitle: {
    marginTop: 22,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
  },
  errorTitleDark: {
    color: "#F1F5F9",
  },
  errorMsg: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  errorMsgDark: {
    color: "#94A3B8",
  },
  retryBtn: {
    marginTop: 24,
    minHeight: 48,
    justifyContent: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: 34,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
  bottomStrip: {
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },
  modalCardDark: {
    backgroundColor: COLORS.surfaceDark2,
  },
  modalHeader: {
    alignItems: "center",
  },
  modalTitle: {
    marginTop: 12,
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.ink,
  },
  modalTitleDark: {
    color: "#F1F5F9",
  },
  modalVersion: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.muted,
  },
  modalMsgDark: {
    color: "#94A3B8",
  },
  modalAction: {
    marginTop: 18,
    width: "100%",
    minHeight: 48,
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.brand700,
  },
  modalActionDev: {
    marginTop: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  modalActionDevText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
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
    color: COLORS.muted,
  },
});
