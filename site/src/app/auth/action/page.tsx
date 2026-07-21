"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getFirebaseAuth } from "@/lib/firebase/client";

type ResetStatus =
  | "checking"
  | "ready"
  | "submitting"
  | "success"
  | "invalid";

const LOGIN_ROUTE = "/login";
const DEFAULT_SUCCESS_ROUTE = "/login?reset=success";
const MIN_PASSWORD_LENGTH = 8;

function normalizeContinueUrl(rawValue: string | null) {
  if (!rawValue || typeof window === "undefined") {
    return DEFAULT_SUCCESS_ROUTE;
  }

  try {
    const url = new URL(rawValue, window.location.origin);

    if (url.origin !== window.location.origin) {
      return DEFAULT_SUCCESS_ROUTE;
    }

    return `${url.pathname}${url.search}${url.hash}` || DEFAULT_SUCCESS_ROUTE;
  } catch {
    return DEFAULT_SUCCESS_ROUTE;
  }
}

function formatResetError(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : null;

  if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
    return "This reset link is invalid or has expired. Request a fresh password reset email and try again.";
  }

  if (code === "auth/weak-password") {
    return "Choose a stronger password with at least 8 characters.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not reset your password. Please try again.";
}

function AuthActionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const actionCode = searchParams.get("oobCode");
  const continueUrl = searchParams.get("continueUrl");
  const nextHref = useMemo(
    () => normalizeContinueUrl(continueUrl),
    [continueUrl],
  );

  const [status, setStatus] = useState<ResetStatus>("checking");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (mode !== "resetPassword" || !actionCode) {
      setStatus("invalid");
      setError("This email action is not supported by the custom reset page.");
      return () => {
        cancelled = true;
      };
    }

    setStatus("checking");
    setError(null);

    getFirebaseAuth()
      .then((auth) => verifyPasswordResetCode(auth, actionCode))
      .then((email) => {
        if (cancelled) {
          return;
        }

        setAccountEmail(email);
        setStatus("ready");
      })
      .catch((resetError) => {
        if (cancelled) {
          return;
        }

        setError(formatResetError(resetError));
        setStatus("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [actionCode, mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!actionCode) {
      setError("This reset link is missing required information.");
      setStatus("invalid");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      const nextError = "Choose a password with at least 8 characters.";
      setError(nextError);
      toast.error(nextError);
      return;
    }

    if (password !== confirmPassword) {
      const nextError = "Passwords do not match yet.";
      setError(nextError);
      toast.error(nextError);
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const auth = await getFirebaseAuth();
      await confirmPasswordReset(auth, actionCode, password);
      setStatus("success");
      toast.success("Password updated. You can sign in now.");
    } catch (resetError) {
      const message = formatResetError(resetError);
      setError(message);
      setStatus("ready");
      toast.error(message);
    }
  };

  const isBusy = status === "checking" || status === "submitting";

  return (
    <AuthShell
      eyebrow="Account Recovery"
      title="Reset your password with EduthArt"
      description="This custom password reset page replaces the default Firebase form so the recovery flow feels like the rest of the site."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl text-foreground">Choose a new password</h2>
          <p className="text-sm text-muted-foreground">
            {accountEmail
              ? `Resetting the password for ${accountEmail}.`
              : "We’re verifying your secure reset link before showing the form."}
          </p>
        </div>

        {status === "checking" ? (
          <Alert>
            <AlertTitle>Checking link</AlertTitle>
            <AlertDescription>
              Verifying your password reset request through Firebase Auth.
            </AlertDescription>
          </Alert>
        ) : null}

        {status === "success" ? (
          <Alert>
            <AlertTitle>Password updated</AlertTitle>
            <AlertDescription>
              Your password has been reset successfully. Continue back to EduthArt and sign in with your new password.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Reset link issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {status === "ready" || status === "submitting" ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                onChange={(event) => setPassword(event.target.value)}
                required
                value={password}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                value={confirmPassword}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" disabled={isBusy} size="lg">
                {status === "submitting" ? "Updating password..." : "Save new password"}
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push(LOGIN_ROUTE)}
                size="lg"
                type="button"
                variant="outline"
              >
                Back to login
              </Button>
            </div>
          </form>
        ) : null}

        {status === "success" ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1" size="lg">
              <Link href={nextHref}>Continue to EduthArt</Link>
            </Button>
            <Button asChild className="flex-1" size="lg" variant="outline">
              <Link href={LOGIN_ROUTE}>Go to login</Link>
            </Button>
          </div>
        ) : null}

        {status === "invalid" ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1" size="lg">
              <Link href="/forgot-password">Request a new reset email</Link>
            </Button>
            <Button asChild className="flex-1" size="lg" variant="outline">
              <Link href={LOGIN_ROUTE}>Back to login</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}

function AuthActionFallback() {
  return (
    <AuthShell
      eyebrow="Account Recovery"
      title="Reset your password with EduthArt"
      description="This custom password reset page replaces the default Firebase form so the recovery flow feels like the rest of the site."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl text-foreground">Choose a new password</h2>
          <p className="text-sm text-muted-foreground">
            We’re verifying your secure reset link before showing the form.
          </p>
        </div>

        <Alert>
          <AlertTitle>Checking link</AlertTitle>
          <AlertDescription>
            Verifying your password reset request through Firebase Auth.
          </AlertDescription>
        </Alert>
      </div>
    </AuthShell>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={<AuthActionFallback />}>
      <AuthActionContent />
    </Suspense>
  );
}
