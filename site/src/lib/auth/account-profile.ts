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
  createdAt: string | null;
  displayName: string | null;
  email: string | null;
  firstName: string | null;
  lastLoginAt: string | null;
  lastName: string | null;
  legal: AccountLegalAcceptance | null;
  photoURL: string | null;
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
