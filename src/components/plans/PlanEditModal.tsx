import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RefreshCw, Loader2, Sparkles } from "lucide-react";
import type { PlanRequest, GeneratedPlan } from "@/convex/planEngine";

// ============================================================================
// Modification d'un plan : ajuste les contraintes et régénère automatiquement
// la variante (ou les 10) en conservant les autres contraintes.
// ============================================================================

// Types de bien à un seul niveau (rez-de-chaussée imposé)
const SINGLE_LEVEL_TYPES = ["local_commercial", "entrepot", "bureau"];

const COMMANDS: { key: string; label: string; hint: string }[] = [
  { key: "bedrooms", label: "Chambres", hint: "Ajouter / supprimer une chambre" },
  { key: "bathrooms", label: "Salles de bain", hint: "Ajouter une salle de bains" },
  { key: "wcs", label: "WC", hint: "Ajouter / supprimer un WC" },
  { key: "hasSalon", label: "Agrandir le salon", hint: "Augmente la surface du salon" },
  { key: "hasCuisine", label: "Réduire la cuisine", hint: "Diminue la surface de la cuisine" },
  { key: "hasGarage", label: "Garage", hint: "Ajouter un garage" },
  { key: "hasTerrasse", label: "Terrasse", hint: "Ajouter une terrasse" },
  { key: "hasPiscine", label: "Piscine", hint: "Ajouter une piscine" },
  { key: "hasJardin", label: "Jardin", hint: "Ajouter un jardin" },
  { key: "floors", label: "Niveaux", hint: "Changer le nombre de niveaux" },
];

export function PlanEditModal({
  plan,
  request,
  open,
  onClose,
  onApply,
  index,
}: {
  plan: GeneratedPlan;
  request: PlanRequest;
  open: boolean;
  onClose: () => void;
  onApply: (req: PlanRequest, regenerateAll: boolean, index?: number) => void;
  index: number;
}) {
  const [req, setReq] = useState<PlanRequest>(request);
  const [regenAll, setRegenAll] = useState(false);
  const [busy, setBusy] = useState(false);

  // Rez-de-chaussée imposé pour les locaux d'activité
  const singleLevel = SINGLE_LEVEL_TYPES.includes(req.bienType);
  useEffect(() => {
    if (singleLevel) setReq((r) => (r.floors !== 1 ? { ...r, floors: 1 } : r));
  }, [singleLevel]);

  const set = <K extends keyof PlanRequest>(key: K, value: PlanRequest[K]) =>
    setReq((r) => ({ ...r, [key]: value }));

  const apply = (all: boolean) => {
    setBusy(true);
    // Légère latence pour l'effet de régénération
    setTimeout(() => {
      onApply(req, all, index);
      setBusy(false);
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Modifier le plan {String(plan.index).padStart(2, "0")}</DialogTitle>
          <DialogDescription className="text-xs">
            Ajustez les contraintes — l'IA régénère automatiquement le plan en conservant les autres paramètres.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Surfaces */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold">Surface couverte (m²)</Label>
              <Input type="number" inputMode="decimal" min={15} value={req.surfaceCouverte || ""} onChange={(e) => set("surfaceCouverte", parseFloat(e.target.value) || 0)} className="mt-1 h-10 sm:h-8 w-full text-xs" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold">Niveaux</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3].map((f) => (
                  <button
                    key={f}
                    onClick={() => !singleLevel && set("floors", f)}
                    disabled={singleLevel && f !== 1}
                    className={`flex-1 py-2.5 sm:py-2 min-h-11 sm:min-h-10 rounded-md border text-[11px] font-semibold transition-all active:scale-[0.97] ${req.floors === f ? "border-primary bg-primary/10 text-primary" : "border-border/40"} ${singleLevel && f !== 1 ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    R+{f - 1}
                  </button>
                ))}
              </div>
              {singleLevel && (
                <p className="text-[9px] text-muted-foreground mt-1">Rez-de-chaussée uniquement pour ce type de bien.</p>
              )}
            </div>
          </div>

          {/* Commandes rapides */}
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 text-[10px] font-semibold text-muted-foreground border-b border-border/40">
              Commandes de modification
            </div>
            <div className="divide-y divide-border/30">
              {COMMANDS.map((c) => {
                const isCount = ["bedrooms", "bathrooms", "wcs"].includes(c.key);
                const isToggle = ["hasGarage", "hasTerrasse", "hasPiscine", "hasJardin", "hasSalon", "hasCuisine"].includes(c.key);
                const current = (req as any)[c.key];
                return (
                  <div key={c.key} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium">{c.label}</p>
                      <p className="text-[9px] text-muted-foreground">{c.hint}</p>
                    </div>
                    {isCount ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" aria-label={`Réduire ${c.label}`} className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/40 text-base hover:bg-muted active:scale-95" onClick={() => set(c.key as any, Math.max(c.key === "wcs" ? 0 : 1, current - 1))}>−</button>
                        <span className="w-7 text-center text-xs font-bold">{current}</span>
                        <button type="button" aria-label={`Augmenter ${c.label}`} className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-border/40 text-base hover:bg-muted active:scale-95" onClick={() => set(c.key as any, Math.min(8, current + 1))}>+</button>
                      </div>
                    ) : isToggle ? (
                      <button
                        type="button"
                        aria-label={c.label}
                        onClick={() => set(c.key as any, !current)}
                        className="shrink-0 -m-2 p-2"
                      >
                        <span className={`relative block h-5 w-9 rounded-full transition-colors ${current ? "bg-primary" : "bg-muted"}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${current ? "left-[18px]" : "left-0.5"}`} />
                        </span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exigences */}
          <div>
            <Label className="text-[11px] font-semibold">Exigences supplémentaires</Label>
            <Input value={req.exigences ?? ""} onChange={(e) => set("exigences", e.target.value)} placeholder="ex : déplacer la porte d'entrée, salon plein sud…" className="mt-1 h-10 sm:h-8 w-full text-xs" />
          </div>

          {/* Options de régénération */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRegenAll(false)}
              className={`flex-1 rounded-lg border p-2.5 text-left transition-all ${!regenAll ? "border-primary bg-primary/5" : "border-border/40"}`}
            >
              <p className="text-[11px] font-semibold">Régénérer ce plan</p>
              <p className="text-[9px] text-muted-foreground">Cette variante seulement</p>
            </button>
            <button
              type="button"
              onClick={() => setRegenAll(true)}
              className={`flex-1 rounded-lg border p-2.5 text-left transition-all ${regenAll ? "border-primary bg-primary/5" : "border-border/40"}`}
            >
              <p className="text-[11px] font-semibold">Régénérer les 10</p>
              <p className="text-[9px] text-muted-foreground">Toutes les propositions</p>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-10 sm:h-8 text-xs" onClick={onClose}>Annuler</Button>
          <Button size="sm" className="h-10 sm:h-8 text-xs gap-1" onClick={() => apply(regenAll)} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {busy ? "Régénération…" : "Régénérer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
