import { Suspense } from "react";

import { CheckoutSuccessPage } from "@/components/commerce/checkout-success-page";

export const metadata = { title: "Order confirmed | EduthArt" };

export default function CheckoutSuccessRoute() {
  return (
    <Suspense>
      <CheckoutSuccessPage />
    </Suspense>
  );
}
