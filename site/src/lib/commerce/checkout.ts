import type { ListingItemDraft } from "@/lib/artists/listing-flow";
import {
  isPubliclyListed,
  loadListingStudio,
} from "@/lib/artists/listing-store";
import { buildArtworkHref } from "@/lib/artists/public-artwork";
import {
  buildProfileDisplayName,
  loadAccountProfile,
} from "@/lib/auth/profile-store";
import type { SavedAddress } from "@/lib/collectors/address-format";
import { getAddress, getDefaultAddress } from "@/lib/collectors/addresses";
import { buildArtworkKey } from "@/lib/collectors/artwork-reference";
import { readCart } from "@/lib/commerce/cart";
import { normalizeCurrency, toMinorUnits } from "@/lib/commerce/money";
import {
  createOrder,
  attachCheckoutSession,
  type OrderLineItem,
} from "@/lib/commerce/orders";
import { reserveArtwork } from "@/lib/commerce/reservations";
import { resolveShippingAmountMinor } from "@/lib/commerce/shipping";
import { buildE2ESessionId, isE2ECheckout } from "@/lib/commerce/e2e-payments";
import { getStripeClient } from "@/lib/commerce/stripe";
import { ensureStripeCustomer } from "@/lib/commerce/payment-methods";

export type CheckoutRequest = {
  billingAddressId?: string | null;
  billingSameAsShipping?: boolean;
  buyerEmail: string | null;
  buyerName: string | null;
  buyerUid: string;
  origin: string;
  savePaymentMethod?: boolean;
  shippingAddressId?: string | null;
};

function toLineItem(
  item: ListingItemDraft,
  artist: { artistUid: string; artistUsername: string },
  currency: string
): OrderLineItem {
  return {
    artistUid: artist.artistUid,
    artistUsername: artist.artistUsername,
    artworkKey: buildArtworkKey({
      artistUid: artist.artistUid,
      itemId: item.id,
    }),
    href: buildArtworkHref(artist.artistUsername, item.id),
    imageUrl: item.media.mainImageUrl,
    itemId: item.id,
    title: item.artworkDetails.title || "Untitled artwork",
    unitAmountMinor: toMinorUnits(item.pricingInventory.price, currency),
  };
}

async function resolveAddress(
  uid: string,
  id: string | null | undefined,
  kind: "billing" | "shipping"
) {
  if (id) {
    const address = await getAddress(uid, id);

    if (address) {
      return address;
    }
  }

  return getDefaultAddress(uid, kind);
}

/**
 * Build a Stripe Checkout Session for the current cart.
 *
 * Prices, availability, and the seller are all reloaded from the artist's own
 * studio here. Nothing the browser sent is trusted, which is what stops a
 * stale cart or a tampered payload from buying an original at the wrong price.
 */
