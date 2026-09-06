import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { AnnouncementCard } from "./AnnouncementCard";
import { AnnouncementModal } from "./AnnouncementModal";
import { AnnouncementEmptyState } from "./AnnouncementEmptyState";
import type { AnnouncementLike } from "./meta";

interface Props {
  announcements: AnnouncementLike[];
  /** Seconds between slides (default 5) */
  intervalSeconds?: number;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Elegant auto-scrolling announcement carousel.
 * - Autoplay with pause on hover / touch
 * - Previous / next buttons + pagination dots
 * - Touch swipe support (mobile)
 * - Works with 1, several or many announcements
 */
export function AnnouncementCarousel({
  announcements,
  intervalSeconds = 5,
  title = "Communications",
  description,
  className,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<AnnouncementLike | null>(null);
  const touchX = useRef<number | null>(null);
  const count = announcements.length;

  // Reset index when the list changes length dramatically (e.g. an announcement disappears)
  useEffect(() => {
    setIndex((i) => (count === 0 ? 0 : i % count));
  }, [count]);

  const go = useCallback(
    (dir: number) => {
      if (count === 0) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  // Autoplay
  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => go(1), intervalSeconds * 1000);
    return () => clearInterval(t);
  }, [count, paused, go, intervalSeconds]);

  if (count === 0) {
    return (
      <section className={className} aria-label={title}>
        {title && (
          <div className="mb-2 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold tracking-tight">{title}</h2>
          </div>
        )}
        <AnnouncementEmptyState />
      </section>
    );
  }

  const current = announcements[index];

  return (
    <section className={className} aria-label={title} aria-roledescription="carrousel">
      {(title || description) && (
        <div className="mb-2 flex items-end justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight leading-tight truncate">
                {title}
              </h2>
              {description && (
                <p className="text-[10px] text-muted-foreground/70 truncate">{description}</p>
              )}
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-border/40 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
            {index + 1} / {count}
          </span>
        </div>
      )}

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          setPaused(true);
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current !== null) {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          }
          touchX.current = null;
          setPaused(false);
        }}
      >
        <div className="overflow-hidden rounded-2xl">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {announcements.map((a, i) => (
              <div
                key={a._id}
                className="w-full shrink-0 px-0.5"
                aria-hidden={i !== index}
              >
                <AnnouncementCard
                  announcement={a}
                  onClick={() => setSelected(a)}
                  className={cn(i !== index && "pointer-events-none select-none")}
                />
              </div>
            ))}
          </div>
        </div>

        {count > 1 && (
          <>
            {/* Prev / Next */}
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Communication précédente"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background/90 text-foreground/70 shadow-sm backdrop-blur-sm transition-all hover:bg-background hover:text-foreground active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Communication suivante"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background/90 text-foreground/70 shadow-sm backdrop-blur-sm transition-all hover:bg-background hover:text-foreground active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Pagination dots */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5">
              {announcements.map((a, i) => (
                <button
                  key={a._id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Aller à la communication ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === index
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <AnnouncementModal announcement={selected} onClose={() => setSelected(null)} />
    </section>
  );
}