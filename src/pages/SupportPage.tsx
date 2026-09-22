import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  CircleCheck,
  Clock,
  Headset,
  Loader2,
  Lock,
  MessageSquarePlus,
  Paperclip,
  Search,
  Send,
  Ticket,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

// ── Labels & styles ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Problème technique",
  account: "Compte utilisateur",
  billing: "Abonnement et paiement",
  project: "Projet",
  feature: "Fonctionnalité",
  other: "Autre",
};

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: any }> = {
  open: {
    label: "Nouveau",
    cls: "bg-amber-500/10 text-amber-600 border-amber-500/25",
    icon: Clock,
  },
  in_progress: {
    label: "En cours",
    cls: "bg-blue-500/10 text-blue-600 border-blue-500/25",
    icon: Send,
  },
  awaiting_user: {
    label: "En attente utilisateur",
    cls: "bg-violet-500/10 text-violet-600 border-violet-500/25",
    icon: Clock,
  },
  resolved: {
    label: "Résolu",
    cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
    icon: CircleCheck,
  },
  closed: {
    label: "Fermé",
    cls: "bg-muted text-muted-foreground border-border",
    icon: Lock,
  },
};

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  low: { label: "Faible", cls: "bg-muted text-muted-foreground border-border" },
  normal: { label: "Normale", cls: "bg-sky-500/10 text-sky-600 border-sky-500/25" },
  high: { label: "Élevée", cls: "bg-orange-500/10 text-orange-600 border-orange-500/25" },
  urgent: { label: "Urgente", cls: "bg-red-500/10 text-red-600 border-red-500/25" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.open;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px]", s.cls)}>
      <Icon className="h-3 w-3" />
      {s.label}
    </Badge>
  );
}

const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtShort = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
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

