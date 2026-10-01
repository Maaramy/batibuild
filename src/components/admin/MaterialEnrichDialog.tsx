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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";

export type MaterialEnrichInput = {
  _id: string;
  name: string;
  subcategory?: string;
  brand?: string;
  manufacturer?: string;
  description?: string;
  norms?: string[];
  certifications?: string[];
  compatibility?: string[];
  packaging?: string;
  usageAdvice?: string;
  storageAdvice?: string;
  safetyAdvice?: string;
  imageUrl?: string;
  technicalSheetUrl?: string;
  supplierRef?: string;
  characteristics?: { label: string; value: string }[];
};

interface MaterialEnrichDialogProps {
  /** Matériau à enrichir — le composant est monté à l'ouverture (non nul). */
  material: MaterialEnrichInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export function MaterialEnrichDialog({ material, open, onOpenChange }: MaterialEnrichDialogProps) {
  const updateMaterial = useMutation(api.materials.updateMaterialPrice);
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState(material.brand ?? "");
  const [manufacturer, setManufacturer] = useState(material.manufacturer ?? "");
  const [description, setDescription] = useState(material.description ?? "");
  const [norms, setNorms] = useState((material.norms ?? []).join(", "));
  const [certifications, setCertifications] = useState(
    (material.certifications ?? []).join(", "),
  );
  const [compatibility, setCompatibility] = useState(
    (material.compatibility ?? []).join(", "),
  );
  const [packaging, setPackaging] = useState(material.packaging ?? "");
  const [usageAdvice, setUsageAdvice] = useState(material.usageAdvice ?? "");
  const [storageAdvice, setStorageAdvice] = useState(material.storageAdvice ?? "");
  const [safetyAdvice, setSafetyAdvice] = useState(material.safetyAdvice ?? "");
  const [technicalSheetUrl, setTechnicalSheetUrl] = useState(
    material.technicalSheetUrl ?? "",
  );
  const [imageUrl, setImageUrl] = useState(material.imageUrl ?? "");
  const [characteristics, setCharacteristics] = useState<{ label: string; value: string }[]>(
    material.characteristics ?? [],
  );

  const save = async () => {
    setSaving(true);
    try {
      await updateMaterial({
        id: material._id as never,
        brand: brand || undefined,
        manufacturer: manufacturer || undefined,
        description: description || undefined,
        norms: splitCsv(norms),
        certifications: splitCsv(certifications),
        compatibility: splitCsv(compatibility),
        packaging: packaging || undefined,
        usageAdvice: usageAdvice || undefined,
        storageAdvice: storageAdvice || undefined,
        safetyAdvice: safetyAdvice || undefined,
        technicalSheetUrl: technicalSheetUrl || undefined,
        imageUrl: imageUrl || undefined,
        characteristics: characteristics
          .filter((c) => c.label.trim() && c.value.trim())
          .map((c) => ({ label: c.label.trim(), value: c.value.trim() })),
      });
      toast.success(`Fiche de « ${material.name} » mise à jour`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Enrichir la fiche matériau
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{material.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Marque</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fabricant</Label>
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Normes (séparées par des virgules)</Label>
              <Input value={norms} onChange={(e) => setNorms(e.target.value)} placeholder="EN 197-1, DTU 20.1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Certifications (virgules)</Label>
              <Input
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="Marquage CE, FDS"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Compatibilités (virgules)</Label>
            <Input
              value={compatibility}
              onChange={(e) => setCompatibility(e.target.value)}
              placeholder="Sable, Gravier, Adjuvants"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Caractéristiques techniques</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => setCharacteristics([...characteristics, { label: "", value: "" }])}
              >
                <Plus className="h-3 w-3" />
                Ajouter
              </Button>
            </div>
            {characteristics.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Les caractéristiques sont dérivées automatiquement (dimensions, unité, référence…).
                Ajoutez ici les valeurs propres au produit.
              </p>
            ) : (
              <div className="space-y-2">
                {characteristics.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Caractéristique"
                      value={c.label}
                      onChange={(e) =>
                        setCharacteristics(
                          characteristics.map((x, j) =>
                            j === i ? { ...x, label: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Input
                      className="h-8 text-xs"
                      placeholder="Valeur"
                      value={c.value}
                      onChange={(e) =>
                        setCharacteristics(
                          characteristics.map((x, j) =>
                            j === i ? { ...x, value: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => setCharacteristics(characteristics.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Conditionnement</Label>
              <Input value={packaging} onChange={(e) => setPackaging(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Image (URL)</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fiche technique (URL PDF)</Label>
              <Input
                value={technicalSheetUrl}
                onChange={(e) => setTechnicalSheetUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Conseils de mise en œuvre</Label>
              <Textarea rows={3} value={usageAdvice} onChange={(e) => setUsageAdvice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Consignes de stockage</Label>
              <Textarea
                rows={3}
                value={storageAdvice}
                onChange={(e) => setStorageAdvice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Consignes de sécurité</Label>
              <Textarea
                rows={3}
                value={safetyAdvice}
                onChange={(e) => setSafetyAdvice(e.target.value)}
              />
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Badge variant="secondary" className="text-[9px]">
              Astuce
            </Badge>
            Les champs laissés vides conservent la valeur dérivée automatiquement.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
