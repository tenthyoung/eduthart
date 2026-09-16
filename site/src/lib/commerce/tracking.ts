import {
  findOrderByTrackingNumber,
  updateShipmentTracking,
  type Order,
  type ShipmentStatus,
} from "@/lib/commerce/orders";
import { getShippoTracking } from "@/lib/commerce/shippo";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import {
  orderDeliveredNotification,
  orderShippedNotification,
} from "@/lib/notifications/templates";
import { loadAccountProfile } from "@/lib/auth/profile-store";

/** Shippo's tracking vocabulary, mapped onto the states an order records. */
const TRACKING_STATUSES: Record<string, ShipmentStatus> = {
  DELIVERED: "delivered",
  FAILURE: "failure",
  PRE_TRANSIT: "label_purchased",
  RETURNED: "returned",
  TRANSIT: "transit",
  UNKNOWN: "pending",
};

export function toShipmentStatus(status: string | null | undefined) {
  return TRACKING_STATUSES[(status ?? "").toUpperCase()] ?? null;
}

async function notifyBuyer(order: Order, status: ShipmentStatus) {
  if (status !== "delivered" && status !== "transit") {
    return;
  }

  const buyer = await loadAccountProfile(order.buyerUid);
  const recipient = {
    email: buyer?.email ?? order.buyerEmail,
    uid: order.buyerUid,
  };

  if (status === "transit") {
    await dispatchNotification(
      recipient,
      orderShippedNotification({
        carrier: order.shipment.carrier,
        orderId: order.id,
        orderNumber: order.number,
        trackingNumber: order.shipment.trackingNumber,
        trackingUrl: order.shipment.trackingUrl,
      }),
      { dedupeKey: `ntf_shipped_${order.id}` }
    );
    return;
  }

  await dispatchNotification(
    recipient,
    orderDeliveredNotification({
      orderId: order.id,
      orderNumber: order.number,
    }),
    { dedupeKey: `ntf_delivered_${order.id}` }
  );
}

/**
 * Move an order's parcel to where the carrier says it is.
 *
 * The webhook that triggers this only supplies a carrier and tracking number;
 * the status itself is re-fetched from Shippo, so a forged payload cannot mark
 * an order delivered. Safe to run repeatedly: an unchanged status is a no-op
 * and every notification carries a dedupe key.
 */
export async function syncShipmentTracking(input: {
  carrier: string;
  trackingNumber: string;
}) {
  const order = await findOrderByTrackingNumber(input.trackingNumber);

  if (!order) {
    return null;
  }

  const tracking = await getShippoTracking(input.carrier, input.trackingNumber);
  const status = toShipmentStatus(tracking.tracking_status?.status);

  if (!status || status === order.shipment.status) {
    return order;
  }

  const updated = await updateShipmentTracking(order.id, {
    occurredAt: tracking.tracking_status?.status_date ?? null,
    status,
  });

  if (!updated) {
    return order;
  }

  await notifyBuyer(updated, status);
  return updated;
}
