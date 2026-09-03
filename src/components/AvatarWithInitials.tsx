import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Displays the logo image if available, otherwise generates initials from the name.
 * For suppliers: companyName → initials
 * For experts: displayName → initials
 */
export function AvatarWithInitials({
  logo,
  name,
  size = "md",
  className,
}: {
  logo?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = logo && !imgError;
  const initials = getInitials(name);

  const sizeClasses = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-sm",
  };

  const colors = [
    "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20",
    "bg-amber-500/15 text-amber-700 ring-amber-500/20",
    "bg-blue-500/15 text-blue-700 ring-blue-500/20",
    "bg-violet-500/15 text-violet-700 ring-violet-500/20",
    "bg-rose-500/15 text-rose-700 ring-rose-500/20",
    "bg-cyan-500/15 text-cyan-700 ring-cyan-500/20",
  ];

  // Deterministic color based on name
  const colorIndex =
    name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    colors.length;

  if (showImage) {
    return (
      <div
        className={cn(
          // Full-bleed circular logo: the image fills the entire circle so no
          // background color shows around or behind it.
          "relative shrink-0 overflow-hidden rounded-full bg-white dark:bg-neutral-900",
          sizeClasses[size],
          className,
        )}
      >
        <img
          src={logo}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight ring-1",
        sizeClasses[size],
        colors[colorIndex],
        className,
      )}
      title={name}
    >
      {initials}
    </div>
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
