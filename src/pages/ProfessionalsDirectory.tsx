import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Users, Search, MapPin, Phone, Mail,
  Globe, ChevronDown, ChevronUp, X, Briefcase, Building2,
  MessageSquare, BriefcaseBusiness,
} from "lucide-react";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/convex/schema";

// ── Constants ────────────────────────────────────────────────────────────────

const REGION_LABELS: Record<string, string> = {
  tunis: "Tunis", ariana: "Ariana", ben_arous: "Ben Arous", manouba: "Manouba",
  nabeul: "Nabeul", bizerte: "Bizerte", sousse: "Sousse", monastir: "Monastir",
  mahdia: "Mahdia", sfax: "Sfax", gabes: "Gabès", medenine: "Médenine",
  tozeur: "Tozeur", kebili: "Kébili", gafsa: "Gafsa", sidi_bouzid: "Sidi Bouzid",
  kasserine: "Kasserine", le_kef: "Le Kef", jendouba: "Jendouba", beja: "Béja",
  siliana: "Siliana", zaghouan: "Zaghouan", tataouine: "Tataouine",
};

const PROFESSION_LABELS: Record<string, string> = {
  architecte: "Architecte",
  bureau_etudes: "Bureau d'études",
  ingenieur: "Ingénieur",
  promoteur_immobilier: "Promoteur immobilier",
};

