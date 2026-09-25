import { describe, it, expect } from "vitest";
import { UNREAD_BADGE_MAX, formatUnreadBadge } from "./messagingBadge";

// ============================================================================
// Badge rouge de la Messagerie : nombre affiché, plafonné à « 99+ » et masqué
// dès qu'il n'y a plus rien de non lu. Ces tests verrouillent la règle commune
// à tous les menus (web desktop, menu mobile, barre native).
// ============================================================================

describe("formatUnreadBadge — nombre de messages non lus", () => {
  it("affiche le nombre tel quel de 1 à 99", () => {
    expect(formatUnreadBadge(1)).toBe("1");
    expect(formatUnreadBadge(5)).toBe("5");
    expect(formatUnreadBadge(12)).toBe("12");
    expect(formatUnreadBadge(UNREAD_BADGE_MAX)).toBe("99");
  });

  it("affiche « 99+ » au-delà de 99", () => {
    expect(formatUnreadBadge(100)).toBe("99+");
    expect(formatUnreadBadge(150)).toBe("99+");
    expect(formatUnreadBadge(12_345)).toBe("99+");
  });

  it("masque complètement la pastille à zéro", () => {
    expect(formatUnreadBadge(0)).toBeNull();
  });

  it("masque la pastille quand le compteur n'est pas exploitable", () => {
    expect(formatUnreadBadge(undefined)).toBeNull();
    expect(formatUnreadBadge(null)).toBeNull();
    expect(formatUnreadBadge(-3)).toBeNull();
    expect(formatUnreadBadge(Number.NaN)).toBeNull();
    expect(formatUnreadBadge(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatUnreadBadge("12")).toBeNull();
    expect(formatUnreadBadge({})).toBeNull();
  });

  it("normalise un compteur décimal (jamais de virgule dans la pastille)", () => {
    expect(formatUnreadBadge(3.7)).toBe("3");
    expect(formatUnreadBadge(99.9)).toBe("99");
  });
});
