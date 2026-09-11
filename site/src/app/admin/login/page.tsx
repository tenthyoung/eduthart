"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  AdminCenteredState,
  AdminLoadingState,
} from "@/components/admin/admin-ui";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
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

  if (status === "loading") {
    return <AdminLoadingState label="Preparing admin sign-in..." />;
  }

  const onSubmit = async ({ email, password }: AdminLoginFormData) => {
    try {
      await signIn(email, password);
      router.replace("/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed.");
    }
  };

  return (
    <AdminCenteredState
      title="Sign in to the admin console"
      description="Use your Firebase account for the live EduthArt project. Admin access is verified server-side before the console is opened."
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            className="w-full"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Signing in..."
              : "Open admin console"}
          </Button>
        </form>
      </Form>
    </AdminCenteredState>
  );
}
