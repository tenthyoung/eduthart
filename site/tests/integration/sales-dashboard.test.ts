import { describe, expect, test } from "vitest";

import { GET as salesRoute } from "@/app/api/artists/sales/route";
import {
  getSaleStage,
  summarizeSales,
  type SalesDashboard,
} from "@/lib/artists/sales-dashboard";
import { splitSale } from "@/lib/commerce/commission";
import { EMPTY_SHIPMENT, type Order } from "@/lib/commerce/orders";

import {
  addAddress,
  addToCart,
  checkout,
  createAccount,
  publishArtwork,
  saveFavorite,
  seedGallery,
} from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * The artist's sales dashboard (EDUTHA-99).
 *
 * The acceptance bar from the ticket: an artist sees only their own orders,
 * and the totals match the order snapshots. Payouts are not covered because
 * they do not exist yet; they wait on Stripe Connect (EDUTHA-93).
 */

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    billingAddress: null,
    buyerEmail: "buyer@example.com",
    buyerName: "Robin Buyer",
    buyerUid: "buyer",
    cancelledAt: null,
    createdAt: "2026-11-01T10:00:00.000Z",
    currency: "USD",
    id: "ord_1",
    items: [],
    number: "EA-TEST0001",
    paidAt: "2026-11-01T10:05:00.000Z",
    sellerName: "Marina Vale",
    sellerUid: "artist",
    shipment: { ...EMPTY_SHIPMENT },
    shippingAddress: null,
    shippingAmountMinor: 5_000,
    status: "paid",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    subtotalMinor: 240_000,
    totalMinor: 245_000,
    updatedAt: "2026-11-01T10:05:00.000Z",
    ...overrides,
  };
}

describe("the 33% commission", () => {
  test("splits an artwork price into the fee and the artist's 67%", () => {
    expect(splitSale(240_000)).toEqual({
      artistShareMinor: 160_800,
      platformFeeMinor: 79_200,
    });
  });

  test("always adds back up to the price, whichever way the cent rounds", () => {
    for (const amount of [1, 2, 99, 101, 12_345, 99_999]) {
      const { artistShareMinor, platformFeeMinor } = splitSale(amount);
      expect(artistShareMinor + platformFeeMinor).toBe(amount);
    }
  });

  test("treats a negative or missing amount as nothing", () => {
    expect(splitSale(-500)).toEqual({
      artistShareMinor: 0,
      platformFeeMinor: 0,
    });
    expect(splitSale(Number.NaN)).toEqual({
      artistShareMinor: 0,
      platformFeeMinor: 0,
    });
  });
});

describe("summarising an artist's sales", () => {
  test("counts paid orders, lists refunds without earnings, and drops unpaid ones", () => {
    const dashboard = summarizeSales([
      buildOrder({ id: "paid" }),
      buildOrder({ id: "refunded", status: "refunded" }),
      buildOrder({ id: "abandoned", paidAt: null, status: "awaiting_payment" }),
      buildOrder({ id: "cancelled", paidAt: null, status: "cancelled" }),
    ]);

    expect(dashboard.sales.map((sale) => sale.orderId).sort()).toEqual([
      "paid",
      "refunded",
    ]);
    expect(dashboard.totals).toEqual([
      {
        artistShareMinor: 160_800,
        artworkMinor: 240_000,
        currency: "USD",
        platformFeeMinor: 79_200,
        salesCount: 1,
      },
    ]);

    const refund = dashboard.sales.find((sale) => sale.orderId === "refunded");
    expect(refund).toMatchObject({
      artistShareMinor: 0,
      earning: false,
      stage: "returned",
    });
  });

  test("leaves shipping out of the earnings", () => {
    const [total] = summarizeSales([
      buildOrder({ shippingAmountMinor: 90_000 }),
    ]).totals;

    expect(total.artworkMinor).toBe(240_000);
    expect(total.artistShareMinor).toBe(160_800);
  });

  test("keeps currencies apart rather than adding dollars to euros", () => {
    const { totals } = summarizeSales([
      buildOrder({ id: "usd" }),
      buildOrder({ currency: "EUR", id: "eur", subtotalMinor: 100_000 }),
    ]);

    expect(totals.map((total) => total.currency)).toEqual(["USD", "EUR"]);
    expect(totals[1].artistShareMinor).toBe(67_000);
  });

  test("groups sales by what the artist still has to do", () => {
    const withShipment = (status: Order["shipment"]["status"]) =>
      buildOrder({ shipment: { ...EMPTY_SHIPMENT, status } });

    expect(getSaleStage(withShipment("pending"))).toBe("to_ship");
    expect(getSaleStage(withShipment("label_purchased"))).toBe("to_ship");
    expect(getSaleStage(withShipment("transit"))).toBe("shipped");
    expect(getSaleStage(withShipment("failure"))).toBe("shipped");
    expect(getSaleStage(withShipment("delivered"))).toBe("delivered");
    expect(getSaleStage(withShipment("returned"))).toBe("returned");
    expect(getSaleStage(buildOrder({ status: "refunded" }))).toBe("returned");

    const { stageCounts } = summarizeSales([
      withShipment("pending"),
      withShipment("transit"),
      withShipment("delivered"),
    ]);
    expect(stageCounts).toEqual({
      delivered: 1,
      returned: 0,
      shipped: 1,
      to_ship: 1,
    });
  });

  test("lists the newest sale first", () => {
    const { sales } = summarizeSales([
      buildOrder({ id: "older", paidAt: "2026-10-01T00:00:00.000Z" }),
      buildOrder({ id: "newer", paidAt: "2026-11-02T00:00:00.000Z" }),
    ]);

    expect(sales.map((sale) => sale.orderId)).toEqual(["newer", "older"]);
  });
});

