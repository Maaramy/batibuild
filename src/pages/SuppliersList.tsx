import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Store, Search, Phone, Mail, MapPin,
  CheckCircle2, SlidersHorizontal, X, ChevronDown,
} from "lucide-react";
import { usePageSEO } from "@/hooks/use-page-seo";

// ── Constants ────────────────────────────────────────────────────────────────

const SPECIALTY_LABELS: Record<string, string> = {
  construction_maisons: "Construction de maisons",
  villas: "Villas", immeubles: "Immeubles", piscines: "Piscines",
  jardins: "Jardins", terrassement: "Terrassement", fondations: "Fondations",
  gros_oeuvre: "Gros œuvre", second_oeuvre: "Second œuvre",
  macconnerie: "Maçonnerie", beton: "Béton", ferraillage: "Ferraillage",
  coffrage: "Coffrage", charpente: "Charpente", toiture: "Toiture",
  etancheite: "Étanchéité", isolation: "Isolation", carrelage: "Carrelage",
  marbre: "Marbre", peinture: "Peinture", electricite: "Électricité",
  plomberie: "Plomberie", climatisation: "Climatisation", cuisine: "Cuisine",
  salle_de_bain: "Salle de bain", aluminium: "Aluminium",
  menuserie_bois: "Menuiserie bois", pvc: "PVC", portes: "Portes",
  fenetres: "Fenêtres", energie_solaire: "Énergie solaire",
  domotique: "Domotique", voirie: "Voirie", demolition: "Démolition",
  transport_materiaux: "Transport de matériaux",
  location_engins: "Location d'engins", architecte: "Architecte",
  bureau_etudes: "Bureau d'études", ingenieur: "Ingénieur",
  geometre: "Géomètre", promoteur_immobilier: "Promoteur immobilier",
};

const MATERIAL_CATEGORIES = [
  "Ciment & Béton", "Carrelage & Faïence", "Peinture",
  "Plomberie", "Électricité", "Menuiserie & Alu",
  "Toiture & Étanchéité", "Isolation", "Sanitaire",
  "Portes & Fenêtres", "Quincaillerie", "Ferraillage",
];

const TUNISIA_REGIONS = [
  { value: "tunis", label: "Tunis" }, { value: "ariana", label: "Ariana" },
  { value: "ben_arous", label: "Ben Arous" }, { value: "manouba", label: "Manouba" },
  { value: "nabeul", label: "Nabeul" }, { value: "zaghouan", label: "Zaghouan" },
  { value: "bizerte", label: "Bizerte" }, { value: "beja", label: "Béja" },
  { value: "jendouba", label: "Jendouba" }, { value: "le_kef", label: "Le Kef" },
  { value: "siliana", label: "Siliana" }, { value: "kairouan", label: "Kairouan" },
  { value: "kasserine", label: "Kasserine" }, { value: "sidi_bouzid", label: "Sidi Bouzid" },
  { value: "sousse", label: "Sousse" }, { value: "monastir", label: "Monastir" },
  { value: "mahdia", label: "Mahdia" }, { value: "sfax", label: "Sfax" },
  { value: "gabes", label: "Gabès" }, { value: "medenine", label: "Médenine" },
  { value: "tataouine", label: "Tataouine" }, { value: "gafsa", label: "Gafsa" },
  { value: "tozeur", label: "Tozeur" }, { value: "kebili", label: "Kébili" },
];

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ── Component ────────────────────────────────────────────────────────────────

