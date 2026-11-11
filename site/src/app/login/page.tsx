"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { MultiFactorResolver } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordInput } from "@/components/auth/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormShell,
  SubmitButton,
  useDescribeSubmitError,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useHydrated } from "@/hooks/useHydrated";
import { isTwoFactorRequiredError } from "@/lib/auth/two-factor";

const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

const twoFactorFormSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the six-digit code from your app."),
});

type TwoFactorFormData = z.infer<typeof twoFactorFormSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHydrated = useHydrated();
  const { resolveTwoFactorSignIn, signInWithEmail, signInWithGoogle, status } =
    useAuth();
  const describeSubmitError = useDescribeSubmitError();
  const [isFederatedSubmitting, setIsFederatedSubmitting] = useState(false);
  // Only the Google button's failures live here: the password and code forms
  // show theirs in their own FormShell callout.
  const [federatedError, setFederatedError] = useState<string | null>(null);
  // Set when sign-in stopped for a second factor. It holds the half-finished
  // sign-in, so it has to be the object the original failure produced.
  const [twoFactorResolver, setTwoFactorResolver] =
    useState<MultiFactorResolver | null>(null);
  const passwordResetSucceeded = searchParams.get("reset") === "success";

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const twoFactorForm = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorFormSchema),
    defaultValues: { code: "" },
  });

  const isSubmitting = form.formState.isSubmitting || isFederatedSubmitting;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  const onSubmit = async ({ email, password }: LoginFormData) => {
    setFederatedError(null);

    try {
      await signInWithEmail(email, password);
    } catch (error) {
      // Not a failure: the password was right and the account wants its code.
      if (isTwoFactorRequiredError(error)) {
        setTwoFactorResolver(error.resolver);
        return;
      }

      throw error;
    }

    toast.success("Welcome back.");
    router.replace("/");
  };

  const handleTwoFactorSubmit = async ({ code }: TwoFactorFormData) => {
    if (!twoFactorResolver) {
      return;
    }

    await resolveTwoFactorSignIn(twoFactorResolver, code);
    toast.success("Welcome back.");
    router.replace("/");
  };

  const cancelTwoFactor = () => {
    setTwoFactorResolver(null);
    twoFactorForm.reset();
  };

  const handleGoogleSignIn = async () => {
    setIsFederatedSubmitting(true);
    setFederatedError(null);

    try {
      await signInWithGoogle("login");
      toast.success("Signed in with Google.");
      router.replace("/");
    } catch (error) {
      if (isTwoFactorRequiredError(error)) {
        setTwoFactorResolver(error.resolver);
        return;
      }

      setFederatedError(
        describeSubmitError(error, {
          fallbackTitle: "Google sign-in failed",
        }).message
      );
    } finally {
      setIsFederatedSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Collector Access"
      title="Log in to EduthArt"
      description="Use your email and password or continue with Google to pick up where you left off."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl text-foreground">Welcome back</h2>
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="/signup"
            >
              Create an account
            </Link>
            .
          </p>
        </div>

        {twoFactorResolver ? (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>Enter your verification code</AlertTitle>
              <AlertDescription>
                This account is protected by two-factor authentication. Open
                your authenticator app and enter the current code for EduthArt.
              </AlertDescription>
            </Alert>

            <FormShell
              form={twoFactorForm}
              onSubmit={handleTwoFactorSubmit}
              errorTitle="That code did not work"
              className="space-y-4"
            >
              <FormField
                control={twoFactorForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="login-totp">Six-digit code</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="one-time-code"
                        autoFocus
                        id="login-totp"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        {...field}
                        onChange={(event) =>
                          field.onChange(event.target.value.replace(/\D/g, ""))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SubmitButton className="w-full" pendingLabel="Checking code...">
                Verify and sign in
              </SubmitButton>
              <Button
                className="w-full"
                onClick={cancelTwoFactor}
                type="button"
                variant="outline"
              >
                Use a different account
              </Button>
            </FormShell>
          </div>
        ) : (
          <FormShell
            form={form}
            onSubmit={onSubmit}
            errorTitle="Sign-in failed"
            disabled={isFederatedSubmitting}
            className="space-y-4"
          >
            {passwordResetSucceeded ? (
              <Alert>
                <AlertTitle>Password updated</AlertTitle>
                <AlertDescription>
                  Your password has been reset. Sign in with your new password
                  below.
                </AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4">
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <Link
                      className="text-sm font-medium text-primary hover:underline"
                      href="/forgot-password"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput
                      id="password"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SubmitButton
              className="w-full"
              size="lg"
              disabled={!isHydrated}
              pendingLabel="Signing in..."
            >
              Log in
            </SubmitButton>
          </FormShell>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/80" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="bg-background px-3">or</span>
          </div>
        </div>

        {federatedError ? (
          <Alert variant="destructive">
            <AlertTitle>Google sign-in failed</AlertTitle>
            <AlertDescription>{federatedError}</AlertDescription>
          </Alert>
        ) : null}

        <GoogleAuthButton
          disabled={isSubmitting}
          onSelect={() => void handleGoogleSignIn()}
          verb="Continue with"
        />

        <p className="text-sm text-muted-foreground">
          First-time Google registration lives on the{" "}
          <Link
            className="font-medium text-primary hover:underline"
            href="/signup"
          >
            sign up page
          </Link>{" "}
          so we can capture your Terms of Service and Privacy Policy consent.
        </p>
      </div>
    </AuthShell>
  );
}

function LoginFallback() {
  return (
    <AuthShell
      eyebrow="Collector Access"
      title="Log in to EduthArt"
      description="Use your email and password or continue with Google to pick up where you left off."
    >
      <div className="space-y-2">
        <h2 className="text-2xl text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Loading sign-in…</p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
