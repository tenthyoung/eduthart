"use client";

import { ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export type CartItem = { artistName: string; artistUsername: string; availability: string; currency: string; imageUrl: string | null; itemId: string; price: string; title: string };

export function CartPage({ checkout = false }: { checkout?: boolean }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const response = await fetch("/api/cart", { headers: { authorization: `Bearer ${await user.getIdToken()}` } });
    const payload = (await response.json()) as { error?: string; items?: CartItem[] };
    if (!response.ok) throw new Error(payload.error || "Unable to load cart.");
    setItems(payload.items ?? []);
  };

  useEffect(() => {
    if (status === "unauthenticated") { window.location.href = `/login?next=${checkout ? "/checkout" : "/cart"}`; return; }
    if (status === "authenticated") void load().catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const remove = async (itemId: string) => {
    if (!user) return;
    const response = await fetch("/api/cart", { method: "DELETE", headers: { authorization: `Bearer ${await user.getIdToken()}`, "content-type": "application/json" }, body: JSON.stringify({ itemId }) });
    const payload = (await response.json()) as { error?: string; items?: CartItem[] };
    if (!response.ok) return toast.error(payload.error || "Unable to remove artwork.");
    setItems(payload.items ?? []);
  };

  const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const currency = items[0]?.currency || "USD";

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {checkout ? (
          <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/cart"><ArrowLeft className="size-4" />Back to cart</Link>
        ) : (
          <button
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => window.history.length > 1 ? router.back() : router.push("/")}
            type="button"
          >
            <ArrowLeft className="size-4" />Continue browsing
          </button>
        )}
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">{checkout ? "Checkout" : "Your cart"}</p>
            <h1 className="mt-2 text-4xl text-foreground">{checkout ? "Review your order" : "Artwork selected for purchase"}</h1>
            {loading ? <p className="mt-8 text-muted-foreground">Loading cart...</p> : items.length === 0 ? (
              <div className="mt-8 rounded-[2rem] border border-dashed border-border p-10 text-center"><ShoppingBag className="mx-auto size-8 text-primary" /><p className="mt-4 text-muted-foreground">Your cart is empty.</p></div>
            ) : (
              <div className="mt-8 space-y-4">{items.map((item) => (
                <article key={item.itemId} className="flex gap-4 rounded-[1.5rem] border border-border/70 p-4">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="size-28 rounded-xl object-cover" src={item.imageUrl} />
                  ) : null}
                  <div className="min-w-0 flex-1"><Link className="text-xl font-medium hover:underline" href={`/artists/${item.artistUsername}/art/${item.itemId}`}>{item.title}</Link><p className="mt-1 text-sm text-muted-foreground">by {item.artistName}</p><p className="mt-4 font-semibold">{new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency }).format(Number(item.price))}</p></div>
                  {!checkout ? <Button aria-label={`Remove ${item.title}`} onClick={() => void remove(item.itemId)} size="icon" variant="ghost"><Trash2 /></Button> : null}
                </article>
              ))}</div>
            )}
          </section>
          <aside className="lg:sticky lg:top-6 lg:self-start"><div className="rounded-[2rem] border border-border/70 p-6 shadow-sm"><h2 className="text-xl font-semibold">Order summary</h2><div className="mt-5 flex justify-between border-t border-border pt-5"><span>Total</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(total)}</strong></div><p className="mt-3 text-sm leading-6 text-muted-foreground">Shipping and tax will be calculated when payment checkout is enabled.</p>{checkout ? <Button className="mt-6 w-full" disabled size="lg">Payment setup required</Button> : <Button asChild className="mt-6 w-full" disabled={items.length === 0} size="lg"><Link href="/checkout">Continue to checkout</Link></Button>}</div></aside>
        </div>
      </div>
    </main>
  );
}
