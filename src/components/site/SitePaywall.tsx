// ============================================================================
// COTISATION « GESTION & SUIVI DE CHANTIER »
// ----------------------------------------------------------------------------
// Même circuit que la cotisation Client Pro : demande → justificatif de
// paiement → validation par un administrateur. Aucun second système de
// paiement : les méthodes proposées viennent de la configuration existante
// (`payments.getPublicPricing`) et la validation est faite dans
// l'administration du module.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { availablePaymentMethods } from "@/lib/paymentMethods";
import { formatSiteDate, formatTND } from "@/lib/siteTracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SiteCotisationCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const access = useQuery(api.siteTracking.getMySiteAccess, {});
  const pricing = useQuery(api.payments.getPublicPricing);
  const requestCotisation = useMutation(api.siteTracking.requestSiteCotisation);
  const cancelCotisation = useMutation(api.siteTracking.cancelSiteCotisation);
  const uploadProof = useMutation(api.siteTracking.uploadSitePaymentProof);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const methods = availablePaymentMethods((pricing as any)?.paymentMethods);
  const [paymentMethod, setPaymentMethod] = useState(methods[0]?.slug ?? "bank_transfer");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const signature = methods.map((method) => method.slug).join("|");
  useEffect(() => {
    if (methods.length > 0 && !methods.some((method) => method.slug === paymentMethod)) {
      setPaymentMethod(methods[0].slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!access) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre cotisation…
        </CardContent>
      </Card>
    );
  }

  const cotisation = access.cotisation;
  const price = access.price;
  const durationLabel = access.durationDays >= 30
    ? `${Math.round(access.durationDays / 30)} mois`
    : `${access.durationDays} jours`;

  const handleRequest = async () => {
    setBusy(true);
    try {
      await requestCotisation({ paymentMethod: price > 0 ? paymentMethod : undefined });
      toast.success("Demande enregistrée. Joignez votre justificatif de paiement.");
    } catch (error: any) {
      toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Demande impossible.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!cotisation) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error("Envoi du justificatif impossible.");
      const { storageId } = await response.json();
      await uploadProof({ cotisationId: cotisation._id, storageId, url: "", fileName: file.name });
      toast.success("Justificatif envoyé. Un administrateur validera votre cotisation.");
    } catch (error: any) {
      toast.error(error?.message?.replace(/^[A-Z_]+:/, "") ?? "Envoi impossible.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Cotisation active ──────────────────────────────────────────────────
  if (access.allowed) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
              Cotisation active
              <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-300">
                {access.isAdmin && access.reason === "admin" ? "Accès administrateur" : `Validée jusqu'au ${formatSiteDate(access.endDate)}`}
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              {access.isAdmin && access.reason === "admin"
                ? "Votre rôle administrateur ouvre le module sans cotisation."
                : access.daysRemaining > 0
                  ? `${access.daysRemaining} jour(s) restants. Le renouvellement sera proposé à l'échéance.`
                  : "Échéance atteinte : la demande de renouvellement est disponible."}
            </p>
          </div>
          {!compact && access.reason !== "admin" && cotisation?.status === "pending" && (
            <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-700 dark:text-amber-300">
              Renouvellement en attente
            </Badge>
          )}
          {!compact &&
            access.reason !== "admin" &&
            access.daysRemaining > 0 &&
            access.daysRemaining <= 7 &&
            cotisation?.status !== "pending" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={busy}
                onClick={handleRequest}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Renouveler
              </Button>
            )}
        </CardContent>
      </Card>
    );
  }

  // ── Module désactivé par l'administration ──────────────────────────────
  if (access.reason === "module_disabled") {
    return (
      <Card className="border-amber-500/30">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium">Module momentanément fermé</p>
            <p className="text-xs text-muted-foreground">
              L'administration a désactivé la prise de nouvelles cotisations. Vos chantiers existants restent
              conservés et réapparaîtront dès la réactivation.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pending = access.reason === "pending" || cotisation?.status === "pending";
  const refused = access.reason === "refused";

  return (
    <Card className="overflow-hidden border-emerald-500/25 shadow-sm">
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          Cotisation « Gestion & Suivi de Chantier »
        </CardTitle>
        <CardDescription className="text-xs">
          Un accès payant, activé après validation du paiement par un administrateur. Sans cotisation active,
          aucune écriture n'est possible sur vos chantiers (contrôle côté serveur).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">          <div className="flex flex-wrap items-end gap-x-6 gap-y-2 rounded-xl border border-border/60 bg-muted/30 p-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Montant</p>
            <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">
              {price > 0 ? formatTND(price) : "Gratuit"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Durée</p>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" /> {durationLabel}
            </p>
          </div>
          <div className="min-w-0 flex-1 text-[11px] text-muted-foreground">
            Paiement par virement ou D17 : joignez le reçu, l'administrateur active votre accès.
          </div>
        </div>

        {pending ? (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-50/50 p-3 dark:bg-amber-950/20">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4" /> Demande en attente de validation
            </p>
            <p className="text-xs text-muted-foreground">
              {cotisation?.paymentProofUrl
                ? "Justificatif reçu. Un administrateur vérifie le règlement puis active votre cotisation."
                : "Dernière étape : joignez la preuve de votre paiement pour permettre la validation."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              <Button
                size="sm"
                className="h-10 w-full gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-500 sm:h-8 sm:w-auto"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {cotisation?.paymentProofUrl ? "Remplacer le justificatif" : "Joindre le justificatif"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-full text-xs sm:h-8 sm:w-auto"
                disabled={busy}
                onClick={async () => {
                  if (!cotisation) return;
                  setBusy(true);
                  try {
                    await cancelCotisation({ cotisationId: cotisation._id });
                    toast.success("Demande annulée.");
                  } catch (error: any) {
                    toast.error(error?.message ?? "Annulation impossible.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Annuler la demande
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(refused || access.reason === "expired") && (
              <p className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-50/50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {refused
                  ? `Cotisation refusée${cotisation?.refusalReason ? ` : ${cotisation.refusalReason}` : "."} Vous pouvez déposer une nouvelle demande.`
                  : "Votre cotisation a expiré. Renouvelez-la pour retrouver l'accès complet à vos chantiers."}
              </p>
            )}

            {price > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Méthode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choisir une méthode" />
                  </SelectTrigger>
                  <SelectContent>
                    {methods.map((method) => (
                      <SelectItem key={method.slug} value={method.slug}>
                        {method.emoji} {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {methods.length === 0 && (
                  <p className="text-[11px] text-rose-600">
                    Aucune méthode de paiement n'est activée : contactez l'administration.
                  </p>
                )}
              </div>
            )}

            <Button
              className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
              disabled={busy || (price > 0 && methods.length === 0) || !user}
              onClick={handleRequest}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              {refused || access.reason === "expired" ? "Déposer une nouvelle demande" : "Demander la cotisation"}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Facture émise par le système de facturation batibuild — aucun prélèvement automatique.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
