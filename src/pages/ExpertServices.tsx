import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertCircle, User, Phone, Mail, X,
} from "lucide-react";

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  responded: { label: "Répondu", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  closed: { label: "Fermé", color: "bg-slate-100 text-slate-600 border-slate-200", icon: AlertCircle },
};

export default function ExpertServices() {
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [responseAmount, setResponseAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "responded" | "closed">("all");

  const requests = useQuery(api.expertServiceRequests.getByExpert);
  const respond = useMutation(api.expertServiceRequests.respond);

  const filtered = requests?.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  const pendingCount = requests?.filter((r) => r.status === "pending").length ?? 0;

  const handleSendResponse = async () => {
    if (!selectedRequest || !responseMessage.trim()) return;
    try {
      setSending(true);
      await respond({
        serviceRequestId: selectedRequest._id,
        message: responseMessage,
        totalAmount: responseAmount ? Number(responseAmount) : undefined,
      });
      toast.success("Réponse envoyée avec succès !");
      setShowResponseDialog(false);
      setResponseMessage("");
      setResponseAmount("");
      setSelectedRequest(null);
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
            onClick={() => navigate("/dashboard/expert")}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Demandes reçues</h1>
            <p className="text-xs text-muted-foreground">
              Demandes de services de vos clients
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

        {/* Request list */}
        {!requests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered && filtered.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Aucune demande de service</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Les demandes de vos clients apparaîtront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered!.map((req) => {
              const cfg = STATUS_CONFIG[req.status];
              const StatusIcon = cfg.icon;
              return (
                <motion.div
                  key={req._id}
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
                              {req.projectName || req.serviceType}
                            </p>
                            <Badge className={`text-[9px] border ${cfg.color}`}>
                              <StatusIcon className="h-2.5 w-2.5 mr-1" />
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {req.serviceType} · {fmtDate(req.createdAt)}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <User className="h-2.5 w-2.5" /> {req.userName}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5" /> {req.userPhone}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" /> {req.userEmail}
                            </span>
                          </div>
                          {req.description && (
                            <p className="text-[11px] text-muted-foreground mt-2 italic line-clamp-2">
                              "{req.description}"
                            </p>
                          )}
                        </div>
                      </div>
                      {req.status === "pending" && (
                        <div className="mt-3 pt-3 border-t border-border/10">
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowResponseDialog(true);
                            }}
                          >
                            <Send className="h-3 w-3" /> Répondre
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

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Envoyer votre réponse
            </DialogTitle>
            <DialogDescription className="text-xs">
              Répondez à la demande de {selectedRequest?.userName} pour {selectedRequest?.serviceType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Montant estimé (TND)
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
                Message / Détails
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
