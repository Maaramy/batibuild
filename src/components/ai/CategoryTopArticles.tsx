import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Crown, Store, FileText, Send, Loader2, X, MapPin, Phone, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { TopArticle } from "@/convex/aiMaterialsEngine";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtTnd = (n: number) =>
  new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat("fr-TN", { maximumFractionDigits: digits }).format(n);

/**
 * Spécialités fournisseurs rattachées à chaque catégorie de matériaux du Copilot.
 * La première entrée est la spécialité « directe » lorsque la catégorie possède un
 * équivalent dans SUPPLIER_SPECIALTIES ; les suivantes servent de repli.
 */
const CATEGORY_TO_SPECIALTIES: Record<string, string[]> = {
  beton: ["beton", "gros_oeuvre", "ferraillage", "coffrage"],
  ciment: ["beton", "gros_oeuvre", "macconnerie"],
  acier: ["ferraillage", "gros_oeuvre"],
  briques: ["macconnerie", "gros_oeuvre"],
  blocs_beton: ["macconnerie", "gros_oeuvre"],
  isolation_thermique: ["isolation"],
  isolation_acoustique: ["isolation"],
  etancheite: ["etancheite"],
  mortier: ["macconnerie", "beton"],
  enduit: ["peinture", "macconnerie"],
  carrelage: ["carrelage"],
  faience: ["carrelage"],
  pierre_naturelle: ["marbre", "carrelage"],
  marbre: ["marbre"],
  peinture: ["peinture"],
  bois: ["menuserie_bois", "charpente", "coffrage"],
  aluminium: ["aluminium"],
  pvc: ["pvc"],
  verre: ["aluminium", "pvc", "fenetres"],
  menuiserie: ["menuserie_bois", "aluminium", "pvc"],
  portes: ["portes", "menuserie_bois"],
  revetements_sol: ["carrelage", "marbre"],
  sanitaires: ["plomberie", "salle_de_bain"],
  robinetterie: ["plomberie", "salle_de_bain"],
  electricite: ["electricite"],
  plomberie: ["plomberie"],
  chauffage: ["climatisation", "plomberie"],
  climatisation: ["climatisation"],
  equipements_energetiques: ["energie_solaire", "electricite"],
  panneaux_solaires: ["energie_solaire", "electricite"],
  piscine: ["piscines"],
  amenagement_exterieur: ["jardins", "voirie"],
};

interface SupplierLite {
  _id: string;
  companyName: string;
  phone?: string;
  email?: string;
  address?: string;
  specialties?: string[];
  userId?: string;
}

interface CategoryTopArticlesProps {
  /** Identifiant de la catégorie de matériaux (cat.categoryId). */
  categoryId: string;
  /** Libellé humain de la catégorie. */
  categoryLabel: string;
  /** Articles classés (Top 5) pour le projet sélectionné. */
  articles: TopArticle[];
  /** Nom du projet (affiché / transmis dans la demande de devis). */
  projectName?: string;
  /** ID de l'utilisateur connecté (bloque l'auto-demande de devis). */
  currentUserId?: string;
}

