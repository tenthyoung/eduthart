import type { ShippingOriginAddress } from "@/lib/artists/listing-flow";

export type AccountLegalAcceptance = {
  acceptedAt: string | null;
  acceptedVersion: string | null;
  acceptedVia: "email_password" | "google" | null;
  privacyPolicyAcceptedAt: string | null;
  privacyPolicyPath: string | null;
  termsOfServiceAcceptedAt: string | null;
  termsOfServicePath: string | null;
};

export type AccountProfile = {
  authProviders: string[];
  bannerURL: string | null;
  bio: string | null;
  createdAt: string | null;
  displayName: string | null;
  email: string | null;
  firstName: string | null;
  lastLoginAt: string | null;
  lastName: string | null;
  legal: AccountLegalAcceptance | null;
  location: string | null;
  photoURL: string | null;
  /**
   * Set once a collector uploads or removes their own picture, so a later
   * sign-in sync does not overwrite their choice with the provider's avatar.
   */
  photoURLManagedByUser: boolean;
  shippingOriginAddress: ShippingOriginAddress | null;
  uid: string;
  updatedAt: string | null;
  username: string | null;
};

export function buildDisplayName(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.trim() ?? ""} ${lastName?.trim() ?? ""}`.trim();
}

export function normalizeUsername(value?: string | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().replace(/^@+/, "").toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidUsername(value: string) {
  return /^[a-z0-9](?:[a-z0-9_-]{1,22}[a-z0-9])?$/.test(value);
}

export function buildArtistPageHref(username: string) {
  return `/artists/${username}`;
}

/**
 * A profile placeholder built from the signed-in Firebase user.
 *
 * Client screens render this when the profile API is unreachable so the page
 * still shows the collector's own name instead of an error shell.
 */
export function buildFallbackAccountProfile(user: {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  providerIds: string[];
  uid: string;
}, username: string | null = null): AccountProfile {
  return {
    authProviders: user.providerIds,
    bannerURL: null,
    bio: null,
    createdAt: null,
    displayName: user.displayName ?? user.email ?? "EduthArt Collector",
    email: user.email ?? null,
    firstName: null,
    lastLoginAt: null,
    lastName: null,
    legal: null,
    location: null,
    photoURL: user.photoURL ?? null,
    photoURLManagedByUser: false,
    shippingOriginAddress: null,
    uid: user.uid,
    updatedAt: null,
    username,
  };
}

/**
 * Best-effort split of a provider display name into first and last name.
 *
 * Apple hands back only a display name, so this is the only way to prefill the
 * profile completion step for an Apple sign-up.
 */
export function splitDisplayName(displayName?: string | null) {
  const parts = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function isProfileComplete(profile: Pick<AccountProfile, "firstName" | "lastName">) {
  return Boolean(profile.firstName?.trim() && profile.lastName?.trim());
}
