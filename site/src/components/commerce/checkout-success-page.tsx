"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { DownloadInvoiceButton } from "@/components/collectors/order-summary";
import { notifyCartChanged } from "@/components/commerce/cart-drawer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { collectorRequest } from "@/lib/collectors/client";
import { formatMinorUnits } from "@/lib/commerce/money";
import type { Order } from "@/lib/commerce/orders";
import { notifyNotificationsChanged } from "@/lib/notifications/client";

/**
 * Confirmation after returning from Stripe.
 *
 * The redirect itself proves nothing, so this asks the server to re-fetch the
 * session from Stripe and report what it says. It exists so the collector sees
 * their order right away rather than waiting on the webhook, and it runs the
 * same idempotent fulfilment, so whichever arrives first wins and the other is
 * a no-op.
 */
export function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const { status, user } = useAuth();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !user || !sessionId) {
      if (status === "unauthenticated" || !sessionId) {
        setConfirming(false);
      }
      return;
    }

    let cancelled = false;

    const confirm = async () => {
      try {
        const payload = await collectorRequest<{ order: Order }>(
          "/api/commerce/confirm",
          await user.getIdToken(),
          { body: { sessionId }, method: "POST" }
        );

        if (!cancelled) {
          setOrder(payload.order);
          // Fulfilment emptied the cart server-side, so the drawer's badge
          // would otherwise keep counting the artwork that was just bought.
          notifyCartChanged();
          notifyNotificationsChanged();
        }
      } catch (confirmError) {
        if (!cancelled) {
          setError(
            confirmError instanceof Error
              ? confirmError.message
              : "Unable to confirm your order."
          );
        }
      } finally {
        if (!cancelled) {
          setConfirming(false);
        }
      }
    };

    void confirm();

    return () => {
      cancelled = true;
    };
  }, [sessionId, status, user]);

  return (
    <main className="min-h-screen bg-white dark:bg-background px-4 pb-24 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {confirming ? (
          <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-border/70 p-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Confirming your payment with Stripe...
          </div>
        ) : error || !order ? (
          <Alert variant="destructive">
            <AlertTitle>We could not confirm that order</AlertTitle>
            <AlertDescription>
              {error ??
                "This confirmation link is missing its checkout session."}{" "}
              If you were charged, your order will still appear in{" "}
              <Link
                className="underline underline-offset-4"
                href="/account/orders"
              >
                your purchases
              </Link>{" "}
              once Stripe notifies us.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
                <CheckCircle2 className="size-7" />
              </div>
              <h1 className="text-4xl text-foreground sm:text-5xl">
                {order.status === "paid"
                  ? "Thank you for your purchase"
                  : "Your order is pending"}
              </h1>
              <p className="text-base text-muted-foreground">
                {order.status === "paid"
                  ? `Order ${order.number} is confirmed. ${order.sellerName} has been notified to prepare your artwork for shipping.`
                  : `Order ${order.number} has not been marked paid yet. We will update it as soon as Stripe confirms.`}
              </p>
            </div>

            <section className="space-y-4 rounded-[2rem] border border-border/70 p-6">
              <h2 className="text-xl text-foreground">Order summary</h2>
              <ul className="space-y-3">
                {order.items.map((item) => (
                  <li key={item.artworkKey} className="flex items-center gap-4">
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
                    <div className="min-w-0 flex-1">
                      <Link
                        className="font-medium hover:underline"
                        href={item.href}
                      >
                        {item.title}
                      </Link>
                    </div>
                    <span className="shrink-0 font-semibold">
                      {formatMinorUnits(item.unitAmountMinor, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-border pt-4 text-lg font-semibold">
                <span>Total paid</span>
                <span>
                  {formatMinorUnits(order.totalMinor, order.currency)}
                </span>
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="flex-1" size="lg">
                <Link href={`/account/orders/${order.id}`}>
                  View your order
                </Link>
              </Button>
              {order.status === "paid" ? (
                <DownloadInvoiceButton order={order} />
              ) : null}
              <Button asChild className="flex-1" size="lg" variant="outline">
                <Link href="/">Keep browsing</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
