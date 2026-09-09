import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from "../../../src/convex/projectTypes";

// ============================================================================
// Catalogue réutilisé depuis le projet Web (source de vérité : src/convex/)
// - PROJECT_TYPES / PROJECT_TYPE_LABELS : importés directement depuis le Web
// - Régions : copie de src/convex/schema.ts (non importable côté client
//   car ce fichier exécute defineSchema()).
// ============================================================================

export const projectTypes = PROJECT_TYPES;
export const projectTypeLabels = PROJECT_TYPE_LABELS as Record<string, string>;

export const projectTypeOptions = PROJECT_TYPES.map((t) => ({
  value: t,
  label: PROJECT_TYPE_LABELS[t] ?? t,
}));

export const REGIONS: { value: string; label: string }[] = [
  { value: "tunis", label: "Tunis" },
  { value: "ariana", label: "Ariana" },
  { value: "ben_arous", label: "Ben Arous" },
  { value: "manouba", label: "Manouba" },
  { value: "nabeul", label: "Nabeul" },
  { value: "zaghouan", label: "Zaghouan" },
  { value: "bizerte", label: "Bizerte" },
  { value: "beja", label: "Béja" },
  { value: "jendouba", label: "Jendouba" },
  { value: "le_kef", label: "Le Kef" },
  { value: "siliana", label: "Siliana" },
  { value: "kairouan", label: "Kairouan" },
  { value: "kasserine", label: "Kasserine" },
  { value: "sidi_bouzid", label: "Sidi Bouzid" },
  { value: "sousse", label: "Sousse" },
  { value: "monastir", label: "Monastir" },
  { value: "mahdia", label: "Mahdia" },
  { value: "sfax", label: "Sfax" },
  { value: "gabes", label: "Gabès" },
  { value: "medenine", label: "Médenine" },
  { value: "tataouine", label: "Tataouine" },
  { value: "gafsa", label: "Gafsa" },
  { value: "tozeur", label: "Tozeur" },
  { value: "kebili", label: "Kébili" },
];

export function regionLabel(value?: string | null): string {
  if (!value) return "—";
  return REGIONS.find((r) => r.value === value)?.label ?? value;
}

export function projectTypeLabel(value?: string | null): string {
  if (!value) return "—";
  return projectTypeLabels[value] ?? value;
}

export type ProjectStatus = "draft" | "analyzing" | "completed" | "archived";

export const STATUS_META: Record<
  ProjectStatus,
  { labelKey: string; color: string; bg: string; dot: string }
> = {
  draft: { labelKey: "projects.status.draft", color: "#B45309", bg: "#FFFBEB", dot: "#F59E0B" },
  analyzing: { labelKey: "projects.status.analyzing", color: "#1D4ED8", bg: "#EFF6FF", dot: "#3B82F6" },
  completed: { labelKey: "projects.status.completed", color: "#047857", bg: "#ECFDF5", dot: "#10B981" },
  archived: { labelKey: "projects.status.archived", color: "#475569", bg: "#F1F5F9", dot: "#64748B" },
};

export const budgetScenarioOrder = ["economique", "standard", "premium"] as const;

export type BudgetScenarioKey = (typeof budgetScenarioOrder)[number];