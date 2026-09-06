import { cn } from "@/lib/utils";
import {
  ANNOUNCEMENT_STATUS_META,
  type AnnouncementStatus,
} from "../../announcements/meta";

interface Props {
  status: AnnouncementStatus;
  className?: string;
  /** Use the resolved status even if the stored one differs */
  resolvedStatus?: AnnouncementStatus;
}

/**
 * Status pill (Publiée / Programmée / Brouillon / Expirée / Désactivée).
 * Prefers the resolved status when provided.
 */
export function AnnouncementStatusBadge({ status, resolvedStatus, className }: Props) {
  const effective = resolvedStatus ?? status;
  const meta = ANNOUNCEMENT_STATUS_META[effective] ?? ANNOUNCEMENT_STATUS_META.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        meta.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}