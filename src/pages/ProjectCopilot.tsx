/**
 * COPILOTE AI — page du Dashboard (module indépendant, EXTEND DON'T REPLACE).
 *
 * Assistant intelligent de PROJET : il utilise automatiquement le contexte du
 * projet sélectionné (estimation, DQE, matériaux, plans, parcours, planning,
 * professionnels) et n'invente jamais une donnée absente.
 *
 * - historique de conversation strictement par projet (jamais mélangé) ;
 * - mémoire (préférences/décisions) liée au projet, validée par l'utilisateur ;
 * - toute action modifiante exige une confirmation explicite ;
 * - chaque affirmation qualifiée : Donnée / Calcul / Estimation / Recommandation.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Bot,
  Send,
  Mic,
  ArrowRight,
  Brain,
  Check,
  X,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSelectedProject, projectDisplayLabel } from "@/hooks/use-selected-project";
import { quickSuggestions, type CopilotMode } from "@/convex/aiCopilotEngine";

type FactView = { label: string; value: string; kind: string };
type ActionView = { id: string; label: string; kind: string; target?: string; note?: string };
type MessageView = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  narrative?: string;
  facts?: FactView[];
  actions?: ActionView[];
  missing?: string[];
  createdAt: number;
};

const FACT_BADGES: Record<string, { label: string; cls: string }> = {
  data: { label: "Donnée du projet", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  calculation: { label: "Calcul", cls: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  estimate: { label: "Estimation", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  recommendation: { label: "Recommandation AI", cls: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
};

export default function ProjectCopilot() {
  const navigate = useNavigate();
  const { projects, selectedId, selectedProject, selectProject } = useSelectedProject();

  const context = useQuery(
    api.aiCopilot.getProjectContext,
    selectedId ? { projectId: selectedId } : "skip",
  );
  const messages: MessageView[] =
    useQuery(api.aiCopilot.listMessages, selectedId ? { projectId: selectedId } : "skip") ?? [];
  const memory =
    useQuery(api.aiCopilot.listMemory, selectedId ? { projectId: selectedId } : "skip") ?? [];

  const ask = useAction(api.aiCopilotActions.ask);
  const addMemory = useMutation(api.aiCopilot.addMemory);
  const addMessage = useMutation(api.aiCopilot.addMessage);
  const clearHistory = useMutation(api.aiCopilot.clearHistory);
  const removeMemory = useMutation(api.aiCopilot.removeMemory);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ActionView | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recRef = useRef<any>(null);

  const suggestions = useMemo(() => (context ? quickSuggestions(context) : []), [context]);
  const voiceSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    [],
  );

  // Le changement de projet rafraîchit tout (contexte, suggestions, historique).
  useEffect(() => {
    setError(null);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedId, messages.length]);

  const send = async (text: string, mode?: CopilotMode) => {
    const q = text.trim();
    if (!q || !selectedId || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    try {
      await ask({ projectId: selectedId, question: q, mode });
    } catch {
      setError("Le Copilote n'a pas pu répondre. Votre question est conservée — réessayez.");
      setInput(q);
    } finally {
      setBusy(false);
    }
  };

  const runAction = (action: ActionView) => {
    if (!selectedId) return;
    if (action.kind === "confirm") {
      setConfirmAction(action);
      return;
    }
    switch (action.target) {
      case "plans":
        navigate(`/dashboard/plans/${selectedId}`);
        break;
      case "materials":
        navigate(`/dashboard/ai-materials?project=${encodeURIComponent(selectedId)}`);
        break;
      case "consult":
        navigate(`/dashboard/professionals-directory?project=${encodeURIComponent(selectedId)}`);
        break;
      case "guide":
        navigate(`/dashboard/guide?project=${encodeURIComponent(selectedId)}`);
        break;
      default:
        navigate(`/dashboard/project/${selectedId}`);
    }
  };

  /** Confirmation explicite obtenue → seul le mémo du projet est enregistré. */
  const applyConfirmed = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action || !selectedId) return;
    try {
      if (action.id === "memorize") {
        await addMemory({
          projectId: selectedId,
          note: action.note ?? "",
          kind: "preference",
        });
      } else {
        await addMemory({
          projectId: selectedId,
          note: `Décision validée : ${action.label}${action.note ? ` — ${action.note}` : ""}`,
          kind: "decision",
        });
      }
      await addMessage({
        projectId: selectedId,
        role: "assistant",
        content:
          `✅ « ${action.label} » a été validé et mémorisé pour ce projet. ` +
          `Aucune donnée du projet n'est modifiée automatiquement : appliquez le changement dans le module concerné.`,
      });
    } catch {
      setError("L'enregistrement a échoué. Réessayez.");
    }
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "fr-TN";
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
      const t = String(ev.results?.[0]?.[0]?.transcript ?? "");
      if (t) setInput((prev) => (prev ? `${prev} ${t}` : t));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  // ── Sans projet sélectionné : le Copilote ne produit aucune analyse ──
  if (!selectedId || !selectedProject) {
    return (
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-6">
        <CopilotHeader
          projects={projects}
          selectedId={null}
          onSelect={selectProject}
          projectName={null}
        />
        <Card className="mt-4 border border-border/40 bg-background/50">
          <CardContent className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
              <Bot className="h-6 w-6 text-violet-600" />
            </div>
            <p className="text-sm sm:text-base font-medium">
              Sélectionnez un projet pour utiliser le Copilote AI.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Le Copilote analyse TOUJOURS le projet sélectionné — jamais de réponse générique.
            </p>
            {projects.length === 0 && (
              <Button size="sm" className="mt-4" onClick={() => navigate("/dashboard/new")}>
                Nouveau projet
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
      <CopilotHeader
        projects={projects}
        selectedId={selectedId}
        onSelect={selectProject}
        projectName={projectDisplayLabel(selectedProject)}
      />

      {/* Mémoire du projet (liée à CE projet uniquement) */}
      {memory.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowMemory((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Brain className="h-3 w-3" />
            Mémoire du projet ({memory.length})
            <ChevronDown className={`h-3 w-3 transition-transform ${showMemory ? "rotate-180" : ""}`} />
          </button>
          {showMemory && (
            <div className="mt-1.5 rounded-lg border border-border/40 divide-y divide-border/30">
              {memory.map((m: any) => (
                <div key={m._id} className="flex items-start gap-2 px-3 py-2">
                  <Badge
                    variant="outline"
                    className={`mt-0.5 text-[9px] ${m.kind === "decision" ? "bg-sky-500/10 text-sky-600 border-sky-500/20" : "bg-violet-500/10 text-violet-600 border-violet-500/20"}`}
                  >
                    {m.kind === "decision" ? "Décision" : "Préférence"}
                  </Badge>
                  <p className="flex-1 text-xs">{m.note}</p>
                  <button
                    type="button"
                    aria-label="Oublier"
                    onClick={() => removeMemory({ memoryId: m._id })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversation (historique propre à ce projet) */}
      <Card className="mt-2 border border-border/40 bg-background/50">
        <CardContent className="p-3 sm:p-4">
          {/* Suggestions rapides (adaptées aux données disponibles) */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={busy}
                onClick={() => send(s.label, s.mode)}
                className="shrink-0 rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[10px] sm:text-xs hover:bg-violet-500/[0.08] hover:border-violet-400/40 transition-colors disabled:opacity-50"
              >
                <span className="mr-1">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-2 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {messages.length === 0 && (
              <div className="rounded-lg bg-muted/30 p-3 text-xs sm:text-sm text-muted-foreground">
                👋 Bonjour, je suis votre <strong className="text-foreground">Copilote AI</strong>. Je
                connais votre projet « {projectDisplayLabel(selectedProject)} »
                {context ? ` (étape « ${context.status || "en cours"} »)` : ""}. Posez votre question
                ou utilisez une suggestion ci-dessous — je ne modifie jamais vos données sans votre
                validation.
              </div>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m._id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600/[0.12] border border-violet-500/20 px-3 py-2 text-xs sm:text-sm whitespace-pre-line">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m._id} className="flex justify-start">
                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border/40 bg-muted/20 px-3 py-2 text-xs sm:text-sm">
                    <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-violet-600">
                      <Bot className="h-3 w-3" />
                      Copilote AI
                    </div>
                    <div className="whitespace-pre-line">{m.content}</div>

                    {/* Faits qualifiés : donnée / calcul / estimation / recommandation */}
                    {(m.facts ?? []).length > 0 && (
                      <div className="mt-2 space-y-1 rounded-lg border border-border/30 bg-background/60 p-2">
                        {(m.facts ?? []).map((f, i) => {
                          const badge = FACT_BADGES[f.kind] ?? FACT_BADGES.recommendation;
                          return (
                            <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {f.label}
                              </span>
                              <Badge variant="outline" className={`text-[8px] px-1 py-0 ${badge.cls}`}>
                                {badge.label}
                              </Badge>
                              <span className="text-xs">{f.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {m.narrative && (
                      <div className="mt-2 rounded-lg border border-violet-500/20 bg-violet-500/[0.05] p-2 text-xs italic text-muted-foreground">
                        <span className="mr-1 not-italic">✨</span>
                        {m.narrative}
                      </div>
                    )}

                    {(m.missing ?? []).length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {(m.missing ?? []).map((x, i) => (
                          <p key={i} className="text-[10px] text-amber-600">
                            ⚠ Non disponible dans votre projet : {x}
                          </p>
                        ))}
                      </div>
                    )}

                    {(m.actions ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(m.actions ?? []).map((a) => (
                          <Button
                            key={a.id}
                            size="sm"
                            variant={a.kind === "confirm" ? "default" : "outline"}
                            className={`h-7 gap-1 text-[10px] sm:text-xs ${a.kind === "confirm" ? "bg-violet-600 hover:bg-violet-500 text-white" : ""}`}
                            onClick={() => runAction(a)}
                          >
                            {a.label}
                            {a.kind !== "confirm" && <ArrowRight className="h-3 w-3" />}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            {busy && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Le Copilote analyse votre projet…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}

          {/* Saisie */}
          <div className="mt-3 flex items-end gap-1.5">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Écrivez votre question..."
              rows={1}
              className="min-h-[38px] max-h-24 text-xs sm:text-sm resize-none"
            />
            {voiceSupported && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Commande vocale"
                title="🎙️ Commande vocale"
                className={`h-[38px] w-[38px] shrink-0 ${listening ? "bg-violet-500/10 text-violet-600" : ""}`}
                onClick={startVoice}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              aria-label="Envoyer"
              disabled={busy || !input.trim()}
              className="h-[38px] w-[38px] shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
              onClick={() => void send(input)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-[9px] text-muted-foreground">
              Historique et mémoire propres à ce projet.
            </p>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Effacer la conversation
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation explicite : aucune action modifiante sans validation */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
            <AlertDialogDescription>
              « {confirmAction?.label} » sera enregistré dans la mémoire de ce projet. Aucune donnée
              du projet (estimation, DQE, plans, matériaux…) n'est modifiée automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void applyConfirmed()}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'historique de conversation de ce projet sera supprimé (les données du projet sont
              conservées).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedId) void clearHistory({ projectId: selectedId });
                setConfirmClear(false);
              }}
            >
              Effacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** En-tête : 🤖 Copilote AI + sélecteur de projet (§ interface du Copilote). */
function CopilotHeader({
  projects,
  selectedId,
  onSelect,
  projectName,
}: {
  projects: { _id: Id<"projects">; name: string }[];
  selectedId: Id<"projects"> | null;
  onSelect: (id: Id<"projects">) => void;
  projectName: string | null;
}) {
  return (
    <CardHeader className="p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base lg:text-lg font-semibold">🤖 Copilote AI</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Votre assistant intelligent de projet
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] sm:text-xs text-muted-foreground">Projet :</span>
          <Select
            value={selectedId ?? undefined}
            onValueChange={(v) => onSelect(v as Id<"projects">)}
          >
            <SelectTrigger className="h-8 w-[190px] sm:w-[230px] text-xs">
              <SelectValue placeholder="Nom du projet" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p._id} value={p._id} className="text-xs">
                  {p.name || "Projet"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {projectName && (
        <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground truncate">
          Projet sélectionné : <span className="font-medium text-foreground">{projectName}</span>
        </p>
      )}
    </CardHeader>
  );
}
