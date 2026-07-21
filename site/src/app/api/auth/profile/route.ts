import type { ShippingOriginAddress } from "@/lib/artists/listing-flow";
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
  updateE2EAccountProfile,
} from "@/lib/auth/e2e-store";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import {
  getFirebaseAdminDb,
} from "@/lib/firebase/admin";

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
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
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

function normalizeShippingOriginAddress(
  value: unknown,
): ShippingOriginAddress | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return {
    city: typeof record.city === "string" ? record.city.trim() : "",
    country: typeof record.country === "string" ? record.country.trim() : "",
    line1: typeof record.line1 === "string" ? record.line1.trim() : "",
    line2: typeof record.line2 === "string" && record.line2.trim() ? record.line2.trim() : null,
    postalCode: typeof record.postalCode === "string" ? record.postalCode.trim() : "",
    region: typeof record.region === "string" ? record.region.trim() : "",
  };
}

async function isUsernameTaken(username: string, currentUid: string, isE2E: boolean) {
  if (isE2E) {
    const existing = await findE2EAccountProfileByUsername(username);
    return existing !== null && existing.uid !== currentUid;
  }

  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("users")
    .where("usernameLower", "==", username)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return false;
  }

  return snapshot.docs[0]?.id !== currentUid;
}

async function resolveUsername(
  usernameInput: string | null | undefined,
  currentUid: string,
  isE2E: boolean,
) {
  const username = normalizeUsername(usernameInput);

  if (username === undefined) {
    return undefined;
  }

  if (username === null) {
    return null;
  }

  if (!isValidUsername(username)) {
    throw new Error("Usernames must be 3-24 characters and use letters, numbers, hyphens, or underscores.");
  }

  const taken = await isUsernameTaken(username, currentUid, isE2E);

  if (taken) {
    throw new Error("That username is already taken.");
  }

  return username;
}

function toAccountProfile(data: Record<string, unknown>): AccountProfile {
  const legal = data.legal as AccountProfile["legal"] | undefined;

  return {
    authProviders: Array.isArray(data.authProviders)
      ? data.authProviders.filter((value): value is string => typeof value === "string")
      : [],
    bannerURL: typeof data.bannerURL === "string" ? data.bannerURL : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    email: typeof data.email === "string" ? data.email : null,
    firstName: typeof data.firstName === "string" ? data.firstName : null,
    lastLoginAt: typeof data.lastLoginAt === "string" ? data.lastLoginAt : null,
    lastName: typeof data.lastName === "string" ? data.lastName : null,
    legal: legal ?? null,
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    shippingOriginAddress: normalizeShippingOriginAddress(data.shippingOriginAddress) ?? null,
    uid: typeof data.uid === "string" ? data.uid : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    username: typeof data.username === "string" ? data.username : null,
  };
}

async function loadProfile(uid: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    return null;
  }

  return toAccountProfile(snapshot.data() as Record<string, unknown>);
}

