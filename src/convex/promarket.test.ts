/// <reference types="vite/client" />

import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.js";
import { api } from "./_generated/api.js";

const modules = import.meta.glob("./**/*.*s");

// ============================================================================
// Helpers
// ============================================================================

async function insertUser(
  t: ReturnType<typeof convexTest>,
  overrides: Record<string, any> = {},
) {
  return t.run(async (ctx) => {
    return ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `user-${Math.random().toString(36).slice(2)}@test.com`,
      role: overrides.role ?? "user",
      userRole: overrides.userRole ?? "client",
      status: "active",
      subscriptionPlan: "free",
      phone: "+216 99 000 000",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    });
  });
}

function asUser(t: ReturnType<typeof convexTest>, userId: string) {
  return t.withIdentity({ subject: userId });
}

/**
 * RÈGLE D'ACCÈS PROFESSIONNELS — toute fiche ProMarket réelle est adossée à un
 * compte Expert BatiBuild. Ce helper crée le profil Expert correspondant
 * (`proMarketStatus: "active"` sauf indication contraire du test).
 */
async function insertExpertProfile(
  t: ReturnType<typeof convexTest>,
  userId: string,
  overrides: Record<string, any> = {},
) {
  const trade = overrides.trade ?? "plombier";
  const base = {
    userId: userId as any,
    profession: overrides.profession ?? "plombier",
    displayName: overrides.displayName ?? "Expert Test",
    companyName: overrides.companyName,
    phone: "+216 71 000 000",
    email: "expert@test.com",
    description:
      overrides.expertDescription ??
      "Expert BatiBuild de test avec une description suffisamment détaillée.",
    specialties: overrides.specialties ?? ["Fuite"],
    regions: [overrides.region ?? "tunis"],
    plan: "monthly",
    subscriptionStatus: overrides.expertSubscription ?? "active",
    isVisible: overrides.expertVisible ?? true,
    proMarketOptIn: overrides.expertOptIn ?? true,
    proMarketAvailable: overrides.expertAvailable ?? true,
    proMarketPrefs: {
      trade,
      kind: "independant" as const,
      availability: (overrides.availability ?? "immediate") as any,
      experienceYears: overrides.experienceYears ?? 5,
      urgent: false,
      homeService: true,
      ...(overrides.prefs ?? {}),
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return t.run(async (ctx) => {
    return ctx.db.insert("expertProfiles", {
      ...base,
      // `expertStatus: null` = aucune décision admin (en attente).
      ...("expertStatus" in overrides
        ? overrides.expertStatus
          ? { proMarketStatus: overrides.expertStatus }
          : {}
        : { proMarketStatus: "active" as const }),
    });
  });
}

async function insertProfessional(
  t: ReturnType<typeof convexTest>,
  overrides: Record<string, any> = {},
) {
  const userId =
    overrides.userId ?? (await insertUser(t, { userRole: "expert" }));
  const expertId = await insertExpertProfile(t, userId, overrides);

  return t.run(async (ctx) => {
    return ctx.db.insert("promarketProfiles", {
      userId,
      expertProfileId: expertId,
      displayName: overrides.displayName ?? "Pro Test",
      trade: overrides.trade ?? "plombier",
      category: "installations",
      kind: "independant",
      specialties: overrides.specialties ?? ["Fuite"],
      region: overrides.region ?? "tunis",
      city: overrides.city ?? "Tunis centre",
      zones: overrides.zones ?? ["Tunis"],
      phone: "+216 71 000 000",
      experienceYears: 5,
      availability: "immediate",
      urgent: false,
      homeService: true,
      ratingSum: overrides.ratingSum ?? 0,
      ratingCount: overrides.ratingCount ?? 0,
      views: 0,
      contacts: 0,
      verifiedIdentity: false,
      verifiedPro: false,
      verifiedDocs: false,
      recommended: false,
      status: overrides.status ?? "active",
      demo: overrides.demo ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    });
  });
}

const BASE_REQUEST = {
  kind: "service" as const,
  trade: "plombier",
  title: "Fuite d'eau salle de bain",
  description: "Fuite sous le lavabo, besoin d'une intervention rapide.",
  region: "tunis",
  city: "Tunis centre",
};

const RATINGS = {
  rating: 5,
  quality: 5,
  punctuality: 4,
  professionalism: 5,
  value: 4,
  communication: 5,
};

// ============================================================================
// Recherche & fiches
// ============================================================================

describe("promarket.searchProfessionals", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    await insertProfessional(t, { displayName: "Plombier Tunis", trade: "plombier" });
    await insertProfessional(t, {
      displayName: "Électricien Ariana",
      trade: "electricien",
      region: "ariana",
      city: "Ennasr",
      status: "pending",
    });
    await insertProfessional(t, {
      displayName: "Carreleur Sousse",
      trade: "carreleur",
      region: "sousse",
      city: "Sousse Ville",
      ratingSum: 47,
      ratingCount: 10,
    });
  });

  it("ne renvoie que les fiches actives", async () => {
    const res = await t.query(api.promarket.searchProfessionals, {});
    const names = res.results.map((p: any) => p.displayName);
    expect(names).toContain("Plombier Tunis");
    expect(names).not.toContain("Électricien Ariana");
  });

  it("masque les coordonnées au visiteur anonyme mais les expose à un compte", async () => {
    const anonymous = await t.query(api.promarket.searchProfessionals, {});
    expect(anonymous.results[0].phone).toBeUndefined();

    const uid = await insertUser(t);
    const authed = await asUser(t, uid).query(api.promarket.searchProfessionals, {});
    expect(authed.results[0].phone).toBe("+216 71 000 000");
  });

  it("filtre par métier, gouvernorat et note minimale", async () => {
    const byTrade = await t.query(api.promarket.searchProfessionals, {
      trade: "carreleur",
    });
    expect(byTrade.results).toHaveLength(1);

    const byRegion = await t.query(api.promarket.searchProfessionals, {
      region: "sousse",
    });
    expect(byRegion.results.map((p: any) => p.displayName)).toEqual([
      "Carreleur Sousse",
    ]);

    const byRating = await t.query(api.promarket.searchProfessionals, {
      minRating: 4,
    });
    expect(byRating.results.map((p: any) => p.displayName)).toEqual([
      "Carreleur Sousse",
    ]);
    expect(byRating.results[0].rating).toBe(4.7);
  });

  it("trie par note décroissante", async () => {
    const res = await t.query(api.promarket.searchProfessionals, { sort: "rating" });
    expect(res.results[0].displayName).toBe("Carreleur Sousse");
  });
});

