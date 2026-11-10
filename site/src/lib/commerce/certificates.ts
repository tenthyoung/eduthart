import QRCode from "qrcode";

import { brandLogoHtml } from "@/lib/brand/logo";
import { brandMarkTwoToneDataUrl } from "@/lib/brand/mark-svg";
import type { Order, OrderLineItem } from "@/lib/commerce/orders";
import { SITE_URL } from "@/lib/site-url";
import {
  getRootDocument,
  listRootDocuments,
  saveRootDocument,
  type StoredDocument,
} from "@/lib/store/document-store";

const CERTIFICATES_COLLECTION = "certificates";

/** No 0/O, 1/I/L, 2, 5/S, 6, 8/B, so a code read aloud or retyped is not misread. */
const CODE_ALPHABET = "ACDEFGHJKMNPQRTUVWXY3479";
const CODE_LENGTH = 12;

/**
 * What a certificate of authenticity records about one original.
 *
 * It deliberately holds nothing about the buyer: the verification page is
 * public, so everything stored here can be read by anyone with the code.
 * `orderNumber` is the one field kept for the buyer's copy and is never shown
 * on the public page.
 */
export type Certificate = {
  artistName: string;
  artistUsername: string;
  artworkHref: string;
  code: string;
  dimensions: string | null;
  id: string;
  imageUrl: string | null;
  issuedAt: string;
  itemId: string;
  medium: string | null;
  orderId: string;
  orderNumber: string;
  signatureImageUrl: string | null;
  title: string;
  yearCreated: string | null;
};

/**
 * The part of a certificate safe to show to anyone. The document id is left out
 * as well: it is built from the order id, which is not for public eyes.
 */
export type PublicCertificate = Omit<
  Certificate,
  "id" | "orderId" | "orderNumber"
>;

function readString(document: StoredDocument, field: string) {
  return typeof document[field] === "string"
    ? (document[field] as string)
    : null;
}

function toCertificate(document: StoredDocument): Certificate {
  return {
    artistName: readString(document, "artistName") ?? "",
    artistUsername: readString(document, "artistUsername") ?? "",
    artworkHref: readString(document, "artworkHref") ?? "",
    code: readString(document, "code") ?? "",
    dimensions: readString(document, "dimensions"),
    id: document.id,
    imageUrl: readString(document, "imageUrl"),
    issuedAt: readString(document, "issuedAt") ?? "",
    itemId: readString(document, "itemId") ?? "",
    medium: readString(document, "medium"),
    orderId: readString(document, "orderId") ?? "",
    orderNumber: readString(document, "orderNumber") ?? "",
    signatureImageUrl: readString(document, "signatureImageUrl"),
    title: readString(document, "title") ?? "",
    yearCreated: readString(document, "yearCreated"),
  };
}

/**
 * Copy across only the fields that are meant to be public. Listing them, rather
 * than removing the private ones, means a field added to `Certificate` later
 * stays private until someone decides otherwise.
 */
export function toPublicCertificate(
  certificate: Certificate
): PublicCertificate {
  return {
    artistName: certificate.artistName,
    artistUsername: certificate.artistUsername,
    artworkHref: certificate.artworkHref,
    code: certificate.code,
    dimensions: certificate.dimensions,
    imageUrl: certificate.imageUrl,
    issuedAt: certificate.issuedAt,
    itemId: certificate.itemId,
    medium: certificate.medium,
    signatureImageUrl: certificate.signatureImageUrl,
    title: certificate.title,
    yearCreated: certificate.yearCreated,
  };
}

/** A random, unguessable code such as `KT4V-9MQE-XD3A`. */
export function generateCertificateCode() {
  const characters: string[] = [];

  while (characters.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));

    for (const byte of bytes) {
      // Reject the top of the byte range so every character is equally likely.
      if (
        byte < 256 - (256 % CODE_ALPHABET.length) &&
        characters.length < CODE_LENGTH
      ) {
        characters.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]!);
      }
    }
  }

  return formatCertificateCode(characters.join(""));
}

