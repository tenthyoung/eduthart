import { NextResponse } from "next/server";

import {
  buildDisplayName,
  isValidUsername,
  normalizeUsername,
  type AccountProfile,
} from "@/lib/auth/account-profile";
import {
  findE2EAccountProfileByUsername,
  getE2EAccountProfile,
  seedE2EAccountProfile,
} from "@/lib/auth/e2e-store";
import {
  findAccountProfileByUsername,
  loadAccountProfile,
  saveAccountProfile,
} from "@/lib/auth/profile-store";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import { MAX_BIO_LENGTH, MAX_LOCATION_LENGTH } from "@/lib/profile/details";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type AuthProfileBody = {
  acceptedLegal?: boolean;
  bannerURL?: string | null;
  firstName?: string | null;
  idToken?: string;
  lastName?: string | null;
  legalVersion?: string | null;
  method?: "email_password" | "google" | null;
  privacyPolicyPath?: string | null;
  termsOfServicePath?: string | null;
  username?: string | null;
};

type AccountProfileUpdateBody = {
  bannerURL?: string | null;
  bio?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  location?: string | null;
  photoURL?: string | null;
  username?: string | null;
};

function normalizeString(value?: string | null) {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeOptionalUrl(value?: string | null) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeFreeText(
  value: string | null | undefined,
  maxLength: number,
  label: string
) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new Error(`Your ${label} must be ${maxLength} characters or fewer.`);
  }

  return trimmed || null;
}

async function isUsernameTaken(
  username: string,
  currentUid: string,
  isE2E: boolean
) {
  const existing = isE2E
    ? await findE2EAccountProfileByUsername(username)
    : await findAccountProfileByUsername(username);

  return existing !== null && existing.uid !== currentUid;
}

async function resolveUsername(
  usernameInput: string | null | undefined,
  currentUid: string,
  isE2E: boolean
) {
  const username = normalizeUsername(usernameInput);

  if (username === undefined) {
    return undefined;
  }

  if (username === null) {
    return null;
  }

  if (!isValidUsername(username)) {
    throw new Error(
      "Usernames must be 3-24 characters and use letters, numbers, hyphens, or underscores."
    );
  }

  if (await isUsernameTaken(username, currentUid, isE2E)) {
    throw new Error("That username is already taken.");
  }

  return username;
}

