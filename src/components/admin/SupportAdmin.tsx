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
  Hourglass,
  Inbox,
  Loader2,
  Lock,
  NotebookPen,
  Paperclip,
  Search,
  Send,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
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
  open: { label: "Nouveau", cls: "bg-amber-500/10 text-amber-600 border-amber-500/25", icon: Clock },
  in_progress: { label: "En cours", cls: "bg-blue-500/10 text-blue-600 border-blue-500/25", icon: Send },
  awaiting_user: { label: "En attente utilisateur", cls: "bg-violet-500/10 text-violet-600 border-violet-500/25", icon: Hourglass },
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
  const agents = useQuery(api.support.adminGetSupportAgents, {});

  const adminReply = useMutation(api.support.adminReply);
  const adminUpdateTicket = useMutation(api.support.adminUpdateTicket);
  const adminDeleteTicket = useMutation(api.support.adminDeleteTicket);
  const assignSupportTicket = useMutation(api.support.assignSupportTicket);
  const addInternalSupportNote = useMutation(api.support.addInternalSupportNote);
  const markTicketRead = useMutation(api.support.markTicketRead);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  // Ouverture directe d'un ticket depuis une notification (?tab=support&ticket=...)
  const [searchParams] = useSearchParams();
  const urlTicket = searchParams.get("ticket") as Id<"supportTickets"> | null;
  const [selectedId, setSelectedId] = useState<Id<"supportTickets"> | null>(urlTicket);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [reply, setReply] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const messages = useQuery(
    api.support.getTicketMessages,
    selectedId ? { ticketId: selectedId } : "skip",
  );
  const notes = useQuery(
    api.support.getInternalSupportNotes,
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

  const handleAssign = async (assignedTo: string) => {
    if (!selected) return;
    try {
      await assignSupportTicket({
        ticketId: selected._id,
        assignedTo: (assignedTo || undefined) as any,
      });
      toast.success("Ticket assigné");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'assignation");
    }
  };

  const handleAddNote = async () => {
    if (!selected || !noteText.trim()) return;
    setAddingNote(true);
    try {
      await addInternalSupportNote({
        ticketId: selected._id,
        body: noteText,
      });
      setNoteText("");
      toast.success("Note interne ajoutée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout de la note");
    } finally {
      setAddingNote(false);
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
          { label: "Nouveaux", value: stats?.open, icon: Clock, cls: "text-amber-600" },
          { label: "En cours", value: stats?.inProgress, icon: Send, cls: "text-blue-600" },
          { label: "En attente", value: stats?.awaitingUser, icon: Hourglass, cls: "text-violet-600" },
          { label: "Résolus", value: stats?.resolved, icon: CircleCheck, cls: "text-emerald-600" },
          { label: "Fermés", value: stats?.closed, icon: Lock, cls: "text-muted-foreground" },
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
                  {tickets === undefined
                    ? "Chargement..."
                    : tickets.length === 0
                      ? "Aucune demande de support"
                      : "Aucune demande ne correspond aux filtres"}
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
                        #{t.ticketNumber ?? `SUP-${t._id.slice(-6)}`}
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
                        #{selected.ticketNumber ?? `SUP-${selected._id.slice(-6)}`}
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
                      className="h-7 text-[11px] gap-1 text-violet-600 border-violet-500/30 hover:bg-violet-500/10"
                      onClick={() => void handleStatusChange("awaiting_user")}
                    >
                      <Hourglass className="h-3.5 w-3.5" />
                      En attente
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
                    {(selected.status === "closed" || selected.status === "resolved") && (
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
                  <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                    <Select
                      value={selected.assignedTo ?? ""}
                      onValueChange={(v) => void handleAssign(v)}
                    >
                      <SelectTrigger className="h-7 w-[150px] text-[11px]">
                        <UserCheck className="h-3 w-3 mr-1 text-muted-foreground" />
                        <SelectValue placeholder="Assigner à..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Non assigné</SelectItem>
                        {(agents ?? []).map((a) => (
                          <SelectItem key={a._id} value={a._id}>
                            {a.name || a.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selected.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-7 w-[130px] text-[11px]">
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

              {/* Demande d'annonce — gestion complète */}
              {selected.category === "ad_request" && selected.adRequest && (
                <div className="border-b border-border/50 bg-primary/[0.02] px-4 py-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary flex-wrap">
                    <Megaphone className="h-3.5 w-3.5" />
                    Demande d'annonce
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        AD_STAGE_STYLES[selected.adRequest.stage],
                      )}
                    >
                      {AD_STAGE_LABELS[selected.adRequest.stage]}
                    </Badge>
                    {selected.adRequest.paymentStatus && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          AD_PAYMENT_STYLES[selected.adRequest.paymentStatus],
                        )}
                      >
                        {AD_PAYMENT_LABELS[selected.adRequest.paymentStatus]}
                      </Badge>
                    )}
                  </div>

                  {/* Détails de la demande */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Société :</span>{" "}
                      {selected.adRequest.companyName}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Demandeur :</span>{" "}
                      {selected.adRequest.requesterName}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Téléphone :</span>{" "}
                      {selected.adRequest.phone}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">E-mail :</span>{" "}
                      {selected.adRequest.email}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Type d'annonce :</span>{" "}
                      {selected.adRequest.adType}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Durée souhaitée :</span>{" "}
                      {selected.adRequest.publicationDurationDays} jour(s)
                    </p>
                  </div>
                  {selected.adRequest.additionalInfo && (
                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                      <span className="font-medium text-foreground">Infos complémentaires :</span>{" "}
                      {selected.adRequest.additionalInfo}
                    </p>
                  )}

                  {/* Fichiers : logo, pièce jointe, preuve de paiement */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {selected.adRequestFiles?.logoUrl && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <img
                          src={selected.adRequestFiles.logoUrl}
                          alt="Logo"
                          className="h-8 w-8 rounded object-cover border border-border/50"
                        />
                        Logo
                      </div>
                    )}
                    {selected.adRequestFiles?.attachmentUrl && (
                      <a
                        href={selected.adRequestFiles.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                      >
                        <Paperclip className="h-3 w-3" />
                        {selected.adRequestFiles.attachmentName ?? "Pièce jointe"}
                      </a>
                    )}
                    {selected.adRequestFiles?.paymentProofUrl && (
                      <a
                        href={selected.adRequestFiles.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-amber-600 hover:underline"
                      >
                        <Paperclip className="h-3 w-3" />
                        {selected.adRequestFiles.paymentProofName ?? "Preuve de paiement"}
                      </a>
                    )}
                  </div>

                  {/* Décision (statut de la demande) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Décision :
                    </span>
                    {AD_STAGE_KEYS.map((key) => (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-7 text-[11px] gap-1",
                          selected.adRequest!.stage === key
                            ? AD_STAGE_STYLES[key]
                            : "text-muted-foreground",
                        )}
                        disabled={adPublishing}
                        onClick={() => void handleAdStage(key)}
                      >
                        {AD_STAGE_LABELS[key]}
                      </Button>
                    ))}
                  </div>

                  {/* Prix + durée + lien */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        Prix de l'annonce (TND, 0 = gratuit)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder="Ex. : 150"
                        value={adPrice}
                        onChange={(e) => setAdPrice(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        Durée de publication (jours)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Ex. : 30"
                        value={adDuration}
                        onChange={(e) => setAdDuration(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">
                        Lien externe (optionnel)
                      </label>
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={adExternalUrl}
                        onChange={(e) => setAdExternalUrl(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1"
                      disabled={adSaving}
                      onClick={() => void handleAdSaveDetails()}
                    >
                      {adSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CircleCheck className="h-3 w-3" />}
                      Enregistrer prix/durée
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 text-violet-600 border-violet-500/30 hover:bg-violet-500/10"
                      disabled={adSaving || !reply.trim()}
                      onClick={() => void handleAdRespond()}
                    >
                      <Send className="h-3 w-3" />
                      Répondre au demandeur
                    </Button>
                  </div>

                  {/* Paiement — quand la demande est acceptée */}
                  {selected.adRequest.stage === "acceptee" && (
                    <div className="rounded-lg border border-border/40 bg-background/60 p-2.5 space-y-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        Paiement
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => void handleAdPayment("confirmed")}
                        >
                          <CircleCheck className="h-3 w-3" />
                          Confirmer le paiement
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1 text-red-600 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => void handleAdPayment("rejected")}
                        >
                          <CircleAlert className="h-3 w-3" />
                          Refuser la preuve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1"
                          onClick={() => void handleAdPayment("not_required")}
                        >
                          Sans objet (gratuit)
                        </Button>
                      </div>

                      {/* Publication */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {selected.adRequest.announcementId ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                            <CircleCheck className="h-3 w-3 mr-1" />
                            Annonce publiée
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-[11px] gap-1"
                            disabled={adPublishing}
                            onClick={() => void handleAdPublish()}
                          >
                            {adPublishing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Megaphone className="h-3 w-3" />
                            )}
                            Publier l'annonce
                          </Button>
                        )}
                        {selected.adRequest.publishedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            Publiée le {fmtDateTime(selected.adRequest.publishedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[46vh] lg:max-h-[calc(100vh-36rem)] min-h-[220px]">
                {messages === undefined ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(messages ?? []).map((m) => {
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
                              {fromUser ? selected.userName ?? "Utilisateur" : (m.senderName ?? "Équipe Support")} ·{" "}
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

              {/* Notes internes (visibles uniquement par l'équipe support) */}
              <div className="border-t border-border/50 bg-muted/20">
                <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Notes internes
                    {notes && notes.length > 0 && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{notes.length}</span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground/70">jamais visible par l'utilisateur</span>
                </div>
                {notes && notes.length > 0 && (
                  <div className="px-4 pb-2 space-y-1.5 max-h-32 overflow-y-auto">
                    {notes.map((n) => (
                      <div key={n._id} className="rounded-lg bg-amber-500/5 border border-amber-500/15 px-3 py-2 text-[11px]">
                        <p className="text-[9px] font-semibold text-amber-600/80 mb-0.5 flex items-center gap-1">
                          <NotebookPen className="h-2.5 w-2.5" />
                          {n.authorName ?? "Support"} · {fmtDateTime(n.createdAt)}
                        </p>
                        <p className="whitespace-pre-wrap break-words text-muted-foreground">{n.body}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="px-4 pb-3 flex gap-2">
                  <Input
                    placeholder="Ajouter une note interne..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="h-8 text-[11px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleAddNote();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] gap-1 shrink-0"
                    disabled={addingNote || !noteText.trim()}
                    onClick={() => void handleAddNote()}
                  >
                    {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <NotebookPen className="h-3 w-3" />}
                    Ajouter
                  </Button>
                </div>
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
