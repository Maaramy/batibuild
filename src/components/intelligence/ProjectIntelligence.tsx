import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, BadgeCheck, Bell, Bot, CalendarDays, ClipboardList,
  FolderOpen, Gauge, Landmark, Loader2, MessageCircleQuestion, Send, ShoppingCart,
  SlidersHorizontal, Sparkles, Trash2, TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProjectLite } from "@/lib/intelligence/engine";
import {
  aggregateAlerts, buildFinanceSnapshot, buildPlanning, buildPurchaseList,
  compareQuotes, computeReadiness, simulateVariants,
  type ExpenseEntry, type PurchaseItem, type QuoteEntry,
} from "@/lib/intelligence/engine";
import {
  askCopilot, COPILOT_SUGGESTED_QUESTIONS, buildCopilotContext, type CopilotAnswer,
} from "@/lib/intelligence/copilot";

// ============================================================================
// HUB « INTELLIGENCE » — couche d'extension Batibuild (EXTEND, DON'T REPLACE)
// ----------------------------------------------------------------------------
// · Consultation/organisation des données EXISTANTES du projet (dossier,
//   finance, achats dérivés du DQE) + extensions persistées dans la table
//   additive `projectIntelligence` (statuts, notes, variantes, devis).
// · AUCUNE donnée d'origine n'est écrite ici : « appliquer une variante » ou
//   toute autre modification passe toujours par une confirmation explicite
//   puis les modules d'origine.
// · Mobile-first : onglets scrollables, cartes empilées, boutons tactiles.
// ============================================================================

type TabKey =
  | "copilot" | "finance" | "variants" | "execution"
  | "purchases" | "quotes" | "folder" | "alerts" | "readiness";

const TABS: { key: TabKey; label: string; icon: typeof Bot }[] = [
  { key: "copilot", label: "Copilote IA", icon: Bot },
  { key: "finance", label: "Suivi financier", icon: Landmark },
  { key: "variants", label: "Variantes", icon: SlidersHorizontal },
  { key: "execution", label: "Guide & Planning", icon: CalendarDays },
  { key: "purchases", label: "Liste d'achat", icon: ShoppingCart },
  { key: "quotes", label: "Comparateur de devis", icon: ClipboardList },
  { key: "folder", label: "Dossier du projet", icon: FolderOpen },
  { key: "alerts", label: "Alertes", icon: Bell },
  { key: "readiness", label: "Préparation", icon: Gauge },
];

interface ProjectIntelligenceProps {
  projectId: Id<"projects">;
  project: ProjectLite;
  projectName: string;
  /** Génère les étapes du guide via le moteur roadmap existant (lecture). */
  roadmapSteps: { id: string; title: string; dureeJours: number; status: string }[];
  /** Prédictions prix existantes (module Intelligence prédictive) si dispo. */
  pricePredictions?: { material: string; trend: string; predictedChangePct: number }[];
}

const fmtCur = (n: number, currency: string) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const LEVEL_STYLES: Record<"info" | "attention" | "important", string> = {
  info: "border-blue-200/40 bg-blue-50/40 text-blue-700",
  attention: "border-amber-200/50 bg-amber-50/50 text-amber-700",
  important: "border-red-200/50 bg-red-50/50 text-red-700",
};

