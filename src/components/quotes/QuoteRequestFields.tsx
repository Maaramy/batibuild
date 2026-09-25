import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Paperclip, X } from "lucide-react";
import { QUOTE_MOTIFS, QUOTE_MOTIF_OTHER } from "@/lib/quoteMotifs";
import {
  QUOTE_ATTACHMENT_ACCEPT,
  QUOTE_ATTACHMENT_HINT,
  formatFileSize,
  validateQuoteAttachment,
} from "@/lib/quoteAttachments";

// ============================================================================
// CHAMPS COMMUNS D'UNE DEMANDE DE DEVIS
//
// Bloc réutilisé par les deux formulaires d'envoi (fiche fournisseur et
// annuaire) : motif obligatoire (liste prédéfinie + précision si « Autre ») et
// pièces jointes facultatives, contrôlées avant l'envoi.
// ============================================================================

const fileLabel = (file: File) =>
  file.type || (file.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : "fichier");

interface QuoteRequestFieldsProps {
  motif: string;
  onMotifChange: (value: string) => void;
  motifOther: string;
  onMotifOtherChange: (value: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function QuoteRequestFields({
  motif,
  onMotifChange,
  motifOther,
  onMotifOtherChange,
  files,
  onFilesChange,
}: QuoteRequestFieldsProps) {
  const handleAddFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      const error = validateQuoteAttachment(file);
      if (error) {
        toast.error(error);
        continue;
      }
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    onFilesChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Motif obligatoire */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Motif de la demande <span className="text-red-500">*</span>
        </label>
        <Select value={motif} onValueChange={onMotifChange}>
          <SelectTrigger className="w-full text-xs rounded-xl">
            <SelectValue placeholder="Sélectionnez un motif…" />
          </SelectTrigger>
          <SelectContent>
            {QUOTE_MOTIFS.map((m) => (
              <SelectItem key={m.key} value={m.key} className="text-xs">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {motif === QUOTE_MOTIF_OTHER && (
          <Input
            value={motifOther}
            onChange={(e) => onMotifOtherChange(e.target.value)}
            placeholder="Précisez le motif de votre demande…"
            className="mt-2 text-xs rounded-xl"
          />
        )}
      </div>

      {/* Pièces jointes facultatives */}
      <div>
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Pièce jointe{" "}
          <span className="normal-case font-normal text-muted-foreground/70">(facultatif)</span>
        </label>

        <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border/50 hover:border-primary/40 hover:bg-primary/[0.03] transition-all cursor-pointer text-xs text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          Ajouter une pièce jointe
          <input
            type="file"
            multiple
            accept={QUOTE_ATTACHMENT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              handleAddFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <p className="mt-1 text-[9px] text-muted-foreground/60">{QUOTE_ATTACHMENT_HINT}</p>

        {files.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${file.size}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/10 px-2.5 py-2"
              >
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium">{file.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {fileLabel(file)} · {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer shrink-0"
                  title="Retirer la pièce jointe"
                  aria-label={`Retirer ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default QuoteRequestFields;
