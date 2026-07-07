"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleIcon } from "@/components/auth/google-icon";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const { signInWithGoogle, signUpWithEmail, status } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  const requireLegalAcceptance = () => {
    if (legalAccepted) {
      return true;
    }

    const message =
      "Please agree to the Terms of Service and Privacy Policy before creating an account.";
    setError(message);
    toast.error(message);
    return false;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!requireLegalAcceptance()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signUpWithEmail({
        email,
        firstName,
        lastName,
        password,
      });
      toast.success("Your account is ready.");
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create your account.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!requireLegalAcceptance()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signInWithGoogle("signup");
      toast.success("Your Google account is connected.");
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to continue with Google.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="New Account"
      title="Create your EduthArt login"
      description="Set up a collector account with email and password or use Google, then agree to the legal terms before you continue."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl text-foreground">Sign up</h2>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="/login"
            >
              Log in
            </Link>
            .
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Last name"
                required
              />
            </div>
          </div>

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
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use at least 8 characters for your password.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-muted/45 p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={legalAccepted}
                id="legal"
                onCheckedChange={(checked) =>
                  setLegalAccepted(checked === true)
                }
              />
              <Label className="block leading-6 font-normal" htmlFor="legal">
                I agree to the{" "}
                <Link
                  className="font-medium text-primary hover:underline"
                  href="/legal/terms-of-service"
                  rel="noreferrer"
                  target="_blank"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  className="font-medium text-primary hover:underline"
                  href="/legal/privacy-policy"
                  rel="noreferrer"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
                .
              </Label>
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Sign-up failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/80" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span className="bg-white px-3">or</span>
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
          Sign up with Google
        </Button>
      </div>
    </AuthShell>
  );
}
