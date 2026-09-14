// ============================================================================
// Forum d'Assistance — métadonnées partagées côté client
//
// ⚠️ Ce module doit rester SANS dépendance (aucun import) : il est importé par
// les pages du navigateur. Les libellés traduits vivent dans le namespace i18n
// « forum » ; ici on ne déclare que les codes et les styles.
// ============================================================================

export type ForumRequestType = "intervention" | "consultation" | "material_price";
export type ForumAudience = "public" | "experts" | "suppliers";
export type ForumStatusKey = "open" | "in_progress" | "resolved";
export type ForumSortKey = "recent" | "oldest" | "most_replies" | "last_activity";

export const FORUM_REQUEST_TYPES: ForumRequestType[] = [
  "intervention",
  "consultation",
  "material_price",
];

export const FORUM_AUDIENCES: ForumAudience[] = [
  "public",
  "experts",
  "suppliers",
];

export const FORUM_STATUSES: ForumStatusKey[] = [
  "open",
  "in_progress",
  "resolved",
];

export const FORUM_SORTS: ForumSortKey[] = [
  "recent",
  "oldest",
  "most_replies",
  "last_activity",
];

/** Spécialités proposées pour une demande d'intervention. */
export const INTERVENTION_SPECIALTIES = [
  "plomberie",
  "electricite",
  "maconnerie",
  "peinture",
  "climatisation",
  "menuiserie",
  "etancheite",
  "carrelage",
  "aluminium",
  "toiture",
  "serrurerie",
  "terrassement",
  "isolation",
  "demolition",
] as const;

/** Spécialités proposées pour une consultation d'expert. */
export const CONSULTATION_SPECIALTIES = [
  "architecte",
  "ingenieur",
  "geometre",
  "economiste_construction",
  "expert_immobilier",
  "expert_technique",
  "bureau_etudes",
  "moe",
  "opc",
] as const;

/** Catégories de matériaux proposées pour une demande de prix. */
export const FORUM_MATERIAL_CATEGORIES = [
  "beton",
  "ciment",
  "acier",
  "carrelage",
  "peinture",
  "isolation",
  "menuiserie",
  "sanitaire",
  "electricite",
  "briques",
  "sable_gravier",
  "plomberie",
  "toiture",
  "etancheite",
  "climatisation",
  "quincaillerie",
  "divers",
] as const;

export const FORUM_MAX_FILES = 5;
export const FORUM_MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Formats acceptés (images, PDF, documents, tableurs). */
export const FORUM_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.dwg";

export const FORUM_ALLOWED_MIME_PREFIXES = ["image/"];
export const FORUM_ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/acad",
  "image/vnd.dwg",
];

/** Style de badge par statut (couleurs du design system BatiBuild). */
export const FORUM_STATUS_STYLE: Record<
  ForumStatusKey,
  { badge: string; dot: string }
> = {
  open: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  in_progress: {
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  resolved: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

/** Style de badge par type de demande (couleurs distinctes, cohérentes). */
export const FORUM_TYPE_STYLE: Record<ForumRequestType, string> = {
  intervention:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  consultation:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  material_price:
    "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
};

/** Style de badge par audience. */
export const FORUM_AUDIENCE_STYLE: Record<ForumAudience, string> = {
  public: "border-border/50 bg-muted/40 text-muted-foreground",
  experts:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  suppliers:
    "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400",
};

export function isImageAttachment(type?: string | null): boolean {
  return typeof type === "string" && type.startsWith("image/");
}

/** Taille lisible (Ko / Mo). */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Initiales d'un nom (2 lettres max), utilisées par les avatars. */
export function initialsOf(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Date courte localisée (jj mois aaaa). */
export function formatForumDate(ts: number, locale = "fr"): string {
  try {
    return new Date(ts).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return new Date(ts).toLocaleDateString("fr-FR");
  }
}

/** Date + heure localisées. */
export function formatForumDateTime(ts: number, locale = "fr"): string {
  try {
    return new Date(ts).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(ts).toLocaleString("fr-FR");
  }
}

/** Statut de l'analyse/format d'erreur affiché à l'utilisateur. */
export function isAllowedForumFile(file: File): boolean {
  if (FORUM_ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) return true;
  if (FORUM_ALLOWED_MIME.includes(file.type)) return true;
  // Certains navigateurs ne renseignent pas le type (DWG, DOCX anciens).
  if (!file.type) return true;
  return false;
}

/** « il y a X » — utilisé dans les listes pour situer l'activité. */
export function relativeTimeFrom(ts: number, now = Date.now()): {
  minutes: number;
  hours: number;
  days: number;
} {
  const diff = Math.max(0, now - ts);
  const minutes = Math.floor(diff / 60000);
  return {
    minutes,
    hours: Math.floor(minutes / 60),
    days: Math.floor(minutes / 1440),
  };
}
