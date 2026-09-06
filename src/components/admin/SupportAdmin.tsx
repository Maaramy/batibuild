import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  CircleAlert,
  CircleCheck,
  Clock,
  Filter,
  Headset,
  Inbox,
  Loader2,
  Lock,
  Paperclip,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ── Labels & styles (identiques à la page utilisateur) ──────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Problème technique",
  account: "Compte utilisateur",
  billing: "Abonnement et paiement",
  project: "Projet",
  feature: "Fonctionnalité",
  other: "Autre",
};

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: any }> = {
  open: { label: "Ouvert", cls: "bg-amber-500/10 text-amber-600 border-amber-500/25", icon: Clock },
  in_progress: { label: "En cours", cls: "bg-blue-500/10 text-blue-600 border-blue-500/25", icon: Send },
  resolved: { label: "Résolu", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25", icon: CircleCheck },
  closed: { label: "Fermé", cls: "bg-muted text-muted-foreground border-border", icon: Lock },
};

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  low: { label: "Faible", cls: "bg-muted text-muted-foreground border-border" },
  normal: { label: "Normale", cls: "bg-sky-500/10 text-sky-600 border-sky-500/25" },
  high: { label: "Élevée", cls: "bg-orange-500/10 text-orange-600 border-orange-500/25" },
  urgent: { label: "Urgente", cls: "bg-red-500/10 text-red-600 border-red-500/25" },
};

const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];

// ── Component ────────────────────────────────────────────────────────────────

