import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CalendarDays, UserRound, Megaphone } from "lucide-react";
import { AnnouncementBadge } from "./AnnouncementBadge";
import {
  ANNOUNCEMENT_TYPE_META,
  authorName,
  formatAnnouncementDate,
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
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div>
              <DialogTitle className="text-base leading-tight">{a.title}</DialogTitle>
              <DialogDescription className="sr-only">Détail de l'annonce</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {a.imageUrl && (
            <img
              src={a.imageUrl}
              alt=""
              className="h-44 w-full rounded-xl border border-border/40 object-cover"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <AnnouncementBadge type={a.type} />
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              Publiée le {formatAnnouncementDate(a.startDate ?? a.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <UserRound className="h-3 w-3" />
              {authorName(a)}
            </span>
            {a.endDate && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                · Jusqu'au {formatAnnouncementDate(a.endDate)}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {a.content}
          </p>

          <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
            <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary" />
            Communication officielle de la plateforme batibuild App.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}