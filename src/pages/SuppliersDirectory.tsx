import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Store, Search, MapPin, Phone, Mail,
  Globe, ChevronDown, ChevronUp, X, Filter,
  MessageSquare, FileText, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    title: "Annuaire des Fournisseurs - batibuild App",
    description:
      "Trouvez les meilleurs fournisseurs de matériaux de construction en Tunisie. Filtrez par spécialité, catégorie et région.",
  });

  const navigate = useNavigate();
  const suppliers = useQuery(api.supplierProfiles.getActiveSuppliers);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      // Specialty filter
      if (selectedSpecialty && !s.specialties.includes(selectedSpecialty)) return false;
      // Region filter
      if (selectedRegion && !(s.regions ?? []).includes(selectedRegion)) return false;
      return true;
    });
  }, [suppliers, search, selectedSpecialty, selectedRegion]);

  const activeFilterCount =
    (selectedSpecialty ? 1 : 0) + (selectedRegion ? 1 : 0) + (search ? 1 : 0);

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
                Annuaire des Fournisseurs
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
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
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
                  onChange={(e) => setSelectedRegion(e.target.value)}
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
                {selectedSpecialty && (
                  <Badge variant="secondary" className="text-[9px] gap-1 h-5 px-1.5">
                    {SUPPLIER_SPECIALTIES_LABELS[selectedSpecialty] ?? selectedSpecialty}
                    <button onClick={() => setSelectedSpecialty("")}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
                {selectedRegion && (
                  <Badge variant="secondary" className="text-[9px] gap-1 h-5 px-1.5">
                    {REGION_LABELS[selectedRegion] ?? selectedRegion}
                    <button onClick={() => setSelectedRegion("")}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedSpecialty("");
                    setSelectedRegion("");
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
              {activeFilterCount > 0
                ? "Essayez de modifier vos filtres ou d'élargir votre recherche."
                : "Aucun fournisseur actif n'est encore inscrit sur la plateforme."}
            </p>
            {activeFilterCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 text-xs"
                onClick={() => {
                  setSearch("");
                  setSelectedSpecialty("");
                  setSelectedRegion("");
                }}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        )}

        {/* ── Supplier cards ── */}
        {suppliers !== undefined && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const isExpanded = expandedId === s._id;
              return (
                <Card
                  key={s._id}
                  className="border border-border/40 overflow-hidden rounded-xl hover:border-emerald-500/30 transition-colors"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold leading-tight truncate">
                          {s.companyName}
                        </h3>
                        {s.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                            {s.description}
                          </p>
                        )}
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                        <Store className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-1">
                      {s.specialties.slice(0, isExpanded ? 20 : 4).map((sp) => (
                        <Badge
                          key={sp}
                          variant="secondary"
                          className="text-[8px] h-4 px-1.5 leading-none"
                        >
                          {SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp}
                        </Badge>
                      ))}
                      {!isExpanded && s.specialties.length > 4 && (
                        <Badge
                          variant="outline"
                          className="text-[8px] h-4 px-1.5 leading-none"
                        >
                          +{s.specialties.length - 4}
                        </Badge>
                      )}
                    </div>

                    {/* Regions */}
                    {s.regions && s.regions.length > 0 && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {s.regions
                            .slice(0, isExpanded ? 10 : 3)
                            .map((r) => REGION_LABELS[r] ?? r)
                            .join(", ")}
                          {!isExpanded && s.regions.length > 3 && ` +${s.regions.length - 3}`}
                        </span>
                      </div>
                    )}

                    {/* Contact (expandable) */}
                    {isExpanded && (
                      <div className="space-y-1.5 pt-1 border-t border-border/20">
                        <a
                          href={`tel:${s.phone}`}
                          className="flex items-center gap-1.5 text-[10px] text-foreground hover:text-emerald-600 transition-colors"
                        >
                          <Phone className="h-3 w-3 shrink-0" />
                          {s.phone}
                        </a>
                        <a
                          href={`mailto:${s.email}`}
                          className="flex items-center gap-1.5 text-[10px] text-foreground hover:text-emerald-600 transition-colors"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          {s.email}
                        </a>
                        {s.address && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {s.address}
                          </div>
                        )}
                        {s.website && (
                          <a
                            href={s.website.startsWith("http") ? s.website : `https://${s.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[10px] text-foreground hover:text-emerald-600 transition-colors"
                          >
                            <Globe className="h-3 w-3 shrink-0" />
                            {s.website}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : s._id)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[10px] font-medium text-emerald-700 hover:bg-emerald-500/10 transition-all"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Contacter
                      </button>
                      <button
                        onClick={() => navigate("/auth?returnTo=/dashboard")}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-background px-3 py-2 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                      >
                        <FileText className="h-3 w-3" />
                        Demande de devis
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
