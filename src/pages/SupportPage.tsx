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
  CircleAlert,
  Clock,
  Headset,
  Loader2,
  Lock,
  Megaphone,
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
  ad_request: "Demande d'annonce",
};

/** Types d'annonce — miroir de `AD_TYPES` côté Convex (support.ts). */
const AD_TYPES = [
  "Prestataire de services",
  "Fournisseur de matériaux",
  "Promoteur immobilier",
  "Matériel / engins",
  "Recrutement",
  "Autre",
] as const;

const AD_STAGE_LABELS: Record<string, string> = {
  nouvelle: "Nouvelle",
  en_cours: "En cours",
  acceptee: "Acceptée",
  refusee: "Refusée",
  terminee: "Terminée",
};

const AD_STAGE_STYLES: Record<string, string> = {
  nouvelle: "bg-amber-500/10 text-amber-600 border-amber-500/25",
  en_cours: "bg-blue-500/10 text-blue-600 border-blue-500/25",
  acceptee: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
  refusee: "bg-red-500/10 text-red-600 border-red-500/25",
  terminee: "bg-violet-500/10 text-violet-600 border-violet-500/25",
};

const AD_PAYMENT_LABELS: Record<string, string> = {
  pending: "En attente de paiement",
  proof_uploaded: "Preuve téléversée",
  confirmed: "Paiement confirmé",
  rejected: "Preuve refusée",
  not_required: "Sans objet",
};

const AD_PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/25",
  proof_uploaded: "bg-blue-500/10 text-blue-600 border-blue-500/25",
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
  rejected: "bg-red-500/10 text-red-600 border-red-500/25",
  not_required: "bg-muted text-muted-foreground border-border",
};

