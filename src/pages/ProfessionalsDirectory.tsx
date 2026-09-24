import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import {
  ArrowLeft, Users, MapPin, Phone, Briefcase, FileText, Star,
  Loader2, Layers, Building2, CalendarClock, Zap, Banknote, Store,
} from "lucide-react";
import {
  DirectorySearchBar,
  type DirectoryCriterionGroup,
  type DirectorySearchChip,
} from "@/components/directory/DirectorySearch";
import {
  RequestAppointmentDialog,
  RequestUrgentDialog,
} from "@/components/expert/ExpertRequestDialogs";
import {
  AVAILABILITY_FILTERS,
  availabilityMeta,
  approvedExpertIdSet,
  indicativePriceLabel,
  isContactHidden,
  matchesAvailabilityFilter,
  showsAvailabilityBadge,
  type AvailabilityFilter,
} from "@/lib/expertAvailability";
import { AvatarWithInitials } from "@/components/AvatarWithInitials";
import { profileCardClass, VerifiedBadge } from "@/components/ProfileCardBits";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/lib/supplierSpecialties";
import { directorySwitchHref } from "@/lib/directorySearchParams";
import { PROJECT_TYPE_LABELS } from "@/convex/projectTypes";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
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
    title: "Trouvez un expert près de chez vous - batibuild",
    description: "Trouvez architectes, ingénieurs et bureaux d'études en Tunisie. Filtrez par spécialité et région.",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const scenarioParam = searchParams.get("scenario") ?? "standard";
  const { user } = useAuth();
  const { flags: journeyFlags } = useFeatureFlags();
  const experts = useQuery(api.expertProfiles.getActiveExperts);
  const project = useQuery(
    api.projects.getProject,
    projectIdParam ? { projectId: projectIdParam as any } : "skip",
  );

  // Critères initialisés depuis l'URL : ils sont conservés lors d'une bascule
  // « Type : Experts / Fournisseurs » (le contexte du projet — donc la barre
  // Projet Journey — est transmis dans les deux sens).
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [selectedProfession, setSelectedProfession] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(() => searchParams.get("region") ?? "");
  // ProMarket : filtres disponibilité / urgences + dialogues de demande
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>(() => {
    const fromUrl = searchParams.get("availability");
    return AVAILABILITY_FILTERS.some((f) => f.value === fromUrl)
      ? (fromUrl as AvailabilityFilter)
      : "all";
  });
  const [appointmentExpert, setAppointmentExpert] = useState<any>(null);
  const [urgentExpert, setUrgentExpert] = useState<any>(null);

  const openAppointment = (expert: any) => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setAppointmentExpert(expert);
  };
  const openUrgent = (expert: any) => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setUrgentExpert(expert);
  };
  // Le bouton « Contacter » reste affiché sauf si un rendez-vous est confirmé.
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
  // Suivi statistique : ouverture d'une fiche depuis l'annuaire (clic).
  const recordExpertEvent = useMutation(api.expertStats.recordExpertEvent);

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

  // Rendez-vous confirmés de l'utilisateur : le bouton « Contacter » des
  // experts concernés est masqué sur leur carte.
  const myAppointments = useQuery(api.expertAvailability.getMyAppointments);
  const approvedExpertIds = useMemo(
    () => approvedExpertIdSet(myAppointments),
    [myAppointments],
  );

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

  /** Réinitialise tous les critères de recherche. */
  const resetFilters = () => {
    setSearch("");
    setSelectedProfession("");
    setSelectedRegion("");
    setAvailabilityFilter("all");
  };

  /**
   * Bascule « Type » de l'annuaire : les experts et les fournisseurs restent
   * deux listes distinctes (données et logique inchangées), le critère Type
   * navigue donc vers l'annuaire correspondant en conservant le contexte.
   */
  const goToSuppliers = () => {
    // Le projet (`project`) est TOUJOURS transmis : la barre Projet Journey
    // reste affichée après la bascule, avec la recherche et la région.
    navigate(
      directorySwitchHref("suppliers", {
        project: projectIdParam ?? "",
        q: search,
        region: selectedRegion,
      }),
    );
  };

  /** Critères proposés dans le panneau de recherche. */
  const searchGroups: DirectoryCriterionGroup[] = [
    {
      id: "type",
      label: "Type",
      options: [
        { value: "expert", label: "Experts", icon: Briefcase },
        { value: "fournisseur", label: "Fournisseurs", icon: Store },
      ],
      selected: ["expert"],
      onSelect: (v) => {
        if (v === "fournisseur") goToSuppliers();
      },
    },
    {
      id: "profession",
      label: "Métier / activité",
      options: availableProfessions.map((p) => ({
        value: p,
        label: PROFESSION_LABELS[p] ?? p,
      })),
      selected: selectedProfession ? [selectedProfession] : [],
      onSelect: (v) => setSelectedProfession(selectedProfession === v ? "" : v),
    },
    {
      id: "region",
      label: "Région / gouvernorat",
      options: availableRegions.map((r) => ({ value: r, label: REGION_LABELS[r] ?? r })),
      selected: selectedRegion ? [selectedRegion] : [],
      onSelect: (v) => setSelectedRegion(selectedRegion === v ? "" : v),
    },
    {
      id: "availability",
      label: "Disponibilité & urgences",
      options: AVAILABILITY_FILTERS.map((f) => ({ value: f.value, label: f.label })),
      selected: availabilityFilter !== "all" ? [availabilityFilter] : [],
      onSelect: (v) => setAvailabilityFilter(v as AvailabilityFilter),
    },
  ];

  /** Critères retenus, affichés dans la barre de recherche. */
  const searchChips: DirectorySearchChip[] = [
    ...(search ? [{ key: "q", label: `« ${search} »`, onRemove: () => setSearch("") }] : []),
    ...(selectedProfession
      ? [
          {
            key: "profession",
            label: PROFESSION_LABELS[selectedProfession] ?? selectedProfession,
            onRemove: () => setSelectedProfession(""),
          },
        ]
      : []),
    ...(selectedRegion
      ? [
          {
            key: "region",
            label: REGION_LABELS[selectedRegion] ?? selectedRegion,
            onRemove: () => setSelectedRegion(""),
          },
        ]
      : []),
    ...(availabilityFilter !== "all"
      ? [
          {
            key: "availability",
            label:
              AVAILABILITY_FILTERS.find((f) => f.value === availabilityFilter)?.label ?? "",
            onRemove: () => setAvailabilityFilter("all"),
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* Header — barre unique sticky : titre + Projet Journey. Elle reste
          toujours au-dessus de la recherche et de ses options (z-40). */}
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/90 backdrop-blur-md">
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
          flags={journeyFlags}
          maxWidthClassName="max-w-7xl"
          // Fond opaque : la barre du parcours ne laisse jamais apparaître la
          // recherche ou ses options en dessous pendant le défilement.
          className="bg-background"
        />
      </header>

      {/* Contenu : espace réservé sous la barre sticky (scroll-mt) pour que la
          recherche et son panneau ne passent jamais sous Projet Journey. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 space-y-4 scroll-mt-28">
        {/* Recherche unique : une seule barre + panneau de critères (toujours
            SOUS la barre sticky : la hiérarchie Projet Journey → recherche →
            options → résultats est garantie par le flux normal du document). */}
        <DirectorySearchBar
          query={search}
          onQueryChange={setSearch}
          placeholder="Rechercher un expert ou fournisseur…"
          groups={searchGroups}
          chips={searchChips}
          onReset={resetFilters}
          resultCount={filtered.length}
          loading={experts === undefined}
        />

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
              <button onClick={resetFilters}
                className="text-[10px] text-primary hover:underline mt-2">Réinitialiser les filtres</button>
            )}
          </div>
        )}

        {/* Cards */}
        {experts !== undefined && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((e) => {
              // ProMarket : champs optionnels lus une seule fois par carte
              const availability = (e as any).availability as string | undefined;
              const acceptsUrgent = (e as any).acceptsUrgent === true;
              // « Sur rendez-vous » est retiré de la carte
              const availabilityBadge = showsAvailabilityBadge(availability)
                ? availabilityMeta(availability)
                : undefined;
              return (
                <article key={e._id} className={`${profileCardClass} flex flex-col`}>
                  <div className="flex-1 p-3.5">
                    {/* ── Identité : logo, nom, métier, région, métriques ── */}
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <AvatarWithInitials logo={e.logo} name={e.displayName} size="lg" />
                        <VerifiedBadge />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <h3 className="line-clamp-2 min-w-0 flex-1 text-[13px] font-bold leading-snug">
                            {e.displayName}
                          </h3>
                          {acceptsUrgent && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                              <Zap className="h-2.5 w-2.5" /> Urgence
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {PROFESSION_LABELS[e.profession] ?? e.profession}
                          </span>
                        </p>
                        {e.companyName && (
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{e.companyName}</span>
                          </p>
                        )}
                        {(e.regions ?? []).length > 0 && (
                          <p className="mt-1 flex items-start gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="mt-px h-3 w-3 shrink-0" />
                            <span className="line-clamp-1">
                              {(e.regions ?? []).map((r) => REGION_LABELS[r] ?? r).join(", ")}
                            </span>
                          </p>
                        )}
                        <ExpertCardMetrics expertId={e._id} specialtyCount={e.specialties.length} />
                      </div>
                    </div>

                    {/* ── Activité & description (2 lignes maximum) ── */}
                    <div className="mt-2.5 space-y-1 border-t border-border/30 pt-2.5">
                      <p className="flex items-start gap-1 text-[10px] text-muted-foreground">
                        <Layers className="mt-px h-3 w-3 shrink-0" />
                        <span className="line-clamp-1">
                          {e.specialties.map((sp) => SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp).join(", ")}
                        </span>
                      </p>
                      {e.description && (
                        <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          {e.description}
                        </p>
                      )}
                    </div>

                    {/* ── Disponibilité & prix indicatifs ── */}
                    {(availabilityBadge || indicativePriceLabel((e as any).indicativePrice)) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {indicativePriceLabel((e as any).indicativePrice) && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <Banknote className="h-2.5 w-2.5" />
                            {indicativePriceLabel((e as any).indicativePrice)}
                          </span>
                        )}
                        {availabilityBadge && (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${availabilityBadge.chip}`}>
                            <span aria-hidden>{availabilityBadge.emoji}</span> {availabilityBadge.short}
                          </span>
                        )}
                      </div>
                    )}

                  </div>

                  {/* ── Actions ── */}
                  <div className="mt-auto space-y-1.5 border-t border-border/30 bg-muted/[0.12] p-2.5">
                    {(availability === "appointment" || acceptsUrgent) && (
                      <div className="flex gap-1.5">
                        {availability === "appointment" && (
                          <button
                            onClick={() => openAppointment(e)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/5 px-2 py-2 text-[10px] font-medium text-blue-700 transition-colors hover:bg-blue-500/10"
                          >
                            <CalendarClock className="h-3 w-3" /> Rendez-vous
                          </button>
                        )}
                        {acceptsUrgent && (
                          <button
                            onClick={() => openUrgent(e)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2 py-2 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-500/10"
                          >
                            <Zap className="h-3 w-3" /> Urgence
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      {/* Masqué dès que le rendez-vous avec cet expert est confirmé */}
                      {!isContactHidden(e._id, approvedExpertIds) && (
                        <a
                          href={e.phone ? `tel:${e.phone}` : undefined}
                          onClick={() => {
                            recordExpertEvent({
                              expertId: e._id,
                              eventType: "contact",
                              source: "search",
                            }).catch(() => {});
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border/40 bg-background px-2 py-2 text-[10px] font-medium text-foreground transition-colors hover:bg-muted/50"
                        >
                          <Phone className="h-3 w-3" /> Contacter
                        </a>
                      )}
                      <button
                        onClick={() => {
                          if (!user) {
                            navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
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
                            navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
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
                      onClick={() => {
                        recordExpertEvent({
                          expertId: e._id,
                          eventType: "click",
                          source: "search",
                        }).catch(() => {});
                        navigate(`/dashboard/expert-profile/${e._id}`);
                      }}
                      className="flex w-full items-center justify-center gap-1 rounded-xl border border-primary/25 bg-primary/[0.08] py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/[0.14] cursor-pointer"
                    >
                      Voir le profil
                    </button>
                  </div>
                </article>
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
        project={
          project
            ? {
                _id: project._id as any,
                name: project.name,
                region: project.region,
                // Contexte projet transmis automatiquement à la demande :
                category: project.category,
                surface: project.surface,
              }
            : null
        }
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
  // Métriques compactes sur une seule ligne : la carte reste courte.
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
      <span>
        <b className="font-semibold text-foreground">{count}</b> évaluation{count > 1 ? "s" : ""}
      </span>
      <span aria-hidden className="text-muted-foreground/40">·</span>
      <span className="inline-flex items-center gap-0.5 font-medium text-amber-600">
        <Star className="h-2.5 w-2.5" />
        {avg !== null ? avg.toFixed(2).replace(".", ",") : "—"}
      </span>
      <span aria-hidden className="text-muted-foreground/40">·</span>
      <span>
        {specialtyCount} spécialité{specialtyCount > 1 ? "s" : ""}
      </span>
    </div>
  );
}
