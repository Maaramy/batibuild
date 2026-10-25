import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ============================================================================
// Email Templates — un seul modèle par événement et par scénario d'envoi.
//
// Demandes (utilisateur → professionnel) :
//   quote_request_sent           Demande de devis Fournisseur
//   service_request_sent         Demande de service Expert
//   expert_quote_request         Demande de devis Expert
//   expert_appointment_request   Demande de rendez-vous Expert
//   expert_urgent_request        Demande urgente Expert
// Réponses & changements de statut (professionnel → utilisateur) :
//   quote_received               Réponse du Fournisseur (devis)
//   service_received             Réponse de l'Expert (service)
//   expert_quote_received        Réponse de l'Expert (devis)
//   expert_appointment_response  Rendez-vous Expert — réponse / statut
//   expert_urgent_response       Demande urgente Expert — réponse / statut
//
// Variables disponibles : {{Nom}} {{Prénom}} {{NomEntreprise}}
//   {{Expéditeur}} {{TypeDemande}} {{Statut}} {{Date}} {{Heure}} {{Créneau}}
//   {{NomProjet}} {{TypeProjet}} {{Motif}} {{Région}} {{SurfaceProjet}}
//   {{DétailsDemande}} {{MontantDevis}} {{Message}} {{LienConnexion}}
//   {{NomPlateforme}} {{TypeAbonnement}} {{DateActivation}} {{DateExpiration}}
//   {{Montant}} {{NuméroFacture}}
// ============================================================================

export const EMAIL_EVENT_TYPES = [
  "subscription_activated",
  "subscription_renewed",
  "subscription_expired",
  "payment_confirmed",
  "payment_rejected",
  "subscription_suspended",
  "subscription_canceled",
  // Demandes — utilisateur → fournisseur / expert
  "quote_request_sent",
  "service_request_sent",
  "expert_quote_request",
  "expert_appointment_request",
  "expert_urgent_request",
  // Réponses & changements de statut — fournisseur / expert → utilisateur
  "quote_received",
  "service_received",
  "expert_quote_received",
  "expert_appointment_response",
  "expert_urgent_response",
  // Support & Messagerie
  "support_ticket_created",
  "support_reply",
  // Notifications destinées à l'administrateur de la plateforme
  "admin_new_user",
  "admin_new_subscription",
  "admin_new_project",
] as const;

/**
 * Types de notification adressés à l'ADMINISTRATEUR (et non à un utilisateur).
 * Seuls ces événements utilisent les destinataires configurés dans
 * « Destinataires des notifications administrateur ».
 */
export const ADMIN_NOTIFICATION_EVENT_TYPES = [
  "admin_new_user",
  "admin_new_subscription",
  "admin_new_project",
] as const;

export type AdminNotificationEventType =
  (typeof ADMIN_NOTIFICATION_EVENT_TYPES)[number];

/** Catégorie « toutes les notifications » pour les destinataires. */
export const ADMIN_NOTIFICATION_ALL_TOPIC = "all";

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number];

export const EMAIL_EVENT_LABELS: Record<EmailEventType, string> = {
  subscription_activated: "Abonnement activé",
  subscription_renewed: "Abonnement renouvelé",
  subscription_expired: "Abonnement expiré",
  payment_confirmed: "Paiement confirmé",
  payment_rejected: "Paiement refusé",
  subscription_suspended: "Abonnement suspendu",
  subscription_canceled: "Abonnement annulé",
  // Demandes — utilisateur → fournisseur / expert
  quote_request_sent: "Demande de devis Fournisseur",
  service_request_sent: "Demande de service Expert",
  expert_quote_request: "Demande de devis Expert",
  expert_appointment_request: "Demande de rendez-vous Expert",
  expert_urgent_request: "Demande urgente Expert",
  // Réponses & changements de statut — fournisseur / expert → utilisateur
  quote_received: "Réponse du Fournisseur (devis)",
  service_received: "Réponse de l'Expert (service)",
  expert_quote_received: "Réponse de l'Expert (devis)",
  expert_appointment_response: "Rendez-vous Expert — réponse / statut",
  expert_urgent_response: "Demande urgente Expert — réponse / statut",
  support_ticket_created: "Nouvelle demande de support",
  support_reply: "Réponse du support",
  // Notifications administrateur
  admin_new_user: "Administrateur — nouvelle inscription",
  admin_new_subscription: "Administrateur — nouvel abonnement",
  admin_new_project: "Administrateur — nouveau projet",
};

