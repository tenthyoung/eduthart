"use client";

import { AlertTriangle, BadgeCheck, Loader2, LogOut, Mail, RefreshCw, ShieldAlert, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildDisplayName, type AccountProfile } from "@/lib/auth/account-profile";

function formatAccountDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function initialsForProfile(profile: AccountProfile | null, fallbackEmail?: string | null) {
  const first = profile?.firstName?.trim()?.[0] ?? "";
  const last = profile?.lastName?.trim()?.[0] ?? "";
  const email = fallbackEmail?.trim()?.[0] ?? "";
  return `${first}${last}`.trim().toUpperCase() || email.toUpperCase() || "EA";
}

async function parseApiError(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;

  return payload?.error?.message ?? fallbackMessage;
}

export function AccountPage() {
  const router = useRouter();
  const { refreshUser, requestEmailChange, sendResetLink, sendVerificationEmail, signOut, status, user } = useAuth();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nextEmail, setNextEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [refreshingVerification, setRefreshingVerification] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [suppressAuthRedirect, setSuppressAuthRedirect] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasPasswordProvider = user?.providerIds.includes("password") ?? false;
  const isEmailVerified = user?.emailVerified ?? false;
  const displayNamePreview = buildDisplayName(firstName, lastName) || profile?.displayName || user?.displayName || "EduthArt Collector";
  const currentEmail = user?.email ?? profile?.email ?? null;

  useEffect(() => {
    if (status === "unauthenticated") {
      if (!suppressAuthRedirect && !signingOut && !deletingAccount) {
        router.replace("/login?next=/account");
      }
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
          throw new Error(await parseApiError(response, "Unable to load your account settings."));
        }

        const payload = (await response.json()) as { profile: AccountProfile };

        if (cancelled) {
          return;
        }

        setProfile(payload.profile);
        setFirstName(payload.profile.firstName ?? "");
        setLastName(payload.profile.lastName ?? "");
        setNextEmail(payload.profile.email ?? user.email ?? "");
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unable to load your account settings.";
          setError(message);
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
  }, [deletingAccount, router, signingOut, status, suppressAuthRedirect, user]);

  const providerLabel = useMemo(() => {
    const providers = profile?.authProviders.length ? profile.authProviders : user?.providerIds ?? [];

    if (providers.length === 0) {
      return "Not available";
    }

    return providers
      .map((provider) => {
        if (provider === "password") {
          return "Email and password";
        }

        if (provider === "google.com") {
          return "Google";
        }

        return provider;
      })
      .join(", ");
  }, [profile?.authProviders, user?.providerIds]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/auth/profile", {
        body: JSON.stringify({
          firstName,
          lastName,
        }),
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Unable to save your profile."));
      }

      const payload = (await response.json()) as { profile: AccountProfile };
      setProfile(payload.profile);
      setFirstName(payload.profile.firstName ?? "");
      setLastName(payload.profile.lastName ?? "");
      toast.success("Your account profile has been updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save your profile.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = currentEmail;

    if (!email) {
      return;
    }

    setResettingPassword(true);

    try {
      await sendResetLink(email);
      toast.success(`A password reset link has been sent to ${email}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send a password reset link.";
      setError(message);
      toast.error(message);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleEmailChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setChangingEmail(true);
    setError(null);

    try {
      const result = await requestEmailChange(nextEmail);

      if (result.requiresVerification) {
        toast.success(`We sent a confirmation link to ${result.email}. Verify it, then refresh your account status here.`);
      } else {
        setProfile((current) => (current ? { ...current, email: result.email } : current));
        setNextEmail(result.email);
        toast.success("Your email address has been updated.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to change your email address.";
      setError(message);
      toast.error(message);
    } finally {
      setChangingEmail(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!user?.email) {
      return;
    }

    setSendingVerification(true);

    try {
      await sendVerificationEmail();
      toast.success(`A verification email has been sent to ${user.email}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send a verification email.";
      setError(message);
      toast.error(message);
    } finally {
      setSendingVerification(false);
    }
  };

  const handleRefreshVerification = async () => {
    setRefreshingVerification(true);

    try {
      await refreshUser();
      toast.success("Email verification status refreshed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh verification status.";
      setError(message);
      toast.error(message);
    } finally {
      setRefreshingVerification(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setSuppressAuthRedirect(true);

    try {
      await signOut();
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      return;
    }

    setDeletingAccount(true);
    setSuppressAuthRedirect(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/auth/delete-account", {
        headers: {
          authorization: `Bearer ${token}`,
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Unable to delete your account."));
      }

      await signOut();
      toast.success("Your account has been deleted.");
      router.replace("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete your account.";
      setError(message);
      toast.error(message);
    } finally {
      setDeletingAccount(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <section className="min-h-screen bg-white px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center rounded-[2rem] border border-white/70 bg-white/80 p-12 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading your account settings...
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
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-primary/15 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-sm backdrop-blur-sm">
            Account Settings
          </div>
          <div className="flex flex-col gap-6 rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-primary/15 bg-primary/10 text-lg font-semibold text-primary">
                {profile?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={displayNamePreview}
                    className="h-full w-full object-cover"
                    src={profile.photoURL}
                  />
                ) : (
                  initialsForProfile(profile, user?.email)
                )}
              </div>
              <div className="space-y-1">
                <h1 className="text-4xl text-foreground sm:text-5xl">{displayNamePreview}</h1>
                <p className="text-sm text-muted-foreground">
                  Review your profile, security settings, and account status.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/80 bg-muted/45 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Account email
                </p>
                <p className="mt-2 text-sm text-foreground">{currentEmail ?? "Not available"}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-muted/45 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Sign-in method
                </p>
                <p className="mt-2 text-sm text-foreground">{providerLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Account settings error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form
            className="space-y-6 rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl"
            onSubmit={handleSave}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <UserRound className="size-5 text-primary" />
                <h2 className="text-2xl text-foreground">Profile</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Keep your collector profile current so your account details stay consistent across EduthArt.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-first-name">First name</Label>
                <Input
                  id="account-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-last-name">Last name</Label>
                <Input
                  id="account-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Display name preview
              </p>
              <p className="mt-2 text-base text-foreground">{displayNamePreview}</p>
            </div>

            <Button disabled={saving} size="lg" type="submit">
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving profile...
                </>
              ) : (
                "Save profile"
              )}
            </Button>
          </form>

          <div className="space-y-6">
            <section className="space-y-4 rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-primary" />
                <h2 className="text-2xl text-foreground">Security</h2>
              </div>
              <div className="rounded-2xl border border-border/80 bg-muted/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Email
                </p>
                <p className="mt-2 text-sm text-foreground">{currentEmail ?? "Not available"}</p>
              </div>
              <form
                className="space-y-3 rounded-2xl border border-border/80 bg-muted/45 p-4"
                onSubmit={handleEmailChange}
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Change email
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enter your new email address. We&apos;ll send a confirmation link before the change takes effect.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-next-email">New email address</Label>
                  <Input
                    id="account-next-email"
                    type="email"
                    autoComplete="email"
                    onChange={(event) => setNextEmail(event.target.value)}
                    value={nextEmail}
                  />
                </div>
                <Button
                  disabled={changingEmail || nextEmail.trim().toLowerCase() === (currentEmail ?? "").trim().toLowerCase()}
                  type="submit"
                  variant="outline"
                >
                  {changingEmail ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Updating email...
                    </>
                  ) : (
                    <>
                      <Mail />
                      Change email address
                    </>
                  )}
                </Button>
              </form>
              <div className="rounded-2xl border border-border/80 bg-muted/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Connected sign-in providers
                </p>
                <p className="mt-2 text-sm text-foreground">{providerLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-muted/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Email verification
                </p>
                <div className="mt-2 flex items-start gap-3 text-sm text-foreground">
                  {isEmailVerified ? (
                    <>
                      <BadgeCheck className="mt-0.5 size-4 text-primary" />
                      <div>
                        <p className="font-medium">Your email is verified.</p>
                        <p className="text-muted-foreground">
                          This address has already been confirmed for your EduthArt account.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="mt-0.5 size-4 text-destructive" />
                      <div>
                        <p className="font-medium">Your email still needs verification.</p>
                        <p className="text-muted-foreground">
                          Verify your inbox link, then refresh the status here.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {!isEmailVerified ? (
                  <Button
                    disabled={sendingVerification}
                    onClick={handleSendVerificationEmail}
                    type="button"
                    variant="outline"
                  >
                    {sendingVerification ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Sending verification email...
                      </>
                    ) : (
                      <>
                        <Mail />
                        Send verification email
                      </>
                    )}
                  </Button>
                ) : null}
                {!isEmailVerified ? (
<Button
                  disabled={refreshingVerification}
                  onClick={handleRefreshVerification}
                  type="button"
                  variant="outline"
                >
                  {refreshingVerification  ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Refreshing verification status...
                    </>
                  ) : (
                    <>
                      <RefreshCw />
                      Refresh verification status
                    </>
                  )}
                </Button>
                ) : null}
              </div>
              {hasPasswordProvider ? (
                <Button
                  disabled={resettingPassword}
                  onClick={handlePasswordReset}
                  type="button"
                  variant="outline"
                >
                  {resettingPassword ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    <>
                      <Mail />
                      Send password reset email
                    </>
                  )}
                </Button>
              ) : (
                <Alert>
                  <AlertTitle>Password reset is not available here</AlertTitle>
                  <AlertDescription>
                    This account signs in with Google, so there is no EduthArt password reset to send.
                  </AlertDescription>
                </Alert>
              )}

              <Button disabled={signingOut} onClick={handleSignOut} type="button" variant="outline">
                {signingOut ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <LogOut />
                    Sign out
                  </>
                )}
              </Button>
            </section>

            <section className="space-y-4 rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-primary" />
                <h2 className="text-2xl text-foreground">Account information</h2>
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-border/80 bg-muted/45 p-4 text-sm text-foreground">
                  Created: {formatAccountDate(profile?.createdAt ?? null)}
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/45 p-4 text-sm text-foreground">
                  Last profile update: {formatAccountDate(profile?.updatedAt ?? null)}
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/45 p-4 text-sm text-foreground">
                  Last sign-in sync: {formatAccountDate(profile?.lastLoginAt ?? null)}
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/45 p-4 text-sm text-foreground">
                  Legal acceptance: {formatAccountDate(profile?.legal?.acceptedAt ?? null)}
                </div>
                <div className="rounded-2xl border border-border/80 bg-muted/45 p-4 text-sm text-foreground">
                  Legal version: {profile?.legal?.acceptedVersion ?? "Not available"}
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="space-y-5 rounded-[2rem] border border-destructive/20 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="size-5" />
            <h2 className="text-2xl">Delete account</h2>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Deleting your account permanently removes your EduthArt login and the account profile data currently managed by this site.
            Type DELETE below before continuing.
          </p>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="delete-account-confirmation">Confirmation text</Label>
            <Input
              id="delete-account-confirmation"
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="Type DELETE"
              value={deleteConfirmation}
            />
          </div>
          <Button
            disabled={deleteConfirmation.trim() !== "DELETE" || deletingAccount}
            onClick={handleDeleteAccount}
            type="button"
            variant="destructive"
          >
            {deletingAccount ? (
              <>
                <Loader2 className="animate-spin" />
                Deleting account...
              </>
            ) : (
              <>
                <Trash2 />
                Delete account permanently
              </>
            )}
          </Button>
        </section>
      </div>
    </section>
  );
}
