import { useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";

import { GooglePlayIcon } from "@/components/GooglePlayIcon";
import { LogoMark } from "@/components/Logo";
import { dismissAppDownloadBanner, getAppDownloadUrl } from "@/lib/appDownload";
import { useAppDownloadBannerVisible } from "@/hooks/use-app-download-banner";
import { cn } from "@/lib/utils";

/**
 * BANDEAU ÉPINGLÉ EN HAUT DE LA PAGE — « Téléchargez l'application batibuild ».
 *
 * Premier élément de la barre de navigation de la page d'accueil : comme cette
 * barre est `fixed top-0`, le bandeau reste épinglé en haut de l'écran quand on
 * fait défiler la page. Hauteur fixe (`h-10`) : le décalage du contenu de la
 * page est une simple constante (voir `HeroSection` dans `src/pages/Landing.tsx`).
 *
 *   · l'icône batibuild, l'icône Google Play, le texte et le bouton mènent tous
 *     à la MÊME cible que la bannière du pied de page (`getAppDownloadUrl()`) :
 *     la fiche Play Store dès que l'application y est publiée, sinon le fichier
 *     officiel de l'application Android ;
 *   · `target="_blank"` + `rel="noopener noreferrer"` : nouvel onglet sur
 *     ordinateur et navigateur mobile ; dans l'application Android, la coque
 *     ouvre les domaines externes dans le navigateur système — jamais de
 *     téléchargement automatique, toujours après un clic ;
 *   · le ✕ masque IMMÉDIATEMENT le bandeau, sans rechargement ni interruption de
 *     la navigation, et la fermeture est mémorisée pour la session ;
 *   · jamais affiché dans l'application Android elle-même (déjà installée) ;
 *   · l'adresse du fichier n'est jamais affichée dans l'interface.
 *
 * Aucune image lourde : `LogoMark` (asset officiel déjà optimisé) et l'icône
 * Google Play vectorielle partagée (`GooglePlayIcon`).
 */
export function AppDownloadBanner({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  const visible = useAppDownloadBannerVisible();

  const handleClose = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    // Disparition immédiate : aucun rechargement, aucune interruption.
    event.preventDefault();
    event.stopPropagation();
    dismissAppDownloadBanner();
  }, []);

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label={t("appDownload.title")}
      className={cn(
        "h-10 w-full bg-emerald-600 text-white duration-300 animate-in fade-in-0 slide-in-from-top-2",
        className,
      )}
    >
      <div className="mx-auto flex h-10 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        {/* Toute la zone gauche ouvre le téléchargement : une seule cible, large. */}
        <a
          href={getAppDownloadUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("appDownload.openAria")}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:gap-3"
        >
          <LogoMark size="sm" className="h-6 w-6 shrink-0 rounded-md ring-1 ring-white/25" />

          <span className="min-w-0 truncate text-[12px] font-semibold leading-tight sm:text-[13px]">
            {t("appDownload.title")}
          </span>

          <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-medium text-white/85 sm:flex">
            <GooglePlayIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t("appDownload.subtitle")}</span>
          </span>

          <span
            aria-hidden="true"
            className={cn(
              "ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1",
              "text-[11px] font-semibold text-white transition-colors group-hover:bg-white/25",
            )}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Télécharger</span>
          </span>
        </a>

        {/* ✕ : masquage immédiat, mémorisé pour la session. */}
        <button
          type="button"
          onClick={handleClose}
          aria-label={t("appDownload.closeAria")}
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            "text-white/85 transition-colors hover:bg-white/15 hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default AppDownloadBanner;
