import { useRef, useState } from "react";
import { ImageUp, Loader2, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const ACCEPT_ATTR = "image/png,image/jpeg,image/webp,image/svg+xml";
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const MAX_DIMENSION = 1600; // px, côté le plus long après optimisation
const QUALITY = 0.85;

function matchesType(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  // Certains appareils mobiles n'envoient pas de MIME : repli sur l'extension.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ["png", "jpg", "jpeg", "webp", "svg"].includes(ext);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de lire l'image"));
    img.src = src;
  });
}

/**
 * Optimise l'image avant l'upload : redimensionne (1600 px max) et ré-encode
 * en WebP/JPEG/PNG pour réduire le poids. Les SVG (icônes) sont conservés tels
 * quels pour rester vectoriels.
 */
async function optimizeImage(file: File): Promise<Blob> {
  if (file.type === "image/svg+xml") return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    let { width, height } = img;
    if (!width || !height) return file;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const mimes: string[] =
      file.type === "image/png"
        ? ["image/webp", "image/png"]
        : ["image/webp", "image/jpeg"];
    for (const mime of mimes) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, QUALITY),
      );
      // On ne garde le ré-encodage que s'il réduit réellement le poids.
      if (blob && blob.size < file.size) return blob;
    }
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface Props {
  /** URL affichée : image existante (base de données) ou aperçu local. */
  url: string;
  /** Storage id d'un fichier fraîchement téléversé (résolu au moment de l'enregistrement). */
  storageId?: string;
  /** URL d'origine à l'ouverture du formulaire — cible du bouton « Annuler ». */
  initialUrl?: string;
  onChange: (patch: { imageUrl: string; imageStorageId?: string }) => void;
  disabled?: boolean;
}

/**
 * Upload d'image / icône d'annonce : remplace la saisie manuelle d'une URL.
 * Sélection depuis la galerie / les fichiers, Drag & Drop sur desktop,
 * validation (type + taille), optimisation automatique, aperçu immédiat et
 * actions Changer / Supprimer / Annuler.
 */
export function AnnouncementImageUpload({ url, storageId, initialUrl, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Valeur au moment de l'ouverture du formulaire — cible du bouton « Annuler ».
  const originalRef = useRef(initialUrl ?? url);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const hasPendingChanges = url !== originalRef.current || Boolean(storageId);

  const commit = (patch: { imageUrl: string; imageStorageId?: string }) => {
    // Nettoyage de l'ancien aperçu local (blob URL) s'il est remplacé/supprimé.
    if (url && url.startsWith("blob:") && patch.imageUrl !== url) {
      URL.revokeObjectURL(url);
    }
    onChange(patch);
  };

  const handleFile = async (file: File | null | undefined) => {
    if (!file || disabled || uploading) return;
    if (!matchesType(file)) {
      toast.error("Format non pris en charge — utilisez PNG, JPG, JPEG, WEBP ou SVG.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(`Image trop lourde (${formatBytes(file.size)}). Maximum : ${formatBytes(MAX_SIZE)}.`);
      return;
    }
    setUploading(true);
    try {
      const optimized = await optimizeImage(file);
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": optimized.type || "application/octet-stream" },
        body: optimized,
      });
      if (!res.ok) throw new Error("Échec du téléversement — réessayez.");
      const data = (await res.json()) as { storageId?: string };
      if (!data.storageId) throw new Error("Réponse du serveur invalide.");
      commit({ imageUrl: URL.createObjectURL(optimized), imageStorageId: data.storageId });
      toast.success("Image prête — enregistrez l'annonce pour l'appliquer.");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement de l'image.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openPicker = () => inputRef.current?.click();
  const removeImage = () => commit({ imageUrl: "", imageStorageId: undefined });
  const undoChanges = () => commit({ imageUrl: originalRef.current, imageStorageId: undefined });

  if (url) {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/20">
          <img
            src={url}
            alt="Aperçu de l'image de l'annonce"
            className="h-36 w-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={openPicker}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-all hover:border-primary/40 hover:text-primary active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            <ImageUp className="h-3.5 w-3.5" />
            Changer l'image
          </button>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={removeImage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition-all hover:border-red-500/50 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer l'image
          </button>
          {hasPendingChanges && (
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={undoChanges}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-border hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Annuler
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Télécharger une image ou une icône"
        onClick={() => !disabled && !uploading && openPicker()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !uploading) openPicker();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all",
          dragging
            ? "border-primary/60 bg-primary/[0.06] scale-[1.01]"
            : "border-border/60 bg-muted/10 hover:border-primary/40 hover:bg-primary/[0.03]",
          (disabled || uploading) && "pointer-events-none opacity-50",
        )}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ImageUp className="h-5 w-5" />
          </span>
        )}
        <span className="text-xs font-semibold text-foreground">
          {uploading ? "Téléversement en cours…" : "Télécharger une image ou une icône"}
        </span>
        <span className="max-w-xs text-[10px] leading-relaxed text-muted-foreground">
          PNG, JPG, JPEG, WEBP ou SVG · {formatBytes(MAX_SIZE)} max
          <br className="hidden sm:block" />
          <span className="hidden sm:inline"> — glissez-déposez votre fichier ici</span>
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}