"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { z } from "zod";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getFirebaseAuth } from "@/lib/firebase/client";

type ResetStatus = "checking" | "ready" | "submitting" | "success" | "invalid";

const LOGIN_ROUTE = "/login";
const DEFAULT_SUCCESS_ROUTE = "/login?reset=success";
const MIN_PASSWORD_LENGTH = 8;

const resetPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(
        MIN_PASSWORD_LENGTH,
        "Choose a password with at least 8 characters."
      ),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match yet.",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;

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

  if (
    code === "auth/expired-action-code" ||
    code === "auth/invalid-action-code"
  ) {
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
    [continueUrl]
  );

  const [status, setStatus] = useState<ResetStatus>("checking");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

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

  const onSubmit = async ({ password }: ResetPasswordFormData) => {
    if (!actionCode) {
      setError("This reset link is missing required information.");
      setStatus("invalid");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const auth = await getFirebaseAuth();
      await confirmPasswordReset(auth, actionCode, password);

      // The reset finishes signed out, so the server verifies the change
      // really happened before it notifies the account owner.
      await fetch("/api/auth/security-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountEmail, type: "password_changed" }),
      }).catch(() => undefined);

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
              Your password has been reset successfully. Continue back to
              EduthArt and sign in with your new password.
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
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="new-password">New password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        id="new-password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="confirm-password">
                      Confirm new password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        id="confirm-password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1" disabled={isBusy} size="lg">
                  {status === "submitting"
                    ? "Updating password..."
                    : "Save new password"}
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
          </Form>
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
