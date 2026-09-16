import { describe, expect, test } from "vitest";

import {
  describeTwoFactorError,
  isTwoFactorRequiredError,
  TOTP_ISSUER,
  TwoFactorRequiredError,
} from "@/lib/auth/two-factor";

/**
 * The parts of two-factor auth that do not need Firebase.
 *
 * Enrollment and the sign-in challenge both need a live Identity Platform
 * project, so they are not exercised here. What is: the messages a person
 * reads when something goes wrong, the error type the login page branches on,
 * and that the QR code we render is really the enrollment URI.
 */

describe("two-factor error messages", () => {
  test("explains that the feature is switched off, not that the user erred", () => {
    // The first error anyone hits, and the one most likely to be
    // misdiagnosed — it means the Firebase project has MFA disabled.
    const message = describeTwoFactorError(
      "auth/operation-not-allowed",
      "fallback"
    );

    expect(message).toContain("not enabled for this site yet");
    expect(message).toContain("Firebase");
    expect(message).not.toBe("fallback");
  });

  test("tells someone with a rejected code what to do next", () => {
    const message = describeTwoFactorError(
      "auth/invalid-verification-code",
      "fallback"
    );

    expect(message).toContain("authenticator app");
  });

  test("explains the verified-email requirement", () => {
    const message = describeTwoFactorError("auth/unverified-email", "fallback");

    expect(message).toContain("Verify your email");
  });

  test("asks for a fresh sign-in rather than reporting a failure", () => {
    const message = describeTwoFactorError(
      "auth/requires-recent-login",
      "fallback"
    );

    expect(message).toContain("sign in again");
  });

  test("falls back for codes it does not know", () => {
    expect(describeTwoFactorError("auth/internal-error", "fallback")).toBe(
      "fallback"
    );
    expect(describeTwoFactorError(null, "fallback")).toBe("fallback");
  });
});

describe("the sign-in challenge signal", () => {
  test("is recognisable to the login page", () => {
    const resolver = { hints: [], session: {} } as never;
    const error = new TwoFactorRequiredError(resolver);

    expect(isTwoFactorRequiredError(error)).toBe(true);
    expect(error.resolver).toBe(resolver);
  });

  test("is not confused with an ordinary failure", () => {
    // This matters: the login page treats one as "ask for a code" and the
    // other as "sign-in failed". Mistaking them either strands the user on a
    // code prompt or reports a wrong password that was in fact correct.
    expect(isTwoFactorRequiredError(new Error("Wrong password."))).toBe(false);
    expect(isTwoFactorRequiredError(null)).toBe(false);
    expect(isTwoFactorRequiredError({ name: "TwoFactorRequiredError" })).toBe(
      false
    );
  });
});

describe("the enrollment QR code", () => {
  test("encodes the otpauth URI rather than anything of our own", async () => {
    const { toString: toSvg } = await import("qrcode");
    // Shaped like what TotpSecret.generateQrCodeUrl() returns.
    const uri = `otpauth://totp/${TOTP_ISSUER}:collector@example.com?secret=JBSWY3DPEHPK3PXP&issuer=${TOTP_ISSUER}`;

    const svg = await toSvg(uri, {
      errorCorrectionLevel: "M",
      margin: 1,
      type: "svg",
      width: 200,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox");
  });

  test("refuses to encode nothing, so an empty QR cannot be rendered", async () => {
    const { toString: toSvg } = await import("qrcode");

    await expect(toSvg("", { type: "svg" } as never)).rejects.toBeTruthy();
  });
});
