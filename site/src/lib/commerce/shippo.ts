import type { ShippingOriginAddress } from "@/lib/artists/listing-flow";
import type { ListingDimensions } from "@/lib/artists/listing-flow";
import type { SavedAddress } from "@/lib/collectors/address-format";

const SHIPPO_API_BASE = "https://api.goshippo.com";

/**
 * A parcel needs a third dimension, and the listing form only requires width
 * and height. A packed flat piece is never zero-deep, so this is the floor used
 * when the artist left depth blank. Weight is never guessed: without it the
 * quote falls back to the artist's stated rate instead.
 */
const MIN_DEPTH = { cm: 5, in: 2 } as const;

export function isShippoConfigured() {
  return Boolean(process.env.SHIPPO_API_TOKEN);
}

export function getShippoWebhookSecret() {
  return process.env.SHIPPO_WEBHOOK_SECRET ?? null;
}

export type ShippoAddress = {
  city: string;
  country: string;
  email?: string;
  name: string;
  phone?: string;
  state: string;
  street1: string;
  street2?: string;
  zip: string;
};

export type ShippoParcel = {
  distance_unit: "cm" | "in";
  height: string;
  length: string;
  mass_unit: "kg" | "lb";
  weight: string;
  width: string;
};

export type ShippoRate = {
  amount: string;
  currency: string;
  estimated_days?: number | null;
  object_id: string;
  provider: string;
  servicelevel?: { name?: string | null } | null;
};

export type ShippoTransaction = {
  label_url?: string | null;
  messages?: Array<{ text?: string | null }> | null;
  object_id: string;
  status: string;
  tracking_number?: string | null;
  tracking_url_provider?: string | null;
};

export type ShippoTrackingStatus = {
  status?: string | null;
  status_date?: string | null;
  status_details?: string | null;
};

/**
 * One call to Shippo.
 *
 * Every caller treats a failure as "no live rate available" rather than an
 * error the collector sees, so this throws and the shipping layer above decides
 * what to fall back to.
 */
async function shippoRequest<T>(
  path: string,
  init: { body?: unknown; method?: string } = {}
): Promise<T> {
  const token = process.env.SHIPPO_API_TOKEN;

  if (!token) {
    throw new Error("Shippo is not configured.");
  }

  const response = await fetch(`${SHIPPO_API_BASE}${path}`, {
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: {
      authorization: `ShippoToken ${token}`,
      "content-type": "application/json",
    },
    method: init.method ?? "GET",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Shippo ${init.method ?? "GET"} ${path} failed with ${response.status}: ${detail.slice(0, 300)}`
    );
  }

  return (await response.json()) as T;
}

export function toShippoAddressFromSaved(
  address: SavedAddress,
  email?: string | null
): ShippoAddress {
  return {
    city: address.city,
    country: address.country,
    ...(email ? { email } : {}),
    name: address.name,
    ...(address.phone ? { phone: address.phone } : {}),
    state: address.region,
    street1: address.line1,
    ...(address.line2 ? { street2: address.line2 } : {}),
    zip: address.postalCode,
  };
}

export function toShippoAddressFromOrigin(
  address: ShippingOriginAddress,
  name: string
): ShippoAddress {
  return {
    city: address.city,
    country: address.country,
    name,
    state: address.region,
    street1: address.line1,
    ...(address.line2 ? { street2: address.line2 } : {}),
    zip: address.postalCode,
  };
}

function positiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Turn a listing's stated dimensions into a Shippo parcel.
 *
 * Returns null when the artist has not supplied enough to measure the box.
 * Quoting a guess would commit them to a shipping price they never agreed to.
 */
export function toShippoParcel(
  dimensions: ListingDimensions
): ShippoParcel | null {
  const width = positiveNumber(dimensions.width);
  const height = positiveNumber(dimensions.height);
  const weight = positiveNumber(dimensions.weight);

  if (!width || !height || !weight) {
    return null;
  }

  const unit = dimensions.unit === "cm" ? "cm" : "in";
  const depth = positiveNumber(dimensions.depth) ?? MIN_DEPTH[unit];

  return {
    distance_unit: unit,
    height: String(height),
    length: String(depth),
    mass_unit: dimensions.weightUnit === "kg" ? "kg" : "lb",
    weight: String(weight),
    width: String(width),
  };
}

export function createShippoShipment(input: {
  addressFrom: ShippoAddress;
  addressTo: ShippoAddress;
  parcels: ShippoParcel[];
}) {
  return shippoRequest<{ object_id: string; rates: ShippoRate[] }>(
    "/shipments/",
    {
      body: {
        address_from: input.addressFrom,
        address_to: input.addressTo,
        async: false,
        parcels: input.parcels,
      },
      method: "POST",
    }
  );
}

export function createShippoTransaction(input: {
  rateId: string;
  signatureRequired: boolean;
}) {
  return shippoRequest<ShippoTransaction>("/transactions/", {
    body: {
      async: false,
      label_file_type: "PDF",
      rate: input.rateId,
      ...(input.signatureRequired
        ? { extra: { signature_confirmation: "STANDARD" } }
        : {}),
    },
    method: "POST",
  });
}

export function getShippoTransaction(transactionId: string) {
  return shippoRequest<ShippoTransaction>(`/transactions/${transactionId}`);
}

/**
 * Shippo's own account of where a parcel is.
 *
 * The tracking webhook is treated only as a nudge; this is what the order is
 * actually updated from, so a forged payload cannot move an order to delivered.
 */
export function getShippoTracking(carrier: string, trackingNumber: string) {
  return shippoRequest<{ tracking_status?: ShippoTrackingStatus | null }>(
    `/tracks/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`
  );
}
