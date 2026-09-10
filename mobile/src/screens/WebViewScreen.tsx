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

const WEB_URL: string =
  ((Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl) ??
  "https://budgetbati.freebuff.app/";

function getHost(url: string): string {
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : "";
}

const APP_HOST = getHost(WEB_URL);

/** Is this URL part of the BatiBuild app (stays inside the WebView)? */
function isAppUrl(url: string): boolean {
  const host = getHost(url);
  if (!host) return false;
  // Same host or any *.freebuff.app deployment host (dev/preview/prod aliases).
  return host === APP_HOST || host.endsWith(".freebuff.app");
}

/** Override navigator.share in the WebView so the native share sheet opens (Android WebView has no share API). */
const SHARE_BRIDGE_SCRIPT = `
(function () {
  try {
    if (window.ReactNativeWebView && !window.__batibuildSharePatched) {
      window.__batibuildSharePatched = true;
      window.navigator.share = function (data) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "share",
            title: (data && data.title) || "",
            text: (data && data.text) || "",
            url: (data && data.url) || ""
          }));
        } catch (e) {}
        return Promise.resolve({ status: "completed" });
      };
    }
  } catch (e) {}
})();
true;
`;

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

type Props = {
  onShowGuide: () => void;
};

export default function WebViewScreen({ onShowGuide }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const errorRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ---------- Android hardware back ----------
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (errorRef.current) {
        // Back from an error screen = retry.
        retry();
        return true;
      }
      if (canGoBackRef.current) {
        webRef.current?.goBack();
        return true;
      }
      Alert.alert("Quitter BatiBuild ?", "Voulez-vous quitter l'application ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Quitter", style: "destructive", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(() => {
    errorRef.current = false;
    setError(null);
    setLoading(true);
    setProgress(0);
    setReloadKey((k) => k + 1);
  }, []);

  // ---------- navigation: keep app pages inside, open external links in the system browser ----------
  const handleShouldStart = useCallback((request: WebViewNavigation) => {
    const url = request.url;
    if (!url) return true;

    const schemeName = url.split(":")[0].toLowerCase();
    if (schemeName === "mailto" || schemeName === "tel" || schemeName === "sms" || schemeName === "whatsapp") {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    if (url.startsWith("blob:") || url.startsWith("data:")) return true;
    if (isAppUrl(url)) return true;
    // Everything else (external sites, partner links, social, documents): system browser.
    if (url.startsWith("http")) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  }, []);

  const handleOpenWindow = useCallback((event: { nativeEvent: { targetUrl?: string } }) => {
    const url = event.nativeEvent.targetUrl;
    if (url && !isAppUrl(url) && url.startsWith("http")) {
      Linking.openURL(url).catch(() => {});
    }
  }, []);

  const handleNavigationStateChange = useCallback((nav: { canGoBack: boolean }) => {
    canGoBackRef.current = nav.canGoBack;
  }, []);

  // ---------- errors / offline ----------
  const handleError = useCallback((event: { nativeEvent: { code: number; description: string } }) => {
    const code = event.nativeEvent.code;
    const desc = (event.nativeEvent.description || "").toLowerCase();
    // Aborted loads happen when we redirect to the system browser — ignore them.
    if (code === -3 || desc.includes("err_aborted") || desc.includes("aborted")) return;
    if (
      code === -2 || // ERROR_HOST_LOOKUP / ERR_NAME_NOT_RESOLVED
      code === -7 || // ERROR_TIMEOUT / ERR_CONNECTION_TIMED_OUT
      code === -8 || // ERROR_TOO_MANY_REQUESTS
      code === -6 || // ERROR_CONNECT / ERR_CONNECTION_REFUSED
      code === -100 || // ERROR_UNSUPPORTED_SCHEME
      code === -101 || // ERROR_FAILED_SSL_HANDSHAKE
      code === -102 || // ERROR_BAD_URL
      code === -200 || // ERROR_TOO_MANY_REDIRECTS
      code === -201 || // ERROR_UNKNOWN_HOST
      desc.includes("internet") ||
      desc.includes("network") ||
      desc.includes("timed out") ||
      desc.includes("err_connection") ||
      desc.includes("err_name_not_resolved") ||
      desc.includes("err_address_unreachable") ||
      desc.includes("err_internet_disconnected") ||
      desc.includes("err_network_changed")
    ) {
      errorRef.current = true;
      setError({
        title: "Connexion Internet indisponible",
        message: "Vérifiez votre connexion Internet puis réessayez.",
      });
    } else {
      errorRef.current = true;
      setError({
        title: "Impossible de charger BatiBuild",
        message: "Vérifiez votre connexion Internet.",
      });
    }
  }, []);

  const handleHttpError = useCallback((event: { nativeEvent: { statusCode: number } }) => {
    const status = event.nativeEvent.statusCode;
    if (status >= 500) {
      errorRef.current = true;
      setError({
        title: "BatiBuild est momentanément indisponible",
        message: "Le serveur rencontre un problème. Réessayez dans quelques instants.",
      });
    }
  }, []);

  const handleRenderProcessGone = useCallback((_event: { nativeEvent: unknown }) => {
    errorRef.current = true;
    setError({
      title: "Impossible de charger BatiBuild",
      message: "Une erreur est survenue. Réessayez.",
    });
  }, []);

  // ---------- native share bridge (navigator.share) ----------
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
      // Not a JSON bridge message — ignore.
    }
  }, []);

  // ---------- downloads (PDFs, plans, exports…) ----------
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
      // Fallback: hand the URL to the OS (download manager / Safari).
      Linking.openURL(url).catch(() => {});
    }
  }, []);

  const handleFileDownload = useCallback((event: { nativeEvent: { downloadUrl?: string } }) => {
    handleDownload(event.nativeEvent.downloadUrl ?? "");
  }, [handleDownload]);

  // ---------- settings modal (re-show the guide) ----------
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const stripBg = dark ? COLORS.brandDeep : COLORS.brand;
  const bottomBg = dark ? COLORS.surfaceDark : COLORS.surface;

  return (
    <View style={styles.root}>
      {/* Top strip: keeps content out of the status bar / notch, brand-colored. */}
      <View style={[styles.topStrip, { backgroundColor: stripBg, paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>BatiBuild</Text>
          <Pressable onPress={openSettings} hitSlop={10} style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.settingsGlyph}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {/* WebView (remounted via key on retry) */}
      <View style={[styles.webWrap, { marginBottom: insets.bottom }]}>
        {error ? (
          <View style={[styles.errorWrap, dark && styles.errorWrapDark]}>
            <Logo size={72} shadow />
            <Text style={[styles.errorTitle, dark && styles.errorTitleDark]}>{error.title}</Text>
            <Text style={[styles.errorMsg, dark && styles.errorMsgDark]}>{error.message}</Text>
            <Pressable onPress={retry} style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={reloadKey}
            ref={webRef}
            source={{ uri: WEB_URL }}
            originWhitelist={["http://*", "https://*", "blob:*", "data:*"]}
            // Session / storage / cache persistence
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            cacheEnabled
            domStorageEnabled
            javaScriptEnabled
            // Permissions & media
            geolocationEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            // File inputs (upload photo / plan / document)
            allowFileAccess
            allowFileAccessFromFileURLs
            // Events
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
            onFileDownload={handleFileDownload}
            onMessage={handleMessage}
            injectedJavaScriptBeforeContentLoaded={SHARE_BRIDGE_SCRIPT}
            style={styles.webview}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures={Platform.OS === "ios"}
            contentInsetAdjustmentBehavior="never"
            pullToRefreshEnabled={false}
          />
        )}

        {/* Branded loading overlay — never a blank page */}
        {loading && !error && (
          <View style={styles.loadingWrap}>
            <Logo size={76} shadow />
            <Text style={styles.loadingText}>Chargement…</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(6, Math.round(progress * 100))}%` }]} />
            </View>
          </View>
        )}
      </View>

      {/* Bottom safe area strip */}
      <View style={[styles.bottomStrip, { backgroundColor: bottomBg, height: insets.bottom }]} />

      {/* Settings modal */}
      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={closeSettings}>
        <Pressable style={styles.modalOverlay} onPress={closeSettings}>
          <Pressable style={[styles.modalCard, dark && styles.modalCardDark]} onPress={(e) => e.stopPropagation()}>
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
                onShowGuide();
              }}
              style={({ pressed }) => [styles.modalAction, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.modalActionText}>Voir le guide</Text>
            </Pressable>
            <Pressable onPress={closeSettings} style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}>
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
    height: 44,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsGlyph: {
    fontSize: 17,
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
    zIndex: 10,
  },
  loadingText: {
    marginTop: 18,
    fontSize: 15,
    color: "#9FE3C4",
  },
  progressTrack: {
    marginTop: 14,
    width: 132,
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
    backgroundColor: COLORS.brand,
    paddingHorizontal: 34,
    paddingVertical: 13,
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
    marginTop: 22,
    width: "100%",
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
  modalClose: {
    marginTop: 12,
    paddingVertical: 10,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
  },
});