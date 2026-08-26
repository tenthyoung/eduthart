import type { ShippingOriginAddress } from "@/lib/artists/listing-flow";
import type { AccountProfile } from "@/lib/auth/account-profile";
import {
  findE2EAccountProfileByUsername,
  getE2EAccountProfile,
  isE2EAuthEnabled,
  updateE2EAccountProfile,
} from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

/**
 * Single reader/writer for the `users` profile document.
 *
 * The profile shape is read by the account API, the listing flow, the public
 * artist page, and the collector features, and every copy of the mapping had to
 * be edited in lockstep whenever a field was added. They all come through here
 * now so a new field is a one-line change.
 */

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function toAccountProfile(
  data: Record<string, unknown>,
  fallbackUid = ""
): AccountProfile {
  return {
    authProviders: Array.isArray(data.authProviders)
      ? data.authProviders.filter(
          (value): value is string => typeof value === "string"
        )
      : [],
    bannerURL: readString(data.bannerURL),
    bio: readString(data.bio),
    createdAt: readString(data.createdAt),
    displayName: readString(data.displayName),
    email: readString(data.email),
    firstName: readString(data.firstName),
    lastLoginAt: readString(data.lastLoginAt),
    lastName: readString(data.lastName),
    legal: (data.legal as AccountProfile["legal"]) ?? null,
    location: readString(data.location),
    photoURL: readString(data.photoURL),
    photoURLManagedByUser: data.photoURLManagedByUser === true,
    shippingOriginAddress: normalizeShippingOriginAddress(
      data.shippingOriginAddress
    ),
    uid: readString(data.uid) ?? fallbackUid,
    updatedAt: readString(data.updatedAt),
    username: readString(data.username),
  };
}

export function normalizeShippingOriginAddress(
  value: unknown
): ShippingOriginAddress | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    city: typeof record.city === "string" ? record.city.trim() : "",
    country: typeof record.country === "string" ? record.country.trim() : "",
    line1: typeof record.line1 === "string" ? record.line1.trim() : "",
    line2:
      typeof record.line2 === "string" && record.line2.trim()
        ? record.line2.trim()
        : null,
    postalCode:
      typeof record.postalCode === "string" ? record.postalCode.trim() : "",
    region: typeof record.region === "string" ? record.region.trim() : "",
  };
}

export async function loadAccountProfile(
  uid: string
): Promise<AccountProfile | null> {
  if (isE2EAuthEnabled()) {
    return getE2EAccountProfile(uid);
  }

  const snapshot = await getFirebaseAdminDb()
    .collection("users")
    .doc(uid)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return toAccountProfile(snapshot.data() as Record<string, unknown>, uid);
}

export async function findAccountProfileByUsername(
  username: string
): Promise<AccountProfile | null> {
  const normalized = username.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (isE2EAuthEnabled()) {
    return findE2EAccountProfileByUsername(normalized);
  }

  const snapshot = await getFirebaseAdminDb()
    .collection("users")
    .where("usernameLower", "==", normalized)
    .limit(1)
    .get();

  const document = snapshot.docs[0];

  if (!document) {
    return null;
  }

  return toAccountProfile(
    document.data() as Record<string, unknown>,
    document.id
  );
}

export async function findAccountProfileByUid(uid: string) {
  return loadAccountProfile(uid);
}

export async function saveAccountProfile(
  uid: string,
  payload: Record<string, unknown>
) {
  if (isE2EAuthEnabled()) {
    return updateE2EAccountProfile(uid, payload as Partial<AccountProfile>);
  }

  await getFirebaseAdminDb()
    .collection("users")
    .doc(uid)
    .set(payload, { merge: true });
  return loadAccountProfile(uid);
}

export function buildProfileDisplayName(
  profile: Pick<
    AccountProfile,
    "displayName" | "firstName" | "lastName" | "username"
  >
) {
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    profile.displayName ||
    fullName ||
    (profile.username ? `@${profile.username}` : "EduthArt Collector")
  );
}
