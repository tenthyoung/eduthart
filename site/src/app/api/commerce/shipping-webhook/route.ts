import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { syncShipmentTracking } from "@/lib/commerce/tracking";
import {
  getShippoWebhookSecret,
  isShippoConfigured,
} from "@/lib/commerce/shippo";

type TrackingPayload = {
  data?: {
    carrier?: string | null;
    tracking_number?: string | null;
  } | null;
};

function isAuthorized(request: Request) {
  const expected = getShippoWebhookSecret();

  if (!expected) {
    return false;
  }

  const url = new URL(request.url);
  const presented =
    request.headers.get("x-shippo-token") ??
    url.searchParams.get("token") ??
    "";

  const presentedBytes = Buffer.from(presented);
  const expectedBytes = Buffer.from(expected);

  return (
    presentedBytes.length === expectedBytes.length &&
    timingSafeEqual(presentedBytes, expectedBytes)
  );
}

/**
 * Shippo's tracking updates.
 *
 * The shared secret only decides whether this request is worth acting on. The
 * payload is never trusted for the status itself: the carrier and tracking
 * number are used to re-fetch the parcel from Shippo, so the worst a forged
 * call can do is make the server look something up.
 */
export async function POST(request: Request) {
  if (!isShippoConfigured()) {
    return NextResponse.json(
      { error: "Shipping is not configured." },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: TrackingPayload;

  try {
    payload = (await request.json()) as TrackingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const carrier = payload.data?.carrier?.trim();
  const trackingNumber = payload.data?.tracking_number?.trim();

  if (!carrier || !trackingNumber) {
    return NextResponse.json(
      { error: "Missing carrier or tracking number." },
      { status: 400 }
    );
  }

  try {
    await syncShipmentTracking({ carrier, trackingNumber });
  } catch (error) {
    // A 500 makes Shippo retry, which is what we want for a transient failure.
    console.error("Unable to handle a Shippo tracking update", error);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
