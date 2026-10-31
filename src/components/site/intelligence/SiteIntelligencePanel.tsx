// ============================================================================
// BatiBuild AI SITE INTELLIGENCE — espace de travail du chantier
// ----------------------------------------------------------------------------
// Sept sous-sections, toutes adossées à la même requête serveur : le module
// n'a pas de base propre et ne duplique aucune donnée du chantier. Si aucun
// fournisseur IA n'est configuré, l'interface l'annonce et propose uniquement
// le mode démonstration, clairement identifié.
// ============================================================================

import { useState } from "react";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  BrainCircuit,
  Camera,
  CheckSquare,
  FileText,
  GitCompareArrows,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AI_DISCLAIMER } from "@/lib/siteIntelligence";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AI_SECTIONS, type AiSection } from "./types";
import { AiDashboardSection } from "./AiDashboardSection";
import { AiPhotoSection } from "./AiPhotoSection";
import { AiProgressSection } from "./AiProgressSection";
import { AiPlanningSection } from "./AiPlanningSection";
import { AiAnomalySection } from "./AiAnomalySection";
import { AiPredictionSection } from "./AiPredictionSection";
import { AiReportsSection } from "./AiReportsSection";

const SECTION_ICONS: Record<AiSection, typeof BrainCircuit> = {
  dashboard: BrainCircuit,
  photos: Camera,
  progress: TrendingUp,
  planning: GitCompareArrows,
  anomalies: AlertTriangle,
  predictions: Sparkles,
  reports: FileText,
};

export function SiteIntelligencePanel({ siteId }: { siteId: Id<"siteProjects"> }) {
  const data = useQuery(api.siteIntelligence.getAiWorkspace, { siteId });
  const [section, setSection] = useState<AiSection>("dashboard");

  if (data === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (data === null) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <BrainCircuit className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Intelligence de chantier indisponible</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vérifiez que la cotisation du module est active et que votre accès à ce chantier
            inclut la permission « Intelligence IA ».
          </p>
        </CardContent>
      </Card>
    );
  }

  const providerBadge = data.provider.available ? (
    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 text-[10px] text-emerald-700">
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Fournisseur IA connecté
    </Badge>
  ) : (
    <Badge variant="outline" className="border-amber-500/40 bg-amber-50 text-[10px] text-amber-700">
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
      Analyse d'images non configurée
    </Badge>
  );

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold sm:text-base">AI Site Intelligence</h3>
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                Photos datées → avancement mesuré, anomalies, prévisions et rapports. Aucun taux
                validé n'est modifié par l'IA sans votre accord.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {providerBadge}
            {data.metrics.monitoringSessions > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {data.metrics.monitoringSessions} session(s) photo
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {AI_SECTIONS.map((item) => {
          const Icon = SECTION_ICONS[item.key];
          const active = section === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors sm:text-xs",
                active
                  ? "border-emerald-500/50 bg-emerald-600 text-white shadow-sm"
                  : "border-border/60 bg-card text-muted-foreground hover:border-emerald-400/50 hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.short}</span>
              {item.key === "anomalies" && data.metrics.openAnomalies > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 text-[9px] font-semibold",
                    active ? "bg-white/20" : "bg-rose-100 text-rose-700",
                  )}
                >
                  {data.metrics.openAnomalies}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {section === "dashboard" && <AiDashboardSection data={data} onNavigate={setSection} />}
      {section === "photos" && <AiPhotoSection data={data} siteId={siteId} />}
      {section === "progress" && <AiProgressSection data={data} siteId={siteId} />}
      {section === "planning" && <AiPlanningSection data={data} />}
      {section === "anomalies" && <AiAnomalySection data={data} siteId={siteId} />}
      {section === "predictions" && <AiPredictionSection data={data} />}
      {section === "reports" && <AiReportsSection data={data} siteId={siteId} />}

      <p className="flex items-start gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
        <CheckSquare className="mt-0.5 h-3 w-3 shrink-0" />
        <span>{AI_DISCLAIMER}</span>
      </p>
    </div>
  );
}

/** État d'erreur générique réutilisé par les sous-sections. */
export function AiLoading({ label = "Chargement de l'intelligence de chantier…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}
