import { describe, it, expect } from "vitest";
import { renderTokens } from "./emailNotifications";
import { DEFAULT_TEMPLATES, EMAIL_EVENT_LABELS } from "./emailTemplates";

// ============================================================================
// Modèles d'e-mail des demandes reçues par un professionnel (ProMarket)
//
// Ces modèles sont envoyés automatiquement à l'administrateur et restent
// personnalisables dans l'espace admin : le rendu est donc testé ici, en pur,
// indépendamment du scheduler Convex et sans aucun appel réseau.
// ============================================================================

const VARS: Record<string, string> = {
  nom: "Ben Salah",
  prenom: "Ahmed",
  nomEntreprise: "GALISKON PROJECT",
  entreprise: "Sami Plombier",
  nomProjet: "Villa Béja",
  creneau: "22 septembre 2026 à 10:00",
  motif: "Visite du chantier",
  region: "Béja",
  detailsDemande: "+216 98 123 456 · ahmed@test.com",
  message: "Disponible en matinée",
  lienConnexion: "https://batibuild.app/login",
  nomPlateforme: "batibuild App",
};

const template = (key: string) => {
  const found = DEFAULT_TEMPLATES.find((t) => t.key === key);
  if (!found) throw new Error(`Modèle manquant : ${key}`);
  return found;
};

describe("modèles ProMarket — demandes reçues", () => {
  it("déclare les deux événements dans la liste de l'espace admin", () => {
    const keys = DEFAULT_TEMPLATES.map((t) => t.key);
    expect(keys).toContain("expert_appointment_request");
    expect(keys).toContain("expert_urgent_request");
    expect(EMAIL_EVENT_LABELS.expert_appointment_request).toBe("Demande de rendez-vous expert");
    expect(EMAIL_EVENT_LABELS.expert_urgent_request).toBe("Demande urgente expert");
  });

  it("titre chaque e-mail avec le client concerné, jamais avec un jeton brut", () => {
    expect(renderTokens(template("expert_appointment_request").subject, VARS)).toBe(
      "Nouvelle demande de rendez-vous de Ahmed Ben Salah",
    );
    expect(renderTokens(template("expert_urgent_request").subject, VARS)).toBe(
      "⚡ Demande urgente de Ahmed Ben Salah",
    );
  });

  it("rend le créneau, le motif et la région sans laisser de jeton résiduel", () => {
    for (const key of ["expert_appointment_request", "expert_urgent_request"] as const) {
      const rendered = renderTokens(template(key).bodyHtml, VARS);
      expect(rendered).not.toContain("{{");
      expect(rendered).toContain("Ahmed Ben Salah");
      expect(rendered).toContain("Sami Plombier");
    }
  });

  it("relie les modèles par défaut aux variables utiles de chaque demande", () => {
    const appointment = template("expert_appointment_request").bodyHtml;
    expect(appointment).toContain("{{Créneau}}");
    expect(appointment).toContain("{{Motif}}");
    expect(appointment).toContain("{{DétailsDemande}}");

    const urgent = template("expert_urgent_request").bodyHtml;
    expect(urgent).toContain("{{Région}}");
    expect(urgent).toContain("{{Motif}}");
    expect(urgent).toContain("{{DétailsDemande}}");
  });

  it("remplace chaque variable de demande, y compris en français accentué", () => {
    expect(renderTokens("{{Créneau}} / {{Motif}} / {{Région}}", VARS)).toBe(
      "22 septembre 2026 à 10:00 / Visite du chantier / Béja",
    );
    expect(renderTokens("{{Prénom}} {{Nom}} — {{Entreprise}}", VARS)).toBe(
      "Ahmed Ben Salah — Sami Plombier",
    );
  });

  it("laisse un jeton inconnu tel quel au lieu de vider le modèle", () => {
    expect(renderTokens("Bonjour {{Inconnu}}", VARS)).toBe("Bonjour {{Inconnu}}");
  });
});
