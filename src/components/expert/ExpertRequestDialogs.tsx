import { useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import { CalendarClock, Check, ChevronDown, Clock, Loader2, Send, Wrench, Zap, AlertTriangle } from "lucide-react";
import {
  CUSTOM_APPOINTMENT_REASON,
  appointmentReasonOptions,
  isPresetAppointmentReason,
  validateAppointmentDraft,
  toDateInputValue,
  formatSlotLabel,
  DEFAULT_APPOINTMENT_TIME,
} from "@/lib/expertAvailability";
import { SPECIALTY_LABELS } from "./expertProfileOptions";
import {
  PROJECT_TYPE_LABELS,
  resolveProjectType,
} from "@/convex/projectTypes";

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
  project?: {
    _id?: string;
    name?: string;
    region?: string;
    /** Type de projet (slug) — affiché et transmis avec la demande. */
    category?: string | null;
    /** Surface du projet (m²) — affichée et transmise avec la demande. */
    surface?: number | null;
  } | null;
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

// ── Sélecteur d'heure compact (ouverture au clic, pensé mobile) ─────────────

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_OPTIONS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const TIME_PRESETS = ["08:00", "09:00", "10:00", "14:00", "16:00", "18:00"];

/** « HH:MM » normalisé — retombe sur l'heure par défaut si la valeur est invalide. */
function splitTimeValue(value: string): { hour: string; minute: string } {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? "").trim());
  if (!match) return { hour: "09", minute: "00" };
  return { hour: match[1].padStart(2, "0"), minute: match[2] };
}

/**
 * Champ « Heure souhaitée » : au clic, ouvre un sélecteur compact (préréglages +
 * colonnes heures/minutes défilables) entièrement utilisable au doigt sur mobile.
 * La valeur reste au format « HH:MM » attendu par `validateAppointmentDraft`.
 */
