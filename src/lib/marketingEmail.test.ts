import { describe, expect, it } from "vitest";

import {
  applyMarketingVariables,
  buildMarketingEmail,
  safeMarketingUrl,
  SAMPLE_MARKETING_VARIABLES,
} from "./marketingEmail";
import {
  MARKETING_TEMPLATES,
  getMarketingTemplate,
  templateDefaults,
  templatesForCategory,
} from "./marketingTemplates";
import { MARKETING_SEGMENTS, segmentsForCategory, segmentLabel } from "./marketingAudience";

describe("variables de campagne", () => {
  it("remplace les variables, avec ou sans espaces", () => {
    expect(applyMarketingVariables("Bonjour {{prenom}} !", { prenom: "Amine" })).toBe(
      "Bonjour Amine !",
    );
    expect(applyMarketingVariables("Bonjour {{ prenom }} !", { prenom: "Sara" })).toBe(
      "Bonjour Sara !",
    );
  });

  it("nettoie la ponctuation quand une variable est vide", () => {
    expect(applyMarketingVariables("Bonjour {{prenom}},", { prenom: "" })).toBe("Bonjour,");
    expect(applyMarketingVariables("{{nom_entreprise}}", {})).toBe("");
  });

  it("conserve une variable inconnue telle quelle", () => {
    expect(applyMarketingVariables("{{inconnue}}", {})).toBe("{{inconnue}}");
  });

  it("échappe le HTML des valeurs (pas d'injection via un nom d'entreprise)", () => {
    expect(
      applyMarketingVariables("{{nom_entreprise}}", { nom_entreprise: "<script>x</script>" }),
    ).toBe("&lt;script&gt;x&lt;/script&gt;");
  });
});

describe("URLs de campagne", () => {
  it("accepte les chemins internes et les URL http(s)", () => {
    expect(safeMarketingUrl("/dashboard", "https://batibuild.app")).toBe(
      "https://batibuild.app/dashboard",
    );
    expect(safeMarketingUrl("https://exemple.tn/offre", "https://batibuild.app")).toBe(
      "https://exemple.tn/offre",
    );
  });

  it("refuse les schémas dangereux", () => {
    expect(safeMarketingUrl("javascript:alert(1)", "https://batibuild.app")).toBe(
      "https://batibuild.app",
    );
    expect(safeMarketingUrl("data:text/html,x", "https://batibuild.app")).toBe(
      "https://batibuild.app",
    );
  });
});

describe("rendu de l'e-mail", () => {
  const base = {
    subject: "Bonjour {{prenom}}, votre budget",
    intro: "Bonjour {{prenom}},\n\nVotre projet mérite un vrai budget.",
    body: "Avec Batibuild :\n\n- Estimer le coût.\n- Comparer les scénarios.",
    ctaLabel: "Estimer mon projet",
    ctaUrl: "/dashboard/new",
    siteUrl: "https://batibuild.app",
    siteName: "batibuild",
    feedbackEnabled: true,
    feedbackUrl: "https://batibuild.app/avis?c=abc&t=jeton",
    unsubscribeUrl: "https://rightful-mouse-955.convex.site/t/u?token=jeton",
    trackingPixelUrl: "https://rightful-mouse-955.convex.site/t/o?token=jeton",
  };

  it("personnalise l'objet et le contenu", () => {
    const email = buildMarketingEmail(base, { prenom: "Amine" });
    expect(email.subject).toBe("Bonjour Amine, votre budget");
    expect(email.html).toContain("Bonjour Amine,");
    expect(email.html).toContain("Votre projet mérite un vrai budget.");
    expect(email.text).toContain("Bonjour Amine,");
  });

  it("transforme les puces et affiche le bouton vers la bonne destination", () => {
    const email = buildMarketingEmail(base, { prenom: "Amine" });
    expect(email.html).toContain("<ul");
    expect(email.html).toContain("Estimer le coût.");
    expect(email.html).toContain("https://batibuild.app/dashboard/new");
    expect(email.html).toContain("Estimer mon projet");
  });

  it("ajoute les 5 étoiles de la page d'avis et le pixel de suivi", () => {
    const email = buildMarketingEmail(base, { prenom: "Amine" });
    expect((email.html.match(/note=[1-5]/g) ?? []).length).toBe(5);
    expect(email.html).toContain("/avis?c=abc&amp;t=jeton");
    expect(email.html).toContain("/t/o?token=jeton");
    expect(email.html).toContain("/t/u?token=jeton");
    expect(email.html).toContain("Se désinscrire des offres");
  });

  it("n'affiche ni pixel ni étoiles dans un aperçu sans suivi", () => {
    const email = buildMarketingEmail(
      { ...base, feedbackUrl: undefined, trackingPixelUrl: undefined, unsubscribeUrl: undefined },
      SAMPLE_MARKETING_VARIABLES,
    );
    expect(email.html).not.toContain("/t/o?token=");
    expect(email.html).not.toContain("&note=");
    expect(email.html).not.toContain("Se désinscrire");
  });

  it("affiche les conditions et la date de validité", () => {
    const email = buildMarketingEmail(
      {
        ...base,
        conditions: "Récompenses selon les parrainages validés.",
        validUntil: "31/12/2026",
      },
      { prenom: "Amine" },
    );
    expect(email.html).toContain("Récompenses selon les parrainages validés.");
    expect(email.html).toContain("31/12/2026");
  });
});

describe("catalogue de modèles", () => {
  it("propose tous les modèles demandés, avec des identifiants uniques", () => {
    expect(templatesForCategory("client_pro")).toHaveLength(8);
    expect(templatesForCategory("expert")).toHaveLength(3);
    expect(templatesForCategory("supplier")).toHaveLength(3);
    expect(new Set(MARKETING_TEMPLATES.map((t) => t.id)).size).toBe(MARKETING_TEMPLATES.length);
  });

  it("chaque catégorie possède son modèle d'évaluation interactif", () => {
    for (const category of ["client_pro", "expert", "supplier"] as const) {
      const feedback = templatesForCategory(category).filter((t) => t.feedback);
      expect(feedback).toHaveLength(1);
      expect(feedback[0].subject.length).toBeGreaterThan(10);
    }
  });

  it("pré-remplit une campagne modifiable", () => {
    const template = getMarketingTemplate("cp-suivi-chantier")!;
    const defaults = templateDefaults(template);
    expect(defaults.category).toBe("client_pro");
    expect(defaults.ctaUrl).toBe("/dashboard/chantiers");
    expect(defaults.subject).toContain("contrôle de votre chantier");
    expect(defaults.feedbackEnabled).toBe(false);
  });

  it("couvre les 9 audiences et les regroupe par catégorie", () => {
    expect(MARKETING_SEGMENTS).toHaveLength(9);
    expect(segmentsForCategory("expert").map((s) => s.id)).toEqual([
      "expert_all",
      "expert_active",
      "expert_inactive",
    ]);
    expect(segmentLabel("supplier_all")).toBe("Tous les Fournisseurs");
  });
});
