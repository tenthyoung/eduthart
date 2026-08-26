import { NextResponse } from "next/server";

import {
  createEmptyListingStudio,
  normalizeListingStudio,
  type ListingStudioDraft,
  type ShippingOriginAddress,
} from "@/lib/artists/listing-flow";
import { syncArtworkIndex } from "@/lib/artists/artwork-index";
import { notifyFollowersOfListingChanges } from "@/lib/artists/listing-notifications";
import {
  buildProfileDisplayName,
  loadAccountProfile,
  saveAccountProfile,
} from "@/lib/auth/profile-store";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import {
  getE2EListingFlow,
  seedE2EListingFlow,
  updateE2EListingFlow,
} from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type ListingFlowBody = {
  studio?: ListingStudioDraft;
  username?: string;
};

async function loadFlow(
  uid: string,
  isE2E: boolean,
  existingAddress: ShippingOriginAddress | null
) {
  if (isE2E) {
    return (
      (await getE2EListingFlow(uid)) ??
      (await seedE2EListingFlow(uid, existingAddress))
    );
  }

  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("seller")
    .doc("listing_flow")
    .get();

  if (!snapshot.exists) {
    const flow = createEmptyListingStudio({ existingAddress });
    await db
      .collection("users")
      .doc(uid)
      .collection("seller")
      .doc("listing_flow")
      .set(flow);
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
  await db
    .collection("users")
    .doc(uid)
    .collection("seller")
    .doc("listing_flow")
    .set(flow, { merge: false });
  return flow;
}

async function resolveProfileAndGuard(request: Request) {
  const session = await getAuthenticatedSession(request);
  const username =
    new URL(request.url).searchParams.get("username")?.trim().toLowerCase() ??
    "";
  const profile = await loadAccountProfile(session.uid);

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
    const { profile, session, unauthorized } =
      await resolveProfileAndGuard(request);

    if (unauthorized) {
      return NextResponse.json(
        {
          error: {
            code: "permission-denied",
            message:
              "You can only manage the listing flow for your own artist page.",
          },
        },
        { status: 403 }
      );
    }

    const flow = await loadFlow(
      session.uid,
      session.authType === "e2e",
      profile.shippingOriginAddress
    );
    return NextResponse.json({
      studio: flow,
      profile,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load your listing flow.";
    return NextResponse.json(
      { error: { code: "invalid-request", message } },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { profile, session, unauthorized } =
      await resolveProfileAndGuard(request);

    if (unauthorized) {
      return NextResponse.json(
        {
          error: {
            code: "permission-denied",
            message:
              "You can only manage the listing flow for your own artist page.",
          },
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ListingFlowBody;

    if (!body.studio) {
      return NextResponse.json(
        {
          error: {
            code: "invalid-argument",
            message: "A listing studio payload is required.",
          },
        },
        { status: 400 }
      );
    }

    const normalizedFlow = normalizeListingStudio(body.studio, {
      existingAddress: profile.shippingOriginAddress,
    });
    normalizedFlow.updatedAt = new Date().toISOString();

    if (normalizedFlow.shared.shippingOriginAddress?.line1) {
      await saveAccountProfile(session.uid, {
        shippingOriginAddress: normalizedFlow.shared.shippingOriginAddress,
        updatedAt: normalizedFlow.updatedAt,
      });
    }

    await saveFlow(session.uid, normalizedFlow, session.authType === "e2e");

    // Keeping the public index in step here is what lets collectors discover
    // this work at all, and the changes it reports drive follower alerts.
    const artistName = buildProfileDisplayName(profile);
    const changes = profile.username
      ? await syncArtworkIndex(
          {
            artistName,
            artistUid: session.uid,
            artistUsername: profile.username,
          },
          normalizedFlow
        )
      : [];
    await notifyFollowersOfListingChanges(session.uid, artistName, changes);

    const nextProfile = await loadAccountProfile(session.uid);

    return NextResponse.json({
      studio: normalizedFlow,
      profile: nextProfile,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to save your listing flow.";
    return NextResponse.json(
      { error: { code: "invalid-argument", message } },
      { status: 400 }
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
    { status: 405 }
  );
}