export const EMAIL_VARIABLES = [
  { token: "{{Nom}}", label: "Nom du destinataire" },
  { token: "{{Prénom}}", label: "Prénom du destinataire" },
  { token: "{{NomEntreprise}}", label: "Nom de l'entreprise" },
  { token: "{{TypeAbonnement}}", label: "Type d'abonnement (Client Pro/Fournisseur/Expert)" },
  { token: "{{DateActivation}}", label: "Date d'activation" },
  { token: "{{DateExpiration}}", label: "Date d'expiration" },
  { token: "{{Montant}}", label: "Montant payé" },
  { token: "{{NuméroFacture}}", label: "Numéro de facture" },
  { token: "{{LienConnexion}}", label: "Lien direct vers la demande / la plateforme" },
  { token: "{{NomPlateforme}}", label: "Nom de la plateforme" },
  // Variables des flux de demande de devis / service
  { token: "{{NomProjet}}", label: "Nom du projet concerné" },
  { token: "{{TypeProjet}}", label: "Type de projet (maison, villa, rénovation…)" },
  { token: "{{Entreprise}}", label: "Entreprise / professionnel sollicité (fournisseur, expert)" },
  { token: "{{Expéditeur}}", label: "Nom de l'expéditeur de la demande / de la réponse" },
  { token: "{{TypeDemande}}", label: "Type de demande (devis, service, rendez-vous, urgence)" },
  { token: "{{Statut}}", label: "Statut de la demande (en attente, confirmé, refusé…)" },
  { token: "{{DétailsDemande}}", label: "Détails de la demande (matériaux, description…)" },
  { token: "{{MontantDevis}}", label: "Montant du devis / de la proposition" },
  { token: "{{Message}}", label: "Message de la réponse (fournisseur / expert)" },
  // Variables des demandes reçues par un professionnel (ProMarket)
  { token: "{{Date}}", label: "Date souhaitée / de la demande" },
  { token: "{{Heure}}", label: "Heure souhaitée / de la demande" },
  { token: "{{Créneau}}", label: "Créneau complet (date + heure)" },
  { token: "{{Motif}}", label: "Motif de la demande / besoin exprimé" },
  { token: "{{Région}}", label: "Région / zone du projet" },
  { token: "{{SurfaceProjet}}", label: "Surface du projet (m²)" },
  // Variables des notifications administrateur
  { token: "{{Email}}", label: "Adresse e-mail de l'utilisateur concerné" },
  { token: "{{Profil}}", label: "Profil du compte (Client, Fournisseur, Expert)" },
] as const;

export interface DefaultTemplate {
  key: EmailEventType;
  label: string;
  subject: string;
  bodyHtml: string;
  active?: boolean;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    key: "subscription_activated",
    label: "Abonnement activé",
    subject: "Votre abonnement est maintenant actif",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Nous avons le plaisir de vous informer que votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» a été activé avec succès.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Date d'activation :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{DateActivation}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Date d'expiration :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{DateExpiration}}</td></tr>
</table>
Vous pouvez dès maintenant profiter de toutes les fonctionnalités de la plateforme.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Accéder à votre espace</a>
<br/><br/>
Merci de votre confiance.
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "subscription_renewed",
    label: "Abonnement renouvelé",
    subject: "Votre abonnement a été renouvelé",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» a été renouvelé avec succès.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Montant :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Montant}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Nouvelle date d'expiration :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{DateExpiration}}</td></tr>
</table>
Votre accès reste actif sans interruption.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Accéder à mon espace</a>
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "subscription_expired",
    label: "Abonnement expiré",
    subject: "Votre abonnement a expiré",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» est arrivé à expiration le {{DateExpiration}}.
<br/><br/>
Pour continuer à bénéficier de toutes les fonctionnalités de la plateforme, renouvelez votre abonnement dès maintenant.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Renouveler mon abonnement</a>
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "payment_confirmed",
    label: "Paiement confirmé",
    subject: "Votre paiement a été confirmé",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre paiement a été confirmé avec succès.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Abonnement :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeAbonnement}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Montant :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Montant}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Numéro de facture :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{NuméroFacture}}</td></tr>
