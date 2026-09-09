import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useAuth } from "@/hooks/use-auth";
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
  ChevronDown, X, Filter, CheckCircle2, FileText, Loader2, Send,
} from "lucide-react";
import { toast } from "sonner";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/convex/schema";

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
    title: "Liste des fournisseurs - batibuild App",
    description:
      "Trouvez les meilleurs fournisseurs de matériaux de construction en Tunisie. Filtrez par spécialité, catégorie et région.",
  });

  const navigate = useNavigate();
  const suppliers = useQuery(api.supplierProfiles.getActiveSuppliers);

  // Filtres pilotés par l'URL : l'annuaire peut être ouvert pré-filtré depuis
  // une analyse de matériaux (?from=materials&specialty=…&region=…).
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
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
                Liste des fournisseurs
              </h1>
              <p className="text-[8px] text-muted-foreground leading-tight">
                {suppliers ? `${filtered.length} fournisseur(s) trouvé(s)` : "Chargement…"}
              </p>
            </div>
          </div>
        </div>
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
                <div
                  key={s._id}
                  className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] to-background p-3.5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={s.logo
                      ? "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden"}>
                      {s.logo ? (
                        <img src={s.logo} alt={s.companyName} className="h-full w-full object-cover" />
                      ) : (
                        <Store className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">{s.companyName}</p>
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-full shrink-0">
                          <CheckCircle2 className="h-2 w-2" /> Vérifié
                        </span>
                      </div>
                      <SupplierRatingInline supplierId={s._id} />
                      {s.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" /> {s.phone}
                    </span>
                    {s.email && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" /> {s.email}
                      </span>
                    )}
                    {s.address && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 min-w-0">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{s.address}</span>
                      </span>
                    )}
                  </div>

                  {/* Spécialités */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.specialties.slice(0, 3).map((sp) => (
                      <Badge key={sp} variant="secondary" className="text-[9px]">
                        {SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp}
                      </Badge>
                    ))}
                    {s.specialties.length > 3 && (
                      <Badge variant="outline" className="text-[9px]">
                        +{s.specialties.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Régions */}
                  {s.regions && s.regions.length > 0 && (
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {s.regions.slice(0, 3).map((r) => REGION_LABELS[r] ?? r).join(", ")}
                        {s.regions.length > 3 && ` +${s.regions.length - 3}`}
                      </span>
                    </div>
                  )}

                  {/* Actions principales */}
                  <div className="flex gap-1.5 mt-3">
                    <a
                      href={`tel:${s.phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98] transition-all"
                    >
                      <Phone className="h-2.5 w-2.5" /> Contacter
                    </a>
                    <button
                      onClick={() => openQuoteDialog(s)}
                      disabled={!!isOwnProfile}
                      title={isOwnProfile ? "Vous ne pouvez pas vous envoyer un devis à vous-même" : undefined}
                      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[10px] font-medium active:scale-[0.98] transition-all cursor-pointer ${
                        isOwnProfile
                          ? "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                      }`}
                    >
                      <FileText className="h-2.5 w-2.5" /> Demander un devis
                    </button>
                  </div>

                  {/* Actions secondaires */}
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      onClick={() => {
                        if (!user) {
                          navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
                          return;
                        }
                        setRatingSupplier(s);
                        setMyRating(0);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[10px] font-medium text-amber-700 hover:bg-amber-500/10 transition-all cursor-pointer"
                    >
                      ⭐ Noter
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/supplier-profile/${s._id}`)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border/40 bg-background px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all cursor-pointer"
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

// ── Inline Rating Display ─────────────────────────────────────────────────

function SupplierRatingInline({ supplierId }: { supplierId: string }) {
  const rating = useQuery(api.ratings.getSupplierAverage, { supplierId: supplierId as any });
  if (!rating || rating.count === 0) return null;
  return <StarRating value={rating.avg} count={rating.count} size="xs" className="mt-0.5" />;
}