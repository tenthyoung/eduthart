"use client";

import { Bell, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { UsernameDialog } from "@/components/account/username-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { notifyUsernameUpdated } from "@/lib/auth/username-events";

const NOTIFICATION_STORAGE_PREFIX = "eduthart:notifications";

async function parseApiError(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;

  return payload?.error?.message ?? fallbackMessage;
}

function getNotificationStorageKey(uid: string) {
  return `${NOTIFICATION_STORAGE_PREFIX}:${uid}`;
}

function readNotificationState(uid: string) {
  if (typeof window === "undefined") {
    return { chooseUsernameRead: false };
  }

  try {
    const raw = window.localStorage.getItem(getNotificationStorageKey(uid));
    if (!raw) {
      return { chooseUsernameRead: false };
    }

    const parsed = JSON.parse(raw) as { chooseUsernameRead?: boolean };
    return {
      chooseUsernameRead: parsed.chooseUsernameRead === true,
    };
  } catch {
    return { chooseUsernameRead: false };
  }
}

function writeNotificationState(uid: string, next: { chooseUsernameRead: boolean }) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getNotificationStorageKey(uid), JSON.stringify(next));
}

function buildFallbackProfile(
  user: NonNullable<ReturnType<typeof useAuth>["user"]>,
): AccountProfile {
  return {
    authProviders: user.providerIds,
    bannerURL: null,
    createdAt: null,
    displayName: user.displayName ?? user.email ?? "EduthArt Collector",
    email: user.email ?? null,
    firstName: null,
    lastLoginAt: null,
    lastName: null,
    legal: null,
    photoURL: user.photoURL ?? null,
    shippingOriginAddress: null,
    uid: user.uid,
    updatedAt: null,
    username: null,
  };
}

export function NotificationsPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [chooseUsernameRead, setChooseUsernameRead] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/notifications");
      return;
    }

    if (status !== "authenticated" || !user) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/auth/profile", {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response, "Unable to load your notifications."));
        }

        const payload = (await response.json()) as { profile: AccountProfile };

        if (cancelled) {
          return;
        }

        setProfile(payload.profile);
        setUsernameDraft(payload.profile.username ?? "");
        const notificationState = readNotificationState(payload.profile.uid);
        setChooseUsernameRead(notificationState.chooseUsernameRead);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your notifications.");
          const fallbackProfile = buildFallbackProfile(user);
          setProfile(fallbackProfile);
          setUsernameDraft(fallbackProfile.username ?? "");
          const notificationState = readNotificationState(fallbackProfile.uid);
          setChooseUsernameRead(notificationState.chooseUsernameRead);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router, status, user]);

  const isChooseUsernameComplete = Boolean(profile?.username);
  const unreadCount = useMemo(() => (chooseUsernameRead ? 0 : 1), [chooseUsernameRead]);

  const handleNotificationStatusChange = (read: boolean) => {
    if (!profile) {
      return;
    }

    setChooseUsernameRead(read);
    writeNotificationState(profile.uid, { chooseUsernameRead: read });
  };

  const handleSaveUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: usernameDraft,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Unable to save your username."));
      }

      const payload = (await response.json()) as { profile: AccountProfile };
      setProfile(payload.profile);
      setUsernameDraft(payload.profile.username ?? "");
      notifyUsernameUpdated(payload.profile.username ?? null);
      setIsUsernameDialogOpen(false);
      handleNotificationStatusChange(true);
      toast.success("Your username has been updated.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save your username.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <section className="min-h-screen bg-white px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center rounded-[2rem] border border-white/70 bg-white/88 p-12 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading your notifications...
          </div>
        </div>
      </section>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <section className="min-h-screen bg-white px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                <Bell className="size-3.5" />
                Notifications
              </div>
              <h1 className="text-4xl text-foreground sm:text-5xl">Your notification center</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Keep track of gallery setup tasks and account reminders in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/45 px-4 py-3 text-sm text-foreground">
              {unreadCount} unread
            </div>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Notifications error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {isChooseUsernameComplete ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Bell className="size-5" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl text-foreground">Choose a username</h2>
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                      chooseUsernameRead
                        ? "bg-muted text-muted-foreground"
                        : "bg-amber-100 text-amber-900",
                    ].join(" ")}
                  >
                    {chooseUsernameRead ? "Read" : "Unread"}
                  </span>
                  {isChooseUsernameComplete ? (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-green-800">
                      Completed
                    </span>
                  ) : null}
                </div>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Choose your username so people can visit your gallery page and you can start building your public artist presence. This reminder stays in your notifications so you can always revisit it later.
                </p>
                <p className="text-sm text-foreground">
                  Current username:
                  {" "}
                  <span className="font-medium">{profile.username ? `@${profile.username}` : "Not set yet"}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Button onClick={() => setIsUsernameDialogOpen(true)} size="lg">
                {profile.username ? "Update username" : "Choose username"}
              </Button>
              <Button
                onClick={() => handleNotificationStatusChange(!chooseUsernameRead)}
                size="lg"
                variant="outline"
              >
                <Circle className="size-4" />
                Mark as {chooseUsernameRead ? "unread" : "read"}
              </Button>
            </div>
          </div>
        </div>

        <UsernameDialog
          description="Pick the tag that will be used for your public gallery page."
          onOpenChange={setIsUsernameDialogOpen}
          onSubmit={handleSaveUsername}
          open={isUsernameDialogOpen}
          onUsernameChange={setUsernameDraft}
          saving={saving}
          title="Choose your username"
          username={usernameDraft}
        />
      </div>
    </section>
  );
}
