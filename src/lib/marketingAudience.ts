// ============================================================================
// AUDIENCES DES CAMPAGNES MARKETING
// ----------------------------------------------------------------------------
// Définitions partagées entre l'interface admin et le serveur. Les compteurs
// affichés sont TOUJOURS calculés côté serveur (`marketing.previewAudience`) :
// l'interface ne devine jamais un nombre de destinataires.
// ============================================================================

export type MarketingSegmentId =
  | "client_pro_all"
  | "client_pro_active"
  | "client_pro_inactive"
  | "expert_all"
  | "expert_active"
  | "expert_inactive"
  | "supplier_all"
  | "supplier_active"
  | "supplier_inactive";

export type MarketingSegment = {
  id: MarketingSegmentId;
  label: string;
  shortLabel: string;
};

export const MARKETING_SEGMENTS: MarketingSegment[] = [
  { id: "client_pro_all", label: "Tous les Clients Pro", shortLabel: "Tous" },
  { id: "client_pro_active", label: "Clients Pro actifs", shortLabel: "Actifs" },
  { id: "client_pro_inactive", label: "Clients Pro inactifs", shortLabel: "Inactifs" },
  { id: "expert_all", label: "Tous les Experts", shortLabel: "Tous" },
  { id: "expert_active", label: "Experts actifs", shortLabel: "Actifs" },
  { id: "expert_inactive", label: "Experts inactifs", shortLabel: "Inactifs" },
  { id: "supplier_all", label: "Tous les Fournisseurs", shortLabel: "Tous" },
  { id: "supplier_active", label: "Fournisseurs actifs", shortLabel: "Actifs" },
  { id: "supplier_inactive", label: "Fournisseurs inactifs", shortLabel: "Inactifs" },
];

export const SEGMENT_IDS: string[] = MARKETING_SEGMENTS.map((s) => s.id);

export function segmentsForCategory(
  category: "client_pro" | "expert" | "supplier",
): MarketingSegment[] {
  const prefix =
    category === "client_pro" ? "client_pro" : category === "expert" ? "expert" : "supplier";
  return MARKETING_SEGMENTS.filter((s) => s.id.startsWith(prefix));
}

export function segmentLabel(id: string): string {
  return MARKETING_SEGMENTS.find((s) => s.id === id)?.label ?? id;
}

export const DEFAULT_SEGMENT_FOR_CATEGORY: Record<
  "client_pro" | "expert" | "supplier",
  MarketingSegmentId
> = {
  client_pro: "client_pro_all",
  expert: "expert_all",
  supplier: "supplier_all",
};
