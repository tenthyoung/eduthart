import { Images } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSharedCollection } from "@/lib/collectors/collections";
import {
  buildProfileDisplayName,
  loadAccountProfile,
} from "@/lib/auth/profile-store";
import { formatMinorUnits } from "@/lib/commerce/money";

export default async function SharedCollectionPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const collection = await getSharedCollection(shareId);

  if (!collection) {
    notFound();
  }

  const owner = await loadAccountProfile(collection.ownerUid);
  const ownerName = owner
    ? buildProfileDisplayName(owner)
    : "An EduthArt collector";
  const artworks = collection.artworks
    .map((entry) => entry.artwork)
    .filter((artwork) => artwork !== null);

  return (
    <main className="min-h-screen bg-white dark:bg-background px-4 pb-24 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            <Images className="size-3.5" />
            Shared collection
          </div>
          <h1 className="text-4xl text-foreground sm:text-5xl">
            {collection.name}
          </h1>
          <p className="text-base text-muted-foreground">
            Curated by {ownerName} · {artworks.length}{" "}
            {artworks.length === 1 ? "artwork" : "artworks"}
          </p>
        </header>

        {artworks.length === 0 ? (
          <p className="rounded-[2rem] border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
            This collection is empty right now.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => (
              <Link
                key={artwork.key}
                className="group block overflow-hidden rounded-[1.5rem] border border-border/70 bg-white dark:bg-card shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg"
                href={artwork.href}
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted/30">
                  {artwork.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={artwork.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      src={artwork.imageUrl}
                    />
                  ) : null}
                </div>
                <div className="space-y-1 p-5">
                  <h2 className="text-lg text-foreground">{artwork.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    by {artwork.artistName}
                  </p>
                  <p className="pt-2 font-semibold text-foreground">
                    {artwork.priceMinor > 0
                      ? formatMinorUnits(artwork.priceMinor, artwork.currency)
                      : "Price on request"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