describe("promarket.interpretNeed", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    await insertProfessional(t, { displayName: "Plombier Ariana", region: "ariana", city: "Ennasr" });
    await insertProfessional(t, { displayName: "Électricien Tunis", trade: "electricien" });
  });

  it("identifie le métier et la localisation d'un besoin en langage naturel", async () => {
    const res = await t.query(api.promarket.interpretNeed, {
      query: "Je cherche un plombier pour réparer une fuite dans ma salle de bain à Ariana, c'est urgent",
    });
    expect(res.need.trade).toBe("plombier");
    expect(res.need.region).toBe("ariana");
    expect(res.need.urgent).toBe(true);
    expect(res.need.confidence).toBeGreaterThan(0);
    expect(res.professionals.map((p: any) => p.displayName)).toContain("Plombier Ariana");
  });

  it("ne propose rien quand le besoin n'est pas reconnu", async () => {
    const res = await t.query(api.promarket.interpretNeed, {
      query: "bonjour comment allez vous",
    });
    expect(res.need.trade).toBeUndefined();
    expect(res.need.confidence).toBe(0);
  });
});

describe("promarket.getProfessional", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
  });

  it("renvoie null pour une fiche suspendue (hors staff et propriétaire)", async () => {
    const proUserId = await insertUser(t);
    const id = await insertProfessional(t, {
      userId: proUserId,
      status: "suspended",
    });
    const other = await insertUser(t);
    expect(
      await asUser(t, other).query(api.promarket.getProfessional, {
        professionalId: id as any,
      }),
    ).toBeNull();
    expect(
      await asUser(t, proUserId).query(api.promarket.getProfessional, {
        professionalId: id as any,
      }),
    ).not.toBeNull();
  });

  it("n'expose que les avis approuvés", async () => {
    const id = await insertProfessional(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("promarketReviews", {
        professionalId: id as any,
        rating: 5,
        quality: 5,
        punctuality: 5,
        professionalism: 5,
        value: 5,
        communication: 5,
        comment: "Approuvé",
        status: "approved",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("promarketReviews", {
        professionalId: id as any,
        rating: 1,
        quality: 1,
        punctuality: 1,
        professionalism: 1,
        value: 1,
        communication: 1,
        comment: "En attente de modération",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const detail = await t.query(api.promarket.getProfessional, {
      professionalId: id as any,
    });
    expect(detail?.reviews).toHaveLength(1);
    expect(detail?.reviews[0].comment).toBe("Approuvé");
  });
});

// ============================================================================
// Fiche professionnelle (espace pro)
// ============================================================================

// ============================================================================
// RÈGLE D'ACCÈS PROFESSIONNELS — ProMarket = Experts BatiBuild uniquement
// ============================================================================

describe("promarket — accès réservé aux Experts BatiBuild", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("refuse toute inscription professionnelle indépendante", async () => {
    // §1 : un utilisateur sans profil Expert ne peut PAS créer de fiche.
    const uid = await insertUser(t);
    await expect(
      asUser(t, uid).mutation(api.promarket.setMyProMarketPreferences, {
        optIn: true,
        trade: "plombier",
      }),
    ).rejects.toThrow("Experts BatiBuild");

    const search = await t.query(api.promarket.searchProfessionals, {});
    expect(search.results).toHaveLength(0);
  });

  it("n'expose une fiche Expert qu'après activation + validation admin", async () => {
    const uid = await insertUser(t, { userRole: "expert" });
    const adminId = await insertUser(t, { role: "admin" });
    const expertId = await insertExpertProfile(t, uid, {
      expertOptIn: false,
      expertStatus: null,
      displayName: "Nouveau Pro",
    });

    // Tant que ProMarket n'est pas activé, rien n'est publié.
    expect((await t.query(api.promarket.searchProfessionals, {})).results).toHaveLength(0);

    await asUser(t, uid).mutation(api.promarket.setMyProMarketPreferences, {
      optIn: true,
      available: true,
      trade: "peintre",
      experienceYears: 4,
      availability: "week",
      homeService: true,
    });
    // Activation demandée → en attente de validation administrateur.
    expect((await t.query(api.promarket.searchProfessionals, {})).results).toHaveLength(0);
    const pending = await asUser(t, adminId).query(
      api.promarketAdmin.adminListProMarketExperts,
      { bucket: "pending" },
    );
    expect(pending.map((r: any) => r.expertId)).toContain(expertId);

    // La note 4.9 du profil Expert n'est pas dupliquée : le nom oui.
    await asUser(t, adminId).mutation(
      api.promarketAdmin.adminSetExpertProMarketStatus,
      { expertId: expertId as any, action: "approve" },
    );
    const search = await t.query(api.promarket.searchProfessionals, {});
    expect(search.results.map((p: any) => p.displayName)).toEqual(["Nouveau Pro"]);
    expect(search.results[0].trade).toBe("peintre");
    expect(search.results[0].expertProfileId).toBe(expertId);
    expect(search.results[0].demo).toBe(false);

    // Le profil Expert reste la source : une modification est répercutée.
    await asUser(t, uid).mutation(api.expertProfiles.updateProfile, {
      displayName: "Expert Renommé",
    });
    const after = await t.query(api.promarket.searchProfessionals, {});
    expect(after.results[0].displayName).toBe("Expert Renommé");
  });

  it("masque les Experts désactivés, masqués ou au compte inactif", async () => {
    const adminId = await insertUser(t, { role: "admin" });

    // Expert publié puis désactivé par l'administration.
    const disabled = await insertProfessional(t, { displayName: "Expert Désactivé" });
    const experts = await asUser(t, adminId).query(
      api.promarketAdmin.adminListProMarketExperts,
      { bucket: "all" },
    );
    const target = experts.find((e: any) => e.displayName === "Expert Désactivé");
    expect(target).toBeTruthy();
    await asUser(t, adminId).mutation(
      api.promarketAdmin.adminSetExpertProMarketStatus,
      { expertId: target!.expertId, action: "disable" },
    );
    expect((await t.query(api.promarket.searchProfessionals, {})).results).toHaveLength(0);
    // La fiche reste consultable par son propriétaire, pas par un tiers.
    expect(
      await t.query(api.promarket.getProfessional, {
        professionalId: disabled as any,
      }),
    ).toBeNull();

    // Expert masqué (profil Expert non visible).
    await asUser(t, adminId).mutation(
      api.promarketAdmin.adminSetExpertProMarketStatus,
      { expertId: target!.expertId, action: "enable" },
    );
    expect((await t.query(api.promarket.searchProfessionals, {})).results).toHaveLength(1);

    const hiddenUser = await insertUser(t, { userRole: "expert" });
    await insertProfessional(t, {
      userId: hiddenUser,
      displayName: "Expert Masqué",
      expertVisible: false,
    });
    expect((await t.query(api.promarket.searchProfessionals, {})).results).toHaveLength(1);

    // Compte BatiBuild désactivé.
    const blockedUser = await insertUser(t, { userRole: "expert", status: "disabled" });
    await insertProfessional(t, {
      userId: blockedUser,
      displayName: "Expert Bloqué",
    });
    expect((await t.query(api.promarket.searchProfessionals, {})).results).toHaveLength(1);

    // Espace Expert non actif (abonnement inactif).
    const inactiveUser = await insertUser(t, { userRole: "expert" });
    await insertProfessional(t, {
      userId: inactiveUser,
      displayName: "Expert Inactif",
      expertSubscription: "inactive",
    });
    expect((await t.query(api.promarket.searchProfessionals, {})).results).toHaveLength(1);
  });

  it("n'attribue jamais les badges automatiquement à la publication", async () => {
    const uid = await insertUser(t, { userRole: "expert" });
    await insertExpertProfile(t, uid, { expertOptIn: false, expertStatus: null });
    await asUser(t, uid).mutation(api.promarket.setMyProMarketPreferences, {
      optIn: true,
    });
    const mine = await asUser(t, uid).query(api.promarket.getMyProfessionalProfile, {});
    expect(mine.eligibility?.eligible).toBe(false);
    expect(mine.eligibility?.reasons).toContain("pending_validation");
    expect(mine.profile).toBeNull();
  });

  it("exige un profil Expert suffisamment renseigné", async () => {
    const uid = await insertUser(t, { userRole: "expert" });
    await insertExpertProfile(t, uid, {
      expertDescription: "trop court",
      specialties: [],
    });
    const mine = await asUser(t, uid).query(api.promarket.getMyProfessionalProfile, {});
    expect(mine.eligibility?.eligible).toBe(false);
    expect(mine.eligibility?.reasons).toContain("incomplete_profile");

    await asUser(t, uid).mutation(api.expertProfiles.updateProfile, {
      specialties: ["Recherche de fuite"],
      description:
        "Plombier expérimenté intervenant sur Tunis et sa périphérie pour toute urgence.",
    });
    const after = await asUser(t, uid).query(api.promarket.getMyProfessionalProfile, {});
    expect(after.eligibility?.eligible).toBe(true);
    expect(after.profile?.displayName).toBe("Expert Test");
  });

  it("expose les compteurs de pilotage à l'administration seulement", async () => {
    const uid = await insertUser(t);
    const adminId = await insertUser(t, { role: "admin" });
    await insertProfessional(t);
    await expect(
      asUser(t, uid).query(api.promarketAdmin.adminProMarketExpertCounts, {}),
    ).rejects.toThrow("administration");
    const counts = await asUser(t, adminId).query(
      api.promarketAdmin.adminProMarketExpertCounts,
      {},
    );
    expect(counts.totalExperts).toBe(1);
    expect(counts.eligible).toBe(1);
    expect(counts.active).toBe(1);
    expect(counts.publishedProfiles).toBe(1);
  });

  it("n'autorise pas la modification des badges depuis les préférences", async () => {
    const uid = await insertUser(t, { userRole: "expert" });
    await insertProfessional(t, { userId: uid });
    // Tentative d'injection d'un badge : le champ n'existe pas dans les
    // arguments de la mutation publique, le validateur la rejette.
    await expect(
      asUser(t, uid).mutation(api.promarket.setMyProMarketPreferences, {
        optIn: true,
        verifiedPro: true,
      } as any),
    ).rejects.toThrow();

    await asUser(t, uid).mutation(api.promarket.setMyProMarketPreferences, {
      optIn: true,
      available: false,
    });
    const experts = await t.run(async (ctx) =>
      ctx.db.query("expertProfiles").collect(),
    );
    expect(experts[0].proMarketAvailable).toBe(false);
    const raw = await t.run(async (ctx) =>
      ctx.db.query("promarketProfiles").first(),
    );
    expect(raw!.verifiedPro).toBe(false);
    // Indisponible → visible mais marqué occupé (aucune nouvelle mission).
    expect(raw!.availability).toBe("busy");
    expect((await t.query(api.promarket.searchProfessionals, {})).total).toBe(1);
  });
});

// ============================================================================
// Demandes, devis, messagerie
// ============================================================================

describe("promarket requests, quotes and messaging", () => {
  let t: ReturnType<typeof convexTest>;
  let clientId: string;
  let proUserId: string;
  let otherProUserId: string;
  let adminId: string;
  let profileId: string;
  let otherProfileId: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    clientId = await insertUser(t, { email: "client@test.com" });
    proUserId = await insertUser(t, { email: "pro@test.com" });
    otherProUserId = await insertUser(t, { email: "other@test.com" });
    adminId = await insertUser(t, { role: "admin", email: "admin@test.com" });
    profileId = await insertProfessional(t, {
      userId: proUserId,
      displayName: "Plombier Test",
    });
    otherProfileId = await insertProfessional(t, {
      userId: otherProUserId,
      displayName: "Électricien Test",
      trade: "electricien",
    });
  });

  it("valide les champs obligatoires d'une demande", async () => {
    await expect(
      asUser(t, clientId).mutation(api.promarket.createRequest, {
        ...BASE_REQUEST,
        title: "ab",
      }),
    ).rejects.toThrow("titre");
    await expect(
      asUser(t, clientId).mutation(api.promarket.createRequest, {
        ...BASE_REQUEST,
        description: "court",
      }),
    ).rejects.toThrow("10 caractères");
  });

  it("notifie le professionnel visé", async () => {
    await asUser(t, clientId).mutation(api.promarket.createRequest, {
      ...BASE_REQUEST,
      professionalId: profileId as any,
      kind: "quote",
    });
    const notifs = await t.run(async (ctx) =>
      ctx.db
        .query("notifications")
        .filter((q: any) => q.eq(q.field("userId"), proUserId))
        .collect(),
    );
    expect(notifs.some((n) => n.type === "promarket_new_request")).toBe(true);
  });

  it("réserve la lecture du détail au client, au professionnel visé et au staff", async () => {
    const requestId = await asUser(t, clientId).mutation(api.promarket.createRequest, {
      ...BASE_REQUEST,
      professionalId: profileId as any,
      kind: "quote",
    });
    expect(
      await asUser(t, clientId).query(api.promarket.getRequestDetail, {
        requestId,
      }),
    ).not.toBeNull();
    expect(
      await asUser(t, proUserId).query(api.promarket.getRequestDetail, {
        requestId,
      }),
    ).not.toBeNull();
    expect(
      await asUser(t, adminId).query(api.promarket.getRequestDetail, {
        requestId,
      }),
    ).not.toBeNull();
    // Un autre professionnel n'a aucun accès.
    expect(
      await asUser(t, otherProUserId).query(api.promarket.getRequestDetail, {
        requestId,
      }),
    ).toBeNull();
  });

  it("autorise un devis uniquement au professionnel concerné", async () => {
    const requestId = await asUser(t, clientId).mutation(api.promarket.createRequest, {
      ...BASE_REQUEST,
      professionalId: profileId as any,
      kind: "quote",
    });
    // Mauvais métier (et fiche non visée) : refusé.
    await expect(
      asUser(t, otherProUserId).mutation(api.promarket.createQuote, {
        requestId,
        price: 200,
        description: "Je peux intervenir",
      }),
    ).rejects.toThrow("professionnels concernés");

    // Client sans fiche : refusé.
    await expect(
      asUser(t, clientId).mutation(api.promarket.createQuote, {
        requestId,
        price: 200,
        description: "Je peux intervenir",
      }),
    ).rejects.toThrow("professionnels concernés");

    const quoteId = await asUser(t, proUserId).mutation(api.promarket.createQuote, {
      requestId,
      price: 180,
      delayDays: 2,
      description: "Intervention sous 48h",
    });
    expect(quoteId).toBeTruthy();

    // Un second devis du même professionnel est refusé.
    await expect(
      asUser(t, proUserId).mutation(api.promarket.createQuote, {
        requestId,
        price: 190,
        description: "Nouveau devis",
      }),
    ).rejects.toThrow("déjà envoyé");

    const detail = await asUser(t, clientId).query(api.promarket.getRequestDetail, {
      requestId,
    });
    expect(detail?.request.status).toBe("quote_received");
    expect(detail?.quotes).toHaveLength(1);
  });

  it("permet à un professionnel du même métier de répondre à une demande publiée", async () => {
    const requestId = await asUser(t, clientId).mutation(api.promarket.createRequest, {
      ...BASE_REQUEST,
    });
    const quoteId = await asUser(t, proUserId).mutation(api.promarket.createQuote, {
      requestId,
      price: 150,
      description: "Disponible demain matin",
    });
    const detail = await asUser(t, clientId).query(api.promarket.getRequestDetail, {
      requestId,
    });
    expect(detail?.request.professionalId).toBe(profileId);
    expect(detail?.quotes[0]._id).toBe(quoteId);
  });

  it("n'accepte un devis que par le client, et refuse les autres devis", async () => {
    const requestId = await asUser(t, clientId).mutation(api.promarket.createRequest, {
      ...BASE_REQUEST,
    });
    const first = await asUser(t, proUserId).mutation(api.promarket.createQuote, {
      requestId,
      price: 150,
      description: "Offre 1",
    });
    // Un second Expert BatiBuild peut aussi postuler : il déclare « plombier »
    // comme métier ProMarket et sa fiche est resynchronisée.
    await asUser(t, otherProUserId).mutation(
      api.promarket.setMyProMarketPreferences,
      { optIn: true, trade: "plombier" },
    );

    // Le professionnel ne peut pas accepter son propre devis.
    await expect(
      asUser(t, proUserId).mutation(api.promarket.respondToQuote, {
        quoteId: first,
        accept: true,
      }),
    ).rejects.toThrow("client");

    await asUser(t, clientId).mutation(api.promarket.respondToQuote, {
      quoteId: first,
      accept: true,
    });
    const detail = await asUser(t, clientId).query(api.promarket.getRequestDetail, {
      requestId,
    });
    expect(detail?.request.status).toBe("accepted");
    expect(detail?.quotes[0].status).toBe("accepted");
  });

  it("échange des messages et marque les messages lus", async () => {
    const requestId = await asUser(t, clientId).mutation(api.promarket.createRequest, {
      ...BASE_REQUEST,
      professionalId: profileId as any,
      kind: "quote",
    });
    await asUser(t, proUserId).mutation(api.promarket.sendRequestMessage, {
      requestId,
      body: "Bonjour, je peux passer demain.",
    });
    await asUser(t, clientId).mutation(api.promarket.sendRequestMessage, {
      requestId,
      body: "Parfait, à demain.",
    });

    let detail = await asUser(t, clientId).query(api.promarket.getRequestDetail, {
      requestId,
    });
    expect(detail?.messages).toHaveLength(2);
    expect(detail?.messages[0].senderRole).toBe("professional");

    await asUser(t, clientId).mutation(api.promarket.markRequestMessagesRead, {
      requestId,
    });
    detail = await asUser(t, clientId).query(api.promarket.getRequestDetail, {
      requestId,
    });
    expect(detail?.messages[0].readAt).toBeDefined();
  });

  it("refuse les messages d'un utilisateur non concerné", async () => {
    const requestId = await asUser(t, clientId).mutation(api.promarket.createRequest, {
      ...BASE_REQUEST,
      professionalId: profileId as any,
      kind: "quote",
    });
    await expect(
      asUser(t, otherProUserId).mutation(api.promarket.sendRequestMessage, {
        requestId,
        body: "Je m'incruste",
      }),
    ).rejects.toThrow("Accès refusé");
  });

  it("empêche le client de modifier une demande qui ne lui appartient pas", async () => {
    const otherClient = await insertUser(t, { email: "client2@test.com" });
    const requestId = await asUser(t, clientId).mutation(api.promarket.createRequest, {
      ...BASE_REQUEST,
      professionalId: profileId as any,
      kind: "quote",
    });
    await expect(
      asUser(t, otherClient).mutation(api.promarket.updateRequestStatus, {
        requestId,
        status: "canceled",
      }),
    ).rejects.toThrow("Accès refusé");
  });
});

