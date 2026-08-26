"use client";

import { ArrowLeft, MapPin, Receipt } from "lucide-react";
import Link from "next/link";

import { AccountShell } from "@/components/account/account-shell";
import { CollectorLoadingPanel } from "@/components/collectors/loading-panel";
import { DownloadInvoiceButton, OrderStatusBadge } from "@/components/collectors/order-summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCollectorResource } from "@/hooks/useCollectorResource";
import { formatAddressLines } from "@/lib/collectors/addresses";
import { formatMinorUnits } from "@/lib/commerce/money";
import type { Order } from "@/lib/commerce/orders";

function formatOrderDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(date);
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { data, error, loading } = useCollectorResource<Order[]>({
    initialData: [],
    path: "/api/commerce/orders",
    select: (payload) => (payload.orders as Order[]) ?? [],
    signInPath: `/account/orders/${orderId}`,
  });
  const order = data.find((candidate) => candidate.id === orderId) ?? null;

  if (loading) {
    return (
      <AccountShell description="Your order details." title="Order">
        <CollectorLoadingPanel label="Loading your order..." />
      </AccountShell>
    );
  }

  if (!order) {
    return (
      <AccountShell description="Your order details." title="Order not found">
        <Alert variant="destructive">
          <AlertTitle>We could not find that order</AlertTitle>
          <AlertDescription>
            {error ?? "It may belong to another account."}{" "}
            <Link className="underline underline-offset-4" href="/account/orders">
              Back to your purchases
            </Link>
            .
          </AlertDescription>
        </Alert>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      action={order.status === "paid" ? <DownloadInvoiceButton order={order} /> : undefined}
      description={`Placed ${formatOrderDate(order.createdAt)} · sold by ${order.sellerName}`}
      title={`Order ${order.number}`}
    >
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        href="/account/orders"
      >
        <ArrowLeft className="size-4" />
        Back to purchases
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="space-y-5 rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
          <div className="flex items-center gap-3">
            <Receipt className="size-5 text-primary" />
            <h2 className="text-2xl text-foreground">Artwork</h2>
            <OrderStatusBadge status={order.status} />
          </div>

          <ul className="space-y-4">
            {order.items.map((item) => (
              <li key={item.artworkKey} className="flex gap-4 rounded-2xl border border-border/70 p-4">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="size-24 rounded-xl object-cover" src={item.imageUrl} />
                ) : (
                  <div className="size-24 rounded-xl bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <Link className="text-lg font-medium hover:underline" href={item.href}>
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">by {order.sellerName}</p>
                </div>
                <p className="shrink-0 font-semibold">
                  {formatMinorUnits(item.unitAmountMinor, order.currency)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 border-t border-border pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMinorUnits(order.subtotalMinor, order.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{formatMinorUnits(order.shippingAmountMinor, order.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-lg font-semibold">
              <dt>Total</dt>
              <dd>{formatMinorUnits(order.totalMinor, order.currency)}</dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-primary" />
              <h2 className="text-xl text-foreground">Delivery</h2>
            </div>
            <address className="mt-4 text-sm not-italic leading-6 text-muted-foreground">
              {order.shippingAddress ? (
                formatAddressLines(order.shippingAddress).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))
              ) : (
                <span>No shipping address recorded.</span>
              )}
            </address>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]">
            <h2 className="text-xl text-foreground">Payment</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <OrderStatusBadge status={order.status} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="mt-1 text-foreground">{formatOrderDate(order.paidAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Billed to</dt>
                <dd className="mt-1 text-foreground">{order.buyerEmail ?? "—"}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </AccountShell>
  );
}
