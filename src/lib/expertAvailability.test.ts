import { describe, it, expect } from "vitest";
import {
  AVAILABILITY_OPTIONS,
  AVAILABILITY_FILTERS,
  APPOINTMENT_STATUS_META,
  URGENT_STATUS_META,
  appointmentStatusMeta,
  availabilityLabel,
  availabilityMeta,
  formatSlotLabel,
  fromDateInputValue,
  indicativePriceLabel,
  isBookable,
  isConfirmedAppointment,
  isDecidableRequest,
  isExpertAvailability,
  isValidTimeValue,
  isUpcomingSlot,
  matchesAvailabilityFilter,
  normalizeIndicativePrice,
  pendingRequestsCount,
  startOfDay,
  toDateInputValue,
  urgentStatusMeta,
  validateAppointmentDraft,
} from "./expertAvailability";

// 18 septembre 2026, 12:00 heure locale
const NOW = new Date(2026, 8, 18, 12, 0, 0).getTime();

describe("disponibilité expert", () => {
  it("expose les trois options demandées, dans l'ordre", () => {
    expect(AVAILABILITY_OPTIONS.map((o) => o.value)).toEqual([
      "immediate",
      "this_week",
      "appointment",
    ]);
    expect(AVAILABILITY_OPTIONS[0].label).toBe("🟢 Immédiatement");
    expect(AVAILABILITY_OPTIONS[1].label).toBe("🟡 Disponible cette semaine");
    expect(AVAILABILITY_OPTIONS[2].label).toBe("🔵 Rendez-vous");
  });

  it("reconnaît uniquement les valeurs du schéma", () => {
    expect(isExpertAvailability("immediate")).toBe(true);
    expect(isExpertAvailability("this_week")).toBe(true);
    expect(isExpertAvailability("appointment")).toBe(true);
    expect(isExpertAvailability("now")).toBe(false);
    expect(isExpertAvailability(undefined)).toBe(false);
  });

  it("affiche la disponibilité sous la forme « Disponibilité : … »", () => {
    expect(availabilityLabel("immediate")).toBe("Immédiatement");
    expect(availabilityLabel("this_week")).toBe("Cette semaine");
    expect(availabilityLabel("appointment")).toBe("Sur rendez-vous");
    // Rien de renseigné → rien à afficher (pas de statut inventé)
    expect(availabilityLabel(undefined)).toBeNull();
    expect(availabilityLabel("inconnu")).toBeNull();
    expect(availabilityMeta(undefined)).toBeUndefined();
  });

  it("n'ouvre la prise de rendez-vous que pour l'option « Rendez-vous »", () => {
    expect(isBookable("appointment")).toBe(true);
    expect(isBookable("immediate")).toBe(false);
    expect(isBookable("this_week")).toBe(false);
    expect(isBookable(null)).toBe(false);
  });
});

describe("prix indicatifs", () => {
  it("conserve les exemples attendus", () => {
    for (const value of [
      "À partir de 80 TND",
      "À partir de 150 TND",
      "Sur devis",
      "À partir de 50 TND / intervention",
    ]) {
      expect(normalizeIndicativePrice(value)).toBe(value);
    }
  });

  it("vide → undefined (jamais une chaîne vide en base)", () => {
    expect(normalizeIndicativePrice("")).toBeUndefined();
    expect(normalizeIndicativePrice("   ")).toBeUndefined();
    expect(normalizeIndicativePrice(undefined)).toBeUndefined();
    expect(indicativePriceLabel("")).toBeNull();
  });

  it("normalise les espaces et borne la longueur", () => {
    expect(normalizeIndicativePrice("  À   partir de 80 TND  ")).toBe("À partir de 80 TND");
    expect(normalizeIndicativePrice("x".repeat(200))).toHaveLength(60);
  });
});

describe("statuts", () => {
  it("couvre tous les statuts demandés", () => {
    expect(Object.keys(APPOINTMENT_STATUS_META)).toEqual([
      "pending",
      "approved",
      "declined",
      "cancelled",
      "completed",
    ]);
    expect(Object.keys(URGENT_STATUS_META)).toEqual([
      "pending",
      "accepted",
      "declined",
      "completed",
      "cancelled",
    ]);
  });

  it("libelle les statuts explicitement", () => {
    expect(appointmentStatusMeta("pending").label).toBe("En attente");
    expect(appointmentStatusMeta("approved").label).toBe("Rendez-vous confirmé");
    expect(appointmentStatusMeta("declined").label).toBe("Demande déclinée");
    expect(urgentStatusMeta("accepted").label).toBe("Urgence acceptée");
    expect(urgentStatusMeta("declined").label).toBe("Urgence refusée");
  });

  it("ne considère confirmé que le statut approuvé", () => {
    expect(isConfirmedAppointment("approved")).toBe(true);
    expect(isConfirmedAppointment("pending")).toBe(false);
    expect(isConfirmedAppointment(undefined)).toBe(false);
  });

  it("n'autorise la décision que sur une demande en attente", () => {
    expect(isDecidableRequest("pending")).toBe(true);
    expect(isDecidableRequest("approved")).toBe(false);
    expect(isDecidableRequest("declined")).toBe(false);
  });
});