// ============================================================================
// Avis & modération
// ============================================================================

describe("promarket reviews", () => {
  let t: ReturnType<typeof convexTest>;
  let clientId: string;
  let proUserId: string;
  let adminId: string;
  let profileId: string;
  let requestId: any;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    clientId = await insertUser(t, { email: "c@test.com" });
    proUserId = await insertUser(t, { email: "p@test.com" });
    adminId = await insertUser(t, { role: "admin", email: "a@test.com" });
    profileId = await insertProfessional(t, { userId: proUserId });
    requestId = await asUser(t, clientId).mutation(api.promarket.createRequest, {
      ...BASE_REQUEST,
      professionalId: profileId as any,
      kind: "quote",
    });
  });

  it("interdit un avis avant une intervention acceptée", async () => {
    await expect(
      asUser(t, clientId).mutation(api.promarket.createReview, {
        professionalId: profileId as any,
        ...RATINGS,
      }),
    ).rejects.toThrow("après une intervention");
  });

  it("publie l'avis après modération et met à jour la note", async () => {
    const quoteId = await asUser(t, proUserId).mutation(api.promarket.createQuote, {
      requestId,
      price: 120,
      description: "Intervention rapide",
    });
    await asUser(t, clientId).mutation(api.promarket.respondToQuote, {
      quoteId,
      accept: true,
    });

    const reviewId = await asUser(t, clientId).mutation(api.promarket.createReview, {
      professionalId: profileId as any,
      comment: "Travail impeccable",
      ...RATINGS,
    });

    // Tant que l'avis n'est pas validé, il n'est pas visible publiquement.
    let detail = await t.query(api.promarket.getProfessional, {
      professionalId: profileId as any,
    });
    expect(detail?.reviews).toHaveLength(0);

    // Un utilisateur non-staff ne peut pas modérer.
    await expect(
      asUser(t, clientId).mutation(api.promarketAdmin.adminModerateReview, {
        reviewId,
        status: "approved",
      }),
    ).rejects.toThrow("administration");

    await asUser(t, adminId).mutation(api.promarketAdmin.adminModerateReview, {
      reviewId,
      status: "approved",
    });
    detail = await t.query(api.promarket.getProfessional, {
      professionalId: profileId as any,
    });
    expect(detail?.reviews).toHaveLength(1);
    expect(detail?.profile.ratingCount).toBe(1);
    expect(detail?.profile.rating).toBe(5);

    // Masquer l'avis retire l'avis des agrégats.
    await asUser(t, adminId).mutation(api.promarketAdmin.adminModerateReview, {
      reviewId,
      status: "hidden",
    });
    detail = await t.query(api.promarket.getProfessional, {
      professionalId: profileId as any,
    });
    expect(detail?.profile.ratingCount).toBe(0);
  });

  it("refuse les notes hors bornes et les avis en double", async () => {
    const quoteId = await asUser(t, proUserId).mutation(api.promarket.createQuote, {
      requestId,
      price: 120,
      description: "Intervention rapide",
    });
    await asUser(t, clientId).mutation(api.promarket.respondToQuote, {
      quoteId,
      accept: true,
    });
    await expect(
      asUser(t, clientId).mutation(api.promarket.createReview, {
        professionalId: profileId as any,
        ...RATINGS,
        rating: 9,
      }),
    ).rejects.toThrow("entre 1 et 5");

    await asUser(t, clientId).mutation(api.promarket.createReview, {
      professionalId: profileId as any,
      ...RATINGS,
    });
    await expect(
      asUser(t, clientId).mutation(api.promarket.createReview, {
        professionalId: profileId as any,
        ...RATINGS,
      }),
    ).rejects.toThrow("déjà laissé");
  });
});

