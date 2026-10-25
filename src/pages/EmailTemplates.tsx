import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Save, Loader2, Wand2, FileCode2, RotateCcw, Trash2, Plus, Undo2 } from "lucide-react";
import { motion } from "framer-motion";
import AdminNotificationRecipients from "@/components/admin/AdminNotificationRecipients";

const inputCls =
  "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30";

const EMAIL_VARIABLES = [
  { token: "{{Nom}}", label: "Nom" },
  { token: "{{Prénom}}", label: "Prénom" },
  { token: "{{NomEntreprise}}", label: "Nom de l'entreprise" },
  { token: "{{TypeAbonnement}}", label: "Type d'abonnement" },
  { token: "{{DateActivation}}", label: "Date d'activation" },
  { token: "{{DateExpiration}}", label: "Date d'expiration" },
  { token: "{{Montant}}", label: "Montant" },
  { token: "{{NuméroFacture}}", label: "Numéro de facture" },
  { token: "{{LienConnexion}}", label: "Lien de connexion" },
  { token: "{{NomPlateforme}}", label: "Nom de la plateforme" },
  { token: "{{NomProjet}}", label: "Nom du projet" },
  { token: "{{TypeProjet}}", label: "Type de projet" },
  { token: "{{Entreprise}}", label: "Entreprise / professionnel" },
  { token: "{{DétailsDemande}}", label: "Détails de la demande" },
  { token: "{{MontantDevis}}", label: "Montant du devis" },
  { token: "{{Message}}", label: "Message de la réponse" },
  { token: "{{Expéditeur}}", label: "Nom de l'expéditeur de la demande / réponse" },
  { token: "{{TypeDemande}}", label: "Type de demande (devis, service, rendez-vous…)" },
  { token: "{{Statut}}", label: "Statut de la demande (en attente, confirmé, refusé…)" },
  { token: "{{Date}}", label: "Date souhaitée / de la demande" },
  { token: "{{Heure}}", label: "Heure souhaitée / de la demande" },
  { token: "{{Créneau}}", label: "Créneau souhaité (rendez-vous)" },
  { token: "{{Motif}}", label: "Motif de la demande / besoin" },
  { token: "{{Région}}", label: "Région / zone du projet" },
  { token: "{{SurfaceProjet}}", label: "Surface du projet" },
  { token: "{{Email}}", label: "E-mail de l'utilisateur concerné" },
  { token: "{{Profil}}", label: "Profil du compte (Client, Fournisseur, Expert)" },
];

// Groupes d'événements affichés dans la liste « Événements »
const EVENT_GROUPS = [
  {
    label: "Notifications administrateur",
    hint: "Envoyées aux adresses de « Destinataires des notifications administrateur », une seule fois par événement",
    keys: ["admin_new_user", "admin_new_subscription", "admin_new_project"],
  },
  {
    label: "Abonnements & paiements",
    hint: undefined,
    keys: [
      "subscription_activated",
      "subscription_renewed",
      "subscription_expired",
      "payment_confirmed",
      "payment_rejected",
      "subscription_suspended",
      "subscription_canceled",
    ],
  },
  {
    label: "Demandes · utilisateur → professionnel",
    hint: "Un seul modèle par type de demande, envoyé au professionnel concerné (copie administrateur)",
    keys: [
      "quote_request_sent",
      "service_request_sent",
      "expert_quote_request",
      "expert_appointment_request",
      "expert_urgent_request",
    ],
  },
  {
    label: "Réponses & statuts · professionnel → utilisateur",
    hint: "Envoyé à l'utilisateur à l'origine de la demande, à chaque réponse ou changement de statut",
    keys: [
      "quote_received",
      "service_received",
      "expert_quote_received",
      "expert_appointment_response",
      "expert_urgent_response",
    ],
  },
  {
    label: "Support & Messagerie",
    hint: "Échanges avec l'équipe batibuild",
    keys: ["support_ticket_created", "support_reply"],
  },
] as const;

const EVENT_KEYS = EVENT_GROUPS.flatMap((g) => g.keys);

