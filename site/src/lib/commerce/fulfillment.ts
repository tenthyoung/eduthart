import { setIndexedArtworkAvailability } from "@/lib/artists/artwork-index";
import { setListingAvailability } from "@/lib/artists/listing-store";
import { loadAccountProfile } from "@/lib/auth/profile-store";
import { listCollectorsWhoSaved } from "@/lib/collectors/favorites";
import { clearCart } from "@/lib/commerce/cart";
import {
  findOrderByCheckoutSession,
  getOrder,
  markOrderCancelled,
  markOrderPaid,
  type Order,
} from "@/lib/commerce/orders";
import { releaseReservation } from "@/lib/commerce/reservations";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import {
  artworkSoldNotification,
  orderConfirmedNotification,
  savedArtworkSoldNotification,
} from "@/lib/notifications/templates";

/**
 * The parts of a Stripe Checkout Session fulfilment actually reads.
 *
 * Narrowing it here means the E2E payment stand-in can satisfy the same
 * contract without pretending to be a full Stripe object.
 */
export type FulfillableSession = {
  client_reference_id?: string | null;
  id: string;
  metadata?: { orderId?: string } | null;
  payment_intent?: string | { id: string } | null;
  payment_status: string;
};

async function notifyEveryone(order: Order) {
  const [buyer, seller] = await Promise.all([
    loadAccountProfile(order.buyerUid),
    loadAccountProfile(order.sellerUid),
  ]);

  await dispatchNotification(
    { email: buyer?.email ?? order.buyerEmail, uid: order.buyerUid },
    orderConfirmedNotification({
      currency: order.currency,
      orderId: order.id,
      orderNumber: order.number,
      totalMinor: order.totalMinor,
    }),
    { dedupeKey: `ntf_order_${order.id}` },
  );

  for (const item of order.items) {
    await dispatchNotification(
      { email: seller?.email ?? null, uid: order.sellerUid },
      artworkSoldNotification({
        artworkTitle: item.title,
        currency: order.currency,
        imageUrl: item.imageUrl,
        orderId: order.id,
        orderNumber: order.number,
        totalMinor: item.unitAmountMinor,
      }),
      { dedupeKey: `ntf_sale_${order.id}_${item.itemId}` },
    );

    // Everyone who had saved this piece finds out it is gone, except the
    // collector who just bought it.
    const collectorUids = (await listCollectorsWhoSaved(item.artworkKey)).filter(
      (collectorUid) => collectorUid !== order.buyerUid,
    );

    await Promise.all(
      collectorUids.map(async (collectorUid) => {
        const collector = await loadAccountProfile(collectorUid);

        await dispatchNotification(
          { email: collector?.email ?? null, uid: collectorUid },
          savedArtworkSoldNotification({
            artistName: order.sellerName,
            artworkHref: item.href,
            artworkTitle: item.title,
            imageUrl: item.imageUrl,
          }),
          { dedupeKey: `ntf_saved_sold_${order.id}_${item.itemId}` },
        );
      }),
    );
  }
}

/**
 * Turn a paid Stripe session into a completed sale.
 *
 * Stripe retries webhooks, and the success page verifies the same session
 * independently, so this has to be safe to run more than once: an order that is
 * already paid short-circuits, and every notification carries a dedupe key.
 */
export async function fulfillCheckoutSession(session: FulfillableSession) {
  const orderId =
    session.metadata?.orderId ?? session.client_reference_id ?? null;
  const order = orderId ? await getOrder(orderId) : await findOrderByCheckoutSession(session.id);

  if (!order) {
    console.error(`No EduthArt order matches Stripe session ${session.id}`);
    return null;
  }

  if (order.status === "paid") {
    return order;
  }

  if (session.payment_status !== "paid") {
    return order;
  }

  const paidOrder = await markOrderPaid(order.id, {
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
  });

  await Promise.all(
    order.items.map(async (item) => {
      await setListingAvailability(item.artistUid, item.itemId, "sold");
      await setIndexedArtworkAvailability(item.artworkKey, "sold");
      await releaseReservation(item.artworkKey);
    }),
  );

  await clearCart(order.buyerUid);
  await notifyEveryone(paidOrder);

  return paidOrder;
}

/** Release the held originals when a checkout is abandoned or expires. */
export async function releaseCheckoutSession(session: FulfillableSession) {
  const orderId = session.metadata?.orderId ?? session.client_reference_id ?? null;
  const order = orderId ? await getOrder(orderId) : await findOrderByCheckoutSession(session.id);

  if (!order || order.status === "paid") {
    return order;
  }

  await Promise.all(order.items.map((item) => releaseReservation(item.artworkKey)));
  return markOrderCancelled(order.id);
}
