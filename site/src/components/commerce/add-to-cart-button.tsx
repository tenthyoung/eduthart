"use client";

import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export function AddToCartButton({ itemId, username }: { itemId: string; username: string }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!user || status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(`/artists/${username}/art/${itemId}`)}`);
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { authorization: `Bearer ${await user.getIdToken()}`, "content-type": "application/json" },
        body: JSON.stringify({ itemId, username }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to add artwork to cart.");
      toast.success("Artwork added to your cart.");
      router.push("/cart");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add artwork to cart.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Button className="mt-6 w-full" disabled={adding} onClick={() => void add()} size="lg">
      <ShoppingCart />
      {adding ? "Adding..." : "Add to cart"}
    </Button>
  );
}
