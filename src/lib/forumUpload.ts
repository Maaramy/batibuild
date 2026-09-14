import {
  FORUM_MAX_FILES,
  FORUM_MAX_FILE_BYTES,
  isAllowedForumFile,
} from "@/lib/forumMeta";

// ============================================================================
// Transfert des pièces jointes du forum vers le stockage Convex
// ============================================================================

export interface ForumAttachmentInput {
  name: string;
  type: string;
  size?: number;
  storageId: string;
}

/** Code d'erreur traduisible par l'appelant (jamais un message en dur ici). */
export type ForumUploadErrorCode = "type" | "size" | "count" | "upload";

export class ForumUploadError extends Error {
  code: ForumUploadErrorCode;
  constructor(code: ForumUploadErrorCode) {
    super(code);
    this.name = "ForumUploadError";
    this.code = code;
  }
}

/** Valide une sélection de fichiers (formats, taille unitaire, nombre total). */
export function validateForumFiles(files: File[], alreadyAttached = 0): void {
  if (files.length + alreadyAttached > FORUM_MAX_FILES) {
    throw new ForumUploadError("count");
  }
  for (const file of files) {
    if (!isAllowedForumFile(file)) throw new ForumUploadError("type");
    if (file.size > FORUM_MAX_FILE_BYTES) throw new ForumUploadError("size");
  }
}

/**
 * Envoie les fichiers un par un (URL d'upload signée Convex) et retourne les
 * références attendues par le backend.
 */
export async function uploadForumFiles(
  files: File[],
  generateUploadUrl: () => Promise<string>,
  onProgress?: (done: number, total: number) => void,
): Promise<ForumAttachmentInput[]> {
  const out: ForumAttachmentInput[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    try {
      const postUrl = await generateUploadUrl();
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new ForumUploadError("upload");
      const json = (await res.json()) as { storageId?: string };
      if (!json.storageId) throw new ForumUploadError("upload");
      out.push({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        storageId: json.storageId,
      });
    } catch (err) {
      if (err instanceof ForumUploadError) throw err;
      throw new ForumUploadError("upload");
    }
    onProgress?.(i + 1, files.length);
  }
  return out;
}
