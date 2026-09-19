import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, Send, Zap, AlertTriangle } from "lucide-react";
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

  // ── Motifs en mode carrousel : une ligne, flèches ◀ ▶ et pastilles ──
  // Chaque motif est une « diapositive » ; le motif actif est celui aligné à
  // gauche du carrousel (snap), comme dans les autres carrousels de BatiBuild.
  const reasonSlides = [...presetReasons, CUSTOM_APPOINTMENT_REASON];
  const reasonRowRef = useRef<HTMLDivElement>(null);
  const [reasonNav, setReasonNav] = useState({ back: false, forward: false });
  const [reasonIndex, setReasonIndex] = useState(0);

  /** Décalage du motif par rapport au bord gauche du carrousel. */
  const reasonOffset = useCallback((slide: HTMLElement) => {
    const el = reasonRowRef.current;
    if (!el) return 0;
    return slide.getBoundingClientRect().left - el.getBoundingClientRect().left;
  }, []);

  const syncReasonNav = useCallback(() => {
    const el = reasonRowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const back = el.scrollLeft > 4;
    const forward = max > 4 && el.scrollLeft < max - 4;
    // Le défilement émet beaucoup d'événements : on ne re-rend que si l'état
    // des flèches change réellement.
    setReasonNav((prev) =>
      prev.back === back && prev.forward === forward ? prev : { back, forward },
    );

    // Motif le plus proche du bord gauche → pastille active.
    let nearest = 0;
    let best = Number.POSITIVE_INFINITY;
    Array.from(el.children).forEach((child, index) => {
      const delta = Math.abs(reasonOffset(child as HTMLElement));
      if (delta < best) {
        best = delta;
        nearest = index;
      }
    });
    setReasonIndex((prev) => (prev === nearest ? prev : nearest));
  }, [reasonOffset]);

  /** Flèches : avance d'environ un écran de motifs. */
  const scrollReasons = useCallback((direction: -1 | 1) => {
    const el = reasonRowRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(140, el.clientWidth * 0.75),
      behavior: "smooth",
    });
  }, []);

  /** Pastille cliquable : amène son motif en tête du carrousel. */
  const scrollToReason = useCallback(
    (index: number) => {
      const el = reasonRowRef.current;
      const slide = el?.children[index] as HTMLElement | undefined;
      if (!el || !slide) return;
      el.scrollBy({ left: reasonOffset(slide), behavior: "smooth" });
    },
    [reasonOffset],
  );

  // Mesure à l'ouverture du dialogue et à chaque changement de largeur.
  useEffect(() => {
    if (!open) return;
    syncReasonNav();
    window.addEventListener("resize", syncReasonNav);
    return () => window.removeEventListener("resize", syncReasonNav);
  }, [open, syncReasonNav, reasonSlides.length]);

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
      <DialogContent
        className={cn(
          "sm:max-w-md max-h-[88vh] overflow-y-auto overscroll-contain rounded-2xl",
          // Mobile : feuille ancrée en bas, pleine largeur, glisse depuis le bas
          "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-w-none",
          "max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-h-[92dvh] max-sm:rounded-b-none",
          "max-sm:data-[state=open]:slide-in-from-bottom-6 max-sm:data-[state=closed]:slide-out-to-bottom",
        )}
      >
        <DialogHeader className="max-sm:pr-8 max-sm:text-left">
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
                className="h-10 md:h-9 mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Heure souhaitée</label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-10 md:h-9 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Motif de la demande</label>
            <div className="mt-1.5 flex items-center gap-1">
              <button
                type="button"
                aria-label="Motifs précédents"
                onClick={() => scrollReasons(-1)}
                disabled={!reasonNav.back}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 sm:h-7 sm:w-7"
              >
                <ChevronLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>

              <div
                ref={reasonRowRef}
                onScroll={syncReasonNav}
                className="flex flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-none scroll-smooth snap-x snap-mandatory py-0.5"
              >
                {reasonSlides.map((option) => {
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
                      className={`shrink-0 snap-start whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 sm:px-2.5 sm:py-1 sm:text-[11px] ${
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

              <button
                type="button"
                aria-label="Motifs suivants"
                onClick={() => scrollReasons(1)}
                disabled={!reasonNav.forward}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 sm:h-7 sm:w-7"
              >
                <ChevronRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
            </div>

            {/* Pastilles du carrousel : un point par motif, le motif visible est actif */}
            <div className="mt-1 flex items-center justify-center" role="tablist" aria-label="Motifs proposés">
              {reasonSlides.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={index === reasonIndex}
                  aria-label={`Afficher le motif : ${option}`}
                  onClick={() => scrollToReason(index)}
                  // Zone tactile de 24 × 12 px (mobile) autour d'une pastille de 6 px
                  className="group/dot flex h-6 w-3 shrink-0 items-center justify-center"
                >
                  <span
                    className={`block rounded-full transition-all duration-300 group-hover/dot:bg-muted-foreground/40 ${
                      index === reasonIndex ? "h-1.5 w-5 bg-blue-600" : "h-1.5 w-1.5 bg-muted-foreground/25"
                    }`}
                  />
                </button>
              ))}
            </div>

            <Input
              ref={reasonInputRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ou précisez votre motif…"
              className="h-10 md:h-9 mt-2"
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
              className="min-h-[80px] rounded-xl mt-1"
            />
          </div>
        </div>

        {/* Action toujours accessible : barre collée en bas sur mobile (safe area incluse) */}
        <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border/40 bg-background/95 px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0 sm:backdrop-blur-none">
          <Button
            className="w-full gap-1.5 h-10 text-sm bg-blue-600 hover:bg-blue-700 sm:h-9 sm:text-xs"
            disabled={sending}
            onClick={handleSubmit}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
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
