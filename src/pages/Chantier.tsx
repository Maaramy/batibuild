// ============================================================================
// GESTION & SUIVI DE CHANTIER — fiche d'un chantier
// ----------------------------------------------------------------------------
// Une seule interface pour les deux modes de création. Chaque onglet est borné
// par les permissions réellement accordées : un intervenant sans droit budget
// ne reçoit même pas les montants du serveur, et les formulaires d'écriture ne
// s'affichent que s'il possède la permission correspondante.
//
// Les prévisions (risque, coût final, date de fin) sont TOUJOURS présentées
// comme des estimations : le bandeau de prudence accompagne chaque projection.
// ============================================================================

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router";
import type { FunctionReturnType } from "convex/server";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  HardHat,
  Info,
  LayoutDashboard,
  Loader2,
  Mail,
  Package,
  Phone,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_NATURE_LABELS,
  RISK_DISCLAIMER,
  formatSiteDate,
  formatTND,
  materialLine,
  plannedProgressAt,
  taskProgress,
  siteTypeLabel,
  type ExpenseCategory,
  type ExpenseNature,
} from "@/lib/siteTracking";
import { SITE_REPORTS, exportSiteReportPdf, type SiteReportKind } from "@/lib/siteReportPdf";
import { SiteCalendar } from "@/components/site/SiteCalendar";
import { SiteCotisationCard } from "@/components/site/SitePaywall";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type SiteData = NonNullable<FunctionReturnType<typeof api.siteTracking.getSite>>;

const DAY = 86_400_000;
const isoDate = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);
const fromIso = (value: string) => new Date(`${value}T00:00:00`).getTime();

const TASK_STATUS: Record<string, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminée",
  blocked: "Bloquée",
};

const STAKEHOLDER_ROLES: { value: string; label: string }[] = [
  { value: "architecte", label: "Architecte" },
  { value: "ingenieur", label: "Ingénieur" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "chef_chantier", label: "Chef de chantier" },
  { value: "artisan", label: "Artisan" },
  { value: "electricien", label: "Électricien" },
  { value: "plombier", label: "Plombier" },
  { value: "fournisseur", label: "Fournisseur" },
];

const PERMISSIONS: { key: string; label: string; hint: string }[] = [
  { key: "progress", label: "Avancement & planning", hint: "Mettre à jour les phases et les dates" },
  { key: "daily", label: "Suivi quotidien", hint: "Saisir le journal des travaux" },
  { key: "budget", label: "Budget & dépenses", hint: "Voir et saisir les montants" },
  { key: "materials", label: "Matériaux", hint: "Commandes, livraisons, consommation" },
  { key: "quality", label: "Contrôle qualité", hint: "Inspections et réserves" },
  { key: "team", label: "Intervenants", hint: "Voir l'équipe du chantier" },
  { key: "reports", label: "Rapports", hint: "Générer les rapports PDF" },
];