export default function SuppliersList() {
  usePageSEO({ title: "Fournisseurs | batibuild App", description: "Trouvez les meilleurs fournisseurs de matériaux de construction en Tunisie." });
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all visible active suppliers
  const suppliers = useQuery(api.supplierProfiles.getAllActive) || [];

  // Also query a broader set if available, otherwise use what we have
  const filtered = useMemo(() => {
    return suppliers.filter((s: any) => {
      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.companyName?.toLowerCase().includes(q);
        const matchesAddress = s.address?.toLowerCase().includes(q);
        const matchesDesc = s.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesAddress && !matchesDesc) return false;
      }
      // Specialty filter
      if (selectedSpecialties.length > 0) {
        const hasMatch = s.specialties?.some((sp: string) => selectedSpecialties.includes(sp));
        if (!hasMatch) return false;
      }
      // Region filter
      if (selectedRegions.length > 0) {
        const hasMatch = s.regions?.some((r: string) => selectedRegions.includes(r));
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [suppliers, searchQuery, selectedSpecialties, selectedRegions]);

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };
  const toggleRegion = (r: string) => {
    setSelectedRegions((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  const hasFilters = selectedSpecialties.length > 0 || selectedRegions.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 hover:bg-muted/50 active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Fournisseurs</h1>
            <p className="text-[11px] text-muted-foreground">{filtered.length} fournisseur{filtered.length > 1 ? "s" : ""} inscrit{filtered.length > 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, adresse, spécialité..."
            className="pl-9 pr-4 h-10 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtres
            {hasFilters && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                {selectedSpecialties.length + selectedRegions.length}
              </span>
            )}
          </Button>
          {hasFilters && (
            <button
              onClick={() => { setSelectedSpecialties([]); setSelectedRegions([]); }}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Tout effacer
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Specialties */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Spécialité</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(SPECIALTY_LABELS).slice(0, 20).map(([key, label]) => {
                  const active = selectedSpecialties.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleSpecialty(key)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all",
                        active
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-background border-border/30 text-muted-foreground hover:border-border/60",
                      )}
                    >
                      {active && <CheckCircle2 className="h-2.5 w-2.5 inline mr-1" />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Material Categories */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Catégorie de matériel</p>
              <div className="flex flex-wrap gap-1.5">
                {MATERIAL_CATEGORIES.map((cat) => {
                  // Map material category to specialties for filtering
                  const active = selectedSpecialties.some((sp) => {
                    const spLabel = (SPECIALTY_LABELS[sp] || sp).toLowerCase();
                    return spLabel.includes(cat.toLowerCase().split(" ")[0]);
                  });
                  return (
                    <span
                      key={cat}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-medium border cursor-default",
                        active ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border/30 text-muted-foreground",
                      )}
                    >
                      {cat}
                    </span>
                  );
                })}
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Filtrez via les spécialités ci-dessus pour affiner par catégorie.</p>
            </div>

            {/* Regions */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Région</p>
              <div className="flex flex-wrap gap-1.5">
                {TUNISIA_REGIONS.map((r) => {
                  const active = selectedRegions.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      onClick={() => toggleRegion(r.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all",
                        active
                          ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                          : "bg-background border-border/30 text-muted-foreground hover:border-border/60",
                      )}
                    >
                      <MapPin className="h-2.5 w-2.5 inline mr-0.5" />
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Active filter badges */}
        {hasFilters && !showFilters && (
          <div className="flex flex-wrap gap-1.5">
            {selectedSpecialties.map((sp) => (
              <Badge key={sp} variant="secondary" className="text-[9px] gap-1 cursor-pointer" onClick={() => toggleSpecialty(sp)}>
                {SPECIALTY_LABELS[sp] || sp} <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
            {selectedRegions.map((r) => (
              <Badge key={r} variant="secondary" className="text-[9px] gap-1 cursor-pointer" onClick={() => toggleRegion(r)}>
                {TUNISIA_REGIONS.find((x) => x.value === r)?.label || r} <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
        )}

        {/* Suppliers grid */}
        {suppliers === undefined ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">Aucun fournisseur trouvé</p>
            <p className="text-xs text-muted-foreground">
              {hasFilters ? "Essayez de modifier vos filtres" : "Aucun fournisseur n'est encore inscrit"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s: any, idx: number) => (
              <motion.div
                key={s._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-border/40 hover:border-primary/20 hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10">
                        {s.logo ? (
                          <img src={s.logo} alt={s.companyName} className="h-full w-full object-cover rounded-xl" />
                        ) : (
                          <span className="text-sm font-bold text-primary/80">
                            {(s.companyName || "?").split(/\s+/).filter(Boolean).map((w: string) => w.charAt(0).toUpperCase()).slice(0, 2).join("")}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{s.companyName}</p>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="h-2 w-2" /> Vérifié
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" /> {s.phone}
                          </span>
                          {s.email && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" /> {s.email}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" /> {s.address}
                          </span>
                        </div>
                        {/* Specialties & regions */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(s.specialties || []).slice(0, 4).map((sp: string) => (
                            <Badge key={sp} variant="secondary" className="text-[8px] px-1.5 py-0">
                              {SPECIALTY_LABELS[sp] || sp}
                            </Badge>
                          ))}
                          {(s.regions || []).slice(0, 3).map((r: string) => (
                            <Badge key={r} variant="outline" className="text-[8px] px-1.5 py-0">
                              <MapPin className="h-2 w-2 inline mr-0.5" />
                              {TUNISIA_REGIONS.find((x) => x.value === r)?.label || r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <a
                        href={`tel:${s.phone?.replace(/[^\\d+]/g, "")}`}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/10 hover:border-primary/30 active:scale-[0.98] transition-all"
                      >
                        <Phone className="h-3 w-3" /> Appeler
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
