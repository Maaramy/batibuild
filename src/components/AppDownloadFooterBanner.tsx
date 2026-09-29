import { Download } from "lucide-react";

import { GooglePlayIcon } from "@/components/GooglePlayIcon";
import { LogoMark } from "@/components/Logo";
import { ANDROID_APP_DOWNLOAD_URL } from "@/lib/appDownload";
import { IS_ANDROID_APP } from "@/lib/runtime";
import { cn } from "@/lib/utils";

/**
 * PETITE BANNIÈRE — « Téléchargez l'application batibuild » dans le PIED DE PAGE
 * de la page d'accueil.
 *
 * Cible de téléchargement `ANDROID_APP_DOWNLOAD_URL` (lien direct du fichier
 * officiel de l'application Android), insérée en ligne dans le pied de page,
 * sans flottement ni fermeture.
 *
 *   · toute la bannière est UNE seule cible cliquable, avec `aria-label` ;
 *   · `target="_blank"` + `rel="noopener noreferrer"` : nouvel onglet sur
 *     ordinateur et navigateur mobile ; dans l'application Android, la coque
 *     ouvre les domaines externes dans le navigateur système — jamais de
 *     téléchargement automatique, toujours après un clic ;
 *   · aucune adresse de fichier n'est affichée dans l'interface ;
 *   · masquée dans l'application Android elle-même (elle est déjà installée) ;
 *   · compacte : `min-w-0` + `truncate` pour ne jamais déborder sur mobile.
 *
 * Aucune image lourde : `LogoMark` (asset officiel déjà optimisé) et l'icône
 * Google Play vectorielle partagée (`GooglePlayIcon`).
 */
export function AppDownloadFooterBanner({ className }: { className?: string }) {
  // Inutile de proposer l'application depuis l'application elle-même.
  if (IS_ANDROID_APP) return null;

  return (
    <a
      href={ANDROID_APP_DOWNLOAD_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Télécharger l'application batibuild pour Android"
      className={cn(
        "group flex max-w-md items-center gap-3 rounded-xl border border-emerald-500/25",
        "bg-emerald-500/5 p-3 transition-colors",
        "hover:border-emerald-500/40 hover:bg-emerald-500/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60",
        className,
      )}
    >
      <LogoMark
        size="sm"
        className="shrink-0 rounded-md shadow-sm ring-1 ring-emerald-500/20"
      />

      <span className="min-w-0 flex-1 text-left rtl:text-right">
        <span className="block truncate text-sm font-semibold leading-tight text-foreground">
          Téléchargez l'application batibuild
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium leading-tight text-muted-foreground">
          <GooglePlayIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Disponible sur Android</span>
        </span>
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5",
          "text-xs font-semibold text-white transition-transform",
          "group-hover:scale-[1.03] group-active:scale-95",
        )}
      >
        <Download className="h-3.5 w-3.5" />
        Télécharger
      </span>
    </a>
  );
}

export default AppDownloadFooterBanner;
