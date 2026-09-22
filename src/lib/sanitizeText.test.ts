import { describe, it, expect } from "vitest";
import { stripCjk, sanitizeStringList } from "./sanitizeText";

describe("stripCjk", () => {
  it("supprime les caractères chinois", () => {
    expect(stripCjk("Plomberie 水管 installation")).toBe("Plomberie installation");
  });

  it("supprime kana, hangul et symboles pleine largeur", () => {
    expect(stripCjk("テストtest")).toBe("test");
    expect(stripCjk("한국어")).toBe("");
    expect(stripCjk("ＡＢＣ１２３")).toBe("");
  });

  it("conserve les accents français", () => {
    expect(stripCjk("Étanchéité, câblage & évacuation")).toBe("Étanchéité, câblage & évacuation");
  });

  it("gère vide / undefined / null", () => {
    expect(stripCjk("")).toBe("");
    expect(stripCjk(undefined)).toBe("");
    expect(stripCjk(null)).toBe("");
  });

  it("normalise les espaces multiples laissés par la suppression", () => {
    const out = stripCjk("a   b");
    expect(out).toBe("a b");
  });
});

describe("sanitizeStringList", () => {
  it("nettoie chaque élément et retire les vides", () => {
    expect(sanitizeStringList(["plomberie ", " 水管 ", ""])).toEqual(["plomberie"]);
  });

  it("dédoublonne après nettoyage", () => {
    expect(sanitizeStringList(["bim", "bim", "plans"])).toEqual(["bim", "plans"]);
  });

  it("gère undefined / null", () => {
    expect(sanitizeStringList(undefined)).toEqual([]);
    expect(sanitizeStringList(null)).toEqual([]);
  });
});
