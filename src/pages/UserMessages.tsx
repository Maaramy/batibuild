import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, MessageSquare, Loader2, Clock, CheckCircle2,
  AlertCircle, Send, Building2, Package, Download, FileText,
  Phone, Store, Briefcase, Users,
} from "lucide-react";
import { motion } from "framer-motion";

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

// ── Component ────────────────────────────────────────────────────────────────

export default function UserMessages() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"quotes" | "services">("quotes");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Demandes & réponses fournisseurs (devis)
  const quotes = useQuery(api.quoteRequests.getMyRequests);
  const allResponses = useQuery(api.quoteResponses.getMyResponses);
  const markSupplierResponsesRead = useMutation(api.quoteResponses.markAllRead);

  // Demandes & réponses experts (services)
  const expertRequests = useQuery(api.expertServiceRequests.getMyRequests);
  const expertResponses = useQuery(api.expertServiceRequests.getMyResponses);
  const markExpertResponsesRead = useMutation(api.expertServiceRequests.responsesMarkAllRead);

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

  const pendingCount = quotes?.filter((q) => q.status === "pending").length ?? 0;
  const unreadSupplierCount = allResponses?.filter((r) => r.readAt === undefined).length ?? 0;
  const unreadExpertCount = expertResponses?.filter((r) => r.readAt === undefined).length ?? 0;
  const totalUnread = unreadSupplierCount + unreadExpertCount;

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
              Vos demandes de devis & services et les réponses reçues
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

        {/* Tabs : Devis fournisseurs / Services experts */}
        <div className="flex gap-1.5 bg-muted/30 rounded-xl p-1">
          <button
            onClick={() => setTab("quotes")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
              tab === "quotes"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            Devis fournisseurs
          </button>
          <button
            onClick={() => setTab("services")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
              tab === "services"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Services experts
          </button>
        </div>

        {/* ══════════ ONGLET DEVIS (fournisseurs) ══════════ */}
        {tab === "quotes" && (
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
                    Envoyez une demande de devis depuis la page matériaux IA ou les résultats de votre projet.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 text-xs"
                    onClick={() => navigate("/dashboard/ai-materials")}
                  >
                    <FileText className="h-3 w-3 mr-1" /> Aller aux Matériaux IA
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => {
                  const cfg = STATUS_CONFIG[quote.status];
                  const StatusIcon = cfg.icon;
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
                                    <div
                                      key={resp._id}
                                      className="rounded-lg border border-emerald-200/40 bg-emerald-50/30 p-3"
                                    >
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <Building2 className="h-3 w-3 text-emerald-600" />
                                        <span className="text-xs font-semibold">Fournisseur</span>
                                        {resp.totalAmount && (
                                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] ml-auto">
                                            {fmtTND(resp.totalAmount)}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                        {resp.message}
                                      </p>
                                      {resp.attachmentUrl && (
                                        <a
                                          href={resp.attachmentUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-primary hover:underline"
                                        >
                                          <Download className="h-3 w-3" />
                                          {resp.attachmentFileName || "Voir la pièce jointe"}
                                        </a>
                                      )}
                                      <p className="text-[9px] text-muted-foreground/60 mt-1.5">
                                        {fmtDate(resp.createdAt)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground/60 text-center py-2">
                                  Aucune réponse pour l'instant. Le fournisseur examinera votre demande prochainement.
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

        {/* ══════════ ONGLET SERVICES (experts) ══════════ */}
        {tab === "services" && (
          <>
            {/* Historique des demandes */}
            <div className="flex items-center gap-2">
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
                    Demandez un devis à un architecte, ingénieur ou bureau d'études depuis l'annuaire des professionnels.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 text-xs"
                    onClick={() => navigate("/dashboard/professionals-directory")}
                  >
                    <Briefcase className="h-3 w-3 mr-1" /> Annuaire des experts
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
                                    <div
                                      key={resp._id}
                                      className="rounded-lg border border-violet-200/40 bg-violet-50/30 p-3"
                                    >
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <Briefcase className="h-3 w-3 text-violet-600" />
                                        <span className="text-xs font-semibold">Expert</span>
                                        {resp.totalAmount && (
                                          <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[9px] ml-auto">
                                            {fmtTND(resp.totalAmount)}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                        {resp.message}
                                      </p>
                                      {resp.attachmentUrl && (
                                        <a
                                          href={resp.attachmentUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-primary hover:underline"
                                        >
                                          <Download className="h-3 w-3" />
                                          {resp.attachmentFileName || "Voir la pièce jointe"}
                                        </a>
                                      )}
                                      <p className="text-[9px] text-muted-foreground/60 mt-1.5">
                                        {fmtDate(resp.createdAt)}
                                      </p>
                                    </div>
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
    </main>
  );
}
