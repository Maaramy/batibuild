import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Primitives Material 3 Expressive partagées.
 *
 * Elles complètent shadcn/ui sans le remplacer : les pages continuent d'utiliser
 * les mêmes composants métier et la même logique. Seuls les éléments de
 * navigation, de recherche et d'action rapide utilisent ces primitives afin de
 * garder un langage visuel cohérent sur desktop et mobile.
 */

export function M3Icon({
  name,
  filled = false,
  className,
  label,
}: {
  name: string;
  filled?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("material-symbols-rounded", filled && "is-filled", className)}
    >
      {name}
    </span>
  );
}

export function M3Fab({
  icon,
  label,
  extended = false,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  icon: string;
  label: string;
  extended?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "m3-fab inline-flex touch-manipulation items-center justify-center gap-2 px-4 text-sm font-semibold",
        extended ? "min-w-0" : "w-14 px-0",
        className,
      )}
      {...props}
    >
      <M3Icon name={icon} filled className="text-[24px]" />
      {extended && <span className="pr-1">{label}</span>}
    </button>
  );
}

export interface M3NavigationItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
}

export function M3NavigationBar({
  items,
  ariaLabel = "Navigation principale",
  className,
}: {
  items: M3NavigationItem[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "m3-nav-bar fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around px-1 lg:hidden",
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          data-active={item.active ? "true" : "false"}
          aria-current={item.active ? "page" : undefined}
          className="m3-nav-bar-item relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors"
        >
          <span className="m3-nav-icon relative">
            <M3Icon name={item.icon} filled={item.active} className="text-[23px]" />
            {typeof item.badge === "number" && item.badge > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </span>
          <span className="max-w-full truncate text-[10px] font-semibold">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function M3SearchBar({
  value,
  onChange,
  placeholder = "Rechercher",
  onClear,
  className,
  inputProps,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  inputProps?: Omit<React.ComponentProps<"input">, "value" | "onChange">;
}) {
  return (
    <div className={cn("m3-search-bar flex w-full items-center gap-2 px-3", className)}>
      <M3Icon name="search" className="shrink-0 text-[21px] text-muted-foreground" />
      <input
        {...inputProps}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
      />
      {value && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => (onClear ? onClear() : onChange(""))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
        >
          <M3Icon name="close" className="text-[18px]" />
        </button>
      )}
    </div>
  );
}

export function M3SegmentedButtons<T extends string>({
  options,
  value,
  onValueChange,
  ariaLabel,
  className,
}: {
  options: readonly { value: T; label: string; icon?: string }[];
  value: T;
  onValueChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-full bg-surface-container p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all active:scale-[0.98]",
              selected
                ? "bg-primary-container text-on-primary-container shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-foreground",
            )}
          >
            {option.icon && <M3Icon name={option.icon} filled={selected} className="text-[18px]" />}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function M3Chip({
  selected = false,
  icon,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  selected?: boolean;
  icon?: string;
}) {
  return (
    <button
      type="button"
      data-selected={selected ? "true" : "false"}
      className={cn("m3-chip shrink-0 transition-all active:scale-[0.97]", className)}
      {...props}
    >
      {icon && <M3Icon name={icon} filled={selected} className="text-[16px]" />}
      {children}
    </button>
  );
}
