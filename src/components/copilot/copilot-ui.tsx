import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Copy,
  Cpu,
  FileText,
  GraduationCap,
  History,
  Plus,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Construction AI Copilot — primitives d'interface partagées
// (utilisées par la page /dashboard/copilot et le panneau embarqué dans la
// page de résultat d'estimation de construction)
// ============================================================================

export const QUICK_COMMANDS = [
  { label: "Analyse mon projet", icon: Brain, prompt: "Analyse mon projet : points forts, risques et recommandations" },
  { label: "Vérifie mon budget", icon: FileText, prompt: "Vérifie mon budget et propose-moi des optimisations" },
  { label: "Compare les matériaux", icon: Zap, prompt: "Compare les matériaux de mon projet (3 solutions : économique, optimale, premium)" },
  { label: "Recherche les fournisseurs", icon: Building2, prompt: "Recherche des fournisseurs près de ma région pour mon projet" },
  { label: "Prévois les coûts", icon: Sparkles, prompt: "Prévois l'évolution des coûts et des prix des matériaux pour mon projet" },
  { label: "Vérifie les retards", icon: History, prompt: "Vérifie les risques de retard de mon chantier et donne-moi un plan d'action" },
];

export const SUGGESTED_QUESTIONS = [
  "Quel isolant dois-je choisir pour mon projet ?",
  "Combien de béton faut-il pour une dalle de 150 m² avec 20 cm d'épaisseur ?",
  "Quel est le prix au m² de mon projet ?",
  "Quelles sont les 3 meilleures solutions de revêtement de sol ?",
  "Quel est le risque de dépassement de mon budget ?",
];

export const LEVELS = [
  { key: "simple", label: "Simple", icon: GraduationCap },
  { key: "pro", label: "Professionnel", icon: Briefcase },
  { key: "expert", label: "Expert", icon: Cpu },
] as const;

export type Level = (typeof LEVELS)[number]["key"];

const RELIABILITY_BADGES = [
  "DONNÉE VÉRIFIÉE",
  "ESTIMATION",
  "PRÉVISION IA",
  "RECOMMANDATION",
  "HYPOTHÈSE",
];

const RELIABILITY_STYLE: Record<string, string> = {
  "DONNÉE VÉRIFIÉE": "bg-emerald-100 text-emerald-700 border-emerald-200/60",
  "ESTIMATION": "bg-amber-100 text-amber-700 border-amber-200/60",
  "PRÉVISION IA": "bg-violet-100 text-violet-700 border-violet-200/60",
  "RECOMMANDATION": "bg-blue-100 text-blue-700 border-blue-200/60",
  "HYPOTHÈSE": "bg-slate-100 text-slate-600 border-slate-200/60",
};

// ── Bus d'actions simples (évite un context lourd) ─────────────────────────
export type ActionHandler = (a: { key: string; label: string }) => void;
let actionBus: ActionHandler | null = null;
export function useActionBus() {
  return { onAction: (a: { key: string; label: string }) => actionBus?.(a) };
}
export function setActionBus(h: ActionHandler | null) {
  actionBus = h;
}

// ── Rendu markdown simplifié ───────────────────────────────────────────────

interface SplitContent {
  body: string[];
  sources: string[];
  actions: { key: string; label: string }[];
}

function splitAssistantContent(content: string): SplitContent {
  const lines = content.split("\n");
  const body: string[] = [];
  const sources: string[] = [];
  const actions: { key: string; label: string }[] = [];
  let section: "body" | "sources" | "actions" = "body";
  for (const line of lines) {
    const t = line.trim();
    if (/^\[SOURCES\]/i.test(t)) {
      section = "sources";
      continue;
    }
    if (/^\[ACTIONS\]/i.test(t)) {
      section = "actions";
      continue;
    }
    if (section === "sources") {
      const m = line.match(/^[-*]\s*(?:Source|source):\s*(.+)$/);
      if (m) sources.push(m[1].trim());
      else if (t) body.push(line);
      continue;
    }
    if (section === "actions") {
      const m = line.match(/^[-*]\s*action:(\w+):(.+)$/);
      if (m) actions.push({ key: m[1], label: m[2].trim() });
      else if (t) body.push(line);
      continue;
    }
    body.push(line);
  }
  return { body, sources, actions };
}

