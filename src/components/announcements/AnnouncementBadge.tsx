import { cn } from "@/lib/utils";
import { ANNOUNCEMENT_TYPE_META, type AnnouncementType } from "./meta";

interface Props {
  type: AnnouncementType;
  className?: string;
}

/**
 * Type pill for a communication (Advertisement / Information / Nouveauté /
 * Important / Urgent / Maintenance) with a distinct color and icon.
 */
export function AnnouncementBadge({ type, className }: Props) {
  const meta = ANNOUNCEMENT_TYPE_META[type] ?? ANNOUNCEMENT_TYPE_META.information;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        meta.badge,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}