// ============================================================================
// Favoris, signalements, badges
// ============================================================================

describe("promarket favourites, reports and badges", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("bascule un favori et le liste", async () => {
    const uid = await insertUser(t);
    const profileId = await insertProfessional(t);
    const first = await asUser(t, uid).mutation(
      api.promarket.toggleSavedProfessional,
      { professionalId: profileId as any },
    );
    expect(first.saved).toBe(true);
    const saved = await asUser(t, uid).query(
      api.promarket.listSavedProfessionals,
      {},
    );
    expect(saved).toHaveLength(1);

    const second = await asUser(t, uid).mutation(
      api.promarket.toggleSavedProfessional,
      { professionalId: profileId as any },
    );
    expect(second.saved).toBe(false);
    expect(
      await asUser(t, uid).query(api.promarket.listSavedProfessionals, {}),
    ).toHaveLength(0);
  });

  it("empêche les signalements en double", async () => {
    const uid = await insertUser(t);
    const profileId = await insertProfessional(t);
    await asUser(t, uid).mutation(api.promarket.reportTarget, {
      targetType: "professional",
      targetId: profileId as any,
      reason: "Fiche suspecte à vérifier",
    });
    await expect(
      asUser(t, uid).mutation(api.promarket.reportTarget, {
        targetType: "professional",
        targetId: profileId as any,
        reason: "Encore une fois",
      }),
    ).rejects.toThrow("déjà signalé");
  });

  it("réserve l'attribution des badges à l'administration", async () => {
    const uid = await insertUser(t);
    const adminId = await insertUser(t, { role: "admin" });
    const profileId = await insertProfessional(t);

    await expect(
      asUser(t, uid).mutation(api.promarketAdmin.adminSetBadges, {
        professionalId: profileId as any,
        verifiedPro: true,
      }),
    ).rejects.toThrow("administration");

    await asUser(t, adminId).mutation(api.promarketAdmin.adminSetBadges, {
      professionalId: profileId as any,
      verifiedPro: true,
      recommended: true,
    });
    const detail = await t.query(api.promarket.getProfessional, {
      professionalId: profileId as any,
    });
    expect(detail?.profile.verifiedPro).toBe(true);
    expect(detail?.profile.recommended).toBe(true);
  });

  it("réserve les statistiques admin au staff", async () => {
    const uid = await insertUser(t);
    const adminId = await insertUser(t, { role: "admin" });
    const profileId = await insertProfessional(t);
    await expect(
      asUser(t, uid).query(api.promarketAdmin.adminStats, {}),
    ).rejects.toThrow("administration");
    const stats = await asUser(t, adminId).query(api.promarketAdmin.adminStats, {});
    expect(stats.professionals).toBe(1);
    expect(stats.activeProfessionals).toBe(1);
    expect(stats.pendingReviews).toBe(0);
    void profileId;
  });

  it("gère le CRUD des catégories (admin uniquement)", async () => {
    const uid = await insertUser(t);
    const adminId = await insertUser(t, { role: "admin" });
    await expect(
      asUser(t, uid).mutation(api.promarketAdmin.adminUpsertCategory, {
        slug: "jardinage",
        label: "Jardinage",
      }),
    ).rejects.toThrow("administration");

    await asUser(t, adminId).mutation(api.promarketAdmin.adminUpsertCategory, {
      slug: "jardinage",
      label: "Jardinage",
      icon: "Palmtree",
    });
    const categories = await asUser(t, adminId).query(
      api.promarketAdmin.adminListCategories,
      {},
    );
    expect(categories.map((c: any) => c.slug)).toContain("jardinage");

    await asUser(t, adminId).mutation(api.promarketAdmin.adminDeleteCategory, {
      slug: "jardinage",
    });
    const after = await asUser(t, adminId).query(
      api.promarketAdmin.adminListCategories,
      {},
    );
    expect(after.map((c: any) => c.slug)).not.toContain("jardinage");
  });
});

