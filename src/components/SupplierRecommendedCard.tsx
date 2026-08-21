import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Store, Phone, MapPin, Mail,
  FileText, Send, Loader2, CheckCircle2, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ── Types ────────────────────────────────────────────────────────────────────

interface SupplierProfile {
  _id: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  description?: string;
  specialties: string[];
  isVisible: boolean;
}

interface MaterialQty {
  name: string;
  quantity: number;
  unit: string;
}

interface SupplierRecommendedCardProps {
  /** Material category key (e.g. "ciment", "carrelage") */
  categoryKey: string;
  /** Human-readable category label */
  categoryLabel: string;
  /** Auto-injected material quantities for quote request */
  materials: MaterialQty[];
  /** Project ID (optional) */
  projectId?: string;
  /** Project name (optional) */
  projectName?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SupplierRecommendedCard({
  categoryKey,
  categoryLabel,
  materials,
  projectId,
  projectName,
}: SupplierRecommendedCardProps) {
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch random registered supplier for this specialty
  const supplier = useQuery(
    api.supplierProfiles.getRandomBySpecialty,
    { specialty: categoryKey, limit: 1 }
  );

  const createQuoteRequest = useMutation(api.quoteRequests.create);

  if (!supplier || supplier.length === 0) return null;

  const s = supplier[0] as SupplierProfile;

  const handleRequestQuote = async () => {
    try {
      setSending(true);
      await createQuoteRequest({
        supplierId: s._id as any,
        projectId: projectId as any,
        projectName,
        category: categoryLabel,
        materials,
        message: quoteMessage || undefined,
      });
      toast.success("Demande de devis envoyée avec succès !");
      setShowQuoteDialog(false);
      setQuoteMessage("");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2.5 rounded-lg border border-primary/15 bg-primary/[0.03] px-3 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Store className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-foreground truncate">{s.companyName}</span>
            <span className="inline-flex items-center gap-0.5 text-[8px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-1 py-px rounded-full">
              <CheckCircle2 className="h-1.5 w-1.5" /> Vérifié
            </span>
            <span className="text-[9px] text-muted-foreground truncate hidden sm:inline">· {s.address}</span>
          </div>
        </div>
        <a
          href={`tel:${s.phone.replace(/[^\\d+]/g, "")}`}
          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/[0.04] px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 active:scale-[0.98] transition-all"
        >
          <Phone className="h-2.5 w-2.5" /> Contacter
        </a>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-auto gap-1 text-[10px] font-medium rounded-md border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 px-2 py-1"
          onClick={() => setShowQuoteDialog(true)}
        >
          <FileText className="h-2.5 w-2.5" /> Devis
        </Button>
      </div>

      {/* ── Quote Request Dialog ── */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Demande de devis — {s.companyName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Les quantités de matériaux de votre projet seront transmises automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Materials summary */}
            {materials.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Matériaux du projet
                </p>
                <div className="rounded-xl border border-border/30 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/20">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Désignation</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Quantité</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m, i) => (
                        <tr key={i} className="border-b border-border/10 last:border-0">
                          <td className="py-1.5 px-3 font-medium">{m.name}</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">{m.quantity}</td>
                          <td className="py-1.5 px-3 text-right text-muted-foreground">{m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* User contact info (auto-filled) */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Vos coordonnées (transmises automatiquement)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2">
                  <p className="text-[9px] text-muted-foreground">Nom</p>
                  <p className="text-xs font-medium">{projectName || "—"}</p>
                </div>
                <div className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2">
                  <p className="text-[9px] text-muted-foreground">Catégorie</p>
                  <p className="text-xs font-medium">{categoryLabel}</p>
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Message optionnel
              </label>
              <Textarea
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
                placeholder="Décrivez vos besoins spécifiques..."
                className="text-xs min-h-[80px] rounded-xl"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setShowQuoteDialog(false)}
              >
                <X className="h-3 w-3 mr-1" /> Annuler
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                disabled={sending}
                onClick={handleRequestQuote}
              >
                {sending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Envoyer la demande
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
