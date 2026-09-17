"use client";

import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AccountPanel, BusyLabel } from "@/components/account/account-surfaces";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TotpEnrollment } from "@/lib/auth/two-factor";

const CODE_LENGTH = 6;

/**
 * Render the enrollment URI as a QR code.
 *
 * Imported on demand rather than at the top of the file: the QR library is
 * only ever needed by the handful of people who open this panel, and it has no
 * business in the bundle everyone else downloads.
 */
async function renderQrCode(uri: string) {
  const { toString: toSvg } = await import("qrcode");

  return toSvg(uri, {
    errorCorrectionLevel: "M",
    margin: 1,
    type: "svg",
    width: 200,
  });
}

/**
 * Turning two-factor authentication on and off.
 *
 * Only TOTP — a code from an authenticator app. The flow is deliberately two
 * steps: Firebase hands back a secret, and the account is not protected until
 * the person proves their app is generating matching codes. Enrolling without
 * that check would lock people out of their own accounts.
 */
export function TwoFactorSection() {
  const {
    confirmTotpEnrollment,
    disableTotp,
    startTotpEnrollment,
    twoFactor,
    user,
  } = useAuth();

  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disabling, setDisabling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enrolled = twoFactor.length > 0;
  const emailVerified = user?.emailVerified ?? false;

  const reset = () => {
    setEnrollment(null);
    setQrSvg(null);
    setCode("");
    setError(null);
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);

    try {
      const next = await startTotpEnrollment();
      setEnrollment(next);
      setQrSvg(await renderQrCode(next.uri));
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Unable to start two-factor setup."
      );
    } finally {
      setStarting(false);
    }
  };

  const handleConfirm = async () => {
    if (!enrollment) {
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      await confirmTotpEnrollment(enrollment, code);
      reset();
      toast.success("Two-factor authentication is on.");
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Unable to turn on two-factor authentication."
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleDisable = async (factorUid: string) => {
    setDisabling(factorUid);
    setError(null);

    try {
      await disableTotp(factorUid);
      toast.success("Two-factor authentication is off.");
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "Unable to turn off two-factor authentication."
      );
    } finally {
      setDisabling(null);
    }
  };

  return (
    <AccountPanel
      className="space-y-4"
      description="Ask for a code from an authenticator app as well as your password."
      icon={enrolled ? ShieldCheck : ShieldOff}
      title="Two-factor authentication"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Two-factor authentication</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {enrolled ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">
                Two-factor authentication is switched on.
              </p>
              <p className="text-muted-foreground">
                Signing in asks for a code from your authenticator app after
                your password.
              </p>
            </div>
          </div>

          {twoFactor.map((factor) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 p-4"
              key={factor.uid}
            >
              <div className="text-sm">
                <p className="font-medium">
                  {factor.displayName ?? "Authenticator app"}
                </p>
                {factor.enrolledAt ? (
                  <p className="text-muted-foreground">
                    Added {new Date(factor.enrolledAt).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
              <Button
                disabled={disabling !== null}
                onClick={() => void handleDisable(factor.uid)}
                type="button"
                variant="outline"
              >
                <BusyLabel
                  busy={disabling === factor.uid}
                  busyLabel="Turning off..."
                >
                  Turn off
                </BusyLabel>
              </Button>
            </div>
          ))}

          <p className="text-sm text-muted-foreground">
            Losing your authenticator app means losing access to this account.
            Keep a copy of your setup key somewhere safe, or make sure you can
            still reach the email address on the account.
          </p>
        </div>
      ) : null}

      {!enrolled && !enrollment ? (
        <div className="space-y-4">
          {!emailVerified ? (
            <Alert>
              <AlertTitle>Verify your email first</AlertTitle>
              <AlertDescription>
                Two-factor authentication needs a verified email address, so
                nobody can claim an address they do not own and then lock its
                owner out.
              </AlertDescription>
            </Alert>
          ) : null}

          <Button
            disabled={starting || !emailVerified}
            onClick={() => void handleStart()}
            type="button"
          >
            <BusyLabel busy={starting} busyLabel="Preparing...">
              <KeyRound />
              Set up two-factor authentication
            </BusyLabel>
          </Button>
        </div>
      ) : null}

      {enrollment ? (
        <div className="space-y-4">
          <ol className="space-y-4 text-sm">
            <li className="space-y-3">
              <p className="font-medium">
                1. Scan this with your authenticator app
              </p>
              {qrSvg ? (
                <div
                  aria-label="Two-factor setup QR code"
                  className="inline-flex rounded-2xl bg-white p-3"
                  // The QR is generated in the browser from the enrollment URI
                  // Firebase just issued — it is our own SVG, not remote markup.
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                  role="img"
                />
              ) : null}
            </li>

            <li className="space-y-2">
              <p className="font-medium">Or enter this key by hand</p>
              <code className="block rounded-xl border border-border/70 bg-muted/35 p-3 font-mono text-xs break-all">
                {enrollment.secretKey}
              </code>
              <p className="text-muted-foreground">
                Worth keeping somewhere safe. It is the only way back in if you
                lose the device.
              </p>
            </li>

            <li className="space-y-2">
              <Label className="font-medium" htmlFor="totp-code">
                2. Enter the current code from the app
              </Label>
              <Input
                autoComplete="one-time-code"
                id="totp-code"
                inputMode="numeric"
                maxLength={CODE_LENGTH}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                placeholder="123456"
                value={code}
              />
            </li>
          </ol>

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={confirming || code.length !== CODE_LENGTH}
              onClick={() => void handleConfirm()}
              type="button"
            >
              <BusyLabel busy={confirming} busyLabel="Checking code...">
                Turn on two-factor authentication
              </BusyLabel>
            </Button>
            <Button
              disabled={confirming}
              onClick={reset}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </AccountPanel>
  );
}
