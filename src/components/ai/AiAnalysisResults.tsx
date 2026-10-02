import { useState } from "react";
import { useNavigate } from "react-router";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Sparkles, HardHat, Loader2, PiggyBank, Zap, Check, X, Info, Layers,
  TrendingDown, TrendingUp, Minus, Wand2, Gauge, CalendarDays, BadgeCheck,
  Crown, CircleDollarSign, CircleDot, Store, Trophy, FileDown, Package,
  Hammer, Truck, Trash2, Boxes, Percent, ChevronDown, ChevronUp,
  ShieldCheck, Lightbulb, ArrowRight, ListChecks, Ruler, ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { RecommendResult, MaterialScores, CostSummary, Solution } from "@/convex/aiMaterialsEngine";
import { generateMaterialReportPdf } from "@/lib/materialReportPdf";
import { SupplierRecommendedCard } from "@/components/SupplierRecommendedCard";
import { categorySpecialties } from "@/lib/supplierMatch";
import { useAuth } from "@/hooks/use-auth";
import { usePdfGate } from "@/hooks/use-pdf-gate";

// ═══════════════════════════════════════════════════════════════════════════
// OUTILS D'AFFICHAGE — aucun calcul métier : les valeurs affichées proviennent
// exclusivement du moteur IA (aiMaterialsEngine). Seules les mises en forme
// (unités, séparateurs, proportions visuelles) sont faites ici.
// ═══════════════════════════════════════════════════════════════════════════

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Montant TND. 3 décimales pour les prix unitaires, 0 pour les totaux (lisibilité). */
const fmtTnd = (n: number, digits = 3) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);

const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("fr-TN", { maximumFractionDigits: digits }).format(n);

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// ── Palette de statut (une seule source de vérité pour les tons) ────────────
type Tone = "emerald" | "blue" | "violet" | "amber" | "rose" | "slate";

const TONE: Record<Tone, { text: string; bar: string; ring: string; chip: string; tile: string }> = {
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    ring: "stroke-emerald-500",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    tile: "border-emerald-500/30 bg-emerald-500/[0.06]",
  },
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
    ring: "stroke-blue-500",
    chip: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    tile: "border-blue-500/30 bg-blue-500/[0.06]",
  },
  violet: {
    text: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
    ring: "stroke-violet-500",
    chip: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    tile: "border-violet-500/30 bg-violet-500/[0.06]",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    ring: "stroke-amber-500",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    tile: "border-amber-500/30 bg-amber-500/[0.06]",
  },
  rose: {
    text: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    ring: "stroke-rose-500",
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    tile: "border-rose-500/30 bg-rose-500/[0.06]",
  },
  slate: {
    text: "text-slate-600 dark:text-slate-300",
    bar: "bg-slate-400",
    ring: "stroke-slate-400",
    chip: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
    tile: "border-border/50 bg-muted/20",
  },
};

/** Ton d'un score 0-100 : vert ≥ 80, bleu ≥ 60, ambre ≥ 40, rouge sinon. */
function toneForScore(score: number): Tone {
  if (score >= 80) return "emerald";
  if (score >= 60) return "blue";
  if (score >= 40) return "amber";
  return "rose";
}

const PROFILE_META: Record<string, { label: string; tone: Tone; icon: LucideIcon; badge: string }> = {
  economique: { label: "Standard", tone: "emerald", icon: TrendingDown, badge: "Meilleur prix" },
  equilibre: { label: "Équilibrée", tone: "blue", icon: Minus, badge: "Meilleur rapport qualité/prix" },
  premium: { label: "Premium", tone: "violet", icon: TrendingUp, badge: "Meilleure performance" },
};

const profileMeta = (profile: string) =>
  PROFILE_META[profile] ?? { label: profile, tone: "slate" as Tone, icon: CircleDot, badge: "" };

const CRITERIA: { key: keyof MaterialScores; label: string }[] = [
  { key: "prix", label: "Prix" },
  { key: "qualite", label: "Qualité" },
  { key: "durabilite", label: "Durabilité" },
  { key: "isolationThermique", label: "Isolation therm." },
  { key: "isolationAcoustique", label: "Isolation acoust." },
  { key: "resistance", label: "Résistance" },
  { key: "entretien", label: "Entretien" },
  { key: "disponibilite", label: "Disponibilité" },
  { key: "impactEnvironnemental", label: "Impact env." },
];

/** Critères mis en avant dans la carte solution (le reste est dépliable). */
const HEADLINE_CRITERIA_KEYS: (keyof MaterialScores)[] = [
  "prix",
  "qualite",
  "durabilite",
  "isolationThermique",
];

