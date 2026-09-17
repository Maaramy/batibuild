// ============================================================================
// PRESTATAIRES RECOMMANDÉS PAR L'IA — section dynamique (Résultats d'estimation)
//
// Remplace la liste statique `providerRecommendations` : les recommandations
// sont générées côté backend (`src/convex/recommendedProviders.ts`) à partir du
// type de projet, du DQE et de la région, puis persistées une seule fois par
// prestataire et par projet (déduplication stricte).
//
// Deux catégories distinctes :
//   A. Fournisseurs recommandés — matériaux/équipements correspondant aux
//      besoins détectés (logo, nom, spécialité, région, correspondance,
//      disponibilité, Contactez, Voir le profil) ;
//   B. Experts recommandés — corps de métiers nécessaires aux travaux
//      (plombier, électricien, architecte…) avec le même rendu.
//
// « Actualiser » demande au backend de rechercher de NOUVEAUX prestataires
// éligibles (randomisation fraîche) sans jamais réinsérer ceux déjà associés
// au projet — s'il n'y a plus personne de nouveau, les recommandations
// existantes restent affichées.
// ============================================================================

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Building2,
  ExternalLink,
  MapPin,
  Phone,
  RefreshCw,
  Store,
  UserRound,
  Users,
  Wand2,
} from "lucide-react";

import type { RecommendedProviderView } from "@/convex/recommendedProviders";

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

export function RecommendedProvidersPanel({
  projectId,
  projectName,
}: {
  projectId: Id<"projects">;
  projectName?: string;
}) {
  const data = useQuery(api.recommendedProviders.getForProject, { projectId });
  const refreshMutation = useMutation(api.recommendedProviders.refresh);
  const [refreshing, setRefreshing] = useState(false);
  // Première génération automatique : le backend n'insère que des profils
  // éligibles non encore associés (idempotent, appels répétés sans effet).
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

  const needsSummary =
    data && (data.needs.specialties.length > 0 || data.needs.trades.length > 0)
      ? [...data.needs.specialties.slice(0, 3), ...data.needs.trades.slice(0, 2)].join(" · ")
      : null;

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
              <ProviderCategory
                icon={Users}
                title="Experts recommandés"
                subtitle="Professionnels correspondant aux travaux nécessaires (plombier, électricien, architecte…)."
                providers={data.experts}
                onContact={handleContact}
                onOpenProfile={handleOpenProfile}
              />

              {data.suppliers.length === 0 && data.experts.length === 0 && (
                <p className="text-[12px] text-muted-foreground/70">
                  Aucun prestataire ne correspond encore à votre projet. Actualisez pour lancer une
                  nouvelle recherche{projectName ? ` pour « ${projectName} »` : ""}.
                </p>
              )}

              <p className="text-[10px] text-muted-foreground/60">
                Recommandations générées automatiquement à partir du type de projet, du quantitatif
                (DQE) et de la région — priorité aux prestataires de la région du projet, puis aux
                régions voisines. Un même prestataire n'est jamais proposé deux fois pour le même
                projet.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
