import { Suspense } from "react";

import { CartPage } from "@/components/commerce/cart-page";

export default function CheckoutRoute() {
  return (
    <Suspense>
      <CartPage checkout />
    </Suspense>
  );
}
