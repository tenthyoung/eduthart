import {
  deleteRootDocument,
  getRootDocument,
  saveRootDocument,
} from "@/lib/store/document-store";

const RESERVATIONS_COLLECTION = "artwork_reservations";

/**
 * How long a checkout holds an original.
 *
 * Stripe Checkout sessions expire after 24 hours at the outside, but an
 * abandoned tab should not keep a one-of-a-kind piece off the market that long.
 * Thirty minutes is long enough to finish paying and short enough that the next
 * collector is not blocked.
 */
export const RESERVATION_DURATION_MS = 30 * 60 * 1000;

export type Reservation = {
  artworkKey: string;
  buyerUid: string;
  expiresAt: string;
  orderId: string;
};

function toReservation(
  document: (Record<string, unknown> & { id: string }) | null
): Reservation | null {
  if (!document) {
    return null;
  }

  return {
    artworkKey: document.id,
    buyerUid: typeof document.buyerUid === "string" ? document.buyerUid : "",
    expiresAt: typeof document.expiresAt === "string" ? document.expiresAt : "",
    orderId: typeof document.orderId === "string" ? document.orderId : "",
  };
}

function isLive(reservation: Reservation) {
  const expiresAt = new Date(reservation.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/** An expired reservation is treated as absent rather than being swept eagerly. */
export async function getActiveReservation(artworkKey: string) {
  const reservation = toReservation(
    await getRootDocument(RESERVATIONS_COLLECTION, artworkKey)
  );
  return reservation && isLive(reservation) ? reservation : null;
}

export async function reserveArtwork({
  artworkKey,
  buyerUid,
  orderId,
}: {
  artworkKey: string;
  buyerUid: string;
  orderId: string;
}) {
  const existing = await getActiveReservation(artworkKey);

  if (existing && existing.buyerUid !== buyerUid) {
    throw new Error(
      "Another collector is checking out with this artwork. Try again in a few minutes."
    );
  }

  const reservation: Omit<Reservation, "artworkKey"> = {
    buyerUid,
    expiresAt: new Date(Date.now() + RESERVATION_DURATION_MS).toISOString(),
    orderId,
  };

  await saveRootDocument(RESERVATIONS_COLLECTION, artworkKey, reservation);
  return { artworkKey, ...reservation };
}

export async function releaseReservation(artworkKey: string) {
  await deleteRootDocument(RESERVATIONS_COLLECTION, artworkKey);
}
