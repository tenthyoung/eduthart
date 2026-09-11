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
import { FederatedAuthButtons } from "@/components/auth/federated-auth-buttons";
import {
  MIN_PASSWORD_LENGTH,
  useAuth,
  type FederatedProvider,
} from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const PROFILE_COMPLETION_PATH = "/welcome";

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
  legalAccepted: z.boolean(),
});

type SignupFormData = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const isHydrated = useHydrated();
  const { signInWithFederatedProvider, signUpWithEmail, status } = useAuth();
  const [isFederatedSubmitting, setIsFederatedSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (status === "authenticated" && !isSubmitting) {
      router.replace("/");
    }
  }, [isSubmitting, router, status]);

  const requireLegalAcceptance = () => {
    if (form.getValues("legalAccepted")) {
      return true;
    }

    const message =
      "Please agree to the Terms of Service and Privacy Policy before creating an account.";
    setError(message);
    toast.error(message);
    return false;
  };

  const onSubmit = async ({
    email,
    firstName,
    lastName,
    password,
  }: SignupFormData) => {
    if (!requireLegalAcceptance()) {
      return;
    }

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
    }
  };

  const handleFederatedSignUp = async (provider: FederatedProvider) => {
    if (!requireLegalAcceptance()) {
      return;
    }

    const providerName = provider === "apple.com" ? "Apple" : "Google";
    setIsFederatedSubmitting(true);
    setError(null);

    try {
      await signInWithFederatedProvider(provider, "signup");
      toast.success(`Your ${providerName} account is connected.`);
      // Neither provider reliably supplies everything the profile needs, so a
      // federated sign-up always lands on the completion step.
      router.replace(PROFILE_COMPLETION_PATH);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Unable to continue with ${providerName}.`;
      setError(message);
      toast.error(message);
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

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        id="legal"
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
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
                  </FormItem>
                )}
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Sign-up failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              className="w-full"
              size="lg"
              disabled={!isHydrated || isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
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
          onSelect={(provider) => void handleFederatedSignUp(provider)}
          verb="Sign up with"
        />

        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-white to-secondary/45 p-5">
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