/** Group a code as `XXXX-XXXX-XXXX`. */
export function formatCertificateCode(value: string) {
  return (value.match(/.{1,4}/g) ?? []).join("-");
}

/** Accept a code however it was typed: lowercase, spaces, or no dashes. */
export function normalizeCertificateCode(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.length === CODE_LENGTH ? formatCertificateCode(compact) : null;
}

function certificateId(orderId: string, itemId: string) {
  return `cert_${orderId}_${itemId}`;
}

function buildCertificate(order: Order, item: OrderLineItem) {
  return {
    artistName: order.sellerName,
    artistUsername: item.artistUsername,
    artworkHref: item.href,
    code: generateCertificateCode(),
    dimensions: item.dimensions ?? null,
    imageUrl: item.imageUrl,
    issuedAt: order.paidAt ?? new Date().toISOString(),
    itemId: item.itemId,
    medium: item.medium ?? null,
    orderId: order.id,
    orderNumber: order.number,
    signatureImageUrl: item.signatureImageUrl ?? null,
    title: item.title,
    yearCreated: item.yearCreated ?? null,
  };
}

/**
 * Issue one certificate for each original in a paid order.
 *
 * Fulfilment can run twice (the Stripe webhook and the success page both call
 * it), so the document id is derived from the order and item: a second run
 * finds the first run's certificate and leaves it alone. If two runs write at
 * the same moment, the code that ends up stored is read back and returned, so
 * every caller reports the code that will actually verify.
 */
export async function issueCertificates(order: Order) {
  const issued: Certificate[] = [];

  for (const item of order.items) {
    const id = certificateId(order.id, item.itemId);
    const existing = await getRootDocument(CERTIFICATES_COLLECTION, id);

    if (existing) {
      issued.push(toCertificate(existing));
      continue;
    }

    await saveRootDocument(
      CERTIFICATES_COLLECTION,
      id,
      buildCertificate(order, item)
    );

    // Read back rather than trust what this call wrote: a concurrent run may
    // have stored its own code over ours.
    const stored = await getRootDocument(CERTIFICATES_COLLECTION, id);

    if (stored) {
      issued.push(toCertificate(stored));
    }
  }

  return issued;
}

export async function getCertificateForItem(orderId: string, itemId: string) {
  const document = await getRootDocument(
    CERTIFICATES_COLLECTION,
    certificateId(orderId, itemId)
  );
  return document ? toCertificate(document) : null;
}

export async function findCertificateByCode(code: string) {
  const normalized = normalizeCertificateCode(code);

  if (!normalized) {
    return null;
  }

  const documents = await listRootDocuments(CERTIFICATES_COLLECTION, [
    { field: "code", value: normalized },
  ]);

  return documents[0] ? toCertificate(documents[0]) : null;
}

/**
 * Look a certificate up for the public verification page.
 *
 * Returns only the public view. The page awaits this, and anything a page
 * awaits can end up in the payload sent to the browser, so the private fields
 * (order id and number) must never be in the value it receives.
 */
export async function findPublicCertificateByCode(code: string) {
  const certificate = await findCertificateByCode(code);
  return certificate ? toPublicCertificate(certificate) : null;
}

export function buildVerificationUrl(code: string) {
  return `${SITE_URL}/verify/${code}`;
}

export function buildCertificateFileName(certificate: Certificate) {
  return `eduthart-certificate-${certificate.code}.html`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(date);
}

/** Only ever embed an image we were given over https. */
function safeImageUrl(value: string | null) {
  return value && /^https:\/\//i.test(value) ? value : null;
}

/**
 * A self-contained certificate, served as a download that also prints cleanly.
 *
 * It follows the invoice: HTML a collector can print or save as a PDF from
 * their browser, so EduthArt takes on no PDF rendering dependency (which would
 * also have to run on Cloudflare Workers). The QR code points at the public
 * verification page.
 */
