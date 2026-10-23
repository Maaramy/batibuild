import { beforeEach, describe, expect, it } from "vitest";

import {
  PLAN_INTRO_REPLAY_WINDOW_MS,
  markPlansIntroPlayed,
  planIntroStorageKey,
  resetPlansIntroMemory,
  shouldPlayPlansIntro,
} from "./planGenerationIntro";

const PROJECT_A = "jd7projectaaaaaaaaaaaaaaaaaaaa";
const PROJECT_B = "jd7projectbbbbbbbbbbbbbbbbbbbb";

/** `localStorage` minimal, en mémoire. */
function createStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    keys: () => [...data.keys()],
  };
}

describe("animation de première génération des plans", () => {
  beforeEach(() => {
    resetPlansIntroMemory();
  });

  it("se joue à la première génération du projet, puis plus jamais", () => {
    const storage = createStorage();

    expect(shouldPlayPlansIntro(PROJECT_A, { storage })).toBe(true);

    markPlansIntroPlayed(PROJECT_A, { storage, now: 1_000 });

    // Retour sur la page dans la même session (après l'animation).
    expect(
      shouldPlayPlansIntro(PROJECT_A, { storage, now: 1_000 + 10_000 }),
    ).toBe(false);

    // Actualisation : la mémoire de session est vidée, le stockage persiste.
    resetPlansIntroMemory();
    expect(shouldPlayPlansIntro(PROJECT_A, { storage })).toBe(false);
  });

  it("ne rejoue pas l'animation pendant les quelques secondes de chargement (actualisation)", () => {
    const storage = createStorage();

    expect(shouldPlayPlansIntro(PROJECT_A, { storage })).toBe(true);
    markPlansIntroPlayed(PROJECT_A, { storage, now: 5_000 });

    // Actualisation immédiate : nouveau montage, stockage déjà marqué.
    resetPlansIntroMemory();
    expect(shouldPlayPlansIntro(PROJECT_A, { storage, now: 6_000 })).toBe(false);
  });

  it("absorbe le double montage de React StrictMode sans couper l'animation", () => {
    const storage = createStorage();

    expect(shouldPlayPlansIntro(PROJECT_A, { storage, now: 2_000 })).toBe(true);
    markPlansIntroPlayed(PROJECT_A, { storage, now: 2_000 });

    // Le montage rejoué par StrictMode suit immédiatement le premier.
    expect(
      shouldPlayPlansIntro(PROJECT_A, {
        storage,
        now: 2_000 + PLAN_INTRO_REPLAY_WINDOW_MS - 1,
      }),
    ).toBe(true);

    // Bien plus tard, l'animation est considérée comme déjà jouée.
    expect(
      shouldPlayPlansIntro(PROJECT_A, {
        storage,
        now: 2_000 + PLAN_INTRO_REPLAY_WINDOW_MS,
      }),
    ).toBe(false);
  });

  it("garde une décision indépendante pour chaque projet", () => {
    const storage = createStorage();

    markPlansIntroPlayed(PROJECT_A, { storage, now: 1_000 });

    expect(
      shouldPlayPlansIntro(PROJECT_A, { storage, now: 1_000 + 60_000 }),
    ).toBe(false);
    // Un autre projet n'a jamais été généré : son animation doit se jouer.
    expect(
      shouldPlayPlansIntro(PROJECT_B, { storage, now: 1_000 + 60_000 }),
    ).toBe(true);
  });

  it("sans identifiant de projet, aucune animation", () => {
    const storage = createStorage();
    for (const id of [null, undefined, "", "   "]) {
      expect(shouldPlayPlansIntro(id, { storage })).toBe(false);
    }
  });

  it("fonctionne sans stockage disponible (mémoire de session)", () => {
    expect(shouldPlayPlansIntro(PROJECT_A, { storage: null })).toBe(true);
    markPlansIntroPlayed(PROJECT_A, { storage: null, now: 1_000 });
    expect(
      shouldPlayPlansIntro(PROJECT_A, { storage: null, now: 60_000 }),
    ).toBe(false);
  });

  it("tolère un stockage qui refuse la lecture ou l'écriture", () => {
    const broken = {
      getItem: () => {
        throw new Error("accès refusé");
      },
      setItem: () => {
        throw new Error("stockage plein");
      },
    };

    expect(shouldPlayPlansIntro(PROJECT_A, { storage: broken })).toBe(true);
    expect(() =>
      markPlansIntroPlayed(PROJECT_A, { storage: broken, now: 1_000 }),
    ).not.toThrow();
    expect(
      shouldPlayPlansIntro(PROJECT_A, { storage: broken, now: 60_000 }),
    ).toBe(false);
  });

  it("utilise une clé de stockage propre au projet", () => {
    const storage = createStorage();
    markPlansIntroPlayed(PROJECT_A, { storage, now: 1_000 });

    expect(storage.keys()).toEqual([planIntroStorageKey(PROJECT_A)]);
    expect(planIntroStorageKey(PROJECT_A)).toContain(PROJECT_A);
    expect(planIntroStorageKey(PROJECT_B)).not.toBe(
      planIntroStorageKey(PROJECT_A),
    );
  });
});
