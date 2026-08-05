import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronsUpDown, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type LocationOption = { label: string; value: string };

/**
 * Champ de localisation avec autocomplétion (Popover + Command).
 * - allowCustom = false (région) : la valeur stockée est une clé, la saisie
 *   ne sert qu'à filtrer ; la sélection est obligatoire.
 * - allowCustom = true (ville / quartier) : la saisie libre est autorisée et
 *   remonte via onTyping ; sélectionner une option appelle onTyping(label).
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
  const blurTimer = useRef<number | null>(null);

  const displayValue = allowCustom
    ? value
    : options.find((o) => o.value === value)?.label ?? "";

  useEffect(() => {
    setQuery(displayValue);
  }, [displayValue]);

  useEffect(() => {
    return () => {
      if (blurTimer.current !== null) window.clearTimeout(blurTimer.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 8);
  }, [options, query]);

  const pick = (o: LocationOption) => {
    if (allowCustom) {
      onTyping?.(o.label);
    } else {
      onSelect?.(o);
    }
    setQuery(o.label);
    setOpen(false);
  };

  const handleTyping = (t: string) => {
    setQuery(t);
    if (allowCustom) onTyping?.(t);
    setOpen(true);
  };

  const handleBlur = () => {
    blurTimer.current = window.setTimeout(() => {
      if (!allowCustom && query !== displayValue) {
        const exact = options.find(
          (o) => o.label.toLowerCase() === query.trim().toLowerCase(),
        );
        if (exact) {
          onSelect?.(exact);
          setQuery(exact.label);
        } else {
          setQuery(displayValue);
        }
      }
      setOpen(false);
    }, 150);
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
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) handleBlur();
        }}
      >
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => handleTyping(e.target.value)}
              onFocus={() => {
                if (blurTimer.current !== null) window.clearTimeout(blurTimer.current);
                setOpen(true);
              }}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" && open && filtered.length > 0) {
                  e.preventDefault();
                  pick(filtered[0]);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder={placeholder}
              className="h-9 pr-8 text-sm"
              autoComplete="off"
            />
            <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {filtered.length === 0 ? (
                <CommandEmpty className="py-6 text-center text-[11px] text-muted-foreground">
                  Aucun résultat
                </CommandEmpty>
              ) : (
                filtered.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => pick(o)}
                    className="cursor-pointer"
                  >
                    <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{o.label}</span>
                    {displayValue === o.label && (
                      <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                  </CommandItem>
                ))
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}
