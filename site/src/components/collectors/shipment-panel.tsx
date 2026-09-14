"use client";

import { ExternalLink, Printer, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Order, ShipmentStatus } from "@/lib/commerce/orders";

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  delivered: "Delivered",
  failure: "Delivery problem",
  label_purchased: "Label created",
  pending: "Preparing",
  returned: "Returned to sender",
  transit: "In transit",
};

const STATUS_TONES: Record<ShipmentStatus, string> = {
  delivered: "border-primary/30 bg-primary/10 text-primary",
  failure: "border-destructive/30 bg-destructive/10 text-destructive",
  label_purchased: "border-border bg-muted text-muted-foreground",
  pending: "border-border bg-muted text-muted-foreground",
  returned: "border-destructive/30 bg-destructive/10 text-destructive",
  transit: "border-primary/30 bg-primary/10 text-primary",
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        STATUS_TONES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Where the parcel is.
 *
 * Only rendered once an order is paid, because before that there is no parcel.
 * The label is the seller's to print, so it is shown to them alone.
 */
export function ShipmentPanel({
  order,
  role,
}: {
  order: Order;
  role: "buyer" | "seller";
}) {
  const { shipment } = order;
  const hasCarrier = Boolean(shipment.carrier);

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] dark:border-border dark:bg-card/92">
      <div className="flex items-center gap-3">
        <Truck className="size-5 text-primary" />
        <h2 className="text-xl text-foreground">Shipment</h2>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <ShipmentStatusBadge status={shipment.status} />
          </dd>
        </div>

        {hasCarrier ? (
          <div>
            <dt className="text-muted-foreground">Carrier</dt>
            <dd className="mt-1 text-foreground">
              {[shipment.carrier, shipment.service].filter(Boolean).join(" · ")}
            </dd>
          </div>
        ) : null}

        {shipment.trackingNumber ? (
          <div>
            <dt className="text-muted-foreground">Tracking number</dt>
            <dd className="mt-1 break-all text-foreground">
              {shipment.trackingNumber}
            </dd>
          </div>
        ) : null}
      </dl>

      {shipment.trackingUrl || (role === "seller" && shipment.labelUrl) ? (
        <div className="mt-4 flex flex-col gap-2">
          {shipment.trackingUrl ? (
            <Button asChild size="sm" variant="outline">
              <a
                href={shipment.trackingUrl}
                rel="noreferrer noopener"
                target="_blank"
              >
                <ExternalLink />
                Track this parcel
              </a>
            </Button>
          ) : null}
          {role === "seller" && shipment.labelUrl ? (
            <Button asChild size="sm" variant="outline">
              <a
                href={shipment.labelUrl}
                rel="noreferrer noopener"
                target="_blank"
              >
                <Printer />
                Print shipping label
              </a>
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {role === "seller"
            ? "Tracking appears here once a label is created for this order."
            : "The artist is preparing your artwork. Tracking appears here as soon as it ships."}
        </p>
      )}
    </section>
  );
}
