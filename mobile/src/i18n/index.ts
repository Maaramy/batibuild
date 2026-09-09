import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import fr from "@/locales/fr";
import en from "@/locales/en";
import ar from "@/locales/ar";

export const SUPPORTED_LANGUAGES = [
  { code: "fr", label: "Français", dir: "ltr" as const },
  { code: "en", label: "English", dir: "ltr" as const },
  { code: "ar", label: "العربية", dir: "rtl" as const },
];

export const DEFAULT_LANGUAGE = "fr";
const STORAGE_KEY = "budgetbati-mobile-lang";

export function getDirection(lng: string): "ltr" | "rtl" {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lng)?.dir ?? "ltr";
}

export function applyRtl(lng: string): void {
  const rtl = getDirection(lng) === "rtl";
  try {
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      // Note (iOS): une application entièrement RTL est appliquée au redémarrage ;
      // en attendant, le style `direction` est appliqué sur les conteneurs racine.
    }
  } catch {
    // ignore
  }
}

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

// Load the saved language as early as possible (module scope).
(async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      await i18n.changeLanguage(saved);
      applyRtl(saved);
    } else {
      applyRtl(DEFAULT_LANGUAGE);
    }
  } catch {
    applyRtl(DEFAULT_LANGUAGE);
  }
})();

export async function setLanguage(lng: string): Promise<void> {
  await i18n.changeLanguage(lng);
  await AsyncStorage.setItem(STORAGE_KEY, lng).catch(() => {});
  applyRtl(lng);
}

export default i18n;