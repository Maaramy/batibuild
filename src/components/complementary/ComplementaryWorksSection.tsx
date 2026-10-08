// ============================================================================
// TRAVAUX COMPLÉMENTAIRES — section du résultat « Coût de construction ».
// ----------------------------------------------------------------------------
// Permet d'ajouter à un projet des travaux complémentaires choisis dans une
// LISTE PRÉDÉFINIE (Piscine, Garage, Cuisine extérieure, Jardin, Panneaux
// solaires). Chaque travail est chiffré AUTOMATIQUEMENT par le système à partir
// des données réelles du projet et du scénario budgétaire actif.
//
// • La sélection est enregistrée côté serveur (une seule source de vérité,
//   partagée avec l'aide à la décision et le module Plan architecture AI) ;
// • les travaux n'intègrent QUE le scénario « Personnalisé » : les scénarios
//   Économique / Standard / Premium d'origine ne sont jamais modifiés ;
// • aucun montant n'est saisi à la main, aucune donnée projet n'est modifiée.
// ============================================================================

import { useMemo, useState } from "react";
import { Check, Loader2, Plus, Sun, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomWorkIcon } from "@/components/CustomWorkIcon";
import { cn } from "@/lib/utils";
import { formatTndAmount } from "@/lib/budgetEngine";
import {
  CUSTOM_WORK_CATALOG,
  SOLAR_PANEL_COUNT_OPTIONS,
  SOLAR_PANEL_DEFAULT_COUNT,
  SOLAR_PANEL_TYPE,
  type CustomWorkKey,
} from "@/lib/customWorksCatalog";
import type { CustomWorkEstimate } from "@/convex/customWorksEngine";

export interface ComplementaryWorksSectionProps {
  /** Travaux déjà sélectionnés et chiffrés (source serveur). */
  works: CustomWorkEstimate[];
  /** Clés enregistrées pour le projet. */
  selectedKeys: CustomWorkKey[];
  /** Total des travaux sélectionnés (TND). */
  total: number;
  /** Nombre de panneaux solaires enregistré (1-5). */
  solarPanels?: number;
  /** Écriture en cours (les bascules restent utilisables, la requête est réactive). */
  saving?: boolean;
  /**
   * Ajoute / retire un travail. Le parent enregistre côté serveur puis bascule
   * l'affichage sur le scénario « Personnalisé ».
   */
  onToggle: (key: CustomWorkKey) => void;
  /** Change le nombre de panneaux solaires (recalcul immédiat du poste). */
  onChangeSolarPanels: (count: number) => void;
  /** Coût total du scénario « Personnalisé » avant travaux (TND), si connu. */
  baseTotal?: number;
}

/**
 * Bandeau d'ajout de travaux complémentaires du résultat d'estimation.
 * Affiché uniquement pour les projets éligibles (type de logement / immobilier
 * neuf ET surface couverte ≥ 120 m²) — la décision est prise par l'appelant.
 */
