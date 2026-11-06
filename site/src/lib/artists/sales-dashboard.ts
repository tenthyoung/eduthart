import { splitSale } from "@/lib/commerce/commission";
import type { Order, ShipmentStatus } from "@/lib/commerce/orders";

/**
 * Where a sale is from the artist's side of the counter.
 *
 * Coarser than the Shippo tracking states on purpose: an artist wants to know
 * what still needs packing, not the carrier's vocabulary. A delivery failure
 * counts as shipped — the parcel has left the studio — and the row still shows
 * the precise tracking state beside it.
 */
export type SaleStage = "delivered" | "returned" | "shipped" | "to_ship";

export const SALE_STAGES: readonly SaleStage[] = [
  "to_ship",
  "shipped",
  "delivered",
  "returned",
];

export type SaleRow = {
  artistShareMinor: number;
  artworkMinor: number;
  buyerName: string | null;
  currency: string;
  /** Whether the sale counts toward earnings. Refunded orders do not. */
  earning: boolean;
  items: {
    href: string;
    imageUrl: string | null;
    priceMinor: number;
    title: string;
  }[];
  labelUrl: string | null;
  number: string;
  orderId: string;
  platformFeeMinor: number;
  shipmentStatus: ShipmentStatus;
  shippingMinor: number;
  soldAt: string;
  stage: SaleStage;
  trackingUrl: string | null;
};

export type EarningsTotal = {
  artistShareMinor: number;
  artworkMinor: number;
  currency: string;
  platformFeeMinor: number;
  salesCount: number;
};

export type ArtworkEngagement = {
  href: string;
  imageUrl: string | null;
  key: string;
  saveCount: number;
  sold: boolean;
  title: string;
};

export type SalesDashboard = {
  artworks: ArtworkEngagement[];
  sales: SaleRow[];
  stageCounts: Record<SaleStage, number>;
  /** One entry per currency the artist has sold in, largest first. */
  totals: EarningsTotal[];
};

export function getSaleStage(order: Order): SaleStage {
  if (order.status === "refunded" || order.shipment.status === "returned") {
    return "returned";
  }

  switch (order.shipment.status) {
    case "delivered":
      return "delivered";
    case "failure":
    case "transit":
      return "shipped";
    default:
      return "to_ship";
  }
}

/**
 * Orders the artist has actually sold.
 *
 * An order awaiting payment is an abandoned or in-flight checkout, and a
 * cancelled one never took money, so neither belongs on a sales dashboard.
 */
function isSale(order: Order) {
  return order.status === "paid" || order.status === "refunded";
}

export function toSaleRow(order: Order): SaleRow {
  // The order snapshot's subtotal is the artwork price the buyer paid, frozen
  // at checkout. Earnings are computed from it, not from today's listing.
  const artworkMinor = order.subtotalMinor;
  const earning = order.status === "paid";
  const split = earning
    ? splitSale(artworkMinor)
    : { artistShareMinor: 0, platformFeeMinor: 0 };

  return {
    ...split,
    artworkMinor,
    buyerName: order.buyerName,
    currency: order.currency,
    earning,
    items: order.items.map((item) => ({
      href: item.href,
      imageUrl: item.imageUrl,
      priceMinor: item.unitAmountMinor,
      title: item.title,
    })),
    labelUrl: order.shipment.labelUrl,
    number: order.number,
    orderId: order.id,
    shipmentStatus: order.shipment.status,
    shippingMinor: order.shippingAmountMinor,
    soldAt: order.paidAt ?? order.createdAt,
    stage: getSaleStage(order),
    trackingUrl: order.shipment.trackingUrl,
  };
}

export function summarizeSales(
  orders: Order[],
  artworks: ArtworkEngagement[] = []
): SalesDashboard {
  const sales = orders
    .filter(isSale)
    .map(toSaleRow)
    .sort((first, second) => second.soldAt.localeCompare(first.soldAt));

  const stageCounts = Object.fromEntries(
    SALE_STAGES.map((stage) => [stage, 0])
  ) as Record<SaleStage, number>;
  const totalsByCurrency = new Map<string, EarningsTotal>();

  for (const sale of sales) {
    stageCounts[sale.stage] += 1;

    if (!sale.earning) {
      continue;
    }

    const total = totalsByCurrency.get(sale.currency) ?? {
      artistShareMinor: 0,
      artworkMinor: 0,
      currency: sale.currency,
      platformFeeMinor: 0,
      salesCount: 0,
    };

    total.artistShareMinor += sale.artistShareMinor;
    total.artworkMinor += sale.artworkMinor;
    total.platformFeeMinor += sale.platformFeeMinor;
    total.salesCount += 1;
    totalsByCurrency.set(sale.currency, total);
  }

  return {
    artworks: [...artworks].sort(
      (first, second) =>
        second.saveCount - first.saveCount ||
        first.title.localeCompare(second.title)
    ),
    sales,
    stageCounts,
    totals: [...totalsByCurrency.values()].sort(
      (first, second) => second.artworkMinor - first.artworkMinor
    ),
  };
}
