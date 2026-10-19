// ============================================================================
// MATÉRIAUX UTILISÉS — étape n°2 du parcours projet
// ----------------------------------------------------------------------------
// Affiche le tableau des articles réellement nécessaires au projet :
//   Article · Quantité · Prix unitaire · Prix total (TND)
//
// • Les quantités et prix viennent du quantitatif déjà enregistré : lignes
//   matériaux du DQE lorsqu'il les porte, sinon détail matériaux du moteur
//   BIM. Aucune donnée fictive, aucune source additionnée à une autre.
// • Le scénario actif (Économique / Standard / Premium / Personnalisé) est
//   repris tel quel ; toute modification du projet, du quantitatif, des prix ou
//   du scénario met le tableau à jour automatiquement (requêtes réactives).
// • Le total affiché est la somme des lignes du tableau ; il n'est jamais
//   présenté comme le coût global de construction (main-d'œuvre, transport,
//   études et autres frais exclus).
// • Le bouton « Trouver le bon fournisseur » ouvre la Mise en relation en
//   transmettant le projet et le scénario : la page fournisseurs reconstruit la
//   même liste d'articles et classe les fournisseurs pertinents.
// ============================================================================

import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  ArrowRight,
  Boxes,
  Info,
  Layers,
  MapPin,
  Ruler,
  Search,
  Wallet,
} from "lucide-react";

import { ProjectJourneyNav } from "@/components/ProjectJourneyNav";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/feedback";
import { usePageSEO } from "@/hooks/use-page-seo";
import { useProjectMaterialUsage } from "@/hooks/use-project-material-usage";
import { projectTypeLabel } from "@/convex/projectTypes";

