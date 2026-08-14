import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Send,
  Paperclip,
  Mic,
  Download,
  Trash2,
  Plus,
  FileText,
  Sparkles,
  Loader2,
  ChevronDown,
  X,
  Brain,
  Check,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  QUICK_COMMANDS,
  LEVELS,
  type Level,
  MarkdownLite,
  MessageRow,
  EmptyState,
  BotAvatar,
  LockBadge,
} from "./copilot-ui";

// ============================================================================
// Construction AI Copilot — panneau conversationnel embarqué
// Utilisé dans la page de résultat d'estimation de construction
// (`/dashboard/project/:id`) : le copilote est verrouillé sur le projet affiché.
// ============================================================================

export default function CopilotChatPanel({
  projectId,
  projectName,
  className,
  messagesHeight = "h-[440px] sm:h-[480px]",
}: {
  /** Projet cible — le copilote est verrouillé sur ce projet. */
  projectId: string;
  projectName?: string;
  className?: string;
  messagesHeight?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const allSessions = useQuery(api.aiCopilotDb.listSessions, {}) || [];
  const createSession = useMutation(api.aiCopilotDb.createSession);
  const deleteSession = useMutation(api.aiCopilotDb.deleteSession);
  const sendMessageAction = useAction(api.aiCopilot.sendMessage);
  const generateReportAction = useAction(api.aiCopilot.generateReport);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const addMemory = useMutation(api.aiCopilotDb.addMemory);
  const deleteMemory = useMutation(api.aiCopilotDb.deleteMemory);

  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [level, setLevel] = useState<Level>("pro");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [composerRef, setComposerRef] = useState<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPremium =
    user?.subscriptionPlan === "pro" ||
    user?.subscriptionPlan === "expert" ||
    user?.role === "admin";

  // Sessions du projet courant uniquement
  const sessions = useMemo(
    () =>
      allSessions
        .filter((s: any) => s.projectId === projectId)
        .sort((a: any, b: any) => b.updatedAt - a.updatedAt),
    [allSessions, projectId],
  );

  const activeSession = sessions.find((s: any) => s._id === sessionId) || sessions[0];
  const messages = useQuery(
    api.aiCopilotDb.listMessages,
    activeSession ? { sessionId: activeSession._id } : "skip",
  ) || [];
  const memories = useQuery(api.aiCopilotDb.listMemories, { projectId: projectId as any }) || [];

  // Auto-création d'une session pour ce projet (garde anti double-création StrictMode)
  const createdForProject = useRef<string | null>(null);
  useEffect(() => {
    if (sessions.length === 0 && createdForProject.current !== projectId) {
      createdForProject.current = projectId;
      createSession({ projectId: projectId as any, title: "Nouvelle conversation" }).then((id) =>
        setSessionId(id as string),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sessions.length]);

  useEffect(() => {
    if (activeSession) setSessionId(activeSession._id);
  }, [activeSession?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || sending) return;
    if (!activeSession) {
      toast.info("Créez une conversation d'abord.");
      return;
    }
    setSending(true);
    try {
      await sendMessageAction({
        sessionId: activeSession._id as any,
        content: text,
        attachments,
        level,
      });
      setInput("");
      setAttachments([]);
    } catch (e: any) {
      const msg = e?.message || "Erreur lors de l'envoi";
      if (msg.includes("OFFRE_GRATUITE")) {
        toast.error("Le Construction AI Copilot est réservé aux forfaits Pro et Expert.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const handleNewSession = async () => {
    const id = await createSession({
      projectId: projectId as any,
      title: "Nouvelle conversation",
    });
    setSessionId(id as string);
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await deleteSession({ sessionId: id as any });
    if (sessionId === id) setSessionId(undefined);
  };

  const handleReport = async () => {
    setReportLoading(true);
    setReportOpen(true);
    try {
      const res = await generateReportAction({ projectId: projectId as any });
      setReportContent(res.content);
    } catch (e: any) {
      const msg = e?.message || "Erreur";
      if (msg.includes("OFFRE_GRATUITE")) {
        setReportOpen(false);
        toast.error("Réservé aux forfaits Pro et Expert");
      } else {
        setReportContent(`**Erreur** : ${msg}`);
      }
    } finally {
      setReportLoading(false);
    }
  };

  const handleChipAction = (a: { key: string; label: string }) => {
    if (a.key === "report") {
      handleReport();
      return;
    }
    if (a.key === "memory") {
      setMemoriesOpen(true);
      toast.info("Dites une décision (ex. « je choisis le PSE 6 cm ») et je la mémoriserai.");
      return;
    }
    const map: Record<string, string> = {
      compare: "Compare les matériaux de mon projet (3 solutions : économique, optimale, premium)",
      calc: "Refais le calcul avec les données de mon projet",
      suppliers: "Recherche des fournisseurs près de ma région pour mon projet",
    };
    if (map[a.key]) {
      setInput(map[a.key]);
      composerRef?.focus();
    }
  };

  const handleAttach = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 8 Mo).");
      return;
    }
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error("Upload échoué");
      const { storageId } = await res.json();
      setAttachments((prev) => [...prev, { name: file.name, type: file.type || "file", storageId, size: file.size }]);
      toast.success("Document joint.");
    } catch {
      toast.error("Impossible de joindre le fichier.");
    }
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.info("La saisie vocale n'est pas supportée par ce navigateur.");
      return;
    }
    if (listening) {
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript;
      if (t) setInput((prev) => (prev ? `${prev} ${t}` : t));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copié !");
    } catch {
      toast.error("Impossible de copier.");
    }
  };

  const exportSession = () => {
    if (!activeSession) return;
    const lines: string[] = [
      `Conversation — ${activeSession.title}`,
      `Projet : ${projectName ?? "—"}`,
      `Exporté le ${new Date().toLocaleDateString("fr-FR")}`,
      "".padEnd(50, "="),
      "",
    ];
    for (const m of messages) {
      lines.push(`${m.role === "user" ? "👤 Vous" : "🤖 Copilote"} — ${new Date(m.createdAt).toLocaleString("fr-FR")}`);
      lines.push(m.content);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `copilot-${(projectName ?? "projet").replace(/[^\w]+/g, "-").slice(0, 40)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadReport = () => {
    const blob = new Blob([reportContent], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rapport-${(projectName ?? "chantier").replace(/[^\w]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const addMemoryNow = async (content: string) => {
    if (!content.trim()) return;
    await addMemory({ projectId: projectId as any, content: content.trim(), category: "décision" });
    toast.success("Mémorisé dans le projet.");
  };

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card", className)}>
      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-3 sm:px-4 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold truncate">Construction AI Copilot</h3>
            <Badge className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0">
              <Sparkles className="h-2.5 w-2.5" /> PREMIUM
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {projectName ? `Projet ciblé : « ${projectName} »` : "Conseiller technique · matériaux · chantier"}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-border/50 bg-background p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLevel(l.key)}
              title={l.label}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all cursor-pointer",
                level === l.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <l.icon className="h-3 w-3" />
              <span className="hidden xl:inline">{l.label}</span>
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-[11px]" onClick={handleReport}>
          <FileText className="h-3 w-3" />
          <span className="hidden sm:inline">Rapport</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportSession} title="Exporter la conversation">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Barre des sessions (verrouillées sur le projet) ── */}
      <div className="flex items-center gap-1.5 border-b border-border/30 bg-background/60 px-3 sm:px-4 py-2">
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        <select
          value={activeSession?._id ?? ""}
          onChange={(e) => setSessionId(e.target.value || undefined)}
          className="min-w-0 flex-1 rounded-lg border border-border/50 bg-background px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {sessions.length === 0 && <option value="">Aucune conversation…</option>}
          {sessions.map((s: any) => (
            <option key={s._id} value={s._id}>{s.title}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 text-[10px]" onClick={handleNewSession} title="Nouvelle conversation">
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">Nouvelle</span>
        </Button>
        {activeSession && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground/60 hover:text-destructive"
            onClick={() => handleDeleteSession(activeSession._id)}
            title="Supprimer la conversation"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Ouvrir la page complète du copilote"
          onClick={() => navigate(`/dashboard/copilot?project=${projectId}`)}>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Bandeau premium si forfait Start */}
      {!isPremium && (
        <div className="border-b border-amber-200/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 sm:px-4 py-2">
          <div className="flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1">
              Le <strong>Construction AI Copilot</strong> est un module premium. Passez à Pro ou Expert pour activer l'assistant.
            </span>
            <Button size="sm" className="h-7 shrink-0 text-[10px] gap-1" onClick={() => navigate("/dashboard/pricing")}>
              Passer à Pro
            </Button>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={scrollRef} className={cn("flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-4", messagesHeight)}>
        {messages.length === 0 && (
          <EmptyState hasProject isPremium={isPremium} onPick={setInput} onNew={handleNewSession} />
        )}
        {messages.map((m: any) => (
          <MessageRow key={m._id} message={m} onCopy={copyMessage} />
        ))}
        {sending && (
          <div className="flex items-start gap-2.5">
            <BotAvatar />
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border/40 bg-muted/30 px-3.5 py-2.5 text-[12px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Analyse avec le contexte du projet…
            </div>
          </div>
        )}
      </div>

      {/* ── Mémoire du projet (repliable) ── */}
      <div className="border-t border-border/30">
        <button
          onClick={() => setMemoriesOpen(!memoriesOpen)}
          className="flex w-full items-center gap-2 px-3 sm:px-4 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Brain className="h-3.5 w-3.5 text-violet-500" />
          Mémoire du projet
          <span className="rounded-full bg-muted/60 px-1.5 py-px text-[9px] tabular-nums">{memories.length}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 ml-auto transition-transform", memoriesOpen && "rotate-180")} />
        </button>
        {memoriesOpen && (
          <div className="space-y-1.5 px-3 sm:px-4 pb-3 max-h-44 overflow-y-auto">
            {memories.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/70">
                Aucune décision mémorisée. Dites par exemple « je choisis le PSE 6 cm pour l'isolation » — le copilote l'enregistrera.
              </p>
            ) : (
              memories.map((m: any) => (
                <div key={m._id} className="group flex items-start gap-2 rounded-lg border border-border/30 bg-muted/20 px-2 py-1.5">
                  <span className="shrink-0 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide">
                    {m.category}
                  </span>
                  <p className="flex-1 text-[11px] leading-snug min-w-0">{m.content}</p>
                  <button
                    onClick={() => deleteMemory({ memoryId: m._id as any })}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
            <div className="flex gap-1.5 pt-1">
              <input
                id="copilot-memory-input"
                placeholder="Ajouter une contrainte / décision…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                    addMemoryNow((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                className="flex-1 min-w-0 rounded-lg border border-border/50 bg-background px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => {
                  const input = document.getElementById("copilot-memory-input") as HTMLInputElement | null;
                  if (input?.value.trim()) {
                    addMemoryNow(input.value);
                    input.value = "";
                  }
                }}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Composer ── */}
      <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm p-3 sm:p-4">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachments.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2 py-1 text-[10px]">
                <FileText className="h-3 w-3 text-primary" />
                <span className="max-w-[140px] truncate">{a.name}</span>
                <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {isPremium ? (
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAttach(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => fileInputRef.current?.click()} title="Joindre un plan, photo, devis ou document">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className={cn("h-10 w-10 shrink-0", listening && "border-red-400 text-red-500")} onClick={toggleVoice} title="Saisie vocale">
              <Mic className={cn("h-4 w-4", listening && "animate-pulse")} />
            </Button>
            <div className="flex-1 min-w-0">
              <Textarea
                ref={setComposerRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Questionnez le copilote sur « ${projectName || "ce projet"} »…`}
                className="max-h-32 min-h-10 resize-none text-[13px] rounded-xl"
                rows={1}
              />
            </div>
            <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleSend} disabled={sending || (!input.trim() && attachments.length === 0)}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5 text-[11px] text-amber-800 dark:text-amber-300">
            <LockBadge />
            <span className="flex-1">Module premium — passez à Pro ou Expert pour converser avec le copilote.</span>
            <Button size="sm" className="h-7 text-[10px]" onClick={() => navigate("/dashboard/pricing")}>Passer à Pro</Button>
          </div>
        )}
        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none pb-0.5">
          {QUICK_COMMANDS.map((c) => (
            <button
              key={c.label}
              onClick={() => { setInput(c.prompt); composerRef?.focus(); }}
              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/20 px-2.5 py-1 text-[10px] text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.04] transition-all cursor-pointer"
            >
              <c.icon className="h-2.5 w-2.5" />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dialog rapport ── */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Rapport généré par l'IA
            </DialogTitle>
            <DialogDescription>
              {projectName} · rapport hebdomadaire de chantier
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-lg border border-border/40 bg-muted/20 p-4">
            {reportLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Génération du rapport…
              </div>
            ) : (
              <MarkdownLite text={reportContent} onAction={handleChipAction} />
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadReport} disabled={reportLoading || !reportContent}>
              <Download className="h-3.5 w-3.5" />
              Télécharger (.md)
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => window.print()} disabled={reportLoading || !reportContent}>
              <FileText className="h-3.5 w-3.5" />
              Imprimer / PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
