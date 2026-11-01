import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * Langues proposées dans l'interface.
 *
 * Le catalogue i18n complet conserve l'anglais (`SUPPORTED_LANGUAGES`), mais le
 * sélecteur de produit expose les deux langues réellement livrées : le
 * français (langue par défaut, comptes existants compris) et l'arabe.
 */
const LANGUAGES = [
  { code: "fr", short: "FR", flag: "🇫🇷", nameKey: "language.fr", dir: "ltr" },
  { code: "ar", short: "AR", flag: "🇹🇳", nameKey: "language.ar", dir: "rtl" },
] as const;

/**
 * Sélecteur FR / AR.
 *
 * `changeLanguage` est synchrone côté i18next : tous les composants abonnés se
 * re-rendent immédiatement, sans rechargement de page. La préférence est
 * persistée par le détecteur i18next (`bb_lang` en cookie sur le Web, stockage
 * local dans l'application Android) : elle est donc retrouvée aux connexions
 * suivantes.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation("dashboard");
  const active = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "fr";

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border/40 bg-background/60 p-0.5",
        className,
      )}
    >
      {LANGUAGES.map((language) => {
        const isActive = language.code === active;
        return (
          <button
            key={language.code}
            type="button"
            onClick={() => {
              if (!isActive) void i18n.changeLanguage(language.code);
            }}
            aria-pressed={isActive}
            lang={language.code}
            dir={language.dir}
            title={t(language.nameKey)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors sm:text-xs",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span aria-hidden="true" className="text-[11px] leading-none">
              {language.flag}
            </span>
            <span>{language.short}</span>
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
