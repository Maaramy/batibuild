import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { COOKIE_MAX_AGE, COOKIE_NAMES, LANGUAGE_STORAGE_KEY } from "@/lib/webCookies";
import { shouldUseWebCookies } from "@/lib/runtime";

import frCommon from "./locales/fr/common.json";
import enCommon from "./locales/en/common.json";
import arCommon from "./locales/ar/common.json";

import frLanding from "./locales/fr/landing.json";
import enLanding from "./locales/en/landing.json";
import arLanding from "./locales/ar/landing.json";

import frAuth from "./locales/fr/auth.json";
import enAuth from "./locales/en/auth.json";
import arAuth from "./locales/ar/auth.json";

import frDashboard from "./locales/fr/dashboard.json";
import enDashboard from "./locales/en/dashboard.json";
import arDashboard from "./locales/ar/dashboard.json";

import frNewProject from "./locales/fr/newProject.json";
import enNewProject from "./locales/en/newProject.json";
import arNewProject from "./locales/ar/newProject.json";

import frProjectDetail from "./locales/fr/projectDetail.json";
import enProjectDetail from "./locales/en/projectDetail.json";
import arProjectDetail from "./locales/ar/projectDetail.json";

import frAdmin from "./locales/fr/admin.json";
import enAdmin from "./locales/en/admin.json";
import arAdmin from "./locales/ar/admin.json";

import frPricing from "./locales/fr/pricing.json";
import enPricing from "./locales/en/pricing.json";
import arPricing from "./locales/ar/pricing.json";

import frProfile from "./locales/fr/profile.json";
import enProfile from "./locales/en/profile.json";
import arProfile from "./locales/ar/profile.json";

import frSupplier from "./locales/fr/supplier.json";
import enSupplier from "./locales/en/supplier.json";
import arSupplier from "./locales/ar/supplier.json";

import frMaterials from "./locales/fr/materials.json";
import enMaterials from "./locales/en/materials.json";
import arMaterials from "./locales/ar/materials.json";

import frContact from "./locales/fr/contact.json";
import enContact from "./locales/en/contact.json";
import arContact from "./locales/ar/contact.json";

export const SUPPORTED_LANGUAGES = [
  { code: "fr", label: "Français", dir: "ltr" as const, flag: "🇫🇷" },
  { code: "en", label: "English", dir: "ltr" as const, flag: "🇬🇧" },
  { code: "ar", label: "العربية", dir: "rtl" as const, flag: "🇹🇳" },
];

export const DEFAULT_LANGUAGE = "fr";

/**
 * Configuration de détection de la langue.
 *
 * WEB : le cookie `bb_lang` (préférence non sensible) est consulté EN PREMIER,
 * le stockage local sert de repli — la langue choisie est donc disponible dès
 * l'amorçage, sans requête ni rendu supplémentaire.
 *
 * APPLICATION ANDROID : le détecteur de cookie est retiré de la chaîne, le
 * stockage local (celui de la coque) restant la seule source — le système de
 * cookies Web n'est jamais utilisé dans l'application.
 */
export function languageDetectionConfig(webCookiesEnabled: boolean) {
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  return {
    order: webCookiesEnabled
      ? ["cookie", "localStorage", "navigator"]
      : ["localStorage", "navigator"],
    lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    lookupCookie: COOKIE_NAMES.lang as string,
    caches: webCookiesEnabled ? ["cookie", "localStorage"] : ["localStorage"],
    cookieOptions: {
      path: "/",
      sameSite: "lax" as const,
      maxAge: COOKIE_MAX_AGE.preferences,
      secure,
    },
  };
}

export function getDirection(lng: string): "ltr" | "rtl" {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === lng);
  return lang?.dir || "ltr";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        common: frCommon,
        landing: frLanding,
        auth: frAuth,
        dashboard: frDashboard,
        newProject: frNewProject,
        projectDetail: frProjectDetail,
        admin: frAdmin,
        pricing: frPricing,
        profile: frProfile,
        supplier: frSupplier,
        materials: frMaterials,
        contact: frContact,
      },
      en: {
        common: enCommon,
        landing: enLanding,
        auth: enAuth,
        dashboard: enDashboard,
        newProject: enNewProject,
        projectDetail: enProjectDetail,
        admin: enAdmin,
        pricing: enPricing,
        profile: enProfile,
        supplier: enSupplier,
        materials: enMaterials,
        contact: enContact,
      },
      ar: {
        common: arCommon,
        landing: arLanding,
        auth: arAuth,
        dashboard: arDashboard,
        newProject: arNewProject,
        projectDetail: arProjectDetail,
        admin: arAdmin,
        pricing: arPricing,
        profile: arProfile,
        supplier: arSupplier,
        materials: arMaterials,
        contact: arContact,
      },
    },
    fallbackLng: "fr",
    defaultNS: "common",
    ns: [
      "common",
      "landing",
      "auth",
      "dashboard",
      "newProject",
      "projectDetail",
      "admin",
      "pricing",
      "profile",
      "supplier",
      "materials",
      "contact",
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: languageDetectionConfig(shouldUseWebCookies()),
  });

export default i18n;
