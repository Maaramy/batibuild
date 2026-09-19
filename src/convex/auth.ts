import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";
import { startTrialFor } from "./subscriptionStatus";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // `verify` makes the Password provider require e-mail validation:
  // new accounts are created locked, a 6-digit OTP is sent by e-mail through
  // the same relay as the email-otp quick login, and the account only becomes
  // usable once the code is verified (flow "email-verification"). Existing
  // unverified accounts are asked for the OTP once at their next login.
  providers: [emailOtp, Password({ verify: emailOtp }), Anonymous],
  callbacks: {
    // Démarre automatiquement la période d'essai gratuite (7 jours) à
    // l'inscription, lorsque l'« Offre gratuite » est activée dans
    // l'administration. Idempotent : `startTrialFor` n'accorde jamais un
    // second essai (`trialClaimedAt` immuable).
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      await startTrialFor(ctx, userId);
    },
  },
});
