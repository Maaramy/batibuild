import { AnnouncementCard } from "../../announcements/AnnouncementCard";
import { AnnouncementStatusBadge } from "./AnnouncementStatusBadge";
import type { AnnouncementLike } from "../../announcements/meta";

interface Props {
  announcement: AnnouncementLike | null;
}

/**
 * Preview panel shown next to the form: renders the announcement exactly as
 * users will see it in their dashboard carousel.
 */
export function AnnouncementPreview({ announcement: a }: Props) {
  if (!a) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border/60 px-6 text-center">
        <p className="text-xs text-muted-foreground/70">
          Remplissez le formulaire pour voir un aperçu en temps réel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Aperçu
        </p>
        <AnnouncementStatusBadge status={a.status} resolvedStatus={a.resolvedStatus} />
      </div>
      <AnnouncementCard announcement={a} />
      <p className="text-[10px] text-muted-foreground/60">
        Aperçu exact du rendu dans le carousel du tableau de bord utilisateur.
      </p>
    </div>
  );
}