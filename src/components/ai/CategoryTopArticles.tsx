import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Crown, FileText, List, Loader2, MapPin, Package, Send, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("fr-TN", { maximumFractionDigits: digits }).format(n);

/** Normalisation insensible aux accents/casse pour la correspondance de noms. */
const normName = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Spécialités fournisseurs pertinentes par catégorie du Copilot (repli). */
const COPILOT_CATEGORY_SPECIALTIES: Record<string, string[]> = {
  beton: ["beton", "gros_oeuvre", "fondations"],
  ciment: ["beton", "macconnerie", "gros_oeuvre"],
  acier: ["ferraillage", "gros_oeuvre", "fondations"],
  briques: ["macconnerie", "gros_oeuvre"],
  blocs_beton: ["macconnerie", "gros_oeuvre", "beton"],
  isolation_thermique: ["isolation", "etancheite"],
  isolation_acoustique: ["isolation", "second_oeuvre"],
  etancheite: ["etancheite", "toiture"],
  mortier: ["macconnerie", "beton"],
  enduit: ["peinture", "second_oeuvre"],
  carrelage: ["carrelage", "marbre", "salle_de_bain"],
  faience: ["carrelage", "salle_de_bain"],
  pierre_naturelle: ["marbre", "carrelage"],
  marbre: ["marbre", "carrelage"],
  peinture: ["peinture", "second_oeuvre"],
  bois: ["charpente", "menuserie_bois"],
  aluminium: ["aluminium", "fenetres"],
  pvc: ["pvc", "aluminium", "fenetres"],
  verre: ["fenetres", "aluminium"],
  menuiserie: ["menuserie_bois", "aluminium", "pvc", "portes"],
  portes: ["portes", "menuserie_bois"],
  revetements_sol: ["carrelage", "marbre"],
  sanitaires: ["salle_de_bain", "plomberie"],
  robinetterie: ["plomberie", "salle_de_bain"],
  electricite: ["electricite", "domotique"],
  plomberie: ["plomberie"],
  chauffage: ["plomberie", "climatisation", "electricite"],
  climatisation: ["climatisation", "electricite"],
  equipements_energetiques: ["energie_solaire", "electricite"],
  panneaux_solaires: ["energie_solaire", "electricite"],
  piscine: ["piscines"],
  amenagement_exterieur: ["jardins", "voirie", "terrassement"],
  autres: ["gros_oeuvre", "second_oeuvre", "transport_materiaux", "location_engins"],
};

type ActiveSupplier = {
  _id: string;
  companyName: string;
  phone?: string;
  address?: string;
  description?: string;
  specialties: string[];
  regions: string[];
};

/** Ligne du Top 5 : article recommandé pour le projet (classement IA). */
export type TopArticleRow = {
  rank: number;
  materialId: string;
  name: string;
  brand?: string;
  unit: string;
  /** Prix de marché le plus fiable (TND / unité). */
  unitPrice: number;
  /** Quantité retenue pour le projet. */
  quantity: number;
  quantityUnit: string;
  /** Prix TTC = prix unitaire × quantité × (1 + TVA). */
  totalTTC: number;
  /** Score de pertinence IA (0-100). */
  score: number;
  /** Source du prix (transparence). */
  priceSource?: string;
  /** Fournisseurs recensés pour cet article (offres de la base). */
  suppliers: { name: string; price: number; governorate?: string }[];
};

/**
 * Rend une ligne du Top 5 robuste aux analyses enregistrées avant le
 * classement moteur (champs absents ou de forme différente) : jamais de crash
 * sur un `suppliers` manquant, des quantités non numériques, etc.
 */
function normalizeTopArticle(r: Partial<TopArticleRow>): TopArticleRow {
  const name = r.name || "Article non renseigné";
  return {
    rank: typeof r.rank === "number" && r.rank > 0 ? Math.round(r.rank) : 1,
    materialId: r.materialId || `${name}-${r.rank ?? 0}`,
    name,
    brand: r.brand,
    unit: r.unit || "unité",
    unitPrice: typeof r.unitPrice === "number" && isFinite(r.unitPrice) ? r.unitPrice : 0,
    quantity: typeof r.quantity === "number" && isFinite(r.quantity) ? r.quantity : 0,
    quantityUnit: r.quantityUnit || r.unit || "unité",
    totalTTC: typeof r.totalTTC === "number" && isFinite(r.totalTTC) ? r.totalTTC : 0,
    score: typeof r.score === "number" && isFinite(r.score) ? r.score : 0,
    priceSource: r.priceSource || "Catalogue des prix — base 2026",
    suppliers: Array.isArray(r.suppliers)
      ? r.suppliers.filter((s) => s && typeof s.name === "string")
      : [],
  };
}