const PROFESSION_ICONS: Record<string, typeof Building2> = {
  architecte: Building2,
  bureau_etudes: Briefcase,
  ingenieur: Building2,
  promoteur_immobilier: Building2,
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ProfessionalsDirectory() {
  usePageSEO({
    title: "Annuaire des Professionnels - batibuild App",
    description: "Trouvez architectes, ingénieurs et bureaux d'études en Tunisie. Filtrez par spécialité et région.",
  });

  const navigate = useNavigate();
  const experts = useQuery(api.expertProfiles.getActiveExperts);

  const [search, setSearch] = useState("");
  const [selectedProfession, setSelectedProfession] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const availableSpecialties = useMemo(() => {
    if (!experts) return [];
    const set = new Set<string>();
    for (const e of experts) for (const sp of e.specialties) set.add(sp);
    return [...set].sort();
  }, [experts]);

  const availableRegions = useMemo(() => {
    if (!experts) return [];
    const set = new Set<string>();
    for (const e of experts) for (const r of e.regions ?? []) set.add(r);
    return [...set].sort();
  }, [experts]);

  const filtered = useMemo(() => {
    if (!experts) return [];
    return experts.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${e.displayName} ${e.companyName ?? ""} ${e.description ?? ""} ${e.specialties.join(" ")}`.toLowerCase().includes(q)) return false;
      }
      if (selectedProfession && e.profession !== selectedProfession) return false;
      if (selectedRegion && !(e.regions ?? []).includes(selectedRegion)) return false;
      return true;
    });
  }, [experts, search, selectedProfession, selectedRegion]);

  const hasFilters = !!(search || selectedProfession || selectedRegion);

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12 sm:h-14">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted/50 active:scale-95 transition-all shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div className="h-3 w-px bg-border/50 shrink-0" />
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 shrink-0">
              <Users className="h-3 w-3" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-semibold leading-tight">Annuaire des Professionnels</h1>
              <p className="text-[8px] text-muted-foreground leading-tight">
                {experts ? `${filtered.length} professionnel(aux) trouvé(s)` : "Chargement…"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 space-y-4">
        {/* Filters */}
        <Card className="border border-border/40 overflow-hidden rounded-xl">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Rechercher un professionnel…" value={search}
                  onChange={(e) => setSearch(e.target.value)} className="h-9 text-sm pl-8 pr-8 rounded-lg" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="relative min-w-[180px]">
                <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select value={selectedProfession} onChange={(e) => setSelectedProfession(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-8 text-sm appearance-none">
                  <option value="">Toutes spécialités</option>
                  {Object.entries(PROFESSION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                  {availableSpecialties.map((sp) => (
                    <option key={sp} value={sp}>{SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative min-w-[180px]">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-8 text-sm appearance-none">
                  <option value="">Toutes régions</option>
                  {availableRegions.map((r) => (
                    <option key={r} value={r}>{REGION_LABELS[r] ?? r}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {hasFilters && (
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-[9px] text-muted-foreground">Filtres actifs :</span>
                {search && (
                  <Badge variant="secondary" className="text-[9px] gap-1 h-5 px-1.5">
                    « {search} »
                    <button onClick={() => setSearch("")}><X className="h-2.5 w-2.5" /></button>
                  </Badge>
                )}
                {selectedProfession && (
                  <Badge variant="secondary" className="text-[9px] gap-1 h-5 px-1.5">
                    {PROFESSION_LABELS[selectedProfession] ?? SUPPLIER_SPECIALTIES_LABELS[selectedProfession] ?? selectedProfession}
                    <button onClick={() => setSelectedProfession("")}><X className="h-2.5 w-2.5" /></button>
                  </Badge>
                )}
                {selectedRegion && (
                  <Badge variant="secondary" className="text-[9px] gap-1 h-5 px-1.5">
                    {REGION_LABELS[selectedRegion] ?? selectedRegion}
                    <button onClick={() => setSelectedRegion("")}><X className="h-2.5 w-2.5" /></button>
                  </Badge>
                )}
                <button onClick={() => { setSearch(""); setSelectedProfession(""); setSelectedRegion(""); }}
                  className="text-[9px] text-primary hover:underline">Tout effacer</button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading */}
        {experts === undefined && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 rounded-xl border border-border/30 bg-muted/20 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {experts !== undefined && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/30 border border-border/30 mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-base font-bold tracking-tight">Aucun professionnel trouvé</h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
              {hasFilters ? "Essayez de modifier vos filtres." : "Aucun expert ou entreprise n'est encore inscrit."}
            </p>
            {hasFilters && (
              <button onClick={() => { setSearch(""); setSelectedProfession(""); setSelectedRegion(""); }}
                className="text-[10px] text-primary hover:underline mt-2">Réinitialiser les filtres</button>
            )}
          </div>
        )}

        {/* Cards */}
        {experts !== undefined && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((e) => {
              const isExpanded = expandedId === e._id;
              const Icon = PROFESSION_ICONS[e.profession] ?? Users;
              return (
                <Card key={e._id} className="border border-border/40 overflow-hidden rounded-xl hover:border-amber-500/30 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold leading-tight truncate">{e.displayName}</h3>
                        {e.companyName && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{e.companyName}</p>
                        )}
                        {e.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{e.description}</p>
                        )}
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[8px] h-4 px-1.5 leading-none">
                        {PROFESSION_LABELS[e.profession] ?? e.profession}
                      </Badge>
                      {e.specialties.slice(0, isExpanded ? 20 : 3).map((sp) => (
                        <Badge key={sp} variant="secondary" className="text-[8px] h-4 px-1.5 leading-none">
                          {SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp}
                        </Badge>
                      ))}
                      {!isExpanded && e.specialties.length > 3 && (
                        <Badge variant="outline" className="text-[8px] h-4 px-1.5 leading-none">
                          +{e.specialties.length - 3}
                        </Badge>
                      )}
                    </div>

                    {e.regions && e.regions.length > 0 && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {e.regions.slice(0, isExpanded ? 10 : 3).map((r) => REGION_LABELS[r] ?? r).join(", ")}
                          {!isExpanded && e.regions.length > 3 && ` +${e.regions.length - 3}`}
                        </span>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="space-y-1.5 pt-1 border-t border-border/20">
                        <a href={`tel:${e.phone}`} className="flex items-center gap-1.5 text-[10px] hover:text-amber-600 transition-colors">
                          <Phone className="h-3 w-3 shrink-0" />{e.phone}
                        </a>
                        <a href={`mailto:${e.email}`} className="flex items-center gap-1.5 text-[10px] hover:text-amber-600 transition-colors">
                          <Mail className="h-3 w-3 shrink-0" />{e.email}
                        </a>
                        {e.address && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />{e.address}
                          </div>
                        )}
                        {e.website && (
                          <a href={e.website.startsWith("http") ? e.website : `https://${e.website}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[10px] hover:text-amber-600 transition-colors">
                            <Globe className="h-3 w-3 shrink-0" />{e.website}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : e._id)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px] font-medium text-amber-700 hover:bg-amber-500/10 transition-all"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Contacter
                      </button>
                      <button
                        onClick={() => navigate("/auth?returnTo=/dashboard")}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border/40 bg-background px-3 py-2 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                      >
                        <BriefcaseBusiness className="h-3 w-3" />
                        Demande de service
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
