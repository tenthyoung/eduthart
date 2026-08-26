import type { SavedAddress } from "@/lib/collectors/address-format";
import { normalizeCurrency } from "@/lib/commerce/money";
import {
  createDocumentId,
  getRootDocument,
  listRootDocuments,
  saveRootDocument,
  type StoredDocument,
} from "@/lib/store/document-store";

const ORDERS_COLLECTION = "orders";

export type OrderStatus =
  "awaiting_payment" | "cancelled" | "paid" | "refunded";

export type OrderLineItem = {
  artistUid: string;
  artistUsername: string;
  artworkKey: string;
  href: string;
  imageUrl: string | null;
  itemId: string;
  title: string;
  unitAmountMinor: number;
};

export type Order = {
  billingAddress: SavedAddress | null;
  buyerEmail: string | null;
  buyerName: string | null;
  buyerUid: string;
  cancelledAt: string | null;
  createdAt: string;
  currency: string;
  id: string;
  items: OrderLineItem[];
  number: string;
  paidAt: string | null;
  sellerName: string;
  sellerUid: string;
  shippingAddress: SavedAddress | null;
  shippingAmountMinor: number;
  status: OrderStatus;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  subtotalMinor: number;
  totalMinor: number;
  updatedAt: string;
};

/**
 * Human-readable order reference.
 *
 * The document id is what everything joins on; this is what a collector quotes
 * in an email, so it is short, uppercase, and free of ambiguous characters.
 */
function buildOrderNumber() {
  const alphabet = "ACDEFGHJKLMNPQRTUVWXY3479";
  let reference = "";

  for (let index = 0; index < 8; index += 1) {
    reference += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `EA-${reference}`;
}

function toOrder(document: StoredDocument): Order {
  const readString = (field: string) =>
    typeof document[field] === "string" ? (document[field] as string) : null;
  const readNumber = (field: string) =>
    typeof document[field] === "number" ? (document[field] as number) : 0;

  return {
    billingAddress: (document.billingAddress as SavedAddress | null) ?? null,
    buyerEmail: readString("buyerEmail"),
    buyerName: readString("buyerName"),
    buyerUid: readString("buyerUid") ?? "",
    cancelledAt: readString("cancelledAt"),
    createdAt: readString("createdAt") ?? "",
    currency: normalizeCurrency(readString("currency")),
    id: document.id,
    items: Array.isArray(document.items)
      ? (document.items as OrderLineItem[])
      : [],
    number: readString("number") ?? document.id,
    paidAt: readString("paidAt"),
    sellerName: readString("sellerName") ?? "",
    sellerUid: readString("sellerUid") ?? "",
    shippingAddress: (document.shippingAddress as SavedAddress | null) ?? null,
    shippingAmountMinor: readNumber("shippingAmountMinor"),
    status: (readString("status") as OrderStatus) ?? "awaiting_payment",
    stripeCheckoutSessionId: readString("stripeCheckoutSessionId"),
    stripePaymentIntentId: readString("stripePaymentIntentId"),
    subtotalMinor: readNumber("subtotalMinor"),
    totalMinor: readNumber("totalMinor"),
    updatedAt: readString("updatedAt") ?? "",
  };
}

export type CreateOrderInput = {
  billingAddress: SavedAddress | null;
  buyerEmail: string | null;
  buyerName: string | null;
  buyerUid: string;
  currency: string;
  items: OrderLineItem[];
  sellerName: string;
  sellerUid: string;
  shippingAddress: SavedAddress | null;
  shippingAmountMinor: number;
};

export async function createOrder(input: CreateOrderInput) {
  const now = new Date().toISOString();
  const id = createDocumentId("ord");
  const subtotalMinor = input.items.reduce(
    (total, item) => total + item.unitAmountMinor,
    0
  );

  const saved = await saveRootDocument(ORDERS_COLLECTION, id, {
    ...input,
    cancelledAt: null,
    createdAt: now,
    currency: normalizeCurrency(input.currency),
    number: buildOrderNumber(),
    paidAt: null,
    status: "awaiting_payment" satisfies OrderStatus,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    subtotalMinor,
    totalMinor: subtotalMinor + input.shippingAmountMinor,
    updatedAt: now,
  });

  return toOrder(saved);
}

export async function getOrder(orderId: string) {
  const document = await getRootDocument(ORDERS_COLLECTION, orderId);
  return document ? toOrder(document) : null;
}

export async function findOrderByCheckoutSession(sessionId: string) {
  const documents = await listRootDocuments(ORDERS_COLLECTION, [
    { field: "stripeCheckoutSessionId", value: sessionId },
  ]);

  return documents[0] ? toOrder(documents[0]) : null;
}

async function listOrdersBy(field: "buyerUid" | "sellerUid", uid: string) {
  const documents = await listRootDocuments(ORDERS_COLLECTION, [
    { field, value: uid },
  ]);

  return documents
    .map(toOrder)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export function listPurchases(uid: string) {
  return listOrdersBy("buyerUid", uid);
}

export function listSales(uid: string) {
  return listOrdersBy("sellerUid", uid);
}

export async function attachCheckoutSession(
  orderId: string,
  sessionId: string
) {
  await saveRootDocument(ORDERS_COLLECTION, orderId, {
    stripeCheckoutSessionId: sessionId,
    updatedAt: new Date().toISOString(),
  });
}

export async function markOrderPaid(
  orderId: string,
  details: { paymentIntentId: string | null }
) {
  const now = new Date().toISOString();

  const saved = await saveRootDocument(ORDERS_COLLECTION, orderId, {
    paidAt: now,
    status: "paid" satisfies OrderStatus,
    stripePaymentIntentId: details.paymentIntentId,
    updatedAt: now,
  });

  return toOrder(saved);
}

export async function markOrderCancelled(orderId: string) {
  const now = new Date().toISOString();

  const saved = await saveRootDocument(ORDERS_COLLECTION, orderId, {
    cancelledAt: now,
    status: "cancelled" satisfies OrderStatus,
    updatedAt: now,
  });

  return toOrder(saved);
}
