"use client";

import { Camera, UserRound } from "lucide-react";
import Link from "next/link";

import {
  AccountPanel,
  ActionCard,
  DetailList,
  DetailRow,
} from "@/components/account/account-surfaces";
import {
  EditProfileDialog,
  type ProfileFormData,
  type useProfileForm,
} from "@/components/account/edit-profile-dialog";
import { ProfileImageField } from "@/components/account/profile-image-field";
import { UsernameDialog } from "@/components/account/username-dialog";
import { Button } from "@/components/ui/button";
import { buildArtistPageHref } from "@/lib/auth/account-profile";
import type { AccountProfile } from "@/lib/auth/account-profile";
import { BANNER_DIMENSIONS_LABEL } from "@/lib/profile/images";

export function ProfileSection({
  displayNamePreview,
  form,
  isProfileDialogOpen,
  isUsernameDialogOpen,
  onEditPicture,
  onImageError,
  onProfileDialogChange,
  onRemoveBanner,
  onSaveProfile,
  onSaveUsername,
  onSelectBanner,
  onUsernameDialogChange,
  profile,
  uploadingBanner,
}: {
  displayNamePreview: string;
  form: ReturnType<typeof useProfileForm>;
  isProfileDialogOpen: boolean;
  isUsernameDialogOpen: boolean;
  onEditPicture: () => void;
  onImageError: (message: string) => void;
  onProfileDialogChange: (open: boolean) => void;
  onRemoveBanner: () => void;
  onSaveProfile: (values: ProfileFormData) => Promise<void>;
  onSaveUsername: (username: string) => Promise<void>;
  onSelectBanner: (file: File) => void;
  onUsernameDialogChange: (open: boolean) => void;
  profile: AccountProfile | null;
  uploadingBanner: boolean;
}) {
  const { bio, firstName, lastName, location } = form.watch();

  return (
    <AccountPanel
      action={
        <EditProfileDialog
          displayNamePreview={displayNamePreview}
          form={form}
          onOpenChange={onProfileDialogChange}
          onSubmit={onSaveProfile}
          open={isProfileDialogOpen}
        />
      }
      className="space-y-5"
      description="Keep your collector profile current so your account details stay consistent across EduthArt."
      icon={UserRound}
      title="Profile"
    >
      <DetailList>
        <DetailRow label="First name" value={firstName || "Not set"} />
        <DetailRow label="Last name" value={lastName || "Not set"} />
        <DetailRow label="Location" value={location || "Not set"} />
        <DetailRow label="Biography" value={bio || "Not set"} />
      </DetailList>

      <div className="grid gap-4 sm:grid-cols-2">
        <ActionCard
          description={
            profile?.username ? null : (
              <>Choose a username to create your personal art page link.</>
            )
          }
          title="Username tag"
        >
          {profile?.username ? (
            <div className="space-y-1">
              <p className="text-base text-foreground">@{profile.username}</p>
              <Link
                className="inline-block text-sm text-primary underline decoration-primary/30 underline-offset-4"
                href={buildArtistPageHref(profile.username)}
              >
                View your personal art page
              </Link>
              <div className="pt-2">
                <Button
                  onClick={() => onUsernameDialogChange(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Change username
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => onUsernameDialogChange(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              Choose username
            </Button>
          )}
        </ActionCard>

        <ActionCard
          description="Shown next to your name across EduthArt."
          title="Profile picture"
        >
          <Button
            onClick={onEditPicture}
            size="sm"
            type="button"
            variant="outline"
          >
            <Camera />
            Change profile picture
          </Button>
        </ActionCard>
      </div>

      <ProfileImageField
        aspectClassName="aspect-[3/1]"
        busy={uploadingBanner}
        description={`Add a wide image for the personal page where people can view your art. Banners are saved at ${BANNER_DIMENSIONS_LABEL} pixels (3:1).`}
        emptyLabel="No banner uploaded yet."
        helpText={`Use a JPG, PNG, or WebP image up to 5 MB. For the sharpest result, start from an image at least ${BANNER_DIMENSIONS_LABEL} pixels.`}
        imageUrl={profile?.bannerURL ?? null}
        inputId="profile-banner-upload"
        onError={onImageError}
        onRemove={onRemoveBanner}
        onSelect={onSelectBanner}
        removeLabel="Remove banner"
        title="Profile banner"
        uploadLabel="Upload profile banner"
      />

      <UsernameDialog
        defaultUsername={profile?.username ?? ""}
        description="Pick the tag that will be used for your public gallery page and artist link."
        onOpenChange={onUsernameDialogChange}
        onSubmit={onSaveUsername}
        open={isUsernameDialogOpen}
        title={
          profile?.username ? "Change your username" : "Choose your username"
        }
      />
    </AccountPanel>
  );
}
