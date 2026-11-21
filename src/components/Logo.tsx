import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";

// Logo officiel de la plateforme : la tuile verte au casque blanc, l'asset réel
// partagé par toute la plateforme (`src/assets/logo.png`, source unique dans
// `@/lib/branding`). Aucune icône Lucide, aucun logo générique, aucun
// placeholder n'est utilisé comme logo.
// Utilisé partout : landing, dashboard, auth, dropdowns, mobile.

const SIZES = {
  sm: { box: "h-8 w-8 rounded-xl", wordmark: "text-sm" },
  md: { box: "h-10 w-10 rounded-2xl", wordmark: "text-lg" },
  lg: { box: "h-14 w-14 rounded-[1.25rem]", wordmark: "text-xl" },
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
    <img
      src={BRAND_LOGO_SRC}
      alt={`Logo ${BRAND_NAME}`}
      draggable={false}
      className={cn("shrink-0 select-none object-contain", s.box, className)}
    />
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
      <span className={cn("font-display font-bold tracking-[-0.035em]", s.wordmark, wordmarkClassName)}>
        {BRAND_NAME}
      </span>
    </div>
  );
}
