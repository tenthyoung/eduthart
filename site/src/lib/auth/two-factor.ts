import type { MultiFactorResolver, TotpSecret } from "firebase/auth";

/**
 * Two-factor authentication, as the app talks about it.
 *
 * EduthArt offers exactly one second factor: a time-based code from an
 * authenticator app. SMS was considered and rejected — it bills per message,
 * needs a phone number we do not otherwise collect, and SIM-swap makes it the
 * weaker factor.
 */

export const TOTP_ISSUER = "EduthArt";

/** How the enrolled factor is labelled in Firebase and in the account page. */
export const TOTP_DISPLAY_NAME = "Authenticator app";

export type EnrolledFactor = {
  displayName: string | null;
  enrolledAt: string | null;
  uid: string;
};

/**
 * Thrown by sign-in when the account has a second factor.
 *
 * A thrown error rather than a returned union, deliberately: an unhandled
 * throw shows the person an error, while an unhandled union would let the
 * caller navigate on as though sign-in had succeeded. Of the two ways to get
 * this wrong, the loud one is better.
 */
export class TwoFactorRequiredError extends Error {
  readonly resolver: MultiFactorResolver;

  constructor(resolver: MultiFactorResolver) {
    super("A verification code from your authenticator app is required.");
    this.name = "TwoFactorRequiredError";
    this.resolver = resolver;
  }
}

export function isTwoFactorRequiredError(
  error: unknown
): error is TwoFactorRequiredError {
  return error instanceof TwoFactorRequiredError;
}

export type TotpEnrollment = {
  /** The key to type in by hand when a QR code cannot be scanned. */
  secretKey: string;
  /** The otpauth:// URI an authenticator app expects behind a QR code. */
  uri: string;
  /** Held between starting and finishing enrollment; not serialisable. */
  secret: TotpSecret;
};

/**
 * Turn a Firebase auth error code into something worth reading.
 *
 * `auth/operation-not-allowed` gets special treatment because it is the one
 * everybody will hit first: it means multi-factor auth is switched off for the
 * Firebase project, not that the person did anything wrong.
 */
export function describeTwoFactorError(code: string | null, fallback: string) {
  if (code === "auth/operation-not-allowed") {
    return (
      "Two-factor authentication is not enabled for this site yet. " +
      "This needs turning on in Firebase before anyone can use it."
    );
  }

  if (code === "auth/invalid-verification-code") {
    return "That code was not accepted. Check the current code in your authenticator app and try again.";
  }

  if (code === "auth/unverified-email") {
    return "Verify your email address before turning on two-factor authentication.";
  }

  if (code === "auth/requires-recent-login") {
    return "For security, sign in again before changing two-factor authentication.";
  }

  if (code === "auth/totp-challenge-timeout") {
    return "That took too long. Start again and enter a fresh code.";
  }

  if (code === "auth/maximum-second-factor-count-exceeded") {
    return "This account already has as many second factors as Firebase allows.";
  }

  return fallback;
}
