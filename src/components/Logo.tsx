import { HardHat } from "lucide-react";
import { cn } from "@/lib/utils";

// Logo officiel de la plateforme (identique à celui de la landing page) :
// un casque de chantier blanc dans un carré arrondi vert (bg-primary) + wordmark.
// Utilisé partout : landing, dashboard, auth, dropdowns.

const SIZES = {
  sm: { box: "h-7 w-7 rounded-lg", icon: "h-4 w-4", wordmark: "text-sm" },
  md: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4", wordmark: "text-lg" },
  lg: { box: "h-11 w-11 rounded-xl", icon: "h-5 w-5", wordmark: "text-xl" },
} as const;

export function LogoMark({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary text-primary-foreground",
        s.box,
        className,
      )}
    >
      <HardHat className={s.icon} />
    </div>
  );
}

export function Logo({
  size = "md",
  className,
  wordmarkClassName,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  wordmarkClassName?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className={cn("font-semibold tracking-tight", s.wordmark, wordmarkClassName)}>
        batibuild App
      </span>
    </div>
  );
}