describe("dates et créneaux", () => {
  it("convertit dans les deux sens une valeur de champ date", () => {
    expect(toDateInputValue(NOW)).toBe("2026-09-18");
    expect(fromDateInputValue("2026-09-18")).toBe(startOfDay(NOW));
    expect(fromDateInputValue("18/09/2026")).toBeUndefined();
    expect(fromDateInputValue("2026-13-40")).toBeUndefined();
    expect(fromDateInputValue(undefined)).toBeUndefined();
  });

  it("valide le format d'heure", () => {
    expect(isValidTimeValue("09:30")).toBe(true);
    expect(isValidTimeValue("23:59")).toBe(true);
    expect(isValidTimeValue("24:00")).toBe(false);
    expect(isValidTimeValue("9:30")).toBe(false);
    expect(isValidTimeValue("")).toBe(false);
  });

  it("formate le créneau pour l'affichage", () => {
    expect(formatSlotLabel(fromDateInputValue("2026-09-18")!, "10:30")).toBe(
      "18 septembre 2026 à 10:30",
    );
    expect(formatSlotLabel(fromDateInputValue("2026-09-18")!)).toBe("18 septembre 2026");
  });

  it("distingue les créneaux passés des créneaux à venir", () => {
    expect(isUpcomingSlot(fromDateInputValue("2026-09-18")!, "13:00", NOW)).toBe(true);
    expect(isUpcomingSlot(fromDateInputValue("2026-09-18")!, "11:00", NOW)).toBe(false);
    expect(isUpcomingSlot(fromDateInputValue("2026-09-19")!, "08:00", NOW)).toBe(true);
    expect(isUpcomingSlot(fromDateInputValue("2026-09-17")!, "23:00", NOW)).toBe(false);
    // Sans heure valide, seule la date compte
    expect(isUpcomingSlot(fromDateInputValue("2026-09-18")!, undefined, NOW)).toBe(true);
  });
});

describe("validation de la demande", () => {
  const base = { date: "2026-09-20", time: "10:00", reason: "Visite du chantier" };

  it("accepte une demande complète et renvoie les valeurs normalisées", () => {
    const result = validateAppointmentDraft(base, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preferredDate).toBe(fromDateInputValue("2026-09-20"));
      expect(result.preferredTime).toBe("10:00");
    }
  });

  it("refuse une date manquante, passée ou une heure invalide", () => {
    expect(validateAppointmentDraft({ ...base, date: "" }, NOW)).toEqual({
      ok: false,
      error: "Sélectionnez une date souhaitée",
    });
    const past = validateAppointmentDraft({ ...base, date: "2026-09-17" }, NOW);
    expect(past.ok).toBe(false);
    const badTime = validateAppointmentDraft({ ...base, time: "25:00" }, NOW);
    expect(badTime.ok).toBe(false);
  });

  it("accepte aujourd'hui mais refuse un motif vide", () => {
    const today = validateAppointmentDraft({ ...base, date: "2026-09-18" }, NOW);
    expect(today.ok).toBe(true);
    expect(validateAppointmentDraft({ ...base, reason: "   " }, NOW)).toEqual({
      ok: false,
      error: "Indiquez le motif de la demande",
    });
  });
});

describe("filtres ProMarket", () => {
  it("expose les quatre filtres demandés", () => {
    expect(AVAILABILITY_FILTERS.map((f) => f.value)).toEqual([
      "all",
      "immediate",
      "this_week",
      "appointment",
      "urgent",
    ]);
  });

  it("filtre par disponibilité sans inventer de correspondance", () => {
    const immediate = { availability: "immediate", acceptsUrgent: false };
    const week = { availability: "this_week", acceptsUrgent: true };
    const rdv = { availability: "appointment", acceptsUrgent: false };
    const unknown = { availability: undefined, acceptsUrgent: false };

    expect(matchesAvailabilityFilter(immediate, "immediate")).toBe(true);
    expect(matchesAvailabilityFilter(week, "immediate")).toBe(false);
    expect(matchesAvailabilityFilter(week, "this_week")).toBe(true);
    expect(matchesAvailabilityFilter(rdv, "appointment")).toBe(true);
    expect(matchesAvailabilityFilter(unknown, "immediate")).toBe(false);

    // Urgences : uniquement ceux qui l'ont explicitement activé
    expect(matchesAvailabilityFilter(week, "urgent")).toBe(true);
    expect(matchesAvailabilityFilter(immediate, "urgent")).toBe(false);
    expect(matchesAvailabilityFilter(unknown, "urgent")).toBe(false);

    // Aucun filtre → tout le monde passe
    for (const e of [immediate, week, rdv, unknown]) {
      expect(matchesAvailabilityFilter(e, "all")).toBe(true);
      expect(matchesAvailabilityFilter(e, undefined)).toBe(true);
    }
  });

  it("compte les demandes en attente (rendez-vous + urgences)", () => {
    expect(
      pendingRequestsCount(
        [{ status: "pending" }, { status: "approved" }, { status: "pending" }],
        [{ status: "pending" }, { status: "declined" }],
      ),
    ).toBe(3);
    expect(pendingRequestsCount(undefined, undefined)).toBe(0);
  });
});
