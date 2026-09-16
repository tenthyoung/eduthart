"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AccountArea } from "@/components/account/account-shell";
import {
  type EmailFormData,
  useEmailForm,
} from "@/components/account/change-email-dialog";
import {
  type ProfileFormData,
  useProfileForm,
} from "@/components/account/edit-profile-dialog";
import { ImageCropDialog } from "@/components/account/image-crop-dialog";
import { ProfilePictureDialog } from "@/components/account/profile-picture-dialog";
import { AccountDetailsSection } from "@/components/account/sections/account-details-section";
import { AccountHeader } from "@/components/account/sections/account-header";
import { DangerZoneSection } from "@/components/account/sections/danger-zone-section";
import { EmailPreferencesSection } from "@/components/account/sections/email-preferences-section";
import { ProfileSection } from "@/components/account/sections/profile-section";
import { SecuritySection } from "@/components/account/sections/security-section";
import { useAccountProfile } from "@/components/account/use-account-profile";
import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseApiError } from "@/lib/api/parse-api-error";
import {
  buildDisplayName,
  type AccountProfile,
} from "@/lib/auth/account-profile";
import { notifyUsernameUpdated } from "@/lib/auth/username-events";
import { BANNER_CROP_SPEC } from "@/lib/profile/images";
import { uploadProfileImage } from "@/lib/profile/upload";

const PROVIDER_LABELS: Record<string, string> = {
  // Apple is no longer offered as a sign-in method, but an account linked back
  // when it was should still read as "Apple" rather than a raw provider id.
  "apple.com": "Apple",
  "google.com": "Google",
  password: "Email and password",
};

/**
 * Account settings.
 *
 * This component owns the dialog and in-flight flags and wires the handlers
 * together; the profile fetch lives in useAccountProfile and each panel renders
 * from its own file under ./sections.
 */
