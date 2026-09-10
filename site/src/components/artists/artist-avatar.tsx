"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProfilePictureDialog } from "@/components/account/profile-picture-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

const AVATAR_CLASSES =
  "flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary/10 text-2xl font-semibold text-primary shadow-lg";

export type ArtistAvatarProps = {
  artistUid: string;
  className?: string;
  displayName: string;
  photoURL: string | null;
};

/**
 * The artist page avatar. Visitors see a plain picture; the artist viewing
 * their own page can click it to open the profile picture editor.
 */
export function ArtistAvatar({
  artistUid,
  className,
  displayName,
  photoURL,
}: ArtistAvatarProps) {
  const router = useRouter();
  const { status, user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPhotoURL, setCurrentPhotoURL] = useState(photoURL);

  useEffect(() => {
    setCurrentPhotoURL(photoURL);
  }, [photoURL]);

  const picture = currentPhotoURL ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={displayName}
      className="h-full w-full object-cover"
      src={currentPhotoURL}
    />
  ) : (
    (displayName.trim()[0] ?? "@").toUpperCase()
  );

  if (status !== "authenticated" || user?.uid !== artistUid) {
    return <div className={cn(AVATAR_CLASSES, className)}>{picture}</div>;
  }

  return (
    <>
      <button
        aria-label="Change your profile picture"
        className={cn(
          AVATAR_CLASSES,
          "group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          className
        )}
        onClick={() => setIsDialogOpen(true)}
        type="button"
      >
        {picture}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="size-6 text-white" />
        </span>
      </button>

      <ProfilePictureDialog
        onOpenChange={setIsDialogOpen}
        onProfileUpdated={(profile) => {
          setCurrentPhotoURL(profile.photoURL);
          router.refresh();
        }}
        open={isDialogOpen}
        photoURL={currentPhotoURL}
      />
    </>
  );
}
