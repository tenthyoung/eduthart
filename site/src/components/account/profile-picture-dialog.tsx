"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ImageCropDialog } from "@/components/account/image-crop-dialog";
import { ProfileImageField } from "@/components/account/profile-image-field";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseApiError } from "@/lib/api/parse-api-error";
import { type AccountProfile } from "@/lib/auth/account-profile";
import {
  AVATAR_CROP_SPEC,
  AVATAR_DIMENSIONS_LABEL,
} from "@/lib/profile/images";
import { uploadProfileImage } from "@/lib/profile/upload";

export type ProfilePictureDialogProps = {
  onOpenChange: (open: boolean) => void;
  onProfileUpdated: (profile: AccountProfile) => void;
  open: boolean;
  photoURL: string | null;
};

/**
 * The profile picture editor as an animated modal, opened by clicking the
 * avatar on the account settings page or on the artist's own page. Owns the
 * whole flow: pick a file, crop it, upload it, and save (or remove) the
 * photoURL on the account profile.
 */
export function ProfilePictureDialog({
  onOpenChange,
  onProfileUpdated,
  open,
  photoURL,
}: ProfilePictureDialogProps) {
  const { user } = useAuth();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const patchPhotoURL = async (url: string | null, successMessage: string) => {
    if (!user) {
      throw new Error("You need to be signed in to update your picture.");
    }

    const token = await user.getIdToken();
    const response = await fetch("/api/auth/profile", {
      body: JSON.stringify({ photoURL: url }),
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      method: "PATCH",
    });

    if (!response.ok) {
      throw new Error(
        await parseApiError(response, "Unable to update your profile picture.")
      );
    }

    const payload = (await response.json()) as { profile: AccountProfile };
    onProfileUpdated(payload.profile);
    toast.success(successMessage);
  };

  const handleCroppedImage = async (file: File) => {
    if (!user) {
      return;
    }

    setBusy(true);

    try {
      const url = await uploadProfileImage({
        file,
        folder: "profile-pictures",
        uid: user.uid,
      });

      await patchPhotoURL(url, "Your profile picture has been updated.");
      setPendingFile(null);
    } catch (uploadError) {
      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload your image."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);

    try {
      await patchPhotoURL(null, "Your profile picture has been removed.");
    } catch (removeError) {
      toast.error(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove your image."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile picture</DialogTitle>
            <DialogDescription>
              Your picture appears next to your name across EduthArt. You can
              reposition and zoom before saving.
            </DialogDescription>
          </DialogHeader>
          <ProfileImageField
            aspectClassName="aspect-square"
            busy={busy}
            circular
            className="border-0 bg-transparent p-0"
            description=""
            emptyLabel="No profile picture yet."
            helpText={`Use a JPG, PNG, or WebP image up to 5 MB, ideally at least ${AVATAR_DIMENSIONS_LABEL} pixels.`}
            hideHeader
            imageUrl={photoURL}
            inputId="profile-picture-upload"
            onError={(message) => toast.error(message)}
            onRemove={() => void handleRemove()}
            onSelect={setPendingFile}
            removeLabel="Remove picture"
            title="Profile picture"
            uploadLabel="Upload profile picture"
          />
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        file={pendingFile}
        onCancel={() => setPendingFile(null)}
        onCropped={handleCroppedImage}
        spec={AVATAR_CROP_SPEC}
      />
    </>
  );
}
