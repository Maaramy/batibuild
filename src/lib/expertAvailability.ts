// ============================================================================
// DISPONIBILITÉ & DEMANDES — experts (ProMarket)
//
// Helpers purs et testables partagés par le profil expert (saisie), l'annuaire
// ProMarket (affichage + filtres) et la fiche publique (demandes). Aucun accès
// réseau, aucune dépendance React ni Convex : ce fichier est la source de vérité
// des libellés, couleurs et statuts, côté client comme côté serveur.
// ============================================================================

// ── Disponibilité ───────────────────────────────────────────────────────────

export type ExpertAvailability = "immediate" | "this_week" | "appointment";

export interface AvailabilityOption {
  value: ExpertAvailability;
  label: string;
  short: string;
  emoji: string;
  /** Pastille ronde affichée sur les cartes ProMarket. */
  dot: string;
  /** Chip colorée (badge). */
  chip: string;
  /** Description affichée dans le formulaire du profil expert. */
  description: string;
}

export const AVAILABILITY_OPTIONS: AvailabilityOption[] = [
  {
    value: "immediate",
    label: "🟢 Immédiatement",
    short: "Immédiatement",
    emoji: "🟢",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
    description: "Disponible dès maintenant pour intervenir",
  },
  {
    value: "this_week",
    label: "🟡 Disponible cette semaine",
    short: "Cette semaine",
    emoji: "🟡",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-700 border-amber-500/25",
    description: "Peut intervenir dans les 7 prochains jours",
  },
  {
    value: "appointment",
    label: "🔵 Rendez-vous",
    short: "Sur rendez-vous",
    emoji: "🔵",
    dot: "bg-blue-500",
    chip: "bg-blue-500/10 text-blue-700 border-blue-500/25",
    description: "Uniquement sur rendez-vous à définir avec le client",
  },
];

export function isExpertAvailability(value: unknown): value is ExpertAvailability {
  return value === "immediate" || value === "this_week" || value === "appointment";
}

export function availabilityMeta(
  value: string | null | undefined,
): AvailabilityOption | undefined {
  if (!isExpertAvailability(value)) return undefined;
  return AVAILABILITY_OPTIONS.find((o) => o.value === value);
}

/** Libellé court, ou `null` quand l'expert n'a rien renseigné (rien à afficher). */
export function availabilityLabel(value: string | null | undefined): string | null {
  return availabilityMeta(value)?.short ?? null;
}

/** L'expert peut-il recevoir une demande de rendez-vous ? */
export function isBookable(value: string | null | undefined): boolean {
  return value === "appointment";
}

// ── Prix indicatifs ─────────────────────────────────────────────────────────

export const INDICATIVE_PRICE_PLACEHOLDER = "À partir de X TND";
export const INDICATIVE_PRICE_MAX_LENGTH = 60;

/**
 * Nettoie la saisie libre de l'expert. Renvoie `undefined` pour un champ vide
 * (le champ est alors retiré du profil, jamais enregistré comme chaîne vide).
 */
export function normalizeIndicativePrice(raw: string | null | undefined): string | undefined {
  const value = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!value) return undefined;
  return value.slice(0, INDICATIVE_PRICE_MAX_LENGTH);
}

/** Texte prêt à afficher (« Prix indicatifs : À partir de 80 TND »). */
export function indicativePriceLabel(raw: string | null | undefined): string | null {
  return normalizeIndicativePrice(raw) ?? null;
}

// ── Statuts ─────────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled"
  | "completed";

export type UrgentStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";

export interface StatusMeta {
  label: string;
  /** Message affiché à l'utilisateur lors du changement de statut. */
  chip: string;
}

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pending: { label: "En attente", chip: "bg-amber-500/10 text-amber-700 border-amber-500/25" },
  approved: { label: "Rendez-vous confirmé", chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25" },
  declined: { label: "Demande déclinée", chip: "bg-red-500/10 text-red-700 border-red-500/25" },
  cancelled: { label: "Annulé", chip: "bg-muted text-muted-foreground border-border/40" },
  completed: { label: "Terminé", chip: "bg-blue-500/10 text-blue-700 border-blue-500/25" },
};

