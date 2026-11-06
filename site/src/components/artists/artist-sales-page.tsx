"use client";

import {
  Bookmark,
  CalendarClock,
  Package,
  Receipt,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CollectorEmptyState } from "@/components/collectors/artwork-card";
import { CollectorLoadingPanel } from "@/components/collectors/loading-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { useCollectorResource } from "@/hooks/useCollectorResource";
import {
  SALE_STAGES,
  type SaleRow,
  type SaleStage,
  type SalesDashboard,
} from "@/lib/artists/sales-dashboard";
import { PLATFORM_COMMISSION_PERCENT } from "@/lib/commerce/commission";
import { DEFAULT_CURRENCY, formatMinorUnits } from "@/lib/commerce/money";
import type { ShipmentStatus } from "@/lib/commerce/orders";
import { cn } from "@/lib/utils";

const EMPTY_DASHBOARD: SalesDashboard = {
  artworks: [],
  sales: [],
  stageCounts: { delivered: 0, returned: 0, shipped: 0, to_ship: 0 },
  totals: [],
};

const STAGE_LABELS: Record<SaleStage, string> = {
  delivered: "Delivered",
  returned: "Returned",
  shipped: "Shipped",
  to_ship: "To ship",
};

const STAGE_STYLES: Record<SaleStage, string> = {
  delivered:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  returned: "bg-muted text-muted-foreground",
  shipped: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  to_ship: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

const SHIPMENT_LABELS: Record<ShipmentStatus, string> = {
  delivered: "Delivered",
  failure: "Delivery problem",
  label_purchased: "Label ready",
  pending: "Awaiting label",
  returned: "Returned to sender",
  transit: "In transit",
};

const PANEL =
  "rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] dark:border-border dark:bg-card/92";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function StageBadge({ stage }: { stage: SaleStage }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        STAGE_STYLES[stage]
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

function MoneyLine({
  label,
  strong,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          strong ? "font-semibold text-foreground" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function SaleCard({ sale }: { sale: SaleRow }) {
  const money = (amount: number) => formatMinorUnits(amount, sale.currency);

  return (
    <li className={PANEL} data-testid="sale-row">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl text-foreground">{sale.number}</h3>
            <StageBadge stage={sale.stage} />
          </div>
          <p className="text-sm text-muted-foreground">
            Sold {formatDate(sale.soldAt)}
            {sale.buyerName ? ` to ${sale.buyerName}` : ""} ·{" "}
            {SHIPMENT_LABELS[sale.shipmentStatus]}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/account/orders/${sale.orderId}`}>View order</Link>
          </Button>
          {sale.labelUrl && sale.stage === "to_ship" ? (
            <Button asChild size="sm">
              <a href={sale.labelUrl} rel="noreferrer" target="_blank">
                <Package className="size-4" />
                Shipping label
              </a>
            </Button>
          ) : null}
          {sale.trackingUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={sale.trackingUrl} rel="noreferrer" target="_blank">
                <Truck className="size-4" />
                Track
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
        <ul className="space-y-3">
          {sale.items.map((item) => (
            <li
              key={item.href}
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
                  {money(item.priceMinor)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 rounded-2xl border border-border/70 p-4">
          <MoneyLine label="Artwork price" value={money(sale.artworkMinor)} />
          {sale.earning ? (
            <>
              <MoneyLine
                label={`Commission (${PLATFORM_COMMISSION_PERCENT}%)`}
                value={`−${money(sale.platformFeeMinor)}`}
              />
              <MoneyLine
                label="Your share"
                strong
                value={money(sale.artistShareMinor)}
              />
            </>
          ) : (
            <MoneyLine label="Your share" strong value="Refunded" />
          )}
          <div className="border-t border-border/70 pt-2">
            <MoneyLine
              label="Shipping paid by buyer"
              value={money(sale.shippingMinor)}
            />
          </div>
          <MoneyLine label="Payout date" value="Not scheduled yet" />
        </dl>
      </div>
    </li>
  );
}

export function ArtistSalesPage({ username }: { username: string }) {
  const [stage, setStage] = useState<SaleStage | "all">("all");
  const router = useRouter();
  const {
    data: payload,
    error,
    loading,
  } = useCollectorResource<{
    dashboard: SalesDashboard;
    username: string | null;
  }>({
    initialData: { dashboard: EMPTY_DASHBOARD, username: null },
    path: "/api/artists/sales",
    select: (body) => ({
      dashboard:
        (body.dashboard as SalesDashboard | undefined) ?? EMPTY_DASHBOARD,
      username: typeof body.username === "string" ? body.username : null,
    }),
    signInPath: `/artists/${username}/sales`,
  });
  const data = payload.dashboard;
  const ownUsername = payload.username;
  const onSomeoneElsesPage = Boolean(ownUsername && ownUsername !== username);

  // The figures are always the signed-in artist's own. Opening another
  // artist's address would show them under that artist's name and sidebar,
  // so move to the artist's own address instead.
  useEffect(() => {
    if (onSomeoneElsesPage) {
      router.replace(`/artists/${ownUsername}/sales`);
    }
  }, [onSomeoneElsesPage, ownUsername, router]);

  if (loading || onSomeoneElsesPage) {
    return <CollectorLoadingPanel label="Loading your sales..." />;
  }

  const primary = data.totals[0] ?? {
    artistShareMinor: 0,
    artworkMinor: 0,
    currency: DEFAULT_CURRENCY,
    platformFeeMinor: 0,
    salesCount: 0,
  };
  const otherTotals = data.totals.slice(1);
  const money = (amount: number) => formatMinorUnits(amount, primary.currency);
  const visibleSales =
    stage === "all"
      ? data.sales
      : data.sales.filter((sale) => sale.stage === stage);
  const totalSaves = data.artworks.reduce(
    (total, artwork) => total + artwork.saveCount,
    0
  );

  return (
    <section className="mx-auto max-w-6xl space-y-8 pb-10">
      <header className={PANEL}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          Artist workspace
        </p>
        <h1 className="mt-3 text-4xl text-foreground sm:text-5xl">
          Orders &amp; payouts
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          What you have sold, what still needs shipping, and what you have
          earned. EduthArt keeps {PLATFORM_COMMISSION_PERCENT}% of each artwork
          price and you keep the rest. Shipping the buyer paid is shown
          separately and is not part of these figures.
        </p>
      </header>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Your sales could not be loaded</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          hint={`After the ${PLATFORM_COMMISSION_PERCENT}% commission`}
          icon={<Wallet className="size-4" />}
          label="Your earnings"
          tone="emphasis"
          value={money(primary.artistShareMinor)}
        />
        <StatTile
          hint={`${primary.salesCount} ${primary.salesCount === 1 ? "sale" : "sales"}`}
          icon={<Receipt className="size-4" />}
          label="Artwork sales"
          value={money(primary.artworkMinor)}
        />
        <StatTile
          hint="Kept by EduthArt"
          label="Commission"
          value={money(primary.platformFeeMinor)}
        />
        <StatTile
          hint={
            data.stageCounts.to_ship === 0
              ? "Nothing waiting"
              : "Waiting to be packed"
          }
          icon={<Package className="size-4" />}
          label="To ship"
          value={data.stageCounts.to_ship}
        />
      </div>

      {otherTotals.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Also sold in other currencies:{" "}
          {otherTotals
            .map(
              (total) =>
                `${formatMinorUnits(total.artistShareMinor, total.currency)} earned from ${total.salesCount} ${total.salesCount === 1 ? "sale" : "sales"}`
            )
            .join(" · ")}
        </p>
      ) : null}

      <section className={cn(PANEL, "flex gap-4")}>
        <CalendarClock className="mt-1 size-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <h2 className="text-xl text-foreground">Payouts</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Payouts are not automated yet. Payout dates and your payout history
            will appear here once they are.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl text-foreground">Sales</h2>
          <div
            aria-label="Filter sales"
            className="flex flex-wrap gap-2"
            role="group"
          >
            {(["all", ...SALE_STAGES] as const).map((option) => {
              const count =
                option === "all" ? data.sales.length : data.stageCounts[option];

              return (
                <Button
                  key={option}
                  aria-pressed={stage === option}
                  onClick={() => setStage(option)}
                  size="sm"
                  variant={stage === option ? "default" : "outline"}
                >
                  {option === "all" ? "All" : STAGE_LABELS[option]}
                  <span className="tabular-nums opacity-70">{count}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {data.sales.length === 0 ? (
          <CollectorEmptyState
            action={
              <Button asChild>
                <Link href={`/artists/${username}/listings/new`}>
                  Go to your listings
                </Link>
              </Button>
            }
            description="When a collector buys one of your works, it appears here with the shipping label and what you earn."
            icon={<Receipt className="size-5" />}
            title="No sales yet"
          />
        ) : visibleSales.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No sales are {STAGE_LABELS[stage as SaleStage].toLowerCase()} right
            now.
          </p>
        ) : (
          <ul className="space-y-5">
            {visibleSales.map((sale) => (
              <SaleCard key={sale.orderId} sale={sale} />
            ))}
          </ul>
        )}
      </section>

      <section className={PANEL}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-2xl text-foreground">Saves by artwork</h2>
          <p className="text-sm text-muted-foreground">
            {totalSaves} {totalSaves === 1 ? "save" : "saves"} across{" "}
            {data.artworks.length}{" "}
            {data.artworks.length === 1 ? "work" : "works"}
          </p>
        </div>
        {data.artworks.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Publish a work to see how many collectors save it.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-border/70">
            {data.artworks.map((artwork) => (
              <li
                key={artwork.key}
                className="flex items-center gap-4 py-3"
                data-testid="artwork-saves"
              >
                {artwork.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-12 rounded-lg object-cover"
                    src={artwork.imageUrl}
                  />
                ) : (
                  <div className="size-12 rounded-lg bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    className="line-clamp-1 text-sm font-medium hover:underline"
                    href={artwork.href}
                  >
                    {artwork.title}
                  </Link>
                  {artwork.sold ? (
                    <p className="text-xs text-muted-foreground">Sold</p>
                  ) : null}
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-foreground">
                  <Bookmark className="size-4 text-muted-foreground" />
                  {artwork.saveCount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
