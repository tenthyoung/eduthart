import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { POST as trackingWebhookRoute } from "@/app/api/commerce/shipping-webhook/route";
import { getOrder } from "@/lib/commerce/orders";

import {
  addAddress,
  createAccount,
  addToCart,
  checkout,
  findNotification,
  listNotifications,
  publishArtwork,
  type PublishedArtwork,
} from "./support/accounts";
import { callRoute } from "./support/routes";

/**
 * Shipping through Shippo.
 *
 * Shippo is reached over HTTP, so these stub that boundary rather than the
 * modules around it: what runs is the real quoting, label, and tracking code,
 * with recorded carrier responses standing in for the carrier.
 */

const ORIGIN = {
  city: "Santa Fe",
  country: "US",
  line1: "5 Canyon Road",
  line2: null,
  postalCode: "87501",
  region: "NM",
};

const SHIPPING = {
  city: "Brooklyn",
  line1: "18 Harbour Road",
  name: "Robin Buyer",
  postalCode: "11201",
  region: "NY",
};

const RATE = {
  amount: "18.40",
  currency: "USD",
  estimated_days: 3,
  object_id: "rate_abc123",
  provider: "USPS",
  servicelevel: { name: "Priority Mail" },
};

type StubResponse = { body: unknown; status?: number };

/** Route every api.goshippo.com call to a recorded response. */
function stubShippo(
  routes: Record<string, StubResponse | (() => StubResponse)>
) {
  const calls: Array<{ body: unknown; url: string }> = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (!url.startsWith("https://api.goshippo.com")) {
        throw new Error(`Unexpected fetch to ${url}`);
      }

      calls.push({
        body: init?.body ? JSON.parse(init.body as string) : null,
        url,
      });

      const key = Object.keys(routes).find((candidate) =>
        url.includes(candidate)
      );

      if (!key) {
        return new Response("not stubbed", { status: 404 });
      }

      const route = routes[key]!;
      const { body, status } = typeof route === "function" ? route() : route;

      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: status ?? 200,
      });
    })
  );

  return calls;
}

async function measuredArtwork(suffix: string): Promise<{
  artist: { uid: string };
  artwork: PublishedArtwork;
}> {
  const artist = await createAccount({
    displayName: "Marina Vale",
    uid: `artist-${suffix}`,
    username: `marina-${suffix}`,
  });
  const artwork = await publishArtwork({
    shippingOrigin: ORIGIN,
    uid: artist.uid,
    weight: "8",
  });

  return { artist, artwork };
}

async function buyer(suffix: string) {
  const collector = await createAccount({
    displayName: "Robin Buyer",
    email: `robin.${suffix}@example.com`,
    uid: `collector-${suffix}`,
  });
  await addAddress(collector.uid, SHIPPING);
  return collector;
}

beforeEach(() => {
  process.env.SHIPPO_API_TOKEN = "shippo_test_token";
  process.env.SHIPPO_WEBHOOK_SECRET = "webhook-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SHIPPO_API_TOKEN;
  delete process.env.SHIPPO_WEBHOOK_SECRET;
});

describe("live shipping rates", () => {
  test("charges the cheapest live rate and keeps it for the label", async () => {
    const calls = stubShippo({
      "/shipments/": {
        body: {
          object_id: "shp_1",
          rates: [
            { ...RATE, amount: "31.00", object_id: "rate_expensive" },
            RATE,
          ],
        },
      },
      "/transactions/": {
        body: {
          label_url: "https://shippo-labels.test/label.pdf",
          object_id: "txn_1",
          status: "SUCCESS",
          tracking_number: "9400111899",
          tracking_url_provider: "https://tools.usps.com/9400111899",
        },
      },
    });

    const { artwork } = await measuredArtwork("live-rate");
    const collector = await buyer("live-rate");
    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid);

    // $2,400 for the piece plus the $18.40 live rate, not the artist's $50.
    expect(order.shippingAmountMinor).toBe(1_840);
    expect(order.totalMinor).toBe(241_840);
    expect(order.shipment.carrier).toBe("USPS");
    expect(order.shipment.service).toBe("Priority Mail");

    const shipment = calls.find((call) => call.url.includes("/shipments/"));
    expect(shipment?.body).toMatchObject({
      address_from: { city: "Santa Fe", zip: "87501" },
      address_to: { city: "Brooklyn", zip: "11201" },
      parcels: [{ distance_unit: "in", mass_unit: "lb", weight: "8" }],
    });

    // The label is bought against the exact rate the collector was charged.
    const transaction = calls.find((call) =>
      call.url.includes("/transactions/")
    );
    expect(transaction?.body).toMatchObject({ rate: "rate_abc123" });
  });

  test("falls back to the artist's stated rate when Shippo fails", async () => {
    stubShippo({ "/shipments/": { body: { detail: "down" }, status: 500 } });

    const { artwork } = await measuredArtwork("rate-outage");
    const collector = await buyer("rate-outage");
    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid);

    // The sale still completes, at the artist's own $50 domestic rate.
    expect(order.status).toBe("paid");
    expect(order.shippingAmountMinor).toBe(5_000);
    expect(order.shipment.rateId).toBeNull();
  });

  test("falls back when the artist never measured the piece", async () => {
    const calls = stubShippo({});

    const artist = await createAccount({
      displayName: "Marina Vale",
      uid: "artist-unmeasured",
      username: "marina-unmeasured",
    });
    // Published with width and height but no weight.
    const artwork = await publishArtwork({
      shippingOrigin: ORIGIN,
      uid: artist.uid,
    });
    const collector = await buyer("unmeasured");
    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid);

    expect(order.shippingAmountMinor).toBe(5_000);
    // Shippo is never asked to quote a parcel we cannot describe.
    expect(calls).toHaveLength(0);
  });
});