const emptyAdForm = {
  companyName: "",
  requesterName: "",
  phone: "",
  email: "",
  adTitle: "",
  adDescription: "",
  adType: "",
  publicationDurationDays: 30,
  additionalInfo: "",
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
  const createAdRequestTicket = useMutation(api.support.createAdRequestTicket);
  const uploadAdPaymentProof = useMutation(api.support.uploadAdPaymentProof);

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

  // Demande d'annonce — formulaire spécifique
  const [adForm, setAdForm] = useState(emptyAdForm);
  const [adLogo, setAdLogo] = useState<File | null>(null);
  const [adAttachment, setAdAttachment] = useState<File | null>(null);
  const [adPaymentFile, setAdPaymentFile] = useState<File | null>(null);
  const [payingAd, setPayingAd] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const adLogoInputRef = useRef<HTMLInputElement>(null);
  const adAttachmentInputRef = useRef<HTMLInputElement>(null);
  const adPaymentInputRef = useRef<HTMLInputElement>(null);
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
    setAdForm(emptyAdForm);
    setAdLogo(null);
    setAdAttachment(null);
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
    if (form.category === "ad_request") {
      // La demande d'annonce passe par le formulaire dédié.
      return handleCreateAd();
    }
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

  const isAdTicket = selectedTicket?.category === "ad_request" && !!selectedTicket.adRequest;

  const handleCreateAd = async () => {
    if (!adForm.companyName.trim()) return toast.error("Le nom de la société est obligatoire");
    if (!adForm.requesterName.trim()) return toast.error("Le nom du demandeur est obligatoire");
    if (!adForm.phone.trim()) return toast.error("Le téléphone est obligatoire");
    if (!adForm.email.trim() || !adForm.email.includes("@")) {
      return toast.error("Un e-mail valide est obligatoire");
    }
    if (!adForm.adTitle.trim()) return toast.error("Le titre de l'annonce est obligatoire");
    if (!adForm.adDescription.trim()) {
      return toast.error("La description de l'annonce est obligatoire");
    }
    if (!adForm.adType) return toast.error("Le type d'annonce est obligatoire");
    if (adForm.publicationDurationDays < 1) {
      return toast.error("La durée de publication doit être d'au moins 1 jour");
    }
    for (const f of [adLogo, adAttachment].filter(Boolean) as File[]) {
      const err = validateAttachment(f);
      if (err) return toast.error(err);
    }
    setCreating(true);
    try {
      const upload = async (file: File): Promise<Id<"_storage">> => {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
        return storageId;
      };
      const logoStorageId = adLogo ? await upload(adLogo) : undefined;
      const attachmentStorageId = adAttachment ? await upload(adAttachment) : undefined;
      const ticketId = await createAdRequestTicket({
        form: {
          companyName: adForm.companyName,
          requesterName: adForm.requesterName,
          phone: adForm.phone,
          email: adForm.email,
          adTitle: adForm.adTitle,
          adDescription: adForm.adDescription,
          adType: adForm.adType,
          publicationDurationDays: adForm.publicationDurationDays,
          additionalInfo: adForm.additionalInfo || undefined,
          logoStorageId,
          logoName: adLogo?.name,
          attachmentStorageId,
          attachmentName: adAttachment?.name,
        },
      });
      toast.success(
        "Votre demande d'annonce a été envoyée — elle sera examinée par l'équipe support",
      );
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

  const handleUploadAdPayment = async () => {
    if (!selectedTicket || !adPaymentFile) return;
    const err = validateAttachment(adPaymentFile);
    if (err) return toast.error(err);
    setPayingAd(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": adPaymentFile.type },
        body: adPaymentFile,
      });
      const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
      await uploadAdPaymentProof({
        ticketId: selectedTicket._id,
        storageId,
        fileName: adPaymentFile.name,
      });
      setAdPaymentFile(null);
      toast.success("Preuve de paiement envoyée — en attente de confirmation");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de la preuve");
    } finally {
      setPayingAd(false);
    }
  };

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

                  {/* Demande d'annonce — récapitulatif + paiement */}
                  {isAdTicket && selectedTicket.adRequest && (
                    <div className="px-4 pt-3">
                      <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3.5 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant="outline" className="gap-1 text-[10px] text-primary border-primary/30 bg-primary/5">
                            <Megaphone className="h-3 w-3" />
                            Demande d'annonce
                          </Badge>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                AD_STAGE_STYLES[selectedTicket.adRequest.stage],
                              )}
                            >
                              {AD_STAGE_LABELS[selectedTicket.adRequest.stage]}
                            </Badge>
                            {selectedTicket.adRequest.paymentStatus && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  AD_PAYMENT_STYLES[selectedTicket.adRequest.paymentStatus],
                                )}
                              >
                                {AD_PAYMENT_LABELS[selectedTicket.adRequest.paymentStatus]}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Société :</span>{" "}
                            {selectedTicket.adRequest.companyName}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Demandeur :</span>{" "}
                            {selectedTicket.adRequest.requesterName}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Téléphone :</span>{" "}
                            {selectedTicket.adRequest.phone}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">E-mail :</span>{" "}
                            {selectedTicket.adRequest.email}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Type :</span>{" "}
                            {selectedTicket.adRequest.adType}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Durée souhaitée :</span>{" "}
                            {selectedTicket.adRequest.publicationDurationDays} jour(s)
                          </p>
                          {selectedTicket.adRequest.price !== undefined && (
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">Prix :</span>{" "}
                              <span className="font-bold text-primary">
                                {selectedTicket.adRequest.price} TND
                              </span>
                            </p>
                          )}
                          {selectedTicket.adRequest.finalDurationDays !== undefined && (
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">Durée validée :</span>{" "}
                              {selectedTicket.adRequest.finalDurationDays} jour(s)
                            </p>
                          )}
                        </div>

                        {selectedTicket.adRequest.adminResponse && (
                          <p className="text-[11px] rounded-lg bg-muted/60 px-2.5 py-1.5 text-muted-foreground">
                            <span className="font-medium text-foreground">Réponse de l'équipe :</span>{" "}
                            {selectedTicket.adRequest.adminResponse}
                          </p>
                        )}

                        {selectedTicket.adRequestFiles?.logoUrl && (
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <img
                              src={selectedTicket.adRequestFiles?.logoUrl}
                              alt="Logo"
                              className="h-8 w-8 rounded object-cover border border-border/50"
                            />
                            Logo de l'entreprise
                          </div>
                        )}
                        {selectedTicket.adRequestFiles?.attachmentUrl && (
                          <a
                            href={selectedTicket.adRequestFiles?.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                          >
                            <Paperclip className="h-3 w-3" />
                            {selectedTicket.adRequestFiles?.attachmentName ?? "Pièce jointe"}
                          </a>
                        )}

                        {/* Paiement — visible une fois la demande acceptée */}
                        {selectedTicket.adRequest.stage === "acceptee" &&
                          selectedTicket.adRequest.price !== undefined &&
                          selectedTicket.adRequest.price > 0 &&
                          selectedTicket.adRequest.paymentStatus !== "confirmed" &&
                          selectedTicket.adRequest.paymentStatus !== "not_required" && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                💳 Prix de l'annonce : {selectedTicket.adRequest.price} TND —
                                envoyez votre preuve de paiement pour publication.
                              </p>
                              <input
                                ref={adPaymentInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    const err = validateAttachment(f);
                                    if (err) toast.error(err);
                                    else setAdPaymentFile(f);
                                  }
                                  e.target.value = "";
                                }}
                              />
                              {adPaymentFile && (
                                <div className="flex items-center gap-2 rounded-lg bg-background/70 px-2.5 py-1.5 text-[11px]">
                                  <Paperclip className="h-3 w-3 shrink-0" />
                                  <span className="truncate flex-1">{adPaymentFile.name}</span>
                                  <button onClick={() => setAdPaymentFile(null)}>
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </div>
                              )}
                              <Button
                                size="sm"
                                className="h-8 w-full gap-1.5 text-[11px]"
                                disabled={payingAd || !adPaymentFile}
                                onClick={() => void handleUploadAdPayment()}
                              >
                                {payingAd ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                Envoyer la preuve de paiement
                              </Button>
                            </div>
                          )}

                        {selectedTicket.adRequest.paymentStatus === "confirmed" && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✅ Paiement confirmé —
                            {selectedTicket.adRequest.announcementId
                              ? " votre annonce est publiée."
                              : " votre annonce sera publiée par l'équipe."}
                          </p>
                        )}
                        {selectedTicket.adRequestFiles?.paymentProofUrl && (
                          <a
                            href={selectedTicket.adRequestFiles?.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                          >
                            <Paperclip className="h-3 w-3" />
                            {selectedTicket.adRequestFiles?.paymentProofName ?? "Preuve de paiement"}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

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
              {form.category === "ad_request"
                ? "Soumettez votre demande de publication d'annonce payante — l'équipe support reviendra vers vous."
                : "Décrivez votre demande — l'équipe support vous répondra directement ici."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain py-1 sm:space-y-3.5">
            {form.category !== "ad_request" && (
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
            )}

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
              {form.category !== "ad_request" && (
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
              )}
            </div>

            {form.category === "ad_request" && (
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 space-y-3">
                <p className="text-[10px] leading-relaxed text-muted-foreground flex items-start gap-1.5">
                  <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                  Votre annonce ne sera publiée qu'après validation par l'équipe
                  support, définition du prix et confirmation de votre paiement.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Nom de la société / entreprise *</label>
                    <Input
                      placeholder="Ex. : BatiBuild SARL"
                      value={adForm.companyName}
                      onChange={(e) => setAdForm({ ...adForm, companyName: e.target.value })}
                      maxLength={120}
                      className="h-10 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Nom du demandeur *</label>
                    <Input
                      placeholder="Ex. : Mohamed Trabelsi"
                      value={adForm.requesterName}
                      onChange={(e) => setAdForm({ ...adForm, requesterName: e.target.value })}
                      maxLength={120}
                      className="h-10 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Téléphone *</label>
                    <Input
                      type="tel"
                      placeholder="Ex. : +216 20 000 000"
                      value={adForm.phone}
                      onChange={(e) => setAdForm({ ...adForm, phone: e.target.value })}
                      maxLength={30}
                      className="h-10 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">E-mail *</label>
                    <Input
                      type="email"
                      placeholder="contact@societe.tn"
                      value={adForm.email}
                      onChange={(e) => setAdForm({ ...adForm, email: e.target.value })}
                      maxLength={160}
                      className="h-10 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Titre de l'annonce *</label>
                    <Input
                      placeholder="Ex. : Vente de ciment — prix promotionnel"
                      value={adForm.adTitle}
                      onChange={(e) => setAdForm({ ...adForm, adTitle: e.target.value })}
                      maxLength={120}
                      className="h-10 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Type d'annonce *</label>
                    <Select
                      value={adForm.adType}
                      onValueChange={(v) => setAdForm({ ...adForm, adType: v })}
                    >
                      <SelectTrigger className="h-10 w-full sm:h-9">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AD_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium">Description de l'annonce *</label>
                    <Textarea
                      placeholder="Décrivez le contenu de l'annonce à publier..."
                      value={adForm.adDescription}
                      onChange={(e) => setAdForm({ ...adForm, adDescription: e.target.value })}
                      className="min-h-[90px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Durée de publication souhaitée (jours) *</label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={adForm.publicationDurationDays}
                      onChange={(e) =>
                        setAdForm({
                          ...adForm,
                          publicationDurationDays: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="h-10 sm:h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Image ou logo de l'entreprise</label>
                    <input
                      ref={adLogoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const err = validateAttachment(f);
                          if (err) toast.error(err);
                          else setAdLogo(f);
                        }
                        e.target.value = "";
                      }}
                    />
                    {adLogo ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate flex-1">{adLogo.name}</span>
                        <button onClick={() => setAdLogo(null)}>
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full gap-2 border-dashed sm:h-9"
                        onClick={() => adLogoInputRef.current?.click()}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Joindre un logo (5 Mo max)
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium">Pièce jointe (si nécessaire)</label>
                    <input
                      ref={adAttachmentInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const err = validateAttachment(f);
                          if (err) toast.error(err);
                          else setAdAttachment(f);
                        }
                        e.target.value = "";
                      }}
                    />
                    {adAttachment ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate flex-1">{adAttachment.name}</span>
                        <button onClick={() => setAdAttachment(null)}>
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full gap-2 border-dashed sm:h-9"
                        onClick={() => adAttachmentInputRef.current?.click()}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Joindre un fichier (5 Mo max)
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium">Informations complémentaires</label>
                    <Textarea
                      placeholder="Coordonnées de contact, site web, conditions particulières..."
                      value={adForm.additionalInfo}
                      onChange={(e) => setAdForm({ ...adForm, additionalInfo: e.target.value })}
                      className="min-h-[70px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {form.category !== "ad_request" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Message *</label>
                <Textarea
                  placeholder="Décrivez votre demande en détail..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="min-h-[100px] sm:min-h-[110px]"
                />
              </div>
            )}

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
              onClick={() => void (form.category === "ad_request" ? handleCreateAd() : handleCreate())}
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
