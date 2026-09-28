import { describe, it, expect } from "vitest";
import { renderInvoiceAttachmentNotice, renderTokens } from "./emailNotifications";
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
  typeProjet: "Villa",
  creneau: "22 septembre 2026 à 10:00",
  date: "22 septembre 2026",
  heure: "10:00",
  motif: "Visite du chantier",
  region: "Béja",
  detailsDemande: "+216 98 123 456 · ahmed@test.com",
  montantDevis: "48 500 TND",
  message: "Disponible en matinée",
  expediteur: "Ahmed Ben Salah",
  typeDemande: "Demande de rendez-vous",
  statut: "Confirmé",
  surfaceProjet: "120 m²",
  lienConnexion: "https://batibuild.app/login",
  nomPlateforme: "batibuild",
};

/** Les 5 types de demandes puis les 5 réponses / changements de statut. */
const REQUEST_EVENTS = [
  "quote_request_sent",
  "service_request_sent",
  "expert_quote_request",
  "expert_appointment_request",
  "expert_urgent_request",
] as const;

const RESPONSE_EVENTS = [
  "quote_received",
  "service_received",
  "expert_quote_received",
  "expert_appointment_response",
  "expert_urgent_response",
] as const;

const template = (key: string) => {
  const found = DEFAULT_TEMPLATES.find((t) => t.key === key);
  if (!found) throw new Error(`Modèle manquant : ${key}`);
  return found;
};

describe("modèles ProMarket — demandes reçues", () => {
  it("déclare un seul modèle par type de demande et par scénario d'envoi", () => {
    const keys = DEFAULT_TEMPLATES.map((t) => t.key);
    // Aucun doublon : un événement = un seul modèle (jamais deux envois).
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of [...REQUEST_EVENTS, ...RESPONSE_EVENTS]) {
      expect(keys.filter((k) => k === key)).toHaveLength(1);
    }
    expect(EMAIL_EVENT_LABELS.quote_request_sent).toBe("Demande de devis Fournisseur");
    expect(EMAIL_EVENT_LABELS.service_request_sent).toBe("Demande de service Expert");
    expect(EMAIL_EVENT_LABELS.expert_quote_request).toBe("Demande de devis Expert");
    expect(EMAIL_EVENT_LABELS.expert_appointment_request).toBe("Demande de rendez-vous Expert");
    expect(EMAIL_EVENT_LABELS.expert_urgent_request).toBe("Demande urgente Expert");
  });

  it("ne laisse aucun jeton brut dans les modèles de demande et de réponse", () => {
    for (const key of [...REQUEST_EVENTS, ...RESPONSE_EVENTS]) {
      const rendered = renderTokens(template(key).bodyHtml, VARS);
      expect(rendered).not.toContain("{{");
      expect(rendered).not.toContain("}}");
    }
  });

  it("expose les variables dynamiques de la demande (expéditeur, type, statut, date, heure)", () => {
    for (const key of [...REQUEST_EVENTS, ...RESPONSE_EVENTS]) {
      const renderedBody = renderTokens(template(key).bodyHtml, VARS);
      // Le nom de l'expéditeur et le type de demande sont disponibles partout.
      expect(renderedBody).toContain("Ahmed Ben Salah");
    }
    expect(renderTokens("{{Expéditeur}}|{{TypeDemande}}|{{Statut}}|{{Date}}|{{Heure}}", VARS)).toBe(
      "Ahmed Ben Salah|Demande de rendez-vous|Confirmé|22 septembre 2026|10:00",
    );
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
    expect(appointment).toContain("{{Date}}");
    expect(appointment).toContain("{{Heure}}");

    const urgent = template("expert_urgent_request").bodyHtml;
    expect(urgent).toContain("{{Région}}");
    expect(urgent).toContain("{{Motif}}");
    expect(urgent).toContain("{{DétailsDemande}}");

    // Chaque réponse porte le statut et l'auteur de la réponse.
    for (const key of RESPONSE_EVENTS) {
      expect(template(key).bodyHtml).toContain("{{Statut}}");
      expect(template(key).bodyHtml).toContain("{{Expéditeur}}");
    }
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

// ============================================================================
// Encart « facture jointe »
//
// Ajouté au corps de l'e-mail au moment de l'envoi, uniquement lorsqu'une
// facture PDF est réellement jointe (activation d'abonnement, confirmation de
// paiement). Il ne dépend donc pas du modèle personnalisable par l'admin.
// ============================================================================

describe("encart de facture jointe", () => {
  it("n'apparaît pas quand aucune facture n'est jointe", () => {
    expect(renderInvoiceAttachmentNotice(undefined)).toBe("");
    expect(renderInvoiceAttachmentNotice(null)).toBe("");
    expect(renderInvoiceAttachmentNotice("")).toBe("");
    expect(renderInvoiceAttachmentNotice("   ")).toBe("");
  });

  it("affiche le numéro réel de la facture et l'invite à la retrouver dans le profil", () => {
    const html = renderInvoiceAttachmentNotice("FACT-2026-000042");

    expect(html).toContain("FACT-2026-000042");
    expect(html.toLowerCase()).toContain("pdf");
    expect(html).toContain("Mes factures");
  });

  it("neutralise tout caractère injecté dans le numéro", () => {
    const html = renderInvoiceAttachmentNotice('FACT-2026-000001<script>alert("x")</script>');

    expect(html).not.toContain("<script>");
    expect(html).toContain("FACT-2026-000001");
  });
});
