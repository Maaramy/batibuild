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
import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/use-page-seo";
import {
  Bot,
  Send,
  Paperclip,
  Mic,
  Copy,
  Share2,
  Download,
  Trash2,
  Plus,
  MessageSquare,
  ChevronDown,
  X,
  FileText,
  Sparkles,
  GraduationCap,
  Briefcase,
  Cpu,
  AlertTriangle,
  Check,
  Loader2,
  PanelRight,
  History,
  BookOpen,
  Zap,
  Building2,
  User,
  Brain,
  FolderKanban,
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
  setActionBus,
} from "@/components/copilot/copilot-ui";

// ============================================================================
// Construction AI Copilot — interface conversationnelle avancée
// ============================================================================

// ============================================================================
// Page principale
// ============================================================================

export default function AICopilot() {
  usePageSEO({
    title: "Construction AI Copilot - batibuild App",
    description: "Votre conseiller technique IA pour la construction, les matériaux, les chantiers et l'immobilier.",
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get("project") || undefined;
  const initialSessionId = searchParams.get("session") || undefined;

  const projects = useQuery(api.projects.getUserProjects, {}) || [];
  const allSessions = useQuery(api.aiCopilotDb.listSessions, {}) || [];
  const stats = useQuery(api.aiCopilotDb.getCopilotStats);

  const createSession = useMutation(api.aiCopilotDb.createSession);
  const deleteSession = useMutation(api.aiCopilotDb.deleteSession);
  const sendMessageAction = useAction(api.aiCopilot.sendMessage);
  const generateReportAction = useAction(api.aiCopilot.generateReport);

  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
  const [level, setLevel] = useState<Level>("pro");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [composerRef, setComposerRef] = useState<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const addMemory = useMutation(api.aiCopilotDb.addMemory);
  const deleteMemory = useMutation(api.aiCopilotDb.deleteMemory);

  const isPremium =
    user?.subscriptionPlan === "pro" ||
    user?.subscriptionPlan === "expert" ||
    user?.role === "admin";

  // Sessions filtrées par projet sélectionné
  const sessions = useMemo(
    () =>
      allSessions
        .filter((s: any) => (projectId ? s.projectId === projectId : !s.projectId))
        .sort((a: any, b: any) => b.updatedAt - a.updatedAt),
    [allSessions, projectId],
  );

  const activeSession = sessions.find((s: any) => s._id === sessionId) || sessions[0];
  const messages = useQuery(
    api.aiCopilotDb.listMessages,
    activeSession ? { sessionId: activeSession._id } : "skip",
  ) || [];
  const memories = useQuery(
    api.aiCopilotDb.listMemories,
    projectId ? { projectId: projectId as any } : "skip",
  ) || [];
  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId: projectId as any } : "skip",
  );

  // Auto-création d'une session quand on arrive sur un projet sans session
  // (gardée par un ref pour éviter la double création en mode StrictMode)
  const createdForProject = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId) return;
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

  // Bus d'actions pour les boutons dans les réponses
  useEffect(() => {
    setActionBus((a) => {
      if (a.key === "report") {
        if (projectId) handleReport();
        else toast.info("Sélectionnez un projet pour générer un rapport.");
        return;
      }
      if (a.key === "memory") {
        setMobileInfoOpen(true);
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
    });
    return () => setActionBus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, composerRef]);

  const handleReport = async () => {
    if (!projectId) {
      toast.info("Sélectionnez d'abord un projet.");
      return;
    }
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

  const handleNewSession = async () => {
    const id = await createSession({
      projectId: projectId ? (projectId as any) : undefined,
      title: "Nouvelle conversation",
    });
    setSessionId(id as string);
    setMobileSessionsOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await deleteSession({ sessionId: id as any });
    if (sessionId === id) setSessionId(undefined);
  };

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

  const shareSession = async () => {
    if (!activeSession) return;
    const url = `${window.location.origin}/dashboard/copilot?session=${activeSession._id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien de la conversation copié !");
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  };

  const exportSession = () => {
    if (!activeSession) return;
    const lines: string[] = [
      `Conversation — ${activeSession.title}`,
      `Projet : ${project?.name ?? "Général"}`,
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
    a.download = `copilot-${activeSession.title.replace(/[^\w]+/g, "-").slice(0, 40)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadReport = () => {
    const blob = new Blob([reportContent], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rapport-${project?.name?.replace(/[^\w]+/g, "-") || "chantier"}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const addMemoryNow = async (content: string) => {
    if (!content.trim() || !projectId) return;
    await addMemory({ projectId: projectId as any, content: content.trim(), category: "décision" });
    toast.success("Mémorisé dans le projet.");
  };

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* ── Sidebar sessions (desktop) ── */}
      <aside className="hidden lg:flex w-64 xl:w-72 flex-col border-r border-border/40 bg-background/60">
        <SessionsSidebar
          sessions={sessions}
          activeId={activeSession?._id}
          projectId={projectId}
          projects={projects}
          onSelectProject={setProjectId}
          onSelectSession={(id) => setSessionId(id)}
          onNew={handleNewSession}
          onDelete={handleDeleteSession}
          stats={stats}
        />
      </aside>

      {/* ── Drawer sessions (mobile) ── */}
      <AnimatePresence>
        {mobileSessionsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileSessionsOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-72 h-full bg-background border-r border-border/50 flex flex-col"
            >
              <div className="flex justify-end p-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobileSessionsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SessionsSidebar
                sessions={sessions}
                activeId={activeSession?._id}
                projectId={projectId}
                projects={projects}
                onSelectProject={(p) => { setProjectId(p); }}
                onSelectSession={(id) => { setSessionId(id); setMobileSessionsOpen(false); }}
                onNew={async () => { await handleNewSession(); setMobileSessionsOpen(false); }}
                onDelete={handleDeleteSession}
                stats={stats}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Colonne principale ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="glass-header sticky top-0 z-20 px-3 sm:px-5 h-14 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 shrink-0" onClick={() => setMobileSessionsOpen(true)}>
            <MessageSquare className="h-4 w-4" />
          </Button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-semibold truncate">Construction AI Copilot</h1>
              <Badge className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0">
                <Sparkles className="h-2.5 w-2.5" /> PREMIUM
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">Conseiller technique · matériaux · chantier · immobilier</p>
          </div>            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={shareSession} title="Partager la conversation">
                <Share2 className="h-4 w-4" />
              </Button>
              <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/30 p-0.5">
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
            <Button variant="outline" size="sm" className="h-8 gap-1 text-[11px] hidden sm:inline-flex" onClick={handleReport} disabled={!projectId}>
              <FileText className="h-3 w-3" />
              Rapport
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 xl:hidden" onClick={() => setMobileInfoOpen(!mobileInfoOpen)}>
              <PanelRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportSession} title="Exporter la conversation">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Bandeau premium si forfait Start */}
        {!isPremium && (
          <div className="px-3 sm:px-5 py-2 border-b border-amber-200/40 bg-amber-50/60 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1">
                Le <strong>Construction AI Copilot</strong> est un module premium. Passez à Pro ou Expert pour activer l'assistant.
              </span>
              <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => navigate("/dashboard/pricing")}>
                Passer à Pro
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <EmptyState
              hasProject={!!projectId}
              isPremium={isPremium}
              onPick={(q) => setInput(q)}
              onNew={handleNewSession}
            />
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

        {/* Panneau mobile : contexte + mémoire */}
        {mobileInfoOpen && (
          <div className="lg:hidden border-t border-border/40 bg-background p-3 space-y-3 max-h-[45dvh] overflow-y-auto">
            <InfoPanels
              project={project}
              memories={memories}
              projectId={projectId}
              onAddMemory={addMemoryNow}
              onDeleteMemory={(id) => deleteMemory({ memoryId: id as any })}
              onQuickCommand={(prompt) => { setInput(prompt); composerRef?.focus(); }}
            />
          </div>
        )}

        {/* Composer */}
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
                  placeholder={projectId ? `Questionnez le copilote sur « ${project?.name || "ce projet"} »…` : "Posez une question technique (matériaux, coûts, chantier, immobilier)…"}
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
      </main>

      {/* ── Panneau droit : contexte + mémoire (desktop) ── */}
      <aside className="hidden xl:flex w-80 flex-col border-l border-border/40 bg-background/60 overflow-y-auto">
        <InfoPanels
          project={project}
          memories={memories}
          projectId={projectId}
          onAddMemory={addMemoryNow}
          onDeleteMemory={(id) => deleteMemory({ memoryId: id as any })}
          onQuickCommand={(prompt) => { setInput(prompt); composerRef?.focus(); }}
        />
      </aside>

      {/* ── Dialog rapport ── */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Rapport généré par l'IA
            </DialogTitle>
            <DialogDescription>
              {project?.name} · rapport hebdomadaire de chantier
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-lg border border-border/40 bg-muted/20 p-4">
            {reportLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Génération du rapport…
              </div>
            ) : (
              <MarkdownLite text={reportContent} />
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

// ── Sidebar des sessions ────────────────────────────────────────────────────

function SessionsSidebar(props: {
  sessions: any[];
  activeId?: string;
  projectId?: string;
  projects: any[];
  onSelectProject: (p: string | undefined) => void;
  onSelectSession: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  stats?: any;
}) {
  const { sessions, activeId, projectId, projects, onSelectProject, onSelectSession, onNew, onDelete, stats } = props;
  return (
    <>
      <div className="p-3 border-b border-border/30 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight">Copilote IA</p>
            <p className="text-[9px] text-muted-foreground">Construction · Premium</p>
          </div>
        </div>
        <select
          value={projectId ?? ""}
          onChange={(e) => onSelectProject(e.target.value || undefined)}
          className="w-full rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Conversation générale</option>
          {projects.map((p: any) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <Button size="sm" className="w-full gap-1.5 h-8 text-[11px]" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle conversation
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-[11px] text-muted-foreground/60 text-center py-6 px-3">
            {projectId ? "Aucune conversation pour ce projet. Créez-en une !" : "Aucune conversation générale."}
          </p>
        )}
        {sessions.map((s: any) => (
          <div
            key={s._id}
            onClick={() => onSelectSession(s._id)}
            className={cn(
              "group flex items-start gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-all border",
              activeId === s._id
                ? "bg-primary/10 border-primary/25"
                : "border-transparent hover:bg-muted/40",
            )}
          >
            <MessageSquare className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", activeId === s._id ? "text-primary" : "text-muted-foreground/60")} />
            <div className="min-w-0 flex-1">
              <p className={cn("text-[12px] font-medium truncate", activeId === s._id && "text-primary")}>{s.title}</p>
              {s.lastMessagePreview && <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{s.lastMessagePreview}</p>}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(s._id); }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {stats && (
        <div className="p-3 border-t border-border/30">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <MiniStat label="Conv." value={stats.sessions} />
            <MiniStat label="Messages" value={stats.messages} />
            <MiniStat label="Mémoire" value={stats.memories} />
          </div>
        </div>
      )}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/30 bg-muted/20 py-1.5">
      <p className="text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ── Panneau contexte + mémoire ─────────────────────────────────────────────

function InfoPanels(props: {
  project: any;
  memories: any[];
  projectId?: string;
  onAddMemory: (c: string) => void;
  onDeleteMemory: (id: string) => void;
  onQuickCommand: (prompt: string) => void;
}) {
  const { project, memories, projectId, onAddMemory, onDeleteMemory, onQuickCommand } = props;
  const [memInput, setMemInput] = useState("");
  const ce = project?.costEstimate;

  return (
    <div className="p-3 space-y-3">
      {/* Contexte projet */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <FolderKanban className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contexte du projet</p>
        </div>
        {project ? (
          <div className="space-y-1.5 text-[11px]">
            <p className="font-semibold">{project.name}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <KV k="Type" v={project.category} />
              <KV k="Statut" v={project.status} />
              <KV k="Surface" v={project.surface ? `${project.surface} m²` : "—"} />
              <KV k="Étages" v={String(project.floors ?? 1)} />
              <KV k="Région" v={project.region ?? "—"} />
              <KV k="Coût est." v={ce ? `${Math.round(ce.totalCost).toLocaleString("fr-FR")} TND` : "—"} />
            </div>
            {ce?.costPerSquareMeter && (
              <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                Prix/m² : <span className="font-semibold text-primary">{Math.round(ce.costPerSquareMeter).toLocaleString("fr-FR")} TND</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/70">Sélectionnez un projet pour un contexte complet (type, surface, budget, répartition…).</p>
        )}
      </div>

      {/* Mémoire */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Brain className="h-3.5 w-3.5 text-violet-500" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mémoire du projet</p>
        </div>
        {memories.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70">
            Aucune décision mémorisée. Dites par exemple « je choisis le PSE 6 cm pour l'isolation » — le copilote l'enregistrera.
          </p>
        ) : (
          <div className="space-y-1.5">
            {memories.map((m: any) => (
              <div key={m._id} className="group flex items-start gap-2 rounded-lg border border-border/30 bg-muted/20 px-2 py-1.5">
                <span className="shrink-0 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide">
                  {m.category}
                </span>
                <p className="flex-1 text-[11px] leading-snug min-w-0">{m.content}</p>
                <button
                  onClick={() => onDeleteMemory(m._id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {projectId && (
          <div className="flex gap-1.5 mt-2">
            <input
              value={memInput}
              onChange={(e) => setMemInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddMemory(memInput);
                  setMemInput("");
                }
              }}
              placeholder="Ajouter une contrainte / décision…"
              className="flex-1 min-w-0 rounded-lg border border-border/50 bg-background px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                if (memInput.trim()) {
                  onAddMemory(memInput);
                  setMemInput("");
                }
              }}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Commandes rapides */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Commandes rapides</p>
        </div>
        <div className="flex flex-col gap-1">
          {QUICK_COMMANDS.map((c) => (
            <button
              key={c.label}
              onClick={() => onQuickCommand(c.prompt)}
              className="flex items-center gap-2 rounded-lg border border-border/30 px-2 py-1.5 text-[11px] text-left text-muted-foreground hover:text-primary hover:border-primary/25 hover:bg-primary/[0.03] transition-all cursor-pointer"
            >
              <c.icon className="h-3 w-3 shrink-0" />
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-muted/30 px-1.5 py-1">
      <p className="text-[8px] text-muted-foreground/60 uppercase tracking-wide">{k}</p>
      <p className="text-[10px] font-medium truncate">{v}</p>
    </div>
  );
}
