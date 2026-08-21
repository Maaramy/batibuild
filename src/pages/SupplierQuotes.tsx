import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileText, Loader2, Send, CheckCircle2, Clock,
  AlertCircle, User, Phone, Mail, Package, Upload, X,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const STATUS_CONFIG = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  responded: { label: "Répondu", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  closed: { label: "Fermé", color: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertCircle },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function SupplierQuotes() {
  const navigate = useNavigate();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseAmount, setResponseAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "responded" | "closed">("all");

  const quotes = useQuery(api.quoteRequests.getBySupplier);
  const sendResponse = useMutation(api.quoteResponses.sendResponse);

  const filtered = quotes?.filter((q) =>
    statusFilter === "all" ? true : q.status === statusFilter
  );

  const pendingCount = quotes?.filter((q) => q.status === "pending").length ?? 0;

  const handleSendResponse = async () => {
    if (!selectedQuote || !responseMessage.trim()) return;
    try {
      setSending(true);
      await sendResponse({
        quoteRequestId: selectedQuote._id,
        message: responseMessage,
        totalAmount: responseAmount ? Number(responseAmount) : undefined,
      });
      toast.success("Devis envoyé avec succès !");
      setShowResponseDialog(false);
      setResponseMessage("");
      setResponseAmount("");
      setSelectedQuote(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/supplier")}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Devis reçus</h1>
            <p className="text-xs text-muted-foreground">
              Demandes de devis des clients et vos réponses
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
              {pendingCount} en attente
            </Badge>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "pending", "responded", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {s === "all" ? "Tous" : STATUS_CONFIG[s].label}
              {s === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Quote list */}
        {!quotes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered && filtered.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucune demande de devis</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Les demandes de vos clients apparaîtront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered!.map((quote) => {
              const cfg = STATUS_CONFIG[quote.status];
              const StatusIcon = cfg.icon;
              return (
                <motion.div
                  key={quote._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-border/40 hover:border-primary/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">
                              {quote.projectName || quote.category}
                            </p>
                            <Badge className={`text-[9px] border ${cfg.color}`}>
                              <StatusIcon className="h-2.5 w-2.5 mr-1" />
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {quote.category} · {fmtDate(quote.createdAt)}
                          </p>

                          {/* Client info */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <User className="h-2.5 w-2.5" /> {quote.userName}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5" /> {quote.userPhone}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" /> {quote.userEmail}
                            </span>
                          </div>

                          {/* Materials */}
                          {quote.materials && quote.materials.length > 0 && (
                            <div className="mt-2 rounded-lg border border-border/20 bg-muted/10 p-2">
                              <p className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                                <Package className="h-2.5 w-2.5" /> Matériaux demandés
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {quote.materials.map((m: any, i: number) => (
                                  <span
                                    key={i}
                                    className="text-[9px] bg-background border border-border/20 rounded px-1.5 py-0.5"
                                  >
                                    {m.name} ({m.quantity} {m.unit})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Message */}
                          {quote.message && (
                            <p className="text-[11px] text-muted-foreground mt-2 italic">
                              "{quote.message}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {quote.status === "pending" && (
                        <div className="mt-3 pt-3 border-t border-border/10">
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setShowResponseDialog(true);
                            }}
                          >
                            <Send className="h-3 w-3" /> Répondre / Envoyer un devis
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Response Dialog ── */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Envoyer un devis
            </DialogTitle>
            <DialogDescription className="text-xs">
              Répondez à la demande de {selectedQuote?.userName} pour {selectedQuote?.category}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Montant total (TND)
              </label>
              <Input
                type="number"
                value={responseAmount}
                onChange={(e) => setResponseAmount(e.target.value)}
                placeholder="Ex: 15000"
                className="text-sm rounded-xl"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Message / Détails du devis
              </label>
              <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Décrivez votre proposition, délais, conditions..."
                className="text-xs min-h-[120px] rounded-xl"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowResponseDialog(false)}>
                <X className="h-3 w-3 mr-1" /> Annuler
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                disabled={sending || !responseMessage.trim()}
                onClick={handleSendResponse}
              >
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