function buildEmptyProfile(
  session: Awaited<ReturnType<typeof getAuthenticatedSession>>
): AccountProfile {
  return {
    authProviders: session.user.providerData
      .map((provider) => provider.providerId)
      .filter(Boolean),
    bannerURL: null,
    bio: null,
    createdAt: null,
    displayName: session.user.displayName ?? session.user.email ?? null,
    email: session.user.email?.trim().toLowerCase() ?? null,
    firstName: null,
    lastLoginAt: null,
    lastName: null,
    legal: null,
    location: null,
    photoURL: session.user.photoURL ?? null,
    photoURLManagedByUser: false,
    shippingOriginAddress: null,
    uid: session.uid,
    updatedAt: null,
    username: null,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuthProfileBody;
    const session = await getAuthenticatedSession(
      request,
      body.idToken ?? null
    );
    const isE2E = session.authType === "e2e";
    const existingProfile = await loadAccountProfile(session.uid);
    const firstName = normalizeString(body.firstName);
    const lastName = normalizeString(body.lastName);
    const bannerURL = normalizeOptionalUrl(body.bannerURL);
    const username = await resolveUsername(body.username, session.uid, isE2E);
    const displayName =
      buildDisplayName(firstName, lastName) ||
      existingProfile?.displayName ||
      session.user.displayName ||
      null;
    const now = new Date().toISOString();

    const payload: Record<string, unknown> = {
      uid: session.uid,
      email: session.user.email?.trim().toLowerCase() ?? null,
      displayName,
      // A collector who set or removed their own picture keeps that choice on
      // every later sign-in sync.
      photoURL: existingProfile?.photoURLManagedByUser
        ? existingProfile.photoURL
        : (session.user.photoURL ?? null),
      authProviders: session.user.providerData
        .map((provider) => provider.providerId)
        .filter(Boolean),
      lastLoginAt: now,
      updatedAt: now,
    };

    if (bannerURL !== undefined || !existingProfile) {
      payload.bannerURL = bannerURL ?? existingProfile?.bannerURL ?? null;
    }

    if (username !== undefined || !existingProfile) {
      const nextUsername = username ?? existingProfile?.username ?? null;
      payload.username = nextUsername;
      payload.usernameLower = nextUsername;
    }

    if (firstName !== undefined) {
      payload.firstName = firstName || null;
    }

    if (lastName !== undefined) {
      payload.lastName = lastName || null;
    }

    if (body.acceptedLegal) {
      payload.createdAt = existingProfile?.createdAt ?? now;
      payload.legal = {
        acceptedAt: now,
        acceptedVersion: body.legalVersion?.toString() ?? null,
        acceptedVia: body.method ?? null,
        privacyPolicyAcceptedAt: now,
        privacyPolicyPath: body.privacyPolicyPath?.toString() ?? null,
        termsOfServiceAcceptedAt: now,
        termsOfServicePath: body.termsOfServicePath?.toString() ?? null,
      };
    }

    if (isE2E) {
      const seeded =
        existingProfile ??
        (await seedE2EAccountProfile({
          authProviders: payload.authProviders as string[],
          displayName,
          email: payload.email as string | null,
          photoURL: payload.photoURL as string | null,
          uid: session.uid,
        }));

      const nextProfile = { ...seeded, ...payload } as AccountProfile;
      await seedE2EAccountProfile(nextProfile);
      return NextResponse.json({ profile: nextProfile });
    }

    await getFirebaseAdminDb()
      .collection("users")
      .doc(session.uid)
      .set(payload, { merge: true });
    return NextResponse.json({
      profile: await loadAccountProfile(session.uid),
    });
  } catch (error) {
    console.error(error);
    const fallbackMessage =
      error instanceof Error && error.message
        ? error.message
        : "Unable to sync your account profile.";

    return NextResponse.json(
      {
        error: {
          code: "internal",
          message: fallbackMessage,
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    const existingProfile = await loadAccountProfile(session.uid);

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile });
    }

    if (session.authType === "e2e") {
      return NextResponse.json({
        profile: await seedE2EAccountProfile({
          authProviders: session.user.providerData.map(
            (provider) => provider.providerId
          ),
          displayName: session.user.displayName,
          email: session.user.email,
          photoURL: session.user.photoURL,
          uid: session.uid,
        }),
      });
    }

    return NextResponse.json({ profile: buildEmptyProfile(session) });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load your account profile.";

    return NextResponse.json(
      {
        error: {
          code: "unauthenticated",
          message,
        },
      },
      { status: 401 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as AccountProfileUpdateBody;
    const session = await getAuthenticatedSession(request);
    const isE2E = session.authType === "e2e";
    const email = normalizeString(body.email)?.toLowerCase();
    const existingProfile =
      (isE2E
        ? await getE2EAccountProfile(session.uid)
        : await loadAccountProfile(session.uid)) ?? buildEmptyProfile(session);

    const firstName =
      body.firstName !== undefined
        ? (normalizeString(body.firstName) ?? null)
        : existingProfile.firstName;
    const lastName =
      body.lastName !== undefined
        ? (normalizeString(body.lastName) ?? null)
        : existingProfile.lastName;
    const bannerURL =
      body.bannerURL !== undefined
        ? (normalizeOptionalUrl(body.bannerURL) ?? null)
        : existingProfile.bannerURL;
    const photoURL =
      body.photoURL !== undefined
        ? (normalizeOptionalUrl(body.photoURL) ?? null)
        : existingProfile.photoURL;
    const bio = normalizeFreeText(body.bio, MAX_BIO_LENGTH, "biography");
    const location = normalizeFreeText(
      body.location,
      MAX_LOCATION_LENGTH,
      "location"
    );
    const username =
      body.username !== undefined
        ? await resolveUsername(body.username, session.uid, isE2E)
        : existingProfile.username;
    const displayName =
      buildDisplayName(firstName, lastName) ||
      existingProfile.displayName ||
      session.user.displayName ||
      session.user.email ||
      null;
    const updatedAt = new Date().toISOString();

    const payload: Record<string, unknown> = {
      displayName,
      updatedAt,
      ...(body.bannerURL !== undefined ? { bannerURL } : {}),
      ...(body.bio !== undefined ? { bio } : {}),
      ...(email ? { email } : {}),
      ...(body.firstName !== undefined ? { firstName } : {}),
      ...(body.lastName !== undefined ? { lastName } : {}),
      ...(body.location !== undefined ? { location } : {}),
      ...(body.photoURL !== undefined
        ? { photoURL, photoURLManagedByUser: true }
        : {}),
      ...(body.username !== undefined
        ? { username: username ?? null, usernameLower: username ?? null }
        : {}),
    };

    return NextResponse.json({
      profile: await saveAccountProfile(session.uid, payload),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update your account profile.";

    return NextResponse.json(
      {
        error: {
          code: "invalid-argument",
          message,
        },
      },
      { status: 400 }
    );
  }
}
