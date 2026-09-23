import { describe, it, expect } from "vitest";
import {
  EXPERTS_DIRECTORY_PATH,
  SUPPLIERS_DIRECTORY_PATH,
  directoryPath,
  directorySwitchHref,
  readDirectorySearchParams,
} from "./directorySearchParams";

describe("directorySearchParams — chemins", () => {
  it("distingue les deux annuaires", () => {
    expect(directoryPath("experts")).toBe(EXPERTS_DIRECTORY_PATH);
    expect(directoryPath("suppliers")).toBe(SUPPLIERS_DIRECTORY_PATH);
  });
});

describe("directorySearchParams — lecture", () => {
  it("lit une query string brute", () => {
    expect(readDirectorySearchParams("?project=p1&q=villa&region=tunis")).toEqual({
      project: "p1",
      q: "villa",
      region: "tunis",
      availability: "",
      specialty: "",
      from: "",
    });
  });

  it("accepte un URLSearchParams et tolère l'absence de valeur", () => {
    const sp = new URLSearchParams({ specialty: "ciment,carrelage" });
    expect(readDirectorySearchParams(sp).specialty).toBe("ciment,carrelage");
    expect(readDirectorySearchParams(null)).toEqual({
      project: "",
      q: "",
      region: "",
      availability: "",
      specialty: "",
      from: "",
    });
    expect(readDirectorySearchParams("").project).toBe("");
  });
});

describe("directorySearchParams — bascule « Type »", () => {
  it("conserve le projet et la région vers les fournisseurs", () => {
    // Le parcours du projet (?project=…) ne doit jamais être perdu : sans lui,
    // la barre Projet Journey disparaît de la page.
    const href = directorySwitchHref("suppliers", {
      project: "p1",
      q: "villa",
      region: "tunis",
    });
    expect(href.startsWith(`${SUPPLIERS_DIRECTORY_PATH}?`)).toBe(true);
    const sp = new URLSearchParams(href.split("?")[1]);
    expect(sp.get("project")).toBe("p1");
    expect(sp.get("q")).toBe("villa");
    expect(sp.get("region")).toBe("tunis");
  });

  it("conserve le projet depuis les fournisseurs vers les experts", () => {
    const href = directorySwitchHref("experts", {
      project: "p1",
      region: "sfax",
      specialty: "ciment",
      from: "materials",
    });
    const sp = new URLSearchParams(href.split("?")[1]);
    expect(sp.get("project")).toBe("p1");
    expect(sp.get("region")).toBe("sfax");
    // Critères propres aux fournisseurs : non transmis aux experts.
    expect(sp.get("specialty")).toBeNull();
    expect(sp.get("from")).toBeNull();
  });

  it("ne transmet la disponibilité qu'aux experts", () => {
    const experts = new URLSearchParams(
      directorySwitchHref("experts", { project: "p1", availability: "immediate" }).split("?")[1],
    );
    expect(experts.get("availability")).toBe("immediate");

    const suppliers = new URLSearchParams(
      directorySwitchHref("suppliers", { project: "p1", availability: "immediate" }).split("?")[1],
    );
    expect(suppliers.get("availability")).toBeNull();
  });

  it("transmet les spécialités et l'origine aux fournisseurs", () => {
    const sp = new URLSearchParams(
      directorySwitchHref("suppliers", {
        project: "p1",
        specialty: "ciment,carrelage",
        from: "materials",
      }).split("?")[1],
    );
    expect(sp.get("specialty")).toBe("ciment,carrelage");
    expect(sp.get("from")).toBe("materials");
  });

  it("ne produit aucun paramètre vide", () => {
    expect(directorySwitchHref("suppliers", { project: "p1", q: "", region: "" })).toBe(
      `${SUPPLIERS_DIRECTORY_PATH}?project=p1`,
    );
    expect(directorySwitchHref("experts", { availability: "all" })).toBe(EXPERTS_DIRECTORY_PATH);
    expect(directorySwitchHref("experts")).toBe(EXPERTS_DIRECTORY_PATH);
    expect(directorySwitchHref("experts", null)).toBe(EXPERTS_DIRECTORY_PATH);
  });

  it("reste sans paramètre sans contexte de projet", () => {
    expect(directorySwitchHref("suppliers", { region: "tunis" })).toBe(
      `${SUPPLIERS_DIRECTORY_PATH}?region=tunis`,
    );
  });
});
