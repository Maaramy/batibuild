import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileText, Loader2, Send, CheckCircle2, Clock,
  AlertCircle, User, Phone, Mail, Package, X,
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
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const markAllRead = useMutation(api.quoteRequests.markAllRead);

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Dès que la page des demandes est consultée, on efface le badge rouge
  useEffect(() => {
    if (quotes && quotes.some((q) => q.readAt === undefined)) {
      markAllRead();
    }
  }, [quotes, markAllRead]);

  const filtered = quotes?.filter((q) =>
    statusFilter === "all" ? true : q.status === statusFilter
  );

  const pendingCount = quotes?.filter((q) => q.status === "pending").length ?? 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      toast.error("Format accepté : PDF ou image (JPG, PNG)");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      e.target.value = "";
      return;
    }
    setAttachmentFile(file);
    e.target.value = "";
  };

  const handleSendResponse = async () => {
    if (!selectedQuote || !responseMessage.trim()) return;
    try {
      setSending(true);
      // Upload de la pièce jointe (devis PDF / photo) si sélectionnée
      let attachmentStorageId: Id<"_storage"> | undefined;
      let attachmentFileName: string | undefined;
      if (attachmentFile) {
        setUploading(true);
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": attachmentFile.type },
          body: attachmentFile,
        });
        if (!result.ok) throw new Error("Échec de l'upload de la pièce jointe");
        const { storageId } = await result.json();
        attachmentStorageId = storageId;
        attachmentFileName = attachmentFile.name;
      }
      await sendResponse({
        quoteRequestId: selectedQuote._id,
        message: responseMessage,
        totalAmount: responseAmount ? Number(responseAmount) : undefined,
        attachmentStorageId,
        attachmentFileName,
      });
      toast.success(attachmentFile ? "Devis envoyé avec pièce jointe !" : "Devis envoyé avec succès !");
      setShowResponseDialog(false);
      setResponseMessage("");
      setResponseAmount("");
      setAttachmentFile(null);
      setSelectedQuote(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
      setUploading(false);
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

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Pièce jointe — devis PDF ou photo (optionnel)
              </label>
              {attachmentFile ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-200/50 bg-emerald-50/40">
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">{attachmentFile.name}</span>
                  <span className="text-[9px] text-muted-foreground shrink-0">{Math.round(attachmentFile.size / 1024)} Ko</span>
                  <button
                    onClick={() => setAttachmentFile(null)}
                    className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                    title="Retirer la pièce jointe"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/[0.03] transition-all cursor-pointer text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  Choisir un fichier (PDF, JPG, PNG — max 5 Mo)
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowResponseDialog(false)}>
                <X className="h-3 w-3 mr-1" /> Annuler
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                disabled={sending || uploading || !responseMessage.trim()}
                onClick={handleSendResponse}
              >
                {sending || uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {uploading ? "Envoi du fichier…" : "Envoyer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
