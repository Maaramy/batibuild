import { useLocation } from "react-router";

import { cn } from "@/lib/utils";

/**
 * MENU DE NAVIGATION DE L'EN-TÊTE (remplace les barres de navigation du bas).
 *
 * Les éléments qui se trouvaient dans une barre de navigation inférieure sont
 * désormais rendus ici, dans l'en-tête de la page, sous forme de **menu
 * horizontal scrollable** :
 *
 *   - les éléments gardent leur largeur naturelle (`shrink-0` +
 *     `whitespace-nowrap`) : ils ne sont jamais coupés, compressés ni renvoyés
 *     à la ligne ;
 *   - dès que la rangée dépasse la largeur de l'écran, elle défile
 *     horizontalement (défilement natif : geste au doigt sur Android et iPhone,
 *     molette / pavé tactile sur desktop) — la barre de défilement est masquée
 *     par la règle globale `scrollbar-none` de `index.css` ;
 *   - l'élément correspondant à la page COURANTE est mis en évidence
 *     (`path` comparé à la route affichée, ou `active` fourni par l'appelant) ;
 *   - états `active` / `hover` / `pressed` / `disabled` cohérents avec le
 *     design de la plateforme (mêmes rayons, mêmes espacements, mêmes tokens
 *     de couleur, aucune couleur inventée).
 *
 * Le composant n'introduit aucune route et ne modifie aucune logique métier :
 * il se contente de déclencher les `onClick` fournis par la page.
 */

export interface HeaderNavItem {
  /** Icône (famille lucide, comme le reste de la plateforme). */
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  /**
   * Route cible : sert à marquer automatiquement l'élément actif. Ignoré si
   * `active` est fourni.
   */
  path?: string;
  /** Force l'état actif (prioritaire sur `path`). */
  active?: boolean;
  disabled?: boolean;
}

interface HeaderNavProps {
  items: HeaderNavItem[];
  /** Libellé d'accessibilité du menu. */
  ariaLabel?: string;
  /** Largeur maximale de la rangée, alignée sur le contenu de la page. */
  maxWidthClassName?: string;
  className?: string;
}

/**
 * Élément correspond-il à la page actuellement affichée ?
 *
 * `active` fourni par l'appelant est prioritaire ; sinon la route cible est
 * comparée au chemin courant (égalité, ou sous-page de la route cible).
 */
export function isHeaderNavItemActive(
  item: { path?: string; active?: boolean },
  pathname: string,
): boolean {
  if (typeof item.active === "boolean") return item.active;
  if (!item.path) return false;
  const base = item.path.split("?")[0].replace(/\/+$/, "");
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function HeaderNav({
  items,
  ariaLabel = "Navigation de la page",
  maxWidthClassName = "max-w-5xl",
  className,
}: HeaderNavProps) {
  const { pathname } = useLocation();

  const isActive = (item: HeaderNavItem) => isHeaderNavItemActive(item, pathname);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={cn("border-t border-outline-variant/45", className)}
    >
      <div className={cn("mx-auto px-2 sm:px-3 lg:px-4", maxWidthClassName)}>
        {/* Barre de navigation secondaire Material 3 : pilules tactiles,
            défilement horizontal natif, aucun élément comprimé. */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-none py-2"
          role="tablist"
        >
          {items.map((item, i) => {
            const active = isActive(item);
            return (
              <button
                key={`${item.label}-${i}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                onClick={item.onClick}
                disabled={item.disabled}
                title={item.label}
                className={cn(
                  "group flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[11px] font-semibold transition-all sm:text-xs",
                  active
                    ? "bg-primary-container text-on-primary-container shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-foreground",
                  "active:scale-[0.97]",
                  item.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-container-high/70 text-on-surface-variant group-hover:text-foreground",
                  )}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