</table>
Votre abonnement est désormais actif.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Accéder à mon espace</a>
<br/><br/>
Merci pour votre confiance.
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "payment_rejected",
    label: "Paiement refusé",
    subject: "Votre paiement n'a pas pu être confirmé",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Nous n'avons malheureusement pas pu confirmer votre paiement pour l'abonnement «&nbsp;{{TypeAbonnement}}&nbsp;».
<br/><br/>
Cela peut être dû à un reçu manquant, illisible ou non conforme. Veuillez vérifier votre reçu de paiement et réessayer, ou contactez notre support pour plus d'informations.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Réessayer le paiement</a>
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "subscription_suspended",
    label: "Abonnement suspendu",
    subject: "Votre abonnement a été suspendu",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» a été temporairement suspendu.
<br/><br/>
Vos fonctionnalités sont momentanément restreintes. Contactez notre support pour comprendre les raisons de cette suspension et retrouver l'accès complet à la plateforme.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Contacter le support</a>
<br/><br/>
L'équipe {{P}}`,
  },
  {
    key: "subscription_canceled",
    label: "Abonnement annulé",
    subject: "Votre abonnement a été annulé",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre abonnement «&nbsp;{{TypeAbonnement}}&nbsp;» a été annulé.
<br/><br/>
Vous pouvez à tout moment souscrire à nouveau à l'un de nos forfaits pour retrouver l'accès à toutes les fonctionnalités de la plateforme.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Voir les forfaits</a>
<br/><br/>
L'équipe {{P}}`,
  },

  // ── Demandes : utilisateur → fournisseur / expert ──
  {
    key: "quote_request_sent",
    label: "Demande de devis Fournisseur",
    subject: "Nouvelle demande de devis — {{NomProjet}}",
    bodyHtml: `Bonjour {{Entreprise}},
<br/><br/>
<strong>{{Expéditeur}}</strong> a envoyé une <strong>demande de devis</strong> pour le projet «&nbsp;{{NomProjet}}&nbsp;» ({{TypeProjet}}).
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeDemande}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Demandeur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Prénom}} {{Nom}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Détails de la demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{DétailsDemande}}</td></tr>
</table>
Connectez-vous à votre espace fournisseur pour consulter la demande en détail et y répondre.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Répondre à la demande</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "service_request_sent",
    label: "Demande de service Expert",
    subject: "Nouvelle demande de service — {{NomProjet}}",
    bodyHtml: `Bonjour {{Entreprise}},
<br/><br/>
<strong>{{Expéditeur}}</strong> a envoyé une <strong>demande de service</strong> pour le projet «&nbsp;{{NomProjet}}&nbsp;» ({{TypeProjet}}).
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeDemande}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Demandeur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Prénom}} {{Nom}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Motif :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Motif}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Région :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Région}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Détails de la demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{DétailsDemande}}</td></tr>
</table>
Connectez-vous à votre espace expert pour consulter la demande en détail et proposer votre service.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Proposer mon service</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "expert_quote_request",
    label: "Demande de devis Expert",
    subject: "Nouvelle demande de devis d'expertise — {{NomProjet}}",
    bodyHtml: `Bonjour {{Entreprise}},
<br/><br/>
<strong>{{Expéditeur}}</strong> a envoyé une <strong>demande de devis d'expertise</strong> pour le projet «&nbsp;{{NomProjet}}&nbsp;» ({{TypeProjet}}).
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeDemande}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Demandeur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Prénom}} {{Nom}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Motif :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Motif}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Région :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Région}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Détails de la demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{DétailsDemande}}</td></tr>
</table>
Connectez-vous à votre espace expert pour consulter la demande et transmettre votre devis.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Envoyer mon devis</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },

  // ── Réponses & changements de statut : professionnel → utilisateur ──
  {
    key: "quote_received",
    label: "Réponse du Fournisseur (devis)",
    subject: "{{Entreprise}} a répondu à votre demande — {{NomProjet}}",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
<strong>{{Entreprise}}</strong> a répondu à votre <strong>demande de devis</strong> pour le projet «&nbsp;{{NomProjet}}&nbsp;» ({{TypeProjet}}).
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeDemande}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Répondu par :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Expéditeur}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Montant proposé :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{MontantDevis}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Message :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Message}}</td></tr>
</table>
Consultez la proposition complète et contactez le fournisseur directement depuis votre espace.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Voir la réponse</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "service_received",
    label: "Réponse de l'Expert (service)",
    subject: "{{Entreprise}} a répondu à votre demande de service",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
<strong>{{Entreprise}}</strong> a répondu à votre <strong>demande de service</strong> pour le projet «&nbsp;{{NomProjet}}&nbsp;» ({{TypeProjet}}).
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeDemande}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Répondu par :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Expéditeur}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Montant estimé :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{MontantDevis}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Message :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Message}}</td></tr>
</table>
Consultez la proposition et contactez le professionnel directement depuis votre espace.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Voir ma réponse</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "expert_quote_received",
    label: "Réponse de l'Expert (devis)",
    subject: "{{Entreprise}} a répondu à votre demande de devis",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
<strong>{{Entreprise}}</strong> a répondu à votre <strong>demande de devis d'expertise</strong> pour le projet «&nbsp;{{NomProjet}}&nbsp;» ({{TypeProjet}}).
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeDemande}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Répondu par :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Expéditeur}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Montant du devis :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{MontantDevis}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Message :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Message}}</td></tr>
</table>
Consultez le devis et contactez l'expert directement depuis votre espace.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Voir mon devis</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "expert_appointment_response",
    label: "Rendez-vous Expert — réponse / statut",
    subject: "Votre demande de rendez-vous — {{Statut}}",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre <strong>demande de rendez-vous</strong> avec <strong>{{Entreprise}}</strong> a été mise à jour (statut : <strong>{{Statut}}</strong>).
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Projet :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{NomProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Date :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Date}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Heure :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Heure}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Motif :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Motif}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Répondu par :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Expéditeur}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Réponse de {{Entreprise}} :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Message}}</td></tr>
</table>
Consultez la demande et poursuivez l'échange depuis votre messagerie.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Voir la demande</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "expert_urgent_response",
    label: "Demande urgente Expert — réponse / statut",
    subject: "Votre demande urgente — {{Statut}}",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
Votre <strong>demande d'intervention urgente</strong> auprès de <strong>{{Entreprise}}</strong> a été mise à jour.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #fed7aa;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Projet :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{NomProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Région :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Région}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Besoin exprimé :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Motif}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Répondu par :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Expéditeur}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Réponse de {{Entreprise}} :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Message}}</td></tr>
</table>
Consultez la demande et poursuivez l'échange depuis votre messagerie.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Voir la demande</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },

  // ── Support & Messagerie ──
  {
    key: "support_ticket_created",
    label: "Nouvelle demande de support",
    subject: "Nouvelle demande de support — {{NomProjet}}",
    bodyHtml: `Bonjour,
