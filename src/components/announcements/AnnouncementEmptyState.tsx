import { Megaphone } from "lucide-react";

interface Props {
  title?: string;
  description?: string;
  compact?: boolean;
}

/**
 * Friendly empty state for the communications section (dashboard) or the
 * filtered admin list.
 */
export function AnnouncementEmptyState({
  title = "Aucune communication pour le moment",
  description = "Les communications de l'équipe batibuild apparaîtront ici.",
  compact,
}: Props) {
  return (
    <div
      className={
        compact
          ? "flex items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center"
          : "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center"
      }
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
        <Megaphone className="h-4.5 w-4.5 text-muted-foreground/60" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground/80">{title}</p>
        {!compact && (
          <p className="mt-0.5 text-xs text-muted-foreground/70">{description}</p>
        )}
      </div>
    </div>
  );
}