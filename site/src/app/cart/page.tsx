import { Suspense } from "react";

import { CartPage } from "@/components/commerce/cart-page";

export default function CartRoute() {
  return (
    <Suspense>
      <CartPage />
    </Suspense>
  );
}
