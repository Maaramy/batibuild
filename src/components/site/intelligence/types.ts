import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

/** Charge utile complète de l'espace de travail IA (une seule requête). */
export type AiWorkspace = NonNullable<FunctionReturnType<typeof api.siteIntelligence.getAiWorkspace>>;

export type AiSection =
  | "dashboard"
  | "photos"
  | "progress"
  | "planning"
  | "anomalies"
  | "predictions"
  | "reports";

export const AI_SECTIONS: { key: AiSection; label: string; short: string }[] = [
  { key: "dashboard", label: "Tableau de bord intelligent", short: "Tableau de bord" },
  { key: "photos", label: "Analyse des photos", short: "Photos" },
  { key: "progress", label: "Suivi de l'avancement", short: "Avancement" },
  { key: "planning", label: "Planning / Réalisation", short: "Planning" },
  { key: "anomalies", label: "Détection des anomalies", short: "Anomalies" },
  { key: "predictions", label: "Alertes & prédictions IA", short: "Prédictions" },
  { key: "reports", label: "Rapports intelligents", short: "Rapports" },
];

export function canValidateAi(data: AiWorkspace): boolean {
  return data.isOwner || data.permissions.includes("quality");
}

export function canWriteAi(data: AiWorkspace): boolean {
  return data.isOwner || data.permissions.includes("ai");
}

export function canSeeBudgetAi(data: AiWorkspace): boolean {
  return data.metrics.budget != null;
}
