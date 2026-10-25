import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Search,
  Loader2,
  RotateCcw,
  Mail,
  MailCheck,
  MailX,
  Clock,
  BarChart3,
  TrendingUp,
  History,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const inputCls =
  "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30";

const EVENT_LABELS: Record<string, string> = {
  subscription_activated: "Abonnement activé",
  subscription_renewed: "Abonnement renouvelé",
  subscription_expired: "Abonnement expiré",
  payment_confirmed: "Paiement confirmé",
  payment_rejected: "Paiement refusé",
  subscription_suspended: "Abonnement suspendu",
  subscription_canceled: "Abonnement annulé",
  // Demandes — utilisateur → professionnel
  quote_request_sent: "Demande de devis Fournisseur",
  service_request_sent: "Demande de service Expert",
  expert_quote_request: "Demande de devis Expert",
  expert_appointment_request: "Demande de rendez-vous Expert",
  expert_urgent_request: "Demande urgente Expert",
  // Réponses & changements de statut — professionnel → utilisateur
  quote_received: "Réponse du Fournisseur (devis)",
  service_received: "Réponse de l'Expert (service)",
  expert_quote_received: "Réponse de l'Expert (devis)",
  expert_appointment_response: "Rendez-vous Expert — réponse / statut",
  expert_urgent_response: "Demande urgente Expert — réponse / statut",
  // Notifications administrateur
  admin_new_user: "Administrateur — nouvelle inscription",
  admin_new_subscription: "Administrateur — nouvel abonnement",
  admin_new_project: "Administrateur — nouveau projet",
};

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  sent: { label: "Envoyé", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" },
  failed: { label: "Échec", cls: "border-red-500/30 bg-red-500/10 text-red-600", dot: "bg-red-500" },
  pending: { label: "En attente", cls: "border-amber-500/30 bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
};

function formatDate(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmailHistory() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [templateKey, setTemplateKey] = useState("all");
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const history = useQuery(api.emailHistory.listEmailHistory, {
    search: debouncedSearch || undefined,
    status: status as any,
    templateKey: templateKey === "all" ? undefined : templateKey,
  }) || [];
  const stats = useQuery(api.emailHistory.getEmailStats);

  const resend = useMutation(api.emailHistory.adminResendEmail);

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      await resend({ historyId: id as any });
      toast.success("🔁 E-mail relancé — vérifiez son statut dans quelques instants");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du renvoi");
    }
    setResendingId(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard icon={Mail} label="Total envoyés" value={stats?.total ?? 0} color="text-primary" />
        <StatCard icon={MailCheck} label="Réussis" value={stats?.sent ?? 0} color="text-emerald-600" />
        <StatCard icon={MailX} label="Échecs" value={stats?.failed ?? 0} color="text-red-600" />
        <StatCard icon={Clock} label="En attente" value={stats?.pending ?? 0} color="text-amber-600" />
        <StatCard
          icon={TrendingUp}
          label="Taux de réussite"
          value={stats ? `${stats.successRate}%` : "—"}
          color="text-blue-600"
        />
      </div>

      {/* Last send + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-1 border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dernier envoi</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.lastSentAt ? (
              <div className="space-y-1">
                <p className="text-lg font-bold">{formatDate(stats.lastSentAt)}</p>
                <p className="text-xs text-muted-foreground truncate">{stats.lastSentTo}</p>
                <p className="text-xs text-muted-foreground truncate">« {stats.lastSentSubject} »</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun e-mail envoyé pour le moment.</p>
            )}
            <div className="mt-4 rounded-lg border border-border/30 bg-muted/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
              <p className="font-medium mb-1">💡 Rappel</p>
              Les notifications partent automatiquement lors des événements d'abonnement (activation, renouvellement, expiration, paiements…). Pour un envoi manuel de test, utilisez l'onglet <b>Configuration E-mail</b>.
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Activité des 14 derniers jours
            </CardTitle>
            <CardDescription className="text-xs">Envoyés (vert) vs échecs (rouge)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.series ?? []} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => {
                      const dt = new Date(d + "T00:00:00");
                      return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
                    }}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(124,58,237,0.06)" }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid rgba(124,58,237,0.2)",
                      fontSize: 12,
                      background: "rgba(255,255,255,0.95)",
                    }}
                    formatter={(value: any, name: any) => [value, name === "sent" ? "Envoyés" : "Échecs"]}
                  />
                  <Bar dataKey="sent" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="failed" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Historique des envois
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (destinataire, objet…)"
                className={inputCls + " pl-9"}
              />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="all">Tous les statuts</option>
              <option value="sent">Envoyés</option>
              <option value="failed">Échecs</option>
              <option value="pending">En attente</option>
            </select>
            <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className={inputCls}>
              <option value="all">Tous les types</option>
              {Object.entries(EVENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 py-12 text-center">
              <Mail className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun e-mail ne correspond à ces critères.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                L'historique se remplit automatiquement dès qu'une notification est envoyée.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Destinataire</th>
                    <th className="py-2 pr-3 font-medium">Objet</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Statut</th>
                    <th className="py-2 pr-3 font-medium">Détail</th>
                    <th className="py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any) => {
                    const meta = STATUS_META[h.status] || STATUS_META.pending;
                    return (
                      <tr key={h._id} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                          {formatDate(h.createdAt)}
                        </td>
                        <td className="py-2.5 pr-3">
                          <p className="text-xs font-medium">{h.recipientName || "—"}</p>
                          <p className="text-[11px] text-muted-foreground">{h.to}</p>
                        </td>
                        <td className="py-2.5 pr-3 max-w-[220px]">
                          <p className="text-xs truncate" title={h.subject}>{h.subject}</p>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="text-[11px] text-muted-foreground">
                            {EVENT_LABELS[h.templateKey] || h.templateKey}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge className={`gap-1 border ${meta.cls}`} variant="outline">
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 max-w-[180px]">
                          {h.error ? (
                            <p className="text-[11px] text-red-600 truncate" title={h.error}>{h.error}</p>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          {(h.status === "failed" || h.status === "pending") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={resendingId === h._id}
                              onClick={() => handleResend(h._id)}
                              className="gap-1.5 text-primary hover:text-primary"
                            >
                              {resendingId === h._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">Renvoi</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
      <CardContent className="p-3 sm:p-4">
        <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-muted/30 border border-border/30`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className="text-lg sm:text-xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
