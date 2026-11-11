"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { Checkbox } from "@/components/ui/checkbox";
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
import { COLLECTOR_LIST_KEY } from "@/constants/newsletter.constants";
import { requestJson } from "@/lib/api/api-error";

const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  subscribe: z.boolean().refine((value) => value, {
    message: "Please confirm that you would like to join our mailing list.",
  }),
});

type NewsletterFormData = z.infer<typeof newsletterSchema>;

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

  const form = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "", subscribe: false },
  });

  const onSubmit = async (data: NewsletterFormData) => {
    await requestJson("/api/zoho-campaigns", {
      method: "POST",
      headers: user
        ? { authorization: `Bearer ${await user.getIdToken()}` }
        : undefined,
      body: { emails: [data.email], listKey: COLLECTOR_LIST_KEY },
    });

    setIsSubscribed(true);
    toast.success("You have been added to the collector mailing list.");
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

  return (
    <FormShell
      form={form}
      onSubmit={onSubmit}
      errorTitle="You weren't subscribed"
      formClassName="text-left"
      className="space-y-3"
    >
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem className="gap-2">
            <FormLabel className="sr-only" htmlFor={emailId}>
              Email
            </FormLabel>
            <FormErrorCallout />
            <div className="flex flex-col gap-2 sm:flex-row">
              <FormControl>
                <Input
                  type="email"
                  id={emailId}
                  autoComplete="email"
                  className="h-11 min-w-0 flex-1 rounded-xl px-4"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <SubmitButton className="h-11 px-5" pendingLabel="Joining...">
                Subscribe
              </SubmitButton>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="subscribe"
        render={({ field }) => (
          <FormItem className="gap-2">
            <div className="flex items-start gap-3">
              <FormControl>
                <Checkbox
                  id={consentId}
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  className="mt-0.5"
                />
              </FormControl>
              <FormLabel
                htmlFor={consentId}
                className="cursor-pointer font-normal text-muted-foreground"
              >
                Yes, send me new work and collector emails.
              </FormLabel>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormShell>
  );
}
