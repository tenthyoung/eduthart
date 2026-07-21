"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { CartItem } from "@/components/commerce/cart-page";

export const CART_OPEN_EVENT = "eduthart:cart-open";

export function CartDrawer() {
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/cart", { headers: { authorization: `Bearer ${await user.getIdToken()}` } });
      const payload = (await response.json()) as { error?: string; items?: CartItem[] };
      if (!response.ok) throw new Error(payload.error || "Unable to load cart.");
      setItems(payload.items ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load cart.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (status === "authenticated") void load();
    else if (status === "unauthenticated") setItems([]);
  }, [load, status]);

  useEffect(() => {
    const handleOpen = () => { setOpen(true); void load(); };
    window.addEventListener(CART_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, handleOpen);
  }, [load]);

  const remove = async (itemId: string) => {
    if (!user) return;
    const response = await fetch("/api/cart", { method: "DELETE", headers: { authorization: `Bearer ${await user.getIdToken()}`, "content-type": "application/json" }, body: JSON.stringify({ itemId }) });
    const payload = (await response.json()) as { error?: string; items?: CartItem[] };
    if (!response.ok) return toast.error(payload.error || "Unable to remove artwork.");
    setItems(payload.items ?? []);
  };

  const currency = items[0]?.currency || "USD";
  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (next) void load(); }}>
      <SheetTrigger asChild>
        <Button aria-label={`Shopping bag with ${items.length} items`} className="relative" size="icon" variant="outline">
          <ShoppingBag />
          {items.length > 0 ? <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-primary-foreground">{items.length}</span> : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-xl"><ShoppingBag className="size-5" />Your cart</SheetTitle>
          <SheetDescription>{items.length === 0 ? "Your bag is ready for something special." : `${items.length} original ${items.length === 1 ? "artwork" : "artworks"} selected.`}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {status !== "authenticated" ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="text-sm leading-6 text-muted-foreground">Sign in to view your saved cart and begin checkout.</p><Button asChild className="mt-5"><Link href="/login?next=/cart" onClick={() => setOpen(false)}>Sign in</Link></Button></div>
          ) : loading && items.length === 0 ? <p className="text-sm text-muted-foreground">Loading your cart...</p> : items.length === 0 ? (
            <div className="py-16 text-center"><ShoppingBag className="mx-auto size-10 text-primary/60" /><p className="mt-4 font-medium">Your cart is empty</p><p className="mt-2 text-sm text-muted-foreground">Browse an artist gallery to find an original piece.</p></div>
          ) : (
            <div className="space-y-5">{items.map((item) => (
              <article key={item.itemId} className="flex gap-4 border-b border-border/70 pb-5">
                <Link href={`/artists/${item.artistUsername}/art/${item.itemId}`} onClick={() => setOpen(false)}>{item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="size-24 rounded-xl object-cover" src={item.imageUrl} />
                ) : <div className="size-24 rounded-xl bg-muted" />}</Link>
                <div className="min-w-0 flex-1"><Link className="line-clamp-2 font-medium hover:underline" href={`/artists/${item.artistUsername}/art/${item.itemId}`} onClick={() => setOpen(false)}>{item.title}</Link><p className="mt-1 text-sm text-muted-foreground">by {item.artistName}</p><p className="mt-3 font-semibold">{money(Number(item.price))}</p><p className="mt-1 text-xs text-muted-foreground">Quantity: 1</p></div>
                <Button aria-label={`Remove ${item.title}`} className="shrink-0" onClick={() => void remove(item.itemId)} size="icon" variant="ghost"><Trash2 /></Button>
              </article>
            ))}</div>
          )}
        </div>

        <SheetFooter className="border-t border-border bg-background px-6 py-5">
          {items.length > 0 ? <><div className="mb-2 flex items-center justify-between text-base"><span>Subtotal</span><strong className="text-xl">{money(total)}</strong></div><p className="mb-3 text-left text-xs leading-5 text-muted-foreground">Shipping and taxes are calculated during checkout.</p><Button asChild size="lg"><Link href="/checkout" onClick={() => setOpen(false)}>Go to checkout</Link></Button><Button asChild variant="outline"><Link href="/cart" onClick={() => setOpen(false)}>View full cart</Link></Button></> : <Button asChild variant="outline"><Link href="/" onClick={() => setOpen(false)}>Continue shopping</Link></Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
