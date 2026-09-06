import {
  Info,
  Sparkles,
  AlertTriangle,
  Siren,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AnnouncementType =
  | "information"
  | "news"
  | "important"
  | "urgent"
  | "maintenance";

export type AnnouncementStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "expired"
  | "disabled";

export interface AnnouncementLike {
  _id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: number;
  imageUrl?: string;
  status: AnnouncementStatus;
  isActive: boolean;
  startDate?: number;
  endDate?: number;
  targetType?: "all" | "company" | "role" | "user";
  targetCompanyNames?: string[];
  targetRoles?: string[];
  targetUserIds?: string[];
  displayOrder?: number;
  createdBy?: string;
  authorName?: string;
  createdAt?: number;
  updatedAt?: number;
  resolvedStatus?: AnnouncementStatus;
}

export const ANNOUNCEMENT_TYPES = [
  "information",
  "news",
  "important",
  "urgent",
  "maintenance",
] as const;

export const TYPE_PRIORITY: Record<AnnouncementType, number> = {
  urgent: 5,
  important: 4,
  news: 3,
  maintenance: 2,
  information: 1,
};

export const ANNOUNCEMENT_TYPE_META: Record<
  AnnouncementType,
  {
    label: string;
    emoji: string;
    icon: LucideIcon;
    /** Tailwind classes for the badge pill */
    badge: string;
    /** Accent classes for the card (left bar + soft bg) */
    accent: string;
    chip: string;
  }
> = {
  information: {
    label: "Information",
    emoji: "🔵",
    icon: Info,
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400",
    accent: "border-l-blue-500",
    chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  news: {
    label: "Nouveauté",
    emoji: "🟢",
    icon: Sparkles,
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
    accent: "border-l-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  important: {
    label: "Important",
    emoji: "🟠",
    icon: AlertTriangle,
    badge: "bg-orange-500/10 text-orange-600 border-orange-500/25 dark:text-orange-400",
    accent: "border-l-orange-500",
    chip: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  urgent: {
    label: "Urgent",
    emoji: "🔴",
    icon: Siren,
    badge: "bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400",
    accent: "border-l-red-500",
    chip: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  maintenance: {
    label: "Maintenance",
    emoji: "🟣",
    icon: Wrench,
    badge: "bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400",
    accent: "border-l-violet-500",
    chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
};

export const ANNOUNCEMENT_STATUS_META: Record<
  AnnouncementStatus,
  { label: string; badge: string; dot: string }
> = {
  published: {
    label: "Publiée",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  scheduled: {
    label: "Programmée",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  draft: {
    label: "Brouillon",
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/50",
  },
  expired: {
    label: "Expirée",
    badge: "bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400",
    dot: "bg-red-500",
  },
  disabled: {
    label: "Désactivée",
    badge: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:text-zinc-400",
    dot: "bg-zinc-500",
  },
};

export function formatAnnouncementDate(ts?: number, withTime = false): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  } catch {
    return "—";
  }
}

export function authorName(a: AnnouncementLike): string {
  return a.authorName || "Équipe batibuild";
}