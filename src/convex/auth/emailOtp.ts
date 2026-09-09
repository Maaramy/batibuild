import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { internal } from "../_generated/api";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  // Tous les codes de vérification sont envoyés depuis le serveur SMTP
  // administrateur configuré dans les variables d'environnement du projet
  // (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM,
  // SMTP_FROM_NAME, SMTP_SECURE). Le destinataire (« To ») reste l'adresse
  // saisie par l'utilisateur. Aucun e-mail n'est envoyé via un service lié à
  // freebuff.com ; si SMTP n'est pas configuré, l'envoi échoue proprement.
  async sendVerificationRequest(...args: any[]) {
    // Convex Auth transmet le contexte d'action en second argument (non typé
    // par Auth.js) — utilisé pour déclencher l'action SMTP.
    const { identifier: email, token } = args[0] as {
      identifier: string;
      token: string;
    };
    const ctx = args[1] as any;
    const result = await ctx.runAction(internal.emailSender.sendOtpEmail, {
      to: email,
      code: token,
    });
    if (!result?.ok) {
      throw new Error(
        result?.message ||
          "Impossible d'envoyer le code de vérification. Veuillez réessayer.",
      );
    }
  },
});