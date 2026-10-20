import { describe, it, expect } from "vitest";
import {
  DECISION_SUPPORT_DENY_COPY,
  evaluateDecisionSupportAccess,
  type DecisionSupportSubscription,
} from "./decisionSupportAccess";

// ============================================================================
// « AIDE À LA DÉCISION » — règle d'accès (deux conditions simultanées)
//   • projet du GROUPE A (classification existante du Project Journey) ;
//   • abonnement CLIENT PRO actif, valide et non expiré.
// ============================================================================

const ACTIVE_PRO: DecisionSupportSubscription = {
  status: "active",
  type: "monthly",
  isActive: true,
  planCompatible: true,
};

const FREE_PLAN: DecisionSupportSubscription = {
  status: "free",
  type: "free",
  isActive: true,
  planCompatible: true,
};

const EXPIRED_PRO: DecisionSupportSubscription = {
  status: "expired",
  type: "monthly",
  isActive: false,
  planCompatible: true,
};

const TRIAL: DecisionSupportSubscription = {
  status: "trialing",
  type: "trial",
  isActive: true,
  planCompatible: true,
};

function access(
  category: string | null | undefined,
  subscription: DecisionSupportSubscription | null,
  extra: { authenticated?: boolean; isAdmin?: boolean; owned?: boolean } = {},
) {
  return evaluateDecisionSupportAccess({
    authenticated: extra.authenticated ?? true,
    isAdmin: extra.isAdmin ?? false,
    owned: extra.owned ?? true,
    category,
    subscription,
  });
}

describe("evaluateDecisionSupportAccess — scénarios obligatoires", () => {
  it("1. Groupe A + Client Pro actif → accès autorisé", () => {
    const res = access("villa", ACTIVE_PRO);
    expect(res).toMatchObject({
      allowed: true,
      reason: "ok",
      group: "A",
      upgradeRequired: false,
      renewalRequired: false,
    });
  });

  it("2. Groupe A + compte gratuit → refusé, invitation à passer à Client Pro", () => {
    const res = access("maison", FREE_PLAN);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("free_plan");
    expect(res.upgradeRequired).toBe(true);
    expect(res.renewalRequired).toBe(false);
  });

  it("3. Groupe A + Client Pro expiré → refusé, réactivation obligatoire", () => {
    const res = access("appartement", EXPIRED_PRO);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("expired");
    expect(res.renewalRequired).toBe(true);
  });

  it("4. Groupe B + Client Pro actif → refusé (le type de projet prime)", () => {
    const res = access("extension_batiment", ACTIVE_PRO);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("group_b");
    expect(res.group).toBe("B");
  });

  it("5. Groupe B + compte gratuit → refusé", () => {
    const res = access("piscine", FREE_PLAN);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("group_b");
    expect(res.group).toBe("B");
  });

  it("6. Utilisateur non connecté → authentification demandée, même avec un Client Pro actif", () => {
    const res = access("villa", ACTIVE_PRO, { authenticated: false });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("not_authenticated");
    // Aucune donnée d'abonnement ne doit être divulguée avant l'authentification.
    expect(res.upgradeRequired).toBe(false);
  });

  it("7. Projet d'un autre utilisateur → refusé, aucune donnée exposée", () => {
    const res = access("villa", ACTIVE_PRO, { owned: false });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("not_owner");
  });
});

describe("evaluateDecisionSupportAccess — cas limites", () => {
  it("les 14 types du groupe A sont éligibles avec un Client Pro actif", () => {
    for (const type of [
      "maison",
      "appartement",
      "villa",
      "immeuble",
      "local_commercial",
      "studio",
      "duplex",
      "bureau",
      "entrepot",
      "residence_touristique",
      "projet_neuf",
      "restaurant",
      "cafe",
      "renovation_complete",
    ]) {
      expect(access(type, ACTIVE_PRO).allowed, type).toBe(true);
    }
  });

  it("aucun autre type du catalogue n'est éligible, même avec un Client Pro actif", () => {
    for (const type of [
      "extension_batiment",
      "renovation_cuisine",
      "renovation_salle_de_bain",
      "peinture_interieure",
      "piscine",
      "cloture",
      "jardin",
      "electricite_complete",
      "plomberie_complete",
    ]) {
      expect(access(type, ACTIVE_PRO).allowed, type).toBe(false);
    }
  });

  it("reconnaît les anciens slugs de projet (maison_r_plus_1 → groupe A)", () => {
    expect(access("maison_r_plus_1", ACTIVE_PRO).allowed).toBe(true);
    expect(access("maison_r_plus_2", ACTIVE_PRO).allowed).toBe(true);
    expect(access("atelier", ACTIVE_PRO).allowed).toBe(true);
  });

  it("type absent ou inconnu → groupe B, donc refusé", () => {
    for (const category of [null, undefined, "", "type_inexistant"]) {
      const res = access(category, ACTIVE_PRO);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("group_b");
    }
  });

  it("essai gratuit → pas un abonnement Client Pro, donc refusé", () => {
    const res = access("villa", TRIAL);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("not_client_pro");
  });

  it("essai terminé → refusé avec invitation à choisir une offre", () => {
    const res = access("villa", { ...TRIAL, status: "trial_expired", isActive: false });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("trial_expired");
    expect(res.upgradeRequired).toBe(true);
  });

  it("paiement en attente de validation → bloqué jusqu'à l'activation", () => {
    const res = access("villa", { ...ACTIVE_PRO, status: "pending", isActive: false });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("pending");
    expect(res.renewalRequired).toBe(true);
  });

  it("abonnement inactif (non expiré) → refusé", () => {
    const res = access("villa", { ...ACTIVE_PRO, isActive: false });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("not_client_pro");
  });

  it("forfait incompatible avec le profil → refusé", () => {
    const res = access("villa", { ...ACTIVE_PRO, planCompatible: false });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("not_client_pro");
  });

  it("instantané d'abonnement indisponible → refusé (jamais d'accès par défaut)", () => {
    const res = access("villa", null);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("not_client_pro");
  });

  it("administrateur / modérateur → bypass de test, comme les autres modules", () => {
    expect(access("villa", null, { isAdmin: true }).allowed).toBe(true);
    // Le bypass ne contourne jamais la restriction de type de projet.
    expect(access("piscine", null, { isAdmin: true }).allowed).toBe(false);
  });
});

describe("DECISION_SUPPORT_DENY_COPY — messages utilisateur", () => {
  it("chaque motif de refus dispose d'un titre, d'une description et d'une action", () => {
    for (const reason of [
      "not_authenticated",
      "not_owner",
      "group_b",
      "free_plan",
      "expired",
      "pending",
      "trial_expired",
      "not_client_pro",
    ] as const) {
      const copy = DECISION_SUPPORT_DENY_COPY[reason];
      expect(copy.title.length, reason).toBeGreaterThan(0);
      expect(copy.description.length, reason).toBeGreaterThan(0);
      if (reason !== "group_b" && reason !== "not_owner") {
        expect(copy.cta, reason).toBeTruthy();
      }
    }
  });

  it("le compte gratuit est invité à passer à Client Pro", () => {
    expect(DECISION_SUPPORT_DENY_COPY.free_plan.cta).toBe("Passer à Client Pro");
  });
});
