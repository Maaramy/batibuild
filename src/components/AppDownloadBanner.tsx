import { useCallback, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";

import { LogoMark } from "@/components/Logo";
import {
  ANDROID_APP_DOWNLOAD_URL,
  dismissAppDownloadBanner,
  isAppDownloadBannerDismissed,
} from "@/lib/appDownload";
import { IS_ANDROID_APP } from "@/lib/runtime";
import { cn } from "@/lib/utils";

/**
 * BANDEAU PROMOTIONNEL — « Téléchargez l'application batibuild ».
 *
 * Petit sticker flottant en haut de la PAGE DE CHARGEMENT (le repli `<Suspense>`
 * des routes, voir `RouteLoading` dans `src/main.tsx`). Il n'a AUCUN autre effet
 * sur la page : il ne change ni le chargement, ni la navigation, ni les autres
 * fonctionnalités.
 *
 *   · `fixed` en haut, centré, `pointer-events-none` sur le conteneur : la zone
 *     située sous le bandeau reste toujours cliquable, rien n'est masqué ;
 *   · l'icône batibuild, l'icône Google Play, la zone principale et le bouton de
 *     téléchargement mènent tous au fichier officiel de l'application Android
 *     (`ANDROID_APP_DOWNLOAD_URL`, lien de téléchargement direct) ;
 *   · `target="_blank"` + `rel="noopener noreferrer"` : nouvel onglet sur
 *     ordinateur et navigateur mobile ; dans l'application Android, la coque
 *     ouvre les domaines externes dans le navigateur système (jamais de
 *     téléchargement automatique, toujours après un clic) ;
 *   · le ✕ masque IMMÉDIATEMENT le bandeau, sans rechargement ni interruption du
 *     chargement, et la fermeture est mémorisée pour la session ;
 *   · l'adresse du fichier n'est jamais affichée dans l'interface.
 *
 * Aucune image lourde : l'icône batibuild est l'asset officiel déjà optimisé
 * (`LogoMark`) et l'icône Google Play est un SVG en ligne.
 */

/**
 * Icône Google Play (vectorielle, quelques centaines d'octets, aucun réseau).
 * Exportée : elle est aussi utilisée par la bannière du pied de page de la page
 * d'accueil (`AppDownloadFooterBanner`) pour éviter toute duplication.
 */
export function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        fill="#00A0FF"
        d="M47.9 24.6C42.4 30.4 39.5 39 39.5 50v412c0 11 2.9 19.6 8.4 25.4l1.6 1.5 230.8-230.8v-5.4L49.5 23.1l-1.6 1.5Z"
      />
      <path
        fill="#FFDA44"
        d="m361.2 341.1-76.9-76.9v-5.4l77-76.9 1.7 1 91.1 51.8c26 14.8 26 39 0 53.8l-91.1 51.8-1.8.2Z"
      />
      <path
        fill="#FF3A44"
        d="M363 340.2 284.3 261.5 48 499.4c8.6 9.1 22.7 10.2 38.6 1.2L363 340.2Z"
      />
      <path
        fill="#2ECB70"
        d="M363 184.4 86.6 24C70.7 14.9 56.6 16.1 48 25.1l236.3 236.3 78.7-77Z"
      />
    </svg>
  );
}

export function AppDownloadBanner({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  const [dismissed, setDismissed] = useState(() => isAppDownloadBannerDismissed());

  const handleClose = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    // Disparition immédiate : aucun rechargement, aucune interruption.
    event.preventDefault();
    event.stopPropagation();
    dismissAppDownloadBanner();
    setDismissed(true);
  }, []);

  // Inutile — et déroutant — de proposer l'application depuis l'application
  // elle-même : le bandeau ne s'affiche que sur le Web (navigateur).
  if (IS_ANDROID_APP || dismissed) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[55] flex justify-center px-2",
        "pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3",
        className,
      )}
    >
      <div
        role="complementary"
        aria-label={t("appDownload.title")}
        className={cn(
          "pointer-events-auto flex w-full max-w-[26rem] items-center gap-2 rounded-full",
          "border border-emerald-500/25 bg-background/95 py-1.5 pl-1.5 pr-1 shadow-lg",
          "backdrop-blur-md duration-300 animate-in fade-in-0 slide-in-from-top-3",
          "sm:gap-2.5 sm:py-2 sm:pl-2 sm:pr-1.5",
        )}
      >
        {/* Toute la zone gauche (icône batibuild + textes + icône Google Play)
            ouvre le téléchargement : une seule cible, très large. */}
        <a
          href={ANDROID_APP_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("appDownload.openAria")}
          className={cn(
            "group flex min-w-0 flex-1 items-center gap-2 rounded-full sm:gap-2.5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
          )}
        >
          <LogoMark
            size="sm"
            className="rounded-md shadow-sm ring-1 ring-emerald-500/20"
          />

          <span className="min-w-0 flex-1 text-left rtl:text-right">
            <span className="block truncate text-[12.5px] font-semibold leading-tight text-foreground sm:text-[13.5px]">
              {t("appDownload.title")}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[10.5px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
              <GooglePlayIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{t("appDownload.subtitle")}</span>
            </span>
          </span>

          <span
            aria-hidden="true"
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              "bg-emerald-600 text-white transition-transform",
              "group-hover:scale-105 group-active:scale-95 sm:h-7 sm:w-7",
            )}
          >
            <Download className="h-3.5 w-3.5" />
          </span>
        </a>

        {/* ✕ : masquage immédiat, mémorisé pour la session. */}
        <button
          type="button"
          onClick={handleClose}
          aria-label={t("appDownload.closeAria")}
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default AppDownloadBanner;
