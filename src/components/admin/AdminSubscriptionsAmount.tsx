import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Actif", cls: "bg-emerald-500/10 text-emerald-600" },
  pending: { label: "En attente", cls: "bg-amber-500/10 text-amber-600" },
  canceled: { label: "Annulé", cls: "bg-muted/30 text-muted-foreground" },
  expired: { label: "Expiré", cls: "bg-muted/30 text-muted-foreground" },
};

const PLAN_LABELS: Record<string, string> = {
  free: "Client (Start)",
  pro: "Client (Pro)",
  supplier: "Fournisseur",
  expert: "Expert",
};

/**
 * Éditeur admin des montants d'abonnements.
 * Dès qu'un montant est modifié, l'abonnement est automatiquement passé au
 * statut « Actif » (30 jours) et le client est notifié/invité à finaliser son paiement.
 */
export default function AdminSubscriptionsAmount() {
  const subs = useQuery(api.subscriptions.getAllSubscriptionsWithUsers) || [];
  const updateAmount = useMutation(api.subscriptions.adminUpdateSubscriptionAmount);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const save = async (sub: any) => {
    const raw = drafts[sub._id] !== undefined ? drafts[sub._id] : String(sub.amount ?? 0);
    const amount = parseFloat(raw);
    if (isNaN(amount) || amount < 0) {
      toast.error("Montant invalide");
      return;
    }
    setSavingId(sub._id);
    try {
      await updateAmount({ subscriptionId: sub._id, amount });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[sub._id];
        return next;
      });
      toast.success("Montant mis à jour — abonnement activé");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card className="border border-border/50 bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Montants des abonnements</CardTitle>
            <CardDescription className="text-[11px]">
              Modifier le montant active automatiquement l'abonnement (30 jours) et invite le client à finaliser son paiement.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-b-2xl">
          {subs.length === 0 ? (
            <p className="text-center py-10 text-xs text-muted-foreground">Aucun abonnement.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs">Client</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs hidden sm:table-cell">Offre</th>
                  <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs">Statut</th>
                  <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Montant (TND)</th>
                  <th className="text-right py-2.5 px-3 font-medium text-muted-foreground text-xs">Action</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub: any) => {
                  const meta = STATUS_META[sub.status] || STATUS_META.canceled;
                  return (
                    <tr key={sub._id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 shrink-0 border border-border/40">
                            <AvatarImage src={sub.user?.image || ""} alt="Photo" className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {(sub.user?.name || sub.user?.email || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate max-w-[140px]">{sub.user?.name || sub.user?.email || "Non renseigné"}</p>
                            <p className="text-[9px] text-muted-foreground truncate max-w-[180px]">{sub.user?.email || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 hidden sm:table-cell">
                        <Badge className={cn("text-[9px]", sub.plan === "expert" ? "bg-emerald-500/10 text-emerald-600" : sub.plan === "supplier" ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600")}>
                          {PLAN_LABELS[sub.plan] || sub.plan}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className={cn("text-[9px]", meta.cls)}>{meta.label}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={drafts[sub._id] !== undefined ? drafts[sub._id] : (sub.amount ?? "")}
                            onChange={(e) => setDrafts({ ...drafts, [sub._id]: e.target.value })}
                            placeholder={sub.amount ? String(sub.amount) : "0"}
                            className="h-7 w-24 px-2 text-right font-mono text-xs"
                          />
                          <span className="text-[10px] text-muted-foreground w-8">{sub.currency || "TND"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-[10px] text-emerald-600"
                          disabled={savingId === sub._id}
                          onClick={() => save(sub)}
                          title="Mettre à jour le montant et activer l'abonnement"
                        >
                          {savingId === sub._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Mettre à jour
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}