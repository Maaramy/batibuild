import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { AnnouncementBadge } from "./AnnouncementBadge";
import { AnnouncementAvatar } from "./AnnouncementAvatar";
import {
  ANNOUNCEMENT_TYPE_META,
  type AnnouncementLike,
} from "./meta";

interface Props {
  announcement: AnnouncementLike;
  onClick?: () => void;
  /** Compact mode for admin preview / lists */
  compact?: boolean;
  className?: string;
}

/**
 * Single announcement card — used inside the carousel and in previews.
 * The optional image / logo is shown as a compact circular icon on the left of
 * the title (32px mobile, 40px desktop), above the content and meta row.
 */
export function AnnouncementCard({ announcement: a, onClick, compact, className }: Props) {
  const meta = ANNOUNCEMENT_TYPE_META[a.type] ?? ANNOUNCEMENT_TYPE_META.information;
  const Icon = meta.icon;
  const externalUrl =
    a.type === "annonce" && a.externalUrl?.trim() ? a.externalUrl.trim() : undefined;

  return (
    <article
      onClick={onClick}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/80 text-left shadow-soft transition-all duration-200 hover:shadow-md hover:border-border/70 active:scale-[0.99]",
        "border-l-4",
        meta.accent,
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <AnnouncementBadge type={a.type} />
          {a.priority >= 4 && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                meta.chip,
              )}
            >
              Priorité {a.priority}
            </span>
          )}
        </div>

        {a.imageUrl && (
          <div className="flex items-center gap-3">
            <AnnouncementAvatar src={a.imageUrl} alt={a.title} />
            <h3 className="min-w-0 flex-1 text-sm sm:text-base font-bold leading-snug tracking-tight text-foreground line-clamp-2">
              {a.title}
            </h3>
          </div>
        )}

        {!a.imageUrl && (
          <h3 className="text-sm sm:text-base font-bold leading-snug tracking-tight text-foreground line-clamp-2">
            {a.title}
          </h3>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {a.content}
        </p>

        <div className="mt-auto flex items-center gap-3 pt-2 text-[10px] text-muted-foreground/80">
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95",
                  "border-amber-500/40 bg-amber-400/20 text-amber-900 hover:bg-amber-400/30 hover:border-amber-500/60",
                  "dark:border-amber-300/40 dark:bg-amber-400/20 dark:text-amber-100 dark:hover:bg-amber-400/30 dark:hover:border-amber-300/60",
                )}
              >
                <ExternalLink className="h-3 w-3" />
                Visitez
              </a>
            )}
            {!compact && (
              <span className="inline-flex items-center gap-0.5 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Lire
                <Icon className="h-3 w-3" />
              </span>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}
