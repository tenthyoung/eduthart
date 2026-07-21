import type { ShippingOriginAddress } from "@/lib/artists/listing-flow";
import { NextResponse } from "next/server";

import { clearE2EAccountProfiles, isE2EAuthEnabled, seedE2EAccountProfile } from "@/lib/auth/e2e-store";

type SeedBody = {
  authProviders?: string[];
  bannerURL?: string | null;
  createdAt?: string | null;
  displayName?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastLoginAt?: string | null;
  lastName?: string | null;
  photoURL?: string | null;
  shippingOriginAddress?: ShippingOriginAddress | null;
  uid?: string;
  username?: string | null;
};

function ensureE2EEnabled() {
  if (!isE2EAuthEnabled()) {
    return NextResponse.json(
      {
        error: {
          code: "not-found",
          message: "Not found.",
        },
      },
      { status: 404 },
    );
  }

  return null;
}

export async function POST(request: Request) {
  const disabledResponse = ensureE2EEnabled();

  if (disabledResponse) {
    return disabledResponse;
  }

  const body = (await request.json()) as SeedBody;

  if (!body.uid?.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "invalid-argument",
          message: "A uid is required.",
        },
      },
      { status: 400 },
    );
  }

  const profile = await seedE2EAccountProfile({
    authProviders: body.authProviders,
    bannerURL: body.bannerURL,
    createdAt: body.createdAt,
    displayName: body.displayName,
    email: body.email,
    firstName: body.firstName,
    lastLoginAt: body.lastLoginAt,
    lastName: body.lastName,
    photoURL: body.photoURL,
    shippingOriginAddress: body.shippingOriginAddress,
    uid: body.uid.trim(),
    username: body.username,
  });

  return NextResponse.json({ profile });
}

export async function DELETE() {
  const disabledResponse = ensureE2EEnabled();

  if (disabledResponse) {
    return disabledResponse;
  }

  await clearE2EAccountProfiles();
  return NextResponse.json({ success: true });
}
