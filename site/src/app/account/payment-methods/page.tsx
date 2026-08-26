import { Suspense } from "react";

import { PaymentMethodsPage } from "@/components/collectors/payment-methods-page";

export const metadata = { title: "Payment methods | EduthArt" };

export default function PaymentMethodsRoute() {
  return (
    <Suspense>
      <PaymentMethodsPage />
    </Suspense>
  );
}