interface CategoryTopArticlesProps {
  categoryId: string;
  categoryLabel: string;
  /** Articles du Top 5 (classement IA) — déjà calculés par le moteur. */
  rows: TopArticleRow[];
  /** Nombre de matériaux analysés dans la base pour cette catégorie. */
  count: number;
  /** Catégories officielles 2026 couvertes (liste complète des prix). */
  catalogCategories?: string[];
  /** Nom du projet (transmis à la demande de devis). */
  projectName?: string;
}

export function CategoryTopArticles({
  categoryId,
  categoryLabel,
  rows,
  count,
  catalogCategories = [],
  projectName,
}: CategoryTopArticlesProps) {
  const navigate = useNavigate();
  const activeSuppliers = useQuery(api.supplierProfiles.getActiveSuppliers);
  const createQuoteRequest = useMutation(api.quoteRequests.create);

  const [selected, setSelected] = useState<TopArticleRow | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Lignes normalisées : tolère les analyses enregistrées avant le Top 5 moteur.
  const safeRows = useMemo(() => rows.map(normalizeTopArticle), [rows]);

  // Fournisseurs pertinents par article :
  // 1) ceux recensés pour l'article (offres de la base, correspondance par nom),
  // 2) sinon repli sur les spécialités de la catégorie.
  const targetsByArticle = useMemo(() => {
    if (safeRows.length === 0 || !activeSuppliers) return new Map<string, ActiveSupplier[]>();
    const map = new Map<string, ActiveSupplier[]>();
    for (const r of safeRows) {
      const targets: ActiveSupplier[] = [];
      for (const s of r.suppliers) {
        const hit = activeSuppliers.find((p) => normName(p.companyName) === normName(s.name));
        if (hit && !targets.some((t) => t._id === hit._id)) targets.push(hit);
      }
      for (const sp of COPILOT_CATEGORY_SPECIALTIES[categoryId] ?? []) {
        for (const p of activeSuppliers) {
          if (p.specialties.includes(sp) && !targets.some((t) => t._id === p._id)) {
            targets.push(p);
          }
        }
      }
      map.set(r.materialId, targets);
    }
    return map;
  }, [safeRows, activeSuppliers, categoryId]);

  const suppliersLoading = activeSuppliers === undefined;
  const listUrl =
    catalogCategories.length > 0
      ? `/dashboard/materials?cat=${encodeURIComponent(catalogCategories.join(","))}`
      : "/dashboard/materials";

  const openQuote = (row: TopArticleRow) => {
    const targets = targetsByArticle.get(row.materialId) ?? [];
    if (targets.length === 0) {
      // Aucun fournisseur pertinent pour cet article → annuaire global
      toast.info("Aucun fournisseur spécialisé trouvé — ouverture de l'annuaire des fournisseurs.");
      navigate("/dashboard/suppliers-directory");
      return;
    }
    setSelected(row);
    setSupplierId(targets[0]._id);
    setMessage("");
  };

  const sendQuote = async () => {
    if (!selected || !supplierId) return;
    setSending(true);
    try {
      await createQuoteRequest({
        supplierId: supplierId as Id<"supplierProfiles">,
        projectName: projectName || undefined,
        category: categoryLabel,
        materials: [{ name: selected.name, quantity: selected.quantity, unit: selected.quantityUnit }],
        message: message || undefined,
      });
      toast.success("Demande de devis envoyée avec succès !");
      setSelected(null);
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi de la demande");
    } finally {
      setSending(false);
    }
  };

  if (safeRows.length === 0) return null;

  const selectedTargets = selected ? targetsByArticle.get(selected.materialId) ?? [] : [];

  return (
    <div className="mt-3">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <Crown className="h-3 w-3 text-amber-500" />
          Top 5 articles recommandés — {categoryLabel}
          <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/25 rounded-full px-1.5">
            {rows.length}
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-[10px] font-medium rounded-md"
          onClick={() => navigate(listUrl)}
          title={`Consulter la liste complète des matériaux de la catégorie ${categoryLabel}`}
        >
          <List className="h-3 w-3" />
          Liste complète — {count} matériaux
        </Button>
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden">
        {/* ── Tableau desktop (md+) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border/30 text-[10px] text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-3 py-2 font-semibold w-10">Rang</th>
                <th className="text-left px-3 py-2 font-semibold">Article</th>
                <th className="text-right px-3 py-2 font-semibold">Prix unitaire</th>
                <th className="text-right px-3 py-2 font-semibold">Prix TTC</th>
                <th className="text-right px-3 py-2 font-semibold">Demande de devis</th>
              </tr>
            </thead>
            <tbody>
              {safeRows.map((a) => {
                const hasTargets = (targetsByArticle.get(a.materialId) ?? []).length > 0;
                return (
                  <tr key={a.materialId} className="border-b border-border/10 last:border-0">
                    <td className="px-3 py-2.5 align-top">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-600">
                        {a.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 min-w-0">
                      <p className="font-semibold text-[11px] sm:text-xs leading-snug">
                        {a.rank === 1 && <Crown className="inline h-3 w-3 text-amber-500 mr-1 -mt-0.5" />}
                        {a.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1">
                        Qté {fmtNum(a.quantity)} {a.quantityUnit}
                        {a.brand ? ` · ${a.brand}` : ""}
                        {a.priceSource ? ` · ${a.priceSource}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums align-top">
                      <span className="text-[11px] font-semibold">{fmtTnd(a.unitPrice)}</span>
                      <span className="text-[9px] text-muted-foreground"> / {a.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums align-top">
                      <span className="text-[11px] font-bold">{fmtTnd(a.totalTTC)}</span>
                      <span className="text-[9px] text-muted-foreground"> (TVA incluse)</span>
                    </td>
                    <td className="px-3 py-2.5 text-right align-top">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-[10px] font-medium rounded-md border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                        disabled={suppliersLoading}
                        onClick={() => openQuote(a)}
                      >
                        {suppliersLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                        {hasTargets ? "Demander un devis" : "Voir les fournisseurs"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Cartes mobile (< md) ── */}
        <div className="md:hidden divide-y divide-border/10">
          {safeRows.map((a) => {
            const hasTargets = (targetsByArticle.get(a.materialId) ?? []).length > 0;
            return (
              <div key={a.materialId} className="px-3 py-3">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${a.rank === 1 ? "bg-amber-500/15 border border-amber-500/40 text-amber-600" : "bg-muted/50 border border-border/40 text-muted-foreground"}`}>
                    {a.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[11px] leading-snug">
                      {a.rank === 1 && <Crown className="inline h-3 w-3 text-amber-500 mr-1 -mt-0.5" />}
                      {a.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      Qté {fmtNum(a.quantity)} {a.quantityUnit}
                      {a.brand ? ` · ${a.brand}` : ""}
                    </p>
                  </div>
                  <Badge className="shrink-0 text-[9px] bg-blue-500/10 text-blue-700 border-blue-500/30">
                    Score {a.score}/100
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/30 bg-muted/10 px-2.5 py-1.5">
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wide">Prix unitaire</p>
                    <p className="text-[11px] font-bold tabular-nums">{fmtTnd(a.unitPrice)}<span className="text-[8px] font-medium text-muted-foreground">/{a.unit}</span></p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1.5">
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wide">Prix TTC</p>
                    <p className="text-[11px] font-black tabular-nums text-emerald-600 dark:text-emerald-400">{fmtTnd(a.totalTTC)}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full h-8 gap-1.5 text-[10px] font-medium rounded-md border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                  disabled={suppliersLoading}
                  onClick={() => openQuote(a)}
                >
                  {suppliersLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                  {hasTargets ? "Demander un devis" : "Voir les fournisseurs"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/80">
        <Package className="h-3 w-3 text-primary" />
        Classement IA basé sur votre projet (type, surface, standing, DQE/BIM) et les prix internes du catalogue 2026.
      </p>

      {/* ── Dialogue de demande de devis ── */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o && !sending) { setSelected(null); setMessage(""); } }}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Demande de devis — {selected?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choisissez le fournisseur pertinent pour cet article, puis envoyez votre demande.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Résumé de l'article */}
            {selected && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2">
                  <p className="text-[9px] text-muted-foreground">Quantité</p>
                  <p className="text-xs font-semibold">{fmtNum(selected.quantity)} {selected.quantityUnit}</p>
                </div>
                <div className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2">
                  <p className="text-[9px] text-muted-foreground">Prix unitaire</p>
                  <p className="text-xs font-semibold">{fmtTnd(selected.unitPrice)}</p>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                  <p className="text-[9px] text-muted-foreground">Total TTC</p>
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">{fmtTnd(selected.totalTTC)}</p>
                </div>
              </div>
            )}

            {/* Choix du fournisseur */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Fournisseurs pertinents ({selectedTargets.length})
              </p>
              <div className="space-y-2">
                {selectedTargets.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => setSupplierId(s._id)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${supplierId === s._id ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20" : "border-border/30 bg-background hover:border-border/60"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">{s.companyName}</p>
                      {supplierId === s._id && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      {s.regions && s.regions.length > 0 ? s.regions.join(", ") : "Tunisie"}
                      {s.phone ? ` · ${s.phone}` : ""}
                    </p>
                  </button>
                ))}
                {selectedTargets.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Aucun fournisseur pertinent n'est actuellement actif pour cet article.
                  </p>
                )}
              </div>
            </div>

            {/* Message optionnel */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Message optionnel
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Précisez vos besoins (délais, volume, livraison...)"
                className="text-xs min-h-[70px] rounded-xl"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={sending}
                onClick={() => { setSelected(null); setMessage(""); }}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                disabled={sending || !supplierId}
                onClick={sendQuote}
              >
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Envoyer la demande
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}