export function ComplementaryWorksSection({
  works,
  selectedKeys,
  total,
  solarPanels,
  saving,
  onToggle,
  onChangeSolarPanels,
  baseTotal,
}: ComplementaryWorksSectionProps) {
  const [open, setOpen] = useState(true);

  const selected = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const worksByKey = useMemo(() => {
    const map = new Map<string, CustomWorkEstimate>();
    for (const w of works) map.set(w.key, w);
    return map;
  }, [works]);

  const panelCount = solarPanels ?? SOLAR_PANEL_DEFAULT_COUNT;
  const solarWork = worksByKey.get("solaire");
  const solarSelectorVisible = selected.has("solaire") || solarWork !== undefined;
  const hasWorks = selectedKeys.length > 0;

  return (
    <Card className="border-amber-400/30 bg-gradient-to-br from-amber-400/[0.04] to-transparent">
      <CardContent className="p-4">
        {/* ── En-tête ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Plus className="h-4 w-4 shrink-0 text-amber-600" />
          <h3 className="text-sm font-bold tracking-tight">Travaux complémentaires</h3>
          <Badge
            variant="outline"
            className="border-amber-400/40 bg-amber-400/10 text-[9px] text-amber-700"
          >
            Scénario Personnalisé
          </Badge>
          {hasWorks ? (
            <span className="rounded-full border border-primary/30 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
              {selectedKeys.length} travail{selectedKeys.length > 1 ? "x" : ""} ·{" "}
              {formatTndAmount(total)}
            </span>
          ) : null}
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-[10.5px]"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Masquer" : "Voir les travaux"}
          </Button>
        </div>

        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          Ajoutez des travaux à votre projet à partir d'une liste prédéfinie. Chaque coût est
          calculé automatiquement à partir des caractéristiques réelles du projet — aucun montant
          n'est saisi à la main. Ces travaux n'intègrent que le scénario « Personnalisé » : les
          scénarios Économique, Standard et Premium restent inchangés.
        </p>

        {open ? (
          <div className="mt-3 space-y-3">
            {/* ── Liste prédéfinie : ajout / retrait immédiat ── */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CUSTOM_WORK_CATALOG.map((def) => {
                const isOn = selected.has(def.key);
                const estimate = worksByKey.get(def.key);
                return (
                  <button
                    key={def.key}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => onToggle(def.key)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      isOn
                        ? "border-primary/40 bg-primary/[0.06]"
                        : "border-border/50 bg-background hover:border-primary/30 hover:bg-muted/20",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        isOn ? "border-primary bg-primary text-primary-foreground" : "border-border/60",
                      )}
                    >
                      {isOn ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <CustomWorkIcon
                      icon={def.icon}
                      className="h-4 w-4 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{def.label}</span>
                      <span className="block truncate text-[10.5px] text-muted-foreground">
                        {estimate
                          ? estimate.key === "solaire"
                            ? `${estimate.panelCount ?? 0} panneaux × ${formatTndAmount(
                                estimate.panelUnitPrice ?? 0,
                              )}`
                            : `${estimate.surface} m² · ${estimate.lines.length} articles`
                          : def.nature}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {estimate ? (
                        <span className="block text-xs font-bold tabular-nums text-primary">
                          {formatTndAmount(estimate.total)}
                        </span>
                      ) : (
                        <span className="block text-[10px] text-muted-foreground">
                          chiffré à l'ajout
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Sélecteur du nombre de panneaux solaires (1-5) ── */}
            {solarSelectorVisible ? (
              <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Sun className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-xs font-semibold">Nombre de panneaux solaires</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {SOLAR_PANEL_TYPE.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SOLAR_PANEL_COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={panelCount === n}
                      aria-label={`${n} panneau${n > 1 ? "x" : ""} solaire${n > 1 ? "s" : ""}`}
                      onClick={() => onChangeSolarPanels(n)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors",
                        panelCount === n
                          ? "border-primary/40 bg-primary text-primary-foreground"
                          : "border-border/50 bg-background hover:bg-muted/30",
                      )}
                    >
                      {n} panneau{n > 1 ? "x" : ""}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-semibold tabular-nums">
                  {solarWork
                    ? `${solarWork.panelCount} panneaux × ${formatTndAmount(
                        solarWork.panelUnitPrice ?? 0,
                      )} = ${formatTndAmount(solarWork.total)}`
                    : `${panelCount} panneaux × prix unitaire TTC posé d'un panneau (matériel + pose + raccordement)`}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Aucun métrage : le poste se chiffre uniquement au nombre de panneaux.
                </p>
              </div>
            ) : null}

            {/* ── Récapitulatif des travaux sélectionnés ── */}
            {hasWorks ? (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Travaux complémentaires sélectionnés
                </p>
                <ul className="space-y-1.5">
                  {selectedKeys.map((key) => {
                    const w = worksByKey.get(key);
                    if (!w) return null;
                    return (
                      <li
                        key={key}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-background px-2.5 py-2"
                      >
                        <CustomWorkIcon icon={w.icon} className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">{w.label}</span>
                        <span className="text-[10.5px] tabular-nums text-muted-foreground">
                          {w.key === "solaire"
                            ? `${w.panelCount ?? 0} panneaux × ${formatTndAmount(w.panelUnitPrice ?? 0)}`
                            : `${w.surface} m²`}{" "}
                          · {w.lines.length} article{w.lines.length > 1 ? "s" : ""}
                        </span>
                        <span className="ml-auto text-xs font-bold tabular-nums text-primary">
                          {formatTndAmount(w.total)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Retirer ${w.label}`}
                          className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onToggle(key)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  <span className="text-xs font-semibold">Total des travaux complémentaires</span>
                  <span className="text-sm font-bold tabular-nums text-primary">
                    {formatTndAmount(total)}
                  </span>
                </div>
                {baseTotal !== undefined && baseTotal > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      Coût total du scénario Personnalisé
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                      {formatTndAmount(baseTotal + total)}
                    </span>
                  </div>
                ) : null}
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Les travaux apparaissent dans le Quantitatif détaillé (catégorie «&nbsp;Travaux
                  personnalisés&nbsp;», juste avant «&nbsp;Aménagement extérieur&nbsp;») et sont
                  repris par le module Plans architecturaux AI comme besoins du projet.
                </p>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border/50 px-3 py-2.5 text-center text-[11px] text-muted-foreground">
                Aucun travail complémentaire : le scénario « Personnalisé » reste identique à son
                scénario de référence.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default ComplementaryWorksSection;
