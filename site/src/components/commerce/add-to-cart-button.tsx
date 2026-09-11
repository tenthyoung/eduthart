"use client";

import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { CART_OPEN_EVENT } from "@/components/commerce/cart-drawer";
import { collectorRequest } from "@/lib/collectors/client";

export function AddToCartButton({
  itemId,
  username,
}: {
  itemId: string;
  username: string;
}) {
  const { status, user } = useAuth();
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!user || status !== "authenticated") {
      router.push(
        `/login?next=${encodeURIComponent(`/artists/${username}/art/${itemId}`)}`
      );
      return;
    }
    setAdding(true);
    try {
      await collectorRequest<unknown>("/api/cart", await user.getIdToken(), {
        body: { itemId, username },
        method: "POST",
      });
      toast.success("Artwork added to your cart.");
      window.dispatchEvent(new Event(CART_OPEN_EVENT));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to add artwork to cart."
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <Button
      className="mt-6 w-full"
      disabled={adding}
      onClick={() => void add()}
      size="lg"
    >
      <ShoppingCart />
      {adding ? "Adding..." : "Add to cart"}
    </Button>
  );
}
