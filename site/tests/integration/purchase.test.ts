import { describe, expect, test } from "vitest";

import { GET as invoiceRoute } from "@/app/api/commerce/orders/[orderId]/invoice/route";
import {
  GET as readCartRoute,
  POST as addToCartRoute,
} from "@/app/api/cart/route";
import { POST as checkoutRoute } from "@/app/api/commerce/checkout/route";
import { POST as confirmRoute } from "@/app/api/commerce/confirm/route";
import { buildE2ESessionId } from "@/lib/commerce/e2e-payments";
import { getPublicArtwork } from "@/lib/artists/public-artwork";

import {
  addAddress,
  addToCart,
  checkout,
  createAccount,
  findNotification,
  listNotifications,
  saveFavorite,
  seedGallery,
  type PublishedArtwork,
} from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * What a sale does to the rest of the system.
 *
 * The browser suite still walks one collector from the artwork page to the
 * invoice, because that journey is the product. These cover the consequences
 * that happen server-side and were previously only reachable by driving three
 * accounts through the UI in one test: who gets told, what the paperwork says,
 * and what the piece's availability becomes.
 */

const SHIPPING = {
  city: "Brooklyn",
  line1: "18 Harbour Road",
  name: "Robin Buyer",
  postalCode: "11201",
  region: "NY",
};

async function buy(uid: string, artwork: PublishedArtwork) {
  await addToCart(uid, artwork);
  return checkout(uid);
}

describe("completing a purchase", () => {
  test("records the order, empties the cart, and takes the original off the market", async () => {
    const { artwork } = await seedGallery("purchase");
    const collector = await createAccount({
      displayName: "Robin Buyer",
      email: "robin.buyer@example.com",
      uid: "collector-purchase",
    });
    await addAddress(collector.uid, SHIPPING);

    const order = await buy(collector.uid, artwork);

    expect(order.status).toBe("paid");
    // $2,400 for the piece plus the artist's $50 domestic shipping.
    expect(order.totalMinor).toBe(245_000);
    expect(order.sellerName).toBe("Marina Vale");

    const { items } = await callRouteOk<{ items: unknown[] }>(readCartRoute, {
      as: collector.uid,
      path: "/api/cart",
    });
    expect(items).toEqual([]);

    const listing = await getPublicArtwork(artwork.username, artwork.itemId);
    expect(listing?.item.pricingInventory.availability).toBe("sold");
  });

  test("tells the buyer their order is confirmed and the artist that it sold", async () => {
    const { artist, artwork } = await seedGallery("sale-alerts");
    const collector = await createAccount({
      displayName: "Robin Buyer",
      uid: "collector-sale-alerts",
    });
    await addAddress(collector.uid, SHIPPING);

    const order = await buy(collector.uid, artwork);

    const confirmed = await findNotification(collector.uid, "order_confirmed");
    expect(confirmed.title).toBe("Your order is confirmed");
    expect(confirmed.actionHref).toBe(`/account/orders/${order.id}`);

    const sold = await findNotification(artist.uid, "artwork_sold");
    expect(sold.title).toBe('"Harbour Light" sold');
    expect(sold.actionHref).toBe(`/account/orders/${order.id}`);
  });

  test("tells a collector when artwork they saved is sold to someone else", async () => {
    const { artwork } = await seedGallery("sold-alert");
    const watcher = await createAccount({
      displayName: "Sam Watcher",
      uid: "collector-watcher",
    });
    const buyer = await createAccount({
      displayName: "Robin Buyer",
      uid: "collector-rival",
    });

    await saveFavorite(watcher.uid, artwork);
    await addAddress(buyer.uid, { ...SHIPPING, city: "Hudson" });
    await buy(buyer.uid, artwork);

    const alert = await findNotification(watcher.uid, "saved_artwork_sold");
    expect(alert.title).toBe("An artwork you saved has sold");
    expect(alert.actionHref).toBe(artwork.href);
  });

  test("spares the buyer the alert for the piece they just bought", async () => {
    const { artwork } = await seedGallery("self-alert");
    const buyer = await createAccount({
      displayName: "Robin Buyer",
      uid: "collector-self-alert",
    });

    // The buyer had saved it themselves before checking out.
    await saveFavorite(buyer.uid, artwork);
    await addAddress(buyer.uid, SHIPPING);
    await buy(buyer.uid, artwork);

    const kinds = (await listNotifications(buyer.uid)).map(
      (notification) => notification.kind
    );

    expect(kinds).toContain("order_confirmed");
    expect(kinds).not.toContain("saved_artwork_sold");
  });

  test("fulfilment is idempotent, so confirming twice does not notify twice", async () => {
    const { artist, artwork } = await seedGallery("idempotent");
    const collector = await createAccount({
      displayName: "Robin Buyer",
      uid: "collector-idempotent",
    });
    await addAddress(collector.uid, SHIPPING);

    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid);

    // Stripe retries webhooks and the success page confirms independently, so
    // the same session lands more than once in practice.
    await callRouteOk(confirmRoute, {
      as: collector.uid,
      body: { sessionId: buildE2ESessionId(order.id) },
      path: "/api/commerce/confirm",
    });

    await findNotification(collector.uid, "order_confirmed");
    await findNotification(artist.uid, "artwork_sold");
  });
});

