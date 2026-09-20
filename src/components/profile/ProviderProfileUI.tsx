// ============================================================================
// PROFILS PRO — kit visuel commun (Expert & Fournisseur)
//
// Un seul jeu de composants pour les deux fiches publiques (ProMarket /
// ProSupply) : même hiérarchie, même rythme d'espacement, même rendu du
// logo/avatar — les deux pages donnent ainsi l'impression d'un seul produit.
//
// Mobile-first : le contenu clé passe en 2 colonnes dès les petits écrans,
// les cibles tactiles font au moins 40 px, et aucune largeur fixe ne peut
// provoquer de débordement horizontal.
// ============================================================================

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ChevronRight, Store, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ProviderKind = "expert" | "supplier";

// ── Thème par type de profil ────────────────────────────────────────────────

/** Accent visuel selon le type de profil : ambre (expert), émeraude (fournisseur). */
const KIND_THEME: Record<ProviderKind, { strip: string; soft: string }> = {
  expert: {
    strip: "bg-gradient-to-r from-amber-500/25 via-amber-500/10 to-transparent",
    soft: "bg-amber-500/10 text-amber-600",
  },
  supplier: {
    strip: "bg-gradient-to-r from-emerald-500/25 via-emerald-500/10 to-transparent",
    soft: "bg-emerald-500/10 text-emerald-600",
  },
};

// ── Logo / photo ────────────────────────────────────────────────────────────

const AVATAR_SIZES = {
  xs: "h-9 w-9 rounded-lg text-[11px]",
  sm: "h-11 w-11 rounded-xl text-sm",
  md: "h-12 w-12 rounded-xl text-sm",
  lg: "h-16 w-16 rounded-2xl text-lg sm:h-20 sm:w-20 sm:text-xl",
};

