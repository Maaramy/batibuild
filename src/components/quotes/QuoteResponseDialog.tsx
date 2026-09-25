import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FileText, Loader2, Package, Send, X } from "lucide-react";

// ============================================================================
// BOÎTE DE RÉPONSE DU FOURNISSEUR
//
// Une seule boîte, trois natures de réponse — exactement les actions attendues
// dans la conversation : « Répondre avec un devis », « Refuser la demande »,
// « Demander des précisions ». Le montant et la pièce jointe ne concernent que
// le devis ; le refus et la demande de précisions n'exigent qu'un message.
// ============================================================================

export type QuoteResponseKind = "quote" | "refusal" | "clarification";

const KIND_META: Record<
  QuoteResponseKind,
  { title: string; hint: string; placeholder: string; cta: string; requiresMessage: boolean }
> = {
  quote: {
    title: "Envoyer un devis",
    hint: "Détaillez votre proposition : prix, délais, conditions…",
    placeholder: "Décrivez votre proposition, délais, conditions…",
    cta: "Envoyer le devis",
    requiresMessage: true,
  },
  refusal: {
    title: "Refuser la demande",
    hint: "Indiquez au client pourquoi vous ne pouvez pas donner suite.",
    placeholder: "Motif du refus (optionnel mais recommandé)…",
    cta: "Refuser la demande",
    requiresMessage: false,
  },
  clarification: {
    title: "Demander des précisions",
    hint: "Précisez au client les informations dont vous avez besoin.",
    placeholder: "Quelles précisions vous manquent ?",
    cta: "Demander des précisions",
    requiresMessage: true,
  },
};

interface QuoteResponseDialogProps {
  quote: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: QuoteResponseKind;
  onSent?: () => void;
}

export function QuoteResponseDialog({
  quote,
  open,
  onOpenChange,
  kind = "quote",
  onSent,
}: QuoteResponseDialogProps) {
  const sendResponse = useMutation(api.quoteResponses.sendResponse);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Réinitialise le formulaire à chaque ouverture / changement de nature.
  useEffect(() => {
    if (open) {
      setMessage("");
      setAmount("");
      setAttachmentFile(null);
    }
  }, [open, kind, quote?._id]);

  const meta = KIND_META[kind];
  const isQuote = kind === "quote";

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

  const handleSend = async () => {
    if (!quote) return;
    if (meta.requiresMessage && !message.trim()) return;
    try {
      setSending(true);
      let attachmentStorageId: Id<"_storage"> | undefined;
      let attachmentFileName: string | undefined;
      if (isQuote && attachmentFile) {
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
        quoteRequestId: quote._id,
        message: message.trim(),
        kind,
        totalAmount: isQuote && amount ? Number(amount) : undefined,
        attachmentStorageId,
        attachmentFileName,
      });
      toast.success(
        kind === "refusal"
          ? "Demande refusée"
          : kind === "clarification"
            ? "Demande de précisions envoyée"
            : attachmentFile
              ? "Devis envoyé avec pièce jointe !"
              : "Devis envoyé avec succès !",
      );
      onSent?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            {meta.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {quote?.userName ? `Pour ${quote.userName}` : "Demande de devis"}
            {quote?.projectName ? ` · ${quote.projectName}` : quote?.category ? ` · ${quote.category}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-[11px] text-muted-foreground">{meta.hint}</p>

          {isQuote && (
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Montant total (TND)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 15000"
                className="text-sm rounded-xl"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Message {meta.requiresMessage ? "" : "(optionnel)"}
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={meta.placeholder}
              className="text-xs min-h-[110px] rounded-xl"
            />
          </div>

          {isQuote && (
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Pièce jointe — devis PDF ou photo (optionnel)
              </label>
              {attachmentFile ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-200/50 bg-emerald-50/40">
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-medium truncate flex-1">{attachmentFile.name}</span>
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    {Math.round(attachmentFile.size / 1024)} Ko
                  </span>
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
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
              <X className="h-3 w-3 mr-1" /> Annuler
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              disabled={sending || uploading || (meta.requiresMessage && !message.trim())}
              onClick={handleSend}
            >
              {sending || uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {uploading ? "Envoi du fichier…" : meta.cta}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuoteResponseDialog;
