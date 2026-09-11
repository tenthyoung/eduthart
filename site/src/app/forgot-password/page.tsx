"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/components/auth/auth-provider";
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

const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;

export default function ForgotPasswordPage() {
  const isHydrated = useHydrated();
  const { sendResetLink } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const email = form.watch("email");

  const onSubmit = async ({ email }: ForgotPasswordFormData) => {
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
            <Link
              className="font-medium text-primary hover:underline"
              href="/login"
            >
              Go back to login
            </Link>
            .
          </p>
        </div>

        {submitted ? (
          <Alert>
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>
              If an account exists for {email}, a password reset link is on the
              way.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Reset failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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

            <Button
              className="w-full"
              size="lg"
              disabled={!isHydrated || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Sending link..."
                : "Send reset link"}
            </Button>
          </form>
        </Form>
      </div>
    </AuthShell>
  );
}
