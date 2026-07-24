import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { useState, Fragment } from "react";
import {
  ArrowLeft, ArrowUpRight, Building2, Calendar, CheckCircle2,
  Clock, Cpu, Download, FileText, Heart, Lightbulb,
  Loader2, MapPin, Ruler, Shield, TrendingUp, TriangleAlert,
  Users, BarChart3, Globe, PiggyBank, Sparkles, Wallet,
  Target, Gauge, Hourglass, Layers, Paintbrush, Plug,
  TruckIcon, FileCheck, ChevronDown, ChevronUp, Info,
  AlertCircle, CheckCheck, DollarSign, Percent, Map,
  Sun, Eye, Sunrise, Sunset,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ──────────────────────────────────────────────────────────────

const REGION_LABELS: Record<string, string> = {
  tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
  nabeul: "Nabeul", zaghouan: "Zaghouan", bizerte: "Bizerte", beja: "Béja",
  jendouba: "Jendouba", le_kef: "Le Kef", siliana: "Siliana", kairouan: "Kairouan",
  kasserine: "Kasserine", sidi_bouzid: "Sidi Bouzid", sousse: "Sousse",
  monastir: "Monastir", mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès",
  medenine: "Médenine", tataouine: "Tataouine", gafsa: "Gafsa", tozeur: "Tozeur",
  kebili: "Kébili",
};

const REGION_MULTIPLIER: Record<string, number> = {
  tunis: 1.15, ariana: 1.10, ben_arous: 1.10, manouba: 1.05,
  nabeul: 1.05, bizerte: 1.05, sousse: 1.10, monastir: 1.05, mahdia: 1.00,
  sfax: 1.05, gabes: 1.00, medenine: 0.95, tataouine: 0.95,
  gafsa: 0.95, tozeur: 0.95, kebili: 0.95, kairouan: 0.95,
  kasserine: 0.90, sidi_bouzid: 0.90, beja: 0.95, jendouba: 0.90,
  le_kef: 0.90, siliana: 0.90, zaghouan: 0.95,
};

const BIM_COLORS: Record<string, string> = {
  gros_oeuvre: "#3b82f6", second_oeuvre: "#f59e0b", equipements: "#8b5cf6",
  main_oeuvre: "#22c55e", transport: "#a3e635", etudes_imprevus: "#ef4444",
};

const BIM_ICONS: Record<string, any> = {
  gros_oeuvre: Building2, second_oeuvre: Paintbrush, equipements: Plug,
  main_oeuvre: Users, transport: TruckIcon, etudes_imprevus: FileCheck,
};

const COMPARE_REGIONS = [
  { key: "tunis", name: "Tunis" },
  { key: "sousse", name: "Sousse" },
  { key: "sfax", name: "Sfax" },
  { key: "nabeul", name: "Nabeul" },
  { key: "kairouan", name: "Kairouan" },
  { key: "kasserine", name: "Kasserine" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(n);
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useQuery(api.projects.getProject, { projectId: id as any });
  const toggleFav = useMutation(api.projects.toggleFavorite);
  const startAnalysis = useMutation(api.projects.startAnalysis);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);

  const [analyzing, setAnalyzing] = useState(false);
  const [showCat, setShowCat] = useState<string | null>(null);

  if (!project) return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </main>
  );

  const ce = project.costEstimate;
  const ai = project.aiAnalysis;
  const done = project.status === "completed";
  const busy = project.status === "analyzing" || analyzing;
  const conf = ai?.confidence ?? 0;
  const confPct = Math.round(conf * 100);
  const scenarios = ce?.budgetScenarios;
  const totalItems = ce?.breakdown?.reduce((s: number, b: any) => s + (b.items?.length || 0), 0) ?? 0;

  // Region impact
  const rMult = project.region ? (REGION_MULTIPLIER[project.region] ?? 1) : 1;
  const impactPct = Math.round((rMult - 1) * 100);
  const baseCost = ce ? Math.round(ce.totalCost / rMult) : 0;
  const diff = ce ? ce.totalCost - baseCost : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border/10 bg-background/80 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 flex items-center justify-between h-12 sm:h-14">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate("/dashboard")}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border/30" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate max-w-[160px] sm:max-w-xs">{project.name}</h1>
              <p className="text-[10px] text-muted-foreground truncate">
                {project.surface}m² • {project.region ? REGION_LABELS[project.region] : 'Région'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => toggleFav({ projectId: project._id })}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
              <Heart className={cn("h-4 w-4", project.isFavorite && "fill-red-400 text-red-400")} />
            </button>
            {done && (
              <button className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* ─── Pending Banner ─────────────────────────────────────────── */}
        {!done && !busy && (
          <div className="rounded-xl border-2 border-dashed border-amber-400/30 bg-amber-50/30 dark:bg-amber-500/5 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-600">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Projet en attente d'analyse</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Lancez l'analyse BIM pour obtenir une estimation</p>
                </div>
              </div>
              <Button size="sm" className="h-9 w-full sm:w-auto text-xs gap-1.5" disabled={analyzing}
                onClick={async () => {
                  setAnalyzing(true);
                  await startAnalysis({ projectId: project._id });
                  await simulateAnalysis({ projectId: project._id });
                  setAnalyzing(false);
                }}>
                {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5" />}
                {analyzing ? "Analyse..." : "Analyser"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Analyzing Banner ───────────────────────────────────────── */}
        {busy && !done && (
          <div className="rounded-xl border border-blue-300/30 bg-blue-50/30 dark:bg-blue-500/5 p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Analyse en cours...</p>
              <p className="text-xs text-muted-foreground">Estimation selon les prix Tunisie 2026</p>
            </div>
          </div>
        )}

        {/* ─── REPORT ──────────────────────────────────────────── */}
        {done && ce && ai && (
          <>
            {/* ── Hero Total ─────────────────────────────────────── */}
            <div className="rounded-2xl bg-gradient-to-br from-primary/[0.06] to-background border border-border/30 p-5 sm:p-7 lg:p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 text-primary font-medium">
                  <Target className="h-3 w-3" /> Devis Tunisie 2026
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span className={cn("inline-flex items-center gap-1", confPct >= 80 ? "text-emerald-600" : confPct >= 60 ? "text-amber-600" : "text-red-500")}>
                  <Shield className="h-3 w-3" /> {confPct}%
                </span>
              </div>
              <h2 className="text-[10px] sm:text-xs font-medium text-muted-foreground/70 mb-1">Coût total estimé (TTC)</h2>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-black gradient-text break-words leading-tight tracking-tight">
                {fmt(ce.totalCost)}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {ce.costPerSquareMeter && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-muted/50 border border-border/20">
                    <Ruler className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{fmt(ce.costPerSquareMeter)}</span>/m²
                  </span>
                )}
                {ai.estimatedDuration && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-muted/50 border border-border/20">
                    <Hourglass className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{ai.estimatedDuration}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200/30 text-amber-700 dark:text-amber-400">
                  <Percent className="h-3 w-3" />
                  +{fmt(ce.contingencyBuffer)} ({ce.contingencyPercentage}%)
                </span>
              </div>
            </div>

            {/* ── Quick Stats ────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { icon: Building2, label: "Surface", value: `${project.surface} m²`, color: "bg-blue-500/10 text-blue-600" },
                { icon: Globe, label: "Région", value: project.region ? REGION_LABELS[project.region] : '—', color: "bg-rose-500/10 text-rose-600" },
                { icon: Users, label: "Main-d'œuvre", value: ai.laborEstimate ? `${ai.laborEstimate.totalWorkers} ouv.` : "—", color: "bg-emerald-500/10 text-emerald-600" },
                { icon: Clock, label: "Durée", value: ai.estimatedDuration ?? "—", color: "bg-amber-500/10 text-amber-600" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-background/60 border border-border/20 shadow-sm">
                  <div className={cn("flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg shrink-0", s.color)}>
                    <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 leading-tight">{s.label}</p>
                    <p className="text-[11px] sm:text-xs font-semibold truncate">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Region Impact ──────────────────────────────────────── */}
            {project.region ? (() => {
              const rLabel = REGION_LABELS[project.region!] ?? project.region;
              return (
              <div key="region-impact" className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.03] to-background p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Map className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold">Impact : {rLabel}</h3>
                  <Badge variant="outline" className="text-[9px] ml-auto border-primary/20 text-primary">×{rMult}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background/50 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg shrink-0", impactPct > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600")}>
                        {impactPct > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5 rotate-180" />}
                      </div>
                      <p className="text-xs font-medium">{impactPct > 0 ? `${impactPct}% plus cher` : `${Math.abs(impactPct)}% moins cher`} que la moyenne</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Moyenne Tunisie</span><span className="font-medium">{fmt(baseCost)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Ajustement</span><span className={cn("font-medium", impactPct > 0 ? "text-amber-600" : "text-emerald-600")}>{impactPct > 0 ? '+' : ''}{fmt(diff)}</span></div>
                      <div className="flex justify-between pt-1 border-t border-border/20"><span className="font-semibold">Total région</span><span className="font-bold">{fmt(ce.totalCost)}</span></div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 border border-border/20">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Comparatif par région</p>
                    <div className="space-y-1">
                      {COMPARE_REGIONS.map((r) => {
                        const rm = REGION_MULTIPLIER[r.key] ?? 1;
                        const rc = Math.round(baseCost * rm);
                        const sel = r.key === project.region;
                        return (
                          <div key={r.key} className={cn("flex items-center justify-between px-2 py-1 rounded-md text-[11px]", sel ? "bg-primary/5 ring-1 ring-primary/20 font-medium" : "hover:bg-muted/20")}>
                            <span className={sel ? "text-primary" : ""}>{r.name}</span>
                            <span className={cn("font-mono", sel ? "text-primary" : "text-muted-foreground")}>{fmt(rc)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              );
            })() : null}

            {/* ── Budget Scenarios ────────────────────────────────────── */}
            {scenarios && (
              <div>
                <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <PiggyBank className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-bold">Scénarios budgétaires</h3>
                  <span className="text-[10px] text-muted-foreground/60">selon la finition</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {(["economique","standard","premium"] as const).map((key) => {
                    const s = scenarios[key];
                    if (!s) return null;
                    const isStd = key === "standard";
                    const style = key === "economique" ? "border-emerald-200/40 dark:border-emerald-800/30 from-emerald-50/30 dark:from-emerald-950/20"
                      : key === "standard" ? "border-blue-200/40 dark:border-blue-800/30 from-blue-50/30 dark:from-blue-950/20"
                      : "border-violet-200/40 dark:border-violet-800/30 from-violet-50/30 dark:from-violet-950/20";
                    const Icon = key === "economique" ? Wallet : key === "standard" ? Gauge : Sparkles;
                    return (
                      <div key={key} className={cn("relative rounded-xl border-2 bg-gradient-to-br p-4", style, isStd && "ring-2 ring-primary/30 shadow-lg")}>
                        {isStd && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2"><Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-2 shadow">Recommandé</Badge></div>}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/50 text-foreground">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-bold text-sm">{s.label}</span>
                        </div>
                        <p className="text-lg sm:text-xl font-extrabold">{fmt(s.totalCost)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt(s.costPerM2)} /m²</p>
                        <div className="mt-2 h-1.5 rounded-full bg-background/50 overflow-hidden">
                          <div className={cn("h-full rounded-full", key === "economique" ? "bg-emerald-400" : key === "standard" ? "bg-blue-400" : "bg-violet-400")}
                            style={{ width: `${key === "economique" ? 60 : key === "standard" ? 80 : 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Pie + Detail ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-border/20 bg-card/30 p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-1">Répartition</h3>
                <p className="text-[10px] text-muted-foreground mb-3">Par catégorie</p>
                <div className="h-[180px] sm:h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ce.breakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="estimatedCost" nameKey="label">
                        {ce.breakdown.map((e: any) => <Cell key={e.label} fill={BIM_COLORS[e.category] ?? "#888"} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return <div className="bg-background/95 backdrop-blur border border-border/30 rounded-lg p-2 text-xs shadow-lg"><p className="font-semibold">{d.label}</p><p className="text-muted-foreground">{fmt(d.estimatedCost)} ({d.percentage}%)</p></div>;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-2 pt-3 border-t border-border/10">
                  {ce.breakdown.map((item: any) => {
                    const Icon = BIM_ICONS[item.category] ?? Layers;
                    return (
                      <div key={item.label} className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: BIM_COLORS[item.category] ?? "#888" }} />
                        <Icon className="h-3 w-3 text-muted-foreground/60 shrink-0 hidden sm:block" />
                        <span className="truncate">{item.label}</span>
                        <span className="font-semibold ml-auto">{item.percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-3 rounded-xl border border-border/20 bg-card/30 p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-1">Détail par catégorie</h3>
                <p className="text-[10px] text-muted-foreground mb-3">Postes de travaux</p>
                <div className="space-y-3">
                  {[...ce.breakdown].sort((a: any, b: any) => b.estimatedCost - a.estimatedCost).map((item: any, i: number) => {
                    const Icon = BIM_ICONS[item.category] ?? Layers;
                    const color = BIM_COLORS[item.category] ?? "#888";
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="flex h-5 w-5 items-center justify-center rounded shrink-0" style={{ backgroundColor: color + "15" }}>
                              <Icon className="h-3 w-3" style={{ color }} />
                            </div>
                            <span className="text-xs sm:text-sm font-medium truncate">{item.label}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-bold shrink-0 ml-2">{fmt(item.estimatedCost)} <span className="text-[9px] text-muted-foreground font-normal">({item.percentage}%)</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                            className="h-full rounded-full" style={{ backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-border/10">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-500" /> <span className="font-medium">Imprévus</span></div>
                    <span className="font-bold">{fmt(ce.contingencyBuffer)}</span>
                  </div>
                  <Progress value={ce.contingencyPercentage} className="h-1.5 bg-amber-500/10" />
                  <p className="text-[9px] text-muted-foreground/60 mt-1">{ce.contingencyPercentage}% réservé aux aléas</p>
                </div>
              </div>
            </div>

            {/* ── Confidence + Anomalies ──────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/20 bg-card/30 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Gauge className="h-4 w-4" />
                  </div>
                  <div><h3 className="text-sm font-semibold">Confiance</h3><p className="text-[10px] text-muted-foreground">Fiabilité</p></div>
                </div>
                <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg bg-muted/20 border border-border/10">
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold",
                    confPct >= 80 ? "bg-emerald-500/10 text-emerald-600" : confPct >= 60 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500")}>
                    {confPct}%
                  </div>
                  <p className="text-xs">{confPct >= 80 ? "Fiable" : confPct >= 60 ? "Moyenne" : "Indicative"}</p>
                </div>
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden mb-2">
                  <div className={cn("h-full rounded-full", confPct >= 80 ? "bg-emerald-500" : confPct >= 60 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${confPct}%` }} />
                </div>
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />Surface : {project.surface}m²</div>
                  {project.region && <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />Région : {REGION_LABELS[project.region]}</div>}
                  <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />{totalItems} postes détaillés</div>
                </div>
              </div>

              {ai.anomalies && ai.anomalies.length > 0 && (
                <div className="lg:col-span-2 rounded-xl border-2 border-amber-200/30 dark:border-amber-700/30 bg-amber-50/20 dark:bg-amber-500/[0.02] p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <TriangleAlert className="h-4 w-4" />
                    </div>
                    <div><h3 className="text-sm font-semibold">Anomalies</h3><p className="text-[10px] text-muted-foreground">Points d'attention</p></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ai.anomalies.map((a: any, i: number) => {
                      const sev = a.severity === "élevée" ? "border-red-200/30 bg-red-50/20 dark:bg-red-950/10" 
                        : a.severity === "moyenne" ? "border-amber-200/30 bg-amber-50/20 dark:bg-amber-950/10"
                        : "border-yellow-200/30 bg-yellow-50/20";
                      return (
                        <div key={i} className={cn("flex items-start gap-2 p-2.5 rounded-lg border", sev)}>
                          <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-medium">{a.type}</p>
                              <Badge variant="outline" className="text-[8px] h-4 px-1 border-amber-300/30 text-amber-700 dark:text-amber-400">{a.severity}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground/80 mt-0.5">{a.description}</p>
                            {a.recommendation && <p className="text-[9px] text-muted-foreground/60 mt-1 italic">→ {a.recommendation}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Materials Table ─────────────────────────────────────── */}
            {ce.breakdown.some((b: any) => b.items && b.items.length > 0) && (
              <div className="rounded-xl border border-border/20 bg-card/30 overflow-hidden">
                <button onClick={() => setShowCat(showCat ? null : "__all")}
                  className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Layers className="h-4 w-4" /></div>
                    <span className="text-sm font-semibold">Quantitatif détaillé</span>
                    <Badge variant="secondary" className="text-[9px] ml-1.5">{totalItems} postes</Badge>
                  </div>
                  {showCat === "__all" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {showCat === "__all" && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 overflow-x-auto">
                        <table className="w-full text-[11px] sm:text-xs">
                          <thead>
                            <tr className="border-b border-border/10">
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground/60">Matériau</th>
                              <th className="text-right py-2 px-2 font-medium text-muted-foreground/60">Qté</th>
                              <th className="text-right py-2 px-2 font-medium text-muted-foreground/60 hidden sm:table-cell">P.U.</th>
                              <th className="text-right py-2 px-2 font-medium text-muted-foreground/60">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ce.breakdown.filter((b: any) => b.items?.length).map((cat: any) => (
                              <Fragment key={cat.label}>
                                <tr className="border-b border-border/5 bg-muted/10">
                                  <td colSpan={4} className="py-1.5 px-2">
                                    <button onClick={() => setShowCat(showCat === cat.label ? "__all" : cat.label)}
                                      className="flex items-center gap-1.5 w-full text-left">
                                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: BIM_COLORS[cat.category] ?? "#888" }} />
                                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                                      <span className="text-[9px] text-muted-foreground/50 ml-auto">{cat.items.length} postes — {fmt(cat.estimatedCost)}</span>
                                      {showCat === cat.label ? <ChevronUp className="h-3 w-3 text-muted-foreground/50" /> : <ChevronDown className="h-3 w-3 text-muted-foreground/50" />}
                                    </button>
                                  </td>
                                </tr>
                                {showCat === cat.label && cat.items.map((item: any, i: number) => (
                                  <tr key={i} className="border-b border-border/5 hover:bg-muted/10 transition-colors">
                                    <td className="py-1.5 px-2 font-medium truncate max-w-[140px] sm:max-w-none">{item.name}</td>
                                    <td className="text-right py-1.5 px-2 font-mono text-muted-foreground">{item.quantity}</td>
                                    <td className="text-right py-1.5 px-2 text-muted-foreground font-mono hidden sm:table-cell">{fmt(item.unitPrice)}</td>
                                    <td className="text-right py-1.5 px-2 font-semibold font-mono">{fmt(item.totalPrice)}</td>
                                  </tr>
                                ))}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Recommendations ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.optimizationTips && project.optimizationTips.length > 0 && (
                <div className="rounded-xl border border-border/20 bg-card/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600"><Lightbulb className="h-3.5 w-3.5" /></div>
                    <h3 className="text-sm font-semibold">Optimisation</h3>
                  </div>
                  <div className="space-y-1.5">
                    {project.optimizationTips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                        <CheckCheck className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {project.technicalRecommendations && project.technicalRecommendations.length > 0 && (
                <div className="rounded-xl border border-border/20 bg-card/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600"><Shield className="h-3.5 w-3.5" /></div>
                    <h3 className="text-sm font-semibold">Technique</h3>
                  </div>
                  <div className="space-y-1.5">
                    {project.technicalRecommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Project Info ────────────────────────────────────────── */}
            <div className="rounded-xl border border-border/10 bg-card/20 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Info className="h-3.5 w-3.5" /></div>
                <h3 className="text-sm font-semibold">Projet</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { label: "Catégorie", value: ai.category, icon: Building2 },
                  { label: "Région", value: project.region ? REGION_LABELS[project.region] : '—', icon: Globe },
                  { label: "Surface", value: `${project.surface} m²`, icon: Ruler },
                  { label: "Étages", value: String(project.floors ?? 1), icon: Building2 },
                  { label: "Créé le", value: new Date(project.createdAt).toLocaleDateString("fr-FR"), icon: Calendar },
                  { label: "Statut", value: "Terminé", icon: CheckCircle2 },
                ].map((info, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/10">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-background/50 text-muted-foreground/70">
                      <info.icon className="h-3 w-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] text-muted-foreground/60">{info.label}</p>
                      <p className="text-[10px] font-medium truncate">{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {project.description && (
                <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-3 pt-3 border-t border-border/10">{project.description}</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