describe("checkout guards", () => {
  test("refuses to check out without a shipping address", async () => {
    const { artwork } = await seedGallery("no-address");
    const collector = await createAccount({ uid: "collector-no-address" });

    await addToCart(collector.uid, artwork);
    const result = await callRoute<{ error: { message: string } }>(
      checkoutRoute,
      { as: collector.uid, body: {}, path: "/api/commerce/checkout" }
    );

    expect(result.status).toBe(400);
    expect(result.body.error.message).toMatch(/shipping address/i);
  });

  test("refuses to sell an original that has already sold", async () => {
    const { artwork } = await seedGallery("already-sold");
    const first = await createAccount({ uid: "collector-first" });
    const second = await createAccount({ uid: "collector-second" });

    await addAddress(first.uid, SHIPPING);
    await buy(first.uid, artwork);

    const result = await callRoute<{ error: { message: string } }>(
      addToCartRoute,
      {
        as: second.uid,
        body: { itemId: artwork.itemId, username: artwork.username },
        path: "/api/cart",
      }
    );

    expect(result.status).toBe(409);
  });
});

describe("the invoice", () => {
  test("bills the card to the shipping address when the collector asks it to", async () => {
    const { artwork } = await seedGallery("billing-match");
    const collector = await createAccount({
      displayName: "Robin Buyer",
      uid: "collector-billing-match",
    });

    await addAddress(collector.uid, SHIPPING);
    await addAddress(collector.uid, {
      city: "Albany",
      kind: "billing",
      line1: "9 Ledger Street",
      name: "Robin Buyer",
      postalCode: "12207",
      region: "NY",
    });

    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid, {
      billingSameAsShipping: true,
    });

    const html = await callRouteOk<string, { orderId: string }>(invoiceRoute, {
      as: collector.uid,
      params: { orderId: order.id },
      path: `/api/commerce/orders/${order.id}/invoice?download=0`,
    });

    const billedTo =
      /<h2>Billed to<\/h2>\s*<address>([\s\S]*?)<\/address>/.exec(html)?.[1] ??
      "";

    expect(billedTo).toContain("18 Harbour Road");
    expect(billedTo).not.toContain("9 Ledger Street");
  });

  test("uses the saved billing address when the collector does not", async () => {
    const { artwork } = await seedGallery("billing-separate");
    const collector = await createAccount({
      displayName: "Robin Buyer",
      uid: "collector-billing-separate",
    });

    await addAddress(collector.uid, SHIPPING);
    await addAddress(collector.uid, {
      city: "Albany",
      kind: "billing",
      line1: "9 Ledger Street",
      name: "Robin Buyer",
      postalCode: "12207",
      region: "NY",
    });

    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid);

    const html = await callRouteOk<string, { orderId: string }>(invoiceRoute, {
      as: collector.uid,
      params: { orderId: order.id },
      path: `/api/commerce/orders/${order.id}/invoice?download=0`,
    });

    const billedTo =
      /<h2>Billed to<\/h2>\s*<address>([\s\S]*?)<\/address>/.exec(html)?.[1] ??
      "";

    expect(billedTo).toContain("9 Ledger Street");
  });

  test("is refused to an account that is neither the buyer nor the seller", async () => {
    const { artwork } = await seedGallery("invoice-privacy");
    const collector = await createAccount({ uid: "collector-invoice" });
    const stranger = await createAccount({ uid: "collector-stranger" });

    await addAddress(collector.uid, SHIPPING);
    const order = await buy(collector.uid, artwork);

    const result = await callRoute<unknown, { orderId: string }>(invoiceRoute, {
      as: stranger.uid,
      params: { orderId: order.id },
      path: `/api/commerce/orders/${order.id}/invoice`,
    });

    expect(result.status).toBe(403);
  });
});