<br/><br/>
Un utilisateur a créé une <strong>demande de support</strong> sur la plateforme.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Utilisateur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Prénom}} {{Nom}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Catégorie :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{TypeProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Priorité :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Message}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Sujet et message :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{DétailsDemande}}</td></tr>
</table>
Connectez-vous à l'espace d'administration pour consulter la demande et y répondre.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Ouvrir l'espace support</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "support_reply",
    label: "Réponse du support",
    subject: "L'équipe support a répondu à votre demande",
    bodyHtml: `Bonjour {{Prénom}} {{Nom}},
<br/><br/>
L'équipe support a répondu à votre demande «&nbsp;<strong>{{NomProjet}}</strong>&nbsp;» (statut : {{DétailsDemande}}).
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Réponse du support :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Message}}</td></tr>
</table>
Connectez-vous à votre espace pour consulter la conversation complète et poursuivre l'échange.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Voir la conversation</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },

  {
    key: "expert_appointment_request",
    label: "Demande de rendez-vous Expert",
    subject: "Nouvelle demande de rendez-vous de {{Prénom}} {{Nom}}",
    bodyHtml: `Bonjour {{Entreprise}},
<br/><br/>
<strong>{{Expéditeur}}</strong> vous a envoyé une <strong>demande de rendez-vous</strong> pour le projet «&nbsp;{{NomProjet}}&nbsp;». Confirmez ou refusez-la depuis votre messagerie.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f8f7ff;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ece8ff;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeDemande}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Demandeur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Prénom}} {{Nom}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Date souhaitée :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Date}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Heure souhaitée :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Heure}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Créneau souhaité :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Créneau}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Motif :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Motif}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Projet :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{NomProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de projet :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{TypeProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Surface :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{SurfaceProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Coordonnées du demandeur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{DétailsDemande}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Message :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Message}}</td></tr>
</table>
Suivez la demande depuis votre espace professionnel et la messagerie de la plateforme.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Ouvrir la messagerie</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "expert_urgent_request",
    label: "Demande urgente Expert",
    subject: "⚡ Demande urgente de {{Prénom}} {{Nom}}",
    bodyHtml: `Bonjour {{Entreprise}},
<br/><br/>
<strong>{{Expéditeur}}</strong> vous a envoyé une <strong>demande d'intervention urgente</strong> qui attend une réponse rapide.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #fed7aa;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de demande :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeDemande}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Demandeur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Prénom}} {{Nom}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Région :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Région}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Besoin exprimé :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{Motif}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Projet :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{NomProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Coordonnées du demandeur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;padding:3px 0;">{{DétailsDemande}}</td></tr>
</table>
Connectez-vous à la messagerie de la plateforme pour accepter ou refuser cette demande.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Traiter la demande urgente</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },

  // ── Notifications destinées à l'administrateur de la plateforme ──
  {
    key: "admin_new_user",
    label: "Administrateur — nouvelle inscription",
    subject: "Nouvelle inscription — {{Prénom}} {{Nom}} ({{Profil}})",
    bodyHtml: `Bonjour,
<br/><br/>
Un <strong>nouveau compte</strong> vient d'être créé sur la plateforme.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f0fdfa;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ccfbf1;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Nom :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Prénom}} {{Nom}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Adresse e-mail :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Email}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Profil :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Profil}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Date d'inscription :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Date}}</td></tr>
</table>
Connectez-vous à l'espace d'administration pour consulter le compte et son éventuelle demande d'abonnement.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Ouvrir l'administration</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "admin_new_subscription",
    label: "Administrateur — nouvel abonnement",
    subject: "Nouvel abonnement — {{TypeAbonnement}} ({{Prénom}} {{Nom}})",
    bodyHtml: `Bonjour,
<br/><br/>
Un utilisateur a souscrit ou activé un <strong>abonnement</strong> sur la plateforme.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f0fdfa;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ccfbf1;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Utilisateur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Prénom}} {{Nom}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Adresse e-mail :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Email}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Profil :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Profil}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Abonnement :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeAbonnement}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Montant :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Montant}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Statut :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Statut}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Date de souscription :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Date}}</td></tr>
</table>
Consultez l'abonnement et sa facture depuis l'espace d'administration.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Ouvrir l'administration</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
  {
    key: "admin_new_project",
    label: "Administrateur — nouveau projet",
    subject: "Nouveau projet — {{NomProjet}}",
    bodyHtml: `Bonjour,
