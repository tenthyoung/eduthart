"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordInput } from "@/components/auth/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { FederatedAuthButtons } from "@/components/auth/federated-auth-buttons";
import {
  useAuth,
  type FederatedProvider,
} from "@/components/auth/auth-provider";
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
import { Input } from "@/components/ui/input";
import { useHydrated } from "@/hooks/useHydrated";

const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHydrated = useHydrated();
  const { signInWithEmail, signInWithFederatedProvider, status } = useAuth();
  const [isFederatedSubmitting, setIsFederatedSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordResetSucceeded = searchParams.get("reset") === "success";

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting || isFederatedSubmitting;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  const onSubmit = async ({ email, password }: LoginFormData) => {
    setError(null);

    try {
      await signInWithEmail(email, password);
      toast.success("Welcome back.");
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign you in.";
      setError(message);
      toast.error(message);
    }
  };

  const handleFederatedSignIn = async (provider: FederatedProvider) => {
    const providerName = provider === "apple.com" ? "Apple" : "Google";
    setIsFederatedSubmitting(true);
    setError(null);

    try {
      await signInWithFederatedProvider(provider, "login");
      toast.success(`Signed in with ${providerName}.`);
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Unable to sign in with ${providerName}.`;
      setError(message);
      toast.error(message);
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

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Sign-in failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              className="w-full"
              size="lg"
              disabled={!isHydrated || isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Log in"}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/80" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="bg-background px-3">or</span>
          </div>
        </div>

        <FederatedAuthButtons
          disabled={isSubmitting}
          onSelect={(provider) => void handleFederatedSignIn(provider)}
          verb="Continue with"
        />

        <p className="text-sm text-muted-foreground">
          First-time Google and Apple registration lives on the{" "}
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
