import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { QuoteRequestFields } from "@/components/quotes/QuoteRequestFields";
import { uploadQuoteAttachment } from "@/lib/quoteAttachments";
import { QUOTE_MOTIF_OTHER } from "@/lib/quoteMotifs";
import { StarRating } from "@/components/StarRating";
import {
  Store, MapPin, Phone, Mail, Briefcase, Star,
  FileText, Loader2, Send, Layers, CheckCircle2, AlertTriangle, Info, ArrowRight,
  Banknote,
} from "lucide-react";
import {
  DirectorySearchBar,
  type DirectoryCriterionGroup,
  type DirectorySearchChip,
} from "@/components/directory/DirectorySearch";
import { toast } from "sonner";
import { SUPPLIER_SPECIALTIES_LABELS } from "@/lib/supplierSpecialties";
import { profileCardClass, VerifiedBadge } from "@/components/ProfileCardBits";
import { directorySwitchHref } from "@/lib/directorySearchParams";
import { useProjectMaterialUsage } from "@/hooks/use-project-material-usage";
import { matchSuppliersToMaterials } from "@/lib/supplierMatch";

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
    title: "Trouvez un fournisseur près de chez vous - batibuild",
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
  // « Mise en relation » depuis l'étape « Matériaux utilisés » : les articles,
  // quantités, unités, région et scénario sont reconstruits depuis le projet
  // (même calcul que le tableau) — aucun contexte n'est saisi à la main.
  const fromMaterials = searchParams.get("from") === "materials";
  const materialContext = useProjectMaterialUsage(
    fromMaterials ? projectIdParam : null,
    searchParams.get("scenario"),
  );
  const materialMatches = useMemo(
    () =>
      fromMaterials
        ? matchSuppliersToMaterials(
            materialContext.materials,
            suppliers ?? [],
            materialContext.project?.region ?? null,
          )
        : [],
    [fromMaterials, materialContext.materials, materialContext.project?.region, suppliers],
  );
  const materialMatchById = useMemo(
    () => new Map(materialMatches.map((m) => [m.supplier._id, m])),
    [materialMatches],
  );
  const materialTotal = materialContext.materials.length;
  // Prix indicatifs réellement disponibles dans la base marché (aucune offre
  // n'est inventée : la requête ne renvoie que les articles qui en possèdent).
  const materialNames = useMemo(
    () => materialContext.materials.map((m) => m.name),
    [materialContext.materials],
  );
  const marketOffers = useQuery(
    api.marketData.getCheapestSuppliers,
    fromMaterials && materialNames.length > 0 ? { names: materialNames } : "skip",
  );
  // Comparaison par prix croissant, uniquement sur les offres réellement
  // renseignées (aucune ligne sans donnée).
  const marketOfferRows = useMemo(
    () => [...(marketOffers ?? [])].sort((a: any, b: any) => a.minPrice - b.minPrice),
    [marketOffers],
  );
  const [widenRegion, setWidenRegion] = useState(false);

  // Texte recherché : état local, initialisé depuis l'URL (il est transmis
  // explicitement lors d'une bascule « Type », avec le contexte du projet).
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [ratingSupplier, setRatingSupplier] = useState<any>(null);
  const [myRating, setMyRating] = useState(0);
  const [sendingRating, setSendingRating] = useState(false);
  const [devisSupplier, setDevisSupplier] = useState<any>(null);
  const [motif, setMotif] = useState("");
  const [motifOther, setMotifOther] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sendingDevis, setSendingDevis] = useState(false);
  const rateSupplier = useMutation(api.ratings.rateSupplier);
  const createQuoteRequest = useMutation(api.quoteRequests.create);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
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
    // Le texte recherché reste un état local : il ne traîne pas dans l'URL (il
    // est transmis explicitement lors d'une bascule de type d'annuaire).
    next.delete("q");
    // Dès qu'il ne reste plus de filtre issu de l'analyse, on retire la mention
    // — sauf depuis « Matériaux utilisés », où le contexte projet/matériaux
    // doit survivre à l'élargissement de la région.
    if (!fromMaterials && !next.get("specialty") && !next.get("region")) {
      next.delete("from");
    }
    setSearchParams(next, { replace: true });
  };

  // Filtered suppliers
  const filtered = useMemo(() => {
    if (!suppliers) return [];

    // Depuis « Matériaux utilisés » : seuls les fournisseurs qui déclarent une
    // spécialité correspondant à au moins un article sont retenus, classés par
    // couverture puis par région. Aucun fournisseur sans correspondance n'est
    // affiché ; les correspondances partielles sont conservées et signalées.
    if (fromMaterials) {
      return materialMatches
        .filter(({ supplier: s }) => {
          if (search) {
            const q = search.toLowerCase();
            const haystack = `${s.companyName} ${s.description ?? ""} ${s.specialties.join(" ")}`.toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          // Spécialité choisie explicitement par l'utilisateur (critère
          // secondaire) : elle reste appliquée au classement matériaux.
          if (
            autoSpecialties.length > 0 &&
            !autoSpecialties.some((sp) => s.specialties.includes(sp))
          ) {
            return false;
          }
          if (!widenRegion && selectedRegion) {
            return (s.regions ?? []).includes(selectedRegion);
          }
          return true;
        })
        .map((m) => m.supplier);
    }

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
  }, [
    suppliers,
    search,
    autoSpecialtiesKey,
    selectedRegion,
    fromMaterials,
    materialMatches,
    widenRegion,
  ]);

  const activeFilterCount =
    (autoSpecialties.length > 0 ? 1 : 0) +
    (selectedRegion ? 1 : 0) +
    (search ? 1 : 0) +
    (fromMaterials ? 1 : 0);

  /** Réinitialise tous les critères de recherche. */
  const resetFilters = () => {
    setSearch("");
    // Depuis « Matériaux utilisés », le contexte projet/matériaux est conservé :
    // seuls les critères choisis par l'utilisateur sont retirés.
    setFilters({
      specialty: [],
      region: null,
      from: fromMaterials ? "materials" : null,
    });
    setWidenRegion(true);
  };

  /**
   * Bascule « Type » de l'annuaire : les fournisseurs et les experts restent
   * deux listes distinctes (données et logique inchangées), le critère Type
   * navigue donc vers l'annuaire correspondant en conservant la région.
   */
  const goToExperts = () => {
    // Le projet (`project`) est TOUJOURS transmis : la barre Projet Journey
    // reste affichée après la bascule, avec la recherche et la région.
    navigate(
      directorySwitchHref("experts", {
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
      selected: ["fournisseur"],
      onSelect: (v) => {
        if (v === "expert") goToExperts();
      },
    },
    {
      id: "specialty",
      label: "Spécialité / activité",
      options: availableSpecialties.map((sp) => ({
        value: sp,
        label: SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp,
      })),
      selected: autoSpecialties.filter((sp) => availableSpecialties.includes(sp)),
      onSelect: (v) =>
        setFilters({
          specialty: autoSpecialties.includes(v)
            ? autoSpecialties.filter((sp) => sp !== v)
            : [...autoSpecialties, v],
          // En mode « Matériaux utilisés », le contexte projet est conservé.
          from: fromMaterials ? "materials" : null,
        }),
    },
    {
      id: "region",
      label: "Région / gouvernorat",
      options: availableRegions.map((r) => ({ value: r, label: REGION_LABELS[r] ?? r })),
      selected: selectedRegion ? [selectedRegion] : [],
      onSelect: (v) =>
        setFilters({
          region: selectedRegion === v ? null : v,
          from: fromMaterials ? "materials" : null,
        }),
    },
  ];

  /** Critères retenus, affichés dans la barre de recherche. */
  const searchChips: DirectorySearchChip[] = [
    ...(search ? [{ key: "q", label: `« ${search} »`, onRemove: () => setSearch("") }] : []),
    ...autoSpecialties.map((sp) => ({
      key: `specialty-${sp}`,
      label: SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp,
      onRemove: () =>
        setFilters({ specialty: autoSpecialties.filter((x) => x !== sp) }),
    })),
    ...(selectedRegion
      ? [
          {
            key: "region",
            label: REGION_LABELS[selectedRegion] ?? selectedRegion,
            onRemove: () => setFilters({ region: null }),
          },
        ]
      : []),
  ];

  const openQuoteDialog = (s: any) => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setMotif("");
    setMotifOther("");
    setFiles([]);
    setDevisSupplier(s);
  };

  const handleSendQuote = async () => {
    if (!devisSupplier) return;
    if (user?._id && devisSupplier.userId && user._id === devisSupplier.userId) {
      toast.error("Vous ne pouvez pas vous envoyer un devis à vous-même.");
      return;
    }
    if (!motif) {
      toast.error("Sélectionnez le motif de votre demande.");
      return;
    }
    if (motif === QUOTE_MOTIF_OTHER && !motifOther.trim()) {
      toast.error("Précisez le motif de votre demande.");
      return;
    }
    setSendingDevis(true);
    try {
      const uploaded = await Promise.all(
        files.map((f) => uploadQuoteAttachment(f, () => generateUploadUrl())),
      );
      await createQuoteRequest({
        supplierId: devisSupplier._id as any,
        category: devisSupplier.specialties?.[0] ?? "général",
        // Depuis « Matériaux utilisés », la liste complète des articles du
        // projet (nom, quantité, unité) accompagne automatiquement le devis.
        materials: fromMaterials ? materialContext.materials : [],
        projectId: (projectIdParam as any) ?? undefined,
        projectName: materialContext.project?.name ?? undefined,
        motif,
        motifOther: motif === QUOTE_MOTIF_OTHER ? motifOther.trim() : undefined,
        attachments: uploaded as any,
      });
      toast.success("Demande de devis envoyée avec succès !");
      setDevisSupplier(null);
      setMotif("");
      setMotifOther("");
      setFiles([]);
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de l'envoi");
    } finally {
      setSendingDevis(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12">
      {/* En-tête : l'en-tête projet unifié du JourneyNav remplace l'en-tête de
          fonctionnalité (« Trouvez un fournisseur près de chez vous »). */}
      {/* Journey du projet — affiché lorsque l'annuaire est ouvert depuis un
          projet (contexte conservé dans l'URL). */}
      <ProjectJourneyNav
        projectId={projectIdParam}
        flags={journeyFlags}
        // L'annuaire fournisseurs est la partie « fournisseurs » de l'étape
        // « Mise en relation » : l'étape reste active même si sa route
        // principale est celle de l'annuaire des experts.
        activeKey="consult"
        featureLabel="Trouvez un fournisseur près de chez vous"
        maxWidthClassName="max-w-7xl"
      />

      {/* Contenu : espace réservé sous la barre sticky (scroll-mt) pour que la
          recherche et son panneau ne passent jamais sous Projet Journey. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 space-y-4 scroll-mt-28">
        {/* ── Contexte « Matériaux utilisés » ── */}
        {fromMaterials && materialContext.project && (
          <section
            aria-label="Contexte matériaux du projet"
            className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-teal-500/[0.03]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 p-3.5 sm:p-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  <Layers className="h-3.5 w-3.5" />
                  Mise en relation — fournisseurs de matériaux
                </p>
                <h1 className="mt-1 text-sm font-bold leading-snug sm:text-base">
                  {materialContext.project.name}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span>{materialTotal} matériau{materialTotal > 1 ? "x" : ""} recherché{materialTotal > 1 ? "s" : ""}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedRegion ? (REGION_LABELS[selectedRegion] ?? selectedRegion) : "Toutes régions"}
                  </span>
                  <span aria-hidden>·</span>
                  <span>Scénario {materialContext.scenarioLabel}</span>
                  <span aria-hidden>·</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    Référence{" "}
                    {materialContext.usage.total.toLocaleString("fr-FR", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    TND
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-[11px]"
                  onClick={() => {
                    const scenarioParam = searchParams.get("scenario");
                    navigate(
                      `/dashboard/materials-used/${projectIdParam}${
                        scenarioParam ? `?scenario=${encodeURIComponent(scenarioParam)}` : ""
                      }`,
                    );
                  }}
                >
                  <ArrowRight className="h-3 w-3 rotate-180" />
                  Voir mes matériaux
                </Button>
              </div>
            </div>
            <p className="flex items-start gap-1.5 border-t border-emerald-500/20 px-3.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground sm:px-4">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Le classement s'appuie uniquement sur les articles du projet et
                les spécialités déclarées par les fournisseurs. La disponibilité
                et les prix ne sont affichés que lorsqu'ils sont renseignés —
                aucune donnée n'est inventée.
              </span>
            </p>
          </section>
        )}

        {/* ── Prix marché réellement renseignés (comparaison d'offres) ── */}
        {fromMaterials && marketOfferRows.length > 0 && (
          <details className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elev-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 text-xs font-semibold sm:px-4">
              <span className="inline-flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                Prix marché disponibles
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {marketOfferRows.length} offre{marketOfferRows.length > 1 ? "s" : ""}
                </span>
              </span>
              <span className="text-[10px] font-normal text-muted-foreground group-open:hidden">
                Afficher
              </span>
              <span className="hidden text-[10px] font-normal text-muted-foreground group-open:inline">
                Masquer
              </span>
            </summary>
            <div className="border-t border-border/50 px-3.5 pb-3 sm:px-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[11.5px]">
                  <thead>
                    <tr className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="py-2 pr-3 font-semibold">Article</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Fournisseur / source</th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold">Prix</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Disponibilité</th>
                      <th scope="col" className="py-2 pl-2 font-semibold">Région</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketOfferRows.slice(0, 10).map((offer: any, i: number) => (
                      <tr key={`${offer.name}-${offer.supplier}-${i}`} className="border-t border-border/40">
                        <td className="py-2 pr-3 font-medium leading-snug">{offer.name}</td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {offer.supplier}
                          {typeof offer.reliabilityIndex === "number" ? (
                            <span className="ml-1 text-[9.5px] text-emerald-700 dark:text-emerald-300">
                              · fiabilité {Math.round(offer.reliabilityIndex * 100)} %
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums">
                          {Number(offer.minPrice).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}{" TND"}
                          {offer.unit ? (
                            <span className="font-normal text-muted-foreground"> / {offer.unit}</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <AvailabilityBadge value={offer.availability} />
                        </td>
                        <td className="py-2 pl-2 text-muted-foreground">
                          {offer.governorate
                            ? REGION_LABELS[String(offer.governorate)] ?? String(offer.governorate)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {marketOfferRows.length > 10 && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  10 offres les plus avantageuses affichées sur {marketOfferRows.length}.
                </p>
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                Prix indicatifs issus de la base marché, pour comparaison. Un
                fournisseur n'est jamais présenté comme disponible sans offre
                correspondante ; contactez-le depuis les fiches ci-dessous
                lorsqu'il est inscrit à l'annuaire.
              </p>
            </div>
          </details>
        )}

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
          loading={suppliers === undefined || (fromMaterials && materialContext.loading)}
        />

        {/* ── Loading state ── */}
        {(suppliers === undefined || (fromMaterials && materialContext.loading)) && (
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
        {suppliers !== undefined &&
          !(fromMaterials && materialContext.loading) &&
          filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/30 border border-border/30 mb-4">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-base font-bold tracking-tight">
              {fromMaterials && materialMatches.length > 0
                ? "Aucun fournisseur dans votre région"
                : fromMaterials
                  ? "Aucun fournisseur pertinent pour ces matériaux"
                  : "Aucun fournisseur trouvé"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-md">
              {fromMaterials && materialMatches.length > 0
                ? `Aucun fournisseur ne déclare couvrir ces matériaux dans ${selectedRegion ? (REGION_LABELS[selectedRegion] ?? selectedRegion) : "la région du chantier"}. Des fournisseurs d'autres régions couvrent une partie de votre liste.`
                : fromMaterials
                  ? materialTotal === 0
                    ? "Le projet ne contient aucun matériau exploitable : la recherche de fournisseurs est désactivée."
                    : "Aucun fournisseur inscrit ne déclare de spécialité correspondant à ces matériaux. Aucune disponibilité n'est affichée sans donnée réelle."
                  : activeFilterCount > 0
                    ? "Essayez de modifier vos filtres ou d'élargir votre recherche."
                    : "Aucun fournisseur actif n'est encore inscrit sur la plateforme."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              {fromMaterials && materialMatches.length > 0 && (
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setWidenRegion(true);
                    setFilters({ region: null });
                  }}
                >
                  Élargir à toutes les régions
                </Button>
              )}
              {fromMaterials && materialMatches.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setFilters({ specialty: [], region: null, from: null })}
                >
                  Voir tous les fournisseurs
                </Button>
              )}
              {!fromMaterials && autoSpecialties.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setFilters({ specialty: [] })}
                >
                  Toutes spécialités
                </Button>
              )}
              {!fromMaterials && selectedRegion && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setFilters({ region: null })}
                >
                  Toutes régions
                </Button>
              )}
              {activeFilterCount > 0 && !fromMaterials && (
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
              )}
            </div>
          </div>
        )}

        {/* ── Supplier cards (design de la carte fournisseur recommandée) ── */}
        {suppliers !== undefined && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const isOwnProfile = user?._id && s.userId && user._id === s.userId;
              const match = fromMaterials ? materialMatchById.get(s._id) : undefined;
              return (
                <article key={s._id} className={`${profileCardClass} flex flex-col`}>
                  <div className="flex-1 p-3.5">
                    {/* ── Identité : logo, raison sociale, activité, région ── */}
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <h3 className="line-clamp-2 min-w-0 flex-1 text-[13px] font-bold leading-snug">
                            {s.companyName}
                          </h3>
                          {isOwnProfile && (
                            <span className="inline-flex shrink-0 items-center rounded-full border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Mon profil
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <Layers className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {s.specialties
                              .slice(0, 2)
                              .map((sp) => SUPPLIER_SPECIALTIES_LABELS[sp] ?? sp)
                              .join(" · ")}
                            {s.specialties.length > 2 ? ` +${s.specialties.length - 2}` : ""}
                          </span>
                        </p>
                        {(s.regions ?? []).length > 0 && (
                          <p className="mt-1 flex items-start gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="mt-px h-3 w-3 shrink-0" />
                            <span className="line-clamp-1">
                              {(s.regions ?? []).map((r) => REGION_LABELS[r] ?? r).join(", ")}
                            </span>
                          </p>
                        )}
                        <SupplierCardMetrics supplierId={s._id} specialtyCount={s.specialties.length} />
                      </div>
                    </div>

                    {/* ── Correspondance avec les matériaux du projet ── */}
                    {match && (
                      <div className="mt-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] px-2.5 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9.5px] font-bold text-white">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {match.matchedArticles.length}/{materialTotal} article{materialTotal > 1 ? "s" : ""}
                          </span>
                          {match.partial && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9.5px] font-semibold text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="h-2.5 w-2.5" /> Correspondance partielle
                            </span>
                          )}
                          {match.regionMatch ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-background px-2 py-0.5 text-[9.5px] font-medium text-emerald-700 dark:text-emerald-300">
                              <MapPin className="h-2.5 w-2.5" /> Région du chantier
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background px-2 py-0.5 text-[9.5px] font-medium text-muted-foreground">
                              <MapPin className="h-2.5 w-2.5" /> Autre région
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          <span className="font-medium text-foreground">Articles couverts :</span>{" "}
                          {match.matchedArticles.slice(0, 3).join(", ")}
                          {match.matchedArticles.length > 3
                            ? ` +${match.matchedArticles.length - 3}`
                            : ""}
                        </p>
                        {match.partial && (
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                            Non couverts : {match.missingArticles.slice(0, 3).join(", ")}
                            {match.missingArticles.length > 3
                              ? ` +${match.missingArticles.length - 3}`
                              : ""}
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── Description & coordonnées (2 lignes max) ── */}
                    <div className="mt-2.5 space-y-1 border-t border-border/30 pt-2.5">
                      {s.description && (
                        <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          {s.description}
                        </p>
                      )}
                      {s.address && (
                        <p className="flex items-start gap-1 text-[10px] text-muted-foreground">
                          <Store className="mt-px h-3 w-3 shrink-0" />
                          <span className="line-clamp-1">{s.address}</span>
                        </p>
                      )}
                      {s.email && (
                        <p className="flex items-start gap-1 text-[10px] text-muted-foreground">
                          <Mail className="mt-px h-3 w-3 shrink-0" />
                          <span className="line-clamp-1 break-all">{s.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Actions ── */}
                  <div className="mt-auto space-y-1.5 border-t border-border/30 bg-muted/[0.12] p-2.5">
                    <div className="flex gap-1.5">
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
                            navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
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
            {fromMaterials && materialTotal > 0 && (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Liste de matériaux jointe automatiquement
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {materialTotal} article{materialTotal > 1 ? "s" : ""} du projet
                  {materialContext.project?.name ? ` « ${materialContext.project.name} »` : ""} — quantités et unités incluses.
                </p>
              </div>
            )}
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

            {/* Motif obligatoire + pièces jointes */}
            <QuoteRequestFields
              motif={motif}
              onMotifChange={setMotif}
              motifOther={motifOther}
              onMotifOtherChange={setMotifOther}
              files={files}
              onFilesChange={setFiles}
            />

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

/** Badge de disponibilité d'une offre marché (données réelles uniquement). */
function AvailabilityBadge({ value }: { value?: string }) {
  if (value === "disponible") {
    return (
      <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-300">
        Disponible
      </span>
    );
  }
  if (value === "sur_commande") {
    return (
      <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-700 dark:text-amber-300">
        Sur commande
      </span>
    );
  }
  if (value === "rupture") {
    return (
      <span className="inline-flex rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-rose-700 dark:text-rose-300">
        Rupture
      </span>
    );
  }
  return <span className="text-[10px] text-muted-foreground">—</span>;
}

// ── Métriques de la carte fournisseur (maquette : évaluations · note · spécialités) ──

function SupplierCardMetrics({ supplierId, specialtyCount }: { supplierId: string; specialtyCount: number }) {
  const rating = useQuery(api.ratings.getSupplierAverage, { supplierId: supplierId as any });
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