describe("labels", () => {
  test("records the label and tells nobody until it moves", async () => {
    stubShippo({
      "/shipments/": { body: { object_id: "shp_2", rates: [RATE] } },
      "/transactions/": {
        body: {
          label_url: "https://shippo-labels.test/label.pdf",
          object_id: "txn_2",
          status: "SUCCESS",
          tracking_number: "9400111800",
          tracking_url_provider: "https://tools.usps.com/9400111800",
        },
      },
    });

    const { artwork } = await measuredArtwork("label");
    const collector = await buyer("label");
    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid);

    expect(order.shipment.status).toBe("label_purchased");
    expect(order.shipment.labelUrl).toBe(
      "https://shippo-labels.test/label.pdf"
    );
    expect(order.shipment.trackingNumber).toBe("9400111800");
    expect(order.shipment.shippedAt).not.toBeNull();

    // A label is not a departure, so the buyer is not told it shipped yet.
    const notifications = await listNotifications(collector.uid);
    expect(notifications.map((entry) => entry.kind)).not.toContain(
      "order_shipped"
    );
  });

  test("a refused label leaves the paid order intact", async () => {
    stubShippo({
      "/shipments/": { body: { object_id: "shp_3", rates: [RATE] } },
      "/transactions/": {
        body: {
          messages: [{ text: "Insufficient postage balance." }],
          object_id: "txn_3",
          status: "ERROR",
        },
      },
    });

    const { artwork } = await measuredArtwork("label-error");
    const collector = await buyer("label-error");
    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid);

    expect(order.status).toBe("paid");
    expect(order.shipment.status).toBe("pending");
    expect(order.shipment.transactionId).toBeNull();
    // The sale is still recorded and the buyer still hears about it.
    expect(
      await findNotification(collector.uid, "order_confirmed")
    ).toBeDefined();
  });
});

describe("tracking webhook", () => {
  async function shippedOrder(suffix: string, trackingNumber: string) {
    stubShippo({
      "/shipments/": { body: { object_id: `shp_${suffix}`, rates: [RATE] } },
      "/transactions/": {
        body: {
          label_url: "https://shippo-labels.test/label.pdf",
          object_id: `txn_${suffix}`,
          status: "SUCCESS",
          tracking_number: trackingNumber,
          tracking_url_provider: `https://tools.usps.com/${trackingNumber}`,
        },
      },
    });

    const { artwork } = await measuredArtwork(suffix);
    const collector = await buyer(suffix);
    await addToCart(collector.uid, artwork);
    const order = await checkout(collector.uid);

    return { collector, order };
  }

  test("rejects a call without the shared secret", async () => {
    const { status } = await callRoute(trackingWebhookRoute, {
      body: { data: { carrier: "usps", tracking_number: "9400111801" } },
      path: "/api/commerce/shipping-webhook",
    });

    expect(status).toBe(401);
  });

  test("moves the order and notifies the buyer from Shippo's own record", async () => {
    const { collector, order } = await shippedOrder("transit", "9400111802");

    stubShippo({
      "/tracks/": {
        body: {
          tracking_status: {
            status: "TRANSIT",
            status_date: "2026-09-15T10:00:00Z",
          },
        },
      },
    });

    const { status } = await callRoute(trackingWebhookRoute, {
      // The payload claims delivered; only the re-fetched status is believed.
      body: {
        data: {
          carrier: "usps",
          status: "DELIVERED",
          tracking_number: "9400111802",
        },
      },
      path: "/api/commerce/shipping-webhook?token=webhook-secret",
    });

    expect(status).toBe(200);

    const updated = await getOrder(order.id);
    expect(updated?.shipment.status).toBe("transit");
    expect(updated?.shipment.deliveredAt).toBeNull();

    const shipped = await findNotification(collector.uid, "order_shipped");
    expect(shipped?.body).toContain("9400111802");
  });

  test("records delivery once, however many times Shippo retries", async () => {
    const { collector, order } = await shippedOrder("delivered", "9400111803");

    stubShippo({
      "/tracks/": {
        body: {
          tracking_status: {
            status: "DELIVERED",
            status_date: "2026-09-18T16:20:00Z",
          },
        },
      },
    });

    const call = () =>
      callRoute(trackingWebhookRoute, {
        body: { data: { carrier: "usps", tracking_number: "9400111803" } },
        path: "/api/commerce/shipping-webhook?token=webhook-secret",
      });

    await call();
    await call();

    const updated = await getOrder(order.id);
    expect(updated?.shipment.status).toBe("delivered");
    expect(updated?.shipment.deliveredAt).toBe("2026-09-18T16:20:00Z");

    const delivered = (await import("./support/accounts")).listNotifications;
    const all = await delivered(collector.uid);
    expect(
      all.filter((entry) => entry.kind === "order_delivered")
    ).toHaveLength(1);
  });
});
