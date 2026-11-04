// ============================================================================
// MODULE OFFRES — rendu de tous les onglets (aucun ne doit faire tomber l'app)
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const campaign = {
  _id: "c1",
  _creationTime: 1,
  name: "Campagne budget",
  category: "client_pro" as const,
  subject: "Votre budget",
  intro: "Bonjour",
  body: "- Un",
  feedbackEnabled: true,
  audienceSegments: ["client_pro_all"],
  audienceUserIds: [],
  status: "sent" as const,
  createdBy: "u1",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  sentAt: Date.now(),
  stats: {
    recipients: 10,
    delivered: 9,
    failed: 1,
    opened: 4,
    clicked: 2,
    feedbacks: 1,
    conversions: 3,
  },
  openRate: 44.4,
  clickRate: 22.2,
  conversionRate: 33.3,
};

vi.mock("@/convex/_generated/api", () => ({
  api: {
    marketing: {
      getDashboardStats: "stats",
      listCampaigns: "campaigns",
      previewAudience: "audience",
      searchRecipients: "search",
      listFeedback: "feedback",
      getCampaign: "campaign",
      saveCampaign: "save",
      startCampaign: "start",
      scheduleCampaign: "schedule",
      cancelCampaign: "cancel",
      deleteCampaign: "remove",
      sendTestEmail: "test",
      getFeedbackContext: "context",
      submitFeedback: "submit",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (id: string) => {
    if (id === "stats") {
      return {
        totals: {
          recipients: 120,
          delivered: 118,
          failed: 2,
          opened: 44,
          clicked: 12,
          feedbacks: 5,
          conversions: 14,
          sentCampaigns: 3,
          openRate: 37.3,
          clickRate: 10.2,
          conversionRate: 11.9,
          averageRating: 4.2,
        },
        series: [
          { id: "c1", name: "Campagne budget", date: Date.now(), sent: 60, opened: 22, clicked: 6 },
        ],
        distribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: rating === 4 ? 5 : 0 })),
        recentFeedbacks: [
          {
            _id: "f1",
            campaignId: "c1",
            campaignName: "Campagne budget",
            rating: 4,
            comment: "Très utile",
            userRole: "client",
            createdAt: Date.now(),
          },
        ],
      };
    }
    if (id === "campaigns") return [campaign];
    if (id === "feedback") {
      return [
        {
          _id: "f1",
          rating: 4,
          comment: "Très utile",
          createdAt: Date.now(),
          userRole: "client",
          campaignName: "Campagne budget",
          email: "amine@test.tn",
          name: "Amine",
        },
      ];
    }
    if (id === "audience") return { total: 12, bySegment: { client_pro_all: 12 }, sample: [] };
    if (id === "campaign") {
      return {
        campaign,
        recipients: [
          {
            _id: "r1",
            email: "amine@test.tn",
            name: "Amine",
            status: "sent",
            sentAt: Date.now(),
            openedAt: Date.now(),
            clickedAt: undefined,
            feedbackAt: Date.now(),
          },
        ],
        feedbacks: [{ _id: "f1", rating: 4, comment: "Très utile", createdAt: Date.now() }],
      };
    }
    return undefined;
  },
  useMutation: () => async () => ({}),
}));

import { CampaignEditor, MarketingOffers } from "./MarketingOffers";

const editorState = {
  name: "Campagne test",
  category: "client_pro" as const,
  templateId: "cp-budget-reel",
  subject: "Bonjour {{prenom}}",
  intro: "Bonjour {{prenom}},",
  body: "- Estimer le coût.",
  bannerUrl: "",
  ctaLabel: "Estimer",
  ctaUrl: "/dashboard/new",
  conditions: "",
  validUntil: "",
  signature: "L'équipe batibuild",
  feedbackEnabled: true,
  segments: ["client_pro_all"] as any,
  userIds: [] as string[],
};

describe("module Offres — tous les onglets", () => {
  it("tableau de bord", () => {
    const html = renderToStaticMarkup(<MarketingOffers />);
    expect(html).toContain("Offres &amp; campagnes");
    expect(html).toContain("Dernières campagnes");
    expect(html).toContain("Répartition des notes");
  });

  it("galerie Client Pro", () => {
    const html = renderToStaticMarkup(<MarketingOffers initialTab="client_pro" />);
    expect(html).toContain("Offres Client Pro");
    expect(html).toContain("Évaluation de l&#x27;expérience Batibuild");
    expect(html).toContain("Suivi de chantier de A à Z");
  });

  it("galerie Experts", () => {
    const html = renderToStaticMarkup(<MarketingOffers initialTab="expert" />);
    expect(html).toContain("Offres Experts");
    expect(html).toContain("Programme de parrainage Experts");
  });

  it("galerie Fournisseurs", () => {
    const html = renderToStaticMarkup(<MarketingOffers initialTab="supplier" />);
    expect(html).toContain("Offres Fournisseurs");
    expect(html).toContain("Trouvez davantage de clients");
  });

  it("modèles personnalisés avec une campagne existante", () => {
    const html = renderToStaticMarkup(<MarketingOffers initialTab="custom" />);
    expect(html).toContain("Offres personnalisées");
    expect(html).toContain("Campagne budget");
  });

  it("historique des envois", () => {
    const html = renderToStaticMarkup(<MarketingOffers initialTab="history" />);
    expect(html).toContain("Campagne budget");
    expect(html).toContain("Envoyée");
    expect(html).toContain("Dest.");
  });

  it("avis reçus", () => {
    const html = renderToStaticMarkup(<MarketingOffers initialTab="feedback" />);
    expect(html).toContain("Avis et évaluations des campagnes");
    expect(html).toContain("Très utile");
    expect(html).toContain("Amine");
  });

  it("éditeur de campagne avec aperçu", () => {
    const html = renderToStaticMarkup(
      <CampaignEditor initial={editorState} onClose={() => undefined} onDone={() => undefined} />,
    );
    expect(html).toContain("Contenu de l&#x27;e-mail");
    expect(html).toContain("Destinataires");
    expect(html).toContain("12 destinataire(s)");
    expect(html).toContain("Aperçu en temps réel");
    expect(html).toContain("Programmer");
  });
});
