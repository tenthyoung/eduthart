import { NextResponse } from "next/server";

import {
  createEmptyListingStudio,
  normalizeListingStudio,
  type ListingStudioDraft,
} from "@/lib/artists/listing-flow";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import {
  getE2EAccountProfile,
  getE2EListingFlow,
  seedE2EListingFlow,
  updateE2EAccountProfile,
  updateE2EListingFlow,
} from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type ListingFlowBody = {
  studio?: ListingStudioDraft;
  username?: string;
};

async function loadProfile(uid: string) {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;

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
    legal: null,
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    shippingOriginAddress:
      typeof data.shippingOriginAddress === "object" && data.shippingOriginAddress !== null
        ? (data.shippingOriginAddress as {
            city: string;
            country: string;
            line1: string;
            line2: string | null;
            postalCode: string;
            region: string;
          })
        : null,
    uid: typeof data.uid === "string" ? data.uid : uid,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    username: typeof data.username === "string" ? data.username : null,
  };
}

async function loadFlow(uid: string, isE2E: boolean, existingAddress: NonNullable<Awaited<ReturnType<typeof loadProfile>>>["shippingOriginAddress"] | null) {
  if (isE2E) {
    return (
      (await getE2EListingFlow(uid)) ??
      (await seedE2EListingFlow(uid, existingAddress))
    );
  }

  const db = getFirebaseAdminDb();
  const snapshot = await db.collection("users").doc(uid).collection("seller").doc("listing_flow").get();

  if (!snapshot.exists) {
    const flow = createEmptyListingStudio({ existingAddress });
    await db.collection("users").doc(uid).collection("seller").doc("listing_flow").set(flow);
    return flow;
  }

  return normalizeListingStudio(snapshot.data() as ListingStudioDraft, {
    existingAddress,
  });
}

async function saveFlow(uid: string, flow: ListingStudioDraft, isE2E: boolean) {
  if (isE2E) {
    return updateE2EListingFlow(uid, flow);
  }

  const db = getFirebaseAdminDb();
  await db.collection("users").doc(uid).collection("seller").doc("listing_flow").set(flow, { merge: false });
  return flow;
}

async function resolveProfileAndGuard(request: Request) {
  const session = await getAuthenticatedSession(request);
  const username = new URL(request.url).searchParams.get("username")?.trim().toLowerCase() ?? "";
  const profile =
    session.authType === "e2e"
      ? await getE2EAccountProfile(session.uid)
      : await loadProfile(session.uid);

  if (!profile) {
    throw new Error("Your account profile could not be found.");
  }

  if (!profile.username || profile.username.toLowerCase() !== username) {
    return {
      profile,
      session,
      unauthorized: true,
    };
  }

  return {
    profile,
    session,
    unauthorized: false,
  };
}

export async function GET(request: Request) {
  try {
    const { profile, session, unauthorized } = await resolveProfileAndGuard(request);

    if (unauthorized) {
      return NextResponse.json(
        {
          error: {
            code: "permission-denied",
            message: "You can only manage the listing flow for your own artist page.",
          },
        },
        { status: 403 },
      );
    }

    const flow = await loadFlow(session.uid, session.authType === "e2e", profile.shippingOriginAddress);
    return NextResponse.json({
      studio: flow,
      profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load your listing flow.";
    return NextResponse.json(
      { error: { code: "invalid-request", message } },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { profile, session, unauthorized } = await resolveProfileAndGuard(request);

    if (unauthorized) {
      return NextResponse.json(
        {
          error: {
            code: "permission-denied",
            message: "You can only manage the listing flow for your own artist page.",
          },
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as ListingFlowBody;

    if (!body.studio) {
      return NextResponse.json(
        { error: { code: "invalid-argument", message: "A listing studio payload is required." } },
        { status: 400 },
      );
    }

    const normalizedFlow = normalizeListingStudio(body.studio, {
      existingAddress: profile.shippingOriginAddress,
    });
    normalizedFlow.updatedAt = new Date().toISOString();

    if (normalizedFlow.shared.shippingOriginAddress?.line1) {
      if (session.authType === "e2e") {
        await updateE2EAccountProfile(session.uid, {
          shippingOriginAddress: normalizedFlow.shared.shippingOriginAddress,
          updatedAt: normalizedFlow.updatedAt,
        });
      } else {
        await getFirebaseAdminDb().collection("users").doc(session.uid).set(
          {
            shippingOriginAddress: normalizedFlow.shared.shippingOriginAddress,
            updatedAt: normalizedFlow.updatedAt,
          },
          { merge: true },
        );
      }
    }

    await saveFlow(session.uid, normalizedFlow, session.authType === "e2e");
    const nextProfile =
      session.authType === "e2e"
        ? await getE2EAccountProfile(session.uid)
        : await loadProfile(session.uid);

    return NextResponse.json({
      studio: normalizedFlow,
      profile: nextProfile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save your listing flow.";
    return NextResponse.json(
      { error: { code: "invalid-argument", message } },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: {
        code: "method-not-allowed",
        message: "Resetting the listing studio is no longer supported.",
      },
    },
    { status: 405 },
  );
}
