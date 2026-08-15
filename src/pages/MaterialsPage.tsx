import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useState, useMemo } from "react";
import {
  ArrowLeft, Search, HardHat, RefreshCw, Loader2,
  Database, Eye, BadgeCheck, FileText, ShieldCheck,
  Package, Truck, CheckCircle2, AlertTriangle, CalendarDays, Info, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  MATERIAL_CATEGORY_2026,
  MATERIAL_CATEGORY_LABELS,
  normalizeMaterialCategory,
} from "@/convex/bimEngine";

// ── Références consolidées (feuille Excel « Base de données des matériaux – Tunisie 2026 », v. 14/08/2026) ──
// refs / observed / published / estimated / withPrice sont calculés EN DIRECT
// depuis la base materialPrices (« prix en direct ») : toute référence chargée
// ou prix modifié dans le panneau admin est reflété immédiatement. Seuls la
// version de la feuille et le nombre de fournisseurs recensés restent statiques.
const SHEET_STATS = {
  suppliers: 88,
  version: "14 août 2026",
};

const QUALITY_ROWS = [
  { status: "Observé en ligne", quality: "observé_en_ligne" as const, icon: Eye, color: "text-emerald-600 bg-emerald-500/10" },
  { status: "Publication 2026", quality: "publication_2026" as const, icon: FileText, color: "text-sky-600 bg-sky-500/10" },
  { status: "Estimation indicative", quality: "estimation_indicative" as const, icon: BadgeCheck, color: "text-amber-600 bg-amber-500/10" },
];

const USAGE_NOTES = [
  "Les prix promotionnels d'avril 2026 sont archivés et doivent être réactualisés.",
  "Les fourchettes estimées servent au budget, jamais à un engagement contractuel.",
  "Le transport est généralement exclu.",
  "Modifier la TVA et les hypothèses dans Paramètres.",
  "Obtenir ≥ 3 devis avant validation.",
];