const RISK_TONES: Record<string, { label: string; className: string; bar: string }> = {
  faible: {
    label: "Risque faible",
    className: "border-emerald-500/30 bg-emerald-50/60 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200",
    bar: "bg-emerald-500",
  },
  modere: {
    label: "Risque modéré",
    className: "border-amber-500/30 bg-amber-50/60 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200",
    bar: "bg-amber-500",
  },
  eleve: {
    label: "Risque élevé",
    className: "border-orange-500/30 bg-orange-50/60 text-orange-800 dark:bg-orange-950/20 dark:text-orange-200",
    bar: "bg-orange-500",
  },
  critique: {
    label: "Risque critique",
    className: "border-rose-500/30 bg-rose-50/60 text-rose-800 dark:bg-rose-950/20 dark:text-rose-200",
    bar: "bg-rose-500",
  },
};

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
}) {
  const toneClass =
    tone === "bad"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">
        <Icon className="h-3 w-3" /> {label}
      </div>
      {/* Le montant passe à la ligne plutôt que d'être tronqué : sur un écran
          de 320 px, « 250.000 TND » doit rester lisible en entier. */}
      <p className={`mt-1 break-words text-[13px] font-semibold leading-tight tabular-nums sm:text-base ${toneClass}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function Chantier() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const entry = useQuery(api.siteTracking.getSiteEntry, siteId ? { siteId: siteId as Id<"siteProjects"> } : "skip");
  const data = useQuery(
    api.siteTracking.getSite,
    siteId && entry?.canOpen ? { siteId: siteId as Id<"siteProjects"> } : "skip",
  );

  usePageSEO({
    title: data ? `${data.site.name} — Suivi de chantier | batibuild` : "Suivi de chantier — batibuild",
    description: "Planning, avancement, budget, matériaux, intervenants, qualité et prévisions du chantier.",
  });

  if (!siteId || entry === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du chantier…
      </div>
    );
  }

  if (!entry.canOpen) {
    return (
      <div className="site-module min-h-screen bg-background">
        <div className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
          <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => navigate("/dashboard/chantiers")}>
            <ArrowLeft className="h-4 w-4" /> Mes chantiers
          </Button>
          {entry.needsCotisation ? (
            <>
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-50/50 p-4 text-sm dark:bg-amber-950/20">
                <p className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200">
                  <ShieldAlert className="h-4 w-4" /> Accès au chantier momentanément fermé
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Le suivi de chantier est un module payant. Activez votre cotisation pour retrouver vos données —
                  elles sont conservées intactes.
                </p>
              </div>
              <SiteCotisationCard />
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <HardHat className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {entry.moduleDisabled
                    ? "Module momentanément désactivé"
                    : "Chantier introuvable ou accès non autorisé"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.moduleDisabled
                    ? "L'administration a suspendu le module. Vos chantiers et leurs données sont conservés et redeviendront accessibles dès sa réactivation."
                    : "Seul le responsable du chantier et les intervenants qu'il a autorisés peuvent l'ouvrir."}
                </p>
                <Button className="mt-4" variant="outline" onClick={() => navigate("/dashboard/chantiers")}>
                  Retour à mes chantiers
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du suivi…
      </div>
    );
  }

  return <SiteDetailView data={data} siteId={siteId as Id<"siteProjects">} />;
}

function SiteDetailView({ data, siteId }: { data: SiteData; siteId: Id<"siteProjects"> }) {
  const navigate = useNavigate();
  const site = data.site;
  const can = (permission: string) =>
    data.isOwner || (data.permissions as string[]).includes(permission);

  const risk = RISK_TONES[data.risk.riskLevel] ?? RISK_TONES.faible;
  const planned = plannedProgressAt(data.tasks, Date.now());
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="site-module min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 h-10 w-10 shrink-0 sm:h-8 sm:w-8"
              onClick={() => navigate("/dashboard/chantiers")}
              aria-label="Retour aux chantiers"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 break-words text-lg font-semibold tracking-tight sm:text-xl lg:text-2xl">
                  {site.name}
                </h1>
                <Badge variant="outline" className="text-[10px]">
                  {site.status === "active" ? "En cours" : site.status === "completed" ? "Terminé" : "Archivé"}
                </Badge>
                {!data.isOwner && (
                  <Badge variant="secondary" className="text-[10px]">
                    Intervenant
                  </Badge>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
                <span className="flex items-center gap-1">
                  <HardHat className="h-3 w-3" /> {siteTypeLabel(site.category)}
                </span>
                {site.surface && <span>{site.surface} m²</span>}
                <span className="flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" /> {formatSiteDate(site.startDate)} →{" "}
                  {formatSiteDate(site.expectedEndDate)}
                </span>
                {site.clientName && <span>Client : {site.clientName}</span>}
                {site.projectId && (
                  <button
                    type="button"
                    className="text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                    onClick={() => navigate(`/dashboard/project/${site.projectId}`)}
                  >
                    Estimation d'origine
                  </button>
                )}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
            <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 sm:block sm:w-auto sm:py-1.5 sm:text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avancement</p>
              <p className="text-sm font-semibold tabular-nums">{data.progress} %</p>
            </div>
          </div>
        </div>

        {data.alerts.length > 0 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {data.alerts.map((alert, index) => (
              <div
                key={`${alert.label}-${index}`}
                className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                  alert.level === "danger"
                    ? "border-rose-500/30 bg-rose-50/60 text-rose-800 dark:bg-rose-950/20 dark:text-rose-200"
                    : alert.level === "warning"
                      ? "border-amber-500/30 bg-amber-50/60 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200"
                      : "border-border/60 bg-muted/40 text-muted-foreground"
                }`}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{alert.label}</span>
              </div>
            ))}
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          {/* Rangée d'onglets : défilement horizontal LOCAL (le geste ne propage
              pas au viewport) ; chaque onglet reste une cible de 44 px sur
              mobile et reprend sa taille compacte dès `sm`. */}
          <div className="site-scroll-x -mx-3 px-3 pb-1 sm:mx-0 sm:px-0">
            <TabsList
              aria-label="Sections du chantier"
              className="mb-3 inline-flex h-auto w-max max-w-none gap-1 bg-muted/50 p-1"
            >
              <TabsTrigger value="dashboard" className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] sm:h-8 sm:text-xs">
                <LayoutDashboard className="h-3.5 w-3.5" /> Tableau de bord
              </TabsTrigger>
              <TabsTrigger value="planning" className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] sm:h-8 sm:text-xs">
                <CalendarRange className="h-3.5 w-3.5" /> Planning
              </TabsTrigger>
              {can("daily") && (
                <TabsTrigger value="daily" className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] sm:h-8 sm:text-xs">
                  <ClipboardList className="h-3.5 w-3.5" /> Quotidien
                </TabsTrigger>
              )}
              {can("budget") && (
                <TabsTrigger value="budget" className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] sm:h-8 sm:text-xs">
                  <Wallet className="h-3.5 w-3.5" /> Budget
                </TabsTrigger>
              )}
              {can("materials") && (
                <TabsTrigger value="materials" className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] sm:h-8 sm:text-xs">
                  <Package className="h-3.5 w-3.5" /> Matériaux
                </TabsTrigger>
              )}
              {can("team") && (
                <TabsTrigger value="team" className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] sm:h-8 sm:text-xs">
                  <Users className="h-3.5 w-3.5" /> Intervenants
                </TabsTrigger>
              )}
              {can("quality") && (
                <TabsTrigger value="quality" className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] sm:h-8 sm:text-xs">
                  <BadgeCheck className="h-3.5 w-3.5" /> Qualité
                </TabsTrigger>
              )}
              <TabsTrigger value="risk" className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] sm:h-8 sm:text-xs">
                <TrendingUp className="h-3.5 w-3.5" /> Prévisions
              </TabsTrigger>
              <TabsTrigger value="reports" className="h-9 shrink-0 gap-1.5 px-2.5 text-[11px] sm:h-8 sm:text-xs">
                <FileText className="h-3.5 w-3.5" /> Rapports
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ═══ TABLEAU DE BORD ═══ */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Kpi icon={TrendingUp} label="Avancement réel" value={`${data.progress} %`} hint={`attendu ${planned} %`} />
              <Kpi
                icon={CalendarClock}
                label="Tâches en retard"
                value={String(data.lateCount)}
                hint={`${data.tasks.length} phases au total`}
                tone={data.lateCount > 0 ? "bad" : "good"}
              />
              <Kpi
                icon={Wallet}
                label="Budget révisé"
                value={formatTND(data.budget?.revised ?? site.budgetInitial)}
                hint={data.budget ? `${data.budget.consumedPct} % consommé` : "accès non accordé"}
              />
              <Kpi
                icon={TrendingDown}
                label="Écart budgétaire"
                value={data.budget ? formatTND(data.budget.variance) : "—"}
                hint={data.budget ? `dépensé ${formatTND(data.budget.spent)}` : "accès non accordé"}
                tone={data.budget ? (data.budget.variance < 0 ? "bad" : "good") : "default"}
              />
              <Kpi
                icon={ShieldAlert}
                label="Risque (prévision)"
                value={`${data.risk.riskScore}/100`}
                hint={data.risk.riskLabel}
                tone={data.risk.riskScore >= 50 ? "bad" : "good"}
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Prochaines échéances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[...data.tasks]
                    .filter((task) => taskProgress(task) < 100)
                    .sort((a, b) => a.endDate - b.endDate)
                    .slice(0, 6)
                    .map((task) => {
                      const late = task.endDate < Date.now();
                      return (
                        <div key={task._id} className="flex items-center gap-2 text-xs">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${late ? "bg-rose-500" : "bg-emerald-500"}`} />
                          <span className="min-w-0 flex-1 truncate">{task.name}</span>
                          <span className={late ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
                            {formatSiteDate(task.endDate)}
                          </span>
                          <span className="w-10 text-right font-medium">{taskProgress(task)} %</span>
                        </div>
                      );
                    })}
                  {data.tasks.every((task) => taskProgress(task) >= 100) && (
                    <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Toutes les phases sont terminées.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className={`border ${risk.className}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <Sparkles className="h-3.5 w-3.5" /> Analyse de risque
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{risk.label}</span>
                    <span>{data.risk.riskScore}/100</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div className={`h-full ${risk.bar}`} style={{ width: `${data.risk.riskScore}%` }} />
                  </div>
                  <p className="flex items-start gap-1.5 text-[10px] opacity-80">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" /> {RISK_DISCLAIMER}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-full text-[11px]"
                    onClick={() => setTab("risk")}
                  >
                    Voir les prévisions détaillées
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avancement par phase</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.tasks.map((task) => (
                  <div key={task._id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate">{task.name}</span>
                      <span className="ml-2 shrink-0 text-muted-foreground">{taskProgress(task)} %</span>
                    </div>
                    <Progress value={taskProgress(task)} className="h-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ PLANNING ═══ */}
          <TabsContent value="planning">
            <PlanningTab data={data} siteId={siteId} canEdit={can("progress")} />
          </TabsContent>

          {/* ═══ QUOTIDIEN ═══ */}
          {can("daily") && (
            <TabsContent value="daily">
              <DailyTab data={data} siteId={siteId} />
            </TabsContent>
          )}

          {/* ═══ BUDGET ═══ */}
          {can("budget") && (
            <TabsContent value="budget">
              <BudgetTab data={data} siteId={siteId} />
            </TabsContent>
          )}

          {/* ═══ MATÉRIAUX ═══ */}
          {can("materials") && (
            <TabsContent value="materials">
              <MaterialsTab data={data} siteId={siteId} />
            </TabsContent>
          )}

          {/* ═══ INTERVENANTS ═══ */}
          {can("team") && (
            <TabsContent value="team">
              <TeamTab data={data} siteId={siteId} />
            </TabsContent>
          )}

          {/* ═══ QUALITÉ ═══ */}
          {can("quality") && (
            <TabsContent value="quality">
              <QualityTab data={data} siteId={siteId} />
            </TabsContent>
          )}

          {/* ═══ PRÉVISIONS ═══ */}
          <TabsContent value="risk">
            <RiskTab data={data} />
          </TabsContent>

          {/* ═══ RAPPORTS ═══ */}
          <TabsContent value="reports">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Rapports PDF</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Identité batibuild et logo officiel sur chaque document. Les prévisions y sont signalées comme
                  telles.
                </p>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SITE_REPORTS.map((report) => (
                  <button
                    key={report.kind}
                    type="button"
                    onClick={() => {
                      try {
                        exportSiteReportPdf(report.kind as SiteReportKind, data);
                      } catch {
                        toast.error("Génération du rapport impossible. Réessayez.");
                      }
                    }}
                    className="group flex items-start gap-2 rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium">{report.title}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{report.description}</span>
                    </span>
                    <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-emerald-600" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================================================
// PLANNING — Gantt + mise à jour des phases
// ============================================================================
function PlanningTab({ data, siteId, canEdit }: { data: SiteData; siteId: Id<"siteProjects">; canEdit: boolean }) {
  const updateTask = useMutation(api.siteTracking.updateTask);
  const addTask = useMutation(api.siteTracking.addTask);
  const deleteTask = useMutation(api.siteTracking.deleteTask);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", startDate: isoDate(Date.now()), endDate: isoDate(Date.now() + 14 * DAY) });

  const span = useMemo(() => {
    if (data.tasks.length === 0) return { start: data.site.startDate, span: 1 };
    const start = Math.min(...data.tasks.map((task) => task.startDate));
    const end = Math.max(...data.tasks.map((task) => task.endDate));
    return { start, span: Math.max(1, end - start) };
  }, [data.tasks, data.site.startDate]);

  const save = async (taskId: string, patch: Record<string, unknown>) => {
    setBusy(taskId);
    try {
      await updateTask({ taskId: taskId as Id<"siteTasks">, ...(patch as any) });
      toast.success("Planning mis à jour.");
    } catch (error: any) {
      toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendrier : vues jour / semaine / mois, calculées à partir des phases
          déjà chargées. Aucune requête ni mutation supplémentaire. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <CalendarDays className="h-3.5 w-3.5" /> Calendrier du chantier
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Repérez les échéances par jour, par semaine ou sur le mois complet.
          </p>
        </CardHeader>
        <CardContent>
          <SiteCalendar tasks={data.tasks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Diagramme de Gantt</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            {formatSiteDate(span.start)} → {formatSiteDate(span.start + span.span)}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.tasks.map((task) => {
            const left = ((task.startDate - span.start) / span.span) * 100;
            const width = Math.max(1.5, ((task.endDate - task.startDate) / span.span) * 100);
            const progress = taskProgress(task);
            return (
              <div key={task._id} className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-center sm:gap-3">
                <div className="flex items-center justify-between gap-2 text-[11px] sm:block">
                  <span className="block truncate font-medium">{task.name}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums sm:block">
                    {formatSiteDate(task.startDate)} → {formatSiteDate(task.endDate)}
                  </span>
                </div>
                <div className="relative h-4 rounded bg-muted/60">
                  <div
                    className="absolute inset-y-0 rounded bg-emerald-200/70 dark:bg-emerald-900/40"
                    style={{ left: `${left}%`, width: `${Math.min(100 - left, width)}%` }}
                  >
                    <div className="h-full rounded bg-emerald-600" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="absolute right-1 top-0.5 text-[9px] font-medium tabular-nums text-emerald-800 dark:text-emerald-200">
                    {progress} %
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mise à jour des phases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Sur mobile, chaque phase devient une carte à deux colonnes :
                plus de rangée de 500 px à faire défiler latéralement. */}
            {data.tasks.map((task) => (
              <div
                key={task._id}
                className="relative grid grid-cols-2 gap-2 rounded-xl border border-border/50 p-3 pr-14 sm:grid-cols-[minmax(0,1fr)_90px_130px_120px_auto] sm:items-center sm:gap-2 sm:p-2.5"
              >
                <span className="col-span-2 min-w-0 truncate pr-6 text-xs font-medium sm:col-span-1 sm:pr-0">
                  {task.name}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <span className="block text-[10px] text-muted-foreground sm:hidden">Avancement</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      defaultValue={task.progress}
                      aria-label={`Avancement de ${task.name}`}
                      className="h-9 text-xs tabular-nums sm:h-7"
                      onBlur={(event) => {
                        const value = Number(event.target.value);
                        if (value !== task.progress && Number.isFinite(value)) void save(task._id, { progress: value });
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="min-w-0 space-y-0.5">
                  <span className="block text-[10px] text-muted-foreground sm:hidden">Statut</span>
                  <Select value={task.status} onValueChange={(value) => void save(task._id, { status: value })}>
                    <SelectTrigger className="h-9 w-full text-xs sm:h-7" aria-label={`Statut de ${task.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 min-w-0 space-y-0.5 sm:col-span-1">
                  <span className="block text-[10px] text-muted-foreground sm:hidden">Fin prévue</span>
                  <Input
                    type="date"
                    defaultValue={isoDate(task.endDate)}
                    aria-label={`Date de fin de ${task.name}`}
                    className="h-9 w-full text-xs sm:h-7"
                    onChange={(event) => {
                      const value = fromIso(event.target.value);
                      if (Number.isFinite(value) && value !== task.endDate) void save(task._id, { endDate: value });
                    }}
                  />
                </div>
                {data.isOwner ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-11 w-11 text-muted-foreground hover:text-rose-600 sm:static sm:h-7 sm:w-7 sm:justify-self-end"
                    disabled={busy === task._id}
                    aria-label={`Supprimer la phase ${task.name}`}
                    onClick={async () => {
                      try {
                        await deleteTask({ taskId: task._id });
                        toast.success("Phase supprimée.");
                      } catch (error: any) {
                        toast.error(error?.message ?? "Suppression impossible.");
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <span className="hidden sm:block" />
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-dashed border-emerald-500/40 p-3 sm:grid-cols-[minmax(0,1fr)_140px_140px_auto] sm:items-center sm:p-2.5">
              <Input
                className="col-span-2 h-9 text-xs sm:col-span-1 sm:h-8"
                placeholder="Nouvelle phase (ex. Clôture)"
                aria-label="Nom de la nouvelle phase"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
              <div className="col-span-2 min-w-0 space-y-0.5 sm:col-span-1">
                <span className="block text-[10px] text-muted-foreground sm:hidden">Début</span>
                <Input
                  type="date"
                  aria-label="Début de la nouvelle phase"
                  className="h-9 w-full text-xs sm:h-8"
                  value={draft.startDate}
                  onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                />
              </div>
              <div className="col-span-2 min-w-0 space-y-0.5 sm:col-span-1">
                <span className="block text-[10px] text-muted-foreground sm:hidden">Fin</span>
                <Input
                  type="date"
                  aria-label="Fin de la nouvelle phase"
                  className="h-9 w-full text-xs sm:h-8"
                  value={draft.endDate}
                  onChange={(event) => setDraft({ ...draft, endDate: event.target.value })}
                />
              </div>
              <Button
                size="sm"
                className="col-span-2 h-10 w-full gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-500 sm:col-span-1 sm:h-8 sm:w-auto"
                disabled={!draft.name.trim() || busy === "new"}
                onClick={async () => {
                  setBusy("new");
                  try {
                    await addTask({
                      siteId,
                      name: draft.name.trim(),
                      startDate: fromIso(draft.startDate),
                      endDate: fromIso(draft.endDate),
                    });
                    setDraft({ name: "", startDate: isoDate(Date.now()), endDate: isoDate(Date.now() + 14 * DAY) });
                    toast.success("Phase ajoutée au planning.");
                  } catch (error: any) {
                    toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Ajout impossible.");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// SUIVI QUOTIDIEN
// ============================================================================
function DailyTab({ data, siteId }: { data: SiteData; siteId: Id<"siteProjects"> }) {
  const addLog = useMutation(api.siteTracking.addDailyLog);
  const deleteLog = useMutation(api.siteTracking.deleteDailyLog);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    date: isoDate(Date.now()),
    activities: "",
    role: "",
    count: "",
    hours: "",
    observations: "",
    issues: "",
  });

  const submit = async () => {
    if (!form.activities.trim()) {
      toast.error("Décrivez les travaux réalisés.");
      return;
    }
    setBusy(true);
    try {
      await addLog({
        siteId,
        date: fromIso(form.date),
        activities: form.activities.trim(),
        workers: form.role.trim() && Number(form.count) > 0 ? [{ role: form.role.trim(), count: Number(form.count) }] : [],
        hoursWorked: Number(form.hours) || 0,
        observations: form.observations.trim() || undefined,
        issues: form.issues.trim() || undefined,
      });
      setForm({ date: isoDate(Date.now()), activities: "", role: "", count: "", hours: "", observations: "", issues: "" });
      toast.success("Suivi quotidien enregistré.");
    } catch (error: any) {
      toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nouvelle journée</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[11px]">Date</Label>
            <Input type="date" className="h-8 text-xs" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Travaux réalisés *</Label>
            <Textarea
              rows={3}
              className="text-xs"
              value={form.activities}
              onChange={(event) => setForm({ ...form, activities: event.target.value })}
              placeholder="Coulage de la dalle du RDC, pose des rails…"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Corps de métier</Label>
              <Input className="h-8 text-xs" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Maçon" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Effectif</Label>
              <Input type="number" min={0} className="h-8 text-xs" value={form.count} onChange={(event) => setForm({ ...form, count: event.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Heures</Label>
              <Input type="number" min={0} step="0.5" className="h-8 text-xs" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Points bloquants</Label>
              <Input className="h-8 text-xs" value={form.issues} onChange={(event) => setForm({ ...form, issues: event.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Observations</Label>
            <Input className="h-8 text-xs" value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} />
          </div>
          <Button className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500" size="sm" disabled={busy} onClick={submit}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Enregistrer la journée
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Journal des travaux ({data.dailyLogs.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.dailyLogs.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun suivi enregistré pour l'instant.</p>
          )}
          {data.dailyLogs.map((log) => (
            <div key={log._id} className="rounded-lg border border-border/50 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">{formatSiteDate(log.date)}</p>
                  <p className="mt-0.5 whitespace-pre-line break-words text-xs">{log.activities}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer le suivi du ${formatSiteDate(log.date)}`}
                  className="h-11 w-11 shrink-0 text-muted-foreground hover:text-rose-600 sm:h-6 sm:w-6"
                  onClick={async () => {
                    try {
                      await deleteLog({ logId: log._id });
                    } catch (error: any) {
                      toast.error(error?.message ?? "Suppression impossible.");
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                {log.workers.length > 0 && <span>{log.workers.map((worker) => `${worker.count} ${worker.role}`).join(" · ")}</span>}
                <span>{log.hoursWorked} h</span>
                {log.observations && <span>{log.observations}</span>}
                {log.issues && <span className="text-rose-600 dark:text-rose-400">⚠ {log.issues}</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// BUDGET
// ============================================================================
function BudgetTab({ data, siteId }: { data: SiteData; siteId: Id<"siteProjects"> }) {
  const addExpense = useMutation(api.siteTracking.addExpense);
  const deleteExpense = useMutation(api.siteTracking.deleteExpense);
  const budget = data.budget;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    label: "",
    category: "gros_oeuvre",
    nature: "materiaux" as ExpenseNature,
    amount: "",
    date: isoDate(Date.now()),
    supplier: "",
  });

  // Base de comparaison « prévu / réel » : la plus grande des deux valeurs,
  // jamais zéro (division sûre), pour des barres proportionnelles lisibles.
  const revisedBudget = budget?.revised ?? data.site.budgetInitial ?? 0;
  const spentBudget = budget?.spent ?? 0;
  const budgetBaseline = Math.max(revisedBudget, spentBudget, 1);

  const submit = async () => {
    if (!form.label.trim() || Number(form.amount) <= 0) {
      toast.error("Libellé et montant positif sont obligatoires.");
      return;
    }
    setBusy(true);
    try {
      await addExpense({
        siteId,
        label: form.label.trim(),
        category: form.category,
        nature: form.nature,
        amount: Number(form.amount),
        date: fromIso(form.date),
        supplier: form.supplier.trim() || undefined,
      });
      setForm({ label: "", category: form.category, nature: form.nature, amount: "", date: isoDate(Date.now()), supplier: "" });
      toast.success("Dépense enregistrée.");
    } catch (error: any) {
      toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi icon={Wallet} label="Budget révisé" value={formatTND(budget?.revised ?? data.site.budgetInitial)} />
        <Kpi icon={TrendingDown} label="Dépensé" value={formatTND(budget?.spent ?? 0)} hint={`${budget?.consumedPct ?? 0} % du budget`} />
        <Kpi
          icon={BarChart3}
          label="Écart"
          value={formatTND(budget?.variance ?? 0)}
          tone={(budget?.variance ?? 0) < 0 ? "bad" : "good"}
        />
        <Kpi icon={Package} label="Matériaux livrés" value={formatTND(budget?.materialsDeliveredValue ?? 0)} />
      </div>

      {/* Comparaison budgétaire : deux barres de même base, lisibles même sur
          un écran de 320 px (aucune largeur fixe, montants en TND tabulaires). */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Budget prévisionnel vs dépenses réelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="min-w-0 truncate">Budget révisé</span>
              <span className="shrink-0 font-medium tabular-nums">{formatTND(revisedBudget)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, Math.round((revisedBudget / budgetBaseline) * 100))}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="min-w-0 truncate">Dépenses réelles</span>
              <span className="shrink-0 font-medium tabular-nums">{formatTND(spentBudget)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${spentBudget > revisedBudget ? "bg-rose-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(100, Math.round((spentBudget / budgetBaseline) * 100))}%` }}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {budget
              ? `${budget.consumedPct} % du budget consommé${spentBudget > revisedBudget ? " — dépassement" : ""}.`
              : "Montants non communiqués avec vos droits actuels."}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dépenses ({data.expenses.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.expenses.length === 0 && <p className="text-xs text-muted-foreground">Aucune dépense enregistrée.</p>}
            {[...data.expenses]
              .sort((a, b) => b.date - a.date)
              .map((expense) => (
                // Une dépense = une carte : libellé et montant sur la première
                // ligne, métadonnées et action sur la seconde.
                <div key={expense._id} className="rounded-xl border border-border/50 p-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 break-words font-medium">{expense.label}</p>
                    <span className="shrink-0 font-semibold tabular-nums">{formatTND(expense.amount)}</span>
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="min-w-0 text-[10px] leading-relaxed text-muted-foreground">
                      {formatSiteDate(expense.date)} · {EXPENSE_CATEGORY_LABELS[expense.category as ExpenseCategory] ?? expense.category} ·{" "}
                      {EXPENSE_NATURE_LABELS[expense.nature as ExpenseNature] ?? expense.nature}
                      {expense.supplier ? ` · ${expense.supplier}` : ""}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Supprimer la dépense ${expense.label}`}
                      className="h-11 w-11 shrink-0 text-muted-foreground hover:text-rose-600 sm:h-6 sm:w-6"
                      onClick={async () => {
                        try {
                          await deleteExpense({ expenseId: expense._id });
                        } catch (error: any) {
                          toast.error(error?.message ?? "Suppression impossible.");
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Nouvelle dépense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input className="h-8 text-xs" placeholder="Libellé *" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {EXPENSE_CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={form.nature} onValueChange={(value) => setForm({ ...form, nature: value as ExpenseNature })}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["materiaux", "main_oeuvre", "equipement", "autre"] as ExpenseNature[]).map((nature) => (
                      <SelectItem key={nature} value={nature}>
                        {EXPENSE_NATURE_LABELS[nature]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="col-span-2 h-8 text-xs tabular-nums sm:col-span-1"
                  placeholder="Montant (TND) *"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                />
                <Input
                  type="date"
                  className="col-span-2 h-8 w-full text-xs sm:col-span-1"
                  aria-label="Date de la dépense"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                />
              </div>
              <Input className="h-8 text-xs" placeholder="Fournisseur (optionnel)" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} />
              <Button className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500" size="sm" disabled={busy} onClick={submit}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Ajouter la dépense
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Répartition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(budget?.byCategory ?? []).length === 0 && <p className="text-xs text-muted-foreground">Aucune dépense.</p>}
              {(budget?.byCategory ?? []).map((row) => (
                <div key={row.category} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>{row.label}</span>
                    <span className="text-muted-foreground">
                      {formatTND(row.amount)} · {row.sharePct} %
                    </span>
                  </div>
                  <Progress value={row.sharePct} className="h-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MATÉRIAUX
// ============================================================================
function MaterialsTab({ data, siteId }: { data: SiteData; siteId: Id<"siteProjects"> }) {
  const addMaterial = useMutation(api.siteTracking.addMaterial);
  const updateMaterial = useMutation(api.siteTracking.updateMaterial);
  const deleteMaterial = useMutation(api.siteTracking.deleteMaterial);
  const importMaterials = useMutation(api.siteTracking.importMaterialsFromLinkedProject);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "u", plannedQty: "", unitPrice: "" });

  const save = async (materialId: string, patch: Record<string, unknown>) => {
    try {
      await updateMaterial({ materialId: materialId as Id<"siteMaterials">, ...(patch as any) });
      toast.success("Matériau mis à jour.");
    } catch (error: any) {
      toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Mise à jour impossible.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
            Suivi des approvisionnements
            {data.site.projectId && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await importMaterials({ siteId });
                    toast.success(`${result.imported ?? 0} ligne(s) importée(s) depuis l'estimation.`);
                  } catch (error: any) {
                    toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Import impossible.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Download className="h-3 w-3" /> Importer le DQE
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {data.materials.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aucun matériau suivi. Ajoutez une ligne ou importez le DQE de l'estimation liée.
            </p>
          )}
          {data.materials.map((material) => {
            const line = materialLine(material);
            return (
              <div key={material._id} className="rounded-lg border border-border/50 p-2.5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {material.name} <span className="text-muted-foreground">({material.unit})</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Prévu {material.plannedQty} · stock {Math.max(0, material.deliveredQty - material.consumedQty)} · couverture{" "}
                      {line.coveragePct} %
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        line.alert === "rupture"
                          ? "border-rose-500/40 text-rose-700 dark:text-rose-300"
                          : line.alert === "sous_commande"
                            ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
                            : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {line.alertLabel}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Supprimer le matériau ${material.name}`}
                      className="h-11 w-11 text-muted-foreground hover:text-rose-600 sm:h-6 sm:w-6"
                      onClick={async () => {
                        try {
                          await deleteMaterial({ materialId: material._id });
                        } catch (error: any) {
                          toast.error(error?.message ?? "Suppression impossible.");
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([
                    ["orderedQty", "Commandé"],
                    ["deliveredQty", "Livré"],
                    ["consumedQty", "Consommé"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">{label}</Label>
                      <Input
                        type="number"
                        min={0}
                        defaultValue={(material as any)[key]}
                        className="h-7 text-xs"
                        onBlur={(event) => {
                          const value = Number(event.target.value);
                          if (Number.isFinite(value) && value !== (material as any)[key]) void save(material._id, { [key]: value });
                        }}
                      />
                    </div>
                  ))}
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Prix unitaire</Label>
                    <Input
                      type="number"
                      min={0}
                      defaultValue={material.unitPrice}
                      className="h-7 text-xs"
                      onBlur={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value) && value !== material.unitPrice) void save(material._id, { unitPrice: value });
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ajouter un matériau</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_80px_110px_120px_auto] sm:items-end">
          <Input
            className="col-span-2 h-9 text-xs sm:col-span-1 sm:h-8"
            placeholder="Désignation"
            aria-label="Désignation du matériau"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            className="h-9 text-xs sm:h-8"
            placeholder="Unité"
            aria-label="Unité du matériau"
            value={form.unit}
            onChange={(event) => setForm({ ...form, unit: event.target.value })}
          />
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            className="h-9 text-xs tabular-nums sm:h-8"
            placeholder="Qté prévue"
            aria-label="Quantité prévue"
            value={form.plannedQty}
            onChange={(event) => setForm({ ...form, plannedQty: event.target.value })}
          />
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            className="col-span-2 h-9 text-xs tabular-nums sm:col-span-1 sm:h-8"
            placeholder="Prix unitaire (TND)"
            aria-label="Prix unitaire en dinars"
            value={form.unitPrice}
            onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
          />
          <Button
            size="sm"
            className="col-span-2 h-10 w-full gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-500 sm:col-span-1 sm:h-8 sm:w-auto"
            disabled={!form.name.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await addMaterial({
                  siteId,
                  name: form.name.trim(),
                  unit: form.unit.trim() || "u",
                  plannedQty: Number(form.plannedQty) || 0,
                  unitPrice: Number(form.unitPrice) || 0,
                });
                setForm({ name: "", unit: "u", plannedQty: "", unitPrice: "" });
                toast.success("Matériau ajouté.");
              } catch (error: any) {
                toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Ajout impossible.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// INTERVENANTS
// ============================================================================
function TeamTab({ data, siteId }: { data: SiteData; siteId: Id<"siteProjects"> }) {
  const addStakeholder = useMutation(api.siteTracking.addStakeholder);
  const removeStakeholder = useMutation(api.siteTracking.removeStakeholder);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "chef_chantier",
    company: "",
    phone: "",
    email: "",
    permissions: ["progress", "daily"] as string[],
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Équipe du chantier ({data.stakeholders.length})</CardTitle>
          {!data.isOwner && (
            <p className="text-[11px] text-muted-foreground">
              Vous consultez les intervenants. Seul le responsable peut les ajouter ou modifier leurs droits.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {data.stakeholders.length === 0 && <p className="text-xs text-muted-foreground">Aucun intervenant enregistré.</p>}
          {data.stakeholders.map((stakeholder) => (
            <div key={stakeholder._id} className="rounded-lg border border-border/50 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {stakeholder.name}{" "}
                    <span className="text-muted-foreground">
                      · {STAKEHOLDER_ROLES.find((role) => role.value === stakeholder.role)?.label ?? stakeholder.role}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {[stakeholder.company, stakeholder.phone, stakeholder.email].filter(Boolean).join(" · ") || "Coordonnées non renseignées"}
                  </p>
                </div>
                {data.isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Retirer ${stakeholder.name} du chantier`}
                    className="h-11 w-11 shrink-0 text-muted-foreground hover:text-rose-600 sm:h-6 sm:w-6"
                    onClick={async () => {
                      try {
                        await removeStakeholder({ stakeholderId: stakeholder._id });
                        toast.success("Intervenant retiré.");
                      } catch (error: any) {
                        toast.error(error?.message ?? "Suppression impossible.");
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {stakeholder.permissions.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">Lecture seule</span>
                )}
                {stakeholder.permissions.map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-[9px]">
                    {PERMISSIONS.find((item) => item.key === permission)?.label ?? permission}
                  </Badge>
                ))}
                {!stakeholder.userId && stakeholder.email && (
                  <Badge variant="outline" className="text-[9px] text-muted-foreground">
                    En attente d'inscription
                  </Badge>
                )}
              </div>
              {/* Contact direct : un geste depuis le téléphone (appel ou e-mail). */}
              {(stakeholder.phone || stakeholder.email) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {stakeholder.phone && (
                    <Button asChild variant="outline" size="sm" className="h-9 flex-1 gap-1.5 text-[11px]">
                      <a href={`tel:${stakeholder.phone}`}>
                        <Phone className="h-3.5 w-3.5" /> Appeler
                      </a>
                    </Button>
                  )}
                  {stakeholder.email && (
                    <Button asChild variant="outline" size="sm" className="h-9 flex-1 gap-1.5 text-[11px]">
                      <a href={`mailto:${stakeholder.email}`}>
                        <Mail className="h-3.5 w-3.5" /> E-mail
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {data.isOwner && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ajouter un intervenant</CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Un intervenant accède au chantier sans payer de cotisation, uniquement dans les limites cochées.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input className="h-8 text-xs" placeholder="Nom *" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAKEHOLDER_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className="h-8 text-xs" placeholder="Société" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-8 text-xs" placeholder="Téléphone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <Input className="h-8 text-xs" placeholder="E-mail" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div className="space-y-1.5 rounded-lg border border-border/50 p-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Permissions</p>
              {PERMISSIONS.map((permission) => {
                const checked = form.permissions.includes(permission.key);
                return (
                  <label key={permission.key} className="flex cursor-pointer items-start gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                      checked={checked}
                      onChange={() =>
                        setForm({
                          ...form,
                          permissions: checked
                            ? form.permissions.filter((key) => key !== permission.key)
                            : [...form.permissions, permission.key],
                        })
                      }
                    />
                    <span>
                      <span className="font-medium">{permission.label}</span>
                      <span className="block text-[10px] text-muted-foreground">{permission.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <Button
              className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
              size="sm"
              disabled={!form.name.trim() || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await addStakeholder({
                    siteId,
                    name: form.name.trim(),
                    role: form.role as any,
                    company: form.company.trim() || undefined,
                    phone: form.phone.trim() || undefined,
                    email: form.email.trim() || undefined,
                    permissions: form.permissions as any,
                  });
                  toast.success(
                    result.linkedToAccount
                      ? "Intervenant ajouté : il retrouvera ce chantier dans son espace."
                      : "Intervenant ajouté. Il sera rattaché dès son inscription avec cet e-mail.",
                  );
                  setForm({ name: "", role: "chef_chantier", company: "", phone: "", email: "", permissions: ["progress", "daily"] });
                } catch (error: any) {
                  toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Ajout impossible.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Ajouter
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// QUALITÉ
// ============================================================================
function QualityTab({ data, siteId }: { data: SiteData; siteId: Id<"siteProjects"> }) {
  const addInspection = useMutation(api.siteTracking.addInspection);
  const updateInspection = useMutation(api.siteTracking.updateInspection);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    phaseKey: data.tasks[0]?.phaseKey ?? "",
    date: isoDate(Date.now()),
    inspector: "",
    findings: "",
    status: "pending",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Contrôles qualité ({data.inspections.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.inspections.length === 0 && <p className="text-xs text-muted-foreground">Aucun contrôle enregistré.</p>}
          {[...data.inspections]
            .sort((a, b) => b.date - a.date)
            .map((inspection) => (
              <div key={inspection._id} className="rounded-lg border border-border/50 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{inspection.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSiteDate(inspection.date)} · {inspection.inspector} ·{" "}
                      {data.tasks.find((task) => task.phaseKey === inspection.phaseKey)?.name ?? inspection.phaseKey}
                    </p>
                  </div>
                  <Select
                    value={inspection.status}
                    onValueChange={async (value) => {
                      try {
                        await updateInspection({ inspectionId: inspection._id, status: value as any });
                        toast.success("Statut du contrôle mis à jour.");
                      } catch (error: any) {
                        toast.error(error?.message ?? "Mise à jour impossible.");
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 w-[104px] shrink-0 text-[11px] sm:h-7 sm:w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">À réaliser</SelectItem>
                      <SelectItem value="passed">Conforme</SelectItem>
                      <SelectItem value="failed">Non conforme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {inspection.findings && (
                  <p className="mt-1 break-words text-[11px] text-muted-foreground">{inspection.findings}</p>
                )}
                {inspection.reservations.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {inspection.reservations.map((reservation, index) => (
                      <label key={`${reservation.label}-${index}`} className="flex items-center gap-1.5 text-[10px]">
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-emerald-600"
                          checked={reservation.resolved}
                          onChange={async () => {
                            const reservations = inspection.reservations.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, resolved: !row.resolved } : row,
                            );
                            try {
                              await updateInspection({ inspectionId: inspection._id, reservations: reservations as any });
                            } catch (error: any) {
                              toast.error(error?.message ?? "Mise à jour impossible.");
                            }
                          }}
                        />
                        <span className={reservation.resolved ? "text-muted-foreground line-through" : ""}>
                          {reservation.label} · {reservation.severity}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nouveau contrôle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input className="h-8 text-xs" placeholder="Intitulé *" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <Select value={form.phaseKey} onValueChange={(value) => setForm({ ...form, phaseKey: value })}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="Phase contrôlée" />
            </SelectTrigger>
            <SelectContent>
              {data.tasks.map((task) => (
                <SelectItem key={task._id} value={task.phaseKey}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              className="col-span-2 h-8 w-full text-xs sm:col-span-1"
              aria-label="Date du contrôle"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
            <Input
              className="col-span-2 h-8 text-xs sm:col-span-1"
              placeholder="Inspecteur *"
              value={form.inspector}
              onChange={(event) => setForm({ ...form, inspector: event.target.value })}
            />
          </div>
          <Textarea rows={2} className="text-xs" placeholder="Constats" value={form.findings} onChange={(event) => setForm({ ...form, findings: event.target.value })} />
          <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">À réaliser</SelectItem>
              <SelectItem value="passed">Conforme</SelectItem>
              <SelectItem value="failed">Non conforme</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
            size="sm"
            disabled={!form.title.trim() || !form.inspector.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await addInspection({
                  siteId,
                  title: form.title.trim(),
                  phaseKey: form.phaseKey || "general",
                  date: fromIso(form.date),
                  inspector: form.inspector.trim(),
                  findings: form.findings.trim() || undefined,
                  status: form.status as any,
                });
                setForm({ ...form, title: "", findings: "" });
                toast.success("Contrôle qualité enregistré.");
              } catch (error: any) {
                toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Enregistrement impossible.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// PRÉVISIONS & RISQUES
// ============================================================================
function RiskTab({ data }: { data: SiteData }) {
  const risk = data.risk;
  const tone = RISK_TONES[risk.riskLevel] ?? RISK_TONES.faible;
  const rows = [
    { label: "Avancement constaté", value: `${risk.schedule.actualProgressPct} %`, hint: "mesuré sur les phases saisies" },
    { label: "Avancement attendu", value: `${risk.schedule.plannedProgressPct} %`, hint: "d'après le planning" },
    { label: "Indice de délai (SPI)", value: risk.schedule.spi ? risk.schedule.spi.toFixed(2) : "—", hint: risk.schedule.spi < 1 ? "en retard" : "dans les temps" },
    { label: "Tâches en retard", value: String(risk.schedule.lateTaskCount), hint: risk.schedule.lateTasks.slice(0, 3).join(", ") || "aucune" },
    {
      label: "Fin projetée (prévision)",
      value: risk.schedule.projectedEndDate ? formatSiteDate(risk.schedule.projectedEndDate) : "non calculable",
      hint: risk.schedule.delayDays > 0 ? `+${risk.schedule.delayDays} jour(s) vs prévu` : "sous réserve des prochaines données",
    },
    {
      label: "Coût final projeté (prévision)",
      value: risk.budget.projectedFinalCost != null ? formatTND(risk.budget.projectedFinalCost) : "non calculable",
      hint: risk.budget.projectedVariance != null ? `écart ${formatTND(risk.budget.projectedVariance)}` : "avancement insuffisant",
    },
  ];

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${tone.className}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> {tone.label} — {risk.riskScore}/100
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              Fiabilité de la prévision : {risk.confidence} · calculée le {formatSiteDate(risk.computedAt)}
            </p>
          </div>
          <div className="w-full max-w-[220px]">
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className={`h-full ${tone.bar}`} style={{ width: `${risk.riskScore}%` }} />
            </div>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-white/50 p-2 text-[10px] dark:bg-black/20">
          <Info className="mt-0.5 h-3 w-3 shrink-0" /> {RISK_DISCLAIMER}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-border/50 bg-card p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
            <p className="mt-0.5 text-sm font-semibold">{row.value}</p>
            {row.hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{row.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Constats (données réelles)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {risk.causes.length === 0 && <p className="text-muted-foreground">Aucun signal anormal détecté sur les données saisies.</p>}
            {risk.causes.map((cause, index) => (
              <p key={index} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> {cause}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recommandations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {risk.recommendations.length === 0 && (
              <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Aucune action prioritaire : poursuivez le suivi quotidien.
              </p>
            )}
            {risk.recommendations.map((recommendation, index) => (
              <p key={index} className="flex items-start gap-2">
                <ArrowRightIcon /> {recommendation}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
      →
    </span>
  );
}
