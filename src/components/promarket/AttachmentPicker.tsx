import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import {
  UploadError,
  uploadAttachments,
  validateAttachments,
  type AttachmentInput,
} from "@/lib/attachmentUpload";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { FileText, ImageUp, Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// ============================================================================
// ProMarket — pièces jointes d'une demande (images / documents)
// ============================================================================

export function AttachmentPicker({
  value,
  onChange,
  max = 5,
  className,
}: {
  value: AttachmentInput[];
  onChange: (files: AttachmentInput[]) => void;
  max?: number;
  className?: string;
}) {
  const { t } = useTranslation("promarket");
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    try {
      validateAttachments(files, value.length);
    } catch (error) {
      const code = error instanceof UploadError ? error.code : "upload";
      toast.error(
        code === "count"
          ? t("request.attachments") + ` (max ${max})`
          : t("common.error"),
      );
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadAttachments(files, () => generateUploadUrl());
      onChange([...value, ...uploaded].slice(0, max));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          disabled={uploading || value.length >= max}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
          {t("request.addFiles")}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {value.length}/{max}
        </span>
      </div>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((file) => (
            <li
              key={file.storageId}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/10 px-2 py-1"
            >
              {file.type.startsWith("image/") ? (
                <ImageUp className="h-3.5 w-3.5 text-primary" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="max-w-[10rem] truncate text-[11px]">{file.name}</span>
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={() =>
                  onChange(value.filter((f) => f.storageId !== file.storageId))
                }
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
