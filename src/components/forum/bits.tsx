import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FORUM_AUDIENCE_STYLE,
  FORUM_STATUS_STYLE,
  FORUM_TYPE_STYLE,
  formatForumDate,
  initialsOf,
  type ForumAudience,
  type ForumRequestType,
  type ForumStatusKey,
} from "@/lib/forumMeta";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Globe,
  MessageSquare,
  Paperclip,
  Package,
  Store,
  Users,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";

// ============================================================================
// Forum d'Assistance — éléments partagés (badges, ligne auteur, carte)
// ============================================================================

export function ForumBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TypeBadge({ type }: { type: ForumRequestType }) {
  const { t } = useTranslation("forum");
  const Icon =
    type === "intervention" ? Wrench : type === "consultation" ? Briefcase : Package;
  return (
    <ForumBadge className={FORUM_TYPE_STYLE[type]}>
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {t(`types.${type}`)}
    </ForumBadge>
  );
}

export function StatusBadge({ status }: { status: ForumStatusKey }) {
  const { t } = useTranslation("forum");
  const style = FORUM_STATUS_STYLE[status] ?? FORUM_STATUS_STYLE.open;
  return (
    <ForumBadge className={style.badge}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
      {t(`statuses.short.${status}`)}
    </ForumBadge>
  );
}

/**
 * Audience + cible : « Experts uniquement · Électricité », « Tout le monde »,
 * « Fournisseurs uniquement · Béton ».
 */
export function AudienceBadge({
  audience,
  target,
}: {
  audience: ForumAudience;
  target?: string | null;
}) {
  const { t } = useTranslation("forum");
  const Icon =
    audience === "public" ? Globe : audience === "experts" ? Users : Store;
  return (
    <ForumBadge className={FORUM_AUDIENCE_STYLE[audience]}>
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {t(`audiences.${audience}`)}
      {target ? <span className="opacity-70">· {target}</span> : null}
    </ForumBadge>
  );
}

/** Nom affiché d'un auteur selon son rôle (profil expert / fournisseur). */
export function authorDisplayName(author: any, fallback = "—"): string {
  if (!author) return fallback;
  if (author.userRole === "expert") {
    return author.displayName || author.companyName || author.name || fallback;
  }
  if (author.userRole === "supplier") {
    return author.companyName || author.name || fallback;
  }
  return author.name || fallback;
}

/** Rôle lisible de l'auteur (Expert / Fournisseur / Client). */
export function AuthorRoleBadge({ author }: { author: any }) {
  const { t } = useTranslation("forum");
  if (!author?.userRole) return null;
  const role = author.userRole;
  if (role === "expert") {
    return (
      <ForumBadge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
        <Briefcase className="h-2.5 w-2.5 shrink-0" />
        {author.profession
          ? t(`specialties.${author.profession}`, { defaultValue: t("detail.expert") })
          : t("detail.expert")}
      </ForumBadge>
    );
  }
  if (role === "supplier") {
    return (
      <ForumBadge className="border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400">
        <Store className="h-2.5 w-2.5 shrink-0" />
        {author.profession
          ? t(`materials.${author.profession}`, { defaultValue: t("detail.supplier") })
          : t("detail.supplier")}
      </ForumBadge>
    );
  }
  return (
    <ForumBadge className="border-border/50 bg-muted/40 text-muted-foreground">
      {t("detail.client")}
    </ForumBadge>
  );
}

export function AuthorLine({
  author,
  date,
  showRole = true,
  dateLabel,
}: {
  author: any;
  date: number;
  showRole?: boolean;
  dateLabel?: ReactNode;
}) {
  const { i18n } = useTranslation("forum");
  const name = authorDisplayName(author);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="h-7 w-7 shrink-0 border border-border/40">
        <AvatarImage src={author?.image ?? undefined} alt={name} className="object-cover" />
        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
          {initialsOf(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold leading-tight">{name}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {formatForumDate(date, i18n.language)}
        </p>
      </div>
      {showRole ? <AuthorRoleBadge author={author} /> : null}
      {dateLabel}
    </div>
  );
}

export interface ForumPostCardData {
  _id: string;
  title: string;
  description: string;
  requestType: ForumRequestType;
  audience: ForumAudience;
  status: ForumStatusKey;
  specialty?: string | null;
  materialCategory?: string | null;
  budget?: number | null;
  location?: { region?: string; city?: string; zone?: string } | null;
  createdAt: number;
  lastActivityAt: number;
  replyCount: number;
  attachmentCount: number;
  author: any;
}

/** Carte compacte d'une demande (liste du forum). */
export function ForumPostCard({
  post,
  onOpen,
  onReport,
}: {
  post: ForumPostCardData;
  onOpen: () => void;
  onReport?: () => void;
}) {
  const { t } = useTranslation("forum");
  const target =
    post.audience === "suppliers"
      ? post.materialCategory
        ? t(`materials.${post.materialCategory}`, { defaultValue: post.materialCategory })
        : null
      : post.specialty
        ? t(`specialties.${post.specialty}`, { defaultValue: post.specialty })
        : null;

  return (
    <Card
      className="group flex cursor-pointer flex-col gap-0 rounded-xl border border-border/40 bg-card/60 p-3.5 transition-all duration-200 hover:border-primary/25 hover:bg-card hover:shadow-sm active:scale-[0.99]"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <AuthorLine author={post.author} date={post.createdAt} />
        {onReport ? (
          <button
            type="button"
            title={t("card.report")}
            aria-label={t("card.report")}
            onClick={(e) => {
              e.stopPropagation();
              onReport();
            }}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <AlertTriangle className="h-3 w-3" />
          </button>
        ) : null}
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">
        {post.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {post.description}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <TypeBadge type={post.requestType} />
        <AudienceBadge audience={post.audience} target={target} />
        <StatusBadge status={post.status} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
          <MessageSquare className="h-3 w-3 shrink-0" strokeWidth={2.5} />
          {t("card.replies", { count: post.replyCount })}
        </span>
        {post.attachmentCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3 shrink-0" />
            {t("card.attachments", { count: post.attachmentCount })}
          </span>
        ) : null}
        {post.location?.region ? (
          <span className="truncate">{post.location.region}</span>
        ) : null}
      </div>

      <div className="mt-3 border-t border-border/20 pt-2.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-full gap-1.5 text-xs group-hover:border-primary/30 group-hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          {t("card.view")}
        </Button>
      </div>
    </Card>
  );
}

/** Squelette de carte pendant le chargement. */
export function ForumCardSkeleton() {
  return (
    <Card className="rounded-xl border border-border/40 bg-card/40 p-3.5">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted/70" />
      <div className="mt-3 flex gap-1.5">
        <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
      </div>
    </Card>
  );
}
