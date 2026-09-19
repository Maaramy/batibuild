import { describe, it, expect } from "vitest";
import {
  APPOINTMENT_REASON_LIMIT,
  AVAILABILITY_OPTIONS,
  AVAILABILITY_FILTERS,
  APPOINTMENT_STATUS_META,
  BASE_APPOINTMENT_REASONS,
  CUSTOM_APPOINTMENT_REASON,
  PROFESSION_APPOINTMENT_REASONS,
  appointmentReasonOptions,
  approvedExpertIdSet,
  isContactHidden,
  isPresetAppointmentReason,
  showsAvailabilityBadge,
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

describe("motifs de demande prêts à sélectionner", () => {
  it("propose les motifs génériques puis le choix libre, même sans expert connu", () => {
    const options = appointmentReasonOptions(null);
    expect(options).toEqual([...BASE_APPOINTMENT_REASONS, CUSTOM_APPOINTMENT_REASON]);
    expect(options[options.length - 1]).toBe(CUSTOM_APPOINTMENT_REASON);
  });

  it("adapte les motifs au métier de l'expert", () => {
    const plombier = appointmentReasonOptions({ profession: "plombier" });
    expect(plombier).toContain("Fuite d'eau");
    expect(plombier).toContain("Chauffe-eau");
    expect(plombier).not.toContain("Étude de plans");

    const electricien = appointmentReasonOptions({ profession: "electricien" });
    expect(electricien).toContain("Panne électrique");
    expect(electricien).not.toContain("Fuite d'eau");

    // Tous les métiers du profil expert ont des motifs dédiés
    for (const profession of Object.keys(PROFESSION_APPOINTMENT_REASONS)) {
      expect(appointmentReasonOptions({ profession }).length).toBeGreaterThan(
        BASE_APPOINTMENT_REASONS.length,
      );
    }
  });

  it("ajoute les spécialités réelles de l'expert sans doublon", () => {
    const options = appointmentReasonOptions({
      profession: "architecte",
      specialties: ["Permis de construire", "Permis de construire", "  ", null],
    });
    expect(options.filter((o) => o === "Permis de construire")).toHaveLength(1);
    expect(options).toContain("Conception & décoration");
  });

  it("borne la liste et garde « Autre motif » en dernière position", () => {
    const options = appointmentReasonOptions({
      profession: "electricien",
      specialties: Array.from({ length: 20 }, (_, i) => `Spécialité ${i}`),
    });
    expect(options).toHaveLength(APPOINTMENT_REASON_LIMIT);
    expect(options[options.length - 1]).toBe(CUSTOM_APPOINTMENT_REASON);
    expect(options).toContain("Panne électrique");
  });

  it("un métier inconnu retombe sur les motifs génériques", () => {
    expect(appointmentReasonOptions({ profession: "macon" })).toEqual(
      appointmentReasonOptions(null),
    );
  });

  it("détecte si le motif saisi est un motif proposé", () => {
    const options = appointmentReasonOptions({ profession: "plombier" });
    expect(isPresetAppointmentReason("Fuite d'eau", options)).toBe(true);
    expect(isPresetAppointmentReason("  Fuite d'eau  ", options)).toBe(true);
    expect(isPresetAppointmentReason("Motif personnel", options)).toBe(false);
    expect(isPresetAppointmentReason("", options)).toBe(false);
    expect(isPresetAppointmentReason(undefined, options)).toBe(false);
  });
});

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

describe("carte expert — mentions et contact", () => {
  it("n'affiche pas « Sur rendez-vous » sur la carte", () => {
    expect(showsAvailabilityBadge("immediate")).toBe(true);
    expect(showsAvailabilityBadge("this_week")).toBe(true);
    // « Disponibilité : 🔵 Sur rendez-vous » est retiré de la carte
    expect(showsAvailabilityBadge("appointment")).toBe(false);
    // Rien de renseigné / valeur inconnue → rien à afficher
    expect(showsAvailabilityBadge(undefined)).toBe(false);
    expect(showsAvailabilityBadge(null)).toBe(false);
    expect(showsAvailabilityBadge("inconnu")).toBe(false);
  });

  it("retient uniquement les experts au rendez-vous confirmé", () => {
    const ids = approvedExpertIdSet([
      { expertId: "exp_1", status: "approved" },
      { expertId: "exp_2", status: "pending" },
      { expertId: "exp_3", status: "declined" },
      { expertId: "exp_4", status: "cancelled" },
      { expertId: "exp_5", status: "completed" },
      { expertId: "exp_6", status: "approved" },
    ]);
    expect([...ids].sort()).toEqual(["exp_1", "exp_6"]);

    expect(approvedExpertIdSet(undefined).size).toBe(0);
    expect(approvedExpertIdSet(null).size).toBe(0);
    expect(approvedExpertIdSet([]).size).toBe(0);
  });

  it("ignore les entrées incomplètes (identifiant manquant, statut absent)", () => {
    const ids = approvedExpertIdSet([
      { expertId: undefined, status: "approved" },
      { status: "approved" },
      { expertId: "exp_9" },
    ]);
    expect(ids.size).toBe(0);
  });

  it("masque « Contacter » uniquement pour un rendez-vous confirmé", () => {
    const approved = approvedExpertIdSet([
      { expertId: "exp_1", status: "approved" },
      { expertId: "exp_2", status: "pending" },
    ]);

    expect(isContactHidden("exp_1", approved)).toBe(true);
    expect(isContactHidden("exp_2", approved)).toBe(false);
    expect(isContactHidden("exp_3", approved)).toBe(false);

    // Utilisateur déconnecté / aucune donnée : le bouton reste affiché
    expect(isContactHidden("exp_1", approvedExpertIdSet(undefined))).toBe(false);
    expect(isContactHidden("exp_1", undefined)).toBe(false);
    // Identifiant absent : rien à masquer
    expect(isContactHidden(undefined, approved)).toBe(false);
    expect(isContactHidden(null, approved)).toBe(false);
  });

  it("réaffiche « Contacter » après annulation d'un rendez-vous confirmé", () => {
    const before = approvedExpertIdSet([{ expertId: "exp_1", status: "approved" }]);
    expect(isContactHidden("exp_1", before)).toBe(true);

    const after = approvedExpertIdSet([{ expertId: "exp_1", status: "cancelled" }]);
    expect(isContactHidden("exp_1", after)).toBe(false);
  });
});
