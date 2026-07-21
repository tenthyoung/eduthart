import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getPublicArtwork, toCartArtwork } from "@/lib/artists/public-artwork";
import { isE2EAuthEnabled } from "@/lib/auth/e2e-store";
import { getAuthenticatedSession } from "@/lib/auth/server-session";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type CartReference = { artistUid: string; artistUsername: string; itemId: string };

const e2eCarts = new Map<string, Map<string, CartReference>>();

async function readReferences(uid: string) {
  if (isE2EAuthEnabled()) return Array.from(e2eCarts.get(uid)?.values() ?? []);
  const snapshot = await getFirebaseAdminDb().collection("users").doc(uid).collection("cart").get();
  return snapshot.docs.map((document) => document.data() as CartReference);
}

async function cartResponse(uid: string) {
  const references = await readReferences(uid);
  const records = await Promise.all(references.map((reference) => getPublicArtwork(reference.artistUsername, reference.itemId)));
  return records.filter((record) => record !== null).map(toCartArtwork);
}

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    return NextResponse.json({ items: await cartResponse(session.uid) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load cart." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    const body = (await request.json()) as { itemId?: string; username?: string };
    if (!body.itemId || !body.username) return NextResponse.json({ error: "Artwork is required." }, { status: 400 });
    const artwork = await getPublicArtwork(body.username, body.itemId);
    if (!artwork || artwork.item.pricingInventory.availability !== "original_available") {
      return NextResponse.json({ error: "This artwork is not available." }, { status: 409 });
    }
    const existing = await readReferences(session.uid);
    if (existing.some((item) => item.artistUid !== artwork.artistUid)) {
      return NextResponse.json({ error: "Checkout supports one artist at a time. Remove the other artist’s work first." }, { status: 409 });
    }
    const reference: CartReference = { artistUid: artwork.artistUid, artistUsername: artwork.artistUsername, itemId: artwork.item.id };
    if (session.authType === "e2e") {
      const cart = e2eCarts.get(session.uid) ?? new Map<string, CartReference>();
      cart.set(reference.itemId, reference);
      e2eCarts.set(session.uid, cart);
    } else {
      await getFirebaseAdminDb().collection("users").doc(session.uid).collection("cart").doc(reference.itemId).set({ ...reference, addedAt: FieldValue.serverTimestamp() });
    }
    return NextResponse.json({ items: await cartResponse(session.uid) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update cart." }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getAuthenticatedSession(request);
    const body = (await request.json()) as { itemId?: string };
    if (!body.itemId) return NextResponse.json({ error: "Artwork is required." }, { status: 400 });
    if (session.authType === "e2e") e2eCarts.get(session.uid)?.delete(body.itemId);
    else await getFirebaseAdminDb().collection("users").doc(session.uid).collection("cart").doc(body.itemId).delete();
    return NextResponse.json({ items: await cartResponse(session.uid) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update cart." }, { status: 401 });
  }
}
