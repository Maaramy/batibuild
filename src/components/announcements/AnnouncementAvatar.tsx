import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt?: string;
  /** Extra layout classes (margin, alignment…). Default size: 32px mobile, 40px desktop. */
  className?: string;
  imgClassName?: string;
}

/**
 * Compact circular rendering of an announcement image / logo, displayed to the
 * left of the title: rounded circle, object-fit cover, subtle border + shadow.
 * Sizes are responsive — 32×32 px on mobile, 40×40 px on desktop.
 */
export function AnnouncementAvatar({ src, alt = "", className, imgClassName }: Props) {
  return (
    <span
      className={cn(
        "relative inline-flex h-8 w-8 shrink-0 select-none overflow-hidden rounded-full border border-border/60 bg-muted/30 shadow-sm ring-2 ring-background sm:h-10 sm:w-10",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("h-full w-full object-cover", imgClassName)}
      />
    </span>
  );
}
