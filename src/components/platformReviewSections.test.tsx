import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// ----------------------------------------------------------------------------
// Rendu des deux sections « avis » avec des données simulées.
//
// Objectif : prouver qu'aucune forme de données (chargement, null, avis
// existant, champs manquants, liste vide) ne fait lever une exception au
// rendu — c'est exactement ce qui déclenche l'écran global « Une erreur est
// survenue » quand un composant du Dashboard plante.
// ----------------------------------------------------------------------------

const store = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
}));

vi.mock("convex/react", () => ({
  useQuery: (fn: string) => store.data[fn],
  useMutation: () => vi.fn(async () => ({ created: true })),
}));

vi.mock("@/convex/_generated/api", () => ({
  api: {
    platformReviews: {
      getMyReview: "getMyReview",
      submitReview: "submitReview",
      adminStats: "adminStats",
      adminList: "adminList",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import PlatformReviewsAdmin from "@/components/admin/PlatformReviewsAdmin";
import { PlatformReviewCard } from "@/components/PlatformReviewCard";

const reset = () => {
  for (const key of Object.keys(store.data)) delete store.data[key];
};

const render = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("PlatformReviewCard — rendu robuste", () => {
  it("affiche l'état de chargement quand la query n'a pas encore répondu", () => {
    reset();
    store.data.getMyReview = undefined;
    const html = render(<PlatformReviewCard />);
    expect(html).toContain("Chargement de votre avis");
  });

  it("affiche le formulaire quand l'utilisateur n'a jamais voté", () => {
    reset();
    store.data.getMyReview = null;
    const html = render(<PlatformReviewCard />);
    expect(html).toContain("Notez BatiBuild");
    expect(html).toContain("Votre avis compte");
    expect(html).toContain("Envoyer mon avis");
    expect(html).toContain("Très insatisfait");
    expect(html).toContain("Excellent");
  });

  it("affiche le récapitulatif d'un avis existant avec commentaire", () => {
    reset();
    store.data.getMyReview = {
      rating: 4,
      comment: "Très bon outil",
      createdAt: 1,
      updatedAt: 2,
    };
    const html = render(<PlatformReviewCard />);
    expect(html).toContain("Modifier mon avis");
    expect(html).toContain("Satisfait");
    expect(html).toContain("Très bon outil");
  });

  it("accepte un commentaire absent ou vide sans planter", () => {
    reset();
    store.data.getMyReview = { rating: 5, comment: "", createdAt: 1, updatedAt: 1 };
    const html = render(<PlatformReviewCard />);
    expect(html).toMatch(/Vous n('|&#x27;)avez pas ajouté de commentaire/);

    store.data.getMyReview = { rating: 5, createdAt: 1, updatedAt: 1 };
    expect(() => render(<PlatformReviewCard />)).not.toThrow();
  });

  it("ne plante pas sur une note hors barème (donnée ancienne/corrompue)", () => {
    reset();
    store.data.getMyReview = { rating: 0, comment: null, createdAt: 1, updatedAt: 1 };
    expect(() => render(<PlatformReviewCard />)).not.toThrow();
  });
});

describe("PlatformReviewsAdmin — rendu robuste", () => {
  const emptyStats = {
    total: 0,
    average: 0,
    distribution: [0, 0, 0, 0, 0],
    satisfied: 0,
    satisfaction: 0,
    withComment: 0,
    lastSubmittedAt: null,
  };

  it("affiche l'accès refusé quand le serveur renvoie null (non-admin)", () => {
    reset();
    store.data.adminStats = null;
    store.data.adminList = null;
    const html = render(<PlatformReviewsAdmin />);
    expect(html).toContain("Accès réservé aux administrateurs");
  });

  it("affiche le chargement tant que les deux queries ne répondent pas", () => {
    reset();
    store.data.adminStats = undefined;
    store.data.adminList = undefined;
    const html = render(<PlatformReviewsAdmin />);
    expect(html).toContain("Chargement des évaluations");
  });

  it("gère une base vide sans note", () => {
    reset();
    store.data.adminStats = emptyStats;
    store.data.adminList = [];
    const html = render(<PlatformReviewsAdmin />);
    expect(html).toContain("Aucune évaluation pour le moment");
    expect(html).toMatch(/Aucun avis pour l('|&#x27;)instant/);
    expect(html).toContain("0 %");
  });

  it("gère des avis avec des champs utilisateur absents (compte supprimé)", () => {
    reset();
    store.data.adminStats = {
      ...emptyStats,
      total: 2,
      average: 3.5,
      distribution: [0, 1, 0, 1, 0],
      satisfied: 1,
      satisfaction: 50,
      withComment: 1,
      lastSubmittedAt: 1700000000000,
    };
    store.data.adminList = [
      {
        id: "rev1",
        userId: "user1",
        rating: 4,
        comment: "Bien",
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        userName: null,
        userEmail: null,
        userCompany: null,
        userImage: null,
        userRole: null,
      },
      {
        id: "rev2",
        userId: "user2",
        rating: 2,
        comment: "",
        createdAt: 1700000000000,
        updatedAt: 1700000001000,
        userName: "Amine B.",
        userEmail: "amine@example.com",
        userCompany: "BTP Amine",
        userImage: undefined,
        userRole: "supplier",
      },
    ];
    const html = render(<PlatformReviewsAdmin />);
    expect(html).toContain("3.50");
    expect(html).toContain("Aucun commentaire");
    expect(html).toContain("Utilisateur");
    expect(html).toContain("Bien");
  });

  it("accepte une distribution absente sans planter", () => {
    reset();
    store.data.adminStats = { total: 1, average: 5, satisfaction: 100, satisfied: 1, withComment: 0, lastSubmittedAt: 1 };
    store.data.adminList = [];
    expect(() => render(<PlatformReviewsAdmin />)).not.toThrow();
  });
});
