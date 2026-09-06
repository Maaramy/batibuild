import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X, CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  AnnouncementForm,
  EMPTY_FORM,
  localInputToTs,
  tsToLocalInput,
  type AnnouncementFormValues,
} from "./AnnouncementForm";
import { AnnouncementPreview } from "./AnnouncementPreview";
import { TYPE_PRIORITY, isValidExternalUrl, type AnnouncementLike } from "../../announcements/meta";

export type EditorMode = "create" | "edit" | "duplicate";

interface Props {
  open: boolean;
  mode: EditorMode;
  announcement: AnnouncementLike | null;
  onClose: () => void;
  onSaved: () => void;
}

function valuesFromAnnouncement(a: AnnouncementLike): AnnouncementFormValues {
  const hasFutureStart = a.startDate !== undefined && a.startDate > Date.now();
  return {
    title: a.title,
    content: a.content,
    type: a.type,
    priority: a.priority ?? TYPE_PRIORITY[a.type] ?? 1,
    imageUrl: a.imageUrl ?? "",
    imageStorageId: undefined,
    externalUrl: a.externalUrl ?? "",
    publishMode:
      a.status === "draft" || (a.status === "scheduled" && !hasFutureStart)
        ? "draft"
        : hasFutureStart
          ? "scheduled"
          : "now",
    startDate: tsToLocalInput(a.startDate),
    endDate: tsToLocalInput(a.endDate),
    targetType: a.targetType ?? "all",
    targetCompanyNames: a.targetCompanyNames ?? [],
    targetRoles: a.targetRoles ?? [],
    targetUserIds: a.targetUserIds ?? [],
  };
}

/**
 * Create / edit / duplicate dialog with live preview.
 */
export function AnnouncementEditor({ open, mode, announcement, onClose, onSaved }: Props) {
  const [values, setValues] = useState<AnnouncementFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const createAnnouncement = useMutation(api.announcements.createAnnouncement);
  const updateAnnouncement = useMutation(api.announcements.updateAnnouncement);

  // Target pickers need the full user list (admin-only query).
  const allUsers = useQuery(api.users.getAllUsers) || [];
  const users = useMemo(
    () => allUsers.map((u: any) => ({ _id: u._id as string, name: u.name, email: u.email, company: u.company })),
    [allUsers],
  );

  useEffect(() => {
    if (!open) return;
    if (mode === "create" || mode === "duplicate") {
      setValues(
        mode === "duplicate" && announcement
          ? {
              ...valuesFromAnnouncement(announcement),
              title: `${announcement.title} (copie)`,
              publishMode: "draft",
            }
          : EMPTY_FORM,
      );
    } else if (mode === "edit" && announcement) {
      setValues(valuesFromAnnouncement(announcement));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, announcement]);

  // Image d'origine au moment de l'ouverture (mode « Annuler » de l'uploader).
  const initialImageUrl = mode === "create" ? "" : (announcement?.imageUrl ?? "");

  const preview = useMemo<AnnouncementLike | null>(() => {
    if (!values.title && !values.content) return null;
    const startTs = localInputToTs(values.startDate);
    const endTs = localInputToTs(values.endDate);
    const now = Date.now();
    const status =
      values.publishMode === "draft"
        ? "draft"
        : values.publishMode === "scheduled" && startTs !== undefined && startTs > now
          ? "scheduled"
          : "published";
    return {
      _id: "preview",
      title: values.title || "Titre de la communication",
      content: values.content || "Contenu de la communication…",
      type: values.type,
      priority: values.priority,
      imageUrl: values.imageUrl || undefined,
      externalUrl:
        values.type === "annonce" &&
        values.externalUrl.trim() &&
        isValidExternalUrl(values.externalUrl)
          ? values.externalUrl.trim()
          : undefined,
      status,
      resolvedStatus: status,
      isActive: values.publishMode !== "draft",
      startDate: startTs,
      endDate: endTs,
      targetType: values.targetType,
      targetCompanyNames: values.targetCompanyNames,
      targetRoles: values.targetRoles,
      targetUserIds: values.targetUserIds,
    };
  }, [values]);

  const validate = (): string | null => {
    if (!values.title.trim()) return "Le titre est obligatoire.";
    if (!values.content.trim()) return "Le contenu est obligatoire.";
    if (values.publishMode === "scheduled") {
      const startTs = localInputToTs(values.startDate);
      if (startTs === undefined) return "La date de début est obligatoire en mode programmé.";
      if (startTs <= Date.now()) return "La date de début doit être dans le futur.";
      const endTs = localInputToTs(values.endDate);
      if (endTs !== undefined && endTs <= startTs) {
        return "La date d'expiration doit être après la date de début.";
      }
    }
    if (values.targetType === "role" && values.targetRoles.length === 0)
      return "Sélectionnez au moins un rôle.";
    if (values.targetType === "company" && values.targetCompanyNames.length === 0)
      return "Sélectionnez au moins une société.";
    if (values.targetType === "user" && values.targetUserIds.length === 0)
      return "Sélectionnez au moins un utilisateur.";
    if (
      values.type === "annonce" &&
      values.externalUrl.trim() &&
      !isValidExternalUrl(values.externalUrl)
    ) {
      return "Le lien externe doit être une URL valide commençant par https:// ou http://.";
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const input = {
      title: values.title.trim(),
      content: values.content.trim(),
      type: values.type,
      priority: values.priority,
      imageUrl: values.imageUrl.trim() || undefined,
      ...(values.imageStorageId ? { imageStorageId: values.imageStorageId as any } : {}),
      externalUrl:
        values.type === "annonce" &&
        values.externalUrl.trim() &&
        isValidExternalUrl(values.externalUrl)
          ? values.externalUrl.trim()
          : undefined,
      publishMode: values.publishMode,
      startDate: localInputToTs(values.startDate),
      endDate: localInputToTs(values.endDate),
      targetType: values.targetType,
      targetCompanyNames:
        values.targetType === "company" ? values.targetCompanyNames : undefined,
      targetRoles: values.targetType === "role" ? values.targetRoles : undefined,
      targetUserIds:
        values.targetType === "user" ? (values.targetUserIds as any) : undefined,
    };

    setSaving(true);
    try {
      if (mode === "edit" && announcement) {
        await updateAnnouncement({ id: announcement._id as any, input });
        toast.success("Communication mise à jour");
      } else {
        await createAnnouncement({ input });
        toast.success(mode === "duplicate" ? "Communication dupliquée" : "Communication créée");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-5xl rounded-2xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/40">
          <DialogTitle className="text-base flex items-center gap-2">
            {mode === "duplicate" ? (
              <CopyPlus className="h-4 w-4 text-primary" />
            ) : mode === "edit" ? (
              <span className="text-primary">✏️</span>
            ) : (
              <span className="text-primary">📢</span>
            )}
            {mode === "create" ? "Créer une communication" : mode === "edit" ? "Modifier la communication" : "Dupliquer la communication"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulaire de création ou de modification d'une communication
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-y-auto flex-1">
          <div className="p-5 border-b lg:border-b-0 lg:border-r border-border/40">
            <AnnouncementForm
              value={values}
              onChange={setValues}
              users={users}
              initialImageUrl={initialImageUrl}
              disabled={saving}
            />
          </div>
          <div className="p-5 bg-muted/20">
            <AnnouncementPreview announcement={preview} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/40 px-5 py-3 bg-background/80">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={onClose} disabled={saving}>
            <X className="h-3.5 w-3.5" />
            Annuler
          </Button>
          <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Enregistrement…" : mode === "edit" ? "Enregistrer" : mode === "duplicate" ? "Créer la copie" : "Publier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}