export function ProjectIntelligence({
  projectId, project, projectName, roadmapSteps, pricePredictions,
}: ProjectIntelligenceProps) {
  const intel = useQuery(api.projectIntelligence.getIntelligence, { projectId });
  const setSegment = useMutation(api.projectIntelligence.setSegment);
  const clearSegment = useMutation(api.projectIntelligence.clearSegment);

  const data = (intel?.data ?? {}) as Record<string, unknown>;
  const savedExpenses = (data.finance as { expenses?: ExpenseEntry[] } | undefined)?.expenses ?? [];
  const purchaseStatuses = (data.purchases as { statuses?: Record<string, PurchaseItem["status"]> } | undefined)?.statuses ?? {};
  const variantChoice = (data.variants as { chosen?: string } | undefined)?.chosen;
  const guideProgress = (data.guide as { doneSteps?: string[] } | undefined)?.doneSteps ?? [];
  const planningAnchor = (data.planning as { startDate?: number } | undefined)?.startDate;
  const savedQuotes = (data.quotes as { entries?: QuoteEntry[] } | undefined)?.entries ?? [];
  const dismissedAlerts = (data.dismissedAlerts as { ids?: string[] } | undefined)?.ids ?? [];

  const persist = async (segment: string, value: unknown) => {
    try {
      await setSegment({ projectId, segment, value });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement");
    }
  };

  const currency = project.costEstimate?.currency ?? "TND";
  const surface = project.surface != null ? project.surface * (project.floors ?? 1) : null;

  // ── Vues dérivées (memoïsées — recalcul uniquement si les données changent)
  const finance = useMemo(
    () => buildFinanceSnapshot(project, savedExpenses),
    [project, savedExpenses],
  );
  const purchases = useMemo(
    () => buildPurchaseList(project, purchaseStatuses),
    [project, purchaseStatuses],
  );
  const variants = useMemo(() => simulateVariants(project), [project]);
  const planning = useMemo(
    () => buildPlanning(roadmapSteps, planningAnchor ?? null),
    [roadmapSteps, planningAnchor],
  );
  const comparison = useMemo(() => compareQuotes(savedQuotes), [savedQuotes]);
  const readiness = useMemo(
    () =>
      computeReadiness(project, {
        hasGuideProgress: guideProgress.length > 0,
        hasPlanningAnchor: planningAnchor != null,
        hasPurchases: Object.keys(purchaseStatuses).length > 0,
      }),
    [project, guideProgress, planningAnchor, purchaseStatuses],
  );
  const alerts = useMemo(
    () =>
      aggregateAlerts({
        finance: finance.alertes,
        planning: { lateTasks: planning.lateTasks },
        pricePredictions,
      }).filter((a) => !dismissedAlerts.includes(a.id)),
    [finance, planning, pricePredictions, dismissedAlerts],
  );

  return (
    <Card className="border-violet-200/40 bg-gradient-to-br from-violet-500/[0.02] to-background">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <Sparkles className="h-4 w-4" />
          </span>
          Intelligence projet
        </CardTitle>
        <CardDescription className="text-xs">
          Copilote IA, suivi financier, variantes, planning, achats et alertes —
          construit sur vos données existantes. Rien n'est modifié sans votre
          validation.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="copilot">
          <TabsList className="mb-3 flex h-auto w-full flex-wrap gap-1 overflow-x-auto bg-muted/40 p-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="h-8 gap-1.5 px-2.5 text-[11px] data-[state=active]:bg-background data-[state=active]:text-violet-700"
              >
                <t.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ══════════════ COPILOTE IA ══════════════ */}
          <TabsContent value="copilot" className="mt-0 space-y-3">
            <CopilotTab
              project={project}
              projectName={projectName}
              expenses={savedExpenses}
              currency={currency}
              remainingSteps={planning.tasks
                .filter((t) => t.status !== "done")
                .map((t) => t.title)}
              guideProgressPct={planning.progressPct}
              persist={persist}
            />
          </TabsContent>

          {/* ══════════════ SUIVI FINANCIER ══════════════ */}
          <TabsContent value="finance" className="mt-0">
            <FinanceTab
              projectId={projectId}
              finance={finance}
              surface={surface}
              currency={currency}
              expenses={savedExpenses}
              persist={persist}
            />
          </TabsContent>

          {/* ══════════════ VARIANTES ══════════════ */}
          <TabsContent value="variants" className="mt-0">
            <VariantsTab
              currency={currency}
              variants={variants}
              chosen={variantChoice}
              onChoose={(key) => persist("variants", { chosen: key })}
            />
          </TabsContent>

          {/* ══════════════ GUIDE & PLANNING ══════════════ */}
          <TabsContent value="execution" className="mt-0">
            <ExecutionTab
              projectId={projectId}
              planning={planning}
              guideDone={guideProgress}
              currency={currency}
              persist={persist}
            />
          </TabsContent>

          {/* ══════════════ LISTE D'ACHAT ══════════════ */}
          <TabsContent value="purchases" className="mt-0">
            <PurchasesTab
              projectId={projectId}
              items={purchases}
              currency={currency}
              persist={persist}
            />
          </TabsContent>

          {/* ══════════════ COMPARATEUR DE DEVIS ══════════════ */}
          <TabsContent value="quotes" className="mt-0">
            <QuotesTab
              projectId={projectId}
              quotes={savedQuotes}
              comparison={comparison}
              currency={currency}
              persist={persist}
            />
          </TabsContent>

          {/* ══════════════ DOSSIER DU PROJET ══════════════ */}
          <TabsContent value="folder" className="mt-0">
            <FolderTab project={project} surface={surface} currency={currency} />
          </TabsContent>

          {/* ══════════════ ALERTES ══════════════ */}
          <TabsContent value="alerts" className="mt-0">
            <AlertsTab
              projectId={projectId}
              alerts={alerts}
              dismissedIds={dismissedAlerts}
              persist={persist}
            />
          </TabsContent>

          {/* ══════════════ PRÉPARATION ══════════════ */}
          <TabsContent value="readiness" className="mt-0">
            <ReadinessTab readiness={readiness} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ── Copilote ────────────────────────────────────────────────────────────────

function CopilotTab({
  project, projectName, expenses, currency, remainingSteps, guideProgressPct, persist,
}: {
  project: ProjectLite;
  projectName: string;
  expenses: ExpenseEntry[];
  currency: string;
  remainingSteps: string[];
  guideProgressPct: number;
  persist: (segment: string, value: unknown) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<CopilotAnswer[]>([]);
  const [thinking, setThinking] = useState(false);
  const ctx = useMemo(
    () => buildCopilotContext({ project, projectName, expenses, currency, remainingSteps, guideProgressPct }),
    [project, projectName, expenses, currency, remainingSteps, guideProgressPct],
  );

  const ask = async (q: string) => {
    if (!q.trim()) return;
    setThinking(true);
    setInput("");
    // Analyse locale instantanée (données déjà chargées) — petit délai pour l'UX
    await new Promise((r) => setTimeout(r, 350));
    const answer = askCopilot(q, ctx);
    setAnswers((prev) => [answer, ...prev].slice(0, 8));
    setThinking(false);
    void persist("copilot", { lastQuestion: q, at: Date.now() });
  };

  return (
    <div className="space-y-3">
      {/* Raccourcis */}
      <div className="flex flex-wrap gap-1.5">
        {COPILOT_SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void ask(q)}
            className="rounded-full border border-violet-200/60 bg-violet-500/[0.04] px-2.5 py-1 text-[11px] text-violet-700 transition-colors hover:bg-violet-500/10"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Réponses */}
      <div className="space-y-2">
        {answers.length === 0 && !thinking && (
          <div className="rounded-lg border border-dashed border-violet-200/50 p-4 text-center">
            <Bot className="mx-auto h-6 w-6 text-violet-400" />
            <p className="mt-2 text-xs text-muted-foreground">
              Posez votre question : le copilote analyse les données déjà présentes
              du projet (estimation, DQE, planning, documents) et ne modifie jamais
              rien sans votre validation.
            </p>
          </div>
        )}
        {thinking && (
          <div className="flex items-center gap-2 rounded-lg border border-violet-200/40 bg-violet-500/[0.03] p-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
            Analyse des données du projet…
          </div>
        )}
        {answers.map((a, i) => (
          <div key={i} className="rounded-lg border border-violet-200/40 bg-violet-500/[0.03] p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-violet-600">
              <MessageCircleQuestion className="h-3 w-3" />
              <span className="font-medium">{a.question}</span>
              <Badge variant="outline" className="ml-auto text-[9px]">
                Confiance {a.confidence}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {a.paragraphs.map((p, j) => (
                <p key={j} className="text-xs text-foreground/90">{p}</p>
              ))}
            </div>
            {a.stats.length > 0 && (
              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                {a.stats.map((s, j) => (
                  <div key={j} className="rounded-md border bg-background/60 p-2">
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                    <p className="text-[11px] font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>
            )}
            {a.actionSuggested.kind === "open_tab" && (
              <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <ArrowRight className="h-3 w-3" /> Suggestion (jamais exécutée sans vous) : {a.actionSuggested.label}
              </p>
            )}
            {a.sources.length > 0 && (
              <p className="mt-1.5 text-[9px] text-muted-foreground/60">Sources : {a.sources.join(" · ")}</p>
            )}
          </div>
        ))}
      </div>

      {/* Saisie */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez une question sur ce projet…"
          className="h-9 flex-1 text-xs"
        />
        <Button type="submit" size="sm" className="h-9 gap-1 px-3" disabled={!input.trim()}>
          <Send className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Demander</span>
        </Button>
      </form>
    </div>
  );
}

// ── Suivi financier ─────────────────────────────────────────────────────────

function FinanceTab({
  projectId, finance, surface, currency, expenses, persist,
}: {
  projectId: Id<"projects">;
  finance: ReturnType<typeof buildFinanceSnapshot>;
  surface: number | null;
  currency: string;
  expenses: ExpenseEntry[];
  persist: (segment: string, value: unknown) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [lot, setLot] = useState("general");
  const [kind, setKind] = useState<ExpenseEntry["kind"]>("paid");

  const addExpense = async () => {
    const amt = parseFloat(amount.replace(",", "."));
    if (!label.trim() || !amt || amt <= 0) {
      toast.error("Renseignez un libellé et un montant valide");
      return;
    }
    const entry: ExpenseEntry = {
      id: `exp_${Date.now()}`,
      label: label.trim(),
      amount: Math.round(amt),
      lot,
      date: Date.now(),
      kind,
    };
    await persist("finance", { expenses: [...expenses, entry] });
    setLabel("");
    setAmount("");
    toast.success("Dépense enregistrée");
  };

  const removeExpense = async (id: string) => {
    await persist("finance", { expenses: expenses.filter((e) => e.id !== id) });
  };

  const kpis = [
    { label: "Budget initial", value: finance.budgetInitial != null ? fmtCur(finance.budgetInitial, currency) : "—", color: "text-foreground" },
    { label: "Estimation actuelle", value: finance.estimationActuelle != null ? fmtCur(finance.estimationActuelle, currency) : "—", color: "text-foreground" },
    { label: "Engagées", value: fmtCur(finance.depensesEngagees, currency), color: "text-blue-600" },
    { label: "Réalisées", value: fmtCur(finance.depensesRealisees, currency), color: "text-emerald-600" },
    { label: "Restant", value: finance.montantRestant != null ? fmtCur(finance.montantRestant, currency) : "—", color: "text-foreground" },
    { label: "Coût / m²", value: finance.coutParM2 != null ? fmtCur(finance.coutParM2, currency) : "—", color: "text-foreground" },
  ];

  const consumedPct =
    finance.budgetInitial && finance.budgetInitial > 0
      ? Math.min(100, Math.round((finance.depensesRealisees / finance.budgetInitial) * 100))
      : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border bg-background/50 p-2">
            <p className="text-[9px] text-muted-foreground">{k.label}</p>
            <p className={cn("text-[12px] font-semibold tabular-nums", k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Consommation budget */}
      <div className="rounded-lg border bg-background/50 p-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Budget consommé (dépenses réalisées)</span>
          <span className="font-semibold tabular-nums">{consumedPct} %</span>
        </div>
        <Progress value={consumedPct} className="h-2" />
        {finance.alertes.length > 0 && (
          <div className="mt-2 space-y-1">
            {finance.alertes.slice(0, 3).map((a, i) => (
              <p key={i} className={cn("rounded border px-2 py-1 text-[10px]", LEVEL_STYLES[a.level])}>
                {a.message}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Vue par lot */}
      {finance.parLot.length > 0 && (
        <div className="rounded-lg border bg-background/50 p-3">
          <p className="mb-2 text-[11px] font-semibold">Coût par lot (dérivé du DQE — lecture seule)</p>
          <div className="space-y-1.5">
            {finance.parLot.map((l) => (
              <div key={l.lotId}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="truncate text-muted-foreground">{l.label}</span>
                  <span className="tabular-nums font-medium">{fmtCur(l.budget, currency)} · {l.pctDepense} %</span>
                </div>
                <Progress value={l.pctDepense} className="mt-0.5 h-1.5" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saisie dépense */}
      <div className="rounded-lg border border-dashed p-3">
        <p className="mb-2 text-[11px] font-semibold">Ajouter une dépense</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input placeholder="Libellé" value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 col-span-2 text-xs" />
          <Input placeholder="Montant" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-xs" />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ExpenseEntry["kind"])}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="paid">Réalisée (payée)</option>
            <option value="committed">Engagée (commande)</option>
          </select>
          {finance.parLot.length > 0 && (
            <select
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              className="h-8 col-span-2 rounded-md border bg-background px-2 text-xs sm:col-span-4"
            >
              <option value="general">Général</option>
              {finance.parLot.map((l) => (
                <option key={l.lotId} value={l.lotId}>{l.label}</option>
              ))}
            </select>
          )}
        </div>
        <Button size="sm" className="mt-2 h-8 gap-1 text-[11px]" onClick={() => void addExpense()}>
          + Enregistrer la dépense
        </Button>
      </div>

      {/* Journal */}
      {expenses.length > 0 && (
        <div className="rounded-lg border bg-background/50 p-3">
          <p className="mb-2 text-[11px] font-semibold">Dépenses ({expenses.length})</p>
          <div className="space-y-1">
            {[...expenses].reverse().map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded border bg-background/60 px-2 py-1.5 text-[11px]">
                <Badge variant="outline" className="text-[9px]">{e.kind === "paid" ? "Réalisée" : "Engagée"}</Badge>
                <span className="min-w-0 flex-1 truncate">{e.label}</span>
                <span className="tabular-nums font-medium">{fmtCur(e.amount, currency)}</span>
                <button
                  type="button"
                  onClick={() => void removeExpense(e.id)}
                  className="text-muted-foreground/50 transition-colors hover:text-red-500"
                  aria-label="Supprimer la dépense"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[9px] text-muted-foreground/60">
            Journal de suivi indépendant — le calculateur de coûts et le DQE ne sont jamais modifiés.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Variantes ───────────────────────────────────────────────────────────────

function VariantsTab({
  currency, variants, chosen, onChoose,
}: {
  currency: string;
  variants: ReturnType<typeof simulateVariants>;
  chosen?: string;
  onChoose: (key: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  const chosenVariant = variants.find((v) => v.key === chosen);
  const current = variants.find((v) => v.key === "standard");

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Simulations effectuées sur une <strong>copie</strong> des données du projet —
        le projet original n'est jamais modifié. « Appliquer » ouvre une confirmation
        explicite.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {variants.map((v) => (
          <div
            key={v.key}
            className={cn(
              "rounded-lg border p-3",
              chosen === v.key ? "border-violet-400 bg-violet-500/[0.05]" : "bg-background/50",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">{v.label}</p>
              {chosen === v.key && <Badge className="bg-violet-600 text-[9px]">Choisie</Badge>}
            </div>
            <p className="mt-1 text-[15px] font-bold tabular-nums">{fmtCur(v.totalCost, currency)}</p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {v.costPerM2 ? `${fmtCur(v.costPerM2, currency)}/m² · ` : ""}
              {v.durationDays > 0 ? `${v.durationDays} j · ` : ""}
              {v.deltaVsCurrent !== 0 && (
                <span className={v.deltaVsCurrent < 0 ? "text-emerald-600" : "text-amber-600"}>
                  {v.deltaVsCurrent < 0 ? "" : "+"}
                  {fmtCur(v.deltaVsCurrent, currency)} vs actuel
                </span>
              )}
            </p>
            <p className="mt-1 text-[9px] text-muted-foreground">{v.finishLevel}</p>
            <ul className="mt-1.5 space-y-0.5">
              {v.materialsImpact.map((m) => (
                <li key={m} className="text-[9px] text-muted-foreground">• {m}</li>
              ))}
            </ul>
            <Button
              size="sm"
              variant={chosen === v.key ? "secondary" : "outline"}
              className="mt-2 h-7 w-full text-[10px]"
              onClick={() => setConfirming(v.key)}
            >
              Appliquer cette variante
            </Button>
          </div>
        ))}
      </div>

      {/* Confirmation explicite (jamais automatique) */}
      {confirming && (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Confirmer l'application
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            La variante « {variants.find((v) => v.key === confirming)?.label} » sera
            enregistrée comme choix de référence ({fmtCur(variants.find((v) => v.key === confirming)?.totalCost ?? 0, currency)}).
            Les données d'origine du projet restent intactes — l'estimation du moteur
            existant n'est jamais écrasée.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                void onChoose(confirming).then(() => toast.success("Variante enregistrée comme choix de référence"));
                setConfirming(null);
              }}
            >
              Confirmer
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setConfirming(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {chosenVariant && current && (
        <p className="text-[10px] text-muted-foreground">
          Choix actuel : {chosenVariant.label} ({fmtCur(chosenVariant.totalCost, currency)}) —
          écart vs projet original : {fmtCur(chosenVariant.totalCost - current.totalCost, currency)}.
        </p>
      )}
    </div>
  );
}

// ── Guide & Planning ────────────────────────────────────────────────────────

function ExecutionTab({
  projectId, planning, guideDone, currency, persist,
}: {
  projectId: Id<"projects">;
  planning: ReturnType<typeof buildPlanning>;
  guideDone: string[];
  currency: string;
  persist: (segment: string, value: unknown) => Promise<void>;
}) {
  const setStepStatus = async (stepId: string, status: string) => {
    const next = new Set(guideDone);
    if (status === "done") next.add(stepId);
    else next.delete(stepId);
    await persist("guide", { doneSteps: [...next] });
  };

  const toggleDone = (stepId: string) => setStepStatus(stepId, guideDone.includes(stepId) ? "todo" : "done");

  const setAnchor = async () => {
    await persist("planning", { startDate: Date.now() });
    toast.success("Planning ancré sur la date du jour");
  };

  if (planning.tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
        Générez d'abord la feuille de route du projet (Guide de A à Z, page dédiée) —
        les étapes s'afficheront ici avec planning, dépendances et avancement.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {planning.totalDays} jours estimés
        </Badge>
        <Badge variant="outline" className="text-[10px]">Avancement {planning.progressPct} %</Badge>
        {planning.lateTasks.length > 0 && (
          <Badge className="bg-red-100 text-red-700 text-[10px]">{planning.lateTasks.length} en retard</Badge>
        )}
        <Button size="sm" variant="outline" className="ml-auto h-7 text-[10px]" onClick={() => void setAnchor()}>
          <CalendarDays className="mr-1 h-3 w-3" /> Ancrer à aujourd'hui
        </Button>
      </div>

      {/* Gantt compact */}
      <div className="rounded-lg border bg-background/50 p-3">
        <p className="mb-2 text-[11px] font-semibold">Timeline</p>
        <div className="space-y-1">
          {planning.tasks.map((t) => {
            const left = ((t.startDay - 1) / planning.totalDays) * 100;
            const width = (t.durationDays / planning.totalDays) * 100;
            const done = guideDone.includes(t.id) || t.status === "done";
            const late = planning.lateTasks.includes(t.title);
            return (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-[9px] text-muted-foreground sm:w-40 sm:text-[10px]">{t.title}</span>
                <div className="relative h-3 flex-1 rounded-full bg-muted/40">
                  <div
                    className={cn(
                      "absolute h-3 rounded-full transition-colors",
                      done ? "bg-emerald-500" : late ? "bg-red-400" : "bg-violet-400",
                    )}
                    style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}
                    title={`${t.title} : jours ${t.startDay} à ${t.startDay + t.durationDays - 1}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Étapes avec statut */}
      <div className="space-y-1">
        {planning.tasks.map((t) => {
          const done = guideDone.includes(t.id) || t.status === "done";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => void toggleDone(t.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                done ? "border-emerald-200/60 bg-emerald-50/40" : "bg-background/50 hover:bg-muted/20",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30",
                )}
              >
                {done && "✓"}
              </span>
              <span className={cn("min-w-0 flex-1 truncate text-[11px]", done && "text-muted-foreground line-through")}>
                {t.title}
              </span>
              <span className="text-[9px] text-muted-foreground tabular-nums">{t.durationDays} j</span>
            </button>
          );
        })}
      </div>
      <p className="text-[9px] text-muted-foreground/60">
        Progression enregistrée dans la couche Intelligence — la feuille de route
        existante ({currency}) reste inchangée.
      </p>
    </div>
  );
}

// ── Liste d'achat ───────────────────────────────────────────────────────────

const PURCHASE_STATUS_LABELS: Record<PurchaseItem["status"], string> = {
  to_buy: "À acheter",
  ordered: "Commandé",
  received: "Reçu",
};

function PurchasesTab({
  projectId, items, currency, persist,
}: {
  projectId: Id<"projects">;
  items: PurchaseItem[];
  currency: string;
  persist: (segment: string, value: unknown) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | PurchaseItem["status"]>("all");
  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);

  const setStatus = async (key: string, status: PurchaseItem["status"]) => {
    const statuses = { ...Object.fromEntries(items.map((i) => [i.key, i.status])), [key]: status };
    await persist("purchases", { statuses });
  };

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
        La liste d'achat est dérivée du DQE du projet — générez d'abord l'estimation
        avec quantitatif. Le DQE original n'est jamais modifié : seuls les statuts
        d'achat sont enregistrés ici.
      </p>
    );
  }

  const totalToBuy = items.filter((i) => i.status !== "received").reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "to_buy", "ordered", "received"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] transition-colors",
              filter === f ? "border-violet-400 bg-violet-500/10 text-violet-700" : "text-muted-foreground",
            )}
          >
            {f === "all" ? "Tous" : PURCHASE_STATUS_LABELS[f]}
            <span className="ml-1 tabular-nums opacity-60">
              ({f === "all" ? items.length : items.filter((i) => i.status === f).length})
            </span>
          </button>
        ))}
        <Badge variant="outline" className="ml-auto text-[10px] tabular-nums">
          Reste à acheter : {fmtCur(totalToBuy, currency)}
        </Badge>
      </div>

      <div className="space-y-1">
        {shown.map((i) => (
          <div key={i.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-background/50 px-2.5 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium">{i.designation}</p>
              <p className="text-[9px] text-muted-foreground tabular-nums">
                {i.lotName} · {i.quantity} {i.unit} · PU {fmtCur(i.unitPrice, currency)}
              </p>
            </div>
            <span className="text-[11px] font-semibold tabular-nums">{fmtCur(i.total, currency)}</span>
            <select
              value={i.status}
              onChange={(e) => void setStatus(i.key, e.target.value as PurchaseItem["status"])}
              className={cn(
                "h-7 rounded-md border px-1.5 text-[10px]",
                i.status === "received" ? "bg-emerald-50 text-emerald-700" : i.status === "ordered" ? "bg-blue-50 text-blue-700" : "bg-background",
              )}
            >
              <option value="to_buy">{PURCHASE_STATUS_LABELS.to_buy}</option>
              <option value="ordered">{PURCHASE_STATUS_LABELS.ordered}</option>
              <option value="received">{PURCHASE_STATUS_LABELS.received}</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Comparateur de devis ────────────────────────────────────────────────────

function QuotesTab({
  projectId, quotes, comparison, currency, persist,
}: {
  projectId: Id<"projects">;
  quotes: QuoteEntry[];
  comparison: ReturnType<typeof compareQuotes>;
  currency: string;
  persist: (segment: string, value: unknown) => Promise<void>;
}) {
  const [supplier, setSupplier] = useState("");
  const [total, setTotal] = useState("");
  const [delay, setDelay] = useState("");
  const [labor, setLabor] = useState(true);

  const addQuote = async () => {
    const t = parseFloat(total.replace(",", "."));
    if (!supplier.trim() || !t || t <= 0) {
      toast.error("Renseignez le fournisseur et le total du devis");
      return;
    }
    const entry: QuoteEntry = {
      id: `quote_${Date.now()}`,
      supplierName: supplier.trim(),
      totalAmount: Math.round(t),
      delayDays: delay ? parseInt(delay, 10) : null,
      laborIncluded: labor,
      lines: [], // lignes détaillées optionnelles (comparaison par totaux sinon)
      createdAt: Date.now(),
    };
    await persist("quotes", { entries: [...quotes, entry] });
    setSupplier("");
    setTotal("");
    setDelay("");
    toast.success("Devis ajouté au comparateur");
  };

  const removeQuote = async (id: string) => {
    await persist("quotes", { entries: quotes.filter((q) => q.id !== id) });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input placeholder="Fournisseur" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="h-8 col-span-2 text-xs" />
        <Input placeholder="Total" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="Délai (j)" inputMode="numeric" value={delay} onChange={(e) => setDelay(e.target.value)} className="h-8 text-xs" />
      </div>
      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <input type="checkbox" checked={labor} onChange={(e) => setLabor(e.target.checked)} className="h-3.5 w-3.5" />
        Main-d'œuvre incluse
      </label>
      <Button size="sm" className="h-8 text-[11px]" onClick={() => void addQuote()}>
        + Ajouter un devis
      </Button>

      {quotes.length > 0 && (
        <div className="space-y-1.5">
          {[...quotes].sort((a, b) => a.totalAmount - b.totalAmount).map((q) => (
            <div key={q.id} className="flex items-center gap-2 rounded-lg border bg-background/50 px-2.5 py-2">
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{q.supplierName}</p>
                <p className="text-[9px] text-muted-foreground tabular-nums">
                  {q.delayDays != null ? `${q.delayDays} jours · ` : ""}
                  {q.laborIncluded ? "avec main-d'œuvre" : "sans main-d'œuvre"}
                </p>
              </div>
              <span className="text-[11px] font-semibold tabular-nums">{fmtCur(q.totalAmount, currency)}</span>
              <button type="button" onClick={() => void removeQuote(q.id)} className="text-muted-foreground/50 hover:text-red-500" aria-label="Retirer le devis">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {comparison.findings.length > 0 && (
        <div className="rounded-lg border bg-background/50 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
            <TrendingUp className="h-3 w-3" /> Analyse comparative (aide à la décision —
            aucun fournisseur n'est désigné automatiquement)
          </p>
          <div className="space-y-1">
            {comparison.findings.map((f, i) => (
              <p key={i} className={cn("rounded border px-2 py-1 text-[10px]", LEVEL_STYLES[f.level])}>{f.message}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dossier du projet ───────────────────────────────────────────────────────

function FolderTab({
  project, surface, currency,
}: {
  project: ProjectLite;
  surface: number | null;
  currency: string;
}) {
  const ce = project.costEstimate;
  const dqeLots = project.dqe?.lots ?? [];
  const sections = [
    {
      label: "Estimation des coûts",
      present: !!ce,
      detail: ce ? `${fmtCur(ce.totalCost, currency)}${ce.costPerSquareMeter ? ` · ${fmtCur(ce.costPerSquareMeter, currency)}/m²` : ""}` : "Non générée",
    },
    {
      label: "DQE (devis quantitatif)",
      present: dqeLots.length > 0,
      detail: dqeLots.length > 0 ? `${dqeLots.length} lots · ${fmtCur(project.dqe?.totals?.total ?? 0, currency)}` : "Non généré",
    },
    {
      label: "Plans & documents",
      present: !!project.files?.length,
      detail: project.files?.length ? `${project.files.length} fichier(s) : ${project.files.slice(0, 3).map((f) => f.name).join(", ")}` : "Aucun fichier",
    },
    {
      label: "Fournisseurs & experts",
      present: !!(project.providerRecommendations?.providers?.length),
      detail: `${project.providerRecommendations?.providers?.length ?? 0} prestataire(s) recommandé(s)`,
    },
    {
      label: "Analyse IA",
      present: !!project.aiAnalysis,
      detail: project.aiAnalysis ? `Confiance ${project.category} · durée ${project.aiAnalysis.estimatedDuration ?? "n/c"}` : "Non lancée",
    },
    {
      label: "Région / prix locaux",
      present: !!project.region,
      detail: project.region ?? "Non renseignée",
    },
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground">
        Vue d'organisation des informations déjà disponibles — chaque section renvoie
        au module d'origine (aucune donnée dupliquée ni remplacée).
      </p>
      {sections.map((s) => (
        <div key={s.label} className="flex items-center gap-2 rounded-lg border bg-background/50 px-2.5 py-2">
          {s.present ? (
            <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium">{s.label}</p>
            <p className="truncate text-[9px] text-muted-foreground">{s.detail}</p>
          </div>
        </div>
      ))}
      {surface != null && (
        <p className="pt-1 text-[10px] text-muted-foreground">
          Surface de référence : {surface.toFixed(0)} m² · devise du projet : {currency}
        </p>
      )}
    </div>
  );
}

// ── Alertes ─────────────────────────────────────────────────────────────────

function AlertsTab({
  projectId, alerts, dismissedIds, persist,
}: {
  projectId: Id<"projects">;
  alerts: ReturnType<typeof aggregateAlerts>;
  dismissedIds: string[];
  persist: (segment: string, value: unknown) => Promise<void>;
}) {
  const dismiss = async (id: string) => {
    await persist("dismissedAlerts", { ids: [...dismissedIds, id] });
  };

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <Bell className="mx-auto h-5 w-5 text-emerald-500" />
        <p className="mt-1.5 text-xs text-muted-foreground">Aucune alerte active — tout est sous contrôle.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {alerts.map((a) => (
        <div key={a.id} className={cn("flex items-start gap-2 rounded-lg border px-2.5 py-2", LEVEL_STYLES[a.level])}>
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold">{a.title}</p>
            <p className="text-[10px] opacity-80">{a.detail}</p>
          </div>
          <button type="button" onClick={() => void dismiss(a.id)} className="shrink-0 opacity-50 hover:opacity-100" aria-label="Masquer l'alerte">
            ✕
          </button>
        </div>
      ))}
      <p className="text-[9px] text-muted-foreground/60">
        Les alertes sont des indicateurs dérivés — elles ne modifient jamais les données sources.
      </p>
    </div>
  );
}

// ── Préparation ─────────────────────────────────────────────────────────────

function ReadinessTab({ readiness }: { readiness: ReturnType<typeof computeReadiness> }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-background/50 p-3 text-center">
        <p className={cn(
          "text-2xl font-bold tabular-nums",
          readiness.color === "emerald" ? "text-emerald-600" : readiness.color === "blue" ? "text-blue-600" : readiness.color === "amber" ? "text-amber-600" : "text-red-500",
        )}>
          {readiness.score}/100
        </p>
        <p className="text-xs font-semibold">{readiness.label}</p>
        <Progress value={readiness.score} className="mt-2 h-2" />
      </div>
      <div className="space-y-1">
        {readiness.elements.map((e) => (
          <div key={e.key} className="flex items-center gap-2 rounded-lg border bg-background/50 px-2.5 py-1.5">
            {e.present ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            <span className="min-w-0 flex-1 truncate text-[11px]">{e.label}</span>
            {!e.present && <span className="text-[9px] text-muted-foreground">{e.hint}</span>}
            <Badge variant="outline" className="text-[9px] tabular-nums">{e.weight} pts</Badge>
          </div>
        ))}
      </div>
      {readiness.manquants.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Éléments manquants : {readiness.manquants.join(", ")}. Complétez-les depuis
          leurs modules d'origine — le score se mettra à jour automatiquement.
        </p>
      )}
    </div>
  );
}
