import { describe, expect, it } from "vitest";

import {
  isConversionDestination,
  PUSH_MODULE_IDS,
  safePushDestination,
} from "./pushAudience";
import {
  PUSH_MESSAGE_MAX,
  PUSH_TEMPLATES,
  PUSH_TITLE_MAX,
  pushTemplatesForCategory,
  templateDefaults,
} from "./pushTemplates";

describe("modèles push", () => {
  it("contient les 15 modèles demandés (9 Client Pro, 3 Experts, 3 Fournisseurs)", () => {
    expect(PUSH_TEMPLATES).toHaveLength(15);
    expect(pushTemplatesForCategory("client_pro")).toHaveLength(8);
    expect(pushTemplatesForCategory("expert")).toHaveLength(3);
    expect(pushTemplatesForCategory("supplier")).toHaveLength(3);
    expect(pushTemplatesForCategory("custom")).toHaveLength(1);
  });

  it("respecte les limites d'affichage Android et des destinations sûres", () => {
    for (const template of PUSH_TEMPLATES) {
      expect(template.title.length).toBeLessThanOrEqual(PUSH_TITLE_MAX);
      expect(template.message.length).toBeLessThanOrEqual(PUSH_MESSAGE_MAX);
      if (template.destination) {
        expect(safePushDestination(template.destination)).toBe(template.destination);
      }
    }
  });

  it("reprend exactement les textes imposés", () => {
    const cost = PUSH_TEMPLATES.find((template) => template.id === "cp-cost");
    expect(cost?.title).toBe("🏗️ Connaissez-vous le vrai coût de votre construction ?");
    expect(cost?.message).toBe(
      "Matériaux, main-d'œuvre, finitions... Découvrez combien coûtera réellement votre projet avec Batibuild.",
    );
    expect(cost?.actionLabel).toBe("Estimer mon projet");

    const expert = PUSH_TEMPLATES.find((template) => template.id === "ex-referral");
    expect(expert?.title).toBe("🎁 Parrainez et gagnez jusqu'à 6 mois gratuits !");
    expect(expert?.message).toBe(
      "Invitez vos collègues professionnels à rejoindre Batibuild et profitez de mois d'abonnement gratuits selon les conditions du programme.",
    );
  });

  it("propose un brouillon complet pour chaque modèle", () => {
    for (const template of PUSH_TEMPLATES) {
      const defaults = templateDefaults(template);
      expect(defaults.campaignName.length).toBeGreaterThan(0);
      expect(defaults.title).toBe(template.title);
      expect(defaults.message).toBe(template.message);
    }
  });
});

describe("destinations et conversions", () => {
  it("refuse les schémas dangereux et accepte routes internes / HTTPS", () => {
    expect(safePushDestination("/dashboard/new")).toBe("/dashboard/new");
    expect(safePushDestination("/dashboard/chantiers?tab=1")).toBe(
      "/dashboard/chantiers?tab=1",
    );
    expect(safePushDestination("https://batibuild.app/offre")).toBe(
      "https://batibuild.app/offre",
    );
    expect(safePushDestination("javascript:alert(1)")).toBeNull();
    expect(safePushDestination("//evil.example/phish")).toBeNull();
    expect(safePushDestination("http://batibuild.app")).toBeNull();
    expect(safePushDestination("data:text/html,<script>x</script>")).toBeNull();
    expect(safePushDestination("")).toBeNull();
  });

  it("compte une conversion seulement pour un parcours monétisable ou une évaluation", () => {
    expect(isConversionDestination("/dashboard/new")).toBe(true);
    expect(isConversionDestination("/dashboard/pricing?plan=client-pro")).toBe(true);
    expect(isConversionDestination("/dashboard/professionals-directory")).toBe(true);
    expect(isConversionDestination("/dashboard/investments")).toBe(true);
    expect(isConversionDestination("/dashboard")).toBe(false);
    expect(isConversionDestination(undefined)).toBe(false);
  });

  it("expose les six modules vérifiables pour le filtre « jamais utilisé »", () => {
    expect(PUSH_MODULE_IDS).toEqual([
      "cost",
      "plans",
      "decision",
      "investments",
      "materials",
      "sites",
    ]);
  });
});
