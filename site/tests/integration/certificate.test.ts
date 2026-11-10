import { describe, expect, test } from "vitest";

import { GET as certificateRoute } from "@/app/api/commerce/orders/[orderId]/certificate/[itemId]/route";
import { POST as confirmRoute } from "@/app/api/commerce/confirm/route";
import VerifyCertificatePage from "@/app/verify/[code]/page";
import {
  findCertificateByCode,
  generateCertificateCode,
  getCertificateForItem,
  issueCertificates,
  normalizeCertificateCode,
  toPublicCertificate,
} from "@/lib/commerce/certificates";
import { buildE2ESessionId } from "@/lib/commerce/e2e-payments";
import { getOrder } from "@/lib/commerce/orders";

import {
  addAddress,
  addToCart,
  checkout,
  createAccount,
  seedGallery,
} from "./support/accounts";
import { callRoute, callRouteOk } from "./support/routes";

/**
 * The certificate of authenticity that comes with every original sold.
 *
 * It is issued by fulfilment, downloaded by the two sides of the sale, and
 * checked by anyone with the code, so these cover all three, and that the
 * public side never learns who bought the piece.
 */

const SHIPPING = {
  city: "Brooklyn",
  line1: "18 Harbour Road",
  name: "Robin Buyer",
  postalCode: "11201",
  region: "NY",
};

async function sell(suffix: string) {
  const { artist, artwork } = await seedGallery(suffix);
  const collector = await createAccount({
    displayName: "Robin Buyer",
    uid: `collector-${suffix}`,
  });
  await addAddress(collector.uid, SHIPPING);
  await addToCart(collector.uid, artwork);
  const order = await checkout(collector.uid);
  const [item] = order.items;

  return { artist, artwork, collector, item: item!, order };
}

describe("certificate codes", () => {
  test("are twelve unambiguous characters in three groups", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(generateCertificateCode()).toMatch(
        /^[ACDEFGHJKMNPQRTUVWXY3479]{4}-[ACDEFGHJKMNPQRTUVWXY3479]{4}-[ACDEFGHJKMNPQRTUVWXY3479]{4}$/
      );
    }
  });

  test("do not repeat", () => {
    const codes = new Set(
      Array.from({ length: 500 }, () => generateCertificateCode())
    );
    expect(codes.size).toBe(500);
  });

  test("are accepted however they were typed", () => {
    expect(normalizeCertificateCode("kt4v-9mqe-xd3a")).toBe("KT4V-9MQE-XD3A");
    expect(normalizeCertificateCode(" KT4V 9MQE XD3A ")).toBe("KT4V-9MQE-XD3A");
    expect(normalizeCertificateCode("KT4V9MQEXD3A")).toBe("KT4V-9MQE-XD3A");
    expect(normalizeCertificateCode("too-short")).toBeNull();
    expect(normalizeCertificateCode("")).toBeNull();
  });
});

describe("issuing a certificate", () => {
  test("a paid order gets one for each original, with the facts frozen at checkout", async () => {
    const { order } = await sell("cert-issue");
    const paid = (await getOrder(order.id))!;

    const certificate = await getCertificateForItem(
      paid.id,
      paid.items[0]!.itemId
    );

    expect(certificate).not.toBeNull();
    expect(certificate).toMatchObject({
      artistName: "Marina Vale",
      dimensions: "24 × 36 in",
      medium: "Oil on canvas",
      title: "Harbour Light",
      yearCreated: "2026",
    });
    expect(certificate!.code).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){2}$/);
  });

  test("confirming the same sale twice keeps the first code", async () => {
    const { collector, order } = await sell("cert-twice");
    const first = await getCertificateForItem(order.id, order.items[0]!.itemId);

    await callRouteOk(confirmRoute, {
      as: collector.uid,
      body: { sessionId: buildE2ESessionId(order.id) },
      path: "/api/commerce/confirm",
    });
    const again = await issueCertificates((await getOrder(order.id))!);

    expect(again).toHaveLength(1);
    expect(again[0]!.code).toBe(first!.code);
  });

  test("the public view carries no buyer or order details", async () => {
    const { order } = await sell("cert-public");
    const certificate = (await getCertificateForItem(
      order.id,
      order.items[0]!.itemId
    ))!;

    const publicView = toPublicCertificate(certificate);
    const serialised = JSON.stringify(publicView);

    expect(publicView).not.toHaveProperty("orderId");
    expect(publicView).not.toHaveProperty("orderNumber");
    expect(serialised).not.toContain(order.id);
    expect(serialised).not.toContain(order.number);
    expect(serialised).not.toContain("Robin Buyer");
    expect(serialised).not.toContain("Harbour Road");
  });
});

