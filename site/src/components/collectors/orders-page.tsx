"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";

import { AccountShell } from "@/components/account/account-shell";
import { CollectorEmptyState } from "@/components/collectors/artwork-card";
import { CollectorLoadingPanel } from "@/components/collectors/loading-panel";
import {
  DownloadInvoiceButton,
  OrderStatusBadge,
} from "@/components/collectors/order-summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCollectorResource } from "@/hooks/useCollectorResource";
import { formatMinorUnits } from "@/lib/commerce/money";
import type { Order } from "@/lib/commerce/orders";

function formatOrderDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export function OrdersPage() {
  const { data, error, loading } = useCollectorResource<Order[]>({
    initialData: [],
    path: "/api/commerce/orders",
    select: (payload) => (payload.orders as Order[]) ?? [],
    signInPath: "/account/orders",
  });

  if (loading) {
    return (
      <AccountShell
        description="Every artwork you have bought."
        title="Purchases"
      >
        <CollectorLoadingPanel label="Loading your purchase history..." />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      description="Every artwork you have bought through EduthArt, with its invoice and delivery details."
      title="Purchases"
    >
      {error ? (
        <Alert className="mb-6" variant="destructive">
          <AlertTitle>Purchase history error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {data.length === 0 ? (
        <CollectorEmptyState
          action={
            <Button asChild>
              <Link href="/">Browse artwork</Link>
            </Button>
          }
          description="Once you buy an original it appears here with its invoice and shipping details."
          icon={<Receipt className="size-5" />}
          title="No purchases yet"
        />
      ) : (
        <ul className="space-y-5">
          {data.map((order) => (
            <li
              key={order.id}
              className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl text-foreground">{order.number}</h2>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatOrderDate(order.paidAt ?? order.createdAt)} · sold by{" "}
                    {order.sellerName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xl font-semibold text-foreground">
                    {formatMinorUnits(order.totalMinor, order.currency)}
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/account/orders/${order.id}`}>View order</Link>
                  </Button>
                  {order.status === "paid" ? (
                    <DownloadInvoiceButton order={order} />
                  ) : null}
                </div>
              </div>

              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {order.items.map((item) => (
                  <li
                    key={item.artworkKey}
                    className="flex gap-3 rounded-2xl border border-border/70 p-3"
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="size-16 rounded-xl object-cover"
                        src={item.imageUrl}
                      />
                    ) : (
                      <div className="size-16 rounded-xl bg-muted" />
                    )}
                    <div className="min-w-0">
                      <Link
                        className="line-clamp-2 text-sm font-medium hover:underline"
                        href={item.href}
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatMinorUnits(item.unitAmountMinor, order.currency)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
