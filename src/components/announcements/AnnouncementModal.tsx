import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Megaphone, ExternalLink } from "lucide-react";
import { AnnouncementBadge } from "./AnnouncementBadge";
import { AnnouncementAvatar } from "./AnnouncementAvatar";
import {
  ANNOUNCEMENT_TYPE_META,
  type AnnouncementLike,
} from "./meta";

interface Props {
  announcement: AnnouncementLike | null;
  onClose: () => void;
}

/**
 * Full-content dialog for an announcement (opened from the carousel or list).
 */
export function AnnouncementModal({ announcement: a, onClose }: Props) {
  if (!a) return null;
  const meta = ANNOUNCEMENT_TYPE_META[a.type] ?? ANNOUNCEMENT_TYPE_META.information;
  const Icon = meta.icon;

  return (
    <Dialog open={!!a} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {a.imageUrl ? (
              <AnnouncementAvatar src={a.imageUrl} alt={a.title} className="mt-1" />
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
            )}
            <div className="min-w-0">
              <DialogTitle className="text-base leading-snug pt-1">{a.title}</DialogTitle>
              <DialogDescription className="sr-only">Détail de la communication</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <AnnouncementBadge type={a.type} />
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {a.content}
          </p>

          {a.type === "annonce" && a.externalUrl?.trim() && (
            <a
              href={a.externalUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all active:scale-95",
                "border-amber-500/40 bg-amber-400/20 text-amber-900 hover:bg-amber-400/30 hover:border-amber-500/60",
                "dark:border-amber-300/40 dark:bg-amber-400/20 dark:text-amber-100 dark:hover:bg-amber-400/30 dark:hover:border-amber-300/60",
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visitez le site
            </a>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
            <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary" />
            Communication officielle de la plateforme batibuild.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}