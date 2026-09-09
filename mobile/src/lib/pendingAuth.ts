// Stockage en mémoire (jamais persisté) pour les flux d'authentification :
// - mot de passe en attente de vérification e-mail (flow email-verification)
// - profil à enregistrer après confirmation de l'authentification
export interface PendingPassword {
  email: string;
  password: string;
  flow: "signIn" | "signUp";
}

export interface PendingProfile {
  name: string;
  phone: string;
  userRole: "client" | "supplier" | "expert";
}

let pendingPassword: PendingPassword | null = null;
let pendingProfile: PendingProfile | null = null;

export function setPendingPassword(p: PendingPassword | null): void {
  pendingPassword = p;
}
export function getPendingPassword(): PendingPassword | null {
  return pendingPassword;
}

export function setPendingProfile(p: PendingProfile | null): void {
  pendingProfile = p;
}
export function getPendingProfile(): PendingProfile | null {
  return pendingProfile;
}