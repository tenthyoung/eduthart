import { MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { type ListingItemDraft } from "@/lib/artists/listing-flow";
import { listPublishedArtworks } from "@/lib/artists/listing-store";
import {
  buildProfileDisplayName,
  findAccountProfileByUsername,
} from "@/lib/auth/profile-store";
import { ArtistAvatar } from "@/components/artists/artist-avatar";
import { EditArtistPageButton } from "@/components/artists/edit-artist-page-button";
import { ShareArtistPageButton } from "@/components/artists/share-artist-page-button";
import { FollowArtistButton } from "@/components/collectors/follow-artist-button";
import { countArtistFollowers } from "@/lib/collectors/follows";
import { cn } from "@/lib/utils";

function formatPrice(item: ListingItemDraft) {
  const price = Number(item.pricingInventory.price);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: item.pricingInventory.currency || "USD",
  }).format(price);
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await findAccountProfileByUsername(username);

  if (!profile?.username) {
    notFound();
  }

  const displayName = buildProfileDisplayName(profile);
  const [publishedListings, followerCount] = await Promise.all([
    listPublishedArtworks(profile.uid),
    countArtistFollowers(profile.uid),
  ]);

  return (
    <main className="min-h-screen bg-white dark:bg-background px-4 pb-24 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 dark:border-border dark:bg-card/92 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl">
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6">
            <ShareArtistPageButton
              artistName={displayName}
              username={profile.username}
            />
            <EditArtistPageButton artistUid={profile.uid} />
          </div>

          {profile.bannerURL ? (
            <div className="relative aspect-[3/1] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${displayName} banner`}
                className="h-full w-full object-cover"
                src={profile.bannerURL}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/60 dark:from-card/60 via-transparent to-transparent" />
            </div>
          ) : null}

          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
            <div className="flex items-center gap-4">
              <ArtistAvatar
                artistUid={profile.uid}
                className={cn(profile.bannerURL && "-mt-16")}
                displayName={displayName}
                photoURL={profile.photoURL}
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">
                  Artist Page
                </p>
                <h1 className="text-4xl text-foreground sm:text-5xl">
                  {displayName}
                </h1>
                <p className="text-base text-muted-foreground">
                  @{profile.username}
                </p>
                {profile.location ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-4" />
                    {profile.location}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {followerCount}{" "}
                  {followerCount === 1 ? "follower" : "followers"}
                </p>
              </div>
            </div>

            <FollowArtistButton
              artistName={displayName}
              artistUid={profile.uid}
              username={profile.username}
            />
          </div>
        </div>

        {profile.bio ? (
          <section className="rounded-[2rem] border border-white/70 bg-white/92 dark:border-border dark:bg-card/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">
              About
            </p>
            <p className="mt-3 max-w-3xl whitespace-pre-line text-base leading-8 text-muted-foreground">
              {profile.bio}
            </p>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-white/70 bg-white/92 dark:border-border dark:bg-card/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl sm:p-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">
              Gallery
            </p>
            <h2 className="text-3xl text-foreground">Available artwork</h2>
            <p className="text-base leading-7 text-muted-foreground">
              Explore the work {displayName} has published for collectors.
            </p>
          </div>

          {publishedListings.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {publishedListings.map((item) => {
                const price = formatPrice(item);

                return (
                  <Link
                    key={item.id}
                    aria-label={`View ${item.artworkDetails.title || "artwork"}`}
                    href={`/artists/${profile.username}/art/${item.id}`}
                    className="group block overflow-hidden rounded-[1.5rem] border border-border/70 bg-white dark:bg-card shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted/30">
                      {item.media.mainImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={item.artworkDetails.title || "Published artwork"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          src={item.media.mainImageUrl}
                        />
                      ) : null}
                    </div>
                    <div className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl text-foreground">
                            {item.artworkDetails.title || "Untitled artwork"}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {[
                              item.artworkDetails.medium,
                              item.artworkDetails.yearCreated,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        {price ? (
                          <p className="shrink-0 text-base font-semibold text-foreground">
                            {price}
                          </p>
                        ) : null}
                      </div>
                      {item.artworkDetails.description ? (
                        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {item.artworkDetails.description}
                        </p>
                      ) : null}
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        {item.pricingInventory.availability ===
                        "original_available"
                          ? "Original available"
                          : item.pricingInventory.availability.replaceAll(
                              "_",
                              " "
                            )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-[1.5rem] border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-base text-muted-foreground">
              No public artwork has been added yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
