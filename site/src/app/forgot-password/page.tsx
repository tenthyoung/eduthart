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
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormErrorCallout,
  FormShell,
  SubmitButton,
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

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const email = form.watch("email");

  // A failure throws, and FormShell shows it above the field.
  const onSubmit = async ({ email }: ForgotPasswordFormData) => {
    setSubmitted(false);
    await sendResetLink(email);
    setSubmitted(true);
    toast.success("Password reset email sent.");
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

        <FormShell
          form={form}
          onSubmit={onSubmit}
          errorTitle="Reset link not sent"
          className="space-y-4"
        >
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

          <FormErrorCallout />
          <SubmitButton
            className="w-full"
            size="lg"
            disabled={!isHydrated}
            pendingLabel="Sending link..."
          >
            Send reset link
          </SubmitButton>
        </FormShell>
      </div>
    </AuthShell>
  );
}