describe("downloading a certificate", () => {
  test("the buyer and the artist can both fetch it", async () => {
    const { artist, collector, item, order } = await sell("cert-download");
    const path = `/api/commerce/orders/${order.id}/certificate/${item.itemId}?download=0`;

    for (const uid of [collector.uid, artist.uid]) {
      const html = await callRouteOk<
        string,
        { itemId: string; orderId: string }
      >(certificateRoute, {
        as: uid,
        params: { itemId: item.itemId, orderId: order.id },
        path,
      });

      expect(html).toContain("Certificate of authenticity");
      expect(html).toContain("Harbour Light");
      expect(html).toContain("Marina Vale");
      expect(html).toContain("<svg");
      // The printed link uses the canonical host, not one that redirects.
      expect(html).toContain("eduthart.com/verify/");
    }
  });

  test("does not put the buyer's name, address or order number on the certificate", async () => {
    const { collector, item, order } = await sell("cert-private");

    const html = await callRouteOk<string, { itemId: string; orderId: string }>(
      certificateRoute,
      {
        as: collector.uid,
        params: { itemId: item.itemId, orderId: order.id },
        path: `/api/commerce/orders/${order.id}/certificate/${item.itemId}?download=0`,
      }
    );

    expect(html).not.toContain("Robin Buyer");
    expect(html).not.toContain("Harbour Road");
    expect(html).not.toContain(order.number);
  });

  test("refuses someone who was not part of the sale", async () => {
    const { item, order } = await sell("cert-stranger");
    const stranger = await createAccount({ uid: "collector-stranger" });

    const result = await callRoute<{ error: { code: string } }, never>(
      certificateRoute as never,
      {
        as: stranger.uid,
        params: { itemId: item.itemId, orderId: order.id } as never,
        path: `/api/commerce/orders/${order.id}/certificate/${item.itemId}`,
      }
    );

    expect(result.status).toBe(403);
  });

  test("needs a signed-in account", async () => {
    const { item, order } = await sell("cert-anonymous");

    const result = await callRoute<unknown, never>(certificateRoute as never, {
      params: { itemId: item.itemId, orderId: order.id } as never,
      path: `/api/commerce/orders/${order.id}/certificate/${item.itemId}`,
    });

    expect(result.status).toBe(401);
  });
});

describe("verifying a certificate", () => {
  test("finds it from the code, however it is typed", async () => {
    const { item, order } = await sell("cert-verify");
    const certificate = (await getCertificateForItem(order.id, item.itemId))!;

    const found = await findCertificateByCode(
      certificate.code.toLowerCase().replaceAll("-", " ")
    );

    expect(found?.id).toBe(certificate.id);
  });

  test("shows the public page for a real code and a not-found for a made-up one", async () => {
    const { item, order } = await sell("cert-page");
    const certificate = (await getCertificateForItem(order.id, item.itemId))!;

    await expect(
      VerifyCertificatePage({
        params: Promise.resolve({ code: certificate.code }),
      })
    ).resolves.toBeTruthy();

    await expect(
      VerifyCertificatePage({
        params: Promise.resolve({ code: "AAAA-AAAA-AAAA" }),
      })
    ).rejects.toThrow();
  });
});