<br/><br/>
Un utilisateur vient de créer un <strong>nouveau projet</strong> sur la plateforme.
<br/><br/>
<table cellpadding="0" cellspacing="0" style="background:#f0fdfa;border-radius:10px;padding:14px 18px;margin:10px 0;border:1px solid #ccfbf1;">
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Utilisateur :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Prénom}} {{Nom}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Adresse e-mail :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Email}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Profil :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Profil}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Nom du projet :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{NomProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Type de projet :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{TypeProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Surface :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{SurfaceProjet}}</td></tr>
  <tr><td style="color:#6b7280;font-size:13px;padding:3px 0;">Date de création :</td></tr>
  <tr><td style="color:#111827;font-size:14px;font-weight:600;padding:3px 0;">{{Date}}</td></tr>
</table>
Consultez les projets depuis l'espace d'administration.
<br/><br/>
<a href="{{LienConnexion}}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Ouvrir l'administration</a>
<br/><br/>
L'équipe {{NomPlateforme}}`,
  },
];

// ----------------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------------

/** Get all templates with DB overrides merged over defaults (admin only) */
export const getEmailTemplates = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") return [];

    const stored = await ctx.db.query("emailTemplates").collect();
    // Les modèles SUPPRIMÉS (tombstone `deletedAt`) ne sont ni affichés ni
    // envoyés : les inclure ici les ressusciterait depuis le code.
    const deletedKeys = new Set(
      stored.filter((t) => t.deletedAt != null).map((t) => String(t.key)),
    );
    const storedMap = new Map(
      stored.filter((t) => t.deletedAt == null).map((t) => [t.key, t]),
    );

    return DEFAULT_TEMPLATES.filter((def) => !deletedKeys.has(def.key)).map((def) => {
      const s = storedMap.get(def.key);
      return {
        key: def.key,
        label: s?.label ?? def.label,
        subject: s?.subject ?? def.subject,
        bodyHtml: s?.bodyHtml ?? def.bodyHtml,
        active: s?.active ?? true,
        // Personnalisé = une ligne en base existe (sinon c'est le modèle du code).
        customized: !!s,
        adminEvent: (ADMIN_NOTIFICATION_EVENT_TYPES as readonly string[]).includes(def.key),
        updatedAt: s?.updatedAt ?? undefined,
      };
    });
  },
});

