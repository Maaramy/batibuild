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
  ArrowRight,
  BadgeCheck,
  Boxes,
  Building2,
  Calculator,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Clock,
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
  Phone,
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

export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: string;
  className?: string;
}) {
  const label =
    PROMARKET_AVAILABILITY_LABELS[availability] ?? PROMARKET_AVAILABILITY_LABELS.busy;
  const tone =
    availability === "immediate"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : availability === "week"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "border-border bg-muted/50 text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px] font-medium", tone, className)}>
      <Clock className="h-3 w-3" />
      {label}
    </Badge>
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

export function ProfessionalCard({
  profile,
  saved,
  onToggleSaved,
}: {
  profile: ProMarketCardData;
  saved?: boolean;
  onToggleSaved?: (id: string) => void;
}) {
  const { t } = useTranslation("promarket");

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-border/50 bg-background/60 p-3.5 transition-colors hover:border-primary/40 sm:p-4">
      <div className="flex items-start gap-3">
        <ProAvatar name={profile.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {profile.companyName || profile.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile.tradeLabel}
                {profile.companyName ? ` · ${profile.displayName}` : ""}
              </p>
            </div>
            {onToggleSaved && (
              <button
                type="button"
                onClick={() => onToggleSaved(profile._id)}
                aria-label={saved ? t("card.saved") : t("card.save")}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Heart
                  className={cn("h-4 w-4", saved && "fill-rose-500 text-rose-500")}
                />
              </button>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {profile.city}
              {profile.regionLabel ? ` · ${profile.regionLabel}` : ""}
            </span>
            {profile.distanceKm !== undefined && (
              <span>{t("card.distance", { km: profile.distanceKm })}</span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <RatingInline rating={profile.rating} count={profile.ratingCount} />
            <span className="text-xs text-muted-foreground">
              {t("card.experience", { count: profile.experienceYears })}
            </span>
          </div>
        </div>
      </div>

      <VerificationBadges profile={profile} />

      {profile.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {profile.description}
        </p>
      )}

      {profile.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.specialties.slice(0, 4).map((s) => (
            <Badge
              key={s}
              variant="outline"
              className="border-border/60 text-[10px] font-normal"
            >
              {s}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <AvailabilityBadge availability={profile.availability} />
        {profile.urgent && (
          <Badge
            variant="outline"
            className="border-rose-500/30 bg-rose-500/10 text-[10px] font-medium text-rose-600 dark:text-rose-400"
          >
            <Zap className="h-3 w-3" />
            {t("search.urgent")}
          </Badge>
        )}
        {profile.homeService && (
          <Badge
            variant="outline"
            className="border-border/60 text-[10px] font-normal text-muted-foreground"
          >
            {t("search.homeService")}
          </Badge>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
        <span className="text-xs font-medium text-foreground">
          {profile.priceFrom !== undefined
            ? t("card.from", {
                price: profile.priceFrom,
                unit: profile.priceUnit ?? "TND",
              })
            : t("card.priceOnRequest")}
        </span>
        <Button asChild size="sm" variant="ghost" className="gap-1 text-xs">
          <Link to={`/promarket/pro/${profile._id}`}>
            <Eye className="h-3.5 w-3.5" />
            {t("card.viewProfile")}
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function ProfessionalCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <Skeleton className="mt-3 h-8 w-full rounded-lg" />
    </div>
  );
}

/** Puces de contact (appel / WhatsApp / message). */
export function ContactChips({
  phone,
  whatsapp,
  onCall,
  onWhatsApp,
  className,
}: {
  phone?: string;
  whatsapp?: string;
  onCall?: () => void;
  onWhatsApp?: () => void;
  className?: string;
}) {
  const { t } = useTranslation("promarket");
  if (!phone && !whatsapp) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {phone && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={onCall}
        >
          <a href={`tel:${phone.replace(/\s+/g, "")}`}>
            <Phone className="h-3.5 w-3.5" />
            {t("card.call")}
          </a>
        </Button>
      )}
      {whatsapp && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={onWhatsApp}
        >
          <a
            href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Phone className="h-3.5 w-3.5" />
            {t("card.whatsapp")}
          </a>
        </Button>
      )}
    </div>
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
