import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Loader2, Search, Users } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ============================================================================
// SUIVI DES ABONNEMENTS PAR UTILISATEUR
// ----------------------------------------------------------------------------
// Pour chaque compte : profil, état du forfait professionnel, essai, échéance,
// visibilité, droits Client Pro et solde de projets. Données calculées CÔTÉ
// SERVEUR (`clientProCredits.getSubscriptionFollowUp`) : l'interface ne décide
// jamais d'un droit.
// ============================================================================

const ROLE_LABELS: Record<string, string> = {
  client: "Client Pro",
  expert: "Expert",
  supplier: "Fournisseur",
};

const PROFESSIONAL_LABELS: Record<string, string> = {
  active: "Actif",
  trial: "Essai",
  expired: "Expiré",
  pending: "En attente",
  inactive: "Inactif",
};

const CLIENT_PRO_LABELS: Record<string, string> = {
  credits: "Crédits disponibles",
  credits_exhausted: "Crédits épuisés",
  legacy_monthly: "Mensuel historique",
  none: "Aucun droit",
};

function formatDate(value: number | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

export function SubscriptionFollowUp() {
  const rows = useQuery(api.clientProCredits.getSubscriptionFollowUp);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = (rows ?? []) as any[];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((row) =>
      [row.name, row.email, row.role].some((value) =>
        (value ?? "").toString().toLowerCase().includes(term),
      ),
    );
  }, [rows, search]);

  return (
    <section className="space-y-3 rounded-xl border border-border/40 bg-background/50 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Users className="h-4 w-4 text-primary" />
            Suivi des abonnements et des crédits
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Forfait professionnel, essai, échéance, visibilité et solde de projets Client Pro.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom ou un e-mail…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </header>

      {rows === undefined ? (
        <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement du suivi…
        </div>
      ) : filtered.length === 0 ? (
        <p className="p-4 text-xs text-muted-foreground">Aucun compte ne correspond à la recherche.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-border/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Utilisateur</th>
                <th className="px-2 py-2 font-medium">Profil</th>
                <th className="px-2 py-2 font-medium">Forfait professionnel</th>
                <th className="px-2 py-2 font-medium">Essai / échéance</th>
                <th className="px-2 py-2 font-medium">Visibilité</th>
                <th className="px-2 py-2 font-medium">Client Pro</th>
                <th className="px-2 py-2 font-medium">Projets (restants)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={String(row.userId)} className="border-b border-border/15 align-top">
                  <td className="px-2 py-2">
                    <p className="font-medium">{row.name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{row.email || "—"}</p>
                  </td>
                  <td className="px-2 py-2">
                    {row.role ? (ROLE_LABELS[row.role] ?? row.role) : "Standard"}
                  </td>
                  <td className="px-2 py-2">
                    {row.professionalStatus ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px]",
                          row.professionalStatus === "active" &&
                            "border-emerald-500/30 text-emerald-600",
                          row.professionalStatus === "trial" &&
                            "border-blue-500/30 text-blue-600",
                          row.professionalStatus === "expired" &&
                            "border-amber-500/30 text-amber-600",
                        )}
                      >
                        {PROFESSIONAL_LABELS[row.professionalStatus] ?? row.professionalStatus}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-[10px] text-muted-foreground">
                    {row.professionalStatus === "trial"
                      ? `${formatDate(row.trialStartDate)} → ${formatDate(row.trialEndDate)}`
                      : formatDate(row.professionalEndDate)}
                  </td>
                  <td className="px-2 py-2">
                    {row.visible === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : row.visible ? (
                      <Badge className="border-emerald-200/30 bg-emerald-500/10 text-[9px] text-emerald-600">
                        Visible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">
                        Masqué
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <p>{CLIENT_PRO_LABELS[row.clientProStatus] ?? row.clientProStatus}</p>
                    {row.pendingCotisation ? (
                      <p className="text-[9px] text-amber-600">
                        {row.pendingCotisation} projet(s) en attente de paiement
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <span className="font-semibold">{row.clientProRemaining}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {row.clientProGranted} ({row.clientProUsed} utilisés)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default SubscriptionFollowUp;