const EVENT_LABELS: Record<string, string> = {
  subscription_activated: "Abonnement activé",
  subscription_renewed: "Abonnement renouvelé",
  subscription_expired: "Abonnement expiré",
  payment_confirmed: "Paiement confirmé",
  payment_rejected: "Paiement refusé",
  subscription_suspended: "Abonnement suspendu",
  subscription_canceled: "Abonnement annulé",
  // Demandes — utilisateur → professionnel
  quote_request_sent: "Demande de devis Fournisseur",
  service_request_sent: "Demande de service Expert",
  expert_quote_request: "Demande de devis Expert",
  expert_appointment_request: "Demande de rendez-vous Expert",
  expert_urgent_request: "Demande urgente Expert",
  // Réponses & changements de statut — professionnel → utilisateur
  quote_received: "Réponse du Fournisseur (devis)",
  service_received: "Réponse de l'Expert (service)",
  expert_quote_received: "Réponse de l'Expert (devis)",
  expert_appointment_response: "Rendez-vous Expert — réponse / statut",
  expert_urgent_response: "Demande urgente Expert — réponse / statut",
  // Support & Messagerie
  support_ticket_created: "Nouvelle demande de support",
  support_reply: "Réponse du support",
  // Notifications administrateur
  admin_new_user: "Nouvelle inscription",
  admin_new_subscription: "Nouvel abonnement",
  admin_new_project: "Nouveau projet",
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  subscription_activated: "Envoyé quand un abonnement membre ou fournisseur est activé",
  subscription_renewed: "Envoyé lors d'un renouvellement d'abonnement",
  subscription_expired: "Envoyé quand un abonnement arrive à expiration",
  payment_confirmed: "Envoyé quand un reçu de paiement est vérifié",
  payment_rejected: "Envoyé quand un paiement / reçu est refusé",
  subscription_suspended: "Envoyé quand un compte / abonnement est suspendu",
  subscription_canceled: "Envoyé quand un abonnement est annulé",
  // Demandes — utilisateur → professionnel
  quote_request_sent: "Envoyé au fournisseur quand un client demande un devis",
  service_request_sent: "Envoyé à l'expert quand un client demande un service",
  expert_quote_request: "Envoyé à l'expert quand un client demande un devis d'expertise",
  expert_appointment_request: "Envoyé à l'expert quand un client demande un rendez-vous",
  expert_urgent_request: "Envoyé immédiatement à l'expert quand un client signale une urgence",
  // Réponses & changements de statut — professionnel → utilisateur
  quote_received: "Envoyé au client quand le fournisseur répond à sa demande de devis",
  service_received: "Envoyé au client quand l'expert répond à sa demande de service",
  expert_quote_received: "Envoyé au client quand l'expert transmet son devis d'expertise",
  expert_appointment_response: "Envoyé au client quand l'expert confirme, refuse, annule ou clôture le rendez-vous",
  expert_urgent_response: "Envoyé au client quand l'expert accepte ou refuse sa demande urgente",
  // Support & Messagerie
  support_ticket_created: "Envoyé à l'équipe batibuild quand un utilisateur ouvre une demande de support",
  support_reply: "Envoyé à l'utilisateur quand l'équipe support lui répond",
  // Notifications administrateur
  admin_new_user: "Envoyé à l'administrateur lors de la création effective d'un compte (nom, e-mail, profil, date)",
  admin_new_subscription: "Envoyé à l'administrateur quand un abonnement est souscrit ou activé (profil, offre, montant, date)",
  admin_new_project: "Envoyé à l'administrateur à la création effective d'un projet (utilisateur, nom, type, surface, date)",
};

const SAMPLE_VARS: Record<string, string> = {
  "{{Nom}}": "Ben Salah",
  "{{Prénom}}": "Ahmed",
  "{{NomEntreprise}}": "GALISKON PROJECT",
  "{{TypeAbonnement}}": "Client Pro",
  "{{DateActivation}}": "3 août 2026",
  "{{DateExpiration}}": "2 septembre 2026",
  "{{Montant}}": "120 TND",
  "{{NuméroFacture}}": "INV-123456",
  "{{LienConnexion}}": "https://batibuild.app/login",
  "{{NomPlateforme}}": "batibuild",
  "{{NomProjet}}": "Villa moderne à Hammamet",
  "{{TypeProjet}}": "Villa",
  "{{Entreprise}}": "BTP Tunisie SARL",
  "{{DétailsDemande}}": "Ciment 250 sacs, fer à béton 2 t, main-d'œuvre gros œuvre",
  "{{MontantDevis}}": "48 500 TND",
  "{{Message}}": "Bonjour, merci pour votre demande. Nous vous proposons un devis détaillé ci-joint.",
  "{{Créneau}}": "22 septembre 2026 à 09:00",
  "{{Motif}}": "Visite du chantier avant devis",
  "{{Région}}": "Béja",
  "{{Expéditeur}}": "Ahmed Ben Salah",
  "{{TypeDemande}}": "Demande de devis",
  "{{Statut}}": "En attente de votre réponse",
  "{{Date}}": "22 septembre 2026",
  "{{Heure}}": "09:00",
  "{{SurfaceProjet}}": "150 m²",
  "{{Email}}": "ahmed.bensalah@example.tn",
  "{{Profil}}": "Client Pro",
};

