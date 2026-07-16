"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AdminCenteredState,
  AdminLoadingState,
} from "@/components/admin/admin-ui";
import { useAdminAuth } from "@/components/admin/admin-auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const { error, signIn, status } = useAdminAuth();
  const [email, setEmail] = useState("izzy@hendecalabs.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "ready") {
      router.replace("/admin");
    }
  }, [router, status]);

  if (status === "loading") {
    return <AdminLoadingState label="Preparing admin sign-in..." />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminCenteredState
      title="Sign in to the admin console"
      description="Use your Firebase account for the live EduthArt project. Admin access is verified server-side before the console is opened."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
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
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Signing in..." : "Open admin console"}
        </Button>
      </form>
    </AdminCenteredState>
  );
}
