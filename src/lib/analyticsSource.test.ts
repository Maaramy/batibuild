import { describe, it, expect } from "vitest";
import { detectEventSource } from "./analyticsSource";

describe("detectEventSource", () => {
  const host = "s-sell.freebuff.dev";

  it("retourne « direct » sans référent", () => {
    expect(detectEventSource({ referrer: undefined, host })).toBe("direct");
    expect(detectEventSource({ referrer: "", host })).toBe("direct");
  });

  it("classe l'annuaire interne comme une recherche", () => {
    expect(
      detectEventSource({
        referrer: `https://${host}/dashboard/professionals-directory`,
        host,
      }),
    ).toBe("search");
    expect(
      detectEventSource({ referrer: `https://${host}/pros?q=plombier`, host }),
    ).toBe("search");
  });

  it("classe les autres pages internes comme un accès direct", () => {
    expect(
      detectEventSource({
        referrer: `https://${host}/dashboard/messages`,
        host,
      }),
    ).toBe("direct");
  });

  it("reconnaît les moteurs de recherche externes", () => {
    expect(
      detectEventSource({ referrer: "https://www.google.com/search?q=x", host }),
    ).toBe("search");
    expect(
      detectEventSource({ referrer: "https://duckduckgo.com/?q=x", host }),
    ).toBe("search");
  });

  it("reconnaît les réseaux sociaux", () => {
    expect(
      detectEventSource({
        referrer: "https://www.facebook.com/groupes/batiment",
        host,
      }),
    ).toBe("social");
    expect(
      detectEventSource({ referrer: "https://t.me/chantier", host }),
    ).toBe("social");
  });

  it("classe les sources inconnues en « other »", () => {
    expect(
      detectEventSource({ referrer: "https://blog-exemple.tn/article", host }),
    ).toBe("other");
    expect(detectEventSource({ referrer: "pas-une-url", host })).toBe("other");
  });
});
