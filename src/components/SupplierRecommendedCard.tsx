import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Store, Phone, MapPin, Mail,
  FileText, Send, Loader2, CheckCircle2, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { QuoteRequestFields } from "@/components/quotes/QuoteRequestFields";
import { uploadQuoteAttachment } from "@/lib/quoteAttachments";
import { QUOTE_MOTIF_OTHER } from "@/lib/quoteMotifs";

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
  userId?: string;
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
  /** Current user's ID to block self-quote requests */
  currentUserId?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SupplierRecommendedCard({
  categoryKey,
  categoryLabel,
  materials,
  projectId,
  projectName,
  currentUserId,
}: SupplierRecommendedCardProps) {
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [motif, setMotif] = useState("");
  const [motifOther, setMotifOther] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  // Editable materials state — (re)initialized when the quote dialog opens
  const [editableMaterials, setEditableMaterials] = useState<MaterialQty[]>(materials);
  // Selected material flags — checked by default, user can uncheck to exclude
  const [selectedMaterials, setSelectedMaterials] = useState<boolean[]>(materials.map(() => true));

  const selectedCount = selectedMaterials.filter(Boolean).length;

  const openQuoteDialog = () => {
    // Always start from the current analysis quantities (pre-calculated, editable)
    setEditableMaterials(materials);
    setSelectedMaterials(materials.map(() => true));
    setMotif("");
    setMotifOther("");
    setFiles([]);
    setShowQuoteDialog(true);
  };

  // Fetch random registered supplier for this specialty (fallback to any if no match)
  const supplier = useQuery(
    api.supplierProfiles.getRandomBySpecialty,
    { specialty: categoryKey, limit: 1, fallbackToAny: true }
  );

  const createQuoteRequest = useMutation(api.quoteRequests.create);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  if (!supplier || supplier.length === 0) return null;

  const s = supplier[0] as SupplierProfile;

  // Autodemand: check if current user owns this supplier profile
  const isOwnProfile = currentUserId && s.userId && currentUserId === s.userId;

  const handleRequestQuote = async () => {
    if (isOwnProfile) {
      toast.error("Vous ne pouvez pas vous envoyer un devis à vous-même.");
      return;
    }
    // Only send the materials the user selected
    const selected = editableMaterials.filter((_, i) => selectedMaterials[i]);
    if (selected.length === 0) {
      toast.error("Sélectionnez au moins un matériau pour la demande de devis.");
      return;
    }
    if (!motif) {
      toast.error("Sélectionnez le motif de votre demande.");
      return;
    }
    if (motif === QUOTE_MOTIF_OTHER && !motifOther.trim()) {
      toast.error("Précisez le motif de votre demande.");
      return;
    }
    try {
      setSending(true);
      const uploaded = await Promise.all(
        files.map((f) => uploadQuoteAttachment(f, () => generateUploadUrl())),
      );
      await createQuoteRequest({
        supplierId: s._id as any,
        projectId: projectId as any,
        projectName,
        category: categoryLabel,
        materials: selected,
        motif,
        motifOther: motif === QUOTE_MOTIF_OTHER ? motifOther.trim() : undefined,
        attachments: uploaded as any,
      });
      toast.success("Demande de devis envoyée avec succès !");
      setShowQuoteDialog(false);
      setMotif("");
      setMotifOther("");
      setFiles([]);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const updateMaterialQty = (index: number, qty: number) => {
    setEditableMaterials((prev) =>
      prev.map((m, i) => (i === index ? { ...m, quantity: Math.max(0, qty) } : m))
    );
  };

  const toggleMaterial = (index: number) => {
    setSelectedMaterials((prev) =>
      prev.map((v, i) => (i === index ? !v : v))
    );
  };

  return (
    <>
      <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] to-background p-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{s.companyName}</p>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="h-2 w-2" /> Vérifié
              </span>
              <Badge variant="secondary" className="text-[9px]">{categoryLabel}</Badge>
            </div>
            {s.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Phone className="h-2.5 w-2.5" /> {s.phone}
              </span>
              {s.email && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Mail className="h-2.5 w-2.5" /> {s.email}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" /> {s.address}
              </span>
            </div>
            <div className="flex gap-1.5 mt-3">
              <a
                href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/[0.04] px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98] transition-all"
              >
                <Phone className="h-2.5 w-2.5" /> Contacter
              </a>
              <Button
                size="sm"
                variant="outline"
                className={`h-auto gap-1 text-[10px] font-medium rounded-md px-2 py-1 ${
                  isOwnProfile
                    ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                }`}
                onClick={() => {
                  if (isOwnProfile) {
                    toast.error("Vous ne pouvez pas vous envoyer un devis à vous-même.");
                    return;
                  }
                  openQuoteDialog();
                }}
                disabled={!!isOwnProfile}
                title={isOwnProfile ? "Vous ne pouvez pas vous envoyer un devis à vous-même" : undefined}
              >
                <FileText className="h-2.5 w-2.5" /> Demander un devis
              </Button>
            </div>
          </div>
        </div>
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
              Modifiez les quantités si besoin, puis envoyez votre demande.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Editable Materials summary */}
            {editableMaterials.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Matériaux du projet (sélection + quantités modifiables)
                  </p>
                  <span className="text-[9px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                    {selectedCount}/{editableMaterials.length} sélectionné{selectedCount > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="rounded-xl border border-border/30 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/20">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground w-8">
                          <span className="sr-only">Sélectionner</span>
                        </th>
                        <th className="text-left py-2 px-1 font-medium text-muted-foreground">Désignation</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground w-24">Quantité</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Unité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableMaterials.map((m, i) => {
                        const checked = selectedMaterials[i] ?? false;
                        return (
                          <tr
                            key={i}
                            className={`border-b border-border/10 last:border-0 transition-colors ${
                              checked ? "" : "opacity-45 bg-muted/20"
                            }`}
                          >
                            <td className="py-1.5 pl-3 pr-0">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleMaterial(i)}
                                aria-label={`Sélectionner ${m.name}`}
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="py-1.5 px-1 font-medium">{m.name}</td>
                            <td className="py-1.5 px-3">
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={m.quantity}
                                disabled={!checked}
                                onChange={(e) => updateMaterialQty(i, parseFloat(e.target.value) || 0)}
                                className="h-7 w-full text-right text-xs tabular-nums px-2 py-0"
                              />
                            </td>
                            <td className="py-1.5 px-3 text-right text-muted-foreground">{m.unit}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {selectedCount === 0 && (
                  <p className="mt-1.5 text-[10px] text-amber-600">
                    Sélectionnez au moins un matériau pour envoyer la demande.
                  </p>
                )}
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

            {/* Motif obligatoire + pièces jointes */}
            <QuoteRequestFields
              motif={motif}
              onMotifChange={setMotif}
              motifOther={motifOther}
              onMotifOtherChange={setMotifOther}
              files={files}
              onFilesChange={setFiles}
            />

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
                disabled={sending || (editableMaterials.length > 0 && selectedCount === 0)}
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
