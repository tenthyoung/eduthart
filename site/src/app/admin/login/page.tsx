"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  AdminCenteredState,
  AdminLoadingState,
} from "@/components/admin/admin-ui";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
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

const adminLoginFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginFormData = z.infer<typeof adminLoginFormSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { error, signIn, status } = useAdminAuth();

  const form = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginFormSchema),
    defaultValues: {
      email: "izzy@hendecalabs.com",
      password: "",
    },
  });

  useEffect(() => {
    if (status === "ready") {
      router.replace("/admin");
    }
  }, [router, status]);

  // `signIn` puts the provider back into "loading" while it checks the
  // account. Only show the loading screen for the first session check: swapping
  // the form out mid-submit would throw away its error callout.
  const { isSubmitted, isSubmitting } = form.formState;
  if (status === "loading" && !isSubmitting && !isSubmitted) {
    return <AdminLoadingState label="Preparing admin sign-in..." />;
  }

  // A failed sign-in throws, and FormShell shows it above the fields.
  const onSubmit = async ({ email, password }: AdminLoginFormData) => {
    await signIn(email, password);
    router.replace("/admin");
  };

  return (
    <AdminCenteredState
      title="Sign in to the admin console"
      description="Use your Firebase account for the live EduthArt project. Admin access is verified server-side before the console is opened."
    >
      <FormShell
        form={form}
        onSubmit={onSubmit}
        errorTitle="Sign-in failed"
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium" htmlFor="email">
                Email
              </FormLabel>
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
              <FormLabel className="text-sm font-medium" htmlFor="password">
                Password
              </FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* A session that failed to restore on load. Once the form has been
              submitted, its own callout reports the attempt instead. */}
        {error && !isSubmitted ? (
          <Alert variant="destructive">
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <FormErrorCallout />
        <SubmitButton className="w-full" size="lg" pendingLabel="Signing in...">
          Open admin console
        </SubmitButton>
      </FormShell>
    </AdminCenteredState>
  );
}
