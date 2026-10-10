// ============================================================================
// PRESTATAIRES RECOMMANDÉS PAR L'IA — section dynamique (Résultats d'estimation)
//
// Remplace la liste statique `providerRecommendations` : les recommandations
// sont générées côté backend (`src/convex/recommendedProviders.ts`) à partir du
// type de projet, du DQE et de la région, puis persistées une seule fois par
// prestataire et par projet (déduplication stricte).
//
// Trois blocs distincts :
//   A. Fournisseurs recommandés — matériaux/équipements correspondant aux
//      besoins détectés (persistés, inchangés) ;
//   B. Experts recommandés — recalculés EN DIRECT par le backend, regroupés par
//      catégorie (🏗️ Architectes, 🏢 Ingénieurs, 📐 Bureaux d'études,
//      ⚡ Électricité, 💧 Plomberie / CVC, 🏠 Promoteurs, 🧰 Autre) ;
//   C. Actions experts : Voir le profil · Demander un rendez-vous ·
//      Demander un service (fonctionnalités ProMarket réutilisées).
//
// « Actualiser » demande au backend de rechercher de NOUVEAUX fournisseurs
// éligibles (randomisation fraîche) sans jamais réinsérer ceux déjà associés
// au projet — s'il n'y a plus personne de nouveau, les recommandations
// existantes restent affichées. Les experts, eux, suivent automatiquement le
// type de projet et le besoin (aucune action requise).
// ============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { indicativePriceLabel } from "@/lib/expertAvailability";
import { toast } from "sonner";
import {
  Banknote,
  CalendarClock,
  ExternalLink,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  Store,
  UserRound,
  Users,
  Wand2,
  Wrench,
} from "lucide-react";

import {
  RequestAppointmentDialog,
  RequestServiceDialog,
} from "@/components/expert/ExpertRequestDialogs";

import type {
  ExpertCategoryGroup,
  RecommendedProviderView,
} from "@/convex/recommendedProviders";

const REGION_RANK_LABEL: Record<number, string> = {
  0: "Région du projet",
  1: "Région voisine",
  2: "Tunisie",
};