export async function renderCertificateHtml(certificate: Certificate) {
  const verificationUrl = buildVerificationUrl(certificate.code);
  const qr = await QRCode.toString(verificationUrl, {
    margin: 0,
    type: "svg",
    width: 112,
  });
  const image = safeImageUrl(certificate.imageUrl);
  const signature = safeImageUrl(certificate.signatureImageUrl);

  const facts = [
    ["Artist", certificate.artistName],
    ["Title", certificate.title],
    ["Year", certificate.yearCreated],
    ["Medium", certificate.medium],
    ["Dimensions", certificate.dimensions],
    ["Sold", formatDate(certificate.issuedAt)],
  ]
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) =>
        `<div class="fact"><dt>${escapeHtml(label!)}</dt><dd>${escapeHtml(value!)}</dd></div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Certificate of authenticity ${escapeHtml(certificate.code)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { background: #f4f4f2; color: #111; font-family: "Inter Tight", -apple-system, Segoe UI, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; }
  .sheet { background: #fff; border: 1px solid #111; margin: 0 auto; max-width: 720px; padding: 56px; }
  h1 { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; margin: 40px 0 8px; }
  .lede { color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 32px; max-width: 520px; }
  .work { align-items: flex-start; border-top: 1px solid #111; display: flex; gap: 28px; padding-top: 28px; }
  .work img { height: auto; max-height: 220px; max-width: 200px; object-fit: contain; }
  dl { display: grid; gap: 14px 28px; grid-template-columns: 1fr 1fr; margin: 0; }
  .fact dt { color: #777; font-size: 11px; font-weight: 600; letter-spacing: 0.14em; margin: 0 0 4px; text-transform: uppercase; }
  .fact dd { font-size: 16px; font-weight: 600; margin: 0; }
  .sign { align-items: flex-end; border-top: 1px solid #111; display: flex; gap: 28px; justify-content: space-between; margin-top: 36px; padding-top: 24px; }
  .signature img { display: block; max-height: 64px; max-width: 220px; }
  .signature .line { border-top: 1px solid #111; color: #555; font-size: 12px; margin-top: 8px; padding-top: 6px; }
  .verify { text-align: right; }
  .verify svg { display: block; height: 112px; margin-left: auto; width: 112px; }
  .code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 15px; font-weight: 700; letter-spacing: 0.08em; margin: 10px 0 2px; }
  .muted { color: #666; font-size: 12px; line-height: 1.6; margin: 0; }
  @media (max-width: 560px) {
    .sheet { padding: 28px; }
    .work, .sign { flex-direction: column; }
    .verify { text-align: left; }
    .verify svg { margin-left: 0; }
    dl { grid-template-columns: 1fr; }
  }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { border: 0; max-width: none; padding: 0; }
  }
</style>
</head>
<body>
  <div class="sheet">
    ${brandLogoHtml({ markSrc: brandMarkTwoToneDataUrl(), fontSize: 20 })}
    <h1>Certificate of authenticity</h1>
    <p class="lede">This certifies that the original artwork described below was created by the artist named and sold through EduthArt. Anyone can confirm it is genuine with the code at the bottom of this page.</p>

    <div class="work">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(certificate.title)}" />` : ""}
      <dl>${facts}</dl>
    </div>

    <div class="sign">
      <div class="signature">
        ${signature ? `<img src="${escapeHtml(signature)}" alt="Signature of ${escapeHtml(certificate.artistName)}" />` : ""}
        <div class="line">${escapeHtml(certificate.artistName)}, artist</div>
      </div>
      <div class="verify">
        ${qr}
        <p class="code">${escapeHtml(certificate.code)}</p>
        <p class="muted">Verify at ${escapeHtml(verificationUrl.replace(/^https?:\/\//, ""))}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