// ----------------------------------------------------------------------------
// Mutations
// ----------------------------------------------------------------------------

/** Save a template's subject/body (admin only) */
export const adminSaveEmailTemplate = mutation({
  args: {
    key: v.union(
      v.literal("subscription_activated"),
      v.literal("subscription_renewed"),
      v.literal("subscription_expired"),
      v.literal("payment_confirmed"),
      v.literal("payment_rejected"),
      v.literal("subscription_suspended"),
      v.literal("subscription_canceled"),
      v.literal("quote_request_sent"),
      v.literal("service_request_sent"),
      v.literal("expert_quote_request"),
      v.literal("expert_appointment_request"),
      v.literal("expert_urgent_request"),
      v.literal("quote_received"),
      v.literal("service_received"),
      v.literal("expert_quote_received"),
      v.literal("expert_appointment_response"),
      v.literal("expert_urgent_response"),
      v.literal("support_ticket_created"),
      v.literal("support_reply"),
      v.literal("admin_new_user"),
      v.literal("admin_new_subscription"),
      v.literal("admin_new_project"),
    ),
    subject: v.string(),
    bodyHtml: v.string(),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db
      .query("emailTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const label = EMAIL_EVENT_LABELS[args.key];

    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: args.subject,
        bodyHtml: args.bodyHtml,
        active: args.active ?? true,
        // Enregistrer (ou ré-ajouter) un modèle efface la suppression.
        deletedAt: undefined,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("emailTemplates", {
        key: args.key,
        label,
        subject: args.subject,
        bodyHtml: args.bodyHtml,
        active: args.active ?? true,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      } as any);
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "email_template_save",
        details: `Modèle e-mail mis à jour — ${label}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});

/**
 * Supprime un modèle (administrateur uniquement).
 *
 * Suppression LOGIQUE : la ligne est conservée avec `deletedAt` et
 * `active: false`. Conséquences immédiates, sans redéploiement :
 *  - le modèle disparaît de la liste « Modèles de notification » ;
 *  - aucun e-mail de ce type n'est plus envoyé (le modèle du code n'est pas
 *    utilisé en remplacement) ;
 *  - l'historique des e-mails déjà envoyés n'est pas modifié ;
 *  - le modèle peut être ré-ajouté à tout moment avec « Ajouter un modèle ».
 */
export const adminDeleteEmailTemplate = mutation({
  args: {
    key: v.union(
      v.literal("subscription_activated"),
      v.literal("subscription_renewed"),
      v.literal("subscription_expired"),
      v.literal("payment_confirmed"),
      v.literal("payment_rejected"),
      v.literal("subscription_suspended"),
      v.literal("subscription_canceled"),
      v.literal("quote_request_sent"),
      v.literal("service_request_sent"),
      v.literal("expert_quote_request"),
      v.literal("expert_appointment_request"),
      v.literal("expert_urgent_request"),
      v.literal("quote_received"),
      v.literal("service_received"),
      v.literal("expert_quote_received"),
      v.literal("expert_appointment_response"),
      v.literal("expert_urgent_response"),
      v.literal("support_ticket_created"),
      v.literal("support_reply"),
      v.literal("admin_new_user"),
      v.literal("admin_new_subscription"),
      v.literal("admin_new_project"),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const now = Date.now();
    const label = EMAIL_EVENT_LABELS[args.key];
    const def = DEFAULT_TEMPLATES.find((t) => t.key === args.key);
    const existing = await ctx.db
      .query("emailTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        active: false,
        deletedAt: now,
        updatedAt: now,
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("emailTemplates", {
        key: args.key,
        label,
        subject: def?.subject ?? label,
        bodyHtml: def?.bodyHtml ?? "",
        active: false,
        deletedAt: now,
        updatedAt: now,
        updatedBy: admin._id,
      } as any);
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "email_template_delete",
        details: `Modèle e-mail supprimé — ${label}`,
        createdAt: now,
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});

/**
 * Ré-ajoute un modèle supprimé (administrateur uniquement) : la suppression
 * logique est effacée et le modèle normalisé du code redevient actif.
 * Aucun historique d'envoi n'est modifié.
 */
export const adminRestoreEmailTemplate = mutation({
  args: {
    key: v.union(
      v.literal("subscription_activated"),
      v.literal("subscription_renewed"),
      v.literal("subscription_expired"),
      v.literal("payment_confirmed"),
      v.literal("payment_rejected"),
      v.literal("subscription_suspended"),
      v.literal("subscription_canceled"),
      v.literal("quote_request_sent"),
      v.literal("service_request_sent"),
      v.literal("expert_quote_request"),
      v.literal("expert_appointment_request"),
      v.literal("expert_urgent_request"),
      v.literal("quote_received"),
      v.literal("service_received"),
      v.literal("expert_quote_received"),
      v.literal("expert_appointment_response"),
      v.literal("expert_urgent_response"),
      v.literal("support_ticket_created"),
      v.literal("support_reply"),
      v.literal("admin_new_user"),
      v.literal("admin_new_subscription"),
      v.literal("admin_new_project"),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const existing = await ctx.db
      .query("emailTemplates")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) await ctx.db.delete(existing._id);

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "email_template_save",
        details: `Modèle e-mail ré-ajouté — ${EMAIL_EVENT_LABELS[args.key]}`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return { success: true };
  },
});

// ----------------------------------------------------------------------------
// Nettoyage des doublons
// ----------------------------------------------------------------------------

/**
 * Supprime puis recrée la configuration des modèles e-mail :
 *  - les modèles stockés qui ne correspondent plus à un événement supporté
 *    (anciennes variantes / doublons d'un même événement) sont supprimés ;
 *  - les modèles canoniques sont réinitialisés sur leur version normalisée du
 *    code (`DEFAULT_TEMPLATES`), ce qui garantit un seul modèle actif par
 *    événement et par scénario d'envoi.
 *
 * `emailHistory` n'est jamais modifié : l'historique des notifications déjà
 * envoyées est conservé. Aucune donnée métier n'est touchée.
 */
export const adminCleanupEmailTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx);
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const canonical = new Set<string>(EMAIL_EVENT_TYPES);
    const stored = await ctx.db.query("emailTemplates").collect();

    let removedDuplicates = 0;
    let resetToDefault = 0;

    for (const row of stored) {
      if (canonical.has(row.key)) resetToDefault += 1;
      else removedDuplicates += 1;
      await ctx.db.delete(row._id);
    }

    try {
      await ctx.db.insert("adminLogs", {
        adminId: admin._id,
        adminName: admin.name,
        action: "email_template_save",
        details: `Modèles e-mail nettoyés — ${removedDuplicates} doublon(s) supprimé(s), ${resetToDefault} modèle(s) réinitialisé(s)`,
        createdAt: Date.now(),
      });
    } catch (e) { /* optional */ }

    return {
      success: true,
      removedDuplicates,
      resetToDefault,
      total: EMAIL_EVENT_TYPES.length,
    };
  },
});
