// ============================================================================
// Pièces jointes — validation et transfert vers le stockage Convex
//
// Module neutre partagé par les modules qui permettent de joindre des fichiers
// (ProMarket : demandes de service, devis, messagerie). Aucune dépendance
// implicite : les limites sont déclarées ici.
// ============================================================================

/** Nombre maximal de pièces jointes par envoi. */
export const MAX_ATTACHMENTS = 5;

/** Taille maximale d'un fichier (10 Mo). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Formats acceptés (images, PDF, documents, tableurs). */
export const ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.dwg";

export const ALLOWED_MIME_PREFIXES = ["image/"];
export const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/acad",
  "image/vnd.dwg",
];

export interface AttachmentInput {
  name: string;
  type: string;
  size?: number;
  storageId: string;
}

/** Code d'erreur traduisible par l'appelant (jamais un message en dur ici). */
export type UploadErrorCode = "type" | "size" | "count" | "upload";

export class UploadError extends Error {
  code: UploadErrorCode;
  constructor(code: UploadErrorCode) {
    super(code);
    this.name = "UploadError";
    this.code = code;
  }
}

/** Le fichier respecte-t-il les formats acceptés ? */
export function isAllowedAttachmentFile(file: File): boolean {
  if (ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) return true;
  if (ALLOWED_MIME.includes(file.type)) return true;
  // Certains navigateurs ne renseignent pas le type (DWG, DOCX anciens).
  if (!file.type) return true;
  return false;
}

/** Valide une sélection de fichiers (formats, taille unitaire, nombre total). */
export function validateAttachments(files: File[], alreadyAttached = 0): void {
  if (files.length + alreadyAttached > MAX_ATTACHMENTS) {
    throw new UploadError("count");
  }
  for (const file of files) {
    if (!isAllowedAttachmentFile(file)) throw new UploadError("type");
    if (file.size > MAX_ATTACHMENT_BYTES) throw new UploadError("size");
  }
}

/**
 * Envoie les fichiers un par un (URL d'upload signée Convex) et retourne les
 * références attendues par le backend.
 */
export async function uploadAttachments(
  files: File[],
  generateUploadUrl: () => Promise<string>,
  onProgress?: (done: number, total: number) => void,
): Promise<AttachmentInput[]> {
  const out: AttachmentInput[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    try {
      const postUrl = await generateUploadUrl();
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new UploadError("upload");
      const json = (await res.json()) as { storageId?: string };
      if (!json.storageId) throw new UploadError("upload");
      out.push({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        storageId: json.storageId,
      });
    } catch (err) {
      if (err instanceof UploadError) throw err;
      throw new UploadError("upload");
    }
    onProgress?.(i + 1, files.length);
  }
  return out;
}