export default function MaterialsUsed() {
  usePageSEO({
    title: "Matériaux utilisés - batibuild",
    description:
      "Consultez les matériaux réellement nécessaires à votre projet : quantités, unités, prix unitaires et totaux selon le scénario sélectionné.",
  });

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scenarioParam = searchParams.get("scenario");

  const {
    project,
    loading,
    usage,
    builtSurface,
    scenarioKey,
    scenarioLabel,
    regionLabel,
  } = useProjectMaterialUsage(id, scenarioParam);

  const hasRows = usage.rows.length > 0;

  /** Ouvre la Mise en relation, partie fournisseurs, avec le contexte projet. */
  const findSupplier = () => {
    if (!id || !hasRows) return;
    const next = new URLSearchParams({
      project: id,
      from: "materials",
      scenario: scenarioKey,
    });
    if (project?.region) next.set("region", project.region);
    navigate(`/dashboard/suppliers-directory?${next.toString()}`);
  };

  const categoryCount = useMemo(
    () => new Set(usage.rows.map((row) => row.category)).size,
    [usage.rows],
  );

  return (
    <main className="min-h-screen bg-background pb-12">
      <ProjectJourneyNav
        projectId={id}
        category={project?.category}
        featureLabel="Matériaux utilisés"
        maxWidthClassName="max-w-6xl"
      />

      <div className="mx-auto mt-4 max-w-6xl space-y-4 px-3 sm:px-6">
        {loading ? (
          <LoadingState
            message="Chargement des matériaux…"
            steps={[
              { label: "Lecture du quantitatif" },
              { label: "Application du scénario" },
              { label: "Calcul des totaux" },
            ]}
          />
        ) : !project ? (
          <EmptyState
            title="Projet introuvable"
            description="Ce projet n'existe pas ou n'est pas accessible."
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                Retour au tableau de bord
              </Button>
            }
          />
        ) : !project.costEstimate && !((project as any)?.dqe?.lots?.length > 0) ? (
          <EmptyState
            title="Estimation indisponible"
            description="Les matériaux sont déduits de l'estimation du coût de construction. Lancez d'abord l'estimation de ce projet."
            action={
              <Button
                size="sm"
                onClick={() => navigate(`/dashboard/project/${project._id}`)}
              >
                Aller à l'estimation
              </Button>
            }
          />
        ) : (
          <>
            {/* ── Résumé du projet et du scénario ── */}
            <section
              aria-label="Résumé du projet"
              className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elev-1"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight sm:text-lg">
                      {project.name}
                    </h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {projectTypeLabel(project.category)}
                      {regionLabel ? ` · ${regionLabel}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Scénario {scenarioLabel}
                  </span>
                  <p className="mt-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
                    Total des matériaux
                  </p>
                  <p className="text-xl font-bold leading-tight tabular-nums text-emerald-700 dark:text-emerald-300 sm:text-2xl">
                    {formatAmount(usage.total)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {usage.articleCount} article{usage.articleCount > 1 ? "s" : ""} · {categoryCount} catégorie{categoryCount > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/50">
                <SynthStat
                  icon={Ruler}
                  label="Surface construite"
                  value={builtSurface ? `${builtSurface} m²` : "—"}
                />
                <SynthStat icon={MapPin} label="Région" value={regionLabel ?? "—"} />
                <SynthStat icon={Wallet} label="Scénario" value={scenarioLabel} />
              </div>
            </section>

            {hasRows ? (
              <>
                {/* ── Tableau desktop ── */}
                <section className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elev-1 md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Article
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            Quantité
                          </th>
                          <th scope="col" className="px-3 py-3 text-right font-semibold">
                            Prix unitaire
                          </th>
                          <th scope="col" className="px-4 py-3 text-right font-semibold">
                            Prix total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {usage.rows.map((row) => (
                          <tr
                            key={row.key}
                            className="border-b border-border/40 last:border-0 hover:bg-muted/[0.12]"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium leading-snug text-foreground">
                                {row.article}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Layers className="h-3 w-3 shrink-0" />
                                {row.category}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                              {formatQty(row.quantity)}{" "}
                              <span className="text-[11px] text-muted-foreground">
                                {row.unit}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                              {formatUnitPrice(row.unitPrice)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                              {formatAmount(row.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-emerald-500/30 bg-emerald-500/[0.06]">
                          <td className="px-4 py-3.5 font-semibold" colSpan={3}>
                            Total des matériaux
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                            {formatAmount(usage.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>

                {/* ── Cartes mobile ── */}
                <section className="space-y-2 md:hidden" aria-label="Matériaux du projet">
                  {usage.rows.map((row) => (
                    <article
                      key={row.key}
                      className="rounded-xl border border-border/60 bg-card p-3 shadow-elev-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-snug">
                            {row.article}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-muted-foreground">
                            <Layers className="h-3 w-3 shrink-0" />
                            {row.category}
                          </p>
                        </div>
                        <p className="shrink-0 text-[13px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                          {formatAmount(row.total)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                        <span className="tabular-nums">
                          {formatQty(row.quantity)} {row.unit}
                        </span>
                        <span className="tabular-nums">
                          {formatUnitPrice(row.unitPrice)} / {row.unit}
                        </span>
                      </div>
                    </article>
                  ))}

                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-3">
                    <span className="text-[13px] font-semibold">Total des matériaux</span>
                    <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {formatAmount(usage.total)}
                    </span>
                  </div>
                </section>

                {/* ── Note explicative : total matériaux ≠ coût global ── */}
                <p className="flex items-start gap-1.5 rounded-xl border border-border/50 bg-muted/[0.18] px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Le total des matériaux additionne uniquement les lignes
                    ci-dessus. Il ne comprend ni la main-d'œuvre, ni le transport,
                    ni les études et autres frais : il ne remplace donc pas le coût
                    global de construction.
                  </span>
                </p>

                {/* ── CTA principal ── */}
                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.10] to-teal-500/[0.04] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Besoin de fournisseurs pour ces matériaux ?
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                      Nous classons les fournisseurs selon vos articles, leur
                      région et leurs spécialités déclarées.
                    </p>
                  </div>
                  <Button
                    onClick={findSupplier}
                    className="mt-3 w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 sm:mt-0 sm:w-auto"
                  >
                    <Search className="h-4 w-4" />
                    Trouver le bon fournisseur
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                title="Aucun matériau exploitable"
                description="Ce projet ne contient aucun article matériau dans son quantitatif. Vérifiez ou relancez l'estimation pour obtenir les quantités réelles du projet."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/project/${project._id}`)}
                  >
                    Retour au quantitatif
                  </Button>
                }
              />
            )}

            {!hasRows && (
              <div className="rounded-xl border border-border/50 bg-muted/[0.18] px-3 py-2.5 text-[11px] text-muted-foreground">
                La recherche de fournisseurs reste désactivée tant qu'aucun article
                matériau n'est disponible.
              </div>
            )}

          </>
        )}
      </div>
    </main>
  );
}

/** Montant TND lisible : 1 980 TND ou 16,5 TND (maximum deux décimales). */
function formatAmount(value: number): string {
  const rounded = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
  return `${rounded.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} TND`;
}

/** Prix unitaire : même format que les montants, sans arrondi à l'unité. */
const formatUnitPrice = formatAmount;

/** Quantité lisible : 1 250 ou 12,5 (jamais de décimale inutile). */
function formatQty(value: number): string {
  const rounded = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
  return rounded.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function SynthStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 px-3 py-3 sm:px-4">
      <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}
