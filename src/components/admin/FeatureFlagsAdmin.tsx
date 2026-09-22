import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Cpu, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// GESTION DES FONCTIONNALITÉS (feature flags) — espace administrateur
// ============================================================================
// Chaque fonctionnalité majeure peut être activée/désactivée par un
// interrupteur : désactivée = totalement masquée côté utilisateur (routes,
// menus, cartes, CTA), sans aucune suppression de code. La modification est
// vérifiée côté serveur et journalisée (adminLogs).
//
// Déploiement progressif : les flags marqués « progressifs » (ex. rendu 3D
// amélioré) exposent un contrôle tri-état OFF / BÊTA / ON en plus de
// l'interrupteur binaire. BÊTA permet de tester le nouveau rendu, OFF ramène
// instantanément à l'ancien rendu — jamais de suppression de fonctionnalité.

type FlagMode = "off" | "beta" | "on";

export function FeatureFlagsAdmin() {
  const flags = useQuery(api.featureFlags.getAllFlags);
  const setFlag = useMutation(api.featureFlags.setFlag);
  const setFlagMode = useMutation(api.featureFlags.setFlagMode);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleToggle = async (key: string, name: string, next: boolean) => {
    setPendingKey(key);
    try {
      await setFlag({ key, enabled: next });
      toast.success(
        next
          ? "Fonctionnalité activée avec succès"
          : "Fonctionnalité désactivée avec succès",
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la modification");
    } finally {
      setPendingKey(null);
    }
  };

  const handleMode = async (key: string, name: string, mode: FlagMode) => {
    setPendingKey(key);
    try {
      await setFlagMode({ key, mode });
      toast.success(
        mode === "off"
          ? `« ${name} » : ancien rendu rétabli (OFF)`
          : mode === "beta"
            ? `« ${name} » : test bêta activé (BÊTA)`
            : `« ${name} » : déployé pour tous (ON)`,
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la modification");
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Gestion des fonctionnalités</h2>
          <p className="text-xs text-muted-foreground">
            Activez ou désactivez les modules de la plateforme. Une
            fonctionnalité désactivée disparaît entièrement de l'interface
            utilisateur — elle réapparaît dès réactivation, sans perte de
            données.
          </p>
        </div>
      </div>

      {flags === undefined ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : flags === null ? (
        <Card className="border-border/40">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Accès réservé aux administrateurs.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Fonctionnalités & Services
            </CardTitle>
            <CardDescription className="text-xs">
              {flags.filter((f) => f.enabled).length} activée(s) sur{" "}
              {flags.length} — les changements sont appliqués immédiatement à
              tous les utilisateurs.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/30 pt-0">
            {flags.map((flag) => {
              const progressive =
                (flag as { progressive?: boolean }).progressive === true;
              const mode = (flag as { mode?: FlagMode }).mode ?? "off";
              return (
                <div
                  key={flag.key}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {flag.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          flag.enabled
                            ? "shrink-0 border-emerald-500/25 bg-emerald-500/10 text-[9px] text-emerald-600"
                            : "shrink-0 border-border/40 bg-muted/40 text-[9px] text-muted-foreground"
                        }
                      >
                        {flag.enabled ? "● Activé" : "○ Désactivé"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {flag.description}
                    </p>
                    {flag.updatedAt && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                        Modifiée le{" "}
                        {new Date(flag.updatedAt).toLocaleString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {pendingKey === flag.key && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    {progressive && (
                      <div
                        className="inline-flex rounded-md border border-border/60 p-0.5"
                        role="group"
                        aria-label={`Mode de déploiement : ${flag.name}`}
                      >
                        {(
                          [
                            ["off", "OFF"],
                            ["beta", "BÊTA"],
                            ["on", "ON"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            disabled={pendingKey === flag.key}
                            onClick={() => handleMode(flag.key, flag.name, value)}
                            className={cn(
                              "rounded px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-50",
                              mode === value
                                ? value === "off"
                                  ? "bg-muted text-foreground"
                                  : value === "beta"
                                    ? "bg-amber-500/90 text-white"
                                    : "bg-emerald-600 text-white"
                              : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    <Switch
                      checked={flag.enabled}
                      disabled={pendingKey === flag.key}
                      onCheckedChange={(checked) =>
                        handleToggle(flag.key, flag.name, checked)
                      }
                      aria-label={`${flag.enabled ? "Désactiver" : "Activer"} ${flag.name}`}
                      className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-input"
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
