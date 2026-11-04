// ============================================================================
// Configuration Firebase Cloud Messaging (HTTP v1) — lecture des secrets
// ----------------------------------------------------------------------------
// Les identifiants de service vivent EXCLUSIVEMENT dans les variables
// d'environnement du backend Convex. Ce module est importé par la fonction
// Node d'envoi (`pushSender.ts`, "use node") et par la validation du module
// push : aucune clé n'est jamais exposée au client.
//
// Variables acceptées (au choix) :
//   · FIREBASE_SERVICE_ACCOUNT_JSON  = contenu JSON complet du compte de service
//   · FIREBASE_SERVICE_ACCOUNT       = idem (alias)
//   · ou FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
// ============================================================================

export type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function normalizePrivateKey(value: string): string {
  // Les variables d'environnement échappent souvent les retours à la ligne.
  return value.replace(/\\n/g, "\n").trim();
}

export function getFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const projectId = String(parsed.project_id ?? parsed.projectId ?? "").trim();
      const clientEmail = String(parsed.client_email ?? parsed.clientEmail ?? "").trim();
      const privateKey = normalizePrivateKey(
        String(parsed.private_key ?? parsed.privateKey ?? ""),
      );
      if (projectId && clientEmail && privateKey) {
        return { projectId, clientEmail, privateKey };
      }
    } catch {
      return null;
    }
    return null;
  }

  const projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || "");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function isPushConfigured(): boolean {
  return getFirebaseServiceAccount() !== null;
}

export const PUSH_CONFIG_ERROR =
  "Firebase Cloud Messaging non configuré : ajoutez FIREBASE_SERVICE_ACCOUNT_JSON (ou FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY) dans les variables d'environnement du backend Convex.";
