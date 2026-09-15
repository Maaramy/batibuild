import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PROMARKET_AVAILABILITY_LABELS,
  PROMARKET_REQUEST_STATUS_CLASSES,
  PROMARKET_REQUEST_STATUS_LABELS,
  promarketRegionLabel,
} from "@/lib/promarketMeta";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Boxes,
  Building2,
  Calculator,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Compass,
  DoorOpen,
  DraftingCompass,
  Droplets,
  Eye,
  HardHat,
  Heart,
  Layers,
  Layers3,
  LayoutGrid,
  LockKeyhole,
  MapPin,
  Palette,
  Palmtree,
  Paintbrush,
  Plug,
  Scale,
  ShieldCheck,
  ShowerHead,
  Sparkles,
  Star,
  Store,
  Sun,
  Truck,
  Waves,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Children, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

// ============================================================================
// ProMarket — composants partagés (cartes, badges, icônes)
// ============================================================================

/** Correspondance des icônes du catalogue partagé (noms → composants). */
const ICONS: Record<string, LucideIcon> = {
  Boxes,
  Building2,
  Calculator,
  ClipboardCheck,
  ClipboardList,
  Compass,
  DoorOpen,
  DraftingCompass,
  Droplets,
  HardHat,
  Layers,
  Layers3,
  LayoutGrid,
  LockKeyhole,
  Palette,
  Palmtree,
  Paintbrush,
  Plug,
  Scale,
  ShieldCheck,
  ShowerHead,
  Store,
  Sun,
  Truck,
  Waves,
  Wrench,
  Zap,
};

export function ProIcon({
  name,
  className,
}: {
  name: string | undefined;
  className?: string;
}) {
  const Icon = (name ? ICONS[name] : undefined) ?? Store;
  return <Icon className={className} aria-hidden />;
}

// ----------------------------------------------------------------------------
// Badges
// ----------------------------------------------------------------------------

export function DemoBadge({ className }: { className?: string }) {
  const { t } = useTranslation("promarket");
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-dashed border-amber-500/40 bg-amber-500/10 text-[10px] font-medium text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      {t("card.demo")}
    </Badge>
  );
}

/** Badges de vérification — uniquement attribués par l'administration. */
export function VerificationBadges({
  profile,
  compact,
}: {
  profile: {
    verifiedPro?: boolean;
    verifiedIdentity?: boolean;
    verifiedDocs?: boolean;
    recommended?: boolean;
    demo?: boolean;
  };
  compact?: boolean;
}) {
  const { t } = useTranslation("promarket");
  const badges: { key: string; label: string; className: string }[] = [];
  if (profile.recommended) {
    badges.push({
      key: "recommended",
      label: t("card.recommended"),
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    });
  }
  if (profile.verifiedPro) {
    badges.push({
      key: "pro",
      label: t("card.verifiedPro"),
      className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    });
  }
  if (profile.verifiedIdentity) {
    badges.push({
      key: "identity",
      label: t("card.verifiedIdentity"),
      className:
        "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    });
  }
  if (profile.verifiedDocs) {
    badges.push({
      key: "docs",
      label: t("card.verifiedDocs"),
      className:
        "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {badges.map((b) => (
        <Badge
          key={b.key}
          variant="outline"
          className={cn("gap-1 text-[10px] font-medium", b.className)}
        >
          {b.key === "recommended" ? (
            <Sparkles className="h-3 w-3" />
          ) : (
            <BadgeCheck className="h-3 w-3" />
          )}
          {!compact && b.label}
        </Badge>
      ))}
      {profile.demo && <DemoBadge />}
    </div>
  );
}

export function RequestStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-semibold",
        PROMARKET_REQUEST_STATUS_CLASSES[status] ?? "border-border bg-muted",
        className,
      )}
    >
      {PROMARKET_REQUEST_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ----------------------------------------------------------------------------
// Note (affichage compact)
// ----------------------------------------------------------------------------

export function RatingInline({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  const { t } = useTranslation("promarket");
  if (!count) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t("card.noReviews")}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({t("card.reviewsOther", { count })})
      </span>
    </span>
  );
}

