"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildArtistPageHref,
  splitDisplayName,
  type AccountProfile,
} from "@/lib/auth/account-profile";
import { notifyUsernameUpdated } from "@/lib/auth/username-events";
import { MAX_BIO_LENGTH, MAX_LOCATION_LENGTH } from "@/lib/profile/details";

/**
 * Post sign-up completion step.
 *
 * Google supplies given and family names, Apple supplies a display name only on
 * the first authorization, and neither supplies a username, location, or
 * biography. Rather than leave those blank forever, a federated sign-up lands
 * here with whatever the provider gave already filled in.
 */
export function ProfileCompletionPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        setFirstName(payload.profile.firstName ?? fallback.firstName);
        setLastName(payload.profile.lastName ?? fallback.lastName);
        setUsername(payload.profile.username ?? "");
        setLocation(payload.profile.location ?? "");
        setBio(payload.profile.bio ?? "");
      } catch {
        if (!cancelled) {
          setFirstName(fallback.firstName);
          setLastName(fallback.lastName);
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
  }, [router, status, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          bio,
          firstName,
          lastName,
          location,
          // An empty username stays unset rather than failing validation.
          ...(username.trim() ? { username } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string }; profile?: AccountProfile }
        | null;

      if (!response.ok || !payload?.profile) {
        throw new Error(payload?.error?.message ?? "Unable to save your profile.");
      }

      notifyUsernameUpdated(payload.profile.username ?? null);
      toast.success("Your profile is ready.");
      router.replace("/");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save your profile.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <section className="min-h-screen bg-white px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-center rounded-[2rem] border border-white/70 bg-white/88 p-12 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
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
    <section className="min-h-screen bg-white px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            <Sparkles className="size-3.5" />
            Welcome
          </div>
          <h1 className="text-4xl text-foreground sm:text-5xl">Complete your profile</h1>
          <p className="text-base text-muted-foreground">
            Your sign-in provider gave us what it could. Fill in the rest so collectors and
            artists know who they are dealing with. You can change any of this later in account
            settings.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not save that</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form
          className="space-y-6 rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] sm:p-8"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="welcome-first-name">First name</Label>
              <Input
                id="welcome-first-name"
                autoComplete="given-name"
                onChange={(event) => setFirstName(event.target.value)}
                required
                value={firstName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome-last-name">Last name</Label>
              <Input
                id="welcome-last-name"
                autoComplete="family-name"
                onChange={(event) => setLastName(event.target.value)}
                required
                value={lastName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-username">Username</Label>
            <Input
              id="welcome-username"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="@yourname"
              value={username}
            />
            <p className="text-xs text-muted-foreground">
              Optional. This creates your public page at{" "}
              {buildArtistPageHref(usernamePreview || "yourname")}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-location">Location</Label>
            <Input
              id="welcome-location"
              autoComplete="address-level2"
              maxLength={MAX_LOCATION_LENGTH}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Brooklyn, New York"
              value={location}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-bio">Biography</Label>
            <Textarea
              id="welcome-bio"
              maxLength={MAX_BIO_LENGTH}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell collectors what you make, collect, or care about."
              rows={4}
              value={bio}
            />
            <p className="text-xs text-muted-foreground">
              {bio.length}/{MAX_BIO_LENGTH} characters
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" disabled={saving} size="lg" type="submit">
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving profile...
                </>
              ) : (
                "Save and continue"
              )}
            </Button>
            <Button
              className="flex-1"
              disabled={saving}
              onClick={() => router.replace("/")}
              size="lg"
              type="button"
              variant="ghost"
            >
              Skip for now
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