export async function createCheckoutSession(request: CheckoutRequest) {
  const cart = await readCart(request.buyerUid);

  if (cart.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const sellerUid = cart[0]!.artistUid;

  if (cart.some((entry) => entry.artistUid !== sellerUid)) {
    throw new Error("Checkout supports one artist at a time.");
  }

  if (sellerUid === request.buyerUid) {
    throw new Error("You cannot buy your own artwork.");
  }

  const [sellerProfile, studio] = await Promise.all([
    loadAccountProfile(sellerUid),
    loadListingStudio(sellerUid),
  ]);

  if (!sellerProfile?.username || !studio) {
    throw new Error("This artist is no longer selling on EduthArt.");
  }

  const artist = {
    artistUid: sellerUid,
    artistUsername: sellerProfile.username,
  };
  const items: ListingItemDraft[] = [];

  for (const entry of cart) {
    const item = studio.items.find(
      (candidate) => candidate.id === entry.itemId
    );

    if (!item || !isPubliclyListed(item)) {
      throw new Error(`"${entry.title}" is no longer listed.`);
    }

    if (item.pricingInventory.availability !== "original_available") {
      throw new Error(
        `"${item.artworkDetails.title || "This artwork"}" is no longer available.`
      );
    }

    if (
      toMinorUnits(
        item.pricingInventory.price,
        item.pricingInventory.currency
      ) <= 0
    ) {
      throw new Error(
        `"${item.artworkDetails.title || "This artwork"}" is not priced for checkout.`
      );
    }

    items.push(item);
  }

  const currency = normalizeCurrency(items[0]!.pricingInventory.currency);

  if (
    items.some(
      (item) => normalizeCurrency(item.pricingInventory.currency) !== currency
    )
  ) {
    throw new Error(
      "Every artwork in one checkout must use the same currency."
    );
  }

  const shippingAddress = await resolveAddress(
    request.buyerUid,
    request.shippingAddressId,
    "shipping"
  );

  if (!shippingAddress) {
    throw new Error("Add a shipping address before checking out.");
  }

  // Asking to bill to the shipping address is a decision the collector makes at
  // checkout, so it beats any billing address they happen to have saved.
  const billingAddress = request.billingSameAsShipping
    ? shippingAddress
    : ((await resolveAddress(
        request.buyerUid,
        request.billingAddressId,
        "billing"
      )) ?? shippingAddress);

  const lineItems = items.map((item) => toLineItem(item, artist, currency));
  const shippingAmountMinor = items.reduce(
    (total, item) =>
      total + resolveShippingAmountMinor(item, studio.shared, currency),
    0
  );

  const order = await createOrder({
    billingAddress,
    buyerEmail: request.buyerEmail,
    buyerName: request.buyerName,
    buyerUid: request.buyerUid,
    currency,
    items: lineItems,
    sellerName: buildProfileDisplayName(sellerProfile),
    sellerUid,
    shippingAddress,
    shippingAmountMinor,
  });

  // Hold each original before Stripe is involved, so two collectors cannot both
  // reach the payment page for the same one-of-a-kind piece.
  await Promise.all(
    lineItems.map((item) =>
      reserveArtwork({
        artworkKey: item.artworkKey,
        buyerUid: request.buyerUid,
        orderId: order.id,
      })
    )
  );

  if (isE2ECheckout()) {
    const sessionId = buildE2ESessionId(order.id);
    await attachCheckoutSession(order.id, sessionId);
    return {
      order,
      url: `${request.origin}/checkout/success?session_id=${sessionId}`,
    };
  }

  const stripe = getStripeClient();
  const customerId = await ensureStripeCustomer({
    email: request.buyerEmail,
    name: request.buyerName,
    uid: request.buyerUid,
  });

  const session = await stripe.checkout.sessions.create({
    cancel_url: `${request.origin}/checkout?cancelled=1`,
    client_reference_id: order.id,
    customer: customerId,
    line_items: [
      ...items.map((item) => ({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            description: `Original artwork by ${order.sellerName}`,
            images: item.media.mainImageUrl
              ? [item.media.mainImageUrl]
              : undefined,
            name: item.artworkDetails.title || "Untitled artwork",
          },
          unit_amount: toMinorUnits(item.pricingInventory.price, currency),
        },
        quantity: 1,
      })),
      ...(shippingAmountMinor > 0
        ? [
            {
              price_data: {
                currency: currency.toLowerCase(),
                product_data: { name: "Shipping and handling" },
                unit_amount: shippingAmountMinor,
              },
              quantity: 1,
            },
          ]
        : []),
    ],
    metadata: { orderId: order.id },
    mode: "payment",
    // Saving the card for later is the collector's choice, and Stripe holds the
    // card details throughout: they never reach EduthArt.
    payment_intent_data: request.savePaymentMethod
      ? { setup_future_usage: "off_session" }
      : undefined,
    success_url: `${request.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  });

  await attachCheckoutSession(order.id, session.id);

  return { order, url: session.url };
}

export type CheckoutAddresses = {
  billing: SavedAddress | null;
  shipping: SavedAddress | null;
};
