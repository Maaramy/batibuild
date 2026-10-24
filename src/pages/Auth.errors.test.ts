/// <reference types="vite/client" />

// ============================================================================
// FORMULAIRE D'INSCRIPTION — messages d'erreur explicites
// ----------------------------------------------------------------------------
// Objectif : aucun échec d'inscription ne doit s'afficher comme un simple
// « point d'exclamation » ou comme une erreur interne (Convex / serveur) que
// l'utilisateur ne peut pas comprendre. Chaque cas renvoie un message
// français explicite, ou le repli contextuel passé par l'appelant.
// ============================================================================

import { describe, it, expect } from "vitest";
import { authErrorMessage } from "@/pages/Auth";

const FALLBACK = "Erreur lors de l'inscription.";

describe("authErrorMessage — inscription / connexion", () => {
  it("n'affiche jamais un simple point d'exclamation ni un message vide", () => {
    expect(authErrorMessage(new Error("!"), FALLBACK)).toBe(FALLBACK);
    expect(authErrorMessage(new Error("…"), FALLBACK)).toBe(FALLBACK);
    expect(authErrorMessage(new Error("   "), FALLBACK)).toBe(FALLBACK);
    expect(authErrorMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(authErrorMessage("erreur sans message", FALLBACK)).toBe(FALLBACK);
  });

  it("masque les erreurs internes Convex / serveur", () => {
    expect(authErrorMessage(new Error("Server Error"), FALLBACK)).toBe(FALLBACK);
    expect(
      authErrorMessage(new Error('Uncaught Error: could not find function "users"'), FALLBACK),
    ).toBe(FALLBACK);
    expect(authErrorMessage(new Error("Invalid argument at args.userId"), FALLBACK)).toBe(FALLBACK);
    expect(
      authErrorMessage(new Error("Uncaught TypeError: undefined is not a function"), FALLBACK),
    ).toBe(FALLBACK);
  });

  it("explique un compte déjà existant", () => {
    expect(authErrorMessage(new Error("User already exists"), FALLBACK)).toContain("existe déjà");
    expect(authErrorMessage(new Error("Account already registered"), FALLBACK)).toContain(
      "Connectez-vous",
    );
  });

  it("explique un problème de connexion réseau", () => {
    expect(authErrorMessage(new TypeError("Failed to fetch"), FALLBACK)).toContain(
      "Problème de connexion",
    );
    expect(
      authErrorMessage(new Error("NetworkError when attempting to fetch"), FALLBACK),
    ).toContain("Internet");
  });

  it("explique un rate limit", () => {
    expect(authErrorMessage(new Error("Too many requests"), FALLBACK)).toContain(
      "Trop de tentatives",
    );
  });

  it("explique un mot de passe trop court", () => {
    expect(authErrorMessage(new Error("Password must be at least 8 characters"), FALLBACK)).toContain(
      "8 caractères",
    );
  });

  it("retombe sur le message contextuel de l'appelant pour un code/identifiant incorrect", () => {
    const otpFallback = "Le code est incorrect.";
    expect(authErrorMessage(new Error("Invalid verification code"), FALLBACK)).toBe(FALLBACK);
    expect(authErrorMessage(new Error("Invalid verification code"), otpFallback)).toBe(otpFallback);

    const loginFallback = "Email ou mot de passe incorrect.";
    expect(authErrorMessage(new Error("Invalid email or password"), FALLBACK)).toBe(FALLBACK);
    expect(authErrorMessage(new Error("Invalid email or password"), loginFallback)).toBe(
      loginFallback,
    );
  });

  it("conserve un message métier déjà explicite", () => {
    expect(
      authErrorMessage(new Error("Impossible d'envoyer le code de vérification."), FALLBACK),
    ).toBe("Impossible d'envoyer le code de vérification.");
    expect(authErrorMessage(new Error("Le code a expiré, demandez-en un nouveau."), FALLBACK)).toBe(
      "Le code a expiré, demandez-en un nouveau.",
    );
  });
});
