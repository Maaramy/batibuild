import { useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Sparkles, Star, TrendingUp, Gauge, FileArchive } from "lucide-react";
import { PlanViewerModal } from "@/components/plans/PlanViewerModal";
import { PlanCompareModal } from "@/components/plans/PlanCompareModal";
import { PlanEditModal } from "@/components/plans/PlanEditModal";
import { exportAllPlansZip } from "@/lib/planExport";
import { runBIMEstimation } from "@/convex/bimEngine";
import { generatePlans } from "@/convex/planEngine";
import type { PlanRequest, GeneratedPlan } from "@/convex/planEngine";
import { bienTypeLabel } from "@/convex/planEngine";
import { usePageSEO } from "@/hooks/use-page-seo";

const bimCategoryFor = (b: string): string => {
  const map: Record<string, string> = {
    appartement: "appartement", villa: "villa", maison: "maison",
    duplex: "maison", studio: "appartement", residence: "immeuble_residentiel",
    immeuble: "immeuble_residentiel", bureau: "bureau",
    local_commercial: "local_commercial", entrepot: "entrepot",
    mixte: "immeuble_residentiel", autre: "maison",
  };
  return map[b] ?? "maison";
};

const investTypeFor = (b: string): string => {
  const map: Record<string, string> = {
    appartement: "appartement", villa: "villa", maison: "maison",
    duplex: "duplex", studio: "studio", residence: "residence_touristique",
    immeuble: "immeuble", bureau: "bureau", local_commercial: "local_commercial",
    entrepot: "entrepot", mixte: "immeuble", autre: "maison",
  };
  return map[b] ?? "maison";
};

export default function PlanDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  usePageSEO({ title: "Plan architectural — BuildEase", description: "Consultation d'un plan architectural généré par IA." });

  const doc = useQuery(api.architecturalPlans.getPlan, id ? { planId: id as any } : "skip") as any;
  const toggleFavorite = useMutation(api.architecturalPlans.toggleFavorite);
  const regenerateOne = useMutation(api.architecturalPlans.regenerateOneVariant);
  const saveVersion = useMutation(api.architecturalPlans.saveNewVersion);

  const initialIndex = Math.max(0, (parseInt(params.get("v") || "1") || 1) - 1);
  const [index, setIndex] = useState(initialIndex);
  const [compareOpen, setCompareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const plans: GeneratedPlan[] | null = doc?.plans ?? null;
  const plan = plans?.[index] ?? null;
  const request: PlanRequest | null = doc?.request ?? null;

  const bim = useMemo<ReturnType<typeof runBIMEstimation> | null>(() => {
    if (!plan || !request) return null;
    try {
      return runBIMEstimation(
        bimCategoryFor(request.bienType),
        plan.stats.construite || request.surfaceCouverte,
        plan.levels,
        "tunis",
        request.standing === "premium" ? "premium" : request.standing === "economique" ? "economique" : "standard",
        {
          bedrooms: plan.stats.nbChambres,
          bathrooms: plan.stats.nbSdb,
          kitchens: plan.rooms.filter((r) => r.type === "cuisine").length,
          livingRooms: plan.rooms.filter((r) => r.type === "salon").length,
          garages: plan.rooms.filter((r) => r.type === "garage").length,
        },
      );
    } catch {
      return null;
    }
  }, [plan, request]);
  const costEstimate = bim?.costEstimate ?? null;

  const handleEditApply = async (newReq: PlanRequest, regenerateAll: boolean, editIndex?: number) => {
    if (!id) return;
    try {
      if (regenerateAll || editIndex == null) {
        // Régénère les 10 variantes et enregistre une nouvelle version
        const fresh = generatePlans({ ...newReq, seed: (newReq.seed ?? 2026) + 7 });
        await saveVersion({ planId: id as any, plans: fresh, request: newReq, selectedIndex: 1 });
        toast.success("10 propositions régénérées et enregistrées (nouvelle version)");
      } else {
        // Régénère uniquement la variante modifiée côté serveur
        await regenerateOne({ planId: id as any, variantIndex: editIndex + 1, request: newReq });
        toast.success("Plan modifié et régénéré");
      }
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Échec de la régénération");
    }
  };

  if (!doc) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!plan || !plans) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium">Plan introuvable</p>
          <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => navigate("/dashboard/plans")}>Retour</Button>
        </div>
      </main>
    );
  }

  const formatTND = (n: number) =>
    new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/30 bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 sm:min-h-14 sm:py-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/dashboard/plans")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{doc.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{bienTypeLabel(doc.bienType)} · {plan.stats.construite.toFixed(0)} m² · v{Array.isArray(doc.versions) ? doc.versions.length + 1 : 1}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {costEstimate && (
              <div className="hidden md:flex flex-col items-end mr-1">
                <span className="text-[9px] text-muted-foreground">Estimation coût</span>
                <span className="text-xs font-bold text-primary">{formatTND(costEstimate.totalCost)}</span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFavorite({ planId: doc._id })} title="Favori">
              <Star className={`h-4 w-4 ${doc.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 text-xs gap-1" onClick={() => setCompareOpen(true)} title="Comparer les plans">
              <Gauge className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Comparer</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 text-xs gap-1" onClick={async () => {
              try { await exportAllPlansZip(plans, doc.name); toast.success("Les 10 plans téléchargés (ZIP)"); }
              catch (e: any) { toast.error(e?.message || "Échec ZIP"); }
            }} title="Télécharger les 10 plans (ZIP)">
              <FileArchive className="h-3.5 w-3.5" /> <span className="hidden sm:inline">ZIP</span>
            </Button>
            <Button size="sm" className="h-8 px-2 sm:px-3 text-xs gap-1" onClick={() => navigate("/dashboard/investments", { state: { prefill: { name: doc.name, investmentType: investTypeFor(doc.bienType), area: plan.stats.utile, region: "tunis", monthlyRent: Math.round((costEstimate?.totalCost ?? 200000) * 0.0055), rentMode: "mensuel", rentAmount: Math.round((costEstimate?.totalCost ?? 200000) * 0.0055) } } })} title="Analyse de rentabilité">
              <TrendingUp className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Rentabilité</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Visionneuse plein écran */}
      <div className="h-[calc(100vh-56px)]">
        <PlanViewerModal
          plan={plan}
          plans={plans}
          index={index}
          onIndexChange={(i) => setIndex(i)}
          open
          onClose={() => navigate("/dashboard/plans")}
          favorite={doc.favorite}
          onToggleFavorite={() => toggleFavorite({ planId: doc._id })}
          onOpenEdit={() => setEditOpen(true)}
          request={request}
          bim={bim}
        />
      </div>

      <PlanCompareModal plans={plans} open={compareOpen} onClose={() => setCompareOpen(false)} onSelect={(p) => setIndex(p.index - 1)} />
      {request && editOpen && (
        <PlanEditModal
          plan={plan}
          request={request}
          index={index}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onApply={handleEditApply}
        />
      )}
    </main>
  );
}
