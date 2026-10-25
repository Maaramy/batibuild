import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

// ============================================================================
// Destinataires des notifications administrateur
// ----------------------------------------------------------------------------
// Adresses e-mail qui reçoivent les notifications d'événements de la
// plateforme (nouvelle inscription, nouvel abonnement, nouveau projet).
// Les règles de validation et les autorisations sont vérifiées CÔTÉ SERVEUR
// (`adminNotificationRecipients`) ; ce composant ne fait que les saisir.
// ============================================================================

const inputCls =
  "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30";

/** Catégories proposées (libellé affiché ↔ valeur stockée). */
const TOPIC_OPTIONS = [
  { value: "admin_new_user", label: "Nouvelle inscription" },
  { value: "admin_new_subscription", label: "Nouvel abonnement" },
  { value: "admin_new_project", label: "Nouveau projet" },
] as const;

const ALL_TOPIC = "all";

type RecipientRow = {
  _id: string;
  email: string;
  name?: string;
  topics: string[];
  active?: boolean;
  topicLabels?: string[];
};

export default function AdminNotificationRecipients() {
  const recipients = useQuery(
    api.adminNotificationRecipients.listAdminNotificationRecipients,
  ) as RecipientRow[] | undefined;
  const saveRecipient = useMutation(
    api.adminNotificationRecipients.saveAdminNotificationRecipient,
  );
  const deleteRecipient = useMutation(
    api.adminNotificationRecipients.deleteAdminNotificationRecipient,
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [topics, setTopics] = useState<string[]>([ALL_TOPIC]);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => recipients ?? [], [recipients]);
  const loading = recipients === undefined;

  const resetForm = () => {
    setEditingId(null);
    setEmail("");
    setName("");
    setTopics([ALL_TOPIC]);
    setActive(true);
    setFormOpen(false);
  };

  const startEdit = (row: RecipientRow) => {
    setEditingId(String(row._id));
    setEmail(row.email);
    setName(row.name ?? "");
    setTopics(row.topics?.length ? [...row.topics] : [ALL_TOPIC]);
    setActive(row.active !== false);
    setFormOpen(true);
  };

  const toggleTopic = (value: string) => {
    if (value === ALL_TOPIC) {
      setTopics([ALL_TOPIC]);
      return;
    }
    setTopics((current) => {
      const withoutAll = current.filter((t) => t !== ALL_TOPIC);
      const next = withoutAll.includes(value)
        ? withoutAll.filter((t) => t !== value)
        : [...withoutAll, value];
      // Aucune catégorie cochée = toutes (retour à « Toutes »).
      return next.length ? next : [ALL_TOPIC];
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await saveRecipient({
        recipientId: (editingId ?? undefined) as any,
        email,
        name: name.trim() || undefined,
        topics,
        active,
      });
      toast.success(
        editingId
          ? "✅ Destinataire modifié"
          : "✅ Destinataire ajouté — il recevra les notifications sélectionnées",
      );
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement du destinataire");
    }
    setSaving(false);
  };

  const handleDelete = async (row: RecipientRow) => {
    if (
      !window.confirm(
        `Supprimer le destinataire « ${row.email} » ?\n\nCette adresse ne recevra plus aucune notification administrateur.`,
      )
    ) {
      return;
    }
    try {
      await deleteRecipient({ recipientId: row._id as any });
      toast.success("Destinataire supprimé");
      if (editingId === String(row._id)) resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression");
    }
  };

  const handleToggleActive = async (row: RecipientRow, next: boolean) => {
    try {
      await saveRecipient({
        recipientId: row._id as any,
        email: row.email,
        name: row.name || undefined,
        topics: row.topics?.length ? row.topics : [ALL_TOPIC],
        active: next,
      });
      toast.success(next ? "Destinataire réactivé" : "Destinataire désactivé");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la mise à jour");
    }
  };

  return (
    <Card className="border border-border/50 bg-gradient-to-br from-background/80 to-background/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-gradient-to-br from-primary/20 to-blue-500/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">
                Destinataires des notifications administrateur
              </CardTitle>
              <CardDescription className="text-xs">
                {rows.length} adresse{rows.length > 1 ? "s" : ""} configurée
                {rows.length > 1 ? "s" : ""} — enregistrées en base, sans intervention technique
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              if (formOpen) {
                resetForm();
              } else {
                resetForm();
                setFormOpen(true);
              }
            }}
          >
            {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {formOpen ? "Fermer" : "Ajouter une adresse"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!loading && rows.length === 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Aucune adresse configurée : aucune notification administrateur n'est envoyée.
              Ajoutez au moins une adresse pour recevoir les nouvelles inscriptions, les
              nouveaux abonnements et les nouveaux projets.
            </p>
          </div>
        )}

        {formOpen && (
          <div className="space-y-3 rounded-xl border border-border/40 bg-muted/10 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Adresse e-mail *
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@batibuild.app"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Libellé (facultatif)
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Direction — Batibuild"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Notifications reçues
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: ALL_TOPIC, label: "Toutes les notifications" },
                  ...TOPIC_OPTIONS,
                ].map((opt) => {
                  const selected = topics.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTopic(opt.value)}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/40 bg-background text-muted-foreground hover:bg-muted/20"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={active} onCheckedChange={setActive} />
                <span className="text-[11px] text-muted-foreground">
                  {active ? "Actif — reçoit les e-mails" : "Inactif — aucun envoi"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={resetForm} disabled={saving}>
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {editingId ? "Enregistrer" : "Ajouter"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des destinataires…
          </div>
        ) : (
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div
                key={String(row._id)}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors ${
                  row.active !== false
                    ? "border-border/30 bg-muted/10"
                    : "border-border/20 bg-muted/5 opacity-70"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="truncate text-xs font-semibold">{row.email}</p>
                    {row.name ? (
                      <span className="text-[10px] text-muted-foreground">· {row.name}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(row.topicLabels ?? []).map((label) => (
                      <Badge
                        key={label}
                        variant="outline"
                        className="border-primary/20 bg-primary/5 px-1.5 py-0 text-[9px] font-medium text-primary"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={row.active !== false}
                    onCheckedChange={(next) => handleToggleActive(row, next)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Modifier"
                    onClick={() => startEdit(row)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Supprimer"
                    onClick={() => handleDelete(row)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
