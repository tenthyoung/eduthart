import type {
  ListingItemDraft,
  ListingSharedSettings,
} from "@/lib/artists/listing-flow";
import type { SavedAddress } from "@/lib/collectors/address-format";
import { normalizeCurrency, toMinorUnits } from "@/lib/commerce/money";
import {
  createShippoShipment,
  isShippoConfigured,
  toShippoAddressFromOrigin,
  toShippoAddressFromSaved,
  toShippoParcel,
  type ShippoParcel,
  type ShippoRate,
} from "@/lib/commerce/shippo";

/**
 * Fallback shipping cost when the artist stated neither a rate nor free
 * shipping, and no live rate could be fetched.
 */
export const DEFAULT_SHIPPING_AMOUNT = 45;

export type ShippingQuote = {
  amountMinor: number;
  /** The rate to buy the label from later; null for a stated-rate quote. */
  rate: {
    carrier: string;
    estimatedDays: number | null;
    rateId: string;
    service: string | null;
  } | null;
  source: "free" | "live" | "stated";
};

/**
 * The artist's own stated shipping charge.
 *
 * This is the number they agreed to honour when they published the listing, so
 * it is what every fallback path uses.
 */
export function resolveShippingAmountMinor(
  item: ListingItemDraft,
  shared: ListingSharedSettings,
  currency: string
) {
  if (item.salesVisibility.digitalDownload) {
    return 0;
  }

  const { freeShipping, domesticShipping } = shared.shippingAuthentication;

  if (freeShipping) {
    return 0;
  }

  const stated = Number(domesticShipping);

  if (
    Number.isFinite(stated) &&
    stated >= 0 &&
    domesticShipping.trim() !== ""
  ) {
    return toMinorUnits(stated, currency);
  }

  return toMinorUnits(DEFAULT_SHIPPING_AMOUNT, currency);
}

function statedQuote(
  items: ListingItemDraft[],
  shared: ListingSharedSettings,
  currency: string
): ShippingQuote {
  const amountMinor = items.reduce(
    (total, item) => total + resolveShippingAmountMinor(item, shared, currency),
    0
  );

  return {
    amountMinor,
    rate: null,
    source: shared.shippingAuthentication.freeShipping ? "free" : "stated",
  };
}

/** Cheapest rate Shippo returned in the currency the order is priced in. */
function cheapestRate(rates: ShippoRate[], currency: string) {
  const comparable = rates
    .filter((rate) => normalizeCurrency(rate.currency) === currency)
    .map((rate) => ({ rate, value: Number(rate.amount) }))
    .filter(({ value }) => Number.isFinite(value) && value >= 0);

  if (comparable.length === 0) {
    return null;
  }

  return comparable.reduce((cheapest, candidate) =>
    candidate.value < cheapest.value ? candidate : cheapest
  );
}

/**
 * What shipping this order costs.
 *
 * Live rates come from Shippo, quoted from the artist's origin to the
 * collector's address for the parcels the listing describes. A sale is never
 * blocked on that lookup: if Shippo is unconfigured, the listing is not
 * measured, the rates come back in another currency, or the call fails, the
 * artist's own stated rate is used instead and the reason is logged.
 */
export async function quoteShipping(input: {
  currency: string;
  destination: SavedAddress | null;
  items: ListingItemDraft[];
  sellerName: string;
  shared: ListingSharedSettings;
}): Promise<ShippingQuote> {
  const currency = normalizeCurrency(input.currency);
  const fallback = () => statedQuote(input.items, input.shared, currency);

  if (input.shared.shippingAuthentication.freeShipping) {
    return fallback();
  }

  const physicalItems = input.items.filter(
    (item) => !item.salesVisibility.digitalDownload
  );

  if (physicalItems.length === 0) {
    return { amountMinor: 0, rate: null, source: "free" };
  }

  const origin = input.shared.shippingOriginAddress;

  if (!isShippoConfigured() || !origin || !input.destination) {
    return fallback();
  }

  const parcels: ShippoParcel[] = [];

  for (const item of physicalItems) {
    const parcel = toShippoParcel(item.dimensions);

    if (!parcel) {
      // One unmeasured piece makes the whole shipment unquotable.
      return fallback();
    }

    parcels.push(parcel);
  }

  try {
    const shipment = await createShippoShipment({
      addressFrom: toShippoAddressFromOrigin(origin, input.sellerName),
      addressTo: toShippoAddressFromSaved(input.destination),
      parcels,
    });

    const cheapest = cheapestRate(shipment.rates ?? [], currency);

    if (!cheapest) {
      return fallback();
    }

    return {
      amountMinor: toMinorUnits(cheapest.value, currency),
      rate: {
        carrier: cheapest.rate.provider,
        estimatedDays: cheapest.rate.estimated_days ?? null,
        rateId: cheapest.rate.object_id,
        service: cheapest.rate.servicelevel?.name ?? null,
      },
      source: "live",
    };
  } catch (error) {
    console.error("Falling back to the stated shipping rate", error);
    return fallback();
  }
}
