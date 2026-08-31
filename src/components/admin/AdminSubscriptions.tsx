import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Users,
  Gift,
  Settings,
  CreditCard,
} from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  free: "Client",
  pro: "Client Pro",
  expert: "Expert",
  supplier: "Fournisseur",
};

const PLAN_PRICES: Record<string, string> = {
  free: "80 TND/mois",
  pro: "80 TND/mois",
  expert: "120 TND/mois",
  supplier: "120 TND/mois",
};

function formatDate(ts?: number | null): string {
  if (!ts) return "—";
  try {
    return format(new Date(ts), "dd MMM yyyy", { locale: fr });
  } catch {
    return "—";
  }
}

function getSubStatus(sub: any): { label: string; color: string; icon: any } {
  const now = Date.now();
  const isExpired = sub.endDate && sub.endDate < now;
  
  if (sub.isTrial) {
    if (isExpired) return { label: "Essai terminé · Paiement requis", color: "text-orange-600 bg-orange-50", icon: AlertTriangle };
    return { label: "Essai gratuit", color: "text-blue-600 bg-blue-50", icon: Gift };
  }
  if (sub.status === "pending") return { label: "En attente", color: "text-yellow-600 bg-yellow-50", icon: Clock };
  if (sub.status === "canceled") return { label: "Annulé", color: "text-red-600 bg-red-50", icon: XCircle };
  if (sub.status === "expired" || isExpired) return { label: "Renouvellement requis", color: "text-orange-600 bg-orange-50", icon: AlertTriangle };
  if (sub.status === "active") return { label: "Actif", color: "text-green-600 bg-green-50", icon: CheckCircle };
  return { label: sub.status, color: "text-gray-600 bg-gray-50", icon: Clock };
}