export default function EmailTemplates() {
  const templates = useQuery(api.emailTemplates.getEmailTemplates) || [];
  const saveTemplate = useMutation(api.emailTemplates.adminSaveEmailTemplate);
  const deleteTemplate = useMutation(api.emailTemplates.adminDeleteEmailTemplate);
  const restoreTemplate = useMutation(api.emailTemplates.adminRestoreEmailTemplate);
  const cleanupTemplates = useMutation(api.emailTemplates.adminCleanupEmailTemplates);
  const [cleaning, setCleaning] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modèles supprimés par l'administrateur : proposés à l'ajout.
  const missingKeys = EVENT_KEYS.filter(
    (key) => !templates.some((t) => t.key === key),
  );

  const [selectedKey, setSelectedKey] = useState<string>("subscription_activated");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = templates.find((x) => x.key === selectedKey);
    if (t) {
      setSubject(t.subject);
      setBodyHtml(t.bodyHtml);
      setActive(t.active !== false);
    }
  }, [selectedKey, templates]);

  // Le modèle sélectionné vient d'être supprimé → sélection du premier modèle
  // encore disponible (l'éditeur ne reste jamais sur un modèle inexistant).
  useEffect(() => {
    if (templates.length === 0) return;
    if (!templates.some((t) => t.key === selectedKey)) {
      setSelectedKey(templates[0].key as string);
    }
  }, [selectedKey, templates]);

  const insertVariable = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBodyHtml((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? bodyHtml.length;
    const end = el.selectionEnd ?? bodyHtml.length;
    const next = bodyHtml.slice(0, start) + token + bodyHtml.slice(end);
    setBodyHtml(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTemplate({ key: selectedKey as any, subject, bodyHtml, active });
      toast.success(`✅ Modèle « ${EVENT_LABELS[selectedKey]} » enregistré`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
    setSaving(false);
  };

  /**
   * Supprime les doublons / anciennes variantes stockés puis réapplique la
   * version normalisée de chaque modèle (un seul modèle actif par événement).
   * L'historique des e-mails envoyés n'est jamais touché.
   */
  /**
   * Supprime le modèle sélectionné : il disparaît de la liste et plus aucun
   * e-mail de ce type n'est envoyé. L'historique des envois est conservé.
   */
  const handleDelete = async () => {
    if (
      !window.confirm(
        `Supprimer le modèle « ${EVENT_LABELS[selectedKey]} » ?\n\n` +
          "Aucun e-mail de ce type ne sera plus envoyé. L'historique des envois reste conservé et le modèle peut être ré-ajouté à tout moment.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteTemplate({ key: selectedKey as any });
      toast.success(`🗑️ Modèle « ${EVENT_LABELS[selectedKey]} » supprimé`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
    setDeleting(false);
  };

  /** Ré-ajoute un modèle supprimé (retour à la version normalisée). */
  const handleRestore = async (key: string) => {
    try {
      await restoreTemplate({ key: key as any });
      setSelectedKey(key);
      setAddOpen(false);
      toast.success(`✅ Modèle « ${EVENT_LABELS[key]} » ré-ajouté`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout du modèle");
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const res = await cleanupTemplates({});
      toast.success(
        `✅ Configuration nettoyée — ${res.removedDuplicates} doublon(s) supprimé(s), ${res.resetToDefault} modèle(s) normalisé(s) sur ${res.total}`,
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du nettoyage");
    }
    setCleaning(false);
  };

  const renderPreview = () => {
    let html = subject
      ? `<p style="font-size:11px;color:#9ca3af;margin:0 0 8px;"><b>Objet :</b> ${subject}</p>`
      : "";
    // `[^}]+` : l'aperçu doit rendre les variables accentuées ({{Prénom}},
    // {{NuméroFacture}}, {{Créneau}}…) comme le moteur d'envoi réel.
    let body = bodyHtml.replace(/\{\{([^}]+)\}\}/g, (m) => SAMPLE_VARS[m] || m);
    html += `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;line-height:1.7;">${body}</div>`;
    return html;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/10">
              <FileCode2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Modèles de notification</p>
              <p className="text-xs text-muted-foreground">
                Personnalisez le contenu des e-mails avec les variables dynamiques ci-dessous
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EMAIL_VARIABLES.map((v) => (
              <button
                key={v.token}
                onClick={() => insertVariable(v.token)}
                title={v.label}
                className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] font-mono text-primary transition-colors hover:bg-primary/10"
              >
                <Wand2 className="h-3 w-3" />
                {v.token}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/10 px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Un seul modèle actif par type de demande et par scénario d'envoi. Le
              nettoyage supprime les anciennes variantes et réapplique la version
              normalisée, sans toucher à l'historique des envois.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanup}
              disabled={cleaning}
              className="shrink-0 gap-1.5"
            >
              {cleaning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {cleaning ? "Nettoyage…" : "Supprimer les doublons & normaliser"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AdminNotificationRecipients />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Event list */}
        <Card className="lg:col-span-2 border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Événements</CardTitle>
            <CardDescription className="text-xs">
              Modèles par type d'événement — {templates.length} modèle(s) configuré(s)
            </CardDescription>
            {missingKeys.length > 0 && (
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => setAddOpen((v) => !v)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {addOpen ? "Fermer" : `Ajouter un modèle (${missingKeys.length})`}
                </Button>
                {addOpen && (
                  <div className="mt-2 space-y-1 rounded-lg border border-border/40 bg-muted/10 p-2">
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      Modèles supprimés — cliquez pour les ré-ajouter avec leur contenu normalisé.
                    </p>
                    {missingKeys.map((key) => (
                      <button
                        key={key}
                        onClick={() => handleRestore(key)}
                        className="flex w-full items-center gap-1.5 rounded-md border border-border/30 bg-background px-2 py-1.5 text-left text-[11px] hover:bg-muted/20"
                      >
                        <Undo2 className="h-3 w-3 shrink-0 text-primary" />
                        {EVENT_LABELS[key] ?? key}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {EVENT_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <div className="flex items-center gap-2 pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {group.label}
                  </p>
                  <div className="h-px flex-1 bg-border/30" />
                </div>
                {group.hint && (
                  <p className="text-[10px] leading-tight text-muted-foreground/60">
                    {group.hint}
                  </p>
                )}
                <div className="space-y-1">
                  {group.keys.map((key) => (
                    <button
                      key={key}
                      onClick={() => setSelectedKey(key)}
                      className={`w-full rounded-lg border p-2.5 text-left transition-all ${
                        selectedKey === key
                          ? "border-primary/40 bg-primary/10 shadow-sm"
                          : "border-border/30 bg-muted/10 hover:bg-muted/20"
                      }`}
                    >
                      <p className="text-xs font-semibold">{EVENT_LABELS[key]}</p>
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                        {EVENT_DESCRIPTIONS[key]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">
                  Éditeur — {EVENT_LABELS[selectedKey]}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Actif</span>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Objet de l'e-mail</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputCls}
                  placeholder="Votre abonnement est maintenant actif"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Contenu (HTML) — cliquez sur une variable pour l'insérer
                </label>
                <Textarea
                  ref={textareaRef}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  className={inputCls + " min-h-[260px] font-mono text-xs resize-y"}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const t = templates.find((x) => x.key === selectedKey);
                    if (t) {
                      setSubject(t.subject);
                      setBodyHtml(t.bodyHtml);
                      setActive(t.active !== false);
                      toast.success("Modèle restauré aux valeurs actuelles");
                    }
                  }}
                  className="gap-1.5 text-muted-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Supprimer
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Enregistrement…" : "Enregistrer le modèle"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" /> Aperçu en direct
              </CardTitle>
              <CardDescription className="text-xs">
                Rendu avec des valeurs d'exemple — les vraies valeurs seront remplacées à l'envoi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/40 bg-[#f4f4f6] p-4">
                <motion.div
                  layout
                  className="mx-auto max-w-[420px] overflow-hidden rounded-lg border border-black/5 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between bg-gradient-to-r from-[#7c3aed] to-[#0ea5e9] px-4 py-3">
                    <span className="text-sm font-extrabold text-white">batibuild</span>
                    <span className="text-[9px] tracking-wider text-white/80">NOTIFICATION</span>
                  </div>
                  <div
                    className="px-4 py-4 text-sm text-slate-800"
                    dangerouslySetInnerHTML={{ __html: renderPreview() }}
                  />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
