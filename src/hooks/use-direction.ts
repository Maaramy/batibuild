import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getDirection, SUPPORTED_LANGUAGES } from "@/i18n/config";

export function useDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = getDirection(i18n.language);
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;

    // Add/remove RTL class for CSS targeting
    if (dir === "rtl") {
      document.documentElement.classList.add("rtl");
      document.documentElement.classList.remove("ltr");
    } else {
      document.documentElement.classList.add("ltr");
      document.documentElement.classList.remove("rtl");
    }
  }, [i18n.language]);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language);
  const direction = currentLang?.dir || "ltr";

  return { direction, currentLang };
}