// ============================================================================
// Données de démonstration
// ============================================================================

describe("promarket demo data", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("amorce des fiches marquées démo, sans badge de vérification", async () => {
    const uid = await insertUser(t);
    const result = await asUser(t, uid).mutation(api.promarket.ensureDemoData, {});
    expect(result.seeded).toBe(true);
    expect(result.professionals).toBeGreaterThan(10);

    const search = await t.query(api.promarket.searchProfessionals, { limit: 60 });
    expect(search.results.length).toBe(result.professionals);
    for (const profile of search.results) {
      expect(profile.demo).toBe(true);
      expect(profile.verifiedPro).toBe(false);
      expect(profile.verifiedIdentity).toBe(false);
    }

    // Idempotent : un second appel n'insère rien.
    const second = await asUser(t, uid).mutation(api.promarket.ensureDemoData, {});
    expect(second.seeded).toBe(false);

    // Les catégories sont amorcées dans la table admin.
    const categories = await t.query(api.promarket.listCategories, {});
    expect(categories.length).toBeGreaterThanOrEqual(6);
    expect(categories.every((c: any) => c.seeded)).toBe(true);
  });

  it("couvre plusieurs gouvernorats et métiers", async () => {
    const uid = await insertUser(t);
    await asUser(t, uid).mutation(api.promarket.ensureDemoData, {});
    const regions = new Set<string>();
    const trades = new Set<string>();
    for (const args of [
      { region: "tunis" },
      { region: "sousse" },
      { region: "sfax" },
      { region: "ariana" },
      { region: "nabeul" },
      { region: "bizerte" },
    ]) {
      const res = await t.query(api.promarket.searchProfessionals, args);
      for (const p of res.results) {
        regions.add(p.region);
        trades.add(p.trade);
      }
    }
    expect(regions.size).toBeGreaterThanOrEqual(5);
    expect(trades.size).toBeGreaterThanOrEqual(8);
  });
});
