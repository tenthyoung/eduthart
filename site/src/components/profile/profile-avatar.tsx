"use client";

import { UserRound } from "lucide-react";

import { initialsFor, paletteFor } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-9 text-xs",
  md: "size-20 text-lg",
  lg: "size-24 text-2xl",
} as const;

export type ProfileAvatarSize = keyof typeof SIZES;

export type ProfileAvatarProps = {
  className?: string;
  email?: string | null;
  name?: string | null;
  photoURL?: string | null;
  /** Keeps the colour stable when the display name changes. */
  seed?: string | null;
  size?: ProfileAvatarSize;
};

/**
 * The one place a profile picture is drawn.
 *
 * With a photo it is a plain cover image; without one it is the account's
 * initials on a colour derived from the account itself, which beats a generic
 * outline glyph and gives every signed-in person something recognisable.
 */
export function ProfileAvatar({
  className,
  email,
  name,
  photoURL,
  seed,
  size = "sm",
}: ProfileAvatarProps) {
  const initials = initialsFor(name, email);
  const palette = paletteFor(seed || name || email || "");

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold tracking-wide text-white select-none",
        SIZES[size],
        photoURL ? "bg-muted" : palette,
        className
      )}
    >
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="h-full w-full object-cover" src={photoURL} />
      ) : initials ? (
        initials
      ) : (
        <UserRound className="size-1/2" strokeWidth={2.25} />
      )}
    </span>
  );
}
