import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  CalendarClock, Check, Clock, Loader2, Mail, Phone, User, X, Zap, CheckCircle2,
} from "lucide-react";
import {
  appointmentStatusMeta,
  formatSlotLabel,
  isDecidableRequest,
  urgentStatusMeta,
} from "@/lib/expertAvailability";

// ============================================================================
// BOÎTE DE RÉCEPTION EXPERT — demandes de rendez-vous & demandes urgentes
//
// Rendues dans l'espace expert (`/dashboard/expert`). Les listes sont des
// souscriptions Convex : la décision (Approuver / Décliner, Accepter / Refuser)
// met à jour le statut et notifie immédiatement le client.
// ============================================================================

type Filter = "pending" | "all";

const fmtCreated = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function ExpertAvailabilityInbox() {
  const appointments = useQuery(api.expertAvailability.getExpertAppointments);
  const urgentRequests = useQuery(api.expertAvailability.getExpertUrgentRequests);
  const respondAppointment = useMutation(api.expertAvailability.respondAppointment);
  const respondUrgent = useMutation(api.expertAvailability.respondUrgent);
  const markAllRead = useMutation(api.expertAvailability.markAllRead);

  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  // La consultation de la boîte éteint le badge rouge, comme pour les devis.
  useEffect(() => {
    if (
      appointments?.some((a) => a.readAt === undefined) ||
      urgentRequests?.some((u) => u.readAt === undefined)
    ) {
      markAllRead();
    }
  }, [appointments, urgentRequests, markAllRead]);

  const visibleAppointments = useMemo(() => {
    const list = appointments ?? [];
    return filter === "pending" ? list.filter((a) => a.status === "pending") : list;
  }, [appointments, filter]);

  const visibleUrgent = useMemo(() => {
    const list = urgentRequests ?? [];
    return filter === "pending" ? list.filter((u) => u.status === "pending") : list;
  }, [urgentRequests, filter]);

  const pendingCount =
    (appointments ?? []).filter((a) => a.status === "pending").length +
    (urgentRequests ?? []).filter((u) => u.status === "pending").length;

  const decideAppointment = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      await respondAppointment({ appointmentId: id as any, approve });
      toast.success(approve ? "Rendez-vous confirmé — client notifié" : "Demande déclinée — client notifié");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setBusyId(null);
    }
  };

  const decideUrgent = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      await respondUrgent({ urgentId: id as any, accept });
      toast.success(accept ? "Urgence acceptée — client notifié" : "Urgence refusée — client notifié");
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setBusyId(null);
    }
  };

  if (appointments === undefined || urgentRequests === undefined) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtre + compteur */}
      <div className="flex items-center gap-2">
        {(["pending", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              filter === f
                ? "bg-violet-600 text-white"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {f === "pending" ? "En attente" : "Historique"}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[9px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Rendez-vous */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            Demandes de rendez-vous ({visibleAppointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleAppointments.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-muted-foreground">
              {filter === "pending"
                ? "Aucune demande de rendez-vous en attente."
                : "Aucune demande de rendez-vous."}
            </p>
          ) : (
            visibleAppointments.map((a) => {
              const meta = appointmentStatusMeta(a.status);
              const decidable = isDecidableRequest(a.status);
              return (
                <div key={a._id} className="rounded-xl border border-border/30 bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold">
                          {formatSlotLabel(a.preferredDate, a.preferredTime)}
                        </p>
                        <Badge className={`text-[9px] border ${meta.chip}`}>{meta.label}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Motif : {a.reason} · demande du {fmtCreated(a.createdAt)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {a.userName && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-2.5 w-2.5" /> {a.userName}
                          </span>
                        )}
                        {a.userPhone && (
                          <a href={`tel:${a.userPhone}`} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                            <Phone className="h-2.5 w-2.5" /> {a.userPhone}
                          </a>
                        )}
                        {a.userEmail && (
                          <a href={`mailto:${a.userEmail}`} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                            <Mail className="h-2.5 w-2.5" /> {a.userEmail}
                          </a>
                        )}
                      </div>
                      {a.message && (
                        <p className="mt-1.5 text-[11px] italic text-muted-foreground line-clamp-3">
                          « {a.message} »
                        </p>
                      )}
                    </div>
                  </div>

                  {decidable ? (
                    <div className="mt-2.5 flex gap-2 border-t border-border/10 pt-2.5">
                      <Button
                        size="sm"
                        className="h-7 flex-1 gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-700"
                        disabled={busyId === a._id}
                        onClick={() => decideAppointment(a._id, true)}
                      >
                        {busyId === a._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 gap-1 text-[10px] border-red-500/30 text-red-600 hover:bg-red-500/5"
                        disabled={busyId === a._id}
                        onClick={() => decideAppointment(a._id, false)}
                      >
                        <X className="h-3 w-3" /> Décliner
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" /> Décision enregistrée le{" "}
                      {a.decidedAt ? fmtCreated(a.decidedAt) : "—"}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Urgences */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            Demandes urgentes ({visibleUrgent.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleUrgent.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-muted-foreground">
              {filter === "pending"
                ? "Aucune demande urgente en attente."
                : "Aucune demande urgente."}
            </p>
          ) : (
            visibleUrgent.map((u) => {
              const meta = urgentStatusMeta(u.status);
              const decidable = isDecidableRequest(u.status);
              return (
                <div key={u._id} className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-600" /> Intervention rapide
                    </p>
                    <Badge className={`text-[9px] border ${meta.chip}`}>{meta.label}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{u.description}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {u.userName && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <User className="h-2.5 w-2.5" /> {u.userName}
                      </span>
                    )}
                    <a href={`tel:${u.userPhone}`} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                      <Phone className="h-2.5 w-2.5" /> {u.userPhone}
                    </a>
                    {u.region && <span className="text-[10px] text-muted-foreground">📍 {u.region}</span>}
                    <span className="text-[10px] text-muted-foreground">
                      {fmtCreated(u.createdAt)}
                    </span>
                  </div>

                  {decidable ? (
                    <div className="mt-2.5 flex gap-2 border-t border-amber-500/15 pt-2.5">
                      <Button
                        size="sm"
                        className="h-7 flex-1 gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-700"
                        disabled={busyId === u._id}
                        onClick={() => decideUrgent(u._id, true)}
                      >
                        {busyId === u._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 gap-1 text-[10px] border-red-500/30 text-red-600 hover:bg-red-500/5"
                        disabled={busyId === u._id}
                        onClick={() => decideUrgent(u._id, false)}
                      >
                        <X className="h-3 w-3" /> Refuser
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" /> Décision enregistrée le{" "}
                      {u.decidedAt ? fmtCreated(u.decidedAt) : "—"}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
