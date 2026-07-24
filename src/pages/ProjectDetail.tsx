import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Building2, Calendar, CheckCircle2, Clock, Cpu, Heart,
  Hourglass, Layers, Lightbulb, Loader2, Map, MapPin, Ruler, Shield,
  Target, TrendingUp, TriangleAlert, Users, Warehouse, Globe,
  PiggyBank, Sparkles, Wallet, Gauge,
  ChevronDown, ChevronUp, CheckCheck, Info,
  Truck, FileText, Paintbrush, Plug,
  Percent, DollarSign,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";

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
  main_oeuvre: Users, transport: Truck, etudes_imprevus: FileText,
};

const COMPARE_REGIONS = [
  { key: "tunis", name: "Tunis" }, { key: "sousse", name: "Sousse" },
  { key: "sfax", name: "Sfax" }, { key: "nabeul", name: "Nabeul" },
  { key: "kairouan", name: "Kairouan" }, { key: "kasserine", name: "Kasserine" },
];

const fmt = (n: number) => new Intl.NumberFormat("fr-TN", {
  style: "currency", currency: "TND", maximumFractionDigits: 0,
}).format(n);

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useQuery(api.projects.getProject, { projectId: id as any });
  const toggleFav = useMutation(api.projects.toggleFavorite);
  const startAnalysis = useMutation(api.projects.startAnalysis);
  const simulateAnalysis = useMutation(api.projects.simulateAnalysis);

  const [analyzing, setAnalyzing] = useState(false);
  const [openCat, setOpenCat] = useState<string | null>(null);

  if (!project) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const ce = project.costEstimate;
  const ai = project.aiAnalysis;
  const done = project.status === "completed";
  const busy = project.status === "analyzing" || analyzing;
  const confPct = ai ? Math.round(ai.confidence * 100) : 0;
  const scenarios = ce?.budgetScenarios;
  const totalItems = ce?.breakdown?.reduce((s: number, b: any) => s + (b.items?.length || 0), 0) ?? 0;

  const rMult = project.region ? (REGION_MULTIPLIER[project.region] ?? 1) : 1;
  const impactPct = Math.round((rMult - 1) * 100);
  const baseCost = ce ? Math.round(ce.totalCost / rMult) : 0;
  const diff = ce ? ce.totalCost - baseCost : 0;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/95">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate("/dashboard")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate max-w-[200px]">{project.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {project.surface ? `${project.surface}m²` : "Surface non définie"}
                {project.region ? ` • ${REGION_LABELS[project.region] ?? project.region}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => toggleFav({ projectId: project._id })}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50">
              <Heart className={cn("h-4 w-4", project.isFavorite && "fill-red-400 text-red-400")} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Pending Banner */}
        {!done && !busy && (
          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Projet en attente d'analyse</p>
                  <p className="text-xs text-muted-foreground">Lancez l'analyse BIM pour obtenir une estimation</p>
                </div>
              </div>
              <Button size="sm" className="h-9 w-full sm:w-auto" disabled={analyzing}
                onClick={async () => {
                  setAnalyzing(true);
                  await startAnalysis({ projectId: project._id });
                  await simulateAnalysis({ projectId: project._id });
                  setAnalyzing(false);
                }}>
                {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Cpu className="h-3.5 w-3.5 mr-1" />}
                {analyzing ? "Analyse..." : "Analyser"}
              </Button>
            </div>
          </div>
        )}

        {/* Analyzing Banner */}
        {busy && !done && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Analyse en cours...</p>
              <p className="text-xs text-muted-foreground">Estimation selon les prix Tunisie 2026</p>
            </div>
          </div>
        )}

        {/* Report */}
        {done && ce && ai && (
          <>
            {/* Total Cost */}
            <div className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Target className="h-3 w-3" /> Devis Tunisie 2026
                </Badge>
                <Badge variant="outline" className={cn("text-[10px] gap-1",
                  confPct >= 80 ? "text-emerald-600 border-emerald-200" :
                  confPct >= 60 ? "text-amber-600 border-amber-200" : "text-red-500 border-red-200")}>
                  <Shield className="h-3 w-3" /> {confPct}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1">Coût total estimé (TTC)</p>
              <p className="text-3xl sm:text-4xl font-bold">{fmt(ce.totalCost)}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {ce.costPerSquareMeter && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Ruler className="h-3 w-3" /> {fmt(ce.costPerSquareMeter)}/m²
                  </Badge>
                )}
                {ai.estimatedDuration && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Hourglass className="h-3 w-3" /> {ai.estimatedDuration}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-200">
                  <Percent className="h-3 w-3" /> {ce.contingencyPercentage}% imprévus
                </Badge>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Building2, label: "Surface", value: project.surface ? `${project.surface} m²` : "—", color: "bg-blue-100 text-blue-600" },
                { icon: Globe, label: "Région", value: project.region ? (REGION_LABELS[project.region] ?? project.region) : "—", color: "bg-rose-100 text-rose-600" },
                { icon: Users, label: "Main-d'œuvre", value: ai.laborEstimate ? `${ai.laborEstimate.totalWorkers ?? "?"} ouv.` : "—", color: "bg-emerald-100 text-emerald-600" },
                { icon: Clock, label: "Durée", value: ai.estimatedDuration ?? "—", color: "bg-amber-100 text-amber-600" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", s.color)}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className="text-xs font-semibold truncate">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Region Impact */}
            {project.region && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Map className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Impact région : {REGION_LABELS[project.region] ?? project.region}</h3>
                  <Badge variant="outline" className="ml-auto">×{rMult}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={cn("h-4 w-4", impactPct > 0 ? "text-amber-500" : "text-emerald-500")} />
                      <p className="text-xs font-medium">
                        {impactPct > 0 ? `${impactPct}% plus cher` : `${Math.abs(impactPct)}% moins cher`}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Moyenne</span><span className="font-medium">{fmt(baseCost)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Ajustement</span><span className={cn("font-medium", impactPct > 0 ? "text-amber-600" : "text-emerald-600")}>{impactPct > 0 ? "+" : ""}{fmt(diff)}</span></div>
                      <div className="flex justify-between pt-1 border-t font-semibold"><span>Total</span><span>{fmt(ce.totalCost)}</span></div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Comparatif par région</p>
                    <div className="space-y-1">
                      {COMPARE_REGIONS.map((r) => {
                        const rm = REGION_MULTIPLIER[r.key] ?? 1;
                        const rc = Math.round(baseCost * rm);
                        const sel = r.key === project.region;
                        return (
                          <div key={r.key} className={cn("flex items-center justify-between px-2 py-1 rounded text-[11px]", sel && "bg-primary/5 font-medium")}>
                            <span className={sel ? "text-primary" : ""}>{r.name}</span>
                            <span className="font-mono text-muted-foreground">{fmt(rc)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Budget Scenarios */}
            {scenarios && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <PiggyBank className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Scénarios budgétaires</h3>
                  <span className="text-[10px] text-muted-foreground">selon finition</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["economique", "standard", "premium"] as const).map((key) => {
                    const s = scenarios[key];
                    if (!s) return null;
                    const isStd = key === "standard";
                    const Icon = key === "economique" ? Wallet : key === "standard" ? Gauge : Sparkles;
                    return (
                      <div key={key} className={cn("relative rounded-lg border-2 p-4",
                        isStd ? "border-primary/40 bg-primary/5" : "border-border")}>
                        {isStd && <Badge className="absolute -top-2.5 left-3 text-[9px] h-4 px-2">Recommandé</Badge>}
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-semibold text-sm">{s.label}</span>
                        </div>
                        <p className="text-lg font-bold">{fmt(s.totalCost)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmt(s.costPerM2)} /m²</p>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full",
                            key === "economique" ? "bg-emerald-400" : key === "standard" ? "bg-blue-400" : "bg-violet-400")}
                            style={{ width: `${key === "economique" ? 60 : key === "standard" ? 80 : 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pie + Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2 rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Répartition</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ce.breakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="estimatedCost" nameKey="label">
                        {ce.breakdown.map((e: any) => <Cell key={e.label} fill={BIM_COLORS[e.category] ?? "#888"} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return <div className="bg-background border rounded-lg p-2 text-xs shadow"><p className="font-semibold">{d.label}</p><p className="text-muted-foreground">{fmt(d.estimatedCost)} ({d.percentage}%)</p></div>;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-2 pt-3 border-t">
                  {ce.breakdown.map((item: any) => (
                    <div key={item.label} className="flex items-center gap-1.5 text-[11px]">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: BIM_COLORS[item.category] ?? "#888" }} />
                      <span className="truncate">{item.label}</span>
                      <span className="font-semibold ml-auto">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3 rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Détail par catégorie</h3>
                <div className="space-y-3">
                  {[...ce.breakdown].sort((a: any, b: any) => b.estimatedCost - a.estimatedCost).map((item: any, i: number) => {
                    const Icon = BIM_ICONS[item.category] ?? Layers;
                    const color = BIM_COLORS[item.category] ?? "#888";
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                            <span className="text-xs font-medium truncate">{item.label}</span>
                          </div>
                          <span className="text-xs font-semibold shrink-0 ml-2">{fmt(item.estimatedCost)} <span className="text-[10px] text-muted-foreground font-normal">({item.percentage}%)</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${item.percentage}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">Imprévus</span>
                    <span className="font-semibold">{fmt(ce.contingencyBuffer)}</span>
                  </div>
                  <Progress value={ce.contingencyPercentage} className="h-1.5" />
                </div>
              </div>
            </div>

            {/* Confidence + Anomalies */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Confiance</h3>
                </div>
                <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-muted/30">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold",
                    confPct >= 80 ? "bg-emerald-100 text-emerald-600" : confPct >= 60 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-500")}>
                    {confPct}%
                  </div>
                  <p className="text-xs">{confPct >= 80 ? "Fiable" : confPct >= 60 ? "Moyenne" : "Indicative"}</p>
                </div>
                <Progress value={confPct} className="h-1.5" />
                <div className="space-y-1 text-[10px] text-muted-foreground mt-2">
                  {project.surface && <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />Surface : {project.surface}m²</div>}
                  {project.region && <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />Région : {REGION_LABELS[project.region]}</div>}
                  <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />{totalItems} postes détaillés</div>
                </div>
              </div>

              {ai.anomalies && ai.anomalies.length > 0 && (
                <div className="lg:col-span-2 rounded-lg border-2 border-amber-200 bg-amber-50/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TriangleAlert className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-semibold">Anomalies</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ai.anomalies.map((a: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-amber-200/50 bg-white/50">
                        <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-medium">{a.type}</p>
                            <Badge variant="outline" className="text-[8px] h-4 px-1 border-amber-300">{a.severity}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Materials Table */}
            {ce.breakdown.some((b: any) => b.items?.length) && (
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Quantitatif détaillé</h3>
                    <Badge variant="secondary" className="text-[9px] ml-1.5">{totalItems} postes</Badge>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Matériau</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Qté</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">P.U.</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ce.breakdown.filter((b: any) => b.items?.length).map((cat: any) => (
                        <>
                          <tr key={cat.label} className="border-b bg-muted/10">
                            <td colSpan={4} className="py-2 px-3">
                              <button onClick={() => setOpenCat(openCat === cat.label ? null : cat.label)}
                                className="flex items-center gap-1.5 w-full text-left">
                                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: BIM_COLORS[cat.category] ?? "#888" }} />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">{cat.label}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto">{cat.items.length} postes — {fmt(cat.estimatedCost)}</span>
                                {openCat === cat.label ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                              </button>
                            </td>
                          </tr>
                          {openCat === cat.label && cat.items.map((item: any, i: number) => (
                            <tr key={i} className="border-b hover:bg-muted/10">
                              <td className="py-2 px-3 font-medium">{item.name}</td>
                              <td className="text-right py-2 px-3 font-mono text-muted-foreground">{item.quantity} {item.unit}</td>
                              <td className="text-right py-2 px-3 text-muted-foreground font-mono hidden sm:table-cell">{fmt(item.unitPrice)}</td>
                              <td className="text-right py-2 px-3 font-semibold font-mono">{fmt(item.totalPrice)}</td>
                            </tr>
                          ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.optimizationTips && project.optimizationTips.length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold">Optimisation</h3>
                  </div>
                  <div className="space-y-1.5">
                    {project.optimizationTips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCheck className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {project.technicalRecommendations && project.technicalRecommendations.length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold">Technique</h3>
                  </div>
                  <div className="space-y-1.5">
                    {project.technicalRecommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Project Info */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Projet</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { label: "Catégorie", value: ai.category, icon: Building2 },
                  { label: "Région", value: project.region ? REGION_LABELS[project.region] ?? project.region : "Non définie", icon: MapPin },
                  { label: "Surface", value: project.surface ? `${project.surface} m²` : "Non définie", icon: Ruler },
                  { label: "Étages", value: String(project.floors ?? 1), icon: Building2 },
                  { label: "Créé le", value: new Date(project.createdAt).toLocaleDateString("fr-FR"), icon: Calendar },
                  { label: "Statut", value: "Terminé", icon: CheckCircle2 },
                ].map((info, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                    <info.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[9px] text-muted-foreground">{info.label}</p>
                      <p className="text-[11px] font-medium truncate">{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">{project.description}</p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
