"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { sendResetLink } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await sendResetLink(email);
      setSubmitted(true);
      toast.success("Password reset email sent.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send the password reset email.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password Reset"
      title="Reset your password"
      description="Enter the email address tied to your account and we’ll send a password reset link through Firebase Auth."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl text-foreground">Forgot your password?</h2>
          <p className="text-sm text-muted-foreground">
            Remembered it after all?{" "}
            <Link className="font-medium text-primary hover:underline" href="/login">
              Go back to login
            </Link>
            .
          </p>
        </div>

        {submitted ? (
          <Alert>
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>
              If an account exists for {email}, a password reset link is on the way.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Reset failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
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

          <Button className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Sending link..." : "Send reset link"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
