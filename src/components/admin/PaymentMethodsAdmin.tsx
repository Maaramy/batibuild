import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Banknote, CreditCard, Loader2, Save, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/**
 * Admin → Méthodes de paiement.
 *
 * Le catalogue et l'ordre des méthodes viennent du serveur
 * (`lib/paymentMethods.ts`) : cette interface ne fait qu'afficher l'état réel
 * et le modifier. Une méthode désactivée disparaît immédiatement des
 * interfaces de règlement et les nouvelles transactions la concernant sont
 * refusées côté serveur.
 */
export function PaymentMethodsAdmin() {
  const data = useQuery(api.payments.getPaymentMethodsAdmin);
  const updatePaymentMethodState = useMutation(
    api.payments.updatePaymentMethodState,
  );
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const methods = data?.methods ?? [];
  // Signature des valeurs serveur : resynchronise le brouillon local après
  // chaque enregistrement (y compris depuis un autre onglet administrateur).
  const remoteSignature = methods
    .map((m: any) => `${m.slug}:${m.enabled ? 1 : 0}`)
    .join("|");

  useEffect(() => {
    if (methods.length === 0) return;
    setDraft(Object.fromEntries(methods.map((m: any) => [m.slug, !!m.enabled])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSignature]);

  const isEnabled = (method: any) => draft[method.slug] ?? method.enabled;
  const changes = methods.filter((m: any) => isEnabled(m) !== m.enabled);

  const handleSave = async () => {
    if (changes.length === 0) return;
    setSaving(true);
    try {
      for (const method of changes) {
        await updatePaymentMethodState({
          slug: method.slug,
          enabled: isEnabled(method),
        });
      }
      toast.success("Méthodes de paiement mises à jour");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
    setSaving(false);
  };

  return (
    <Card className="mb-6 border border-border/30 bg-background/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Méthodes de paiement
        </CardTitle>
        <CardDescription>
          Gérez les méthodes de paiement disponibles sur batibuild. Une méthode
          désactivée est masquée dans toutes les interfaces de règlement et ne
          peut plus être utilisée ; l'historique et les transactions existantes
          restent conservés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-muted/30" />
            <div className="h-24 animate-pulse rounded-xl bg-muted/30" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {methods.map((method: any) => {
                const enabled = isEnabled(method);
                const isDirty = enabled !== method.enabled;
                const MethodIcon =
                  method.icon === "card"
                    ? CreditCard
                    : method.icon === "smartphone"
                      ? Smartphone
                      : Banknote;
                return (
                  <div
                    key={method.slug}
                    className={`flex gap-3 rounded-xl border p-4 transition-colors ${
                      enabled
                        ? "border-primary/25 bg-primary/[0.03]"
                        : "border-border/30 bg-muted/10"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        enabled ? "bg-primary/10" : "bg-muted/40"
                      }`}
                    >
                      <MethodIcon
                        className={`h-5 w-5 ${
                          enabled ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-semibold">
                              {method.label}
                            </p>
                            {!method.implemented && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200/40"
                              >
                                Bientôt disponible
                              </Badge>
                            )}
                            {isDirty && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200/40"
                              >
                                Modifié
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {method.description}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              enabled
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                enabled ? "bg-emerald-500" : "bg-muted-foreground/50"
                              }`}
                            />
                            {enabled ? "Activé" : "Désactivé"}
                          </span>
                          <Switch
                            checked={enabled}
                            disabled={!method.implemented}
                            aria-label={`${enabled ? "Désactiver" : "Activer"} ${method.label}`}
                            onCheckedChange={(checked: boolean) =>
                              setDraft((prev) => ({
                                ...prev,
                                [method.slug]: checked,
                              }))
                            }
                          />
                        </div>
                      </div>

                      {!method.implemented && (
                        <p className="mt-2 text-[10px] text-muted-foreground/70">
                          Le module de règlement de cette méthode n'est pas
                          encore connecté — elle ne peut pas être activée pour
                          les utilisateurs.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/10 pt-3">
              <p className="text-[11px] text-muted-foreground">
                {changes.length > 0
                  ? `${changes.length} modification(s) non enregistrée(s)`
                  : "Configuration à jour"}
              </p>
              <Button
                className="gap-2"
                disabled={saving || changes.length === 0}
                onClick={handleSave}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