describe("the sales dashboard route", () => {
  const SHIPPING = {
    city: "Brooklyn",
    line1: "18 Harbour Road",
    name: "Robin Buyer",
    postalCode: "11201",
    region: "NY",
  };

  test("shows the artist their own sale, with totals that match the order", async () => {
    const { artist, artwork } = await seedGallery("sales-dashboard");
    const collector = await createAccount({
      displayName: "Robin Buyer",
      email: "robin.sales@example.com",
      uid: "collector-sales-dashboard",
    });
    await addAddress(collector.uid, SHIPPING);
    await saveFavorite(collector.uid, artwork);
    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid);

    const { dashboard } = await callRouteOk<{ dashboard: SalesDashboard }>(
      salesRoute,
      { as: artist.uid, path: "/api/artists/sales" }
    );

    expect(dashboard.sales).toHaveLength(1);
    expect(dashboard.sales[0]).toMatchObject({
      artworkMinor: order.subtotalMinor,
      number: order.number,
      orderId: order.id,
      shippingMinor: order.shippingAmountMinor,
    });

    const [total] = dashboard.totals;
    expect(total.artworkMinor).toBe(order.subtotalMinor);
    expect(total.platformFeeMinor + total.artistShareMinor).toBe(
      order.subtotalMinor
    );

    const saved = dashboard.artworks.find((entry) =>
      entry.href.endsWith(artwork.itemId)
    );
    expect(saved?.saveCount).toBe(1);
  });

  test("never shows one artist another artist's sales", async () => {
    const { artwork } = await seedGallery("sales-dashboard-other");
    const rival = await createAccount({
      displayName: "Other Artist",
      uid: "artist-sales-dashboard-rival",
      username: "rival-sales-dashboard",
    });
    await publishArtwork({ uid: rival.uid });
    const collector = await createAccount({
      displayName: "Robin Buyer",
      email: "robin.rival@example.com",
      uid: "collector-sales-dashboard-rival",
    });
    await addAddress(collector.uid, SHIPPING);
    await addToCart(collector.uid, artwork);
    await checkout(collector.uid);

    const { dashboard } = await callRouteOk<{ dashboard: SalesDashboard }>(
      salesRoute,
      { as: rival.uid, path: "/api/artists/sales" }
    );

    expect(dashboard.sales).toEqual([]);
    expect(dashboard.totals).toEqual([]);
    expect(dashboard.artworks).toHaveLength(1);
  });

  test("refuses a visitor who is not signed in", async () => {
    const { status } = await callRoute(salesRoute, {
      path: "/api/artists/sales",
    });

    expect(status).toBe(401);
  });
});