export default function AdminSubscriptions() {
  const subscriptions = useQuery(api.subscriptions.getAllSubscriptionsWithUsers);
  const renewSubscription = useMutation(api.subscriptions.adminRenewSubscription);
  const approveSubscription = useMutation(api.subscriptions.adminApproveSubscription);
  const rejectSubscription = useMutation(api.subscriptions.adminRejectSubscription);
  const updateTrialConfig = useMutation(api.subscriptions.adminUpdateTrialConfig);
  const pricing = useQuery(api.payments.getPlanPricing);
  
  const [search, setSearch] = useState("");
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialDays, setTrialDays] = useState(60);
  const [loadingRenew, setLoadingRenew] = useState<Id<"subscriptions"> | null>(null);
  const [loadingApprove, setLoadingApprove] = useState<Id<"subscriptions"> | null>(null);
  const [loadingReject, setLoadingReject] = useState<Id<"subscriptions"> | null>(null);

  if (!subscriptions) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const filtered = subscriptions.filter((sub: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      sub.user?.name?.toLowerCase().includes(q) ||
      sub.user?.email?.toLowerCase().includes(q) ||
      sub.plan?.toLowerCase().includes(q)
    );
  });

  // Stats
  const total = subscriptions.length;
  const active = subscriptions.filter((s: any) => s.status === "active" && !s.isTrial).length;
  const trials = subscriptions.filter((s: any) => s.isTrial).length;
  const pending = subscriptions.filter((s: any) => s.status === "pending").length;
  const now = Date.now();
  const needsRenewal = subscriptions.filter((s: any) => 
    s.status === "active" && s.endDate && s.endDate < now
  ).length;

  async function handleRenew(subId: Id<"subscriptions">) {
    setLoadingRenew(subId);
    try {
      await renewSubscription({ subscriptionId: subId });
      toast.success("Abonnement renouvelé avec succès");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du renouvellement");
    } finally {
      setLoadingRenew(null);
    }
  }

  async function handleApprove(subId: Id<"subscriptions">) {
    setLoadingApprove(subId);
    try {
      await approveSubscription({ subscriptionId: subId });
      toast.success("Abonnement approuvé");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'approbation");
    } finally {
      setLoadingApprove(null);
    }
  }

  async function handleReject(subId: Id<"subscriptions">) {
    setLoadingReject(subId);
    try {
      await rejectSubscription({ subscriptionId: subId });
      toast.success("Abonnement rejeté");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du rejet");
    } finally {
      setLoadingReject(null);
    }
  }

  async function handleUpdateTrial() {
    try {
      await updateTrialConfig({ trialEnabled, trialDurationDays: trialDays });
      toast.success("Configuration de l'essai mise à jour");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la mise à jour");
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Total
          </div>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            Actifs
          </div>
          <p className="text-2xl font-bold text-green-600">{active}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gift className="h-4 w-4" />
            Essais
          </div>
          <p className="text-2xl font-bold text-blue-600">{trials}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            À renouveler
          </div>
          <p className="text-2xl font-bold text-orange-600">{needsRenewal}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            En attente
          </div>
          <p className="text-2xl font-bold text-yellow-600">{pending}</p>
        </div>
      </div>

      {/* Trial Config */}
      <div className="border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5" />
          <h3 className="font-semibold">Période d'essai gratuite</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trialEnabled}
              onChange={(e) => setTrialEnabled(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">Essai gratuit activé</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Durée :</label>
            <input
              type="number"
              min={1}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(parseInt(e.target.value) || 60)}
              className="w-20 border rounded px-2 py-1 text-sm"
            />
            <span className="text-sm text-muted-foreground">jours</span>
          </div>
          <button
            onClick={handleUpdateTrial}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 cursor-pointer"
          >
            Enregistrer
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Tous les profils (Client, Fournisseur, Expert) bénéficient de {trialDays} jours d'essai gratuit à l'inscription quand activé. Passage au paiement obligatoire à l'issue de l'essai.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Rechercher un abonnement..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-md px-3 py-2 text-sm"
        />
      </div>

      {/* Subscriptions Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-left p-3 font-medium">Forfait</th>
                <th className="text-left p-3 font-medium">Prix</th>
                <th className="text-left p-3 font-medium">Début</th>
                <th className="text-left p-3 font-medium">Échéance</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Montant</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub: any) => {
                const status = getSubStatus(sub);
                const StatusIcon = status.icon;
                return (
                  <tr key={sub._id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{sub.user?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{sub.user?.email || "—"}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium">{PLAN_LABELS[sub.plan] || sub.plan}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {PLAN_PRICES[sub.plan] || "—"}
                    </td>
                    <td className="p-3">{formatDate(sub.startDate)}</td>
                    <td className="p-3">
                      <span className={sub.endDate && sub.endDate < Date.now() ? "text-orange-600 font-medium" : ""}>
                        {formatDate(sub.endDate)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="p-3">
                      {sub.amount ? `${sub.amount} ${sub.currency || "TND"}` : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {(sub.status === "active" && sub.endDate && sub.endDate < Date.now()) && (
                          <button
                            onClick={() => handleRenew(sub._id)}
                            disabled={loadingRenew === sub._id}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 cursor-pointer disabled:opacity-50"
                          >
                            {loadingRenew === sub._id ? "..." : "Renouveler"}
                          </button>
                        )}
                        {sub.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(sub._id)}
                              disabled={loadingApprove === sub._id}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 cursor-pointer disabled:opacity-50"
                            >
                              {loadingApprove === sub._id ? "..." : "Approuver"}
                            </button>
                            <button
                              onClick={() => handleReject(sub._id)}
                              disabled={loadingReject === sub._id}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 cursor-pointer disabled:opacity-50"
                            >
                              {loadingReject === sub._id ? "..." : "Rejeter"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Aucun abonnement trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules reminder */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <h4 className="font-medium text-sm mb-2">Règles de gestion</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Essai gratuit : {trialDays} jours d'accès gratuit à l'inscription (quand activé).</li>
          <li>• Après l'essai, le passage au paiement est obligatoire pour continuer à utiliser la plateforme.</li>
          <li>• Renouvellement requis dès dépassement de la date d'échéance.</li>
          <li>• Forfaits mensuels : Client 80 TND, Fournisseur 120 TND, Expert 120 TND.</li>
        </ul>
      </div>
    </div>
  );
}
