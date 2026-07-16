import { NextResponse } from "next/server";

import {
  getFirebaseAdminAuth,
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

function formatDisplayName(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.trim() ?? ""} ${lastName?.trim() ?? ""}`.trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuthProfileBody;
    const idToken = body.idToken?.toString().trim();

    if (!idToken) {
      return NextResponse.json(
        {
          error: {
            code: "invalid-argument",
            message: "A valid ID token is required.",
          },
        },
        { status: 400 },
      );
    }

    const auth = getFirebaseAdminAuth();
    const db = getFirebaseAdminDb();
    const decoded = await auth.verifyIdToken(idToken, true);
    const user = await auth.getUser(decoded.uid);
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : undefined;
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : undefined;
    const displayName =
      formatDisplayName(firstName, lastName) || user.displayName || null;

    const payload: Record<string, unknown> = {
      uid: decoded.uid,
      email: user.email?.trim().toLowerCase() ?? null,
      displayName,
      photoURL: user.photoURL ?? null,
      authProviders: user.providerData
        .map((provider) => provider.providerId)
        .filter(Boolean),
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (firstName !== undefined) {
      payload.firstName = firstName || null;
    }

    if (lastName !== undefined) {
      payload.lastName = lastName || null;
    }

    if (body.acceptedLegal) {
      payload.createdAt = new Date().toISOString();
      payload.legal = {
        acceptedAt: new Date().toISOString(),
        acceptedVersion: body.legalVersion?.toString() ?? null,
        acceptedVia: body.method ?? null,
        privacyPolicyAcceptedAt: new Date().toISOString(),
        privacyPolicyPath: body.privacyPolicyPath?.toString() ?? null,
        termsOfServiceAcceptedAt: new Date().toISOString(),
        termsOfServicePath: body.termsOfServicePath?.toString() ?? null,
      };
    }

    await db.collection("users").doc(decoded.uid).set(payload, { merge: true });

    return NextResponse.json({ success: true });
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
