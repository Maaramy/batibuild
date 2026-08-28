import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  max?: number;
  count?: number;
  size?: "xs" | "sm" | "md";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const SIZE_MAP = {
  xs: { star: "h-3 w-3", text: "text-[10px]" },
  sm: { star: "h-3.5 w-3.5", text: "text-[11px]" },
  md: { star: "h-4 w-4", text: "text-xs" },
};

export function StarRating({
  value,
  max = 5,
  count,
  size = "sm",
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const s = SIZE_MAP[size];
  const display = interactive && hover > 0 ? hover : value;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }, (_, i) => {
          const rating = i + 1;
          const filled = rating <= Math.floor(display);
          const half = !filled && rating - 0.5 <= display;
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange?.(rating)}
              onMouseEnter={() => interactive && setHover(rating)}
              onMouseLeave={() => interactive && setHover(0)}
              className={cn(
                "p-0 border-0 bg-transparent",
                interactive && "cursor-pointer hover:scale-110 transition-transform",
                !interactive && "cursor-default",
              )}
            >
              <Star
                className={cn(
                  s.star,
                  "transition-colors",
                  filled
                    ? "fill-amber-400 text-amber-400"
                    : half
                      ? "fill-amber-400/50 text-amber-400"
                      : "fill-muted/30 text-muted-foreground/40",
                )}
              />
            </button>
          );
        })}
      </div>
      <span className={cn("font-semibold tabular-nums text-muted-foreground", s.text)}>
        {value > 0 ? value.toFixed(1) : "—"}
      </span>
      {count !== undefined && count > 0 && (
        <span className={cn("text-muted-foreground/60", s.text)}>
          ({count})
        </span>
      )}
    </div>
  );
}