function initialsOf(name: string): string {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Logo/photo réel du profil, jamais de `<img>` vide ou cassée.
 *
 * L'URL vient du backend (déjà nettoyée et réparée si besoin) : une valeur
 * absente → repli volontaire (initiales, puis icône du type de profil) ; une
 * image inaccessible (404, CORS, fichier supprimé) → `onError` bascule sur le
 * même repli au lieu d'une icône « image manquante ». Le conteneur est carré et
 * l'image en `object-cover` : aucun étirement, coins arrondis cohérents.
 */
export function ProviderAvatar({
  name,
  logo,
  kind,
  size = "md",
  className,
}: {
  name: string;
  logo?: string | null;
  kind: ProviderKind;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = initialsOf(name);
  const showImage = !!logo && !failed;
  const Icon = kind === "supplier" ? Store : UserRound;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-border/40",
        AVATAR_SIZES[size],
        showImage ? "bg-muted/20" : KIND_THEME[kind].soft,
        className,
      )}
    >
      {showImage ? (
        <img
          key={logo}
          src={logo as string}
          alt={`Logo de ${name}`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : initials ? (
        <span className="font-bold leading-none">{initials}</span>
      ) : (
        <Icon className="h-1/2 w-1/2" />
      )}
    </div>
  );
}

// ── En-tête de page ─────────────────────────────────────────────────────────

/** Barre supérieure collante : retour + titre du type de profil. */
export function ProfileHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 w-full max-w-3xl items-center gap-2 px-3 sm:h-14 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-muted/60 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight sm:text-sm">{title}</p>
          {subtitle && (
            <p className="truncate text-[10px] leading-tight text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}

// ── Carte d'identité ────────────────────────────────────────────────────────

/**
 * Bandeau d'identité : logo/photo proéminent à gauche, nom, type de profil,
 * note et puces d'information à droite (2 colonnes dès le mobile).
 */
export function ProfileHero({
  kind,
  name,
  logo,
  typeLabel,
  subtitle,
  rating,
  chips,
}: {
  kind: ProviderKind;
  name: string;
  logo?: string | null;
  typeLabel: string;
  subtitle?: string | null;
  rating?: ReactNode;
  chips?: ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden border-border/40 bg-card/60 p-0">
      <div className={cn("h-14 sm:h-16", KIND_THEME[kind].strip)} />
      <CardContent className="px-3.5 pb-3.5 pt-0 sm:px-5 sm:pb-5">
        <div className="-mt-8 flex items-end gap-3 sm:-mt-10 sm:gap-4">
          <div className="shrink-0 rounded-2xl bg-card p-1 shadow-sm ring-1 ring-border/40">
            <ProviderAvatar name={name} logo={logo} kind={kind} size="lg" />
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <h1 className="truncate text-base font-bold leading-tight tracking-tight sm:text-xl">
              {name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge variant="outline" className="shrink-0 text-[10px] leading-none">
                {typeLabel}
              </Badge>
              {rating}
            </div>
          </div>
        </div>

        {subtitle && (
          <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p>
        )}
        {chips && <div className="mt-2.5 flex flex-wrap gap-1.5">{chips}</div>}
      </CardContent>
    </Card>
  );
}

// ── Tuile d'information (grille 2 colonnes) ─────────────────────────────────

const TILE_TONES = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600",
  amber: "bg-amber-500/10 text-amber-600",
  blue: "bg-blue-500/10 text-blue-600",
  neutral: "bg-muted/60 text-muted-foreground",
};

/** Information clé condensée : icône, libellé et valeur, jamais tronquée. */
export function InfoTile({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: keyof typeof TILE_TONES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-xl border border-border/40 bg-card/60 px-2.5 py-2",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          TILE_TONES[tone],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 break-words text-[12px] font-semibold leading-snug">{value}</p>
      </div>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────

/** Section titrée : hiérarchie constante entre toutes les fiches. */
export function ProfileSection({
  icon: Icon,
  title,
  hint,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-0 border-border/40 bg-card/60 p-0">
      <CardHeader className="flex flex-row items-center gap-2 px-3.5 py-3 sm:px-5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <CardTitle className="min-w-0 truncate text-[13px] font-semibold">{title}</CardTitle>
        {hint && (
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{hint}</span>
        )}
        {action && <div className={cn("shrink-0", !hint && "ml-auto")}>{action}</div>}
      </CardHeader>
      <CardContent className="px-3.5 pb-3.5 sm:px-5 sm:pb-5">{children}</CardContent>
    </Card>
  );
}

/** Ligne de contact actionnable (téléphone, e-mail, site web, adresse). */
export function ContactRow({
  icon: Icon,
  href,
  external,
  onActivate,
  children,
}: {
  icon: LucideIcon;
  href?: string;
  external?: boolean;
  /** Déclenché au clic sur la ligne (ex. suivi statistique d'un contact). */
  onActivate?: () => void;
  children: ReactNode;
}) {
  const inner = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate text-[12px] font-medium">{children}</span>
      {external && (
        <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      )}
    </>
  );

  if (!href) {
    return (
      <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5">
        {inner}
      </div>
    );
  }

  return (
    <a
      onClick={onActivate}
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/40 active:scale-[0.99]"
    >
      {inner}
    </a>
  );
}

/** Étiquette compacte (spécialité, zone couverte). */
export function InfoChip({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Badge
      variant="secondary"
      className="max-w-full gap-1 truncate text-[10px] font-medium leading-none"
    >
      {Icon && <Icon className="h-2.5 w-2.5 shrink-0" />}
      {children}
    </Badge>
  );
}

/** État vide d'une section (aucun avis, aucune information). */
export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border/50 bg-muted/10 px-3 py-3 text-center text-[11px] text-muted-foreground">
      {children}
    </p>
  );
}

// ── Barre d'actions ────────────────────────────────────────────────────────

/**
 * Barre d'actions principale : collante en bas de l'écran sur mobile (accès au
 * pouce), carte classique en fin de page sur tablette/desktop.
 */
export function ProfileActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-border/40 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-4 sm:pb-3.5">
      {/* 2 actions par ligne sur mobile ; `overflow-hidden` empêche tout
          libellé long de créer un débordement horizontal de la page. */}
      <div className="flex flex-wrap gap-2 overflow-hidden [&>*]:min-w-[calc(50%-0.25rem)] [&>*]:flex-1">
        {children}
      </div>
    </div>
  );
}
