import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Loader2, Target, TrendingDown, TrendingUp } from "lucide-react";

type Direction = "below" | "above" | "change";

interface MaterialAlertDialogProps {
  materialId: string;
  materialName: string;
  unit: string;
  currentPrice: number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Création d'une alerte prix sur un matériau : seuil (sous/dépassement) ou
 * variation en %. Le suivi est notifié par `convex/materialAlerts.ts`.
 */
export function MaterialAlertDialog({
  materialId,
  materialName,
  unit,
  currentPrice,
  currency,
  open,
  onOpenChange,
}: MaterialAlertDialogProps) {
  const createAlert = useMutation(api.materialAlerts.createAlert);
  // Le parent monte ce composant uniquement à l'ouverture : les valeurs
  // initiales (seuil réaliste à -10 %) sont donc calculées au montage, sans
  // effet de synchronisation.
  const [direction, setDirection] = useState<Direction>("below");
  const [targetPrice, setTargetPrice] = useState(() => (currentPrice * 0.9).toFixed(3));
  const [threshold, setThreshold] = useState("5");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await createAlert({
        materialPriceId: materialId as never,
        direction,
        targetPrice: direction === "change" ? undefined : parseFloat(targetPrice),
        thresholdPercent: direction === "change" ? parseFloat(threshold) : undefined,
        note: note.trim() || undefined,
      });
      toast.success("Alerte prix créée");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const valid =
    direction === "change"
      ? parseFloat(threshold) > 0 && parseFloat(threshold) <= 100
      : parseFloat(targetPrice) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" />
            Alerte prix
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {materialName} · prix actuel {currentPrice.toFixed(3)} {currency}
            {unit ? ` / ${unit}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Type d'alerte</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="below">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                    Prix qui descend sous un seuil
                  </span>
                </SelectItem>
                <SelectItem value="above">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-rose-600" />
                    Prix qui dépasse un seuil
                  </span>
                </SelectItem>
                <SelectItem value="change">
                  <span className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-amber-600" />
                    Variation en %
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {direction === "change" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Variation minimale (%)</Label>
              <Input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Prix cible ({currency}
                {unit ? ` / ${unit}` : ""})
              </Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Note (optionnel)</Label>
            <Input
              placeholder="Ex. acheter avant le chantier"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving || !valid} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Créer l'alerte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
