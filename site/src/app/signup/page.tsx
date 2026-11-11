"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PasswordInput } from "@/components/auth/password-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { MIN_PASSWORD_LENGTH, useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
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

const PROFILE_COMPLETION_PATH = "/welcome";

const LEGAL_REQUIRED =
  "Please agree to the Terms of Service and Privacy Policy before creating an account.";

const signupFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(
      MIN_PASSWORD_LENGTH,
      `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`
    ),
  legalAccepted: z.boolean().refine((value) => value, {
    message: LEGAL_REQUIRED,
  }),
});

type SignupFormData = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const isHydrated = useHydrated();
  const { signInWithGoogle, signUpWithEmail, status } = useAuth();
  const describeSubmitError = useDescribeSubmitError();
  const [isFederatedSubmitting, setIsFederatedSubmitting] = useState(false);
  // Only the Google button's failures live here: the email form shows its own
  // in the FormShell callout.
  const [federatedError, setFederatedError] = useState<string | null>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      legalAccepted: false,
    },
  });

  const isSubmitting = form.formState.isSubmitting || isFederatedSubmitting;

  // Firebase signs the person in before the profile is saved. If that later
  // step fails, stay here so the callout is read, rather than redirecting
  // past it to a half-made account.
  const [emailSignupFailed, setEmailSignupFailed] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !isSubmitting && !emailSignupFailed) {
      router.replace("/");
    }
  }, [emailSignupFailed, isSubmitting, router, status]);

  // Google sign-up skips the form's own validation, so check the one field it
  // depends on here and put the message beside the checkbox.
  const requireLegalAcceptance = () => {
    if (form.getValues("legalAccepted")) {
      return true;
    }

    form.setError(
      "legalAccepted",
      { message: LEGAL_REQUIRED, type: "validate" },
      { shouldFocus: true }
    );
    return false;
  };

  const onSubmit = async ({
    email,
    firstName,
    lastName,
    password,
  }: SignupFormData) => {
    setFederatedError(null);
    setEmailSignupFailed(false);

    try {
      await signUpWithEmail({
        email,
        firstName,
        lastName,
        password,
      });
    } catch (error) {
      setEmailSignupFailed(true);
      throw error;
    }

    toast.success("Your account is ready.");
    router.replace("/");
  };

  const handleGoogleSignUp = async () => {
    if (!requireLegalAcceptance()) {
      return;
    }

    setIsFederatedSubmitting(true);
    setFederatedError(null);

    try {
      await signInWithGoogle("signup");
      toast.success("Your Google account is connected.");
      // Google does not reliably supply everything the profile needs, so a
      // federated sign-up always lands on the completion step.
      router.replace(PROFILE_COMPLETION_PATH);
    } catch (error) {
      setFederatedError(
        describeSubmitError(error, { fallbackTitle: "Google sign-up failed" })
          .message
      );
    } finally {
      setIsFederatedSubmitting(false);
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

        <FormShell
          form={form}
          onSubmit={onSubmit}
          errorTitle="Sign-up failed"
          disabled={isFederatedSubmitting}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="first-name">First name</FormLabel>
                  <FormControl>
                    <Input
                      id="first-name"
                      autoComplete="given-name"
                      placeholder="First name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="last-name">Last name</FormLabel>
                  <FormControl>
                    <Input
                      id="last-name"
                      autoComplete="family-name"
                      placeholder="Last name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                <FormLabel htmlFor="password">Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Use at least 8 characters for your password.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-2xl border border-border/80 bg-muted/45 p-4">
            <FormField
              control={form.control}
              name="legalAccepted"
              render={({ field }) => (
                <FormItem className="gap-2">
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        id="legal"
                        onCheckedChange={(checked) => {
                          field.onChange(checked === true);
                          // The Google button sets this error without a
                          // submit, so nothing would re-validate it otherwise.
                          if (checked === true) {
                            form.clearErrors("legalAccepted");
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel
                      className="block leading-6 font-normal"
                      htmlFor="legal"
                    >
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
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <SubmitButton
            className="w-full"
            size="lg"
            disabled={!isHydrated}
            pendingLabel="Creating account..."
          >
            Create account
          </SubmitButton>
        </FormShell>

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
            <AlertTitle>Google sign-up failed</AlertTitle>
            <AlertDescription>{federatedError}</AlertDescription>
          </Alert>
        ) : null}

        <GoogleAuthButton
          disabled={isSubmitting}
          onSelect={() => void handleGoogleSignUp()}
          verb="Sign up with"
        />

        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-white dark:via-card to-secondary/45 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">
            For Artists
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Are you an artist interested in exhibiting your work?{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="/for-artists"
            >
              Apply here
            </Link>
            .
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
