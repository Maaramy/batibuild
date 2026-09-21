import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import {
  ArrowLeft, Store, Search, MapPin, Phone, Mail,
  ChevronDown, X, Filter, FileText, Loader2, Send, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/lib/supplierSpecialties";
import { profileCardClass, VerifiedBadge, TrophyLine, MetricRow, DetailRow } from "@/components/ProfileCardBits";

// ── Region labels ────────────────────────────────────────────────────────────

const REGION_LABELS: Record<string, string> = {
  tunis: "Tunis",
  ariana: "Ariana",
  ben_arous: "Ben Arous",
  manouba: "Manouba",
  nabeul: "Nabeul",
  bizerte: "Bizerte",
  sousse: "Sousse",
  monastir: "Monastir",
  mahdia: "Mahdia",
  sfax: "Sfax",
  gabes: "Gabès",
  medenine: "Médenine",
  tozeur: "Tozeur",
  kebili: "Kébili",
  gafsa: "Gafsa",
  sidi_bouzid: "Sidi Bouzid",
  kasserine: "Kasserine",
  le_kef: "Le Kef",
  jendouba: "Jendouba",
  beja: "Béja",
  siliana: "Siliana",
  zaghouan: "Zaghouan",
  tataouine: "Tataouine",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function SuppliersDirectory() {
  usePageSEO({
    title: "Trouvez un fournisseur près de chez vous - batibuild App",
    description:
      "Trouvez les meilleurs fournisseurs de matériaux de construction en Tunisie. Filtrez par spécialité, catégorie et région.",
  });

  const navigate = useNavigate();
  const { flags: journeyFlags } = useFeatureFlags();
  const suppliers = useQuery(api.supplierProfiles.getActiveSuppliers);

  // Filtres pilotés par l'URL : l'annuaire peut être ouvert pré-filtré depuis
  // une analyse de matériaux (?from=materials&specialty=…&region=…).
  const [searchParams, setSearchParams] = useSearchParams();

  // Parcours du projet — contexte conservé dans l'URL lorsque l'annuaire est
  // ouvert depuis un projet (?project=…), comme sur les autres étapes.
  const projectIdParam = searchParams.get("project") ?? null;

  const [search, setSearch] = useState("");
  const [ratingSupplier, setRatingSupplier] = useState<any>(null);
  const [myRating, setMyRating] = useState(0);
  const [sendingRating, setSendingRating] = useState(false);
  const [devisSupplier, setDevisSupplier] = useState<any>(null);
  const [devisMessage, setDevisMessage] = useState("");
  const [sendingDevis, setSendingDevis] = useState(false);
  const rateSupplier = useMutation(api.ratings.rateSupplier);
  const createQuoteRequest = useMutation(api.quoteRequests.create);
  const { user } = useAuth();

  // Build unique specialties & regions from data
  const availableSpecialties = useMemo(() => {
    if (!suppliers) return [];
    const set = new Set<string>();
    for (const s of suppliers) {
      for (const sp of s.specialties) set.add(sp);
    }
    return [...set].sort();
  }, [suppliers]);

  const availableRegions = useMemo(() => {
    if (!suppliers) return [];
    const set = new Set<string>();
    for (const s of suppliers) {
      for (const r of s.regions ?? []) set.add(r);
    }
    return [...set].sort();
  }, [suppliers]);

  // Spécialités / région appliquées automatiquement (source de vérité = URL)
  const fromMaterials = searchParams.get("from") === "materials";
  const autoSpecialties = useMemo(
    () =>
      (searchParams.get("specialty") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [searchParams],
  );
  const autoSpecialtiesKey = autoSpecialties.join(",");
  const selectedRegion = searchParams.get("region") ?? "";
  // La première spécialité appliquée est affichée dans la liste déroulante,
  // les suivantes restent visibles sous forme de badges (filtre « au moins une »).
  const selectedSpecialty =
    autoSpecialties.find((sp) => availableSpecialties.includes(sp)) ??
    autoSpecialties[0] ??
    "";

  /** Met à jour les filtres dans l'URL (remplace les anciens états locaux). */
  const setFilters = (patch: {
    specialty?: string[] | null;
    region?: string | null;
    from?: string | null;
  }) => {
    const next = new URLSearchParams(searchParams);
    if (patch.specialty !== undefined) {
      next.delete("specialty");
      if (patch.specialty && patch.specialty.length > 0) {
        next.set("specialty", patch.specialty.join(","));
      }
    }
    if (patch.region !== undefined) {
      next.delete("region");
      if (patch.region) next.set("region", patch.region);
    }
    if (patch.from !== undefined) {
      next.delete("from");
      if (patch.from) next.set("from", patch.from);
    }
    // Dès qu'il ne reste plus de filtre issu de l'analyse, on retire la mention.
    if (!next.get("specialty") && !next.get("region")) next.delete("from");
    setSearchParams(next, { replace: true });
  };

  // Filtered suppliers
  const filtered = useMemo(() => {
    if (!suppliers) return [];
    return suppliers.filter((s) => {
      // Text search
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${s.companyName} ${s.description ?? ""} ${s.specialties.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Specialty filter (au moins une spécialité appliquée doit correspondre)
      if (
        autoSpecialties.length > 0 &&
        !autoSpecialties.some((sp) => s.specialties.includes(sp))
      ) {
        return false;
      }
      // Region filter
      if (selectedRegion && !(s.regions ?? []).includes(selectedRegion)) return false;
      return true;
    });
  }, [suppliers, search, autoSpecialtiesKey, selectedRegion]);

  const activeFilterCount =
    (autoSpecialties.length > 0 ? 1 : 0) + (selectedRegion ? 1 : 0) + (search ? 1 : 0);

  const openQuoteDialog = (s: any) => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setDevisMessage("");
    setDevisSupplier(s);
  };

  const handleSendQuote = async () => {
    if (!devisSupplier) return;
    if (user?._id && devisSupplier.userId && user._id === devisSupplier.userId) {
      toast.error("Vous ne pouvez pas vous envoyer un devis à vous-même.");
      return;
    }
    setSendingDevis(true);
    try {
      await createQuoteRequest({
        supplierId: devisSupplier._id as any,
        category: devisSupplier.specialties?.[0] ?? "général",
        materials: [],
        message: devisMessage || undefined,
      });
      toast.success("Demande de devis envoyée avec succès !");
      setDevisSupplier(null);
      setDevisMessage("");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de l'envoi");
    } finally {
      setSendingDevis(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12 sm:h-14">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border/50 shrink-0" />
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 shrink-0">
              <Store className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-semibold leading-tight">
                Trouvez un fournisseur près de chez vous
              </h1>
              <p className="text-[8px] text-muted-foreground leading-tight">
                {suppliers ? `${filtered.length} fournisseur(s) trouvé(s)` : "Chargement…"}
              </p>
            </div>
          </div>
        </div>

        {/* Parcours du projet — affiché lorsque l'annuaire est ouvert depuis un
            projet (contexte conservé dans l'URL). */}
        <ProjectJourneyNav
          projectId={projectIdParam}
          flags={journeyFlags}
          maxWidthClassName="max-w-7xl"
        />
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 space-y-4">
        {/* ── Filters bar ── */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un fournisseur…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-sm pl-8 pr-8 rounded-lg"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Specialty filter */}
              <div className="relative min-w-[180px]">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={selectedSpecialty}
                  onChange={(e) =>
                    setFilters({
                      specialty: e.target.value ? [e.target.value] : [],
                      from: null, // l'utilisateur reprend la main sur les filtres
                    })
                  }
                  className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-8 text-sm appearance-none"
                >
                  <option value="">Toutes spécialités</option>
                  {availableSpecialties.map((sp) => (
                    <option key={sp} value={sp}>
                      {SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>

              {/* Region filter */}
              <div className="relative min-w-[180px]">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={selectedRegion}
                  onChange={(e) =>
                    setFilters({
                      region: e.target.value || null,
                      from: null, // l'utilisateur reprend la main sur les filtres
                    })
                  }
                  className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-8 text-sm appearance-none"
                >
                  <option value="">Toutes régions</option>
                  {availableRegions.map((r) => (
                    <option key={r} value={r}>
                      {REGION_LABELS[r] ?? r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Active filters chips */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-[9px] text-muted-foreground">Filtres actifs :</span>
                {search && (
                  <Badge variant="secondary" className="text-[9px] gap-1 h-5 px-1.5">
                    « {search} »
                    <button onClick={() => setSearch("")}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
                {autoSpecialties.map((sp) => (
                  <Badge key={sp} variant="secondary" className="text-[9px] gap-1 h-5 px-1.5">
                    {SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp}
                    <button
                      onClick={() =>
                        setFilters({
                          specialty: autoSpecialties.filter((x) => x !== sp),
                        })
                      }
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
                {selectedRegion && (
                  <Badge variant="secondary" className="text-[9px] gap-1 h-5 px-1.5">
                    {REGION_LABELS[selectedRegion] ?? selectedRegion}
                    <button onClick={() => setFilters({ region: null })}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setSearch("");
                    setFilters({ specialty: [], region: null, from: null });
                  }}
                  className="text-[9px] text-primary hover:underline"
                >
                  Tout effacer
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Loading state ── */}
        {suppliers === undefined && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-40 rounded-xl border border-border/30 bg-muted/20 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {suppliers !== undefined && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/30 border border-border/30 mb-4">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-base font-bold tracking-tight">
              Aucun fournisseur trouvé
            </h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              {fromMaterials && activeFilterCount > 0
                ? "Aucun fournisseur inscrit ne correspond aux spécialités/région de votre analyse. Élargissez la recherche pour voir plus de résultats."
                : activeFilterCount > 0
                  ? "Essayez de modifier vos filtres ou d'élargir votre recherche."
                  : "Aucun fournisseur actif n'est encore inscrit sur la plateforme."}
            </p>
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                {autoSpecialties.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setFilters({ specialty: [] })}
                  >
                    Toutes spécialités
                  </Button>
                )}
                {selectedRegion && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setFilters({ region: null })}
                  >
                    Toutes régions
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    setSearch("");
                    setFilters({ specialty: [], region: null, from: null });
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Supplier cards (design de la carte fournisseur recommandée) ── */}
        {suppliers !== undefined && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const isOwnProfile = user?._id && s.userId && user._id === s.userId;
              return (
                <div key={s._id} className={profileCardClass}>
                  <div className="p-4">
                    {/* ── En-tête : avatar + identité (gauche) · métriques (droite) ── */}
                    <div className="flex gap-3">
                      <div className="flex w-[34%] shrink-0 flex-col items-center gap-1 text-center">
                        <div className="relative">
                          <div
                            className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ${
                              s.logo ? "" : "bg-primary/10 text-primary"
                            }`}
                          >
                            {s.logo ? (
                              <img src={s.logo} alt={s.companyName} className="h-full w-full object-cover" />
                            ) : (
                              <Store className="h-6 w-6" />
                            )}
                          </div>
                          <VerifiedBadge />
                        </div>
                        <h3 className="line-clamp-2 text-sm font-bold leading-tight">{s.companyName}</h3>
                        <TrophyLine>Vérifié</TrophyLine>
                      </div>

                      {/* Métriques empilées, séparées par de fines lignes */}
                      <div className="flex-1 min-w-0 self-start divide-y divide-border/60 overflow-hidden rounded-xl border border-border/30 bg-muted/10">
                        <SupplierCardMetrics supplierId={s._id} specialtyCount={s.specialties.length} />
                      </div>
                    </div>

                    {/* ── Détails ── */}
                    <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
                      {s.description && (
                        <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">{s.description}</p>
                      )}
                      <DetailRow
                        icon={Layers}
                        label={`Spécialités : ${s.specialties.map((sp) => SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp).join(", ")}`}
                      />
                      {s.address && <DetailRow icon={MapPin} label={s.address} />}
                      <DetailRow icon={Phone} label={s.phone} />
                      {s.email && <DetailRow icon={Mail} label={s.email} />}
                    </div>

                    {/* ── Actions ── */}
                    <div className="mt-3 flex gap-1.5">
                      <a
                        href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border/40 bg-background px-2 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted/50"
                      >
                        <Phone className="h-2.5 w-2.5" /> Contacter
                      </a>
                      <button
                        onClick={() => openQuoteDialog(s)}
                        disabled={!!isOwnProfile}
                        title={isOwnProfile ? "Vous ne pouvez pas vous envoyer un devis à vous-même" : undefined}
                        className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors cursor-pointer ${
                          isOwnProfile
                            ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        <FileText className="h-2.5 w-2.5" /> Devis
                      </button>
                      <button
                        onClick={() => {
                          if (!user) {
                            navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
                            return;
                          }
                          setRatingSupplier(s);
                          setMyRating(0);
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-500/10 cursor-pointer"
                      >
                        ⭐ Noter
                      </button>
                    </div>
                    <button
                      onClick={() => navigate(`/dashboard/supplier-profile/${s._id}`)}
                      className="mt-1.5 flex w-full items-center justify-center rounded-xl bg-muted py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 cursor-pointer"
                    >
                      Voir profil
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Demande de devis Dialog */}
      <Dialog open={!!devisSupplier} onOpenChange={(o) => { if (!o) setDevisSupplier(null); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Demande de devis — {devisSupplier?.companyName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Vos coordonnées seront transmises automatiquement au fournisseur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* User contact info (auto-transmitted) */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Vos coordonnées (transmises automatiquement)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2 min-w-0">
                  <p className="text-[9px] text-muted-foreground">Nom</p>
                  <p className="text-xs font-medium truncate">{user?.name || "—"}</p>
                </div>
                <div className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2 min-w-0">
                  <p className="text-[9px] text-muted-foreground">Téléphone</p>
                  <p className="text-xs font-medium truncate">{user?.phone || "—"}</p>
                </div>
                <div className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2 min-w-0">
                  <p className="text-[9px] text-muted-foreground">Email</p>
                  <p className="text-xs font-medium truncate">{user?.email || "—"}</p>
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Message optionnel
              </label>
              <Textarea
                value={devisMessage}
                onChange={(e) => setDevisMessage(e.target.value)}
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
                onClick={() => setDevisSupplier(null)}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                disabled={sendingDevis}
                onClick={handleSendQuote}
              >
                {sendingDevis ? (
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

      {/* Rating Dialog */}
      <Dialog open={!!ratingSupplier} onOpenChange={(o) => { if (!o) setRatingSupplier(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Noter {ratingSupplier?.companyName}</DialogTitle>
            <DialogDescription className="text-[11px]">
              Votre note aide les autres clients à choisir.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <StarRating value={myRating} size="md" interactive onChange={setMyRating} />
            <Button
              className="w-full gap-1.5 text-xs"
              disabled={sendingRating || myRating === 0}
              onClick={async () => {
                if (!ratingSupplier || myRating === 0) return;
                setSendingRating(true);
                try {
                  await rateSupplier({ supplierId: ratingSupplier._id, rating: myRating });
                  toast.success(`Note ${myRating}/5 enregistrée !`);
                  setRatingSupplier(null);
                } catch (err: any) {
                  toast.error(err?.message ?? "Erreur");
                } finally {
                  setSendingRating(false);
                }
              }}
            >
              {sendingRating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ── Métriques de la carte fournisseur (maquette : évaluations · note · spécialités) ──

function SupplierCardMetrics({ supplierId, specialtyCount }: { supplierId: string; specialtyCount: number }) {
  const rating = useQuery(api.ratings.getSupplierAverage, { supplierId: supplierId as any });
  const count = rating?.count ?? 0;
  const avg = rating?.avg ?? null;
  return (
    <>
      <MetricRow value={count} label="évaluations" />
      <MetricRow value={avg !== null ? `${avg.toFixed(2).replace(".", ",")} ★` : "—"} label="note globale" />
      <MetricRow value={specialtyCount} label="spécialités" />
    </>
  );
}