export default function SupportPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTicketId = searchParams.get("ticket") as Id<"supportTickets"> | null;

  const tickets = useQuery(api.support.getMyTickets, {});
  const messages = useQuery(
    api.support.getTicketMessages,
    selectedTicketId ? { ticketId: selectedTicketId } : "skip",
  );

  const createTicket = useMutation(api.support.createTicket);
  const sendUserMessage = useMutation(api.support.sendUserMessage);
  const markTicketRead = useMutation(api.support.markTicketRead);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: "technical",
    priority: "normal",
    message: "",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [chatAttachment, setChatAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedTicket = useMemo(
    () => tickets?.find((t) => t._id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  );

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        (CATEGORY_LABELS[t.category] ?? "").toLowerCase().includes(q),
    );
  }, [tickets, search]);

  // Marquer comme lus à l'ouverture d'un ticket
  useEffect(() => {
    if (selectedTicket && (selectedTicket.userUnreadCount ?? 0) > 0) {
      void markTicketRead({ ticketId: selectedTicket._id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket?._id, selectedTicket?.userUnreadCount]);

  // Défilement automatique vers les nouveaux messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, selectedTicketId]);

  const resetNewForm = () => {
    setForm({ subject: "", category: "technical", priority: "normal", message: "" });
    setAttachment(null);
  };

  const validateAttachment = (file: File): string | null => {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return "Format non pris en charge — images (PNG, JPG, WEBP, GIF) ou PDF uniquement.";
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return "Fichier trop volumineux — 5 Mo maximum.";
    }
    return null;
  };

  const handleCreate = async () => {
    if (!form.subject.trim()) return toast.error("Le sujet est obligatoire");
    if (!form.message.trim()) return toast.error("Le message est obligatoire");
    if (attachment) {
      const err = validateAttachment(attachment);
      if (err) return toast.error(err);
    }
    setCreating(true);
    try {
      let storageId: Id<"_storage"> | undefined;
      if (attachment) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": attachment.type },
          body: attachment,
        });
        const { storageId: sid } = (await result.json()) as {
          storageId: Id<"_storage">;
        };
        storageId = sid;
      }
      const ticketId = await createTicket({
        subject: form.subject,
        category: form.category as any,
        priority: form.priority as any,
        message: form.message,
        attachmentStorageId: storageId,
        attachmentName: attachment?.name,
        attachmentType: attachment?.type,
        attachmentSize: attachment?.size,
      });
      toast.success("Votre demande a été envoyée à l'équipe support");
      setNewOpen(false);
      resetNewForm();
      setSearchParams({ ticket: ticketId });
      setMobileListOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTicket) return;
    if (!messageText.trim() && !chatAttachment) return;
    if (chatAttachment) {
      const err = validateAttachment(chatAttachment);
      if (err) return toast.error(err);
    }
    setSending(true);
    try {
      let storageId: Id<"_storage"> | undefined;
      if (chatAttachment) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": chatAttachment.type },
          body: chatAttachment,
        });
        const { storageId: sid } = (await result.json()) as {
          storageId: Id<"_storage">;
        };
        storageId = sid;
      }
      await sendUserMessage({
        ticketId: selectedTicket._id,
        body: messageText,
        attachmentStorageId: storageId,
        attachmentName: chatAttachment?.name,
        attachmentType: chatAttachment?.type,
        attachmentSize: chatAttachment?.size,
      });
      setMessageText("");
      setChatAttachment(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const closed = selectedTicket?.status === "closed";

  // ── Sidebar (liste des tickets) ──
  const ticketsList = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/50 space-y-2.5">
        <Button onClick={() => setNewOpen(true)} className="w-full gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Nouvelle demande
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une demande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredTickets.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <Ticket className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              {tickets ? "Aucune demande de support" : "Chargement..."}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredTickets.map((t) => {
              const unread = t.userUnreadCount ?? 0;
              return (
                <button
                  key={t._id}
                  onClick={() => {
                    setSearchParams({ ticket: t._id });
                    setMobileListOpen(false);
                  }}
                  className={cn(
                    "w-full text-left rounded-xl p-3 transition-colors space-y-1.5 border border-transparent",
                    t._id === selectedTicketId
                      ? "bg-primary/10 border-primary/20"
                      : "hover:bg-muted/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="text-[9px] font-mono text-muted-foreground/70 block">
                        #{t.ticketNumber ?? `SUP-${t._id.slice(-6)}`}
                      </span>
                      <span className="text-xs font-medium line-clamp-1 block">
                        {t.subject}
                      </span>
                    </div>
                    {unread > 0 && (
                      <span className="shrink-0 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={t.status} />
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {fmtShort(t.lastActivityAt)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/30 to-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Headset className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                Support &amp; Messagerie
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Contactez l'équipe BatiBuild — réponses suivies en temps réel
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden gap-1.5"
            onClick={() => setMobileListOpen((v) => !v)}
          >
            <Ticket className="h-3.5 w-3.5" />
            Mes demandes
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          {/* Sidebar desktop */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden h-[calc(100vh-14rem)] min-h-[420px]">
              {ticketsList}
            </div>
          </div>

          {/* Sidebar mobile (repliable) */}
          {mobileListOpen && (
            <div className="lg:hidden">
              <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden max-h-[60vh]">
                {ticketsList}
              </div>
            </div>
          )}

          {/* Conversation */}
          <div>
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[420px]">
              {!selectedTicket ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Headset className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold">Comment pouvons-nous vous aider ?</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Sélectionnez une demande dans la liste ou créez une nouvelle demande
                    pour contacter l'équipe support BatiBuild.
                  </p>
                  <Button onClick={() => setNewOpen(true)} className="gap-2 mt-1">
                    <MessageSquarePlus className="h-4 w-4" />
                    Nouvelle demande
                  </Button>
                </div>
              ) : (
                <>
                  {/* En-tête conversation */}
                  <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.image ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/15 text-primary">
                        {initials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">
                          #{selectedTicket.ticketNumber ?? `SUP-${selectedTicket._id.slice(-6)}`}
                        </span>
                        <StatusBadge status={selectedTicket.status} />
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            PRIORITY_STYLES[selectedTicket.priority]?.cls,
                          )}
                        >
                          {PRIORITY_STYLES[selectedTicket.priority]?.label}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-semibold truncate mt-0.5">
                        {selectedTicket.subject}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        {CATEGORY_LABELS[selectedTicket.category]} · Créée le{" "}
                        {fmtDateTime(selectedTicket.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messages === undefined ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages === null ? (
                      <p className="text-center text-xs text-muted-foreground py-12">
                        Conversation introuvable.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((m) => {
                          const mine = m.senderRole === "user";
                          return (
                            <div
                              key={m._id}
                              className={cn(
                                "flex gap-2.5",
                                mine ? "justify-end" : "justify-start",
                              )}
                            >
                              {!mine && (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-white shadow-sm">
                                  <Headset className="h-4 w-4" />
                                </div>
                              )}
                              <div
                                className={cn(
                                  "max-w-[78%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm border",
                                  mine
                                    ? "bg-primary text-primary-foreground border-primary/20 rounded-br-md"
                                    : "bg-muted/60 border-border/50 rounded-bl-md",
                                )}
                              >
                                <p className="text-[10px] font-medium opacity-75 mb-1">
                                  {mine ? "Vous" : "Équipe Support"} ·{" "}
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
                                      mine
                                        ? "bg-primary-foreground/15 hover:bg-primary-foreground/25"
                                        : "bg-background hover:bg-muted",
                                    )}
                                  >
                                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                      {m.attachmentName ?? "Pièce jointe"}
                                    </span>
                                  </a>
                                )}
                              </div>
                              {mine && (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                                  {user?.image ? (
                                    <img
                                      src={user.image}
                                      alt=""
                                      className="h-8 w-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold">
                                      {initials(user?.name)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div ref={bottomRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Zone de saisie */}
                  <div className="p-3 border-t border-border/50">
                    {closed ? (
                      <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        Cette demande est fermée — créez une nouvelle demande si besoin.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {chatAttachment && (
                          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
                            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate flex-1">{chatAttachment.name}</span>
                            <button
                              onClick={() => setChatAttachment(null)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-end gap-2">
                          <input
                            ref={chatFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                const err = validateAttachment(f);
                                if (err) toast.error(err);
                                else setChatAttachment(f);
                              }
                              e.target.value = "";
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                            onClick={() => chatFileInputRef.current?.click()}
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <Textarea
                            placeholder="Écrivez votre message..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void handleSend();
                              }
                            }}
                            className="min-h-[44px] max-h-32 resize-none text-sm"
                            rows={1}
                          />
                          <Button
                            size="icon"
                            className="shrink-0 rounded-full"
                            disabled={sending || (!messageText.trim() && !chatAttachment)}
                            onClick={() => void handleSend()}
                          >
                            {sending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog nouvelle demande */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent
          showCloseButton={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="flex flex-col top-3 translate-y-0 w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] gap-2 sm:top-[50%] sm:translate-y-[-50%] sm:w-full sm:max-w-lg sm:max-h-[calc(100dvh-4rem)] sm:rounded-lg sm:p-6 sm:gap-4"
        >
          <DialogHeader className="shrink-0 gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="flex items-center gap-2 text-base leading-tight sm:text-lg">
                <MessageSquarePlus className="h-5 w-5 shrink-0 text-primary" />
                Nouvelle demande de support
              </DialogTitle>
              <DialogClose asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
            <DialogDescription className="text-left">
              Décrivez votre demande — l'équipe support vous répondra directement ici.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-1 sm:space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Sujet de la demande *</label>
              <Input
                placeholder="Ex. : Impossible d'exporter mon rapport"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                maxLength={120}
                className="h-10 sm:h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Catégorie *</label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger className="h-10 w-full sm:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Priorité</label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger className="h-10 w-full sm:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_STYLES).map(([value, p]) => (
                      <SelectItem key={value} value={value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Message *</label>
              <Textarea
                placeholder="Décrivez votre demande en détail..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="min-h-[100px] sm:min-h-[110px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Pièce jointe (optionnel)</label>
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
              {attachment ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate flex-1">
                    {attachment.name} ({(attachment.size / 1024).toFixed(0)} Ko)
                  </span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 w-full gap-2 border-dashed sm:h-8"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Joindre une image ou un PDF (5 Mo max)
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/50 pt-3 sm:border-0 sm:pt-1">
            <Button
              variant="outline"
              onClick={() => setNewOpen(false)}
              className="h-11 w-full sm:h-9 sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={creating}
              className="h-11 w-full sm:h-9 sm:w-auto"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Envoyer la demande
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