export function CategoryTopArticles({
  categoryId,
  categoryLabel,
  articles,
  projectName,
  currentUserId,
}: CategoryTopArticlesProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  // Tous les fournisseurs actifs/visibles → sélection déterministe du fournisseur
  // rattaché à la catégorie (spécialité directe puis replis).
  const activeSuppliersQuery = useQuery(api.supplierProfiles.getActiveSuppliers);
  const createQuoteRequest = useMutation(api.quoteRequests.create);

  const specialties = useMemo(
    () => CATEGORY_TO_SPECIALTIES[categoryId] || [categoryId],
    [categoryId],
  );

  const supplier: SupplierLite | null = useMemo(() => {
    const activeSuppliers: SupplierLite[] = activeSuppliersQuery || [];
    const byPrio = new Map<string, { s: SupplierLite; prio: number }>();
    specialties.forEach((sp, prio) => {
      for (const s of activeSuppliers) {
        if (s.specialties?.includes(sp)) {
          const existing = byPrio.get(s._id);
          if (!existing || prio < existing.prio) byPrio.set(s._id, { s, prio });
        }
      }
    });
    const ranked = [...byPrio.values()]
      .filter((x) => !x.s.userId || x.s.userId !== currentUserId)
      .sort(
        (a, b) =>
          a.prio - b.prio ||
          (a.s.companyName || "").localeCompare(b.s.companyName || ""),
      );
    return ranked[0]?.s ?? null;
  }, [activeSuppliersQuery, specialties, currentUserId]);

  if (!articles || articles.length === 0) return null;
  const first = articles[0];

  const openQuote = () => {
    if (!supplier) {
      toast.info("Aucun fournisseur actif pour cette catégorie — ouverture de l'annuaire fournisseurs.");
      navigate("/dashboard/suppliers-directory");
      return;
    }
    setDialogOpen(true);
  };

  const sendQuote = async () => {
    if (!supplier) return;
    setSending(true);
    try {
      await createQuoteRequest({
        supplierId: supplier._id as Id<"supplierProfiles">,
        projectName: projectName || undefined,
        category: categoryLabel,
        materials: [
          {
            name: first.name,
            quantity: first.quantity,
            unit: first.quantityUnit,
          },
        ],
        message: message.trim() || undefined,
      });
      toast.success(`Demande de devis envoyée à ${supplier.companyName} avec succès !`);
      setDialogOpen(false);
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi de la demande");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3">
      {/* En-tête du tableau */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
          <Store className="h-3 w-3 text-primary" />
          Top {articles.length} des articles les plus utilisés pour le projet sélectionné
        </p>
        {supplier ? (
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <Store className="h-3 w-3" /> Fournisseur de la catégorie : {supplier.companyName}
          </p>
        ) : (
          <p className="text-[10px] text-amber-700 dark:text-amber-400/90 flex items-center gap-1">
            <Info className="h-3 w-3" /> Aucun fournisseur actif pour « {categoryLabel} » — la demande basculera vers l'annuaire fournisseurs.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border/30 text-[10px] text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-3 py-2 font-semibold w-12">Classement</th>
                <th className="text-left px-3 py-2 font-semibold">Article</th>
                <th className="text-right px-3 py-2 font-semibold">Prix unitaire</th>
                <th className="text-right px-3 py-2 font-semibold">Prix TTC</th>
                <th className="text-right px-3 py-2 font-semibold">Demande de devis</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => {
                const isFirst = a.rank === first.rank;
                return (
                  <tr
                    key={a.materialId}
                    className={isFirst ? "bg-emerald-500/[0.04] border-b border-border/20" : "border-b border-border/10 last:border-0"}
                  >
                    <td className="px-3 py-2.5">
                      <span
                        className={isFirst
                          ? "inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
                          : "inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"}
                      >
                        {isFirst && <Crown className="h-3 w-3" />}#{a.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 min-w-0">
                      <p className="font-semibold text-[11px] sm:text-xs leading-snug">{a.name}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Qté {fmtNum(a.quantity)} {a.quantityUnit}
                        {a.brand ? ` · ${a.brand}` : ""} · Score {a.score}/100
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
                      <span className="text-[11px] font-semibold">{fmtTnd(a.unitPrice)}</span>
                      <span className="text-[9px] text-muted-foreground"> / {a.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
                      <span className="text-[11px] font-bold">{fmtTnd(a.totalTTC)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {isFirst ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-auto gap-1 text-[10px] font-medium rounded-md px-2 py-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                          onClick={openQuote}
                        >
                          <FileText className="h-3 w-3" /> Demander un devis
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60" title="La demande de devis concerne l'article n°1 du classement IA.">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialogue Demande de devis (fournisseur de la catégorie) ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Demande de devis — {supplier?.companyName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Article n°1 du classement IA pour la catégorie « {categoryLabel} »{projectName ? ` — projet ${projectName}` : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Article concerné */}
            <div className="rounded-xl border border-border/30 overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/20">
                <div className="bg-background px-3 py-2.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Article</p>
                  <p className="text-xs font-semibold mt-0.5">{first.name}</p>
                </div>
                <div className="bg-background px-3 py-2.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Quantité</p>
                  <p className="text-xs font-semibold mt-0.5">{fmtNum(first.quantity)} {first.quantityUnit}</p>
                </div>
                <div className="bg-background px-3 py-2.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Prix unitaire</p>
                  <p className="text-xs font-semibold mt-0.5">{fmtTnd(first.unitPrice)} / {first.unit}</p>
                </div>
                <div className="bg-background px-3 py-2.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Total TTC</p>
                  <p className="text-xs font-bold mt-0.5 text-emerald-700 dark:text-emerald-400">{fmtTnd(first.totalTTC)}</p>
                </div>
              </div>
            </div>

            {/* Coordonnées du fournisseur */}
            {supplier && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/20 bg-muted/10 px-3 py-2">
                {supplier.phone && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5" /> {supplier.phone}
                  </span>
                )}
                {supplier.email && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Store className="h-2.5 w-2.5" /> {supplier.email}
                  </span>
                )}
                {supplier.address && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> {supplier.address}
                  </span>
                )}
              </div>
            )}

            {/* Message optionnel */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Message optionnel
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Décrivez vos besoins pour ${first.name}…`}
                className="w-full min-h-[70px] rounded-lg border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDialogOpen(false)}>
                <X className="h-3 w-3 mr-1" /> Annuler
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" disabled={sending} onClick={sendQuote}>
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