// ============================================================================
// Visuel du prestataire — photo/logo RÉEL du profil, jamais de src cassé.
//
// L'URL vient du backend (déjà nettoyée et réparée si besoin) : une valeur
// absente ou invalide → fallback volontaire (initiales, puis icône métier),
// une image inaccessible (404, CORS, fichier supprimé) → onError bascule sur
// le même fallback au lieu d'afficher une icône d'image manquante.
// ============================================================================
function ProviderAvatar({
  provider,
}: {
  provider: RecommendedProviderView;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = (provider.name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const showImage = !!provider.logo && !imgFailed;

  return showImage ? (
    <img
      key={provider.logo}
      src={provider.logo as string}
      alt={provider.name}
      className="h-10 w-10 shrink-0 rounded-lg object-cover border border-border/30"
      loading="lazy"
      decoding="async"
      onError={() => setImgFailed(true)}
    />
  ) : (
    <div
      aria-label={`Logo de ${provider.name}`}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-border/30"
    >
      {initials ? (
        <span className="text-xs font-bold leading-none">{initials}</span>
      ) : provider.type === "supplier" ? (
        <Store className="h-4 w-4" />
      ) : (
        <UserRound className="h-4 w-4" />
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  onContact,
  onOpenProfile,
}: {
  provider: RecommendedProviderView;
  onContact: (p: RecommendedProviderView) => void;
  onOpenProfile: (p: RecommendedProviderView) => void;
}) {
  return (
    <div className="p-3 rounded-xl border border-border/40 bg-background/60 hover:border-primary/25 hover:shadow-sm transition-all">
      <div className="flex items-start gap-2.5">
        {/* Photo de profil / logo réel — fallback propre si absent ou cassé. */}
        <ProviderAvatar provider={provider} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold leading-tight">{provider.name}</span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              {provider.type === "supplier"
                ? "Fournisseur"
                : provider.professionLabel ?? "Expert"}
            </Badge>
          </div>

          {/* Métier (experts) ou spécialités principales */}
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {provider.type === "expert" && provider.profession
              ? provider.specialties[0] ?? provider.profession
              : provider.specialties.slice(0, 2).join(" · ")}
          </p>

          <div className="mt-1 flex items-center gap-2.5 flex-wrap text-[10px] text-muted-foreground/80">
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{provider.regionLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[9px]">
              {provider.availability}
            </span>
          </div>

          {/* Correspondance avec le besoin du projet */}
          {provider.matchedNeeds.length > 0 && (
            <div className="mt-1.5 flex items-start gap-1 flex-wrap">
              {provider.matchedNeeds.slice(0, 3).map((need) => (
                <span
                  key={need}
                  className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-400"
                >
                  <Wand2 className="h-2 w-2" />
                  {need}
                </span>
              ))}
              {provider.matchedNeeds.length > 3 && (
                <span className="text-[9px] text-muted-foreground/60">
                  +{provider.matchedNeeds.length - 3}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground/60">
                — {REGION_RANK_LABEL[provider.regionRank] ?? "Tunisie"}
              </span>
            </div>
          )}

          {/* Actions : Contactez + Voir le profil */}
          <div className="mt-2 flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-7 gap-1 px-2.5 text-[11px]"
              onClick={() => onContact(provider)}
            >
              <Phone className="h-3 w-3" />
              Contactez
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5 text-[11px]"
              onClick={() => onOpenProfile(provider)}
            >
              <ExternalLink className="h-3 w-3" />
              Voir le profil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CARTE EXPERT — photo, nom, spécialité, région, prix indicatif, disponibilité,
// badge « Recommandé par l'IA » et les trois actions demandées.
// ============================================================================
function ExpertCard({
  expert,
  onOpenProfile,
  onAppointment,
  onService,
}: {
  expert: RecommendedProviderView;
  onOpenProfile: (p: RecommendedProviderView) => void;
  onAppointment: (p: RecommendedProviderView) => void;
  onService: (p: RecommendedProviderView) => void;
}) {
  const price = indicativePriceLabel(expert.indicativePrice);
  const specialtyLine =
    expert.specialties.slice(0, 2).join(" · ") || expert.professionLabel || "Expert";

  return (
    <div className="p-3 rounded-xl border border-border/40 bg-background/60 hover:border-primary/25 hover:shadow-sm transition-all flex flex-col">
      <div className="flex items-start gap-2.5">
        <ProviderAvatar provider={expert} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold leading-tight">{expert.name}</span>
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 gap-0.5 bg-primary/10 text-primary"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Recommandé par l’IA
            </Badge>
          </div>

          <p className="text-[11px] font-medium text-primary/90 mt-0.5 truncate">
            {expert.professionLabel ?? "Expert"}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{specialtyLine}</p>

          <div className="mt-1 flex items-center gap-2.5 flex-wrap text-[10px] text-muted-foreground/80">
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{expert.regionLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[9px]">
              <CalendarClock className="h-2.5 w-2.5" />
              {expert.availability}
            </span>
            {price && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
                <Banknote className="h-2.5 w-2.5" />
                {price}
              </span>
            )}
            {expert.acceptsUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/5 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
                Urgences
              </span>
            )}
          </div>

          {/* Correspondance avec le besoin + éventuelle spécialité proche */}
          <div className="mt-1.5 flex items-start gap-1 flex-wrap">
            {expert.complementary && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-400">
                Spécialité complémentaire
              </span>
            )}
            {expert.matchedNeeds.slice(0, 3).map((need) => (
              <span
                key={need}
                className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-400"
              >
                <Wand2 className="h-2 w-2" />
                {need}
              </span>
            ))}
            <span className="text-[9px] text-muted-foreground/60">
              — {REGION_RANK_LABEL[expert.regionRank] ?? "Tunisie"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 flex-1 gap-1 px-2 text-[10px] sm:flex-none"
          onClick={() => onOpenProfile(expert)}
        >
          <ExternalLink className="h-3 w-3" />
          Voir le profil
        </Button>
        <Button
          size="sm"
          className="h-7 flex-1 gap-1 bg-blue-600 px-2 text-[10px] hover:bg-blue-700 sm:flex-none"
          onClick={() => onAppointment(expert)}
        >
          <CalendarClock className="h-3 w-3" />
          Demander un rendez-vous
        </Button>
        <Button
          size="sm"
          className="h-7 flex-1 gap-1 bg-emerald-600 px-2 text-[10px] hover:bg-emerald-700 sm:flex-none"
          onClick={() => onService(expert)}
        >
          <Wrench className="h-3 w-3" />
          Demander un service
        </Button>
      </div>
    </div>
  );
}

function ProviderCategory({
  icon: Icon,
  title,
  subtitle,
  providers,
  onContact,
  onOpenProfile,
}: {
  icon: any;
  title: string;
  subtitle: string;
  providers: RecommendedProviderView[];
  onContact: (p: RecommendedProviderView) => void;
  onOpenProfile: (p: RecommendedProviderView) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? providers : providers.slice(0, 3);
  if (providers.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-3 w-3" />
        </div>
        <p className="text-[12px] font-semibold">
          {title} <span className="text-muted-foreground/60 font-normal">({providers.length})</span>
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mb-2">{subtitle}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {visible.map((p) => (
          <ProviderCard key={p.associationId} provider={p} onContact={onContact} onOpenProfile={onOpenProfile} />
        ))}
      </div>
      {providers.length > 3 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-[11px] font-medium text-primary hover:underline"
        >
          {showAll ? "Voir moins" : `Voir plus (${providers.length - 3})`}
        </button>
      )}
    </div>
  );
}

/**
 * Une catégorie d'experts (en-tête emoji + libellé, puis cartes). Le nombre
 * d'experts est volontairement limité par le backend (6 / catégorie) ; un
 * bouton « Voir plus » gère les petits écrans.
 */
function ExpertCategory({
  group,
  onOpenProfile,
  onAppointment,
  onService,
}: {
  group: ExpertCategoryGroup;
  onOpenProfile: (p: RecommendedProviderView) => void;
  onAppointment: (p: RecommendedProviderView) => void;
  onService: (p: RecommendedProviderView) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const experts = group.experts;
  const visible = showAll ? experts : experts.slice(0, 3);
  if (experts.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span aria-hidden className="text-base leading-none">
          {group.icon}
        </span>
        <p className="text-[12px] font-semibold">
          {group.label}{" "}
          <span className="text-muted-foreground/60 font-normal">({experts.length})</span>
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {visible.map((expert) => (
          <ExpertCard
            key={expert.associationId}
            expert={expert}
            onOpenProfile={onOpenProfile}
            onAppointment={onAppointment}
            onService={onService}
          />
        ))}
      </div>
      {experts.length > 3 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-[11px] font-medium text-primary hover:underline"
        >
          {showAll ? "Voir moins" : `Voir plus (${experts.length - 3})`}
        </button>
      )}
    </div>
  );
}

export function RecommendedProvidersPanel({
  projectId,
  projectName,
  project,
}: {
  projectId: Id<"projects">;
  projectName?: string;
  /** Contexte transmis automatiquement aux demandes (rendez-vous / service). */
  project?: {
    _id?: string;
    name?: string;
    region?: string;
    category?: string;
    surface?: number | null;
  } | null;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const data = useQuery(api.recommendedProviders.getForProject, { projectId });
  const refreshMutation = useMutation(api.recommendedProviders.refresh);
  const [refreshing, setRefreshing] = useState(false);

  // Dialogues ProMarket (rendez-vous / service) — ouverts depuis une carte expert.
  const [appointmentExpert, setAppointmentExpert] = useState<RecommendedProviderView | null>(null);
  const [serviceExpert, setServiceExpert] = useState<RecommendedProviderView | null>(null);

  // Première génération automatique : le backend n'insère que des profils
  // éligibles non encore associés (idempotent — clics rapides et appels
  // simultanés sans effet de doublon). generatedAt === 0 → jamais généré.
  useEffect(() => {
    if (!data || data.generatedAt > 0 || refreshing) return;
    setRefreshing(true);
    refreshMutation({ projectId })
      .catch(() => {
        // Silencieux : la section reste vide et « Actualiser » reste dispo.
      })
      .finally(() => setRefreshing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, projectId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMutation({ projectId });
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'actualiser les recommandations");
    } finally {
      setRefreshing(false);
    }
  };

  const handleContact = (p: RecommendedProviderView) => {
    if (p.phone) {
      window.open(`tel:${p.phone.replace(/[^\d+]/g, "")}`, "_self");
      return;
    }
    if (p.email) {
      window.open(`mailto:${p.email}`, "_self");
      return;
    }
    toast.info("Aucun contact direct — consultez le profil de ce prestataire.");
  };

  const handleOpenProfile = (p: RecommendedProviderView) => {
    const path =
      p.type === "supplier"
        ? `/dashboard/supplier-profile/${p.profileId}`
        : `/dashboard/expert-profile/${p.profileId}`;
    window.open(path, "_blank");
  };

  /** Garde d'authentification avant toute demande (rendez-vous / service). */
  const requireAuth = () => {
    if (!user) {
      navigate(
        `/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return false;
    }
    return true;
  };

  const handleAppointment = (p: RecommendedProviderView) => {
    if (!requireAuth()) return;
    setAppointmentExpert(p);
  };
  const handleService = (p: RecommendedProviderView) => {
    if (!requireAuth()) return;
    setServiceExpert(p);
  };

  /** Conversion vers la forme attendue par les dialogues experts. */
  const toExpertTarget = (p: RecommendedProviderView | null) =>
    p
      ? {
          _id: p.profileId,
          displayName: p.name,
          availabilityDetails: p.availabilityDetails ?? null,
          profession: p.profession ?? null,
          specialties: p.specialtyKeys ?? p.specialties,
        }
      : null;

  // Contexte transmis aux dialogues : celui fourni par l'appelant, sinon le
  // contexte projet renvoyé par le backend (région, type, surface).
  const dialogProject =
    project ??
    (data
      ? { _id: projectId as string, ...data.projectContext }
      : projectName
        ? { _id: projectId as string, name: projectName }
        : null);

  const needsSummary =
    data && (data.needs.specialties.length > 0 || data.needs.trades.length > 0)
      ? [...data.needs.specialties.slice(0, 3), ...data.needs.trades.slice(0, 2)].join(" · ")
      : null;

  const expertsByCategory = data?.expertsByCategory ?? [];

  return (
    <div className="col-span-full mb-2">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/10">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Users className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-[16px] font-semibold">Prestataires recommandés par l’IA</h3>
          {data && (
            <Badge variant="secondary" className="text-[11px]">
              {data.suppliers.length + data.experts.length} prestataires
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 gap-1 px-2.5 text-[11px] shrink-0"
            disabled={refreshing || !data}
            onClick={handleRefresh}
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {data === undefined ? (
            <p className="text-[12px] text-muted-foreground/70">Chargement des recommandations…</p>
          ) : (
            <>
              {/* Besoins détectés + région — traçabilité de l'analyse */}
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[12px] sm:text-[13px] text-primary/80 flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>
                    Besoins détectés{data.regionLabel ? ` — projet ${data.regionLabel}` : ""}
                    {needsSummary ? ` : ${needsSummary}` : ""}
                  </span>
                </p>
              </div>

              <ProviderCategory
                icon={Store}
                title="Fournisseurs recommandés"
                subtitle="Fournisseurs de matériaux et équipements correspondant aux besoins de votre projet."
                providers={data.suppliers}
                onContact={handleContact}
                onOpenProfile={handleOpenProfile}
              />

              {/* Experts recommandés — regroupés par catégorie */}
              {expertsByCategory.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Users className="h-3 w-3" />
                    </div>
                    <p className="text-[12px] font-semibold">
                      Experts recommandés{" "}
                      <span className="text-muted-foreground/60 font-normal">
                        ({data.experts.length})
                      </span>
                    </p>
                  </div>
                  <p className="-mt-3 text-[10px] text-muted-foreground/70">
                    Professionnels correspondant aux travaux nécessaires, classés par catégorie selon
                    le besoin et la région du projet.
                  </p>

                  {expertsByCategory.map((group) => (
                    <ExpertCategory
                      key={group.key}
                      group={group}
                      onOpenProfile={handleOpenProfile}
                      onAppointment={handleAppointment}
                      onService={handleService}
                    />
                  ))}
                </div>
              )}

              {data.suppliers.length === 0 && data.experts.length === 0 && (
                <p className="text-[12px] text-muted-foreground/70">
                  Aucun prestataire ne correspond encore à votre projet. Actualisez pour lancer une
                  nouvelle recherche{projectName ? ` pour « ${projectName} »` : ""}.
                </p>
              )}

              <p className="text-[10px] text-muted-foreground/60">
                Recommandations générées automatiquement à partir du type de projet, du quantitatif
                (DQE), du besoin identifié et de la région — priorité aux prestataires de la région
                du projet, puis aux régions voisines. Un même prestataire n'est jamais proposé deux
                fois pour le même projet, et les experts sont recalculés dès que le projet évolue.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Dialogues ProMarket — contexte du projet transmis automatiquement */}
      <RequestAppointmentDialog
        expert={toExpertTarget(appointmentExpert) as any}
        open={!!appointmentExpert}
        onOpenChange={(o) => { if (!o) setAppointmentExpert(null); }}
        project={dialogProject as any}
      />
      <RequestServiceDialog
        expert={toExpertTarget(serviceExpert) as any}
        open={!!serviceExpert}
        onOpenChange={(o) => { if (!o) setServiceExpert(null); }}
        project={dialogProject as any}
      />
    </div>
  );
}
