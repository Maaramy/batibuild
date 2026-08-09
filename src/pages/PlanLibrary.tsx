import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Sparkles, Star, Trash2, Copy, Download, History,
  RotateCcw, Search, Loader2, Crown,
  Box, Ruler, BedDouble, Bath, Check, X, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedPlan } from "@/convex/planEngine";
import { bienTypeLabel } from "@/convex/planEngine";
import { FloorPlan2D } from "@/components/plans/FloorPlanView";
import { exportPlanImage } from "@/lib/planExport";
import { usePageSEO } from "@/hooks/use-page-seo";

// ============================================================================
// Mes plans architecturaux — bibliothèque + historique des versions
// ============================================================================

type PlanSummary = {
  _id: string;
  name: string;
  bienType: string;
  favorite: boolean;
  selectedIndex: number;
  createdAt: number;
  updatedAt: number;
  preview: any;
  versionsCount: number;
};

type PlanDetail = {
  _id: string;
  name: string;
  bienType: string;
  request: any;
  plans: GeneratedPlan[];
  selectedIndex?: number;
  favorite?: boolean;
  versions?: { v: number; createdAt: number; plans: GeneratedPlan[] }[];
  createdAt: number;
  updatedAt: number;
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function PlanLibrary() {
  usePageSEO({ title: "Mes plans architecturaux — BuildEase", description: "Historique et gestion de vos plans architecturaux générés par IA." });
  const navigate = useNavigate();
  const plans = useQuery(api.architecturalPlans.getMyPlans) as PlanSummary[] | undefined;
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [versionsForId, setVersionsForId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const versionsDetail = useQuery(
    api.architecturalPlans.getPlan,
    versionsForId ? { planId: versionsForId as any } : "skip",
  ) as PlanDetail | null | undefined;

  const renamePlan = useMutation(api.architecturalPlans.renamePlan);
  const deletePlan = useMutation(api.architecturalPlans.deletePlan);
  const duplicatePlan = useMutation(api.architecturalPlans.duplicatePlan);
  const toggleFavorite = useMutation(api.architecturalPlans.toggleFavorite);
  const restoreVersion = useMutation(api.architecturalPlans.restoreVersion);

  const filtered = useMemo(() => {
    const list = plans ?? [];
    return list.filter((p) => {
      if (tab === "favorites" && !p.favorite) return false;
      if (search) return p.name.toLowerCase().includes(search.toLowerCase());
      return true;
    });
  }, [plans, tab, search]);

  const openPlan = (planId: string, index: number) => {
    navigate(`/dashboard/plans/${planId}?v=${index + 1}`);
  };

  const doRename = async (id: string) => {
    if (!newName.trim()) return;
    await renamePlan({ planId: id as any, name: newName.trim() });
    toast.success("Plan renommé");
    setRenaming(null);
    setNewName("");
  };

  const doDuplicate = async (id: string) => {
    try {
      await duplicatePlan({ planId: id as any });
      toast.success("Plan dupliqué");
    } catch (e: any) {
      toast.error(e?.message || "Échec");
    }
  };

  const doDelete = async (id: string) => {
    if (!confirm("Supprimer ce plan et tout son historique ?")) return;
    await deletePlan({ planId: id as any });
    toast.success("Plan supprimé");
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/30 bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Mes plans architecturaux</p>
              <p className="text-[10px] text-muted-foreground truncate">Historique, versions et téléchargements</p>
            </div>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={() => navigate("/dashboard/plans/new")}>
            <Plus className="h-3.5 w-3.5" /> Nouveau plan
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-5 space-y-4">
        {/* Barre d'outils */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="h-7 text-xs">Tous ({plans?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="favorites" className="h-7 text-xs">Favoris ({plans?.filter((p) => p.favorite).length ?? 0})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-8 h-9 text-xs" />
          </div>
        </div>

        {/* Grille */}
        {!plans ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">Aucun plan sauvegardé</p>
            <p className="text-xs text-muted-foreground mb-4">Générez vos 10 propositions architecturales par IA.</p>
            <Button size="sm" className="text-xs gap-1" onClick={() => navigate("/dashboard/plans/new")}>
              <Plus className="h-3.5 w-3.5" /> Générer un plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((p) => (
              <LibraryCard
                key={p._id}
                plan={p}
                onOpen={(idx) => openPlan(p._id, idx)}
                onRename={() => { setRenaming(p._id); setNewName(p.name); }}
                onDelete={() => doDelete(p._id)}
                onDuplicate={() => doDuplicate(p._id)}
                onFavorite={() => toggleFavorite({ planId: p._id as any })}
                onVersions={() => setVersionsForId(p._id)}
                renaming={renaming === p._id}
                newName={newName}
                setNewName={setNewName}
                onConfirmRename={() => doRename(p._id)}
                onCancelRename={() => setRenaming(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modale versions */}
      {versionsForId && versionsDetail && (
        <VersionsDialog
          plan={versionsDetail}
          open
          onClose={() => setVersionsForId(null)}
          onRestore={async (v) => {
            await restoreVersion({ planId: versionsForId as any, version: v });
            toast.success(`Version ${v} restaurée`);
            setVersionsForId(null);
          }}
        />
      )}
    </main>
  );
}

// ============================================================================
// Carte bibliothèque
// ============================================================================

function LibraryCard({ plan, onOpen, onRename, onDelete, onDuplicate, onFavorite, onVersions, renaming, newName, setNewName, onConfirmRename, onCancelRename }: {
  plan: PlanSummary;
  onOpen: (idx: number) => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFavorite: () => void;
  onVersions: () => void;
  renaming: boolean;
  newName: string;
  setNewName: (v: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const preview = plan.preview;

  return (
    <Card className="group overflow-hidden border border-border/40 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5">
      <div className="relative aspect-[4/3] overflow-hidden bg-white dark:bg-slate-100/90 cursor-pointer" onClick={() => onOpen(plan.selectedIndex - 1)}>
        {preview ? (
          <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
            <FloorPlan2D
              plan={{
                ...preview,
                index: preview.index,
                name: plan.name,
                key: "saved",
                levels: Math.max(1, Math.round((plan.preview?.depth ?? 5) / 5)),
                description: "",
                strengths: [],
                weaknesses: [],
                alerts: { incompatible: false, messages: [] },
                scores: preview.scores,
                stats: preview.stats,
              } as GeneratedPlan}
              compact
              showDimensions={false}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Box className="h-8 w-8" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <Badge className="bg-slate-900/85 text-white border-0 text-[9px]">{bienTypeLabel(plan.bienType)}</Badge>
          {plan.favorite && <Badge className="bg-amber-400 text-black border-0 text-[9px]"><Star className="h-2.5 w-2.5 fill-current" /></Badge>}
        </div>
        {plan.versionsCount > 0 && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-[8px] gap-0.5">
            <History className="h-2.5 w-2.5" /> v{plan.versionsCount + 1}
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        {renaming ? (
          <div className="flex items-center gap-1.5">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-7 text-xs" autoFocus onKeyDown={(e) => { if (e.key === "Enter") onConfirmRename(); if (e.key === "Escape") onCancelRename(); }} />
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onConfirmRename}><Check className="h-3.5 w-3.5 text-emerald-500" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCancelRename}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <p className="text-xs font-bold truncate">{plan.name}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-[10px] text-muted-foreground">
          {preview?.stats && (
            <>
              <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {preview.stats.construite.toFixed(0)} m²</span>
              <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {preview.stats.nbChambres} ch</span>
              <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {preview.stats.nbSdb} sdb</span>
              <span className="flex items-center gap-1 text-violet-600"><Crown className="h-3 w-3" /> {preview.scores.global}/100</span>
            </>
          )}
          <span className="ml-auto text-muted-foreground/60">{formatDate(plan.updatedAt)}</span>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          <Button size="sm" className="h-7 flex-1 text-[10px] gap-1" onClick={() => onOpen(plan.selectedIndex - 1)}>
            <Sparkles className="h-3 w-3" /> Ouvrir
          </Button>
          <Button
            size="sm" variant="outline" className="h-7 px-2 text-[10px]" title="Télécharger" disabled={downloading || !preview}
            onClick={async () => {
              if (!preview) return;
              setDownloading(true);
              try {
                await exportPlanImage(preview as GeneratedPlan, { format: "png", scale: 2 });
                toast.success("Plan téléchargé (PNG)");
              } catch (e: any) { toast.error(e?.message || "Erreur"); }
              setDownloading(false);
            }}
          >
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" title="Historique des versions" onClick={onVersions}>
            <History className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" title="Dupliquer" onClick={onDuplicate}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" title="Favori" onClick={onFavorite}>
            <Star className={cn("h-3 w-3", plan.favorite ? "fill-amber-400 text-amber-400" : "")} />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" title="Renommer" onClick={onRename}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-destructive" title="Supprimer" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Modale d'historique des versions
// ============================================================================

function VersionsDialog({ plan, open, onClose, onRestore }: {
  plan: PlanDetail;
  open: boolean;
  onClose: () => void;
  onRestore: (version: number) => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const versions = plan.versions ?? [];
  const currentV = versions.length ? versions[versions.length - 1].v : 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Historique — {plan.name}</DialogTitle>
          <DialogDescription className="text-xs">Restaurez une ancienne version du plan. La restauration crée une nouvelle version (l'historique reste intact).</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {[...versions].reverse().map((ver) => {
            const isCurrent = ver.v === currentV;
            return (
              <div key={ver.v} className={cn("flex items-center gap-3 rounded-xl border p-3", isCurrent ? "border-primary/40 bg-primary/5" : "border-border/40")}>
                <div className="w-16 shrink-0">
                  <Badge variant={isCurrent ? "default" : "secondary"} className="text-[9px]">
                    v{ver.v}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium">
                    {formatDate(ver.createdAt)} — {ver.plans?.length ?? 0} plans
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">
                    {isCurrent ? "Version actuelle" : ver.plans?.[0]?.name ? `Aperçu : ${ver.plans[0].name}` : ""}
                  </p>
                </div>
                {!isCurrent && (
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                    disabled={busy != null}
                    onClick={async () => { setBusy(ver.v); await onRestore(ver.v); setBusy(null); }}
                  >
                    {busy === ver.v ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Restaurer
                  </Button>
                )}
              </div>
            );
          })}
          {versions.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Aucune version enregistrée.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
