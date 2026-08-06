import { useState } from "react";
import { Check, CheckCircle2, ChevronsUpDown, MapPin, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type LocationOption = { label: string; value: string; meta?: string };

/**
 * Sélecteur de localisation « feuille basse » (bottom sheet) avec recherche.
 * - allowCustom = false (région / ville) : la valeur stockée est une clé, la
 *   sélection d'une option de la liste est obligatoire.
 * - allowCustom = true (quartier) : la saisie libre est autorisée — une ligne
 *   « Utiliser « … » » apparaît quand le texte saisi ne correspond à aucune option.
 */
export function LocationField({
  label,
  value,
  options,
  onSelect,
  onTyping,
  allowCustom = false,
  placeholder,
  required,
  valid,
  hint,
  className,
}: {
  label: string;
  value: string;
  options: LocationOption[];
  onSelect?: (o: LocationOption) => void;
  onTyping?: (text: string) => void;
  allowCustom?: boolean;
  placeholder?: string;
  required?: boolean;
  valid?: boolean;
  hint?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const displayValue = allowCustom
    ? value
    : options.find((o) => o.value === value)?.label ?? "";

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const exactMatch = q.length > 0 && options.some((o) => o.label.toLowerCase() === q);
  const showCustomRow = allowCustom && q.length > 0 && !exactMatch;

  const openSheet = () => {
    setQuery(displayValue);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (o: LocationOption) => {
    if (allowCustom) {
      onTyping?.(o.label);
    } else {
      onSelect?.(o);
    }
    close();
  };

  const applyCustom = () => {
    onTyping?.(query.trim());
    close();
  };

  return (
    <div className={cn(className)}>
      <div className="mb-1 flex items-center justify-between gap-1">
        <label className="text-[11px] font-medium text-muted-foreground">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        {valid && (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="Champ rempli" />
        )}
      </div>

      <button
        type="button"
        onClick={openSheet}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer"
      >
        <span className={cn("truncate text-left", !displayValue && "text-muted-foreground/60")}>
          {displayValue || placeholder || "Sélectionner…"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      </button>

      <Sheet open={open} onOpenChange={(o) => (o ? openSheet() : setOpen(false))}>
        <SheetContent
          side="bottom"
          className="mx-auto w-full max-w-2xl rounded-t-2xl px-0 pb-5 pt-4"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="px-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              {label}
            </div>
            {hint && <p className="mb-3 text-[11px] text-muted-foreground">{hint}</p>}
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (showCustomRow) applyCustom();
                    else if (filtered.length > 0) pick(filtered[0]);
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Rechercher…"
                autoComplete="off"
                className="h-10 pl-9 pr-8 text-sm"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground cursor-pointer"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-[55vh]">
            <div className="px-3 pb-2">
              {showCustomRow && (
                <button
                  type="button"
                  onClick={applyCustom}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition-colors hover:bg-accent/40 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    Utiliser « <span className="font-semibold">{query.trim()}</span> » comme valeur libre
                  </span>
                </button>
              )}

              {filtered.length === 0 && !showCustomRow && (
                <p className="py-8 text-center text-[11px] text-muted-foreground">
                  Aucun résultat pour « {query.trim()} »
                </p>
              )}

              {filtered.map((o) => {
                const selected = displayValue === o.label;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => pick(o)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition-colors cursor-pointer",
                      selected ? "bg-primary/10 text-primary" : "hover:bg-accent/40",
                    )}
                  >
                    <MapPin
                      className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-primary" : "text-muted-foreground")}
                    />
                    <span className="truncate font-medium">{o.label}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1.5">
                      {o.meta && (
                        <span className="rounded-full border border-border/40 bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground">
                          {o.meta}
                        </span>
                      )}
                      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}
