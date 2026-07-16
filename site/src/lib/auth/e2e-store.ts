import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildDisplayName, type AccountProfile } from "@/lib/auth/account-profile";

type SeedProfileArgs = {
  authProviders?: string[];
  createdAt?: string | null;
  displayName?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastLoginAt?: string | null;
  lastName?: string | null;
  legal?: AccountProfile["legal"];
  photoURL?: string | null;
  uid: string;
};

const E2E_STORE_DIR = join(tmpdir(), "eduthart-e2e-account-store");

export function isE2EAuthEnabled() {
  return process.env.E2E_AUTH === "1" || process.env.NEXT_PUBLIC_E2E_AUTH === "1";
}

function getProfilePath(uid: string) {
  return join(E2E_STORE_DIR, `${encodeURIComponent(uid)}.json`);
}

async function ensureStoreDir() {
  await fs.mkdir(E2E_STORE_DIR, { recursive: true });
}

export async function seedE2EAccountProfile({
  authProviders,
  createdAt,
  displayName,
  email,
  firstName,
  lastLoginAt,
  lastName,
  legal,
  photoURL,
  uid,
}: SeedProfileArgs) {
  const now = new Date().toISOString();
  const normalizedFirstName = firstName?.trim() || null;
  const normalizedLastName = lastName?.trim() || null;

  const profile: AccountProfile = {
    authProviders: authProviders?.length ? authProviders : ["password"],
    createdAt: createdAt ?? now,
    displayName:
      displayName?.trim() ||
      buildDisplayName(normalizedFirstName, normalizedLastName) ||
      email?.trim() ||
      "EduthArt Collector",
    email: email?.trim().toLowerCase() ?? null,
    firstName: normalizedFirstName,
    lastLoginAt: lastLoginAt ?? now,
    lastName: normalizedLastName,
    legal:
      legal ??
      ({
        acceptedAt: now,
        acceptedVersion: "e2e",
        acceptedVia: authProviders?.includes("google") ? "google" : "email_password",
        privacyPolicyAcceptedAt: now,
        privacyPolicyPath: "/legal/privacy-policy",
        termsOfServiceAcceptedAt: now,
        termsOfServicePath: "/legal/terms-of-service",
      } satisfies NonNullable<AccountProfile["legal"]>),
    photoURL: photoURL ?? null,
    uid,
    updatedAt: now,
  };

  await ensureStoreDir();
  await fs.writeFile(getProfilePath(uid), JSON.stringify(profile), "utf8");
  return profile;
}

export async function getE2EAccountProfile(uid: string) {
  try {
    const raw = await fs.readFile(getProfilePath(uid), "utf8");
    return JSON.parse(raw) as AccountProfile;
  } catch {
    return null;
  }
}

export async function updateE2EAccountProfile(
  uid: string,
  updates: Partial<Pick<AccountProfile, "displayName" | "email" | "firstName" | "lastName" | "updatedAt">>,
) {
  const current = await getE2EAccountProfile(uid);

  if (!current) {
    return null;
  }

  const next: AccountProfile = {
    ...current,
    ...updates,
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
  };

  await ensureStoreDir();
  await fs.writeFile(getProfilePath(uid), JSON.stringify(next), "utf8");
  return next;
}

export async function deleteE2EAccountProfile(uid: string) {
  await fs.rm(getProfilePath(uid), { force: true });
}

export async function clearE2EAccountProfiles() {
  await fs.rm(E2E_STORE_DIR, { force: true, recursive: true });
}