export function Stars({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const dimension = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            dimension,
            n <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

/** Initiales d'un professionnel (avatar sans image externe). */
export function ProAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
      aria-hidden
    >
      {initials || "P"}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Carte professionnel
// ----------------------------------------------------------------------------

export interface ProMarketCardData {
  _id: string;
  displayName: string;
  companyName?: string;
  tradeLabel: string;
  city: string;
  regionLabel?: string;
  rating: number;
  ratingCount: number;
  experienceYears: number;
  availability: string;
  homeService: boolean;
  urgent: boolean;
  priceFrom?: number;
  priceUnit?: string;
  distanceKm?: number;
  specialties: string[];
  description?: string;
  completedCount?: number;
  verifiedPro?: boolean;
  verifiedIdentity?: boolean;
  verifiedDocs?: boolean;
  recommended?: boolean;
  demo?: boolean;
}

/**
 * Carte professionnel — version compacte et aérée.
 *
 * Seules les informations essentielles sont affichées : avatar, nom, métier,
 * localisation, note éventuelle, statut vérifié/actif discret et un unique
 * bouton d'action principal (« Voir le profil »). Les descriptions, badges
 * secondaires, tarifs et puces de spécialités sont désormais uniquement
 * visibles sur la fiche détaillée.
 */
export function ProfessionalCard({
  profile,
  saved,
  onToggleSaved,
  className,
}: {
  profile: ProMarketCardData;
  saved?: boolean;
  onToggleSaved?: (id: string) => void;
  className?: string;
}) {
  const { t } = useTranslation("promarket");
  const name = profile.companyName || profile.displayName;
  const verified = Boolean(
    profile.recommended ||
      profile.verifiedPro ||
      profile.verifiedIdentity ||
      profile.verifiedDocs,
  );
  const verifiedLabel = profile.recommended
    ? t("card.recommended")
    : profile.verifiedPro
      ? t("card.verifiedPro")
      : profile.verifiedIdentity
        ? t("card.verifiedIdentity")
        : t("card.verifiedDocs");
  const availability =
    PROMARKET_AVAILABILITY_LABELS[profile.availability] ??
    PROMARKET_AVAILABILITY_LABELS.busy;
  const availabilityTone =
    profile.availability === "immediate"
      ? "bg-emerald-500"
      : profile.availability === "week"
        ? "bg-amber-500"
        : "bg-muted-foreground/50";

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-2.5 rounded-2xl border border-border/50 bg-background p-3 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <ProAvatar name={name} className="h-10 w-10 rounded-xl text-xs" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            {verified && (
              <span className="shrink-0 text-sky-500" title={verifiedLabel}>
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {profile.tradeLabel}
            {profile.companyName ? ` · ${profile.displayName}` : ""}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">
              {profile.city}
              {profile.regionLabel ? ` · ${profile.regionLabel}` : ""}
            </span>
          </p>
        </div>
        {onToggleSaved && (
          <button
            type="button"
            onClick={() => onToggleSaved(profile._id)}
            aria-label={saved ? t("card.saved") : t("card.save")}
            className="-me-1 -mt-1 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Heart className={cn("h-4 w-4", saved && "fill-rose-500 text-rose-500")} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {profile.ratingCount > 0 ? (
          <RatingInline rating={profile.rating} count={profile.ratingCount} />
        ) : (
          <span className="text-[11px] text-muted-foreground">{t("card.noReviews")}</span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full", availabilityTone)} aria-hidden />
          {availability}
        </span>
        {profile.demo && <DemoBadge />}
      </div>

      <Button
        asChild
        size="sm"
        variant="outline"
        className="mt-auto h-8 w-full gap-1.5 border-border bg-transparent text-xs transition-colors hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary active:scale-[0.98]"
      >
        <Link to={`/promarket/pro/${profile._id}`}>
          <Eye className="h-3.5 w-3.5" />
          {t("card.viewProfile")}
        </Link>
      </Button>
    </article>
  );
}

/** Squelette compact, aligné sur la carte (`h-full` pour un alignement stable). */
export function ProfessionalCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-2.5 rounded-2xl border border-border/50 p-3",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="mt-auto h-8 w-full rounded-lg" />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Carrousels horizontaux (mobile-first)
// ----------------------------------------------------------------------------

/**
 * Carrousel horizontal : défilement natif (swipe tactile), accroche sur les
 * cartes et indicateur de pagination discret. Seule la piste défile : la page
 * ne déborde jamais horizontalement.
 */
export function CardCarousel({
  children,
  className,
  label,
  hideDots,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
  hideDots?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.count(children);

  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const origin = track.getBoundingClientRect().left;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    Array.from(track.children).forEach((child, index) => {
      const distance = Math.abs(
        (child as HTMLElement).getBoundingClientRect().left - origin,
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    sync();
  }, [sync, count]);

  return (
    <div className={cn("min-w-0", className)}>
      <div
        ref={trackRef}
        onScroll={sync}
        role="group"
        aria-label={label}
        className="-mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-3 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
      >
        {children}
      </div>
      {!hideDots && count > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1" aria-hidden>
          {Array.from({ length: count }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === active ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Élément de carrousel : largeur cohérente et accroche au défilement.
 * `tile` = tuile compacte (catégories), `card` = carte professionnel.
 */
export function CarouselItem({
  children,
  className,
  size = "card",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "card" | "tile";
}) {
  return (
    <div
      className={cn(
        "shrink-0 snap-start",
        size === "tile"
          ? "w-[30%] max-w-[8.5rem] sm:w-[7.5rem]"
          : "w-[72%] max-w-[15rem] sm:w-60",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Carte compacte générique de carrousel (catégories, raccourcis…). */
export function CarouselTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-center gap-2 rounded-2xl border border-border/50 bg-background p-3 text-center transition-colors hover:border-primary/40 active:scale-[0.98]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="line-clamp-2 text-xs font-semibold leading-tight">{label}</span>
    </button>
  );
}

/** En-tête de section compacte. */
export function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground sm:text-base">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Métadonnée compacte (icône + libellé). */
export function MetaChip({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export { Calendar, promarketRegionLabel };
