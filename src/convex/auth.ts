import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { emailOtp } from "./auth/emailOtp";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // `verify` makes the Password provider require e-mail validation:
  // new accounts are created locked, a 6-digit OTP is sent by e-mail through
  // the same relay as the email-otp quick login, and the account only becomes
  // usable once the code is verified (flow "email-verification"). Existing
  // unverified accounts are asked for the OTP once at their next login.
  providers: [emailOtp, Password({ verify: emailOtp }), Anonymous],
});