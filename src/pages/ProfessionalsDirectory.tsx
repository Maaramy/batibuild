import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import {
  ArrowLeft, Users, Search, MapPin, Phone, Mail,
  Globe, ChevronDown, X, Briefcase, FileText,
  Loader2, Layers, Building2, CalendarClock, Zap, Banknote,
} from "lucide-react";
import {
  RequestAppointmentDialog,
  RequestUrgentDialog,
} from "@/components/expert/ExpertRequestDialogs";
import {
  AVAILABILITY_FILTERS,
  availabilityMeta,
  indicativePriceLabel,
  matchesAvailabilityFilter,
  type AvailabilityFilter,
} from "@/lib/expertAvailability";
import { AvatarWithInitials } from "@/components/AvatarWithInitials";
import { profileCardClass, VerifiedBadge, TrophyLine, MetricRow, DetailRow } from "@/components/ProfileCardBits";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/lib/supplierSpecialties";
import { PROJECT_TYPE_LABELS } from "@/convex/projectTypes";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { toast } from "sonner";

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
  plombier: "Plombier",
  electricien: "Électricien",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ProfessionalsDirectory() {
  usePageSEO({
    title: "Trouvez un expert près de chez vous - batibuild App",
    description: "Trouvez architectes, ingénieurs et bureaux d'études en Tunisie. Filtrez par spécialité et région.",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const scenarioParam = searchParams.get("scenario") ?? "standard";
  const { user } = useAuth();
  const experts = useQuery(api.expertProfiles.getActiveExperts);
  const project = useQuery(
    api.projects.getProject,
    projectIdParam ? { projectId: projectIdParam as any } : "skip",
  );

  const [search, setSearch] = useState("");
  const [selectedProfession, setSelectedProfession] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  // ProMarket : filtres disponibilité / urgences + dialogues de demande
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [appointmentExpert, setAppointmentExpert] = useState<any>(null);
  const [urgentExpert, setUrgentExpert] = useState<any>(null);

  const openAppointment = (expert: any) => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setAppointmentExpert(expert);
  };
  const openUrgent = (expert: any) => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setUrgentExpert(expert);
  };
  // (les coordonnées des experts sont toujours affichées sur la carte)
  const [devisExpert, setDevisExpert] = useState<any>(null);
  const [ratingExpert, setRatingExpert] = useState<any>(null);
  const [myExpertRating, setMyExpertRating] = useState(0);
  const [sendingRating, setSendingRating] = useState(false);
  const rateExpert = useMutation(api.ratings.rateExpert);
  const [devisForm, setDevisForm] = useState({
    requestType: "devis" as "devis" | "service",
    description: "",
    projectType: "",
    totalTTC: "",
    surface: "",
    region: "",
    userPhone: "",
    userEmail: "",
    userName: "",
  });
  const [sendingDevis, setSendingDevis] = useState(false);
  const createServiceRequest = useMutation(api.expertServiceRequests.create);

  const availableProfessions = useMemo(() => {
    if (!experts) return [];
    const set = new Set<string>();
    for (const e of experts) if (e.profession) set.add(e.profession);
    return [...set].sort();
  }, [experts]);

  const availableRegions = useMemo(() => {
    if (!experts) return [];
    const set = new Set<string>();
    for (const e of experts) for (const r of e.regions ?? []) set.add(r);
    return [...set].sort();
  }, [experts]);

  const projectRegion = project?.region ?? "";

  useEffect(() => {
    if (projectRegion && !selectedRegion) {
      setSelectedRegion(projectRegion);
    }
  }, [projectRegion]);

  const filtered = useMemo(() => {
    if (!experts) return [];
    return experts.filter((e) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${e.displayName} ${e.companyName ?? ""} ${e.description ?? ""} ${e.specialties.join(" ")}`.toLowerCase().includes(q)) return false;
      }
      if (selectedProfession && e.profession !== selectedProfession) return false;
      if (selectedRegion && !(e.regions ?? []).includes(selectedRegion)) return false;
      // Disponibilité / urgences : n'affiche que les profils réellement concernés
      if (!matchesAvailabilityFilter(e, availabilityFilter)) return false;
      return true;
    });
  }, [experts, search, selectedProfession, selectedRegion, availabilityFilter]);

  const hasFilters = !!(
    search || selectedProfession || selectedRegion || availabilityFilter !== "all"
  );

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
              <h1 className="text-xs font-semibold leading-tight">Trouvez un expert près de chez vous</h1>
              <p className="text-[8px] text-muted-foreground leading-tight">
                {experts ? `${filtered.length} professionnel(aux) trouvé(s)` : "Chargement…"}
              </p>
            </div>
          </div>
        </div>

        {/* Parcours du projet — affiché lorsque l'annuaire est ouvert depuis un
            projet (contexte conservé dans l'URL). */}
        <ProjectJourneyNav
          projectId={projectIdParam}
          category={project?.category}
          maxWidthClassName="max-w-7xl"
        />
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
                  <option value="">Toutes professions</option>
                  {availableProfessions.map((p) => (
                    <option key={p} value={p}>{PROFESSION_LABELS[p] ?? p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <div className="relative min-w-[180px]">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-8 text-sm appearance-none">
                  <option value="">Toutes les régions</option>
                  {availableRegions.map((r) => (
                    <option key={r} value={r}>{REGION_LABELS[r] ?? r}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* ProMarket : filtres disponibilité & urgences */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {AVAILABILITY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setAvailabilityFilter(f.value)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all ${
                    availabilityFilter === f.value
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-700"
                      : "border-border/40 bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {f.value === "urgent" && "⚡ "}
                  {f.label}
                </button>
              ))}
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
                {availabilityFilter !== "all" && (
                  <Badge variant="secondary" className="text-[9px] gap-1 h-5 px-1.5">
                    {AVAILABILITY_FILTERS.find((f) => f.value === availabilityFilter)?.label}
                    <button onClick={() => setAvailabilityFilter("all")}><X className="h-2.5 w-2.5" /></button>
                  </Badge>
                )}
                <button onClick={() => { setSearch(""); setSelectedProfession(""); setSelectedRegion(""); setAvailabilityFilter("all"); }}
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
              <button onClick={() => { setSearch(""); setSelectedProfession(""); setSelectedRegion(""); setAvailabilityFilter("all"); }}
                className="text-[10px] text-primary hover:underline mt-2">Réinitialiser les filtres</button>
            )}
          </div>
        )}

        {/* Cards */}
        {experts !== undefined && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((e) => {
              return (
                <Card key={e._id} className={profileCardClass}>
                  <CardContent className="p-4">
                    {/* ── En-tête : avatar + identité (gauche) · métriques (droite) ── */}
                    <div className="flex gap-3">
                      <div className="flex w-[34%] shrink-0 flex-col items-center gap-1 text-center">
                        <div className="relative">
                          <AvatarWithInitials logo={e.logo} name={e.displayName} size="lg" />
                          <VerifiedBadge />
                        </div>
                        <h3 className="line-clamp-2 text-sm font-bold leading-tight">{e.displayName}</h3>
                        <TrophyLine>{PROFESSION_LABELS[e.profession] ?? e.profession}</TrophyLine>
                      </div>

                      {/* Métriques empilées, séparées par de fines lignes */}
                      <div className="flex-1 min-w-0 self-start divide-y divide-border/60 overflow-hidden rounded-xl border border-border/30 bg-muted/10">
                        <ExpertCardMetrics expertId={e._id} specialtyCount={e.specialties.length} />
                      </div>
                    </div>

                    {/* ── ProMarket : prix indicatifs, disponibilité, urgences ── */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/30 pt-2.5">                      {indicativePriceLabel((e as any).indicativePrice) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <Banknote className="h-2.5 w-2.5" />
                          Prix indicatifs : {indicativePriceLabel((e as any).indicativePrice)}
                        </span>
                      )}
                      {(() => {
                        const meta = availabilityMeta((e as any).availability);
                        if (!meta) return null;
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.chip}`}>
                            Disponibilité : <span aria-hidden>{meta.emoji}</span> {meta.short}
                          </span>
                        );
                      })()}
                      {(e as any).acceptsUrgent === true && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Zap className="h-2.5 w-2.5" /> Demandes urgentes acceptées
                        </span>
                      )}
                    </div>

                    {/* ── Détails ── */}
                    <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
                      {e.description && (
                        <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">{e.description}</p>
                      )}
                      {e.companyName && <DetailRow icon={Building2} label={e.companyName} />}
                      <DetailRow
                        icon={Layers}
                        label={`Spécialités : ${e.specialties.map((sp) => SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp).join(", ")}`}
                      />
                      {e.address && <DetailRow icon={MapPin} label={e.address} />}
                      <DetailRow icon={Phone} label={e.phone} />
                      {e.email && <DetailRow icon={Mail} label={e.email} />}
                      {e.website && (
                        <DetailRow
                          icon={Globe}
                          label={e.website.startsWith("http") ? e.website : `https://${e.website}`}
                        />
                      )}
                    </div>

                    {/* ── Actions ProMarket : rendez-vous & urgence ── */}
                    {((e as any).availability === "appointment" ||
                      (e as any).acceptsUrgent === true) && (
                      <div className="mt-2.5 flex gap-1.5">
                        {(e as any).availability === "appointment" && (
                          <button
                            onClick={() => openAppointment(e)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/5 px-2 py-2 text-[10px] font-medium text-blue-700 transition-colors hover:bg-blue-500/10"
                          >
                            <CalendarClock className="h-3 w-3" /> Rendez-vous
                          </button>
                        )}
                        {(e as any).acceptsUrgent === true && (
                          <button
                            onClick={() => openUrgent(e)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 py-2 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-500/10"
                          >
                            <Zap className="h-3 w-3" /> Urgence
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── Actions ── */}
                    <div className="mt-3 flex gap-1.5">
                      <a
                        href={e.phone ? `tel:${e.phone}` : undefined}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border/40 bg-background px-2 py-2 text-[10px] font-medium text-foreground transition-colors hover:bg-muted/50"
                      >
                        <Phone className="h-3 w-3" /> Contacter
                      </a>
                      <button
                        onClick={() => {
                          if (!user) {
                            navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
                            return;
                          }
                          setDevisExpert(e);
                          const ce = project?.costEstimate;
                          const scenarios = ce?.budgetScenarios as Record<string, { totalCost: number }> | undefined;
                          const sel = scenarios?.[scenarioParam] ?? scenarios?.standard;
                          const categoryLabel = project?.category ? (PROJECT_TYPE_LABELS[project.category as keyof typeof PROJECT_TYPE_LABELS] ?? project.category) : "";
                          setDevisForm({
                            requestType: "devis",
                            description: project ? `Projet ${categoryLabel} — ${project.surface ?? ""}m² — ${project.region ? (REGION_LABELS[project.region] ?? project.region) : ""}` : "",
                            projectType: project?.category ?? "",
                            totalTTC: sel ? String(Math.round(sel.totalCost)) : "",
                            surface: project?.surface ? String(project.surface) : "",
                            region: project?.region ?? "",
                            userPhone: user?.phone ?? "",
                            userEmail: user?.email ?? "",
                            userName: user?.name ?? "",
                          });
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-[10px] font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        <FileText className="h-3 w-3" /> Devis
                      </button>
                      <button
                        onClick={() => {
                          if (!user) {
                            navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
                            return;
                          }
                          setRatingExpert(e);
                          setMyExpertRating(0);
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 py-2 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-500/10 cursor-pointer"
                      >
                        ⭐ Noter
                      </button>
                    </div>
                    <button
                      onClick={() => navigate(`/dashboard/expert-profile/${e._id}`)}
                      className="mt-1.5 flex w-full items-center justify-center rounded-xl bg-muted py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 cursor-pointer"
                    >
                      Voir profil
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog Demande de devis */}
      <Dialog open={!!devisExpert} onOpenChange={(o) => { if (!o) setDevisExpert(null); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              Demande de devis
            </DialogTitle>
            <DialogDescription>
              Envoyez votre demande de devis à <b>{devisExpert?.displayName}</b>.
              L'expert vous enverra une offre personnalisée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Votre nom</label>
              <Input
                value={devisForm.userName}
                onChange={(ev) => setDevisForm((f) => ({ ...f, userName: ev.target.value }))}
                placeholder="Nom complet"
                className="h-8 text-xs mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Téléphone</label>
                <Input
                  value={devisForm.userPhone}
                  onChange={(ev) => setDevisForm((f) => ({ ...f, userPhone: ev.target.value }))}
                  placeholder="+216 XX XXX XXX"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Email</label>
                <Input
                  value={devisForm.userEmail}
                  onChange={(ev) => setDevisForm((f) => ({ ...f, userEmail: ev.target.value }))}
                  placeholder="email@example.com"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Description du besoin</label>
              <textarea
                value={devisForm.description}
                onChange={(ev) => setDevisForm((f) => ({ ...f, description: ev.target.value }))}
                placeholder="Décrivez votre projet (type de travaux, surface, budget estimé, délais souhaités...)"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Nature de la demande</label>
              <div className="flex gap-2">
                {(["devis", "service"] as const).map((rt) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setDevisForm((f) => ({ ...f, requestType: rt }))}
                    className={`flex-1 rounded-lg border px-3 py-2 text-[11px] font-medium transition-all ${
                      devisForm.requestType === rt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/40 bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {rt === "devis" ? "Proposition de devis" : "Proposition de service"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Type de projet</label>
              <select
                value={devisForm.projectType}
                onChange={(ev) => setDevisForm((f) => ({ ...f, projectType: ev.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Sélectionner un type...</option>
                {Object.entries(PROJECT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Montant total TTC (TND)</label>
                <Input
                  type="number"
                  value={devisForm.totalTTC}
                  onChange={(ev) => setDevisForm((f) => ({ ...f, totalTTC: ev.target.value }))}
                  placeholder="ex: 150000"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Surface (m²)</label>
                <Input
                  type="number"
                  value={devisForm.surface}
                  onChange={(ev) => setDevisForm((f) => ({ ...f, surface: ev.target.value }))}
                  placeholder="ex: 150"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Région</label>
              <select
                value={devisForm.region}
                onChange={(ev) => setDevisForm((f) => ({ ...f, region: ev.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Sélectionner une région...</option>
                {Object.entries(REGION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <Button
              className="w-full gap-1.5 text-xs"
              disabled={sendingDevis || !devisForm.description.trim()}
              onClick={async () => {
                if (!devisExpert) return;
                setSendingDevis(true);
                try {
                  await createServiceRequest({
                    expertId: devisExpert._id,
                    requestType: devisForm.requestType,
                    serviceType: devisForm.requestType,
                    description: devisForm.description,
                    projectType: devisForm.projectType || undefined,
                    totalTTC: devisForm.totalTTC ? Number(devisForm.totalTTC) : undefined,
                    surface: devisForm.surface ? Number(devisForm.surface) : undefined,
                    region: devisForm.region || undefined,
                    userPhone: devisForm.userPhone,
                    userEmail: devisForm.userEmail,
                    userName: devisForm.userName,
                  });
                  toast.success("Demande de devis envoyée avec succès !", {
                    description: `${devisExpert.displayName} recevra votre demande et vous enverra une offre.`,
                  });
                  setDevisExpert(null);
                } catch (err: any) {
                  toast.error("Erreur lors de l'envoi", { description: err?.message ?? "Veuillez réessayer." });
                } finally {
                  setSendingDevis(false);
                }
              }}
            >
              {sendingDevis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {sendingDevis ? "Envoi en cours..." : "Envoyer la demande"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expert Rating Dialog */}
      <Dialog open={!!ratingExpert} onOpenChange={(o) => { if (!o) setRatingExpert(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Noter {ratingExpert?.displayName}</DialogTitle>
            <DialogDescription className="text-[11px]">
              Votre note aide les autres clients à choisir.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <StarRating value={myExpertRating} size="md" interactive onChange={setMyExpertRating} />
            <Button
              className="w-full gap-1.5 text-xs"
              disabled={sendingRating || myExpertRating === 0}
              onClick={async () => {
                if (!ratingExpert || myExpertRating === 0) return;
                setSendingRating(true);
                try {
                  await rateExpert({ expertId: ratingExpert._id, rating: myExpertRating });
                  toast.success(`Note ${myExpertRating}/5 enregistrée !`);
                  setRatingExpert(null);
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

      {/* ProMarket : demandes de rendez-vous et d'intervention urgente */}
      <RequestAppointmentDialog
        expert={appointmentExpert}
        open={!!appointmentExpert}
        onOpenChange={(o) => { if (!o) setAppointmentExpert(null); }}
        project={project ? { _id: project._id as any, name: project.name, region: project.region } : null}
      />
      <RequestUrgentDialog
        expert={urgentExpert}
        open={!!urgentExpert}
        onOpenChange={(o) => { if (!o) setUrgentExpert(null); }}
        project={project ? { _id: project._id as any, name: project.name, region: project.region } : null}
      />
    </main>
  );
}

// ── Métriques de la carte expert (maquette : évaluations · note · spécialités) ──

function ExpertCardMetrics({ expertId, specialtyCount }: { expertId: string; specialtyCount: number }) {
  const rating = useQuery(api.ratings.getExpertAverage, { expertId: expertId as any });
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
