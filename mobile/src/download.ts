import { Linking } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * Téléchargements natifs de l'application mobile BatiBuild.
 *
 * DEUX SOURCES DE FICHIERS
 * ------------------------
 *   1. Une URL `http(s)://` (pièces jointes, documents servis par la
 *      plateforme) → la WebView déclenche `onFileDownload` (voir
 *      `WebViewScreen`) et le fichier est récupéré par `File.downloadFileAsync`.
 *
 *   2. Un Blob fabriqué DANS LE NAVIGATEUR (les PDF jsPDF : devis d'estimation
 *      du coût de construction, rapport de l'analyse des matériaux IA, exports
 *      CSV/texte…). Une URL `blob:` n'existe que dans le moteur de rendu et la
 *      WebView Android ne sait pas l'écrire sur le disque : le clic ne
 *      produisait donc aucun fichier. Le script injecté
 *      (`DOWNLOAD_BRIDGE_SCRIPT` dans `injected.ts`) envoie ces Blobs ici, en
 *      base64 et par morceaux ; `BlobDownloadBridge` les rassemble, écrit le
 *      fichier dans le cache de l'application puis ouvre la feuille de partage
 *      Android (Enregistrer dans Fichiers / Drive, envoyer par e-mail…).
 *
 * Dans les deux cas le fichier obtenu est identique et rien n'est modifié côté
 * plateforme Web, backend ou logique métier.
 */

/** Types MIME connus, indexés par extension. */
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  dwg: "application/acad",
  dxf: "image/vnd.dxf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  csv: "text/csv",
  zip: "application/zip",
  txt: "text/plain",
};

/** Type MIME déduit du nom de fichier (PDF par défaut si inconnu). */
export function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/** Nom de fichier sûr : ni chemin, ni caractère interdit par le système. */
function sanitizeName(raw: string | undefined): string {
  const base = (raw ?? "").split(/[\\/]/).pop() ?? "";
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^[._-]+/, "");
  return safe || "document";
}

/**
 * Remet un fichier à la feuille de partage native (Enregistrer / Envoyer).
 * Repli silencieux sur l'ouverture directe si le partage n'est pas disponible.
 */
export async function shareFile(file: File, mime: string, title: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: title, UTI: mime });
    return;
  }
  await Linking.openURL(file.uri);
}

/** Écrit un contenu base64 dans le cache de l'application. */
function writeBase64(name: string, base64: string): File {
  // Préfixe temporel : deux exports successifs d'un même devis ne se
  // recouvrent jamais (aucune erreur « fichier déjà présent »).
  const file = new File(Paths.cache, `${Date.now()}-${name}`);
  try {
    file.create({ overwrite: true, intermediates: true });
  } catch {
    // Le fichier peut déjà exister : `write` l'écrasera de toute façon.
  }
  file.write(base64, { encoding: "base64" });
  return file;
}

/* ------------------------------------------------------------------ *
 * Pont Blob → fichier natif (PDF générés par la plateforme)
 * ------------------------------------------------------------------ */

/** Morceau base64 le plus gros accepté (le script injecté en envoie 256 Ko). */
const MAX_CHUNK_CHARS = 512 * 1024;
/** Nombre de morceaux maximum par fichier : borne la mémoire (~32 Mo). */
const MAX_CHUNKS = 160;
/** Un transfert resté inachevé au-delà de ce délai est oublié. */
const STALE_MS = 60_000;

export type DownloadBridgeMessage = {
  type?: string;
  id?: string;
  name?: string;
  mime?: string;
  data?: string;
  index?: number;
  total?: number;
  size?: number;
};

type Pending = {
  name: string;
  mime: string;
  chunks: string[];
  startedAt: number;
};

/**
 * Rassemble les morceaux envoyés par le script injecté et enregistre le
 * fichier. Une seule instance par WebView (créée dans `WebViewScreen`).
 */
export class BlobDownloadBridge {
  private pending = new Map<string, Pending>();

  /**
   * Traite un message du pont.
   * @returns `true` si le message appartenait au pont (à ne pas traiter
   *          ailleurs), `false` pour tout autre message (ex. partage natif).
   */
  handle(message: DownloadBridgeMessage): boolean {
    const type = message?.type ?? "";
    if (!type.startsWith("download:")) return false;

    const id = message.id;
    if (!id) return true;

    if (type === "download:start") {
      this.forgetStale();
      this.pending.set(id, {
        name: sanitizeName(message.name),
        mime: message.mime || guessMime(message.name ?? ""),
        chunks: [],
        startedAt: Date.now(),
      });
      return true;
    }

    if (type === "download:chunk") {
      const current = this.pending.get(id);
      if (!current) return true;
      const data = message.data ?? "";
      // Morceau anormal ou fichier trop gros : on abandonne, rien n'est écrit.
      if (!data || data.length > MAX_CHUNK_CHARS || current.chunks.length >= MAX_CHUNKS) {
        this.pending.delete(id);
        return true;
      }
      current.chunks.push(data);
      return true;
    }

    if (type === "download:end") {
      void this.finish(id);
      return true;
    }

    // « download:error » et tout type inconnu : transfert abandonné.
    this.pending.delete(id);
    return true;
  }

  private async finish(id: string): Promise<void> {
    const current = this.pending.get(id);
    if (!current) return;
    this.pending.delete(id);
    if (current.chunks.length === 0) return;

    try {
      const file = writeBase64(current.name, current.chunks.join(""));
      await shareFile(file, current.mime, current.name);
    } catch {
      // Écriture impossible (espace disque, permission…) : aucune donnée
      // n'est perdue côté plateforme, l'utilisateur peut recommencer.
    }
  }

  /** Oublie les transferts interrompus pour ne jamais accumuler de mémoire. */
  private forgetStale(): void {
    const now = Date.now();
    this.pending.forEach((value, key) => {
      if (now - value.startedAt > STALE_MS) this.pending.delete(key);
    });
  }
}
