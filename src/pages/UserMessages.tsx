import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft, MessageSquare, Loader2, Clock, CheckCircle2,
  AlertCircle, Send, Package, Download, FileText,
  Phone, Store, Briefcase, Users, User, CalendarClock, Zap, XCircle,
  Inbox, Mail, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { AvatarWithInitials } from "@/components/AvatarWithInitials";
import { toast } from "sonner";
import {
  appointmentStatusMeta,
  formatSlotLabel,
  urgentStatusMeta,
} from "@/lib/expertAvailability";
import { RequestAppointmentDialog } from "@/components/expert/ExpertRequestDialogs";
import {
  messagesTabLayout,
  resolveMessagesTab,
  tabFromSearch,
  type MessagesTab,
} from "@/lib/messagesTabs";
import { SupplierQuoteConversations } from "@/components/quotes/SupplierQuoteConversations";
import { canClientDecide, quoteStatusMeta } from "@/lib/quoteStatus";
import {
  PROJECT_TYPE_LABELS,
  resolveProjectType,
} from "@/convex/projectTypes";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const fmtTND = (amount: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND" }).format(amount);

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  responded: { label: "Répondu", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  closed: { label: "Fermé", color: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertCircle },
};

// ── Carte de réponse (expert / fournisseur) ──────────────────────────────────
//
// Même structure pour les deux types de réponse : logo + nom de l'auteur,
// message, pièce jointe, puis les deux actions « Contacter » et « Profil ».

const RESPONSE_ACCENTS = {
  expert: {
    card: "border-violet-200/40 bg-violet-50/30",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    contact: "border-violet-500/30 bg-background text-violet-700 hover:bg-violet-500/10",
    profile: "bg-violet-600 text-white hover:bg-violet-700",
  },
  supplier: {
    card: "border-emerald-200/40 bg-emerald-50/30",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    contact: "border-emerald-500/30 bg-background text-emerald-700 hover:bg-emerald-500/10",
    profile: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
} as const;

function ResponseCard({ response, kind }: { response: any; kind: "expert" | "supplier" }) {
  const navigate = useNavigate();
  const accent = RESPONSE_ACCENTS[kind];
  const isExpert = kind === "expert";

  const name = (isExpert ? response.expertName : response.supplierName) ?? (isExpert ? "Expert" : "Fournisseur");
  const logo = isExpert ? response.expertLogo : response.supplierLogo;
  const phone = isExpert ? response.expertPhone : response.supplierPhone;
  const companyName = isExpert ? response.expertCompanyName : undefined;
  const profilePath = isExpert
    ? `/dashboard/expert-profile/${response.expertId}`
    : `/dashboard/supplier-profile/${response.supplierId}`;

  return (
    <div className={`rounded-xl border p-3 ${accent.card}`}>
      {/* Auteur : logo + nom + société + montant */}
      <div className="flex items-start gap-2.5">
        <AvatarWithInitials logo={logo} name={name} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold truncate">{name}</span>
            {companyName && (
              <span className="text-[9px] text-muted-foreground truncate">{companyName}</span>
            )}
            {response.kind && response.kind !== "quote" && (
              <Badge className={`text-[9px] border ml-auto ${accent.badge}`}>
                {response.kind === "refusal" ? "Refus" : "Précision demandée"}
              </Badge>
            )}
            {response.totalAmount && (
              <Badge className={`text-[9px] border ml-auto ${accent.badge}`}>
                {fmtTND(response.totalAmount)}
              </Badge>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{fmtDate(response.createdAt)}</p>
        </div>
      </div>

      {response.message && (
        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{response.message}</p>
      )}

      {response.attachmentUrl && (
        <a
          href={response.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-primary hover:underline"
        >
          <Download className="h-3 w-3" />
          {response.attachmentFileName || "Voir la pièce jointe"}
        </a>
      )}

      {/* Actions : contacter / profil */}
      <div className="mt-2.5 flex gap-1.5">
        <a
          href={phone ? `tel:${phone}` : undefined}
          className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors ${accent.contact} ${
            phone ? "" : "pointer-events-none opacity-50"
          }`}
        >
          <Phone className="h-3 w-3" /> Contacter
        </a>
        <button
          onClick={() => navigate(profilePath)}
          className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors cursor-pointer ${accent.profile}`}
        >
          <User className="h-3 w-3" /> Profil
        </button>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────


export default function UserMessages() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // L'URL est la source de vérité de l'onglet : les notifications et les
  // raccourcis pointent directement sur le bon onglet, y compris après
  // rafraîchissement ou retour sur un projet existant. L'ancien onglet
  // « Rendez-vous » (`?tab=appointments`) est redirigé vers « Services ».
  const tab: MessagesTab = tabFromSearch(searchParams.get("tab"));

  const selectTab = (next: MessagesTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === "services") params.delete("tab");
    else params.set("tab", next);
    // Le lien profond (`?request=<id>`) ne survit pas à un changement d'onglet
    // manuel : la mise en évidence appartient au clic d'origine.
    params.delete("request");
    setSearchParams(params, { replace: true });
  };
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  // Proposer une nouvelle date après un refus
  const [rebookExpert, setRebookExpert] = useState<any>(null);

  // Rôle du compte : l'espace expert masque les devis fournisseurs,
  // l'espace fournisseur masque les services experts.
  const hasExpertProfile = useQuery(api.expertProfiles.hasExpertProfile);
  const hasSupplierProfile = useQuery(api.supplierProfiles.hasSupplierProfile);

  // Demandes & réponses fournisseurs (devis) — côté CLIENT (demandes envoyées)
  const quotes = useQuery(api.quoteRequests.getMyRequests);
  const allResponses = useQuery(api.quoteResponses.getMyResponses);
  const markSupplierResponsesRead = useMutation(api.quoteResponses.markAllRead);

  // Demandes de devis REÇUES par le fournisseur — l'UNIQUE point d'entrée et de
  // gestion des demandes de devis (l'ancien espace « Devis reçus » a été
  // supprimé). Le chargement est conditionné au profil fournisseur pour ne rien
  // exposer aux autres rôles.
  const supplierRequests = useQuery(
    api.quoteRequests.getBySupplier,
    hasSupplierProfile === true ? {} : "skip",
  );
  const supplierQuoteResponses = useQuery(
    api.quoteResponses.getBySupplier,
    hasSupplierProfile === true ? {} : "skip",
  );
  const markSupplierRequestsRead = useMutation(api.quoteRequests.markAllRead);
  const setQuoteStatus = useMutation(api.quoteRequests.updateStatus);

  // Demandes & réponses experts (services)
  const expertRequests = useQuery(api.expertServiceRequests.getMyRequests);
  const expertResponses = useQuery(api.expertServiceRequests.getMyResponses);
  const markExpertResponsesRead = useMutation(api.expertServiceRequests.responsesMarkAllRead);

  // Rendez-vous & demandes urgentes (ProMarket) — côté client
  const appointments = useQuery(api.expertAvailability.getMyAppointments);
  const urgentRequests = useQuery(api.expertAvailability.getMyUrgentRequests);
  const cancelAppointment = useMutation(api.expertAvailability.cancelAppointment);
  const cancelUrgent = useMutation(api.expertAvailability.cancelUrgent);

  // Onglets visibles pour ce rôle (règles isolées dans src/lib/messagesTabs.ts
  // et couvertes par des tests). « Mes demandes » n'existe plus dans l'espace
  // expert : un ancien lien `?tab=appointments` est redirigé vers « services »
  // (l'onglet rendez-vous a été fusionné dans les services experts).
  // au lieu d'un écran vide.
  const tabLayout = messagesTabLayout(hasExpertProfile, hasSupplierProfile);
  const {
    isExpertAccount,
    isSupplierAccount,
    showExpertServices,
    showSupplierRequests,
    showSupplierQuotes,
  } = tabLayout;

  // Rendez-vous & demandes urgentes REÇUS — côté professionnel (ProMarket).
  // Masqué tant que le rôle n'est pas chargé pour ne pas afficher de compteur
  // ou de liste vides à un client.
  const receivedAppointments = useQuery(
    api.expertAvailability.getExpertAppointments,
    isExpertAccount ? {} : "skip",
  );
  const receivedUrgent = useQuery(
    api.expertAvailability.getExpertUrgentRequests,
    isExpertAccount ? {} : "skip",
  );
  const respondAppointment = useMutation(api.expertAvailability.respondAppointment);
  const respondUrgent = useMutation(api.expertAvailability.respondUrgent);
  const markReceivedRead = useMutation(api.expertAvailability.markAllRead);

  // Dès que la messagerie est consultée, on efface les badges rouges
  useEffect(() => {
    if (allResponses && allResponses.some((r) => r.readAt === undefined)) {
      markSupplierResponsesRead();
    }
    if (expertResponses && expertResponses.some((r) => r.readAt === undefined)) {
      markExpertResponsesRead();
    }
  }, [allResponses, expertResponses, markSupplierResponsesRead, markExpertResponsesRead]);

  // Map quoteId → supplier responses
  const responsesByQuote = new Map<string, any[]>();
  if (allResponses) {
    for (const r of allResponses) {
      const list = responsesByQuote.get(r.quoteRequestId) ?? [];
      list.push(r);
      responsesByQuote.set(r.quoteRequestId, list);
    }
  }

  // Map serviceRequestId → expert responses
  const responsesByRequest = new Map<string, any[]>();
  if (expertResponses) {
    for (const r of expertResponses) {
      const list = responsesByRequest.get(r.serviceRequestId) ?? [];
      list.push(r);
      responsesByRequest.set(r.serviceRequestId, list);
    }
  }

  const pendingAppointmentsCount =
    (appointments ?? []).filter((a) => a.status === "pending").length +
    (urgentRequests ?? []).filter((u) => u.status === "pending").length;

  const handleCancelAppointment = async (id: string) => {
    try {
      await cancelAppointment({ appointmentId: id as any });
      toast.success("Rendez-vous annulé");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    }
  };

  const handleCancelUrgent = async (id: string) => {
    try {
      await cancelUrgent({ urgentId: id as any });
      toast.success("Demande urgente annulée");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    }
  };

  // ── Décision du CLIENT sur un devis reçu (accepter / refuser) ──
  const [decidingQuoteId, setDecidingQuoteId] = useState<string | null>(null);

  const handleQuoteDecision = async (
    quoteRequestId: string,
    status: "accepted" | "refused",
  ) => {
    setDecidingQuoteId(quoteRequestId);
    try {
      await setQuoteStatus({ quoteRequestId: quoteRequestId as any, status });
      toast.success(status === "accepted" ? "Devis accepté" : "Devis refusé");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setDecidingQuoteId(null);
    }
  };

  // ── Décision du professionnel sur une demande reçue ──
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const handleRespondAppointment = async (id: string, approve: boolean) => {
    setDecidingId(id);
    try {
      await respondAppointment({ appointmentId: id as any, approve });
      toast.success(approve ? "Rendez-vous confirmé" : "Demande refusée");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setDecidingId(null);
    }
  };

  const handleRespondUrgent = async (id: string, accept: boolean) => {
    setDecidingId(id);
    try {
      await respondUrgent({ urgentId: id as any, accept });
      toast.success(accept ? "Demande urgente acceptée" : "Demande urgente refusée");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setDecidingId(null);
    }
  };

  const unreadSupplierCount = allResponses?.filter((r) => r.readAt === undefined).length ?? 0;
  const unreadExpertCount = expertResponses?.filter((r) => r.readAt === undefined).length ?? 0;
  // Demandes de devis reçues non encore consultées (badge rouge du fournisseur).
  const supplierRequestsUnread =
    (supplierRequests ?? []).filter((r) => r.readAt === undefined).length;

  // Demandes reçues (rendez-vous / urgences) : compteurs du badge et de l'onglet.
  const receivedPendingCount =
    (receivedAppointments ?? []).filter((a) => a.status === "pending").length +
    (receivedUrgent ?? []).filter((u) => u.status === "pending").length;
  const receivedAppointmentsUnread =
    (receivedAppointments ?? []).filter((a) => a.readAt === undefined).length;
  const receivedUrgentUnread =
    (receivedUrgent ?? []).filter((u) => u.readAt === undefined).length;
  const receivedUnreadCount = receivedAppointmentsUnread + receivedUrgentUnread;
  const totalUnread =
    unreadSupplierCount + unreadExpertCount + receivedUnreadCount + supplierRequestsUnread;

  // L'onglet réellement affiché : celui de l'URL s'il est visible pour le rôle,
  // sinon le repli calculé par `resolveMessagesTab`.
  const activeTab: MessagesTab = resolveMessagesTab(tab, tabLayout);

  // Les demandes reçues sont marquées comme consultées dès l'ouverture de
  // l'onglet : le badge et le centre de notifications se vident alors.
  useEffect(() => {
    if (activeTab !== "received" || !isExpertAccount) return;
    if (receivedUnreadCount > 0) markReceivedRead();
  }, [activeTab, isExpertAccount, receivedUnreadCount, markReceivedRead]);

  // Les demandes de devis reçues sont marquées comme consultées dès l'ouverture
  // de l'onglet « Demandes de devis » : le badge rouge de la messagerie se vide.
  useEffect(() => {
    if (activeTab !== "requests" || !isSupplierAccount) return;
    if (supplierRequestsUnread > 0) markSupplierRequestsRead();
  }, [activeTab, isSupplierAccount, supplierRequestsUnread, markSupplierRequestsRead]);

  // ── Lien profond depuis le centre de notifications ──
  // `?tab=received&request=<id>` : on amène l'utilisateur directement sur la
  // demande concernée — défilement puis halo lumineux qui s'estompe. La mise en
  // évidence passe par l'API Web Animations (aucun état React à synchroniser).
  const focusRequestId = searchParams.get("request");
  const focusedRequestRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusRequestId) return;
    if (activeTab !== "received" && activeTab !== "requests") return;
    if (activeTab === "received" && !isExpertAccount) return;
    if (activeTab === "requests" && !isSupplierAccount) return;
    // Une seule fois par demande ciblée (les listes se rafraîchissent en direct).
    if (focusedRequestRef.current === focusRequestId) return;
    const node = document.getElementById(`request-${focusRequestId}`);
    // La liste n'est pas encore chargée : le prochain rendu relancera l'effet.
    if (!node) return;
    focusedRequestRef.current = focusRequestId;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof node.animate === "function") {
      node.animate(
        [
          { boxShadow: "0 0 0 3px rgba(59,130,246,0.55)", borderRadius: "0.75rem" },
          { boxShadow: "0 0 0 3px rgba(59,130,246,0)" },
        ],
        { duration: 2800, easing: "ease-out" },
      );
    }
  }, [
    activeTab,
    isExpertAccount,
    isSupplierAccount,
    focusRequestId,
    receivedAppointments,
    receivedUrgent,
    supplierRequests,
  ]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Messagerie</h1>
            <p className="text-xs text-muted-foreground">
              {activeTab === "received"
                ? "Demandes de rendez-vous et urgences reçues — à confirmer ou refuser"
                : activeTab === "requests"
                  ? "Demandes de devis reçues — traitez-les directement depuis la conversation"
                  : activeTab === "services"
                  ? showSupplierQuotes
                    ? "Vos demandes de services experts & de devis fournisseurs, vos rendez-vous et les réponses reçues"
                    : "Vos demandes de services experts, vos rendez-vous et les réponses reçues"
                  : "Vos demandes de devis fournisseurs et les réponses reçues"}
            </p>
          </div>
          {totalUnread > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              {totalUnread} nouvelle{totalUnread > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Tabs : Demandes reçues / Services experts (services + rendez-vous) / Devis fournisseurs */}
        <div className="flex gap-1.5 bg-muted/30 rounded-xl p-1 overflow-x-auto">
          {isExpertAccount && (
            <button
              onClick={() => selectTab("received")}
              className={`flex-1 basis-auto min-w-[8rem] whitespace-nowrap flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer relative ${
                activeTab === "received"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              Demandes reçues
              {receivedPendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                  {receivedPendingCount}
                </span>
              )}
            </button>
          )}
          {showExpertServices && (
            <button
              onClick={() => selectTab("services")}
              className={`flex-1 basis-auto min-w-[8rem] whitespace-nowrap flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer relative ${
                activeTab === "services"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Services experts
              {pendingAppointmentsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                  {pendingAppointmentsCount}
                </span>
              )}
            </button>
          )}
          {showSupplierRequests && (
            <button
              onClick={() => selectTab("requests")}
              className={`flex-1 basis-auto min-w-[8rem] whitespace-nowrap flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer relative ${
                activeTab === "requests"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              Demandes de devis
              {supplierRequestsUnread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {supplierRequestsUnread}
                </span>
              )}
            </button>
          )}
          {showSupplierQuotes && (
            <button
              onClick={() => selectTab("quotes")}
              className={`flex-1 basis-auto min-w-[8rem] whitespace-nowrap flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                activeTab === "quotes"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              Devis fournisseurs
            </button>
          )}
        </div>

        {/* ══════════ ONGLET SERVICES (demandes de service + rendez-vous) ══════════ */}
        {activeTab === "services" && (
          <>
            {/* ── Rendez-vous envoyés aux experts (fusionnés dans les services) ── */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Demandes de rendez-vous
                </p>
              </div>
              {!appointments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : appointments.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="p-6 text-center">
                    <CalendarClock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">
                      Aucune demande de rendez-vous pour le moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                appointments.map((a) => {
                  const meta = appointmentStatusMeta(a.status);
                  const canCancel = a.status === "pending" || a.status === "approved";
                  return (
                    <Card key={a._id} className="border-border/40">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold">{a.expertName}</p>
                              <Badge className={`text-[9px] border ${meta.chip}`}>{meta.label}</Badge>
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {formatSlotLabel(a.preferredDate, a.preferredTime)} · motif : {a.reason}
                            </p>
                            {a.message && (
                              <p className="mt-1 text-[11px] italic text-muted-foreground line-clamp-2">
                                « {a.message} »
                              </p>
                            )}
                            {a.decisionMessage && (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                Réponse du professionnel : {a.decisionMessage}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col gap-1">
                            {canCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 border-red-500/30 text-[10px] text-red-600 hover:bg-red-500/5"
                                onClick={() => handleCancelAppointment(a._id)}
                              >
                                <XCircle className="h-3 w-3" /> Annuler
                              </Button>
                            )}
                            {(a.status === "declined" || a.status === "cancelled") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 border-blue-500/30 text-[10px] text-blue-700 hover:bg-blue-500/5"
                                onClick={() =>
                                  setRebookExpert({ _id: a.expertId, displayName: a.expertName })
                                }
                              >
                                <CalendarClock className="h-3 w-3" /> Autre date
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Demandes urgentes
                </p>
              </div>
              {!urgentRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : urgentRequests.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="p-6 text-center">
                    <Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">Aucune demande urgente envoyée.</p>
                  </CardContent>
                </Card>
              ) : (
                urgentRequests.map((u) => {
                  const meta = urgentStatusMeta(u.status);
                  const canCancel = u.status === "pending" || u.status === "accepted";
                  return (
                    <Card key={u._id} className="border-amber-500/25 bg-amber-500/[0.04]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold">{u.expertName}</p>
                              <Badge className={`text-[9px] border ${meta.chip}`}>{meta.label}</Badge>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{u.description}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              Envoyée le {fmtDate(u.createdAt)}
                            </p>
                          </div>
                          {canCancel && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 shrink-0 gap-1 border-red-500/30 text-[10px] text-red-600 hover:bg-red-500/5"
                              onClick={() => handleCancelUrgent(u._id)}
                            >
                              <XCircle className="h-3 w-3" /> Annuler
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </section>
          </>
        )}

        {/* ══════════ ONGLET DEMANDES REÇUES (professionnel ProMarket) ══════════ */}
        {activeTab === "received" && isExpertAccount && (
          <>
            {/* Rendez-vous reçus */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Demandes de rendez-vous reçues
                </p>
                {receivedAppointmentsUnread > 0 && (
                  <Badge className="ml-auto bg-red-100 text-red-700 border-red-200 text-[9px]">
                    {receivedAppointmentsUnread} nouvelle{receivedAppointmentsUnread > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {!receivedAppointments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : receivedAppointments.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="p-6 text-center">
                    <CalendarClock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">
                      Aucune demande de rendez-vous reçue pour le moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                receivedAppointments.map((a) => {
                  const meta = appointmentStatusMeta(a.status);
                  const decidable = a.status === "pending";
                  const isNew = a.readAt === undefined;
                  const busy = decidingId === a._id;
                  return (
                    <Card
                      key={a._id}
                      id={`request-${a._id}`}
                      className={`border-border/40 scroll-mt-20 ${
                        isNew ? "border-blue-300/50 bg-blue-500/[0.03]" : ""
                      }`}
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold truncate">
                              {a.userName || "Client"}
                            </p>
                            <Badge className={`text-[9px] border ${meta.chip}`}>
                              {meta.label}
                            </Badge>
                            {isNew && (
                              <Badge className="text-[9px] border bg-blue-100 text-blue-700 border-blue-200">
                                Nouvelle
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatSlotLabel(a.preferredDate, a.preferredTime)} · motif : {a.reason}
                          </p>
                          {(a.projectName || a.projectCategory || a.projectSurface) && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              Projet : {a.projectName || "—"}
                              {a.projectCategory && (
                                <> · {resolveProjectType(a.projectCategory)
                                  ? PROJECT_TYPE_LABELS[resolveProjectType(a.projectCategory)!]
                                  : a.projectCategory}
                                </>
                              )}
                              {a.projectSurface ? <> · {a.projectSurface} m²</> : null}
                            </p>
                          )}
                          {a.message && (
                            <p className="mt-1 text-[11px] italic text-muted-foreground">
                              « {a.message} »
                            </p>
                          )}
                          {a.decisionMessage && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              Votre réponse : {a.decisionMessage}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {a.userPhone && (
                            <a
                              href={`tel:${a.userPhone}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/40 px-2 py-1 text-[10px] font-medium hover:bg-muted/40"
                            >
                              <Phone className="h-3 w-3" /> {a.userPhone}
                            </a>
                          )}
                          {a.userEmail && (
                            <a
                              href={`mailto:${a.userEmail}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/40 px-2 py-1 text-[10px] font-medium hover:bg-muted/40"
                            >
                              <Mail className="h-3 w-3" /> {a.userEmail}
                            </a>
                          )}
                        </div>

                        {decidable && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              className="h-7 flex-1 gap-1 border-red-500/30 text-[10px] text-red-600 hover:bg-red-500/5"
                              onClick={() => handleRespondAppointment(a._id, false)}
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ThumbsDown className="h-3 w-3" />
                              )}
                              Refuser
                            </Button>
                            <Button
                              size="sm"
                              disabled={busy}
                              className="h-7 flex-1 gap-1 bg-blue-600 text-[10px] text-white hover:bg-blue-700"
                              onClick={() => handleRespondAppointment(a._id, true)}
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ThumbsUp className="h-3 w-3" />
                              )}
                              Confirmer
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </section>

            {/* Demandes urgentes reçues */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Demandes urgentes reçues
                </p>
                {receivedUrgentUnread > 0 && (
                  <Badge className="ml-auto bg-red-100 text-red-700 border-red-200 text-[9px]">
                    {receivedUrgentUnread} nouvelle{receivedUrgentUnread > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {!receivedUrgent ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : receivedUrgent.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="p-6 text-center">
                    <Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">
                      Aucune demande urgente reçue pour le moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                receivedUrgent.map((u) => {
                  const meta = urgentStatusMeta(u.status);
                  const decidable = u.status === "pending";
                  const isNew = u.readAt === undefined;
                  const busy = decidingId === u._id;
                  return (
                    <Card
                      key={u._id}
                      id={`request-${u._id}`}
                      className={`border-amber-500/25 bg-amber-500/[0.04] scroll-mt-20 ${
                        isNew ? "ring-1 ring-amber-500/30" : ""
                      }`}
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold truncate">
                              {u.userName || "Client"}
                            </p>
                            <Badge className={`text-[9px] border ${meta.chip}`}>
                              {meta.label}
                            </Badge>
                            {isNew && (
                              <Badge className="text-[9px] border bg-amber-100 text-amber-700 border-amber-200">
                                Nouvelle
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{u.description}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                            {u.region && <span>Zone : {u.region}</span>}
                            {u.projectName && <span>· Projet : {u.projectName}</span>}
                            <span>· Reçue le {fmtDate(u.createdAt)}</span>
                          </div>
                          {u.decisionMessage && (
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              Votre réponse : {u.decisionMessage}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {u.userPhone && (
                            <a
                              href={`tel:${u.userPhone}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background px-2 py-1 text-[10px] font-medium hover:bg-muted/40"
                            >
                              <Phone className="h-3 w-3" /> {u.userPhone}
                            </a>
                          )}
                          {u.userEmail && (
                            <a
                              href={`mailto:${u.userEmail}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-background px-2 py-1 text-[10px] font-medium hover:bg-muted/40"
                            >
                              <Mail className="h-3 w-3" /> {u.userEmail}
                            </a>
                          )}
                        </div>

                        {decidable && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              className="h-7 flex-1 gap-1 border-red-500/30 bg-background text-[10px] text-red-600 hover:bg-red-500/5"
                              onClick={() => handleRespondUrgent(u._id, false)}
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ThumbsDown className="h-3 w-3" />
                              )}
                              Refuser
                            </Button>
                            <Button
                              size="sm"
                              disabled={busy}
                              className="h-7 flex-1 gap-1 bg-amber-600 text-[10px] text-white hover:bg-amber-700"
                              onClick={() => handleRespondUrgent(u._id, true)}
                            >
                              {busy ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ThumbsUp className="h-3 w-3" />
                              )}
                              Accepter
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </section>
          </>
        )}

        {/* ══════════ ONGLET DEMANDES DE DEVIS (fournisseur) ══════════ */}
        {activeTab === "requests" && isSupplierAccount && (
          <SupplierQuoteConversations
            requests={supplierRequests}
            responses={supplierQuoteResponses}
          />
        )}

        {/* ══════════ ONGLET DEVIS (fournisseurs) ══════════ */}
        {activeTab === "quotes" && (
          <>
            {/* Demandes en attente de réponse */}
            {quotes && quotes.filter((q) => q.status === "pending").length > 0 && (
              <Card className="border-amber-200/50 bg-amber-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-700">Demandes en attente</p>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] ml-auto">
                      {quotes.filter((q) => q.status === "pending").length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {quotes.filter((q) => q.status === "pending").map((q) => (
                      <div key={q._id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/30 bg-background/60">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{q.projectName || q.category}</p>
                          <p className="text-[9px] text-muted-foreground">{q.category} · {fmtDate(q.createdAt)}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 shrink-0">
                          <Phone className="h-3 w-3" />
                          Contacter
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historique des envois */}
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historique des envois</p>
              {unreadSupplierCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] ml-auto">
                  {unreadSupplierCount} non lue{unreadSupplierCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {/* Liste des demandes de devis */}
            {!quotes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : quotes.length === 0 ? (
              <Card className="border-border/40">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Aucune demande envoyée</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Envoyez une demande de devis depuis la page matériaux IA ou les résultats de votre projet, puis retrouvez les offres des fournisseurs ici.
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => navigate("/dashboard/ai-materials")}
                    >
                      <FileText className="h-3 w-3 mr-1" /> Aller aux Matériaux IA
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => navigate("/dashboard/suppliers-directory")}
                    >
                      <Store className="h-3 w-3 mr-1" /> Trouvez un fournisseur près de chez vous
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => {
                  const cfg = quoteStatusMeta(quote.status);
                  const responses = responsesByQuote.get(quote._id) ?? [];


                  return (
                    <motion.div
                      key={quote._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card
                        className={`border-border/40 transition-colors ${
                          selectedQuote?._id === quote._id
                            ? "border-primary/30 bg-primary/[0.02]"
                            : "hover:border-primary/15"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div
                            className="cursor-pointer"
                            onClick={() => setSelectedQuote(
                              selectedQuote?._id === quote._id ? null : quote
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold">
                                    {quote.projectName || quote.category}
                                  </p>
                                  <Badge className={`text-[9px] border ${cfg.chip}`}>
                                    <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                    {cfg.label}
                                  </Badge>
                                  {responses.length > 0 && (
                                    <Badge variant="secondary" className="text-[9px]">
                                      {responses.length} réponse{responses.length > 1 ? "s" : ""}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {quote.category} · {fmtDate(quote.createdAt)}
                                </p>
                              </div>
                            </div>

                            {/* Materials summary */}
                            {quote.materials && quote.materials.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {quote.materials.slice(0, 4).map((m: any, i: number) => (
                                  <span
                                    key={i}
                                    className="text-[9px] bg-muted/30 border border-border/20 rounded px-1.5 py-0.5"
                                  >
                                    {m.name}
                                  </span>
                                ))}
                                {quote.materials.length > 4 && (
                                  <span className="text-[9px] text-muted-foreground">
                                    +{quote.materials.length - 4} autres
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Expanded view with responses */}
                          {selectedQuote?._id === quote._id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              transition={{ duration: 0.2 }}
                              className="mt-3 pt-3 border-t border-border/10 space-y-3"
                            >
                              {/* Materials detail */}
                              {quote.materials && quote.materials.length > 0 && (
                                <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5">
                                  <p className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                                    <Package className="h-2.5 w-2.5" /> Matériaux demandés
                                  </p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-border/10">
                                        <th className="text-left py-1 font-medium text-muted-foreground">Désignation</th>
                                        <th className="text-right py-1 font-medium text-muted-foreground">Qté</th>
                                        <th className="text-right py-1 font-medium text-muted-foreground">Unité</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {quote.materials.map((m: any, i: number) => (
                                        <tr key={i} className="border-b border-border/5 last:border-0">
                                          <td className="py-1 font-medium">{m.name}</td>
                                          <td className="py-1 text-right tabular-nums">{m.quantity}</td>
                                          <td className="py-1 text-right text-muted-foreground">{m.unit}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* User message */}
                              {quote.message && (
                                <div className="rounded-lg bg-primary/[0.03] border border-primary/10 p-2.5">
                                  <p className="text-[9px] font-semibold text-primary/70 mb-0.5">Votre message</p>
                                  <p className="text-xs text-muted-foreground">{quote.message}</p>
                                </div>
                              )}

                              {/* Supplier responses */}
                              {responses.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Réponses des fournisseurs ({responses.length})
                                  </p>
                                  {responses.map((resp) => (
                                    <ResponseCard key={resp._id} response={resp} kind="supplier" />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground/60 text-center py-2">
                                  Aucune réponse pour l'instant. Le fournisseur examinera votre demande prochainement.
                                </p>
                              )}

                              {/* Décision du client sur le devis reçu */}
                              {canClientDecide(quote.status) && (
                                <div className="flex gap-1.5 border-t border-border/10 pt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={decidingQuoteId === quote._id}
                                    className="h-8 flex-1 gap-1.5 text-xs border-red-500/30 text-red-600 hover:bg-red-500/5"
                                    onClick={() => handleQuoteDecision(quote._id, "refused")}
                                  >
                                    {decidingQuoteId === quote._id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <ThumbsDown className="h-3 w-3" />
                                    )}
                                    Refuser le devis
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={decidingQuoteId === quote._id}
                                    className="h-8 flex-1 gap-1.5 text-xs bg-teal-600 text-white hover:bg-teal-700"
                                    onClick={() => handleQuoteDecision(quote._id, "accepted")}
                                  >
                                    {decidingQuoteId === quote._id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <ThumbsUp className="h-3 w-3" />
                                    )}
                                    Accepter le devis
                                  </Button>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════ SERVICES — historique des demandes envoyées ══════════ */}
        {activeTab === "services" && (
          <>
            {/* ── Historique des demandes de service envoyées aux experts ── */}
            <div className="flex items-center gap-2 pt-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historique des demandes</p>
              {unreadExpertCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] ml-auto">
                  {unreadExpertCount} non lue{unreadExpertCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {!expertRequests ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : expertRequests.length === 0 ? (
              <Card className="border-border/40">
                <CardContent className="p-8 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Aucune demande envoyée à un expert</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Demandez un devis à un architecte, ingénieur ou bureau d'études depuis « Trouvez un expert près de chez vous ».
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 text-xs"
                    onClick={() => navigate("/dashboard/professionals-directory")}
                  >
                    <Briefcase className="h-3 w-3 mr-1" /> Trouvez un expert près de chez vous
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {expertRequests.map((req) => {
                  const cfg = STATUS_CONFIG[req.status];
                  const StatusIcon = cfg.icon;
                  const responses = responsesByRequest.get(req._id) ?? [];
                  const expanded = selectedRequest?._id === req._id;

                  return (
                    <motion.div
                      key={req._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card
                        className={`border-border/40 transition-colors ${
                          expanded
                            ? "border-violet-300/40 bg-violet-500/[0.02]"
                            : "hover:border-violet-300/30"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div
                            className="cursor-pointer"
                            onClick={() => setSelectedRequest(expanded ? null : req)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold">
                                    {req.projectName || (req.requestType === "devis" ? "Devis" : "Service")}
                                  </p>
                                  <Badge className={`text-[9px] border ${cfg.color}`}>
                                    <StatusIcon className="h-2.5 w-2.5 mr-1" />
                                    {cfg.label}
                                  </Badge>
                                  {responses.length > 0 && (
                                    <Badge variant="secondary" className="text-[9px]">
                                      {responses.length} réponse{responses.length > 1 ? "s" : ""}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-[10px] text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <Briefcase className="h-2.5 w-2.5" />
                                    {req.serviceType}
                                  </span>
                                  {req.surface ? <span>· {req.surface} m²</span> : null}
                                  {req.region ? <span>· {req.region}</span> : null}
                                  <span>· {fmtDate(req.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded view with responses */}
                          {expanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              transition={{ duration: 0.2 }}
                              className="mt-3 pt-3 border-t border-border/10 space-y-3"
                            >
                              {/* User message */}
                              {req.description && (
                                <div className="rounded-lg bg-violet-500/[0.04] border border-violet-500/15 p-2.5">
                                  <p className="text-[9px] font-semibold text-violet-600/80 mb-0.5">Votre demande</p>
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{req.description}</p>
                                </div>
                              )}

                              {/* Expert responses */}
                              {responses.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Réponses des experts ({responses.length})
                                  </p>
                                  {responses.map((resp) => (
                                    <ResponseCard key={resp._id} response={resp} kind="expert" />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground/60 text-center py-2">
                                  Aucune réponse pour l'instant. L'expert examinera votre demande prochainement.
                                </p>
                              )}
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {/* Nouvelle proposition de créneau après un refus ou une annulation */}
      <RequestAppointmentDialog
        expert={rebookExpert}
        open={!!rebookExpert}
        onOpenChange={(o) => { if (!o) setRebookExpert(null); }}
      />
    </main>
  );
}
