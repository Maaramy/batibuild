import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Mail,
  Server,
  KeyRound,
  Palette,
  Save,
  Send,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Link2,
  ImageUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Signature,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const inputCls =
  "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

export default function EmailSettings() {
  const { user } = useAuth();
  const config = useQuery(api.emailConfig.getEmailConfigAdmin);
  const saveConfig = useMutation(api.emailConfig.adminSaveEmailConfig);
  const testSmtp = useAction(api.emailSender.adminTestSmtp);
  const checkDeliverability = useAction(api.emailSender.adminCheckEmailDeliverability);

  const [form, setForm] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [checkingDeliv, setCheckingDeliv] = useState(false);
  const [delivResult, setDelivResult] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testEmail, setTestEmail] = useState("");
  // Instantané de la configuration enregistrée (détecte les modifications
  // non sauvegardées avant un test).
  const [savedConfig, setSavedConfig] = useState<any>(null);

  useEffect(() => {
    if (config) {
      setForm({
        senderName: config.senderName ?? "",
        senderEmail: config.senderEmail ?? "",
        replyTo: config.replyTo ?? "",
        smtpHost: config.smtpHost ?? "",
        smtpPort: config.smtpPort ?? 587,
        smtpSecurity: config.smtpSecurity ?? "tls",
        smtpUser: config.smtpUser ?? "",
        // Jamais pré-rempli : le mot de passe SMTP n'est pas renvoyé par le
        // serveur. L'admin ne le saisit que lorsqu'il veut le changer.
        smtpPassword: "",
        signature: config.signature ?? "",
        logoUrl: config.logoUrl ?? "",
        primaryColor: config.primaryColor ?? "#7c3aed",
        accentColor: config.accentColor ?? "#0ea5e9",
        autoEnabled: config.autoEnabled ?? true,
        notifyAdminCc: config.notifyAdminCc ?? true,
        loginLink: config.loginLink ?? "",
      });
      setSavedConfig({
        senderName: config.senderName ?? "",
        senderEmail: config.senderEmail ?? "",
        replyTo: config.replyTo ?? "",
        smtpHost: config.smtpHost ?? "",
        smtpPort: config.smtpPort ?? 587,
        smtpSecurity: config.smtpSecurity ?? "tls",
        smtpUser: config.smtpUser ?? "",
        hasPassword: config.hasPassword ?? false,
      });
      if (!testEmail) setTestEmail(user?.email || "");
    }
  }, [config]);

  if (!form) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // Payload d'enregistrement. Le mot de passe n'est envoyé que s'il a été
  // re-saisi — sinon le serveur conserve la valeur chiffrée en base.
  const savePayload = () => ({
    senderName: form.senderName,
    senderEmail: form.senderEmail,
    replyTo: form.replyTo || undefined,
    smtpHost: form.smtpHost || undefined,
    smtpPort: form.smtpPort ? Number(form.smtpPort) : undefined,
    smtpSecurity: form.smtpSecurity,
    smtpUser: form.smtpUser || undefined,
    smtpPassword: form.smtpPassword || undefined,
    signature: form.signature || undefined,
    logoUrl: form.logoUrl || undefined,
    primaryColor: form.primaryColor || undefined,
    accentColor: form.accentColor || undefined,
    autoEnabled: form.autoEnabled,
    notifyAdminCc: form.notifyAdminCc,
    loginLink: form.loginLink || undefined,
  });

  const hasPendingSmtpChanges =
    !!savedConfig &&
    (["senderName", "senderEmail", "replyTo", "smtpHost", "smtpPort", "smtpSecurity", "smtpUser"]
      .some((k) => String(form?.[k] ?? "") !== String(savedConfig?.[k] ?? "")) ||
      (form?.smtpPassword?.length ?? 0) > 0);
  // Un mot de passe est-il déjà enregistré ? (jamais affiché — simple indicateur)
  const hasStoredPassword = !!savedConfig?.hasPassword;

  // Enregistre d'abord les modifications SMTP en attente (le test et l'audit
  // s'exécutent côté serveur sur la configuration ENREGISTRÉE — le mot de
  // passe ne transite jamais par le navigateur).
  const persistPendingChanges = async (): Promise<boolean> => {
    if (!hasPendingSmtpChanges) return true;
    try {
      await saveConfig(savePayload());
      setSavedConfig({
        senderName: form.senderName ?? "",
        senderEmail: form.senderEmail ?? "",
        replyTo: form.replyTo ?? "",
        smtpHost: form.smtpHost ?? "",
        smtpPort: form.smtpPort ? Number(form.smtpPort) : 587,
        smtpSecurity: form.smtpSecurity ?? "tls",
        smtpUser: form.smtpUser ?? "",
        hasPassword: form.smtpPassword ? true : (savedConfig?.hasPassword ?? false),
      });
      if (form.smtpPassword) set("smtpPassword", "");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Impossible d'enregistrer la configuration avant l'opération");
      return false;
    }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Indiquez l'adresse de réception du test");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(testEmail.trim())) {
      toast.error("L'adresse e-mail de test est invalide.");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Le test s'exécute côté serveur sur la configuration ENREGISTRÉE : si
      // des champs SMTP ont été modifiés sans être enregistrés, on enregistre
      // d'abord automatiquement, puis on teste.
      if (hasPendingSmtpChanges) {
        if (!(await persistPendingChanges())) {
          setTesting(false);
          return;
        }
        toast.info("Configuration enregistrée — test lancé avec ces paramètres");
      }

      const res = await testSmtp({ testEmail: testEmail.trim() });
      setTestResult(res);
      if (res?.success) toast.success(res.message || "E-mail de test envoyé avec succès");
      else toast.error(res?.message || "Échec du test SMTP");
    } catch (err: any) {
      const raw = (err?.message || "").toString();
      // Ne jamais afficher un simple « Server Error » : toujours un message clair
      const friendly =
        raw && !/server error/i.test(raw)
          ? raw
          : "Le test SMTP n'a pas pu aboutir. Vérifiez que le serveur SMTP est accessible depuis Internet, enregistrez la configuration, puis réessayez.";
      setTestResult({ success: false, code: "CALL_ERROR", message: friendly });
      toast.error(friendly);
    } finally {
      setTesting(false);
    }
  };

  const handleCheckDeliverability = async () => {
    setCheckingDeliv(true);
    setDelivResult(null);
    try {
      // L'audit porte sur le domaine de l'expéditeur enregistré : on sauvegarde
      // d'abord les éventuelles modifications en attente.
      if (hasPendingSmtpChanges) {
        if (!(await persistPendingChanges())) {
          setCheckingDeliv(false);
          return;
        }
      }
      const res = await checkDeliverability();
      setDelivResult(res);
      if (res?.success) {
        if (res.allOk) toast.success("Délivrabilité DNS conforme");
        else toast.info("Des points de délivrabilité restent à corriger");
      } else {
        toast.error(res?.message || "Audit de délivrabilité impossible");
      }
    } catch (err: any) {
      const raw = (err?.message || "").toString();
      const friendly =
        raw && !/server error/i.test(raw)
          ? raw
          : "L'audit de délivrabilité n'a pas pu aboutir. Réessayez dans quelques instants.";
      setDelivResult({ success: false, message: friendly });
      toast.error(friendly);
    } finally {
      setCheckingDeliv(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConfig(savePayload());
      toast.success("✅ Configuration e-mail enregistrée");
      setSavedConfig({
        senderName: form.senderName ?? "",
        senderEmail: form.senderEmail ?? "",
        replyTo: form.replyTo ?? "",
        smtpHost: form.smtpHost ?? "",
        smtpPort: form.smtpPort ? Number(form.smtpPort) : 587,
        smtpSecurity: form.smtpSecurity ?? "tls",
        smtpUser: form.smtpUser ?? "",
        hasPassword: form.smtpPassword ? true : (savedConfig?.hasPassword ?? false),
      });
      if (form.smtpPassword) set("smtpPassword", "");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Status banner */}
      <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Notifications e-mail automatiques</p>
              <p className="text-xs text-muted-foreground">
                {config?.configured
                  ? `Expéditeur : ${config.senderEmail || "non défini"} · ${config.smtpHost ? `SMTP ${config.smtpHost}:${config.smtpPort}` : "SMTP non configuré (fallback VLY)"}`
                  : "Aucune configuration enregistrée — les notifications ne sont pas encore envoyées."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BadgeStatus ok={form.autoEnabled} label={form.autoEnabled ? "Automatique : ON" : "Automatique : OFF"} />
            {config?.configured && <BadgeStatus ok={!!config.smtpHost} label={config.smtpHost ? "SMTP" : "VLY"} />}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Identity */}
        <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Identité de l'expéditeur
            </CardTitle>
            <CardDescription className="text-xs">
              Nom et adresse affichés dans tous les e-mails envoyés
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Nom de l'expéditeur">
              <Input value={form.senderName} onChange={(e) => set("senderName", e.target.value)} placeholder="batibuild" className={inputCls} />
            </Field>
            <Field label="Adresse e-mail de l'expéditeur" hint="Doit correspondre à un domaine autorisé sur votre serveur SMTP">
              <Input value={form.senderEmail} onChange={(e) => set("senderEmail", e.target.value)} placeholder="contact@batibuild.app" className={inputCls} />
            </Field>
            <Field label="Adresse de réponse (Reply-To)" hint="Optionnel — adresse qui reçoit les réponses">
              <Input value={form.replyTo} onChange={(e) => set("replyTo", e.target.value)} placeholder="support@batibuild.app" className={inputCls} />
            </Field>
            <Field label="Lien de connexion" hint="Variable {{LienConnexion}} — URL vers l'espace membre (ex: https://batibuild.app/login)">
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input value={form.loginLink} onChange={(e) => set("loginLink", e.target.value)} placeholder="https://batibuild.app/login" className={inputCls + " pl-9"} />
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* SMTP */}
        <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" /> Serveur SMTP
            </CardTitle>
            <CardDescription className="text-xs">
              Serveur d'envoi — sinon fallback sur l'API e-mail VLY
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Field label="Serveur SMTP">
                  <Input value={form.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} placeholder="smtp.hostinger.com" className={inputCls} />
                </Field>
              </div>
              <Field label="Port">
                <Input type="number" value={form.smtpPort} onChange={(e) => set("smtpPort", e.target.value)} placeholder="587" className={inputCls} />
              </Field>
            </div>
            <Field label="Type de sécurité">
              <select
                value={form.smtpSecurity}
                onChange={(e) => set("smtpSecurity", e.target.value)}
                className={inputCls}
              >
                <option value="tls">TLS (STARTTLS — port 587)</option>
                <option value="ssl">SSL (port 465)</option>
                <option value="none">Aucun (port 25/2525)</option>
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="Nom d'utilisateur SMTP">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input value={form.smtpUser} onChange={(e) => set("smtpUser", e.target.value)} placeholder="contact@batibuild.app" className={inputCls + " pl-9"} />
                </div>
              </Field>
              <Field
                label="Mot de passe SMTP"
                hint={
                  form.smtpPassword
                    ? "Sera chiffré et enregistré lors de l'enregistrement"
                    : hasStoredPassword
                      ? "Mot de passe enregistré — laisser vide pour le conserver (jamais renvoyé ni affiché)"
                      : "Optionnel — nécessaire si le serveur exige une authentification"
                }
              >
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.smtpPassword}
                    onChange={(e) => set("smtpPassword", e.target.value)}
                    placeholder={hasStoredPassword ? "•••••••• (enregistré — non affiché)" : "••••••••"}
                    className={inputCls + " pl-9 pr-9"}
                  />
                  {hasStoredPassword && !form.smtpPassword && (
                    <span className="absolute right-9 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 whitespace-nowrap">
                      <ShieldCheck className="h-3 w-3" /> Enregistré
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="flex-1">
                <Field label="E-mail de test">
                  <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="votre@email.tn" className={inputCls} />
                </Field>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleTest}
                  disabled={testing}
                  variant="secondary"
                  className="gap-2 w-full sm:w-auto"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {testing ? "Test en cours…" : "Tester la configuration SMTP"}
                </Button>
              </div>
            </div>
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                    testResult.success
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      : "border-red-500/30 bg-red-500/10 text-red-700"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">{testResult.message}</p>
                    {testResult.detail && (
                      <p className="mt-1 text-[11px] leading-relaxed opacity-85">{testResult.detail}</p>
                    )}
                    {!testResult.success && testResult.code && (
                      <p className="mt-1 text-[10px] uppercase tracking-wide opacity-50">
                        Référence : {testResult.code}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Audit de délivrabilité (éviter la boîte spam) */}
            <div className="mt-4 border-t border-border/50 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Éviter la boîte spam</p>
                  <p className="text-[11px] text-muted-foreground/60">
                    Vérifie les enregistrements DNS (MX, SPF, DKIM, DMARC) du domaine de l'expéditeur
                  </p>
                </div>
                <Button
                  onClick={handleCheckDeliverability}
                  disabled={checkingDeliv}
                  variant="outline"
                  className="gap-2 w-full sm:w-auto"
                >
                  {checkingDeliv ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {checkingDeliv ? "Vérification…" : "Vérifier la délivrabilité"}
                </Button>
              </div>

              <AnimatePresence>
                {delivResult && delivResult.success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs"
                  >
                    <p className="font-semibold text-muted-foreground">
                      Domaine : {delivResult.domain}{" "}
                      {delivResult.allOk ? (
                        <span className="text-emerald-600">· conforme</span>
                      ) : (
                        <span className="text-amber-600">· actions requises</span>
                      )}
                    </p>
                    {[
                      ["MX", delivResult.checks?.mx],
                      ["SPF", delivResult.checks?.spf],
                      ["DKIM", delivResult.checks?.dkim],
                      ["DMARC", delivResult.checks?.dmarc],
                      ["Alignement", delivResult.checks?.alignment],
                    ].map(([label, check]: any) => (
                      <div key={label} className="flex items-start gap-2">
                        {check?.status === "ok" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                        ) : check?.status === "warn" ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                        ) : check?.status === "fail" ? (
                          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                        ) : (
                          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                        )}
                        <p className="min-w-0 leading-relaxed">
                          <span className="font-semibold">{label}</span> — {check?.detail}
                        </p>
                      </div>
                    ))}
                    {delivResult.recommendations?.length > 0 && (
                      <div className="mt-2 space-y-1 rounded-md border border-border/50 bg-background p-2.5">
                        <p className="font-semibold text-muted-foreground">Recommandations DNS</p>
                        {delivResult.recommendations.map((r: string, i: number) => (
                          <pre key={i} className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-muted-foreground/80">
                            {r}
                          </pre>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                {delivResult && !delivResult.success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700"
                  >
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="min-w-0">{delivResult.message}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Branding */}
        <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" /> Signature & Identité visuelle
            </CardTitle>
            <CardDescription className="text-xs">
              Personnalisez l'apparence des e-mails (variables {'{{NomPlateforme}}'} et {'{{LienConnexion}}'})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Logo de la plateforme (URL)" hint="Image affichée en en-tête des e-mails (PNG, max 180px de large)">
              <div className="relative">
                <ImageUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://batibuild.app/logo.png" className={inputCls + " pl-9"} />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Couleur principale">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => set("primaryColor", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-border/50 bg-transparent"
                  />
                  <Input value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className={inputCls} />
                </div>
              </Field>
              <Field label="Couleur d'accent">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => set("accentColor", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-border/50 bg-transparent"
                  />
                  <Input value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)} className={inputCls} />
                </div>
              </Field>
            </div>
            <Field label="Signature automatique" hint="Ajoutée en bas de chaque e-mail">
              <div className="relative">
                <Signature className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                <Textarea
                  value={form.signature}
                  onChange={(e) => set("signature", e.target.value)}
                  placeholder={"L'équipe batibuild\ncontact@batibuild.app\nwww.batibuild.app"}
                  className={inputCls + " pl-9 min-h-[80px] resize-y"}
                />
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* Automation */}
        <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Automatisation & Sécurité
            </CardTitle>
            <CardDescription className="text-xs">
              Contrôle des envois automatiques et des copies administrateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3">
              <div>
                <p className="text-sm font-medium">Envoi automatique</p>
                <p className="text-xs text-muted-foreground">
                  Envoyer les notifications dès qu'un abonnement est activé, renouvelé, expiré, payé, refusé, suspendu ou annulé
                </p>
              </div>
              <Switch checked={form.autoEnabled} onCheckedChange={(v) => set("autoEnabled", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/20 p-3">
              <div>
                <p className="text-sm font-medium">Copie aux administrateurs</p>
                <p className="text-xs text-muted-foreground">
                  Envoyer une copie de chaque notification aux comptes administrateurs
                </p>
              </div>
              <Switch checked={form.notifyAdminCc} onCheckedChange={(v) => set("notifyAdminCc", v)} />
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-primary mb-1">🛡️ Sécurité intégrée</p>
              • Mot de passe SMTP <b>chiffré</b> avant stockage
              <br />• <b>Anti-doublons</b> : un même événement ne peut être envoyé qu'une fois par période de 24 h
              <br />• Les préférences de notification des utilisateurs sont respectées (optionnel)
              <br />• Chaque modification est journalisée dans l'historique admin
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Enregistrement…" : "Enregistrer la configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BadgeStatus({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}
