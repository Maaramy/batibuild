import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { Save, Loader2, Wand2, FileCode2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

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
];

const EVENT_KEYS = [
  "subscription_activated",
  "subscription_renewed",
  "subscription_expired",
  "payment_confirmed",
  "payment_rejected",
  "subscription_suspended",
  "subscription_canceled",
] as const;

const EVENT_LABELS: Record<string, string> = {
  subscription_activated: "Abonnement activé",
  subscription_renewed: "Abonnement renouvelé",
  subscription_expired: "Abonnement expiré",
  payment_confirmed: "Paiement confirmé",
  payment_rejected: "Paiement refusé",
  subscription_suspended: "Abonnement suspendu",
  subscription_canceled: "Abonnement annulé",
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  subscription_activated: "Envoyé quand un abonnement membre ou fournisseur est activé",
  subscription_renewed: "Envoyé lors d'un renouvellement d'abonnement",
  subscription_expired: "Envoyé quand un abonnement arrive à expiration",
  payment_confirmed: "Envoyé quand un reçu de paiement est vérifié",
  payment_rejected: "Envoyé quand un paiement / reçu est refusé",
  subscription_suspended: "Envoyé quand un compte / abonnement est suspendu",
  subscription_canceled: "Envoyé quand un abonnement est annulé",
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
  "{{NomPlateforme}}": "batibuild App",
};

export default function EmailTemplates() {
  const templates = useQuery(api.emailTemplates.getEmailTemplates) || [];
  const saveTemplate = useMutation(api.emailTemplates.adminSaveEmailTemplate);

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

  const renderPreview = () => {
    let html = subject
      ? `<p style="font-size:11px;color:#9ca3af;margin:0 0 8px;"><b>Objet :</b> ${subject}</p>`
      : "";
    let body = bodyHtml.replace(/\{\{(\w+)\}\}/g, (m) => SAMPLE_VARS[m] || m);
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Event list */}
        <Card className="lg:col-span-2 border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Événements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {EVENT_KEYS.map((key) => (
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
                    <span className="text-sm font-extrabold text-white">batibuild App</span>
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
