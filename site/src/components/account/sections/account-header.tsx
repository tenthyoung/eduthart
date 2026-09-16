"use client";

import { Camera, MapPin } from "lucide-react";

import type { AccountProfile } from "@/lib/auth/account-profile";
import { cn } from "@/lib/utils";

function initialsForProfile(
  profile: AccountProfile | null,
  fallbackEmail?: string | null
) {
  const first = profile?.firstName?.trim()?.[0] ?? "";
  const last = profile?.lastName?.trim()?.[0] ?? "";
  const email = fallbackEmail?.trim()?.[0] ?? "";
  return `${first}${last}`.trim().toUpperCase() || email.toUpperCase() || "EA";
}

/**
 * Banner, avatar, and the two facts worth seeing before scrolling: which
 * address the account is under and how it signs in.
 */
export function AccountHeader({
  currentEmail,
  displayName,
  fallbackEmail,
  onEditPicture,
  profile,
  providerLabel,
}: {
  currentEmail: string | null;
  displayName: string;
  fallbackEmail: string | null;
  onEditPicture: () => void;
  profile: AccountProfile | null;
  providerLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full border border-primary/15 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-sm backdrop-blur-sm dark:bg-card/80">
        Account Settings
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl dark:border-border dark:bg-card/88">
        {profile?.bannerURL ? (
          <div className="relative aspect-[3/1] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${displayName} banner`}
              className="h-full w-full object-cover"
              src={profile.bannerURL}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent dark:from-card/60" />
          </div>
        ) : null}

        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-center gap-4">
            <button
              aria-label="Change profile picture"
              className={cn(
                "group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary/10 text-lg font-semibold text-primary shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                profile?.bannerURL && "-mt-16 self-start"
              )}
              onClick={onEditPicture}
              type="button"
            >
              {profile?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={displayName}
                  className="h-full w-full object-cover"
                  src={profile.photoURL}
                />
              ) : (
                initialsForProfile(profile, fallbackEmail)
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Camera className="size-6 text-white" />
              </span>
            </button>
            <div className="space-y-1">
              <h1 className="text-4xl text-foreground sm:text-5xl">
                {displayName}
              </h1>
              {profile?.location ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  {profile.location}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Account email
              </p>
              <p className="mt-2 text-sm text-foreground">
                {currentEmail ?? "Not available"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Sign-in method
              </p>
              <p className="mt-2 text-sm text-foreground">{providerLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
