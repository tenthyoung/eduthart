"use client";

import {
  Bell,
  BellOff,
  CheckCheck,
  Circle,
  ImageIcon,
  KeyRound,
  Loader2,
  Mail,
  Receipt,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { UsernameDialog } from "@/components/account/username-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { parseApiError } from "@/lib/api/parse-api-error";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { notifyUsernameUpdated } from "@/lib/auth/username-events";
import {
  clearNotifications,
  dismissNotification,
  fetchNotifications,
  markEveryNotificationRead,
  notifyNotificationsChanged,
  setNotificationReadState,
} from "@/lib/notifications/client";
import type {
  NotificationKind,
  UserNotification,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<NotificationKind, typeof Bell> = {
  artwork_sold: Receipt,
  choose_username: UserRound,
  email_changed: Mail,
  followed_artist_listed: ImageIcon,
  followed_artist_price_drop: Tag,
  order_confirmed: Receipt,
  password_changed: KeyRound,
  saved_artwork_sold: ImageIcon,
};

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function NotificationsPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback(
    (payload: { notifications: UserNotification[]; unreadCount: number }) => {
      setNotifications(payload.notifications);
      setUnreadCount(payload.unreadCount);
      notifyNotificationsChanged();
    },
    []
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?next=/notifications");
      return;
    }

    if (status !== "authenticated" || !user) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchNotifications(await user.getIdToken());

        if (!cancelled) {
          applyPayload(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your notifications."
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
  }, [applyPayload, router, status, user]);

  const runAction = async (
    action: (
      token: string
    ) => Promise<{ notifications: UserNotification[]; unreadCount: number }>,
    fallbackMessage: string
  ) => {
    if (!user) {
      return;
    }

    try {
      applyPayload(await action(await user.getIdToken()));
    } catch (actionError) {
      toast.error(
        actionError instanceof Error ? actionError.message : fallbackMessage
      );
    }
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
        body: JSON.stringify({ username: usernameDraft }),
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Unable to save your username.")
        );
      }

      const payload = (await response.json()) as { profile: AccountProfile };
      notifyUsernameUpdated(payload.profile.username ?? null);
      setUsernameDraft(payload.profile.username ?? "");
      setIsUsernameDialogOpen(false);
      applyPayload(await fetchNotifications(token));
      toast.success("Your username has been updated.");
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Unable to save your username.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <section className="min-h-screen bg-white dark:bg-background px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center rounded-[2rem] border border-white/70 bg-white/88 dark:border-border dark:bg-card/88 p-12 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
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
    <section className="min-h-screen bg-white dark:bg-background px-4 pb-20 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/92 dark:border-border dark:bg-card/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                <Bell className="size-3.5" />
                Notifications
              </div>
              <h1 className="text-4xl text-foreground sm:text-5xl">
                Your notification center
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Account activity, orders, and updates from the artists you
                follow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-border/80 bg-muted/45 px-4 py-3 text-sm text-foreground">
                {unreadCount} unread
              </div>
              {notifications.length > 0 ? (
                <>
                  <Button
                    disabled={unreadCount === 0}
                    onClick={() =>
                      void runAction(
                        markEveryNotificationRead,
                        "Unable to update your notifications."
                      )
                    }
                    type="button"
                    variant="outline"
                  >
                    <CheckCheck />
                    Mark all read
                  </Button>
                  <Button
                    onClick={() =>
                      void runAction(
                        clearNotifications,
                        "Unable to clear your notifications."
                      )
                    }
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 />
                    Clear all
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Notifications error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {notifications.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-border bg-white/70 dark:bg-card/70 px-6 py-16 text-center">
            <BellOff className="mx-auto size-8 text-primary/60" />
            <p className="mt-4 text-lg text-foreground">
              You are all caught up
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Follow artists and save artwork to hear about new listings, price
              drops, and sales.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {notifications.map((notification) => {
              const Icon = KIND_ICONS[notification.kind] ?? Bell;
              const isRead = notification.readAt !== null;
              const isUsernameReminder =
                notification.kind === "choose_username";

              return (
                <li
                  key={notification.id}
                  className={cn(
                    "rounded-[2rem] border bg-white/92 dark:bg-card/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]",
                    isRead
                      ? "border-white/70 dark:border-border"
                      : "border-primary/25"
                  )}
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl text-foreground">
                            {notification.title}
                          </h2>
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                              isRead
                                ? "bg-muted text-muted-foreground"
                                : "bg-amber-100 text-amber-900"
                            )}
                          >
                            {isRead ? "Read" : "Unread"}
                          </span>
                        </div>
                        <p className="max-w-2xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNotificationDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
                      {isUsernameReminder ? (
                        <Button
                          onClick={() => setIsUsernameDialogOpen(true)}
                          type="button"
                        >
                          Choose username
                        </Button>
                      ) : notification.actionHref &&
                        notification.actionLabel ? (
                        <Button asChild>
                          <Link href={notification.actionHref}>
                            {notification.actionLabel}
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        onClick={() =>
                          void runAction(
                            (token) =>
                              setNotificationReadState(
                                token,
                                notification.id,
                                !isRead
                              ),
                            "Unable to update this notification."
                          )
                        }
                        type="button"
                        variant="outline"
                      >
                        <Circle className="size-4" />
                        Mark as {isRead ? "unread" : "read"}
                      </Button>
                      <Button
                        aria-label={`Dismiss ${notification.title}`}
                        onClick={() =>
                          void runAction(
                            (token) =>
                              dismissNotification(token, notification.id),
                            "Unable to dismiss this notification."
                          )
                        }
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

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