/** Rendu très léger du markdown produit par l'IA (gras, listes, tableaux, badges). */
export function MarkdownLite({ text, onAction }: { text: string; onAction?: ActionHandler }) {
  const { body, sources, actions } = useMemo(() => splitAssistantContent(text), [text]);
  return (
    <div className="space-y-2 text-[13px] leading-relaxed">
      {body.map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-1.5" />;
        // Titres
        const heading = t.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          return (
            <p key={i} className={cn("font-semibold pt-1", heading[1].length >= 3 ? "text-[13px]" : "text-sm")}>
              <InlineRich text={heading[2]} />
            </p>
          );
        }
        // Ligne d'action / escalade
        if (/^⚠/.test(t)) {
          return (
            <div key={i} className="flex items-start gap-1.5 rounded-lg border border-amber-300/50 bg-amber-50/70 dark:bg-amber-950/20 px-2.5 py-2 text-[12px] text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span><InlineRich text={t.replace(/^⚠\s*/, "")} /></span>
            </div>
          );
        }
        // Tableaux markdown
        if (t.startsWith("|") && t.endsWith("|")) {
          const row = t
            .split("|")
            .map((c) => c.trim())
            .filter((c) => c && !/^[-:]+$/.test(c));
          if (row.length > 1) {
            // Ligne d'en-tête ou séparateur
            if (/^[-:]+$/.test(row[0])) return <div key={i} className="h-1" />;
            const isHeader = i === 0 || /[-]{2,}/.test(body[i + 1] ?? "");
            return (
              <div key={i} className={cn("flex gap-1.5", isHeader && "font-semibold")}>
                {row.map((c, j) => (
                  <span key={j} className="flex-1 min-w-0 px-1.5 py-0.5 rounded bg-muted/40 text-[11px]">
                    <InlineRich text={c} />
                  </span>
                ))}
              </div>
            );
          }
        }
        // Listes à puces
        const bullet = t.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70 mt-1.5 shrink-0" />
              <span className="min-w-0 flex-1"><InlineRich text={bullet[1]} /></span>
            </div>
          );
        }
        // Listes numérotées
        const num = t.match(/^\d+[.)]\s+(.+)$/);
        if (num) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[11px] font-semibold text-primary/80 mt-px shrink-0 tabular-nums">{t.match(/^\d+/)?.[0]}.</span>
              <span className="min-w-0 flex-1"><InlineRich text={num[1]} /></span>
            </div>
          );
        }
        return (
          <p key={i}>
            <InlineRich text={t} />
          </p>
        );
      })}
      {sources.length > 0 && (
        <div className="pt-2 border-t border-border/40 mt-2">
          <p className="label-overline mb-1.5">Sources</p>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                <BookOpen className="h-2.5 w-2.5" />
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {actions.length > 0 && (
        <div className="pt-2 border-t border-border/40 mt-2 flex flex-wrap gap-1.5">
          {actions.map((a, i) => (
            <ActionChip key={i} action={a} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionChip({ action, onAction }: { action: { key: string; label: string }; onAction?: ActionHandler }) {
  const ctx = useActionBus();
  const handle = onAction ?? ctx.onAction;
  const icons: Record<string, any> = {
    compare: Zap,
    calc: Sparkles,
    suppliers: Building2,
    report: FileText,
    memory: Brain,
  };
  const Icon = icons[action.key] ?? Zap;
  return (
    <button
      onClick={() => handle(action)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 hover:border-primary/40 active:scale-[0.98] transition-all cursor-pointer"
    >
      <Icon className="h-3 w-3" />
      {action.label}
    </button>
  );
}

function InlineRich({ text }: { text: string }) {
  // Badges de fiabilité
  const badge = RELIABILITY_BADGES.find((b) => text.includes(`[${b}]`));
  if (badge) {
    const parts = text.split(`[${badge}]`);
    return (
      <>
        <InlineRich text={parts[0]} />
        <span className={cn("mx-1 inline-flex rounded-full border px-1.5 py-px align-middle text-[9px] font-bold tracking-wide", RELIABILITY_STYLE[badge])}>
          {badge}
        </span>
        {parts[1] && <InlineRich text={parts[1]} />}
      </>
    );
  }
  // Gras **...**
  if (text.includes("**")) {
    const parts = text.split("**");
    return (
      <>
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-semibold">{p}</strong>
          ) : (
            <InlineRich key={i} text={p} />
          ),
        )}
      </>
    );
  }
  // Italique _..._
  if (text.includes("_")) {
    const parts = text.split("_");
    if (parts.length === 3) {
      return (
        <>
          <InlineRich text={parts[0]} />
          <em className="text-muted-foreground">{parts[1]}</em>
          <InlineRich text={parts[2]} />
        </>
      );
    }
  }
  // Code inline
  if (text.includes("`")) {
    const parts = text.split("`");
    return (
      <>
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <code key={i} className="rounded bg-muted px-1 py-px font-mono text-[11px]">{p}</code>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </>
    );
  }
  return <>{text}</>;
}

// ── Avatar copilote ─────────────────────────────────────────────────────────

export function BotAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground mt-0.5">
      <Bot className="h-4 w-4" />
    </div>
  );
}

// ── Ligne de message ────────────────────────────────────────────────────────

export function MessageRow({ message, onCopy }: { message: any; onCopy: (t: string) => void }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}
    >
      {isUser ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
          <User className="h-4 w-4" />
        </div>
      ) : (
        <BotAvatar />
      )}
      <div className={cn("max-w-[86%] sm:max-w-[75%] min-w-0", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl border px-3.5 py-2.5",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground border-primary/30"
              : "rounded-tl-sm bg-card border-border/40 shadow-soft",
          )}
        >
          {isUser ? (
            <>
              {message.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {message.attachments.map((a: any, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-md bg-primary-foreground/15 px-1.5 py-0.5 text-[10px]">
                      <FileText className="h-3 w-3" />
                      <span className="max-w-[120px] truncate">{a.name}</span>
                    </span>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.content}</p>
            </>
          ) : (
            <MarkdownLite text={message.content} />
          )}
        </div>
        <div className={cn("flex items-center gap-1 mt-1 px-1", isUser ? "justify-end" : "justify-start")}>
          {!isUser && (
            <>
              <button
                onClick={() => onCopy(message.content)}
                className="inline-flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <Copy className="h-2.5 w-2.5" /> Copier
              </button>
              <span className="text-muted-foreground/30">·</span>
            </>
          )}
          <span className="text-[9px] text-muted-foreground/50">
            {new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── État vide ───────────────────────────────────────────────────────────────

export function EmptyState({
  hasProject,
  isPremium,
  onPick,
  onNew,
}: {
  hasProject: boolean;
  isPremium: boolean;
  onPick: (q: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center max-w-lg mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground mb-4">
        <Bot className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold tracking-tight">Votre copilote construction</h2>
      <p className="text-[13px] text-muted-foreground mt-1 max-w-md">
        Comprend votre projet, analyse les données de la plateforme, calcule, compare et recommande —
        toujours avec des sources et des niveaux de fiabilité.
      </p>
      <div className="w-full grid sm:grid-cols-2 gap-2 mt-5">
        {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
          <button
            key={q}
            disabled={!isPremium}
            onClick={() => onPick(q)}
            className="text-left rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/[0.04] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>
      {hasProject && (
        <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={onNew}>
          <Plus className="h-3 w-3" />
          Nouvelle conversation
        </Button>
      )}
    </div>
  );
}

// ── Badge verrou (module premium) ───────────────────────────────────────────

export function LockBadge() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40">
      <Sparkles className="h-3.5 w-3.5" />
    </div>
  );
}