/** Décomposition du coût — ordre et libellés officiels de la grille de prix. */
const COST_PARTS: {
  key: "materials" | "pose" | "transport" | "waste" | "accessories" | "tva";
  label: string;
  short: string;
  icon: LucideIcon;
  bar: string;
}[] = [
  { key: "materials", label: "Matériaux", short: "Matériaux", icon: Package, bar: "bg-emerald-500" },
  { key: "pose", label: "Pose / main-d'œuvre", short: "Pose", icon: Hammer, bar: "bg-teal-500" },
  { key: "transport", label: "Transport", short: "Transport", icon: Truck, bar: "bg-sky-500" },
  { key: "waste", label: "Déchets / chutes", short: "Déchets", icon: Trash2, bar: "bg-amber-500" },
  { key: "accessories", label: "Accessoires", short: "Accessoires", icon: Boxes, bar: "bg-violet-500" },
  { key: "tva", label: "TVA 19 %", short: "TVA", icon: Percent, bar: "bg-slate-400" },
];

// ═══════════════════════════════════════════════════════════════════════════
// BRIQUES D'INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/** Titre de section : icône teintée + titre + sous-titre + zone d'action. */
function SectionHeading({
  icon: Icon,
  tone = "emerald",
  title,
  subtitle,
  right,
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
          TONE[tone].chip,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold tracking-tight sm:text-base">{title}</h2>
        {subtitle && <p className="text-[11px] leading-snug text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** Métrique clé : libellé, valeur, précision. */
function Metric({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/40 bg-background/70 px-3 py-2.5", className)}>
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold tabular-nums", tone ? TONE[tone].text : "text-foreground")}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Anneau de score (0-100) — indicateur visuel principal d'une solution. */
function ScoreRing({
  value,
  size = 64,
  stroke = 6,
  caption,
}: {
  value: number;
  size?: number;
  stroke?: number;
  caption?: string;
}) {
  const safe = clamp(Math.round(value), 0, 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = toneForScore(safe);
  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - safe / 100)}
            className={TONE[tone].ring}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-sm font-black tabular-nums leading-none", TONE[tone].text)}>
            {safe}
          </span>
          <span className="text-[8px] font-medium text-muted-foreground">/100</span>
        </div>
      </div>
      {caption && (
        <span className="max-w-[82px] text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
          {caption}
        </span>
      )}
    </div>
  );
}

/** Barre de critère technique : libellé, jauge, valeur. */
function CriterionBar({ label, value }: { label: string; value: number }) {
  const safe = clamp(value, 0, 100);
  const tone = toneForScore(safe);
  return (
    <div className="flex items-center gap-2">
      <span className="w-[92px] shrink-0 truncate text-[10px] text-muted-foreground sm:w-[118px]">
        {label}
      </span>
      <span className="h-1.5 min-w-6 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full transition-all", TONE[tone].bar)}
          style={{ width: `${safe}%` }}
        />
      </span>
      <span className={cn("w-6 shrink-0 text-right text-[10px] font-bold tabular-nums", TONE[tone].text)}>
        {safe}
      </span>
    </div>
  );
}

/** Carte d'une solution matériau (Standard / Équilibrée / Premium). */
function SolutionCard({
  solution,
  isRecommended,
  isCheapest,
  isBestValue,
  isBestPerformance,
}: {
  solution: Solution;
  isRecommended: boolean;
  isCheapest: boolean;
  isBestValue: boolean;
  isBestPerformance: boolean;
}) {
  const [showAllCriteria, setShowAllCriteria] = useState(false);
  const meta = profileMeta(solution.profile);
  const material = solution.material;
  const headline = CRITERIA.filter((c) => HEADLINE_CRITERIA_KEYS.includes(c.key));
  const criteria = showAllCriteria ? CRITERIA : headline;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-3.5 transition-all",
        isRecommended
          ? "border-emerald-500/50 bg-emerald-500/[0.05] ring-1 ring-emerald-500/20"
          : "border-border/40 bg-background",
      )}
    >
      {isRecommended && (
        <Badge className="absolute -top-2 left-3 gap-1 border-emerald-500/40 bg-emerald-500 text-[9px] text-white">
          <Sparkles className="h-2.5 w-2.5" /> Recommandé par IA
        </Badge>
      )}

      {/* En-tête : profil + note globale */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <meta.icon className={cn("h-3.5 w-3.5 shrink-0", TONE[meta.tone].text)} />
            <span className={cn("text-xs font-bold uppercase tracking-wide", TONE[meta.tone].text)}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug">{material.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {material.brand ? `${material.brand} · ` : ""}
            {solution.qualityScore10}/10 qualité
          </p>
        </div>
        <ScoreRing value={solution.scores.noteGlobale} size={56} stroke={5} />
      </div>

      {/* Statuts comparatifs */}
      <div className="mt-2 flex flex-wrap gap-1">
        {isCheapest && (
          <Badge variant="outline" className={cn("gap-1 text-[8px]", TONE.emerald.chip)}>
            <TrendingDown className="h-2.5 w-2.5" /> Meilleur prix
          </Badge>
        )}
        {isBestValue && (
          <Badge variant="outline" className={cn("gap-1 text-[8px]", TONE.blue.chip)}>
            <BadgeCheck className="h-2.5 w-2.5" /> Meilleur rapport qualité/prix
          </Badge>
        )}
        {isBestPerformance && (
          <Badge variant="outline" className={cn("gap-1 text-[8px]", TONE.violet.chip)}>
            <Crown className="h-2.5 w-2.5" /> Meilleure performance
          </Badge>
        )}
      </div>

      {/* Métriques clés : prix unitaire, quantité, coût matériau, coût total */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric
          label="Prix unitaire"
          value={
            <>
              {fmtTnd(material.band.avg)}
              <span className="text-[9px] font-normal text-muted-foreground"> /{material.unit}</span>
            </>
          }
          hint={`${fmtTnd(material.band.min)} – ${fmtTnd(material.band.max)}`}
        />
        <Metric
          label="Quantité"
          value={fmtNum(material.quantity)}
          hint={material.quantityUnit}
        />
        <Metric label="Coût matériau" value={fmtTnd(material.materialCost, 0)} tone="slate" />
        <Metric
          label="Total (pose incl.)"
          value={fmtTnd(material.totalCost, 0)}
          tone={isRecommended ? "emerald" : undefined}
          className={isRecommended ? TONE.emerald.tile : undefined}
        />
      </div>

      {/* Caractéristiques techniques — barres lisibles, détail dépliable */}
      <div className="mt-3 rounded-xl border border-border/40 bg-muted/10 p-2.5">
        <div className="mb-2 flex items-center gap-1.5">
          <Ruler className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Caractéristiques techniques
          </span>
          <button
            type="button"
            onClick={() => setShowAllCriteria((v) => !v)}
            className="ml-auto inline-flex cursor-pointer items-center gap-0.5 text-[9px] font-medium text-primary hover:underline"
          >
            {showAllCriteria ? "Réduire" : `Les 9 critères`}
            {showAllCriteria ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
        <div className="space-y-1.5">
          {criteria.map((c) => (
            <CriterionBar key={c.key} label={c.label} value={solution.scores[c.key]} />
          ))}
        </div>
      </div>

      {/* Justification technique */}
      {solution.justification && (
        <p className="mt-2 border-l-2 border-primary/30 pl-2 text-[10px] italic leading-relaxed text-muted-foreground/90">
          {solution.justification}
        </p>
      )}

      {/* Avantages / points de vigilance */}
      <div className="mt-2.5 grid gap-2">
        {solution.pros.length > 0 && (
          <ul className="space-y-0.5">
            {solution.pros.slice(0, 2).map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" /> {p}
              </li>
            ))}
          </ul>
        )}
        {solution.cons.length > 0 && (
          <ul className="space-y-0.5">
            {solution.cons.slice(0, 2).map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                <X className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" /> {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * TABLEAU RÉCAPITULATIF « CHOIX DES MATÉRIAUX »
 *
 * Une ligne par poste (catégorie) du projet analysé : le matériau retenu, la
 * quantité, le prix unitaire et le prix total. Toutes les valeurs viennent du
 * moteur IA — aucune n'est recalculée ici. Le poste retenu est celui qui sert
 * de base au coût du projet (solution Équilibrée, sinon la première solution),
 * ce qui rend le total du tableau identique au poste « Matériaux » du bloc
 * « Coût estimatif ».
 */
function MaterialsChoiceTable({ result }: { result: RecommendResult }) {
  const rows = result.categories
    .map((cat) => {
      const solution =
        cat.solutions.find((s) => s.profile === "equilibre") ?? cat.solutions[0];
      if (!solution) return null;
      return { categoryId: cat.categoryId, categoryLabel: cat.label, solution };
    })
    .filter((row): row is { categoryId: string; categoryLabel: string; solution: Solution } => row !== null);

  if (rows.length === 0) return null;

  return (
    <section id="choix" className="scroll-mt-24 space-y-3">
      <SectionHeading
        icon={ClipboardList}
        tone="violet"
        title="Choix des matériaux"
        subtitle="Tous les matériaux requis pour le projet — quantités et coûts estimés"
        right={
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Boxes className="h-3 w-3" /> {rows.length} matériau(x)
          </Badge>
        }
      />

      <Card className="overflow-hidden rounded-2xl border-border/40">
        <CardContent className="p-0">
          {/* Tableau desktop / tablette */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/30 bg-muted/40 text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Matériau recommandé</th>
                  <th className="px-3 py-2 text-left font-medium">Nom de l'article</th>
                  <th className="px-3 py-2 text-right font-medium">Quantité</th>
                  <th className="px-3 py-2 text-right font-medium">Prix unitaire</th>
                  <th className="px-3 py-2 text-right font-medium">Prix total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const m = row.solution.material;
                  return (
                    <tr
                      key={row.categoryId}
                      className="border-b border-border/20 transition-colors last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-semibold leading-tight">{row.categoryLabel}</p>
                        <p className="text-[9px] text-muted-foreground">
                          Solution {row.solution.profileLabel} · {row.solution.qualityScore10}/10 qualité
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium leading-tight">{m.name}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {m.brand ? `${m.brand} · ` : ""}
                          {m.availability ? m.availability : `Réf. ${m.id}`}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">
                        {fmtNum(m.quantity)}
                        <span className="text-[9px] font-normal text-muted-foreground">
                          {" "}
                          {m.quantityUnit}
                        </span>
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums"
                        title={`Fourchette constatée : ${fmtTnd(m.band.min)} – ${fmtTnd(m.band.max)}`}
                      >
                        {fmtTnd(m.band.avg)}
                        <span className="text-[9px] text-muted-foreground"> /{m.unit}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums text-primary">
                        {fmtTnd(m.materialCost, 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-500/[0.06]">
                  <td colSpan={4} className="px-3 py-3 text-right text-[11px] font-semibold">
                    Total matériaux (Σ Quantité × Prix unitaire)
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtTnd(result.cost.materials, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cartes mobiles (WebView) */}
          <ul className="divide-y divide-border/20 md:hidden">
            {rows.map((row) => {
              const m = row.solution.material;
              return (
                <li key={row.categoryId} className="px-3.5 py-3">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {row.categoryLabel}
                  </p>
                  <p className="text-xs font-semibold leading-snug">{m.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    Solution {row.solution.profileLabel} · {row.solution.qualityScore10}/10 qualité
                    {m.brand ? ` · ${m.brand}` : ""}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Metric label="Quantité" value={fmtNum(m.quantity)} hint={m.quantityUnit} />
                    <Metric label="Prix unitaire" value={fmtTnd(m.band.avg)} hint={`/${m.unit}`} />
                    <Metric
                      label="Prix total"
                      value={fmtTnd(m.materialCost, 0)}
                      tone="emerald"
                      className={TONE.emerald.tile}
                    />
                  </div>
                </li>
              );
            })}
            <li className="flex items-center justify-between bg-emerald-500/[0.06] px-3.5 py-3">
              <span className="text-[11px] font-semibold">Total matériaux</span>
              <span className="text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmtTnd(result.cost.materials, 0)}
              </span>
            </li>
          </ul>

          <p className="border-t border-border/25 bg-muted/[0.08] px-3 py-2 text-[9px] leading-relaxed text-muted-foreground">
            Prix total = <b>Quantité × Prix unitaire</b>. Les prix proviennent du catalogue 2026 et
            des offres fournisseurs recensées. La pose, le transport, les déchets, les accessoires
            et la TVA 19 % sont détaillés dans « Coût estimatif ».
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RÉSULTATS DE L'ANALYSE MATÉRIAUX IA (page dédiée)
// ═══════════════════════════════════════════════════════════════════════════
export function AiAnalysisResults({
  result,
  analysisRegion,
}: {
  result: RecommendResult;
  /** Région (code) du projet analysé — pré-remplit le filtre région de l'annuaire. */
  analysisRegion?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Téléchargement PDF : contrôle centralisé (réservé au forfait payant Client Pro).
  const pdfGate = usePdfGate();
  const optimizeCopilotBudget = useAction(api.aiMaterialsActions.optimizeCopilotBudget);
  const improveCopilotPerformance = useAction(api.aiMaterialsActions.improveCopilotPerformance);

  const [optimization, setOptimization] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  // Budget par défaut (85 % du total estimé)
  const [budgetInput, setBudgetInput] = useState(() =>
    Math.max(1000, Math.round(result.cost.total * 0.85)),
  );

  const runOptimize = async () => {
    if (!result || budgetInput <= 0) return;
    setBusy((b) => ({ ...b, optimize: true }));
    try {
      const res = await optimizeCopilotBudget({ result, budgetAmount: budgetInput });
      setOptimization(res);
      toast.success(`Économie potentielle : ${fmtTnd(res.savings, 0)}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setBusy((b) => ({ ...b, optimize: false }));
  };

  const runPerformance = async () => {
    if (!result) return;
    setBusy((b) => ({ ...b, performance: true }));
    try {
      const res = await improveCopilotPerformance({ result });
      setPerformance(res);
      toast.success(
        res.improvements.length
          ? `${res.improvements.length} amélioration(s) suggérée(s)`
          : "Aucune amélioration nécessaire — votre sélection est déjà performante.",
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
    setBusy((b) => ({ ...b, performance: false }));
  };

  const handlePdf = () => {
    pdfGate.requestPdfDownload(() => {
      try {
        generateMaterialReportPdf({
          result,
          optimization: optimization || undefined,
          performance: performance || undefined,
        });
        toast.success("Rapport PDF généré.");
      } catch (err: any) {
        toast.error("Erreur PDF : " + err.message);
      }
    });
  };

  const meta = profileMeta(result.recommendation.solution);
  const cost: CostSummary = result.cost;

  // Répartition visuelle du coût (proportions des seuls montants envoyés par
  // le moteur — aucune valeur n'est recalculée).
  const costParts = COST_PARTS.map((part) => ({ ...part, value: cost[part.key] }));
  const partsSum = costParts.reduce((acc, p) => acc + p.value, 0) || 1;
  const rangeSpan = Math.max(1, cost.max - cost.min);
  const rangePos = clamp(((cost.total - cost.min) / rangeSpan) * 100, 0, 100);

  const sections = [
    { id: "choix", label: "Choix des matériaux" },
    { id: "synthese", label: "Synthèse" },
    { id: "cout", label: "Coût estimatif" },
    { id: "categories", label: "Catégories" },
    { id: "outils", label: "Outils IA" },
  ];

  return (
    <div className="space-y-6">
      {pdfGate.dialog}

      {/* ══ CHOIX DES MATÉRIAUX — récapitulatif, au-dessus de la recommandation ═ */}
      <MaterialsChoiceTable result={result} />

      {/* ══ 1. SYNTHÈSE — la réponse en un coup d'œil ═══════════════════════ */}
      <section id="synthese" className="scroll-mt-24">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden rounded-2xl border-emerald-500/25 bg-gradient-to-br from-emerald-50/70 via-background to-teal-50/40 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/10">
            <CardContent className="space-y-4 p-4 sm:p-6">
              {/* Statut + action principale */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("gap-1.5", TONE.emerald.chip)}>
                  <Sparkles className="h-3 w-3" /> Notre recommandation
                </Badge>
                <Badge variant="outline" className="gap-1.5 text-[10px]">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> Données catalogue 2026
                </Badge>
                <Badge variant="outline" className="gap-1.5 text-[10px]">
                  <CalendarDays className="h-3 w-3" /> {fmtDate(result.generatedAt)}
                </Badge>
                <Button size="sm" variant="outline" className="ml-auto h-8 gap-1.5 text-xs" onClick={handlePdf}>
                  <FileDown className="h-3.5 w-3.5" />
                  Rapport PDF
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                {/* Recommandation */}
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <ScoreRing value={result.recommendation.score} size={68} caption="Score IA" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Solution retenue
                      </p>
                      <h1 className="text-lg font-black tracking-tight sm:text-2xl">
                        Solution {meta.label}
                      </h1>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {result.recommendation.materialName}
                        {result.recommendation.categoryLabel
                          ? ` · ${result.recommendation.categoryLabel}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {result.recommendation.explanation && (
                    <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                      {result.recommendation.explanation}
                    </p>
                  )}

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {result.recommendation.advantages.length > 0 && (
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-2.5">
                        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          <Check className="h-3 w-3" /> Points forts
                        </p>
                        <ul className="space-y-1">
                          {result.recommendation.advantages.slice(0, 3).map((a, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
                              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" /> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.recommendation.limits.length > 0 && (
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-2.5">
                        <p className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          <Info className="h-3 w-3" /> Points de vigilance
                        </p>
                        <ul className="space-y-1">
                          {result.recommendation.limits.slice(0, 3).map((l, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
                              <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" /> {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Coût en un coup d'œil */}
                <div className="rounded-2xl border border-border/40 bg-background/70 p-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Coût total estimatif
                  </p>
                  <p className="mt-0.5 text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-3xl">
                    {fmtTnd(cost.total, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtTnd(cost.perM2, 0)} / m² construit · {cost.currency}
                  </p>

                  {/* Position du total dans la fourchette min → max */}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>Minimum</span>
                      <span>Maximum</span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-gradient-to-r from-emerald-500/30 via-emerald-500/60 to-amber-500/50">
                      <span
                        className="absolute -top-1 h-3.5 w-1 rounded-full bg-foreground"
                        style={{ left: `calc(${rangePos}% - 2px)` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-semibold tabular-nums">
                      <span className="text-muted-foreground">{fmtTnd(cost.min, 0)}</span>
                      <span className="text-muted-foreground">{fmtTnd(cost.max, 0)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 border-t border-border/30 pt-2.5 text-[10px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    Prix du marché : {fmtDate(cost.priceDate || result.generatedAt)}
                  </div>
                </div>
              </div>

              {/* Navigation rapide entre les sections (utile sur mobile) */}
              <nav aria-label="Sections du résultat" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="shrink-0 rounded-full border border-border/50 bg-background/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ══ 2. COÛT ESTIMATIF DÉTAILLÉ ═════════════════════════════════════ */}
      <section id="cout" className="scroll-mt-24 space-y-3">
        <SectionHeading
          icon={CircleDollarSign}
          tone="emerald"
          title="Coût estimatif détaillé"
          subtitle="Matériaux · Pose · Transport · Déchets · Accessoires · TVA 19 %"
          right={
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Gauge className="h-3 w-3" /> {fmtTnd(cost.total, 0)} TTC
            </Badge>
          }
        />

        <Card className="overflow-hidden rounded-2xl border-border/40">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Metric
                label="Total estimé (probable)"
                value={<span className="text-base">{fmtTnd(cost.total, 0)}</span>}
                hint="TTC, TVA 19 % incluse"
                tone="emerald"
                className={TONE.emerald.tile}
              />
              <Metric
                label="Prix au m² construit"
                value={fmtTnd(cost.perM2, 0)}
                hint="Base surface couverte du projet"
              />
              <Metric
                label="Fourchette d'estimation"
                value={`${fmtTnd(cost.min, 0)} – ${fmtTnd(cost.max, 0)}`}
                hint="Minimum – maximum constatés"
                className="col-span-2 sm:col-span-1"
              />
            </div>

            {/* Répartition : barre empilée + légende détaillée */}
            <div className="rounded-xl border border-border/40 bg-muted/[0.08] p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers className="h-3 w-3" /> Répartition du coût
              </p>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                {costParts.map((p) => (
                  <span
                    key={p.key}
                    className={cn("h-full", p.bar)}
                    style={{ width: `${(p.value / partsSum) * 100}%` }}
                    title={`${p.label} — ${fmtTnd(p.value, 0)}`}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {costParts.map((p) => (
                  <div key={p.key} className="rounded-lg border border-border/35 bg-background/70 px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", p.bar)} />
                      <span className="truncate text-[9px] font-medium text-muted-foreground">
                        {p.short}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-bold tabular-nums">{fmtTnd(p.value, 0)}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {Math.round((p.value / partsSum) * 100)} %
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {result.missingData.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <Info className="h-3 w-3" /> Données non disponibles (signalées, jamais inventées)
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {result.missingData.map((m, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                      <Minus className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" /> {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ══ 3. RECOMMANDATIONS PAR CATÉGORIE ═══════════════════════════════ */}
      <section id="categories" className="scroll-mt-24 space-y-3">
        <SectionHeading
          icon={Layers}
          tone="blue"
          title="Recommandations par catégorie"
          subtitle="3 solutions comparées par catégorie — prix, performances et fournisseur"
          right={
            <Badge variant="outline" className="gap-1 text-[10px]">
              <ListChecks className="h-3 w-3" /> {result.categories.length} catégorie(s)
            </Badge>
          }
        />

        <div className="space-y-4">
          {result.categories.map((cat, catIndex) => {
            const recProfile = result.recommendation.solution;
            const cheapest = [...cat.solutions].sort(
              (a, b) => a.material.band.avg - b.material.band.avg,
            )[0];
            const bestPerf = [...cat.solutions].sort(
              (a, b) =>
                b.scores.isolationThermique +
                b.scores.isolationAcoustique -
                (a.scores.isolationThermique + a.scores.isolationAcoustique),
            )[0];
            return (
              <motion.div
                key={cat.categoryId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(catIndex * 0.04, 0.2) }}
              >
                <Card className="overflow-hidden rounded-2xl border-border/40">
                  {/* En-tête catégorie : identité + statuts */}
                  <CardHeader className="space-y-2.5 border-b border-border/25 px-4 py-3.5 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border", TONE.blue.chip)}>
                        <HardHat className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-bold tracking-tight sm:text-base">
                          {cat.label}
                        </CardTitle>
                        <CardDescription className="text-[10px]">
                          {cat.candidatesCount} matériaux analysés dans la base
                          {cat.coverage ? "" : " · couverture de prix partielle"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn("gap-1 text-[9px]", TONE.blue.chip)}>
                        <CircleDot className="h-2.5 w-2.5" />
                        Meilleur rapport qualité/prix : {profileMeta(cat.bestValue).label}
                      </Badge>
                      {cat.bestSupplier && (
                        <Badge variant="outline" className={cn("gap-1 text-[9px]", TONE.amber.chip)}>
                          <Trophy className="h-2.5 w-2.5" />
                          {cat.bestSupplier.name} — dès {fmtTnd(cat.bestSupplier.price)}
                          {cat.bestSupplier.governorate ? ` · ${cat.bestSupplier.governorate}` : ""}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3.5 p-4 sm:p-5">
                    {/* Comparaison des 3 solutions */}
                    <div className="grid gap-3 md:grid-cols-3">
                      {cat.solutions.map((s) => (
                        <SolutionCard
                          key={s.profile}
                          solution={s}
                          isRecommended={s.profile === recProfile}
                          isCheapest={!!cheapest && s.material.id === cheapest.material.id}
                          isBestValue={cat.bestValue === s.profile}
                          isBestPerformance={
                            !!bestPerf &&
                            s.material.id === bestPerf.material.id &&
                            s.profile !== cat.bestValue
                          }
                        />
                      ))}
                    </div>

                    {/* Fournisseur recommandé pour la solution équilibrée */}
                    {(() => {
                      const equilibreSol = cat.solutions.find((s) => s.profile === "equilibre");
                      if (!equilibreSol) return null;
                      const mat = equilibreSol.material;
                      return (
                        <div>
                          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <Store className="h-3 w-3" /> Fournisseur recommandé
                          </p>
                          <SupplierRecommendedCard
                            categoryKey={cat.categoryId}
                            categoryLabel={cat.label}
                            materials={[
                              {
                                name: mat.name,
                                quantity: mat.quantity ?? 0,
                                unit: mat.quantityUnit ?? "",
                              },
                            ]}
                            currentUserId={user?._id as string | undefined}
                          />
                        </div>
                      );
                    })()}

                    {/* Annuaire pré-filtré : région du projet + spécialité */}
                    {(() => {
                      const specs = categorySpecialties([cat.categoryId]);
                      if (specs.length === 0) return null;
                      const params = new URLSearchParams();
                      params.set("from", "materials");
                      params.set("specialty", specs.join(","));
                      if (analysisRegion) params.set("region", analysisRegion);
                      return (
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-full justify-center gap-1.5 text-[11px] font-medium text-primary border-primary/25 hover:bg-primary/5 sm:w-auto"
                            onClick={() => navigate(`/dashboard/suppliers-directory?${params.toString()}`)}
                          >
                            <Store className="h-3 w-3" />
                            Voir tous les fournisseurs — {cat.label}
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })()}

                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ══ 4. OUTILS IA ═══════════════════════════════════════════════════ */}
      <section id="outils" className="scroll-mt-24 space-y-3">
        <SectionHeading
          icon={Wand2}
          tone="violet"
          title="Outils IA"
          subtitle="Ajustez le budget ou poussez la performance énergétique de votre sélection"
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Optimiser le budget */}
          <Card className="overflow-hidden rounded-2xl border-border/40">
            <CardHeader className="border-b border-border/25 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border", TONE.amber.chip)}>
                  <PiggyBank className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Optimiser mon budget</CardTitle>
                  <CardDescription className="text-[10px]">
                    Réduire le coût sans dégrader qualité, sécurité et confort
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="number"
                  min={1000}
                  value={budgetInput || ""}
                  onChange={(e) => setBudgetInput(Number(e.target.value))}
                  placeholder="Budget maximum (TND)"
                  className="h-9 flex-1 rounded-lg text-sm"
                />
                <Button
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 text-xs"
                  disabled={busy.optimize}
                  onClick={runOptimize}
                >
                  {busy.optimize ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  Optimiser
                </Button>
              </div>

              {optimization ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Metric label="Budget initial" value={fmtTnd(optimization.originalTotal, 0)} />
                    <Metric
                      label="Budget optimisé"
                      value={fmtTnd(optimization.optimizedTotal, 0)}
                      tone="emerald"
                    />
                    <Metric
                      label="Économie"
                      value={
                        <>
                          {fmtTnd(optimization.savings, 0)}
                          <span className="text-[10px] font-semibold"> ({optimization.savingsPct} %)</span>
                        </>
                      }
                      tone="emerald"
                      className={TONE.emerald.tile}
                    />
                  </div>
                  {optimization.changes.length > 0 ? (
                    <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
                      {optimization.changes.map((c: any, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 rounded-lg border border-border/35 bg-muted/10 px-2.5 py-1.5 text-[10px] text-muted-foreground"
                        >
                          <TrendingDown className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                          <span>
                            <b className="text-foreground">{c.categoryLabel}</b> : {c.from}
                            <ArrowRight className="inline h-2.5 w-2.5" /> {c.to} (−{fmtTnd(c.saving, 0)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-lg border border-border/35 bg-muted/10 px-2.5 py-2 text-[10px] text-muted-foreground">
                      Aucune substitution nécessaire : votre sélection est déjà au meilleur rapport
                      valeur/prix.
                    </p>
                  )}
                  {optimization.summary && (
                    <p className="text-[10px] italic text-muted-foreground">{optimization.summary}</p>
                  )}
                  <p className="flex items-start gap-1.5 text-[9px] italic text-amber-700 dark:text-amber-400/80">
                    <Lightbulb className="mt-0.5 h-2.5 w-2.5 shrink-0" /> {optimization.note}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Indiquez votre budget maximum puis lancez l'optimisation : l'IA propose les
                  substitutions les plus économiques pour chaque catégorie.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Améliorer la performance */}
          <Card className="overflow-hidden rounded-2xl border-border/40">
            <CardHeader className="border-b border-border/25 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border", TONE.blue.chip)}>
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Améliorer la performance</CardTitle>
                  <CardDescription className="text-[10px]">
                    Réduire les pertes thermiques et le besoin de climatisation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <Button
                size="sm"
                className="h-9 w-full gap-1.5 text-xs sm:w-auto"
                disabled={busy.performance}
                onClick={runPerformance}
              >
                {busy.performance ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                Analyser les améliorations
              </Button>

              {performance ? (
                <div className="space-y-2.5">
                  {performance.improvements.length > 0 ? (
                    <>
                      <ul className="space-y-1.5">
                        {performance.improvements.map((imp: any, i: number) => (
                          <li
                            key={i}
                            className={cn("rounded-xl border px-3 py-2", TONE.blue.tile)}
                          >
                            <p className="text-[11px] font-semibold">
                              {imp.categoryLabel} : {imp.from}
                              <ArrowRight className="inline h-3 w-3 text-muted-foreground" /> {imp.to}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {imp.benefit}
                            </p>
                            <Badge variant="outline" className={cn("mt-1.5 gap-1 text-[9px]", TONE.emerald.chip)}>
                              <TrendingDown className="h-2.5 w-2.5" /> économie estimée{" "}
                              {imp.estimatedSavingPct} %
                            </Badge>
                          </li>
                        ))}
                      </ul>
                      <ul className="space-y-0.5">
                        {performance.assumptions.map((a: string, i: number) => (
                          <li key={i} className="flex items-start gap-1 text-[9px] italic text-muted-foreground/80">
                            <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" /> {a}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="rounded-lg border border-border/35 bg-muted/10 px-2.5 py-2 text-[10px] text-muted-foreground">
                      Aucune amélioration nécessaire : votre sélection est déjà la plus performante
                      sur le plan thermique et acoustique.
                    </p>
                  )}
                  <p className="text-[9px] italic text-muted-foreground/70">{performance.note}</p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Lancez l'analyse pour identifier les substitutions qui améliorent l'isolation et
                  le confort de votre projet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-start gap-1.5 rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5 text-[10px] text-muted-foreground/80">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
          Les prix proviennent du catalogue 2026 et des offres fournisseurs recensées — aucune
          valeur n'est estimée sans source. Pour les éléments structurels, la validation d'un
          professionnel qualifié reste requise.
        </div>
      </section>
    </div>
  );
}