async function saveFirebaseProfile(
  uid: string,
  payload: Record<string, unknown>,
) {
  const db = getFirebaseAdminDb();
  await db.collection("users").doc(uid).set(payload, { merge: true });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuthProfileBody;
    const session = await getAuthenticatedSession(request, body.idToken ?? null);
    const firstName = normalizeString(body.firstName);
    const lastName = normalizeString(body.lastName);
    const bannerURL = normalizeOptionalUrl(body.bannerURL);
    const username = await resolveUsername(body.username, session.uid, session.authType === "e2e");
    const displayName =
      buildDisplayName(firstName, lastName) || session.user.displayName || null;
    const now = new Date().toISOString();

    const payload: Record<string, unknown> = {
      uid: session.uid,
      email: session.user.email?.trim().toLowerCase() ?? null,
      displayName,
      photoURL: session.user.photoURL ?? null,
      authProviders: session.user.providerData
        .map((provider) => provider.providerId)
        .filter(Boolean),
      bannerURL: bannerURL ?? null,
      lastLoginAt: now,
      updatedAt: now,
      username: username ?? null,
      usernameLower: username ?? null,
    };

    if (firstName !== undefined) {
      payload.firstName = firstName || null;
    }

    if (lastName !== undefined) {
      payload.lastName = lastName || null;
    }

    if (body.acceptedLegal) {
      payload.createdAt = now;
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

    if (session.authType === "e2e") {
      const existingProfile = await getE2EAccountProfile(session.uid);
      const nextProfile = {
        ...(existingProfile ??
          (await seedE2EAccountProfile({
            authProviders: payload.authProviders as string[],
            bannerURL: payload.bannerURL as string | null,
            displayName,
            email: payload.email as string | null,
            firstName: payload.firstName as string | null | undefined,
            lastName: payload.lastName as string | null | undefined,
            photoURL: payload.photoURL as string | null,
            shippingOriginAddress: null,
            uid: session.uid,
            username: payload.username as string | null,
          }))),
        ...payload,
      };

      await seedE2EAccountProfile(nextProfile);
      return NextResponse.json({ profile: nextProfile });
    }

    await saveFirebaseProfile(session.uid, payload);
    const profile = await loadProfile(session.uid);

    return NextResponse.json({ profile });
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
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);

    if (session.authType === "e2e") {
      const profile =
        (await getE2EAccountProfile(session.uid)) ??
        (await seedE2EAccountProfile({
          authProviders: session.user.providerData.map((provider) => provider.providerId),
          bannerURL: null,
          displayName: session.user.displayName,
          email: session.user.email,
          photoURL: session.user.photoURL,
          shippingOriginAddress: null,
          uid: session.uid,
          username: null,
        }));

      return NextResponse.json({ profile });
    }

    const existingProfile = await loadProfile(session.uid);

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile });
    }

    const profile = {
      authProviders: session.user.providerData.map((provider) => provider.providerId).filter(Boolean),
      bannerURL: null,
      createdAt: null,
      displayName: session.user.displayName ?? null,
      email: session.user.email?.trim().toLowerCase() ?? null,
      firstName: null,
      lastLoginAt: null,
      lastName: null,
      legal: null,
      photoURL: session.user.photoURL ?? null,
      shippingOriginAddress: null,
      uid: session.uid,
      updatedAt: null,
      username: null,
    } satisfies AccountProfile;

    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load your account profile.";

    return NextResponse.json(
      {
        error: {
          code: "unauthenticated",
          message,
        },
      },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as AccountProfileUpdateBody;
    const session = await getAuthenticatedSession(request);
    const email = normalizeString(body.email)?.toLowerCase();
    const existingProfile =
      (session.authType === "e2e"
        ? await getE2EAccountProfile(session.uid)
        : await loadProfile(session.uid)) ??
      {
        authProviders: session.user.providerData.map((provider) => provider.providerId),
        bannerURL: null,
        createdAt: null,
        displayName: session.user.displayName ?? session.user.email ?? null,
        email: session.user.email?.trim().toLowerCase() ?? null,
        firstName: null,
        lastLoginAt: null,
        lastName: null,
        legal: null,
        photoURL: session.user.photoURL ?? null,
        shippingOriginAddress: null,
        uid: session.uid,
        updatedAt: null,
        username: null,
      } satisfies AccountProfile;
    const firstName = body.firstName !== undefined ? normalizeString(body.firstName) ?? null : existingProfile.firstName;
    const lastName = body.lastName !== undefined ? normalizeString(body.lastName) ?? null : existingProfile.lastName;
    const bannerURL = body.bannerURL !== undefined ? normalizeOptionalUrl(body.bannerURL) ?? null : existingProfile.bannerURL;
    const username =
      body.username !== undefined
        ? await resolveUsername(body.username, session.uid, session.authType === "e2e")
        : existingProfile.username;
    const displayName =
      buildDisplayName(firstName, lastName) || session.user.displayName || session.user.email || null;
    const updatedAt = new Date().toISOString();

    if (session.authType === "e2e") {
      const profile = await updateE2EAccountProfile(existingProfile.uid, {
        bannerURL,
        displayName,
        email: email ?? undefined,
        firstName,
        lastName,
        updatedAt,
        username: username ?? null,
      });

      return NextResponse.json({ profile });
    }

    await saveFirebaseProfile(session.uid, {
      ...(body.bannerURL !== undefined ? { bannerURL } : {}),
      displayName,
      ...(body.firstName !== undefined ? { firstName } : {}),
      ...(body.lastName !== undefined ? { lastName } : {}),
      ...(body.username !== undefined
        ? {
            username: username ?? null,
            usernameLower: username ?? null,
          }
        : {}),
      updatedAt,
    });

    const profile = await loadProfile(session.uid);
    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update your account profile.";

    return NextResponse.json(
      {
        error: {
          code: "invalid-argument",
          message,
        },
      },
      { status: 400 },
    );
  }
}
