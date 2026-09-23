import { useState, type ComponentType } from "react";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// RECHERCHE UNIQUE DE L'ANNUAIRE (experts & fournisseurs)
// ----------------------------------------------------------------------------
// Une seule barre compacte remplace tous les champs séparés :
//   [ 🔍 recherche …………………………………… ] [ ⚙ Critères (2) ]
//   [ chips des critères retenus — défilement horizontal ]
//   [ panneau des critères (ouvert au clic) ]
//
// 100 % présentation : le filtrage reste assuré par chaque annuaire (logique
// existante) ; ce composant ne fait que collecter et afficher les critères.
// Mobile-first : la barre et chacun des groupes d'options défilent
// horizontalement, sans coupure de texte, et les options sont larges au
// toucher.
// ============================================================================

export interface DirectoryCriterionOption {
  value: string;
  label: string;
  /** Icône optionnelle affichée dans la puce d'option. */
  icon?: ComponentType<{ className?: string }>;
}

export interface DirectoryCriterionGroup {
  id: string;
  /** Libellé du critère (« Spécialité / activité », « Région »…). */
  label: string;
  options: DirectoryCriterionOption[];
  /** Valeurs actuellement sélectionnées (une puce cochée dans le panneau). */
  selected: string[];
  /** Appelé au clic sur une option (bascule gérée par l'appelant). */
  onSelect: (value: string) => void;
  /** Masque le groupe (ex. aucune valeur disponible dans les données). */
  hidden?: boolean;
}

export interface DirectorySearchChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface DirectorySearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  groups: DirectoryCriterionGroup[];
  /** Critères retenus, affichés sous la barre. */
  chips: DirectorySearchChip[];
  onReset: () => void;
  /** Nombre de résultats affiché dans le panneau. */
  resultCount?: number;
  /** Le résultat est encore en cours de chargement. */
  loading?: boolean;
}

export function DirectorySearchBar({
  query,
  onQueryChange,
  placeholder,
  groups,
  chips,
  onReset,
  resultCount,
  loading,
}: DirectorySearchBarProps) {
  const [open, setOpen] = useState(false);
  const visibleGroups = groups.filter((g) => !g.hidden && g.options.length > 0);
  const activeCount = chips.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-soft">
      {/* ── Barre de recherche unique ─────────────────────────────────────── */}
      {/* Toucher / cliquer la barre ouvre la zone des critères. */}
      <div className="flex items-center gap-1.5 px-2.5 py-2" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label={placeholder}
          // 16px sur mobile : évite le zoom automatique d'iOS au focus.
          className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={(e) => {
              e.stopPropagation();
              onQueryChange("");
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          aria-expanded={open}
          aria-label="Ouvrir les critères de recherche"
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors",
            open
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/50 bg-muted/30 text-foreground hover:bg-muted/60",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Critères</span>
          {activeCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Critères retenus, dans la barre (défilement horizontal) ───────── */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border/30 px-2.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/[0.07] py-1 pl-2.5 pr-1 text-[11px] font-medium text-primary"
            >
              <span className="whitespace-nowrap">{chip.label}</span>
              <button
                type="button"
                aria-label={`Retirer le critère ${chip.label}`}
                onClick={chip.onRemove}
                className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-primary/15"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="ml-auto shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            Réinitialiser
          </button>
        </div>
      )}

      {/* ── Panneau des critères ──────────────────────────────────────────── */}
      {open && (
        <div className="space-y-3 border-t border-border/30 px-2.5 py-3">
          {visibleGroups.map((group) => (
            <div key={group.id} className="space-y-1.5">
              <p className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="-mx-0.5 flex snap-x gap-1.5 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
                {group.options.map((option) => {
                  const active = group.selected.includes(option.value);
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => group.onSelect(option.value)}
                      className={cn(
                        "inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-[11px] font-medium transition-colors sm:py-1.5",
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/50 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      {Icon && <Icon className="h-3 w-3" />}
                      {option.label}
                      {active && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 border-t border-border/20 pt-2.5">
            <p className="text-[10px] text-muted-foreground">
              {loading
                ? "Recherche en cours…"
                : `${resultCount ?? 0} résultat${(resultCount ?? 0) > 1 ? "s" : ""}`}
            </p>
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-border/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
