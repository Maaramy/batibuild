// ============================================================================
// MODULE PUSH — rendu des onglets (aucun ne doit faire tomber l'application)
// ============================================================================

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/convex/_generated/api", () => ({
  api: {
    push: {
      getDashboardStats: "stats",
      listCampaigns: "campaigns",
      getTokenSummary: "tokens",
      getCampaign: "campaign",
      previewAudience: "audience",
      searchRecipients: "search",
      saveCampaign: "save",
      startCampaign: "start",
      scheduleCampaign: "schedule",
      suspendCampaign: "suspend",
      cancelCampaign: "cancel",
      deleteCampaign: "remove",
      sendTestNotification: "test",
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: (id: string) => {
    if (id === "stats") {
      return {
        totals: {
          sent: 120,
          delivered: 110,
          failed: 10,
          opened: 44,
          clicked: 12,
          conversions: 7,
          campaignsSent: 2,
          openRate: 40,
          clickRate: 10.9,
          conversionRate: 6.4,
          androidUsers: 86,
          authorizedUsers: 80,
          activeDevices: 92,
        },
        series: [
          {
            id: "p1",
            name: "Relance estimation",
            date: Date.now(),
            sent: 60,
            delivered: 55,
            opened: 22,
            clicked: 6,
          },
        ],
        byCategory: [
          { category: "client_pro", sent: 60, delivered: 55, opened: 22, clicked: 6 },
          { category: "expert", sent: 30, delivered: 28, opened: 10, clicked: 3 },
          { category: "supplier", sent: 30, delivered: 27, opened: 12, clicked: 3 },
        ],
        campaignOptions: [{ id: "p1", name: "Relance estimation" }],
      };
    }
    if (id === "campaigns") {
      return [
        {
          _id: "p1",
          campaignName: "Relance estimation",
          category: "client_pro",
          title: "⭐ Votre avis compte !",
          message: "Aidez-nous à améliorer Batibuild.",
          status: "sent",
          targetAudience: "client_pro_all",
          audienceCount: 60,
          sentAt: Date.now(),
          createdAt: Date.now(),
          destination: "/dashboard",
        },
        {
          _id: "p2",
          campaignName: "Plans architecturaux",
          category: "client_pro",
          title: "🏡 Vous cherchez le plan idéal ?",
          message: "Découvrez des modèles adaptés.",
          status: "scheduled",
          targetAudience: "all_android",
          audienceCount: 20,
          scheduledAt: Date.now() + 3_600_000,
          createdAt: Date.now(),
          destination: "/dashboard/new",
        },
      ];
    }
    if (id === "tokens") return { total: 100, active: 92, granted: 80, denied: 8 };
    if (id === "audience") {
      return {
        total: 60,
        counts: { all_android: 86, client_pro_all: 60 },
        sample: [{ _id: "u1", name: "Amine", email: "amine@test.tn" }],
      };
    }
    if (id === "campaign") {
      return {
        campaign: {
          _id: "p1",
          campaignName: "Relance estimation",
          title: "⭐ Votre avis compte !",
          status: "sent",
          stats: {
            targeted: 60,
            delivered: 55,
            failed: 5,
            skipped: 0,
            opened: 22,
            clicked: 6,
            conversions: 3,
            openRate: 40,
            clickRate: 10.9,
            conversionRate: 5.5,
          },
        },
        logs: [
          {
            _id: "l1",
            userName: "Amine",
            userEmail: "amine@test.tn",
            deliveryStatus: "accepted",
            openedAt: Date.now(),
            clickedAt: Date.now(),
            convertedAt: Date.now(),
            createdAt: Date.now(),
          },
        ],
      };
    }
    return undefined;
  },
  useMutation: () => async () => ({}),
}));

import { CampaignEditor, PushNotifications } from "./PushNotifications";

const draft = {
  campaignName: "Campagne test",
  category: "client_pro" as const,
  templateId: "cp-review",
  title: "⭐ Votre avis compte !",
  message: "Aidez-nous à améliorer Batibuild. Évaluez votre expérience.",
  imageUrl: "",
  icon: "Star",
  actionLabel: "Donner mon avis",
  destination: "/dashboard",
  targetAudience: "client_pro_all" as const,
  filters: {},
  selectedUserIds: [] as any[],
};

describe("module Push — tous les onglets", () => {
  it("tableau de bord", () => {
    const html = renderToStaticMarkup(<PushNotifications />);
    expect(html).toContain("Push Notifications");
    expect(html).toContain("Notifications envoyées");
    expect(html).toContain("Acceptées par FCM");
    expect(html).toContain("Performance par campagne");
    expect(html).toContain("Relance estimation");
  });

  it("modèles Client Pro, Experts et Fournisseurs", () => {
    const html = renderToStaticMarkup(<PushNotifications initialTab="modeles" />);
    expect(html).toContain("Client Pro");
    expect(html).toContain("Experts");
    expect(html).toContain("Fournisseurs");
    expect(html).toContain("⭐ Votre avis compte !");
    expect(html).toContain("🚀 Vous cherchez plus de clients et de marchés ?");
    expect(html).toContain("📦 Vous souhaitez trouver plus de clients ?");
    expect(html).toContain("Offre personnalisée");
  });

  it("campagnes et statuts", () => {
    const html = renderToStaticMarkup(<PushNotifications initialTab="campagnes" />);
    expect(html).toContain("Relance estimation");
    expect(html).toContain("Envoyée");
    expect(html).toContain("Programmée");
    expect(html).toContain("Détails");
  });

  it("éditeur avec aperçu Android et compteur de destinataires", () => {
    const html = renderToStaticMarkup(
      <CampaignEditor draft={draft} setDraft={() => undefined} />,
    );
    expect(html).toContain("Contenu de la notification");
    expect(html).toContain("Ciblage des destinataires");
    expect(html).toContain("Destinataires éligibles");
    expect(html).toContain("60");
    expect(html).toContain("Aperçu de la notification");
    expect(html).toContain("Envoyer maintenant");
    expect(html).toContain("Programmer");
  });
});
