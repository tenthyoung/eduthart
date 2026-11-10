"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { COLLECTOR_LIST_KEY } from "@/constants/newsletter.constants";

type NewsletterFormData = {
  email: string;
  subscribe: boolean;
};

/**
 * The newsletter signup used in the footer: an email
 * field, an explicit opt-in checkbox, and a thank-you in place of the form once
 * it works. The email stays in the field if the request fails, so a dropped
 * connection never makes someone retype it.
 *
 * Field ids come from `useId`, so the form can appear more than once on a page
 * (the footer sits under every page that also has its own signup box).
 *
 * A signed-in visitor's request carries their token, so signing up with the
 * account's own address also switches on the newsletter in account settings.
 */
export function NewsletterSignup() {
  const { user } = useAuth();
  const id = useId();
  const emailId = `${id}-email`;
  const consentId = `${id}-consent`;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    setError,
    clearErrors,
  } = useForm<NewsletterFormData>({
    defaultValues: { email: "", subscribe: false },
  });

  const onSubmit = async (data: NewsletterFormData) => {
    setFailure(null);

    if (!data.subscribe) {
      setError("subscribe", {
        message: "Please confirm that you would like to join our mailing list.",
      });
      return;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (user) {
        headers.authorization = `Bearer ${await user.getIdToken()}`;
      }

      const response = await fetch("/api/zoho-campaigns", {
        method: "POST",
        headers,
        body: JSON.stringify({
          emails: [data.email],
          listKey: COLLECTOR_LIST_KEY,
        }),
      });

      if (!response.ok) {
        const message =
          "We could not save your subscription. Please try again.";
        setFailure(message);
        toast.error(message);
        return;
      }

      setIsSubscribed(true);
      toast.success("You have been added to the collector mailing list.");
    } catch {
      const message = "An error occurred. Please try again later.";
      setFailure(message);
      toast.error(message);
    }
  };

  if (isSubscribed) {
    return (
      <div className="rounded-xl border border-border bg-muted p-5 text-left">
        <p className="font-semibold text-foreground">
          Thank you for subscribing.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;ll receive new work and collector notes.
        </p>
      </div>
    );
  }

  const message = errors.subscribe?.message ?? failure;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 text-left"
      noValidate
    >
      <label htmlFor={emailId} className="sr-only">
        Email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          id={emailId}
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Please enter a valid email address",
            },
          })}
          aria-invalid={errors.email ? true : undefined}
          className={`h-11 min-w-0 flex-1 rounded-xl border bg-background px-4 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring ${
            errors.email ? "border-red-500" : "border-input"
          }`}
          placeholder="you@example.com"
        />
        <Button type="submit" disabled={isSubmitting} className="h-11 px-5">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            "Subscribe"
          )}
        </Button>
      </div>
      {errors.email && (
        <p className="text-xs text-red-600">{errors.email.message}</p>
      )}

      <div className="flex items-start gap-3">
        <Controller
          name="subscribe"
          control={control}
          render={({ field }) => (
            <Checkbox
              id={consentId}
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                clearErrors("subscribe");
              }}
              className="mt-0.5"
            />
          )}
        />
        <label
          htmlFor={consentId}
          className="cursor-pointer text-sm text-muted-foreground"
        >
          Yes, send me new work and collector emails.
        </label>
      </div>

      {message && (
        <Alert variant="destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <AlertDescription>{message}</AlertDescription>
          </div>
        </Alert>
      )}
    </form>
  );
}
