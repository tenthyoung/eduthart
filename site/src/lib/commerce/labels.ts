import { attachShipmentLabel, type Order } from "@/lib/commerce/orders";
import {
  createShippoTransaction,
  isShippoConfigured,
} from "@/lib/commerce/shippo";

/**
 * Buy the shipping label for a paid order.
 *
 * Called from fulfilment, where the sale is already complete: a label that
 * cannot be bought must never undo a payment, so every failure here is logged
 * and swallowed and the order keeps its pending shipment. Re-running is safe
 * because an order that already has a transaction short-circuits.
 */
export async function purchaseShippingLabel(
  order: Order,
  options: { signatureRequired?: boolean } = {}
) {
  if (order.shipment.transactionId) {
    return order;
  }

  if (!isShippoConfigured() || !order.shipment.rateId) {
    return order;
  }

  try {
    const transaction = await createShippoTransaction({
      rateId: order.shipment.rateId,
      signatureRequired: options.signatureRequired ?? false,
    });

    if (transaction.status !== "SUCCESS") {
      const reason = (transaction.messages ?? [])
        .map((message) => message.text)
        .filter(Boolean)
        .join("; ");
      console.error(
        `Shippo refused the label for order ${order.id}: ${reason || transaction.status}`
      );
      return order;
    }

    return (
      (await attachShipmentLabel(order.id, {
        carrier: order.shipment.carrier,
        labelUrl: transaction.label_url ?? null,
        service: order.shipment.service,
        trackingNumber: transaction.tracking_number ?? null,
        trackingUrl: transaction.tracking_url_provider ?? null,
        transactionId: transaction.object_id,
      })) ?? order
    );
  } catch (error) {
    console.error(
      `Unable to buy a shipping label for order ${order.id}`,
      error
    );
    return order;
  }
}
