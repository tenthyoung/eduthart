"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  USERNAME_RULE_MESSAGE,
  isAcceptableUsername,
} from "@/components/account/username-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  buildArtistPageHref,
  splitDisplayName,
  type AccountProfile,
} from "@/lib/auth/account-profile";
import { notifyUsernameUpdated } from "@/lib/auth/username-events";
import { readApiError } from "@/lib/api/api-error";
import { SubmitError } from "@/lib/forms/describe-submit-error";
import { MAX_BIO_LENGTH, MAX_LOCATION_LENGTH } from "@/lib/profile/details";

const profileCompletionSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name."),
  lastName: z.string().trim().min(1, "Enter your last name."),
  // Optional: an empty username stays unset, but one that is typed must fit.
  username: z
    .string()
    .refine(
      (value) =>
        value.trim().replace(/^@+/, "").length === 0 ||
        isAcceptableUsername(value),
      { message: USERNAME_RULE_MESSAGE }
    ),
  location: z
    .string()
    .max(
      MAX_LOCATION_LENGTH,
      `Keep your location under ${MAX_LOCATION_LENGTH} characters.`
    ),
  bio: z
    .string()
    .max(
      MAX_BIO_LENGTH,
      `Keep your biography under ${MAX_BIO_LENGTH} characters.`
    ),
});

type ProfileCompletionFormData = z.infer<typeof profileCompletionSchema>;

/**
 * Post sign-up completion step.
 *
 * Google supplies given and family names, but no username, location, or
 * biography. Rather than leave those blank forever, a federated sign-up lands
 * here with whatever the provider gave already filled in.
 */
export function ProfileCompletionPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [loading, setLoading] = useState(true);

  const form = useForm<ProfileCompletionFormData>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      location: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/welcome");
      return;
    }

    if (status !== "authenticated" || !user) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      const fallback = splitDisplayName(user.displayName);

      try {
        const response = await fetch("/api/auth/profile", {
          headers: { authorization: `Bearer ${await user.getIdToken()}` },
        });

        if (!response.ok) {
          throw new Error("Unable to load your profile.");
        }

        const payload = (await response.json()) as { profile: AccountProfile };

        if (cancelled) {
          return;
        }

        // A reload (the auth user object changing) must not overwrite what
        // the person has already typed.
        form.reset(
          {
            firstName: payload.profile.firstName ?? fallback.firstName,
            lastName: payload.profile.lastName ?? fallback.lastName,
            username: payload.profile.username ?? "",
            location: payload.profile.location ?? "",
            bio: payload.profile.bio ?? "",
          },
          { keepDirtyValues: true }
        );
      } catch {
        if (!cancelled) {
          form.reset(
            {
              firstName: fallback.firstName,
              lastName: fallback.lastName,
              username: "",
              location: "",
              bio: "",
            },
            { keepDirtyValues: true }
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [form, router, status, user]);

  const username = form.watch("username");
  const bio = form.watch("bio");

  // Throws on failure, so FormShell keeps every field and explains why at the
  // top of the form.
  const handleSubmit = async (values: ProfileCompletionFormData) => {
    if (!user) {
      throw new SubmitError(
        "You're signed out. Sign in again in a new tab, then save.",
        { title: "Your sign-in has expired" }
      );
    }

    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({
        bio: values.bio,
        firstName: values.firstName,
        lastName: values.lastName,
        location: values.location,
        // An empty username stays unset rather than failing validation.
        ...(values.username.trim() ? { username: values.username } : {}),
      }),
    });

    if (!response.ok) {
      throw await readApiError(response, "Unable to save your profile.");
    }

    const payload = (await response.json().catch(() => null)) as {
      profile?: AccountProfile;
    } | null;

    notifyUsernameUpdated(payload?.profile?.username ?? null);
    toast.success("Your profile is ready.");
    router.replace("/");
  };

  if (status === "loading" || loading) {
    return (
      <section className="min-h-screen bg-white dark:bg-background px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-center rounded-[2rem] border border-white/70 bg-white/88 dark:border-border dark:bg-card/88 p-12 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading your profile...
          </div>
        </div>
      </section>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const usernamePreview = username.trim().replace(/^@+/, "").toLowerCase();

  return (
    <section className="min-h-screen bg-white dark:bg-background px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            <Sparkles className="size-3.5" />
            Welcome
          </div>
          <h1 className="text-4xl text-foreground sm:text-5xl">
            Complete your profile
          </h1>
          <p className="text-base text-muted-foreground">
            Your sign-in provider gave us what it could. Fill in the rest so
            collectors and artists know who they are dealing with. You can
            change any of this later in account settings.
          </p>
        </div>

        <FormShell
          className="space-y-6"
          errorTitle="We could not save that"
          form={form}
          formClassName="rounded-[2rem] border border-white/70 bg-white/88 dark:border-border dark:bg-card/88 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] sm:p-8"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="welcome-first-name">First name</FormLabel>
                  <FormControl>
                    <Input
                      id="welcome-first-name"
                      autoComplete="given-name"
                      required
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
                  <FormLabel htmlFor="welcome-last-name">Last name</FormLabel>
                  <FormControl>
                    <Input
                      id="welcome-last-name"
                      autoComplete="family-name"
                      required
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
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="welcome-username">Username</FormLabel>
                <FormControl>
                  <Input
                    id="welcome-username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="@yourname"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Optional. This creates your public page at{" "}
                  {buildArtistPageHref(usernamePreview || "yourname")}.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="welcome-location">Location</FormLabel>
                <FormControl>
                  <Input
                    id="welcome-location"
                    autoComplete="address-level2"
                    maxLength={MAX_LOCATION_LENGTH}
                    placeholder="Brooklyn, New York"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="welcome-bio">Biography</FormLabel>
                <FormControl>
                  <Textarea
                    id="welcome-bio"
                    maxLength={MAX_BIO_LENGTH}
                    placeholder="Tell collectors what you make, collect, or care about."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {bio.length}/{MAX_BIO_LENGTH} characters
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormErrorCallout />
          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton
              className="flex-1"
              pendingLabel="Saving profile..."
              size="lg"
            >
              Save and continue
            </SubmitButton>
            <Button
              className="flex-1"
              onClick={() => router.replace("/")}
              size="lg"
              type="button"
              variant="ghost"
            >
              Skip for now
            </Button>
          </div>
        </FormShell>
      </div>
    </section>
  );
}
