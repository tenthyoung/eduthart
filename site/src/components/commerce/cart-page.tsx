"use client";

import {
  ArrowLeft,
  Loader2,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { collectorRequest } from "@/lib/collectors/client";
import {
  formatAddressLines,
  type SavedAddress,
} from "@/lib/collectors/address-format";

export type CartItem = {
  artistName: string;
  artistUid: string;
  artistUsername: string;
  availability: string;
  currency: string;
  href: string;
  imageUrl: string | null;
  itemId: string;
  price: string;
  title: string;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(
    value
  );
}

export function CartPage({ checkout = false }: { checkout?: boolean }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [shippingAddressId, setShippingAddressId] = useState<string | null>(
    null
  );
  const [billingAddressId, setBillingAddressId] = useState<string | null>(null);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payError, setPayError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      return;
    }

    const token = await user.getIdToken();
    const cart = await collectorRequest<{ items: CartItem[] }>(
      "/api/cart",
      token
    );
    setItems(cart.items ?? []);

    if (checkout) {
      const saved = await collectorRequest<{ addresses: SavedAddress[] }>(
        "/api/collectors/addresses",
        token
      );
      setAddresses(saved.addresses ?? []);
      setShippingAddressId(
        saved.addresses.find(
          (address) => address.kind === "shipping" && address.isDefault
        )?.id ??
          saved.addresses.find((address) => address.kind === "shipping")?.id ??
          null
      );
      // A saved billing default says the card lives somewhere other than the
      // delivery address, so respect it rather than overriding their setup.
      const defaultBilling =
        saved.addresses.find(
          (address) => address.kind === "billing" && address.isDefault
        ) ?? null;
      setBillingAddressId(defaultBilling?.id ?? null);
      setBillingSameAsShipping(defaultBilling === null);
    }
  }, [checkout, user]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${checkout ? "/checkout" : "/cart"}`);
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    void load()
      .catch((error: unknown) =>
        toast.error(
          error instanceof Error ? error.message : "Unable to load your cart."
        )
      )
      .finally(() => setLoading(false));
  }, [checkout, load, router, status]);

  const remove = async (itemId: string) => {
    if (!user) {
      return;
    }

    try {
      const payload = await collectorRequest<{ items: CartItem[] }>(
        "/api/cart",
        await user.getIdToken(),
        {
          body: { itemId },
          method: "DELETE",
        }
      );
      setItems(payload.items ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove that artwork."
      );
    }
  };

  const pay = async () => {
    if (!user) {
      return;
    }

    setPayError(null);
    setRedirecting(true);

    try {
      const payload = await collectorRequest<{ url: string }>(
        "/api/commerce/checkout",
        await user.getIdToken(),
        {
          body: {
            billingAddressId: billingSameAsShipping ? null : billingAddressId,
            billingSameAsShipping,
            savePaymentMethod,
            shippingAddressId,
          },
          method: "POST",
        }
      );
      window.location.href = payload.url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start checkout.";
      setPayError(message);
      toast.error(message);
      setRedirecting(false);
    }
  };

  const currency = items[0]?.currency || "USD";
  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const shippingAddresses = addresses.filter(
    (address) => address.kind === "shipping"
  );
  const billingAddresses = addresses.filter(
    (address) => address.kind === "billing"
  );
  const shippingAddress =
    shippingAddresses.find((address) => address.id === shippingAddressId) ??
    null;
  const billingAddress =
    billingAddresses.find((address) => address.id === billingAddressId) ?? null;

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {checkout ? (
          <Link
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            href="/cart"
          >
            <ArrowLeft className="size-4" />
            Back to cart
          </Link>
        ) : (
          <button
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push("/")
            }
            type="button"
          >
            <ArrowLeft className="size-4" />
            Continue browsing
          </button>
        )}

        {searchParams.get("cancelled") === "1" ? (
          <Alert className="mt-6">
            <AlertTitle>Checkout cancelled</AlertTitle>
            <AlertDescription>
              Nothing was charged and your cart is untouched. The artwork stays
              held for you for a short while.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
              {checkout ? "Checkout" : "Your cart"}
            </p>
            <h1 className="mt-2 text-4xl text-foreground">
              {checkout ? "Review your order" : "Artwork selected for purchase"}
            </h1>

            {loading ? (
              <p className="mt-8 text-muted-foreground">Loading cart...</p>
            ) : items.length === 0 ? (
              <div className="mt-8 rounded-[2rem] border border-dashed border-border p-10 text-center">
                <ShoppingBag className="mx-auto size-8 text-primary" />
                <p className="mt-4 text-muted-foreground">
                  Your cart is empty.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/">Browse artwork</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {items.map((item) => (
                  <article
                    key={item.itemId}
                    className="flex gap-4 rounded-[1.5rem] border border-border/70 p-4"
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="size-28 rounded-xl object-cover"
                        src={item.imageUrl}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <Link
                        className="text-xl font-medium hover:underline"
                        href={item.href}
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        by {item.artistName}
                      </p>
                      <p className="mt-4 font-semibold">
                        {money(Number(item.price), item.currency)}
                      </p>
                    </div>
                    {!checkout ? (
                      <Button
                        aria-label={`Remove ${item.title}`}
                        onClick={() => void remove(item.itemId)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </article>
                ))}
              </div>
            )}

            {checkout && items.length > 0 ? (
              <section className="mt-8 space-y-5 rounded-[2rem] border border-border/70 p-6">
                <div className="flex items-center gap-3">
                  <MapPin className="size-5 text-primary" />
                  <h2 className="text-2xl text-foreground">Delivery</h2>
                </div>

                {shippingAddresses.length === 0 ? (
                  <Alert>
                    <AlertTitle>Add a shipping address</AlertTitle>
                    <AlertDescription>
                      We need somewhere to send the artwork.{" "}
                      <Link
                        className="underline underline-offset-4"
                        href="/account/addresses"
                      >
                        Add an address
                      </Link>{" "}
                      and come back to finish checking out.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    <Label htmlFor="checkout-shipping-address">Ship to</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      id="checkout-shipping-address"
                      onChange={(event) =>
                        setShippingAddressId(event.target.value)
                      }
                      value={shippingAddressId ?? ""}
                    >
                      {shippingAddresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {[
                            address.label || address.name,
                            address.line1,
                            address.city,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </option>
                      ))}
                    </select>
                    {shippingAddress ? (
                      <address className="text-sm not-italic leading-6 text-muted-foreground">
                        {formatAddressLines(shippingAddress).map((line) => (
                          <span key={line} className="block">
                            {line}
                          </span>
                        ))}
                      </address>
                    ) : null}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={billingSameAsShipping}
                      id="billing-same-as-shipping"
                      onCheckedChange={(checked) => {
                        const same = checked === true;
                        setBillingSameAsShipping(same);

                        if (!same && !billingAddressId) {
                          setBillingAddressId(billingAddresses[0]?.id ?? null);
                        }
                      }}
                    />
                    <Label
                      className="font-normal leading-6"
                      htmlFor="billing-same-as-shipping"
                    >
                      My billing address is the same as my shipping address
                    </Label>
                  </div>

                  {billingSameAsShipping ? null : billingAddresses.length ===
                    0 ? (
                    <Alert>
                      <AlertTitle>Add a billing address</AlertTitle>
                      <AlertDescription>
                        <Link
                          className="underline underline-offset-4"
                          href="/account/addresses"
                        >
                          Add a billing address
                        </Link>{" "}
                        and come back, or tick the box above to bill the card to
                        your shipping address.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <Label htmlFor="checkout-billing-address">Bill to</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        id="checkout-billing-address"
                        onChange={(event) =>
                          setBillingAddressId(event.target.value || null)
                        }
                        value={billingAddressId ?? ""}
                      >
                        {billingAddresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {[
                              address.label || address.name,
                              address.line1,
                              address.city,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </option>
                        ))}
                      </select>
                      {billingAddress ? (
                        <address className="text-sm not-italic leading-6 text-muted-foreground">
                          {formatAddressLines(billingAddress).map((line) => (
                            <span key={line} className="block">
                              {line}
                            </span>
                          ))}
                        </address>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4">
                  <Checkbox
                    checked={savePaymentMethod}
                    id="save-payment-method"
                    onCheckedChange={(checked) =>
                      setSavePaymentMethod(checked === true)
                    }
                  />
                  <Label
                    className="font-normal leading-6"
                    htmlFor="save-payment-method"
                  >
                    Save this card for faster checkout next time. Stripe stores
                    the card; EduthArt never sees the number.
                  </Label>
                </div>
              </section>
            ) : null}
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[2rem] border border-border/70 p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Order summary</h2>
              <div className="mt-5 flex justify-between border-t border-border pt-5">
                <span>Subtotal</span>
                <strong>{money(total, currency)}</strong>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Shipping is calculated from the artist&apos;s stated rate and
                shown on the Stripe payment page before you pay.
              </p>

              {payError ? (
                <Alert className="mt-4" variant="destructive">
                  <AlertTitle>Checkout could not start</AlertTitle>
                  <AlertDescription>{payError}</AlertDescription>
                </Alert>
              ) : null}

              {checkout ? (
                <Button
                  className="mt-6 w-full"
                  disabled={
                    items.length === 0 ||
                    redirecting ||
                    !shippingAddressId ||
                    (!billingSameAsShipping && !billingAddressId)
                  }
                  onClick={() => void pay()}
                  size="lg"
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Opening secure payment...
                    </>
                  ) : (
                    "Pay with Stripe"
                  )}
                </Button>
              ) : (
                <Button
                  asChild
                  className="mt-6 w-full"
                  disabled={items.length === 0}
                  size="lg"
                >
                  <Link href="/checkout">Continue to checkout</Link>
                </Button>
              )}

              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                Payment is completed on Stripe&apos;s hosted checkout. Your card
                details never reach EduthArt.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