export default function SupportAdmin() {
  const tickets = useQuery(api.support.adminGetTickets, {});
  const stats = useQuery(api.support.adminGetStats, {});
  const unreadTotal = useQuery(api.support.adminUnreadTotal, {});

  const adminReply = useMutation(api.support.adminReply);
  const adminUpdateTicket = useMutation(api.support.adminUpdateTicket);
  const adminDeleteTicket = useMutation(api.support.adminDeleteTicket);
  const markTicketRead = useMutation(api.support.markTicketRead);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [selectedId, setSelectedId] = useState<Id<"supportTickets"> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [reply, setReply] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const messages = useQuery(
    api.support.getTicketMessages,
    selectedId ? { ticketId: selectedId } : "skip",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => tickets?.find((t) => t._id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const filtered = useMemo(() => {
    if (!tickets) return [];
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (q) {
        const hay = `${t.subject} ${t.userName ?? ""} ${t.userEmail ?? ""} ${t.userCompany ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, selectedId]);

  // Marquer comme lus à l'ouverture (côté équipe support)
  useEffect(() => {
    if (selected && (selected.adminUnreadCount ?? 0) > 0) {
      void markTicketRead({ ticketId: selected._id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id, selected?.adminUnreadCount]);

  const handleSendReply = async (resolve = false) => {
    if (!selected) return;
    if (!reply.trim() && !attachment) return;
    setSending(true);
    try {
      let storageId: Id<"_storage"> | undefined;
      if (attachment) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": attachment.type },
          body: attachment,
        });
        const { storageId: sid } = (await result.json()) as { storageId: Id<"_storage"> };
        storageId = sid;
      }
      await adminReply({
        ticketId: selected._id,
        body: reply,
        attachmentStorageId: storageId,
        attachmentName: attachment?.name,
        attachmentType: attachment?.type,
        attachmentSize: attachment?.size,
        resolve,
      });
      setReply("");
      setAttachment(null);
      toast.success(resolve ? "Réponse envoyée — demande résolue" : "Réponse envoyée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de la réponse");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selected) return;
    try {
      await adminUpdateTicket({ ticketId: selected._id, status: status as any });
      toast.success("Statut mis à jour");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!selected) return;
    try {
      await adminUpdateTicket({ ticketId: selected._id, priority: priority as any });
      toast.success("Priorité mise à jour");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await adminDeleteTicket({ ticketId: selected._id });
      setSelectedId(null);
      toast.success("Demande supprimée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const validateAttachment = (file: File): string | null => {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return "Format non pris en charge — images ou PDF uniquement.";
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return "Fichier trop volumineux — 5 Mo maximum.";
    }
    return null;
  };

  const activeFilters =
    (statusFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: "Total", value: stats?.total, icon: Inbox, cls: "text-muted-foreground" },
          { label: "Ouverts", value: stats?.open, icon: Clock, cls: "text-amber-600" },
          { label: "En cours", value: stats?.inProgress, icon: Send, cls: "text-blue-600" },
          { label: "Résolus", value: stats?.resolved, icon: CircleCheck, cls: "text-emerald-600" },
          { label: "Fermés", value: stats?.closed, icon: Lock, cls: "text-muted-foreground" },
          { label: "Urgents", value: stats?.urgent, icon: CircleAlert, cls: "text-red-600" },
        ].map((s) => (
          <Card key={s.label} className="border-border/40 shadow-sm">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50", s.cls)}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{s.value ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher par sujet, utilisateur, société, e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <Filter className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(STATUS_STYLES).map(([v, s]) => (
                <SelectItem key={v} value={v}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-[120px] text-xs">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
              {Object.entries(PRIORITY_STYLES).map(([v, p]) => (
                <SelectItem key={v} value={v}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
                setCategoryFilter("all");
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Liste des tickets */}
        <div
          className={cn(
            "rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden",
            selected && "hidden lg:block",
          )}
        >
          <div className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs font-semibold">
              {filtered.length} demande{filtered.length !== 1 ? "s" : ""}
            </span>
            {(unreadTotal ?? 0) > 0 && (
              <Badge className="bg-red-500 text-[9px] text-white">
                {unreadTotal} non lu{(unreadTotal ?? 0) !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <div className="max-h-[60vh] lg:max-h-[calc(100vh-24rem)] overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <Inbox className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {tickets ? "Aucune demande ne correspond aux filtres" : "Chargement..."}
                </p>
              </div>
            ) : (
              filtered.map((t) => {
                const unread = t.adminUnreadCount ?? 0;
                const st = STATUS_STYLES[t.status];
                const pr = PRIORITY_STYLES[t.priority];
                return (
                  <button
                    key={t._id}
                    onClick={() => {
                      setSelectedId(t._id);
                      setReply("");
                      setAttachment(null);
                    }}
                    className={cn(
                      "w-full text-left rounded-xl p-3 transition-colors space-y-1.5 border border-transparent",
                      t._id === selectedId
                        ? "bg-primary/10 border-primary/20"
                        : "hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        #{t._id.slice(-6)}
                      </span>
                      {unread > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {fmtDateTime(t.lastActivityAt)}
                      </span>
                    </div>
                    <p className="text-xs font-medium line-clamp-1">{t.subject}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={cn("gap-1 text-[10px]", st.cls)}>
                        <st.icon className="h-3 w-3" />
                        {st.label}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px]", pr.cls)}>
                        {pr.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={t.userImage ?? undefined} />
                        <AvatarFallback className="text-[8px]">{initials(t.userName)}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {t.userName ?? t.userEmail ?? "Utilisateur"}
                        {t.userCompany ? ` · ${t.userCompany}` : ""}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className={cn("rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden flex flex-col", !selected && "hidden lg:flex")}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center min-h-[320px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Headset className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold">Sélectionnez une demande</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Choisissez un ticket dans la liste pour consulter la conversation
                et répondre à l'utilisateur.
              </p>
            </div>
          ) : (
            <>
              {/* En-tête */}
              <div className="p-4 border-b border-border/50 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{selected._id.slice(-6)}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[selected.status].cls)}>
                        {STATUS_STYLES[selected.status].label}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[selected.priority].cls)}>
                        {PRIORITY_STYLES[selected.priority].label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {CATEGORY_LABELS[selected.category]}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold mt-1">{selected.subject}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      Créée le {fmtDateTime(selected.createdAt)} · Dernière activité{" "}
                      {fmtDateTime(selected.lastActivityAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                      onClick={() => void handleStatusChange("resolved")}
                    >
                      <CircleCheck className="h-3.5 w-3.5" />
                      Résoudre
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => void handleStatusChange("closed")}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Fermer
                    </Button>
                    {selected.status === "closed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => void handleStatusChange("open")}
                      >
                        Réouvrir
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 text-red-600 border-red-500/30 hover:bg-red-500/10"
                      disabled={deleting}
                      onClick={() => {
                        if (confirm("Supprimer définitivement cette demande et sa conversation ?")) {
                          void handleDelete();
                        }
                      }}
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Utilisateur + sélecteurs statut/priorité */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selected.userImage ?? undefined} />
                      <AvatarFallback className="text-[9px]">{initials(selected.userName)}</AvatarFallback>
                    </Avatar>
                    <div className="leading-tight">
                      <p className="text-xs font-medium">{selected.userName ?? "Utilisateur"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selected.userEmail ?? ""}
                        {selected.userPhone ? ` · ${selected.userPhone}` : ""}
                        {selected.userCompany ? ` · ${selected.userCompany}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Select value={selected.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-7 w-[120px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_STYLES).map(([v, s]) => (
                          <SelectItem key={v} value={v}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selected.priority} onValueChange={handlePriorityChange}>
                      <SelectTrigger className="h-7 w-[110px] text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_STYLES).map(([v, p]) => (
                          <SelectItem key={v} value={v}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[46vh] lg:max-h-[calc(100vh-36rem)] min-h-[220px]">
                {messages === undefined ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => {
                      const fromUser = m.senderRole === "user";
                      return (
                        <div key={m._id} className={cn("flex gap-2.5", fromUser ? "justify-start" : "justify-end")}>
                          {fromUser && (
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={selected.userImage ?? undefined} />
                              <AvatarFallback className="text-[9px]">{initials(selected.userName)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm border",
                              fromUser
                                ? "bg-muted/60 border-border/50 rounded-bl-md"
                                : "bg-primary text-primary-foreground border-primary/20 rounded-br-md",
                            )}
                          >
                            <p className="text-[10px] font-medium opacity-75 mb-1">
                              {fromUser ? selected.userName ?? "Utilisateur" : "Équipe Support"} ·{" "}
                              {fmtDateTime(m.createdAt)}
                            </p>
                            {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                            {m.attachmentUrl && (
                              <a
                                href={m.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                                  fromUser
                                    ? "bg-background hover:bg-muted"
                                    : "bg-primary-foreground/15 hover:bg-primary-foreground/25",
                                )}
                              >
                                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{m.attachmentName ?? "Pièce jointe"}</span>
                              </a>
                            )}
                          </div>
                          {!fromUser && (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-white">
                              <Headset className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Réponse */}
              <div className="p-3 border-t border-border/50">
                {selected.status === "closed" ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Demande fermée — réouvrez-la pour répondre.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachment && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate flex-1">{attachment.name}</span>
                        <button
                          onClick={() => setAttachment(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <Textarea
                      placeholder="Répondre à l'utilisateur..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      className="min-h-[64px] text-sm"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const err = validateAttachment(f);
                            if (err) toast.error(err);
                            else setAttachment(f);
                          }
                          e.target.value = "";
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Joindre
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          disabled={sending || (!reply.trim() && !attachment)}
                          onClick={() => void handleSendReply(true)}
                        >
                          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleCheck className="h-3.5 w-3.5" />}
                          Résoudre
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs"
                          disabled={sending || (!reply.trim() && !attachment)}
                          onClick={() => void handleSendReply(false)}
                        >
                          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Répondre
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bouton retour liste (mobile) */}
        {selected && (
          <button
            className="lg:hidden text-xs text-muted-foreground underline"
            onClick={() => setSelectedId(null)}
          >
            ← Retour à la liste
          </button>
        )}
      </div>
    </div>
  );
}