export function AccountPage() {
  const router = useRouter();
  const {
    changePassword,
    refreshUser,
    requestEmailChange,
    sendResetLink,
    sendVerificationEmail,
    signOut,
    status,
    user,
  } = useAuth();

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isPictureDialogOpen, setIsPictureDialogOpen] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [pendingBanner, setPendingBanner] = useState<File | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [refreshingVerification, setRefreshingVerification] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [suppressAuthRedirect, setSuppressAuthRedirect] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const profileForm = useProfileForm();
  const emailForm = useEmailForm();

  const syncForms = useCallback(
    (next: AccountProfile) => {
      profileForm.reset({
        bio: next.bio ?? "",
        firstName: next.firstName ?? "",
        lastName: next.lastName ?? "",
        location: next.location ?? "",
      });
      emailForm.reset({ nextEmail: next.email ?? user?.email ?? "" });
    },
    [emailForm, profileForm, user?.email]
  );

  const {
    error,
    loading,
    profile,
    reportError,
    runProfileUpdate,
    setError,
    setProfile,
  } = useAccountProfile({ onLoaded: syncForms, status, user });

  // Sign-out and account deletion clear the session on purpose, so they opt out
  // of the redirect that would otherwise fire mid-flow.
  useEffect(() => {
    if (
      status === "unauthenticated" &&
      !suppressAuthRedirect &&
      !signingOut &&
      !deletingAccount
    ) {
      router.replace("/login?next=/account");
    }
  }, [deletingAccount, router, signingOut, status, suppressAuthRedirect]);

  const { firstName, lastName } = profileForm.watch();
  const hasPasswordProvider = user?.providerIds.includes("password") ?? false;
  const isEmailVerified = user?.emailVerified ?? false;
  const displayNamePreview =
    buildDisplayName(firstName, lastName) ||
    profile?.displayName ||
    user?.displayName ||
    "EduthArt Collector";
  const currentEmail = user?.email ?? profile?.email ?? null;

  const providerLabel = useMemo(() => {
    const providers = profile?.authProviders.length
      ? profile.authProviders
      : (user?.providerIds ?? []);

    if (providers.length === 0) {
      return "Not available";
    }

    return providers
      .map((provider) => PROVIDER_LABELS[provider] ?? provider)
      .join(", ");
  }, [profile?.authProviders, user?.providerIds]);

  const handleSaveProfile = async (values: ProfileFormData) => {
    const updated = await runProfileUpdate(
      {
        bio: values.bio,
        firstName: values.firstName,
        lastName: values.lastName,
        location: values.location,
      },
      "Your account profile has been updated.",
      "Unable to save your profile."
    );

    if (updated) {
      syncForms(updated);
      setIsProfileDialogOpen(false);
    }
  };

  const handleSaveUsername = async (username: string) => {
    const updated = await runProfileUpdate(
      { username },
      "Your username has been updated.",
      "Unable to save your username."
    );

    if (updated) {
      notifyUsernameUpdated(updated.username ?? null);
      setIsUsernameDialogOpen(false);
    }
  };

  const handleCroppedBanner = async (file: File) => {
    if (!user) {
      return;
    }

    setUploadingBanner(true);
    setError(null);

    try {
      const url = await uploadProfileImage({
        file,
        folder: "profile-banners",
        uid: user.uid,
      });

      await runProfileUpdate(
        { bannerURL: url },
        "Your profile banner has been updated.",
        "Unable to upload your image."
      );
      setPendingBanner(null);
    } catch (uploadError) {
      reportError(uploadError, "Unable to upload your image.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    setUploadingBanner(true);

    await runProfileUpdate(
      { bannerURL: null },
      "Your profile banner has been removed.",
      "Unable to remove your image."
    );

    setUploadingBanner(false);
  };

  const handleImageError = (message: string) => {
    setError(message);
    toast.error(message);
  };

  const handleChangePassword = async (
    currentPassword: string,
    nextPassword: string
  ) => {
    await changePassword(currentPassword, nextPassword);
    toast.success(
      "Your password has been changed. We sent a confirmation to your email."
    );
  };

  const handlePasswordReset = async () => {
    if (!currentEmail) {
      return;
    }

    setResettingPassword(true);

    try {
      await sendResetLink(currentEmail);
      toast.success(`A password reset link has been sent to ${currentEmail}.`);
    } catch (resetError) {
      reportError(resetError, "Unable to send a password reset link.");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleEmailChange = async (values: EmailFormData) => {
    setError(null);

    try {
      const result = await requestEmailChange(values.nextEmail);
      setIsEmailDialogOpen(false);

      if (result.requiresVerification) {
        toast.success(
          `We sent a confirmation link to ${result.email}. Verify it, then refresh your account status here.`
        );
        return;
      }

      setProfile((current) =>
        current ? { ...current, email: result.email } : current
      );
      emailForm.reset({ nextEmail: result.email });
      toast.success("Your email address has been updated.");
    } catch (emailError) {
      reportError(emailError, "Unable to change your email address.");
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
    } catch (verificationError) {
      reportError(verificationError, "Unable to send a verification email.");
    } finally {
      setSendingVerification(false);
    }
  };

  const handleRefreshVerification = async () => {
    setRefreshingVerification(true);

    try {
      await refreshUser();
      toast.success("Email verification status refreshed.");
    } catch (refreshError) {
      reportError(refreshError, "Unable to refresh verification status.");
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
        headers: { authorization: `Bearer ${token}` },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Unable to delete your account.")
        );
      }

      await signOut();
      toast.success("Your account has been deleted.");
      router.replace("/");
    } catch (deleteError) {
      reportError(deleteError, "Unable to delete your account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <AccountArea>
        <div className="flex items-center justify-center rounded-[2rem] border border-white/70 bg-white/80 p-12 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl dark:border-border dark:bg-card/80">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading your account settings...
          </div>
        </div>
      </AccountArea>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <AccountArea>
      <div className="space-y-8">
        <AccountHeader
          currentEmail={currentEmail}
          displayName={displayNamePreview}
          fallbackEmail={user?.email ?? null}
          onEditPicture={() => setIsPictureDialogOpen(true)}
          profile={profile}
          providerLabel={providerLabel}
          uid={user?.uid ?? null}
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Account settings error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <ProfileSection
            displayNamePreview={displayNamePreview}
            form={profileForm}
            isProfileDialogOpen={isProfileDialogOpen}
            isUsernameDialogOpen={isUsernameDialogOpen}
            onEditPicture={() => setIsPictureDialogOpen(true)}
            onImageError={handleImageError}
            onProfileDialogChange={setIsProfileDialogOpen}
            onRemoveBanner={() => void handleRemoveBanner()}
            onSaveProfile={handleSaveProfile}
            onSaveUsername={handleSaveUsername}
            onSelectBanner={setPendingBanner}
            onUsernameDialogChange={setIsUsernameDialogOpen}
            profile={profile}
            uploadingBanner={uploadingBanner}
          />

          <div className="space-y-6">
            <SecuritySection
              currentEmail={currentEmail}
              emailForm={emailForm}
              hasPasswordProvider={hasPasswordProvider}
              isEmailDialogOpen={isEmailDialogOpen}
              isEmailVerified={isEmailVerified}
              onChangePassword={handleChangePassword}
              onEmailDialogChange={setIsEmailDialogOpen}
              onEmailSubmit={handleEmailChange}
              onPasswordReset={() => void handlePasswordReset()}
              onRefreshVerification={() => void handleRefreshVerification()}
              onSendVerificationEmail={() => void handleSendVerificationEmail()}
              onSignOut={() => void handleSignOut()}
              providerLabel={providerLabel}
              refreshingVerification={refreshingVerification}
              resettingPassword={resettingPassword}
              sendingVerification={sendingVerification}
              signingOut={signingOut}
            />

            <EmailPreferencesSection />

            <AccountDetailsSection profile={profile} />
          </div>
        </div>

        <DangerZoneSection
          confirmation={deleteConfirmation}
          deleting={deletingAccount}
          onConfirmationChange={setDeleteConfirmation}
          onDelete={() => void handleDeleteAccount()}
        />
      </div>

      <ProfilePictureDialog
        onOpenChange={setIsPictureDialogOpen}
        onProfileUpdated={setProfile}
        open={isPictureDialogOpen}
        photoURL={profile?.photoURL ?? null}
      />

      <ImageCropDialog
        file={pendingBanner}
        onCancel={() => setPendingBanner(null)}
        onCropped={handleCroppedBanner}
        spec={BANNER_CROP_SPEC}
      />
    </AccountArea>
  );
}
