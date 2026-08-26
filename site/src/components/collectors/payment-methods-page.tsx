"use client";

import { CreditCard, Plus, ShieldCheck, Star, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AccountShell } from "@/components/account/account-shell";
import { CollectorEmptyState } from "@/components/collectors/artwork-card";
import { CollectorLoadingPanel } from "@/components/collectors/loading-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCollectorResource } from "@/hooks/useCollectorResource";
import { collectorRequest } from "@/lib/collectors/client";
import type { SavedPaymentMethod } from "@/lib/commerce/payment-methods";

type PaymentMethodsState = {
  configured: boolean;
  paymentMethods: SavedPaymentMethod[];
};

function formatExpiry(method: SavedPaymentMethod) {
  return `${String(method.expMonth).padStart(2, "0")}/${String(method.expYear).slice(-2)}`;
}

export function PaymentMethodsPage() {
  const searchParams = useSearchParams();
  const { data, error, loading, mutate, user } =
    useCollectorResource<PaymentMethodsState>({
      initialData: { configured: true, paymentMethods: [] },
      path: "/api/commerce/payment-methods",
      select: (payload) => ({
        configured: payload.configured !== false,
        paymentMethods: (payload.paymentMethods as SavedPaymentMethod[]) ?? [],
      }),
      signInPath: "/account/payment-methods",
    });
  const [redirecting, setRedirecting] = useState(false);

  const startSetup = async () => {
    if (!user) {
      return;
    }

    setRedirecting(true);

    try {
      const payload = await collectorRequest<{ url: string }>(
        "/api/commerce/payment-methods",
        await user.getIdToken(),
        { method: "POST" }
      );
      window.location.href = payload.url;
    } catch (setupError) {
      toast.error(
        setupError instanceof Error
          ? setupError.message
          : "Unable to start card setup."
      );
      setRedirecting(false);
    }
  };

  if (loading) {
    return (
      <AccountShell
        description="Cards saved for faster checkout."
        title="Payment methods"
      >
        <CollectorLoadingPanel label="Loading your payment methods..." />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      action={
        data.configured ? (
          <Button disabled={redirecting} onClick={() => void startSetup()}>
            <Plus />
            {redirecting ? "Opening Stripe..." : "Add a card"}
          </Button>
        ) : undefined
      }
      description="Cards saved for faster checkout. EduthArt never sees or stores your card details; Stripe holds them and we only keep a reference."
      title="Payment methods"
    >
      {searchParams.get("saved") === "1" ? (
        <Alert className="mb-6">
          <AlertTitle>Card saved</AlertTitle>
          <AlertDescription>
            Your card is ready to use at checkout.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert className="mb-6" variant="destructive">
          <AlertTitle>Payment methods error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!data.configured ? (
        <Alert>
          <AlertTitle>Payments are not switched on here</AlertTitle>
          <AlertDescription>
            This environment has no Stripe keys configured, so there is nothing
            to save yet.
          </AlertDescription>
        </Alert>
      ) : data.paymentMethods.length === 0 ? (
        <CollectorEmptyState
          action={
            <Button disabled={redirecting} onClick={() => void startSetup()}>
              <Plus />
              Add a card
            </Button>
          }
          description="Save a card now, or tick the box at checkout to save the one you pay with."
          icon={<CreditCard className="size-5" />}
          title="No saved cards"
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.paymentMethods.map((method) => (
            <li
              key={method.id}
              className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-border/70 bg-white p-5"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <p className="font-medium capitalize text-foreground">
                    {method.brand} ···· {method.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires {formatExpiry(method)}
                  </p>
                  {method.isDefault ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      <Star className="size-3" />
                      Default
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {!method.isDefault ? (
                  <Button
                    onClick={() =>
                      void mutate(
                        {
                          body: { paymentMethodId: method.id },
                          method: "PATCH",
                        },
                        "Default card updated."
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    <Star />
                    Default
                  </Button>
                ) : null}
                <Button
                  aria-label={`Remove card ending ${method.last4}`}
                  onClick={() =>
                    void mutate(
                      {
                        body: { paymentMethodId: method.id },
                        method: "DELETE",
                      },
                      "Card removed."
                    )
                  }
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Card details are entered on Stripe&apos;s own hosted page and never pass
        through EduthArt.
      </p>
    </AccountShell>
  );
}
