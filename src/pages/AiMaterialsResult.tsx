import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { ArrowLeft, Loader2, Sparkles, ShieldCheck, Info, Store, MapPin, Phone, Mail, Globe, Search, X, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { RecommendResult } from "@/convex/aiMaterialsEngine";
import { AiAnalysisResults } from "@/components/ai/AiAnalysisResults";
import { usePageSEO } from "@/hooks/use-page-seo";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/convex/schema";

/** Durée fixe de l'écran de chargement : 3 secondes. */
const LOADING_DURATION_MS = 3000;

export default function AiMaterialsResult() {
  usePageSEO({
    title: "Résultat de l'analyse IA - batibuild App",
    description: "Résultats de votre analyse de matériaux par IA : recommandation, coût estimatif et fournisseurs.",
  });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Écran de chargement fixe de 3 secondes
  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - start) / LOADING_DURATION_MS) * 100));
    }, 50);
    const timer = setTimeout(() => {
      setLoading(false);
      clearInterval(tick);
    }, LOADING_DURATION_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, []);

  const analysis = useQuery(
    api.aiMaterials.getCopilotAnalysis,
    loading || !id ? "skip" : { analysisId: id as any },
  );

  const result: RecommendResult | null = (analysis?.results?.recommend as RecommendResult) ?? null;

  // ── Fournisseurs ──
  const suppliers = useQuery(api.supplierProfiles.getActiveSuppliers);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);

  const REGION_LABELS: Record<string, string> = {
    tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
    nabeul: "Nabeul", bizerte: "Bizerte", sousse: "Sousse", monastir: "Monastir",
    mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès", medenine: "Médenine",
    tozeur: "Tozeur", kebili: "Kébili", gafsa: "Gafsa", sidi_bouzid: "Sidi Bouzid",
    kasserine: "Kasserine", el_kef: "Le Kef", jendouba: "Jendouba", bizzle: "Béja",
    siliana: "Siliana", zaghouan: "Zaghouan", tataouine: "Tataouine",
  };

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];
    return suppliers.filter((s) => {
      if (supplierSearch) {
        const q = supplierSearch.toLowerCase();
        if (!`${s.companyName} ${s.description ?? ""} ${s.specialties.join(" ")}`.toLowerCase().includes(q)) return false;
      }
      if (selectedSpecialty && !s.specialties.includes(selectedSpecialty)) return false;
      if (selectedRegion && !(s.regions ?? []).includes(selectedRegion)) return false;
      return true;
    });
  }, [suppliers, supplierSearch, selectedSpecialty, selectedRegion]);

  const availableSpecialties = useMemo(() => {
    if (!suppliers) return [];
    const set = new Set<string>();
    for (const s of suppliers) for (const sp of s.specialties) set.add(sp);
    return [...set].sort();
  }, [suppliers]);

  const availableRegions = useMemo(() => {
    if (!suppliers) return [];
    const set = new Set<string>();
    for (const s of suppliers) for (const r of s.regions ?? []) set.add(r);
    return [...set].sort();
  }, [suppliers]);

  const hasActiveFilters = !!(supplierSearch || selectedSpecialty || selectedRegion);

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard/ai-materials")}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border/50 shrink-0" />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">Résultat de l'analyse IA</h1>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">Assistant Matériaux · Prix Tunisie 2026 · Copilot</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-5 space-y-5">
        {/* ── Écran de chargement (3 secondes) ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30">
                <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
              </div>
            </div>
            <h2 className="text-lg font-bold tracking-tight">Analyse des matériaux en cours…</h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              Croisement du catalogue 2026, des offres fournisseurs et de votre projet — cela ne prend que quelques instants.
            </p>
            {/* Barre de progression */}
            <div className="mt-6 w-64 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : !analysis ? (
          /* Analyse introuvable ou non autorisée */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
              <Info className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-base font-bold tracking-tight">Analyse introuvable</h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              Cette analyse n'existe pas ou n'est pas accessible avec votre compte.
            </p>
            <Button size="sm" className="mt-4" onClick={() => navigate("/dashboard/ai-materials")}>
              Retour à l'assistant matériaux
            </Button>
          </div>
        ) : !result ? (
          /* Analyse sans recommandation */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
              <Info className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-base font-bold tracking-tight">Analyse sans recommandation enregistrée</h2>
            <Button size="sm" className="mt-4" onClick={() => navigate("/dashboard/ai-materials")}>
              Relancer une analyse
            </Button>
          </div>
        ) : (
          /* ── Résultats (structure et design conservés) ── */
          <AiAnalysisResults result={result} />
        )}

        {/* ── Fournisseurs partenaires ── */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                <Store className="h-3 w-3" />
              </div>
              <h2 className="text-sm font-semibold">Fournisseurs partenaires</h2>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                {filteredSuppliers.length}
              </Badge>
            </div>

            {/* Filtres compacts */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un fournisseur…"
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="h-8 text-xs pl-7 pr-7 rounded-lg"
                />
                {supplierSearch && (
                  <button onClick={() => setSupplierSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="relative min-w-[140px]">
                <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-background pl-7 pr-6 text-xs appearance-none">
                  <option value="">Toutes spécialités</option>
                  {availableSpecialties.map((sp) => (
                    <option key={sp} value={sp}>{SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative min-w-[140px]">
                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-background pl-7 pr-6 text-xs appearance-none">
                  <option value="">Toutes régions</option>
                  {availableRegions.map((r) => (
                    <option key={r} value={r}>{REGION_LABELS[r] ?? r}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Chips filtres actifs */}
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {supplierSearch && (
                  <Badge variant="secondary" className="text-[8px] h-4 px-1.5 gap-1">
                    « {supplierSearch} »
                    <button onClick={() => setSupplierSearch("")}><X className="h-2 w-2" /></button>
                  </Badge>
                )}
                {selectedSpecialty && (
                  <Badge variant="secondary" className="text-[8px] h-4 px-1.5 gap-1">
                    {SUPPLIER_SPECIALTIES_LABELS[selectedSpecialty] ?? selectedSpecialty}
                    <button onClick={() => setSelectedSpecialty("")}><X className="h-2 w-2" /></button>
                  </Badge>
                )}
                {selectedRegion && (
                  <Badge variant="secondary" className="text-[8px] h-4 px-1.5 gap-1">
                    {REGION_LABELS[selectedRegion] ?? selectedRegion}
                    <button onClick={() => setSelectedRegion("")}><X className="h-2 w-2" /></button>
                  </Badge>
                )}
                <button onClick={() => { setSupplierSearch(""); setSelectedSpecialty(""); setSelectedRegion(""); }}
                  className="text-[8px] text-primary hover:underline">Tout effacer</button>
              </div>
            )}

            {/* Loading */}
            {suppliers === undefined && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-lg border border-border/30 bg-muted/20 animate-pulse" />
                ))}
              </div>
            )}

            {/* Empty */}
            {suppliers !== undefined && filteredSuppliers.length === 0 && (
              <div className="py-8 text-center">
                <Store className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters ? "Aucun fournisseur ne correspond à vos filtres." : "Aucun fournisseur actif pour le moment."}
                </p>
                {hasActiveFilters && (
                  <button onClick={() => { setSupplierSearch(""); setSelectedSpecialty(""); setSelectedRegion(""); }}
                    className="text-[10px] text-primary hover:underline mt-1">Réinitialiser</button>
                )}
              </div>
            )}

            {/* Cartes fournisseurs */}
            {suppliers !== undefined && filteredSuppliers.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredSuppliers.map((s) => {
                  const isExpanded = expandedSupplierId === s._id;
                  return (
                    <Card key={s._id} className="border border-border/30 overflow-hidden rounded-lg hover:border-emerald-500/20 transition-colors">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold leading-tight truncate">{s.companyName}</h3>
                            {s.description && (
                              <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>
                            )}
                          </div>
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 shrink-0">
                            <Store className="h-3 w-3" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-0.5">
                          {s.specialties.slice(0, isExpanded ? 20 : 3).map((sp) => (
                            <Badge key={sp} variant="secondary" className="text-[7px] h-3.5 px-1 leading-none">
                              {SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp}
                            </Badge>
                          ))}
                          {!isExpanded && s.specialties.length > 3 && (
                            <Badge variant="outline" className="text-[7px] h-3.5 px-1 leading-none">
                              +{s.specialties.length - 3}
                            </Badge>
                          )}
                        </div>
                        {s.regions && s.regions.length > 0 && (
                          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">
                              {s.regions.slice(0, isExpanded ? 10 : 2).map((r) => REGION_LABELS[r] ?? r).join(", ")}
                              {!isExpanded && s.regions.length > 2 && ` +${s.regions.length - 2}`}
                            </span>
                          </div>
                        )}
                        {isExpanded && (
                          <div className="space-y-1 pt-1 border-t border-border/20">
                            <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-[9px] hover:text-emerald-600 transition-colors">
                              <Phone className="h-2.5 w-2.5 shrink-0" />{s.phone}
                            </a>
                            <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-[9px] hover:text-emerald-600 transition-colors">
                              <Mail className="h-2.5 w-2.5 shrink-0" />{s.email}
                            </a>
                            {s.address && (
                              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />{s.address}
                              </div>
                            )}
                            {s.website && (
                              <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[9px] hover:text-emerald-600 transition-colors">
                                <Globe className="h-2.5 w-2.5 shrink-0" />{s.website}
                              </a>
                            )}
                          </div>
                        )}
                        <button onClick={() => setExpandedSupplierId(isExpanded ? null : s._id)}
                          className="flex items-center gap-1 text-[8px] text-muted-foreground hover:text-primary transition-colors">
                          {isExpanded ? <><ChevronUp className="h-2.5 w-2.5" />Moins</> : <><ChevronDown className="h-2.5 w-2.5" />Coordonnées</>}
                        </button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Disclaimer ── */}
        <div className="rounded-xl border border-border/30 bg-muted/10 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Les prix ne sont jamais inventés : toutes les valeurs proviennent du catalogue 2026 et des offres fournisseurs (données datées).
          </span>
          <span className="flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Pour les éléments structurels, la validation d'un professionnel qualifié reste requise.
          </span>
        </div>
      </div>
    </main>
  );
}
