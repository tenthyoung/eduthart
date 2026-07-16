import { NextResponse } from "next/server";

import { buildDisplayName, type AccountProfile } from "@/lib/auth/account-profile";
import {
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
  firstName?: string | null;
  idToken?: string;
  lastName?: string | null;
  legalVersion?: string | null;
  method?: "email_password" | "google" | null;
  privacyPolicyPath?: string | null;
  termsOfServicePath?: string | null;
};

type AccountProfileUpdateBody = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function normalizeString(value?: string | null) {
  return typeof value === "string" ? value.trim() : undefined;
}

function toAccountProfile(data: Record<string, unknown>): AccountProfile {
  const legal = data.legal as AccountProfile["legal"] | undefined;

  return {
    authProviders: Array.isArray(data.authProviders)
      ? data.authProviders.filter((value): value is string => typeof value === "string")
      : [],
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    email: typeof data.email === "string" ? data.email : null,
    firstName: typeof data.firstName === "string" ? data.firstName : null,
    lastLoginAt: typeof data.lastLoginAt === "string" ? data.lastLoginAt : null,
    lastName: typeof data.lastName === "string" ? data.lastName : null,
    legal: legal ?? null,
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    uid: typeof data.uid === "string" ? data.uid : "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
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
      lastLoginAt: now,
      updatedAt: now,
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
            displayName,
            email: payload.email as string | null,
            firstName: payload.firstName as string | null | undefined,
            lastName: payload.lastName as string | null | undefined,
            photoURL: payload.photoURL as string | null,
            uid: session.uid,
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
    return NextResponse.json(
      {
        error: {
          code: "internal",
          message:
            "We created the account, but could not finish setting up the profile.",
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
          displayName: session.user.displayName,
          email: session.user.email,
          photoURL: session.user.photoURL,
          uid: session.uid,
        }));

      return NextResponse.json({ profile });
    }

    const existingProfile = await loadProfile(session.uid);

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile });
    }

    const profile = {
      authProviders: session.user.providerData.map((provider) => provider.providerId).filter(Boolean),
      createdAt: null,
      displayName: session.user.displayName ?? null,
      email: session.user.email?.trim().toLowerCase() ?? null,
      firstName: null,
      lastLoginAt: null,
      lastName: null,
      legal: null,
      photoURL: session.user.photoURL ?? null,
      uid: session.uid,
      updatedAt: null,
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
    const firstName = normalizeString(body.firstName);
    const lastName = normalizeString(body.lastName);
    const displayName =
      buildDisplayName(firstName, lastName) || session.user.displayName || session.user.email || null;
    const updatedAt = new Date().toISOString();

    if (session.authType === "e2e") {
      const existingProfile =
        (await getE2EAccountProfile(session.uid)) ??
        (await seedE2EAccountProfile({
          authProviders: session.user.providerData.map((provider) => provider.providerId),
          displayName: session.user.displayName,
          email: session.user.email,
          photoURL: session.user.photoURL,
          uid: session.uid,
        }));

      const profile = await updateE2EAccountProfile(existingProfile.uid, {
        displayName,
        email: email ?? undefined,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        updatedAt,
      });

      return NextResponse.json({ profile });
    }

    await saveFirebaseProfile(session.uid, {
      displayName,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
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