export const URGENT_STATUS_META: Record<UrgentStatus, StatusMeta> = {
  pending: { label: "En attente", chip: "bg-amber-500/10 text-amber-700 border-amber-500/25" },
  accepted: { label: "Urgence acceptée", chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25" },
  declined: { label: "Urgence refusée", chip: "bg-red-500/10 text-red-700 border-red-500/25" },
  completed: { label: "Terminée", chip: "bg-blue-500/10 text-blue-700 border-blue-500/25" },
  cancelled: { label: "Annulée", chip: "bg-muted text-muted-foreground border-border/40" },
};

export function appointmentStatusMeta(status: string | null | undefined): StatusMeta {
  return APPOINTMENT_STATUS_META[(status ?? "") as AppointmentStatus] ?? {
    label: status ?? "—",
    chip: "bg-muted text-muted-foreground border-border/40",
  };
}

export function urgentStatusMeta(status: string | null | undefined): StatusMeta {
  return URGENT_STATUS_META[(status ?? "") as UrgentStatus] ?? {
    label: status ?? "—",
    chip: "bg-muted text-muted-foreground border-border/40",
  };
}

/** Un rendez-vous n'est « confirmé » qu'après approbation explicite de l'expert. */
export function isConfirmedAppointment(status: string | null | undefined): boolean {
  return status === "approved";
}

/** Seules les demandes en attente peuvent être approuvées / déclinées. */
export function isDecidableRequest(status: string | null | undefined): boolean {
  return status === "pending";
}

// ── Dates & créneaux ────────────────────────────────────────────────────────

/** « 2026-09-18 » — valeur d'un `<input type="date">` (heure locale). */
export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Timestamp (minuit local) d'une valeur `YYYY-MM-DD`, ou `undefined` si invalide. */
export function fromDateInputValue(value: string | null | undefined): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? "").trim());
  if (!match) return undefined;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return undefined;
  return date.getTime();
}

export function isValidTimeValue(value: string | null | undefined): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec((value ?? "").trim());
  if (!match) return false;
  const h = Number(match[1]);
  const min = Number(match[2]);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

/** Date + heure lisibles : « 18 septembre 2026 à 10:30 ». */
export function formatSlotLabel(ts: number, time?: string | null): string {
  const date = new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return isValidTimeValue(time) ? `${date} à ${time}` : date;
}

export function formatDayShort(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Le créneau demandé est-il encore à venir ? (comparaison date + heure locales) */
export function isUpcomingSlot(ts: number, time?: string | null, now = Date.now()): boolean {
  if (!isValidTimeValue(time)) return ts >= startOfDay(now);
  const [h, m] = (time as string).split(":").map(Number);
  const at = new Date(ts);
  at.setHours(h, m, 0, 0);
  return at.getTime() > now;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── Validation du formulaire de demande ─────────────────────────────────────

export interface AppointmentDraft {
  date?: string | null;
  time?: string | null;
  reason?: string | null;
}

export type DraftValidation = { ok: true; preferredDate: number; preferredTime: string } | { ok: false; error: string };

/**
 * Valide une demande de rendez-vous côté client ET côté serveur (même règle).
 * La date doit être renseignée, non passée, et l'heure au format HH:MM.
 */
export function validateAppointmentDraft(
  draft: AppointmentDraft,
  now = Date.now(),
): DraftValidation {
  const preferredDate = fromDateInputValue(draft.date);
  if (preferredDate === undefined) {
    return { ok: false, error: "Sélectionnez une date souhaitée" };
  }
  if (startOfDay(preferredDate) < startOfDay(now)) {
    return { ok: false, error: "La date souhaitée doit être aujourd'hui ou ultérieure" };
  }
  if (!isValidTimeValue(draft.time)) {
    return { ok: false, error: "Sélectionnez une heure souhaitée" };
  }
  if (!(draft.reason ?? "").trim()) {
    return { ok: false, error: "Indiquez le motif de la demande" };
  }
  return {
    ok: true,
    preferredDate,
    preferredTime: (draft.time as string).trim(),
  };
}

// ── Filtres ProMarket ───────────────────────────────────────────────────────

export type AvailabilityFilter = "all" | "immediate" | "this_week" | "appointment" | "urgent";

export const AVAILABILITY_FILTERS: { value: AvailabilityFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "immediate", label: "Disponible immédiatement" },
  { value: "this_week", label: "Disponible cette semaine" },
  { value: "appointment", label: "Sur rendez-vous" },
  { value: "urgent", label: "Demandes urgentes acceptées" },
];

export interface FilterableExpert {
  availability?: string | null;
  acceptsUrgent?: boolean | null;
}

/** Un filtre ne masque jamais un profil qui ne le remplit pas — il ne fait que trier. */
export function matchesAvailabilityFilter(
  expert: FilterableExpert,
  filter: AvailabilityFilter | string | null | undefined,
): boolean {
  switch (filter) {
    case "immediate":
    case "this_week":
    case "appointment":
      return expert.availability === filter;
    case "urgent":
      return expert.acceptsUrgent === true;
    default:
      return true;
  }
}

/** Nombre de demandes en attente affiché dans le badge de l'espace expert. */
export function pendingRequestsCount(
  appointments: { status?: string | null }[] | undefined,
  urgentRequests: { status?: string | null }[] | undefined,
): number {
  const a = (appointments ?? []).filter((r) => r.status === "pending").length;
  const u = (urgentRequests ?? []).filter((r) => r.status === "pending").length;
  return a + u;
}
