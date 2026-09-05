import { cn } from "@/lib/utils";

interface BottomNavAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
  active?: boolean;
  disabled?: boolean;
  /** Renders the action as a solid black button (dedicated CTA style). */
  variant?: "default" | "black";
}

interface BottomNavBarProps {
  actions: BottomNavAction[];
  className?: string;
}

/**
 * Sticky bottom navigation bar for action buttons.
 * Visible on all screen sizes — compact on mobile, slightly taller on desktop.
 */
export function BottomNavBar({ actions, className }: BottomNavBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border/30 bg-background/95 backdrop-blur-md safe-area-bottom",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl flex items-center justify-around gap-1 px-2 py-1.5 sm:py-2">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            disabled={a.disabled}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[9px] sm:text-[10px] font-medium transition-all active:scale-95 min-w-0 flex-1",
              a.variant === "black"
                ? "bg-black text-white border border-white/10 shadow-sm hover:bg-neutral-800"
                : a.disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-muted/50",
              a.disabled && "opacity-40 cursor-not-allowed",
              a.variant !== "black" && (a.color ?? "text-muted-foreground"),
            )}
            title={a.label}
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                a.variant === "black" ? "bg-white/15" : "bg-muted/30",
              )}
            >
              {a.icon}
            </div>
            <span className="truncate leading-tight max-w-full">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
