// ============================================================================
// PIÈCES JOINTES D'UNE DEMANDE DE DEVIS
//
// Formats autorisés : PDF, JPG/JPEG, PNG, WEBP, DOC/DOCX, XLS/XLSX.
// La validation est partagée entre le formulaire (avant envoi) et la mutation
// serveur (dernier rempart) : les deux appellent `validateQuoteAttachment`.
// ============================================================================

/** Taille maximale acceptée par pièce jointe : 10 Mo. */
export const MAX_QUOTE_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const QUOTE_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const QUOTE_ATTACHMENT_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "doc",
  "docx",
  "xls",
  "xlsx",
] as const;

/** Attribut `accept` du champ fichier (extensions + types MIME). */
export const QUOTE_ATTACHMENT_ACCEPT = [
  ...QUOTE_ATTACHMENT_EXTENSIONS.map((e) => `.${e}`),
  ...QUOTE_ATTACHMENT_TYPES,
].join(",");

export const QUOTE_ATTACHMENT_HINT =
  "PDF, JPG, PNG, WEBP, DOC/DOCX, XLS/XLSX — 10 Mo max par fichier";

export interface QuoteAttachmentLike {
  name: string;
  type?: string;
  size: number;
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/**
 * Valide un fichier avant stockage. Renvoie un message d'erreur lisible, ou
 * `null` si le fichier est conforme (type + taille).
 */
export function validateQuoteAttachment(file: QuoteAttachmentLike): string | null {
  const ext = extensionOf(file.name ?? "");
  const typeOk =
    !!file.type && (QUOTE_ATTACHMENT_TYPES as readonly string[]).includes(file.type);
  const extOk = (QUOTE_ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext);

  if (!typeOk && !extOk) {
    return `Format non autorisé pour « ${file.name} ». Formats acceptés : PDF, JPG, PNG, WEBP, DOC/DOCX, XLS/XLSX.`;
  }
  if (file.size <= 0) {
    return `Le fichier « ${file.name} » est vide.`;
  }
  if (file.size > MAX_QUOTE_ATTACHMENT_BYTES) {
    return `« ${file.name} » dépasse la taille maximale de 10 Mo.`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export interface UploadedQuoteAttachment {
  storageId: string;
  name: string;
  type: string;
  size: number;
}

/** Téléverse un fichier vers Convex Storage et renvoie la référence à stocker. */
export async function uploadQuoteAttachment(
  file: File,
  getUploadUrl: () => Promise<string>,
): Promise<UploadedQuoteAttachment> {
  const uploadUrl = await getUploadUrl();
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(`Échec du téléversement de « ${file.name} »`);
  const { storageId } = (await res.json()) as { storageId: string };
  return { storageId, name: file.name, type: file.type, size: file.size };
}
