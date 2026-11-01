import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Landmark, Loader2, Save, Trash2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ============================================================================
// D. COTISATION « MES PROJETS D'INVESTISSEMENT » — TARIF DE RÉFÉRENCE
// ----------------------------------------------------------------------------
// L'administrateur fixe un prix et sa devise. Ce réglage est PUREMENT
// INFORMATIF : il n'ouvre ni ne ferme aucun accès et aucun circuit de paiement
// ne le consomme — l'accès au module reste régi par les crédits Client Pro.
// Aucun prix par défaut : le champ reste vide tant que l'administrateur n'a
// rien saisi (« Aucun tarif publié »).
// ============================================================================

export function InvestmentCotisationSettings() {
  const data = useQuery(api.payments.getInvestmentCotisation);
  const save = useMutation(api.payments.updateInvestmentCotisation);

  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("TND");
  const [saving, setSaving] = useState(false);

  const signature = JSON.stringify(data ?? null);
  useEffect(() => {
    if (!data) return;
    setPrice(data.price === null ? "" : String(data.price));
    setCurrency(data.currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const publish = async (nextPrice: number | null, nextCurrency: string) => {
    setSaving(true);
    try {
      await save({ price: nextPrice, currency: nextCurrency.trim() || "TND" });
      toast.success(
        nextPrice === null
          ? "Tarif retiré : aucun montant n'est plus publié pour ce module."
          : `Tarif de la cotisation investissement enregistré : ${nextPrice} ${nextCurrency.trim() || "TND"}.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'enregistrer le tarif.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const trimmed = price.trim();
    if (trimmed === "") {
      void publish(null, currency);
      return;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Le tarif doit être un montant positif, ou laissé vide.");
      return;
    }
    void publish(value, currency);
  };

  if (data === undefined) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/30 p-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la cotisation investissement…
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-600 dark:text-red-400">
        Accès administrateur requis.
      </div>
    );
  }

  const published = data.price !== null;

  return (
    <section className="space-y-4 rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Landmark className="h-4 w-4 text-emerald-600" />
            D. Cotisation « Mes projets d'investissement »
          </h3>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Tarif de référence du module. Aucun circuit de paiement n'y est rattaché : l'accès reste
            celui des crédits Client Pro, inchangé.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            published
              ? "border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-300"
              : "border-border/50 text-[10px] text-muted-foreground"
          }
        >
          {published ? `${data.price} ${data.currency}` : "Aucun tarif publié"}
        </Badge>
      </header>

      <div className="space-y-3 rounded-lg border border-border/30 bg-background/60 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="text-[11px] text-muted-foreground" htmlFor="investment-cotisation-price">
              Tarif de la cotisation
            </label>
            <Input
              id="investment-cotisation-price"
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="Laisser vide"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div className="w-24">
            <label className="text-[11px] text-muted-foreground" htmlFor="investment-cotisation-currency">
              Devise
            </label>
            <Input
              id="investment-cotisation-currency"
              value={currency}
              maxLength={8}
              onChange={(event) => setCurrency(event.target.value)}
              className="mt-1 h-8 text-sm"
            />
          </div>
          <p className="pb-1.5 text-[11px] text-muted-foreground">
            Aucun montant n'est prérempli : tant que le champ est vide, le module n'affiche aucun tarif.
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Ce montant reste informatif : il n'accorde aucun droit, ne crée aucune facture et ne
          modifie pas les crédits de projets.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/20 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[11px] text-muted-foreground"
          onClick={() => void publish(null, currency)}
          disabled={saving || !published}
        >
          <Trash2 className="h-3.5 w-3.5" /> Retirer le tarif
        </Button>
        <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer le tarif
        </Button>
      </div>
    </section>
  );
}

export default InvestmentCotisationSettings;