function TimePickerField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const { hour, minute } = splitTimeValue(value);

  // Fermeture au clic extérieur et sur Échap (sans fermer le dialogue parent).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  // Centre l'heure et la minute sélectionnées dans chaque colonne à l'ouverture.
  useEffect(() => {
    if (!open) return;
    for (const column of [hoursRef.current, minutesRef.current]) {
      if (!column) continue;
      const active = column.querySelector<HTMLElement>("[data-selected='true']");
      if (active) {
        column.scrollTop = active.offsetTop - column.clientHeight / 2 + active.clientHeight / 2;
      }
    }
  }, [open]);

  const minuteOptions = MINUTE_OPTIONS.includes(minute)
    ? MINUTE_OPTIONS
    : [...MINUTE_OPTIONS, minute].sort();

  const select = (nextHour: string, nextMinute: string, close = false) => {
    onChange(`${nextHour}:${nextMinute}`);
    if (close) setOpen(false);
  };

  const optionClass = (selected: boolean) =>
    cn(
      "flex min-h-8 w-full items-center justify-center rounded-md px-1 py-1.5 text-[11px] tabular-nums transition-colors touch-manipulation",
      selected
        ? "bg-blue-600 font-semibold text-white"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-95",
    );

  return (
    <div ref={containerRef} className="relative mt-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Heure souhaitée : ${hour}:${minute}`}
        className="flex h-9 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent px-2.5 text-xs shadow-xs outline-none transition-colors hover:border-primary/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"
      >
        <span className="flex items-center gap-1.5 tabular-nums">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {hour}:{minute}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
          <div className="flex flex-wrap gap-1">
            {TIME_PRESETS.map((preset) => {
              const active = preset === `${hour}:${minute}`;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    const { hour: h, minute: m } = splitTimeValue(preset);
                    select(h, m, true);
                  }}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums transition-all active:scale-95",
                    active
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-700"
                      : "border-border/50 bg-muted/25 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="min-w-0">
              <p className="mb-1 text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Heure
              </p>
              <div
                ref={hoursRef}
                className="relative max-h-[168px] overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-muted/20 p-1"
              >
                {HOUR_OPTIONS.map((option) => {
                  const selected = option === hour;
                  return (
                    <button
                      key={option}
                      type="button"
                      data-selected={selected}
                      aria-pressed={selected}
                      onClick={() => select(option, minute)}
                      className={optionClass(selected)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Minutes
              </p>
              <div
                ref={minutesRef}
                className="relative max-h-[168px] overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-muted/20 p-1"
              >
                {minuteOptions.map((option) => {
                  const selected = option === minute;
                  return (
                    <button
                      key={option}
                      type="button"
                      data-selected={selected}
                      aria-pressed={selected}
                      onClick={() => select(hour, option, true)}
                      className={optionClass(selected)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Check className="h-3 w-3 text-blue-600" />
            Sélection : {hour}:{minute}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Demande de rendez-vous ──────────────────────────────────────────────────

export function RequestAppointmentDialog({ expert, open, onOpenChange, project }: CommonProps) {
  const ensureAuth = useAuthGuard();
  const requestAppointment = useMutation(api.expertAvailability.requestAppointment);
  // Date pré-remplie avec le jour courant ; heure par défaut.
  const [date, setDate] = useState(() => toDateInputValue(Date.now()));
  const [time, setTime] = useState(DEFAULT_APPOINTMENT_TIME);
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
    setDate(today);
    setTime(DEFAULT_APPOINTMENT_TIME);
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
        // Informations du projet sélectionné, transmises automatiquement.
        projectCategory: project?.category || undefined,
        projectSurface: project?.surface ?? undefined,
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
          {/* Informations du projet sélectionné — récupérées automatiquement,
              jamais saisies par l'utilisateur. Masquées si aucun projet. */}
          {(project?.category || project?.surface) && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                Projet concerné
              </p>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                {project?.category && (
                  <div className="min-w-0">
                    <p className="text-[9px] text-muted-foreground">Type de projet</p>
                    <p className="text-[11px] font-semibold truncate">
                      {resolveProjectType(project.category)
                        ? PROJECT_TYPE_LABELS[resolveProjectType(project.category)!]
                        : project.category}
                    </p>
                  </div>
                )}
                {project?.surface ? (
                  <div className="min-w-0">
                    <p className="text-[9px] text-muted-foreground">Surface</p>
                    <p className="text-[11px] font-semibold truncate">{project.surface} m²</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
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

          {/* Empilé sur mobile : le sélecteur d'heure dispose ainsi de toute la largeur. */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              <TimePickerField value={time} onChange={setTime} disabled={sending} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Motif de la demande</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95 ${
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

// ── Demande de service ──────────────────────────────────────────────────────

/**
 * « Demander un service » — même modèle que la demande de devis (table
 * `expertServiceRequests`, `requestType: "service"`), accessible depuis les
 * recommandations IA comme depuis l'annuaire. Le contexte du projet est
 * repris automatiquement, jamais ressaisi.
 */
export function RequestServiceDialog({ expert, open, onOpenChange, project }: CommonProps) {
  const ensureAuth = useAuthGuard();
  const { user } = useAuth();
  const createServiceRequest = useMutation(api.expertServiceRequests.create);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [sending, setSending] = useState(false);

  // Pré-remplissage depuis le compte et le projet à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setDescription("");
    setPhone(user?.phone ?? "");
    setRegion(project?.region ?? "");
  }, [open, user?.phone, project?.region]);

  const handleSubmit = async () => {
    if (!expert || !ensureAuth()) return;
    if (!description.trim()) {
      toast.error("Décrivez le service souhaité");
      return;
    }
    if (!phone.trim()) {
      toast.error("Indiquez un numéro de téléphone joignable");
      return;
    }
    setSending(true);
    try {
      await createServiceRequest({
        expertId: expert._id as any,
        requestType: "service",
        serviceType: "service",
        description: description.trim(),
        projectId: (project?._id as any) || undefined,
        projectName: project?.name,
        projectType: project?.category || undefined,
        surface: project?.surface ?? undefined,
        region: region || undefined,
        userPhone: phone.trim(),
        userEmail: user?.email ?? "",
        userName: user?.name ?? "",
      });
      toast.success("Votre demande de service a été envoyée.", {
        description: `${expert.displayName} vous répondra dans votre messagerie.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erreur lors de l'envoi de la demande");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-emerald-600" />
            Demander un service
          </DialogTitle>
          <DialogDescription className="text-xs">
            Décrivez la prestation attendue de <b>{expert?.displayName}</b>. Il vous
            répondra directement dans votre messagerie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {project?.name && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                Projet concerné
              </p>
              <p className="text-[11px] font-semibold mt-0.5 truncate">{project.name}</p>
            </div>
          )}

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Service souhaité</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : étude de structure, suivi de chantier, installation électrique…"
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
                placeholder="Ex : Tunis"
                className="h-9 text-xs mt-1"
              />
            </div>
          </div>

          <Button
            className="w-full gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
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
