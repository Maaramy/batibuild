import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, Loader2, Send, Zap, AlertTriangle } from "lucide-react";
import {
  CUSTOM_APPOINTMENT_REASON,
  appointmentReasonOptions,
  isPresetAppointmentReason,
  validateAppointmentDraft,
  toDateInputValue,
  formatSlotLabel,
} from "@/lib/expertAvailability";
import { SPECIALTY_LABELS } from "./expertProfileOptions";

// ============================================================================
// DEMANDES CLIENT → EXPERT (ProMarket)
//
// Deux dialogues réutilisables depuis l'annuaire ProMarket et la fiche expert :
//   • RequestAppointmentDialog — date / heure / motif / message (statut pending)
//   • RequestUrgentDialog      — demande d'intervention rapide (experts éligibles)
//
// La validation est partagée avec le backend (`validateAppointmentDraft`) : les
// mêmes règles s'appliquent des deux côtés.
// ============================================================================

interface ExpertTarget {
  _id: string;
  displayName: string;
  availabilityDetails?: string | null;
  profession?: string | null;
  specialties?: string[] | null;
}

interface CommonProps {
  expert: ExpertTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contexte optionnel du projet (navigation depuis un projet). */
  project?: { _id?: string; name?: string; region?: string } | null;
}

function useAuthGuard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return () => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return false;
    }
    return true;
  };
}

// ── Demande de rendez-vous ──────────────────────────────────────────────────

export function RequestAppointmentDialog({ expert, open, onOpenChange, project }: CommonProps) {
  const ensureAuth = useAuthGuard();
  const requestAppointment = useMutation(api.expertAvailability.requestAppointment);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const reasonInputRef = useRef<HTMLInputElement>(null);

  const today = toDateInputValue(Date.now());

  // Motifs prêts à sélectionner : métier + spécialités réelles de l'expert,
  // puis motifs génériques, et enfin le choix libre.
  const reasonOptions = useMemo(
    () =>
      appointmentReasonOptions({
        profession: expert?.profession,
        specialties: (expert?.specialties ?? []).map((s) => SPECIALTY_LABELS[s] ?? s),
      }),
    [expert?.profession, expert?.specialties],
  );

  const presetReasons = reasonOptions.filter((r) => r !== CUSTOM_APPOINTMENT_REASON);
  // Le motif proposé actuellement retenu (vide si l'utilisateur écrit le sien).
  const activePreset = isPresetAppointmentReason(reason, presetReasons) ? reason.trim() : "";

  const pickReason = (value: string) => {
    if (value === CUSTOM_APPOINTMENT_REASON) {
      setReason("");
      requestAnimationFrame(() => reasonInputRef.current?.focus());
      return;
    }
    setReason(value);
  };

  const reset = () => {
    setDate("");
    setTime("09:00");
    setReason("");
    setMessage("");
  };

  const handleSubmit = async () => {
    if (!expert || !ensureAuth()) return;
    const validation = validateAppointmentDraft({ date, time, reason });
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    setSending(true);
    try {
      await requestAppointment({
        expertId: expert._id as any,
        preferredDate: validation.preferredDate,
        preferredTime: validation.preferredTime,
        reason: reason.trim(),
        message: message.trim() || undefined,
        projectId: (project?._id as any) || undefined,
        projectName: project?.name,
      });
      toast.success("Votre demande de rendez-vous a été envoyée au professionnel.", {
        description: `${expert.displayName} — ${formatSlotLabel(
          validation.preferredDate,
          validation.preferredTime,
        )}`,
      });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de l'envoi de la demande");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            Demander un rendez-vous
          </DialogTitle>
          <DialogDescription className="text-xs">
            Proposez une date et une heure à <b>{expert?.displayName}</b>. Le rendez-vous
            n'est confirmé qu'après son approbation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {expert?.availabilityDetails && (
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                Disponibilités indiquées
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-line">
                {expert.availabilityDetails}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Date souhaitée</label>
              <Input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Heure souhaitée</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Motif de la demande</label>
            {/* Motifs sur une seule ligne, défilement horizontal si besoin */}
            <div className="mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-none pb-1">
              {[...presetReasons, CUSTOM_APPOINTMENT_REASON].map((option) => {
                const isCustom = option === CUSTOM_APPOINTMENT_REASON;
                const active = isCustom
                  ? activePreset === "" && reason.trim().length > 0
                  : activePreset === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pickReason(option)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95 ${
                      active
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-700"
                        : "border-border/50 bg-muted/25 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <Input
              ref={reasonInputRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ou précisez votre motif…"
              className="h-9 text-xs mt-2"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">
              Message complémentaire (optionnel)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Précisez votre projet, l'adresse, vos disponibilités…"
              className="text-xs min-h-[80px] rounded-xl mt-1"
            />
          </div>

          <Button
            className="w-full gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
            disabled={sending}
            onClick={handleSubmit}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Envoi en cours…" : "Envoyer la demande"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Demande urgente ─────────────────────────────────────────────────────────

export function RequestUrgentDialog({ expert, open, onOpenChange, project }: CommonProps) {
  const ensureAuth = useAuthGuard();
  const { user } = useAuth();
  const requestUrgent = useMutation(api.expertAvailability.requestUrgent);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState(project?.region ?? "");
  const [sending, setSending] = useState(false);

  const reset = () => {
    setDescription("");
    setPhone("");
  };

  const handleSubmit = async () => {
    if (!expert || !ensureAuth()) return;
    if (!description.trim()) {
      toast.error("Décrivez votre besoin urgent");
      return;
    }
    if (!phone.trim()) {
      toast.error("Indiquez un numéro de téléphone joignable");
      return;
    }
    setSending(true);
    try {
      await requestUrgent({
        expertId: expert._id as any,
        description: description.trim(),
        region: region || undefined,
        projectId: (project?._id as any) || undefined,
        projectName: project?.name,
        userPhone: phone.trim(),
        userEmail: user?.email ?? undefined,
        userName: user?.name ?? undefined,
      });
      toast.success("Demande urgente envoyée au professionnel.", {
        description: `${expert.displayName} vous répondra dès que possible.`,
      });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de l'envoi de la demande");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-600" />
            Demande urgente
          </DialogTitle>
          <DialogDescription className="text-xs">
            <b>{expert?.displayName}</b> accepte les interventions rapides. Décrivez le
            problème : la décision vous sera communiquée immédiatement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              À réserver aux situations nécessitant une intervention rapide.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Besoin urgent</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : fuite d'eau importante, panne électrique…"
              className="text-xs min-h-[90px] rounded-xl mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Téléphone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+216 XX XXX XXX"
                className="h-9 text-xs mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Région</label>
              <Input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Ex : Beja"
                className="h-9 text-xs mt-1"
              />
            </div>
          </div>

          <Button
            className="w-full gap-1.5 text-xs bg-amber-600 hover:bg-amber-700"
            disabled={sending}
            onClick={handleSubmit}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {sending ? "Envoi en cours…" : "Envoyer la demande"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