const QUALITY_BADGE: Record<string, { label: string; cls: string }> = {
  observé_en_ligne: { label: "Observé en ligne", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  publication_2026: { label: "Publication 2026", cls: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  estimation_indicative: { label: "Estimation indicative", cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

const PALETTE = [
  "from-blue-500/10 to-blue-500/5 text-blue-600",
  "from-emerald-500/10 to-emerald-500/5 text-emerald-600",
  "from-amber-500/10 to-amber-500/5 text-amber-600",
  "from-rose-500/10 to-rose-500/5 text-rose-600",
  "from-violet-500/10 to-violet-500/5 text-violet-600",
  "from-sky-500/10 to-sky-500/5 text-sky-600",
  "from-stone-500/10 to-stone-500/5 text-stone-600",
  "from-cyan-500/10 to-cyan-500/5 text-cyan-600",
];

const fmt = (n: number) => new Intl.NumberFormat("fr-TN", {
  style: "currency", currency: "TND", maximumFractionDigits: 3,
}).format(n);

const fmtInt = (n: number) => new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 }).format(n);

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export default function MaterialsPage() {
  usePageSEO({ title: "Prix des matériaux 2026 - batibuild App", description: "Base de données des matériaux de construction en Tunisie 2026 : 491 références, prix observés et estimations indicatives." });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const materialPrices = useQuery(api.materials.getMaterialPrices, {}) || [];
  const categoryStats = useQuery(api.materials.getMaterialCategories) || [];

  // Prix en direct : statistiques consolidées calculées depuis la base
  const liveStats = useMemo(() => {
    const byQuality: Record<string, number> = {};
    for (const m of materialPrices) {
      if (m.priceQuality) {
        byQuality[m.priceQuality] = (byQuality[m.priceQuality] ?? 0) + 1;
      }
    }
    const refs = materialPrices.length;
    return {
      refs,
      observed: byQuality["observé_en_ligne"] ?? 0,
      published: byQuality["publication_2026"] ?? 0,
      estimated: byQuality["estimation_indicative"] ?? 0,
      withPrice: refs > 0 ? 100 : 0,
      "observé_en_ligne": byQuality["observé_en_ligne"] ?? 0,
      "publication_2026": byQuality["publication_2026"] ?? 0,
      "estimation_indicative": byQuality["estimation_indicative"] ?? 0,
    };
  }, [materialPrices]);
  const refreshPrices = useMutation(api.materials.refreshMaterialPrices);
  const resetPrices = useMutation(api.materials.resetMaterialPrices);

  const isAdmin = user?.role === "admin";
  const [resetting, setResetting] = useState(false);

  const handleRefreshPrices = async () => {
    if (!isAdmin) return;
    setRefreshing(true);
    try {
      const result = await refreshPrices();
      toast.success(`${result.updated} / ${result.total} prix mis à jour avec les fluctuations du marché`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
    setRefreshing(false);
  };

  const handleResetCatalog = async () => {
    if (!isAdmin) return;
    setResetting(true);
    try {
      const result = await resetPrices();
      toast.success(`Catalogue 2026 chargé : ${result.seeded} références (${result.deleted} anciennes supprimées)`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la réinitialisation");
    }
    setResetting(false);
  };

  const statsByCategory = useMemo(() => {
    const map: Record<string, any> = {};
    for (const s of categoryStats) {
      const normalized = normalizeMaterialCategory(s.category);
      const cur = map[normalized] || { count: 0, observed: 0, confident: 0, avgPrice: 0 };
      map[normalized] = {
        count: cur.count + s.count,
        observed: cur.observed + s.observed,
        confident: cur.confident + s.confident,
        avgPrice: cur.avgPrice + s.avgPrice * s.count,
      };
    }
    for (const key of Object.keys(map)) {
      map[key].avgPrice = map[key].count > 0 ? map[key].avgPrice / map[key].count : 0;
    }
    return map;
  }, [categoryStats]);

  // Normalisation des catégories legacy vers les catégories officielles 2026
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const m of materialPrices) {
      const key = normalizeMaterialCategory(m.category);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [materialPrices]);

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return materialPrices.filter((m: any) => {
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || (m.subcategory || "").toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === "all" || normalizeMaterialCategory(m.category) === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [materialPrices, searchQuery, activeCategory]);

  const activeFilteredGrouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const m of filteredMaterials) {
      const key = normalizeMaterialCategory(m.category);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [filteredMaterials]);

  const officialCategories = MATERIAL_CATEGORY_2026.map((c) => ({
    ...c,
    db: statsByCategory[c.slug],
  }));
  const extraCategories = Object.keys(grouped).filter(
    (k) => !MATERIAL_CATEGORY_LABELS[k] && k !== "equipements",
  );

  const totalRefs = officialCategories.reduce((s, c) => s + c.refs, 0);
  const totalObserved = officialCategories.reduce((s, c) => s + c.observed, 0);
  const totalAvgWeighted = officialCategories.reduce((s, c) => s + c.avgPrice * c.refs, 0) / Math.max(1, totalRefs);

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.02] via-background to-background pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border/50 shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                <Database className="h-3.5 w-3.5" />
              </div>
              <div>
                <h1 className="text-sm font-semibold truncate">Matériaux de construction – Tunisie 2026</h1>
                <p className="text-[9px] text-muted-foreground leading-tight">Périmètre national · Prix TND · Relevés datés</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={resetting}
                    >
                      {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                      Charger le catalogue 2026
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Réinitialiser la base des prix ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action supprime toutes les références existantes (et leur historique de prix),
                        puis charge le catalogue officiel 2026 ({fmtInt(liveStats.refs)} références consolidées).
                        Les anciennes références (main-d'œuvre, transport, engins…) seront remplacées. Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetCatalog} disabled={resetting}>
                        {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                        Oui, charger le catalogue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs border-emerald-200/60 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                  disabled={refreshing}
                  onClick={handleRefreshPrices}
                >
                  {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Mise à jour
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ── Hero : version consolidée ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-900/20 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white p-5 sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 blueprint-grid opacity-40" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Base de données officielle · Version du {SHEET_STATS.version}
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              Base de données des matériaux de construction
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              Périmètre national · Prix TND · Relevés datés et niveaux de confiance.
              Une base « complète » reste dynamique : nouveaux SKU, stocks, promotions et tarifs sont historisés plutôt qu'écrasés.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="gap-1.5 border-emerald-400/30 bg-white/10 text-emerald-50 py-1.5 px-3">
                <Package className="h-3 w-3" /> {fmtInt(liveStats.refs)} références matériaux
              </Badge>
              <Badge className="gap-1.5 border-emerald-400/30 bg-white/10 text-emerald-50 py-1.5 px-3">
                <Eye className="h-3 w-3" /> {fmtInt(liveStats.observed)} prix observés
              </Badge>
              <Badge className="gap-1.5 border-emerald-400/30 bg-white/10 text-emerald-50 py-1.5 px-3">
                <Truck className="h-3 w-3" /> {fmtInt(SHEET_STATS.suppliers)} fournisseurs recensés
              </Badge>
              <Badge className="gap-1.5 border-emerald-400/30 bg-white/10 text-emerald-50 py-1.5 px-3">
                <CheckCircle2 className="h-3 w-3" /> {liveStats.withPrice}% références avec prix
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* ── Statistiques consolidées ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { icon: Package, label: "Références matériaux", value: fmtInt(liveStats.refs), hint: "Base consolidée", color: "from-blue-500/10 to-blue-500/5 text-blue-600" },
            { icon: Eye, label: "Prix observés", value: fmtInt(liveStats.observed), hint: "Relevés en ligne", color: "from-emerald-500/10 to-emerald-500/5 text-emerald-600" },
            { icon: Truck, label: "Fournisseurs recensés", value: fmtInt(SHEET_STATS.suppliers), hint: "Fabricants & distributeurs", color: "from-violet-500/10 to-violet-500/5 text-violet-600" },
            { icon: CheckCircle2, label: "Références avec prix", value: `${liveStats.withPrice}%`, hint: "Couverture totale", color: "from-amber-500/10 to-amber-500/5 text-amber-600" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-background to-muted/20 border border-border/30">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br", s.color)}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground/70 leading-tight">{s.label}</p>
                <p className="text-base sm:text-lg font-extrabold tabular-nums leading-tight">{s.value}</p>
                <p className="text-[9px] text-muted-foreground/50 leading-tight">{s.hint}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Qualité du prix + Rappels d'usage ── */}
        <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
          <Card className="lg:col-span-2 border border-border/40 overflow-hidden rounded-xl">
            <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Qualité du prix</CardTitle>
                  <CardDescription className="text-[10px]">Niveau de confiance des {fmtInt(liveStats.refs)} références</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-2">
              {QUALITY_ROWS.map((row) => (
                <div key={row.status} className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-muted/10 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", row.color)}>
                      <row.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-medium truncate">{row.status}</span>
                  </div>
                  <span className="text-sm font-extrabold tabular-nums">{fmtInt(liveStats[row.quality] ?? 0)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-3.5 py-2.5">
                <span className="text-xs font-semibold">Total des références</span>
                <span className="text-sm font-extrabold tabular-nums">{fmtInt(liveStats.refs)}</span>
              </div>
              <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground pt-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Les prix observés en ligne et les publications 2026 bénéficient d'une confiance élevée ; les estimations indicatives servent de fourchettes budgétaires.
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border border-border/40 overflow-hidden rounded-xl">
            <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Rappels d'usage</CardTitle>
                  <CardDescription className="text-[10px]">Bonnes pratiques avant validation d'un devis</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <ul className="space-y-2">
                {USAGE_NOTES.map((note, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-muted/10 px-3 py-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-xs text-muted-foreground leading-relaxed">{note}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* ── Couverture par catégorie ── */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Couverture par catégorie</CardTitle>
                  <CardDescription className="text-[10px]">
                    {officialCategories.length} catégories · {fmtInt(totalRefs)} références · {fmtInt(totalObserved)} observées · prix moyen pondéré {fmt(totalAvgWeighted)}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/20 text-left">
                    <th className="py-2.5 px-4 font-medium text-muted-foreground">Catégorie</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-right">Références</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-right hidden sm:table-cell">Observées</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-right hidden md:table-cell">Confiance élevée</th>
                    <th className="py-2.5 px-3 font-medium text-muted-foreground text-right">Prix moyen TTC</th>
                    <th className="py-2.5 px-4 font-medium text-muted-foreground text-right hidden lg:table-cell">En base</th>
                  </tr>
                </thead>
                <tbody>
                  {officialCategories.map((c) => {
                    const dbCount = c.db?.count || 0;
                    const coverage = c.refs > 0 ? Math.min(100, Math.round((dbCount / c.refs) * 100)) : 0;
                    return (
                      <tr
                        key={c.slug}
                        onClick={() => setActiveCategory(c.slug)}
                        className={cn(
                          "border-b border-border/5 cursor-pointer transition-colors",
                          activeCategory === c.slug ? "bg-primary/5" : "hover:bg-muted/10",
                        )}
                      >
                        <td className="py-2.5 px-4">
                          <button className="font-medium text-left hover:text-primary transition-colors">{c.label}</button>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <span className="font-semibold">{c.refs}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                          <span className={cn("tabular-nums", c.observed > 0 ? "text-emerald-600" : "text-muted-foreground/60")}>
                            {c.observed}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right hidden md:table-cell">
                          <span className={cn("tabular-nums", c.confident > 0 ? "text-sky-600" : "text-muted-foreground/60")}>
                            {c.confident}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmt(c.avgPrice)}</td>
                        <td className="py-2.5 px-4 hidden lg:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-muted/40 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", coverage >= 80 ? "bg-emerald-500" : coverage >= 40 ? "bg-amber-500" : "bg-rose-400")}
                                style={{ width: `${coverage}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                              {dbCount}/{c.refs}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {extraCategories.map((k) => (
                    <tr key={k} className="border-b border-border/5 hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-4">
                        <button onClick={() => setActiveCategory(k)} className="font-medium text-left hover:text-primary transition-colors">
                          {k === "equipements" ? "Équipements" : k}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground/60">—</td>
                      <td className="py-2.5 px-3 text-right hidden sm:table-cell text-muted-foreground/60">—</td>
                      <td className="py-2.5 px-3 text-right hidden md:table-cell text-muted-foreground/60">—</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground/60">—</td>
                      <td className="py-2.5 px-4 hidden lg:table-cell text-right text-muted-foreground/60">
                        {statsByCategory[k]?.count || 0} en base
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Recherche & filtres ── */}
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un matériau (nom, sous-catégorie)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 rounded-xl border-border/40"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 border",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border/40 hover:border-border hover:bg-muted/30",
              )}
            >
              <Package className="h-3 w-3" />
              Toutes ({materialPrices.length})
            </button>
            {officialCategories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveCategory(c.slug)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 border",
                  activeCategory === c.slug
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border/40 hover:border-border hover:bg-muted/30",
                )}
              >
                {c.label}
                {c.db?.count ? <span className="text-[9px] opacity-70">({c.db.count})</span> : null}
              </button>
            ))}
            <button
              onClick={() => setActiveCategory("equipements")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 border",
                activeCategory === "equipements"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border/40 hover:border-border hover:bg-muted/30",
              )}
            >
              Équipements
              {statsByCategory["equipements"]?.count ? <span className="text-[9px] opacity-70">({statsByCategory["equipements"].count})</span> : null}
            </button>
          </div>
        </div>

        {/* ── Matériaux par catégorie ── */}
        <div className="space-y-4">
          {Object.entries(activeFilteredGrouped).length === 0 ? (
            <Card className="border border-border/50">
              <CardContent className="p-10 text-center">
                <HardHat className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium">Aucun matériau trouvé</p>
                <p className="text-xs text-muted-foreground mt-1">Essayez de modifier votre recherche</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(activeFilteredGrouped).map(([category, materials], idx) => {
              const official = MATERIAL_CATEGORY_2026.find((c) => c.slug === category);
              const dbStat = statsByCategory[category];
              const color = PALETTE[idx % PALETTE.length];
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="border border-border/40 overflow-hidden rounded-xl">
                    <CardHeader className="pb-3 border-b border-border/20 px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-bold", color)}>
                            {materials.length}
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">
                              {official?.label || (category === "equipements" ? "Équipements" : category)}
                            </CardTitle>
                            <CardDescription className="text-[10px]">
                              {materials.length} matériaux
                              {official ? ` · ${official.refs} références officielles` : ""}
                              {dbStat && dbStat.observed > 0 ? ` · ${dbStat.observed} observés` : ""}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {official && (
                            <Badge variant="secondary" className="text-[9px] font-normal">
                              Prix moyen {fmt(official.avgPrice)}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] font-normal">{materials.length} articles</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/10 bg-muted/20">
                              <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Matériau</th>
                              <th className="text-right py-2.5 px-4 font-medium text-muted-foreground hidden sm:table-cell">Unité</th>
                              <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Prix (TND)</th>
                              <th className="text-right py-2.5 px-4 font-medium text-muted-foreground hidden md:table-cell">Qualité du prix</th>
                            </tr>
                          </thead>
                          <tbody>
                            {materials.map((material: any) => {
                              const qb = QUALITY_BADGE[material.priceQuality] || QUALITY_BADGE.estimation_indicative;
                              return (
                                <tr key={material._id} className="border-b border-border/5 hover:bg-muted/10 transition-colors">
                                  <td className="py-2.5 px-4 font-medium truncate max-w-[220px] sm:max-w-none">
                                    {material.name}
                                    {material.subcategory && (
                                      <span className="ml-1.5 text-[9px] text-muted-foreground/60">· {material.subcategory}</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-muted-foreground hidden sm:table-cell">{material.unit}</td>
                                  <td className="py-2.5 px-4 text-right font-semibold font-mono text-sm">{material.unitPrice.toFixed(3)}</td>
                                  <td className="py-2.5 px-4 text-right hidden md:table-cell">
                                    <Badge className={cn("text-[9px] font-normal border", qb.cls)}>{qb.label}</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* ── Pied de page : consolidation ── */}
        <div className="rounded-xl border border-border/30 bg-muted/10 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3" />
            Dernière consolidation : {SHEET_STATS.version}
          </span>
          <span className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            Une base « complète » reste dynamique : nouveaux SKU, changements de stock, promotions et tarifs doivent être historisés plutôt qu'écrasés.
          </span>
        </div>
      </div>
    </main>
  );
}
