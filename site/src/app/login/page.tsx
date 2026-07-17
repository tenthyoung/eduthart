"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleIcon } from "@/components/auth/google-icon";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithEmail, signInWithGoogle, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordResetSucceeded = searchParams.get("reset") === "success";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await signInWithGoogle("login");
      toast.success("Signed in with Google.");
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in with Google.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
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
            <Link className="font-medium text-primary hover:underline" href="/signup">
              Create an account
            </Link>
            .
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {passwordResetSucceeded ? (
            <Alert>
              <AlertTitle>Password updated</AlertTitle>
              <AlertDescription>
                Your password has been reset. Sign in with your new password below.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="password">Password</Label>
              <Link
                className="text-sm font-medium text-primary hover:underline"
                href="/forgot-password"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Log in"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/80" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="bg-background px-3">or</span>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={isSubmitting}
          onClick={handleGoogle}
          size="lg"
          type="button"
          variant="outline"
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <p className="text-sm text-muted-foreground">
          First-time Google registration lives on the{" "}
          <Link className="font-medium text-primary hover:underline" href="/signup">
            sign up page
          </Link>{" "}
          so we can capture your Terms of Service and Privacy Policy consent.
        </p>
      </div>
    </AuthShell>
  );
}
