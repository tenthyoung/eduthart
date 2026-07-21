import Link from "next/link";
import { notFound } from "next/navigation";

import { normalizeListingStudio, type ListingItemDraft, type ListingStudioDraft } from "@/lib/artists/listing-flow";
import { buildArtistPageHref, type AccountProfile } from "@/lib/auth/account-profile";
import { findE2EAccountProfileByUsername, getE2EListingFlow, isE2EAuthEnabled } from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

async function getProfileByUsername(username: string): Promise<AccountProfile | null> {
  const normalized = username.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (isE2EAuthEnabled()) {
    return findE2EAccountProfileByUsername(normalized);
  }

  const snapshot = await getFirebaseAdminDb()
    .collection("users")
    .where("usernameLower", "==", normalized)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0]?.data() as Record<string, unknown> | undefined;

  if (!data) {
    return null;
  }

  return {
    authProviders: Array.isArray(data.authProviders)
      ? data.authProviders.filter((value): value is string => typeof value === "string")
      : [],
    bannerURL: typeof data.bannerURL === "string" ? data.bannerURL : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    email: typeof data.email === "string" ? data.email : null,
    firstName: typeof data.firstName === "string" ? data.firstName : null,
    lastLoginAt: typeof data.lastLoginAt === "string" ? data.lastLoginAt : null,
    lastName: typeof data.lastName === "string" ? data.lastName : null,
    legal: null,
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    shippingOriginAddress:
      typeof data.shippingOriginAddress === "object" && data.shippingOriginAddress !== null
        ? (data.shippingOriginAddress as AccountProfile["shippingOriginAddress"])
        : null,
    uid: typeof data.uid === "string" ? data.uid : snapshot.docs[0]?.id ?? "",
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    username: typeof data.username === "string" ? data.username : normalized,
  };
}

async function getPublishedListings(uid: string): Promise<ListingItemDraft[]> {
  const studio = isE2EAuthEnabled()
    ? await getE2EListingFlow(uid)
    : (
        await getFirebaseAdminDb()
          .collection("users")
          .doc(uid)
          .collection("seller")
          .doc("listing_flow")
          .get()
      ).data();

  if (!studio) {
    return [];
  }

  return normalizeListingStudio(studio as ListingStudioDraft).items.filter(
    (item) => item.salesVisibility.public && !item.salesVisibility.draft,
  );
}

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
  const profile = await getProfileByUsername(username);

  if (!profile?.username) {
    notFound();
  }

  const displayName = profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || `@${profile.username}`;
  const publishedListings = await getPublishedListings(profile.uid);

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-36 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl">
          <div className="relative h-56 w-full bg-gradient-to-r from-primary/30 via-amber-100 to-primary-light/20">
            {profile.bannerURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`${displayName} banner`}
                className="h-full w-full object-cover"
                src={profile.bannerURL}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/10 to-transparent" />
          </div>

          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
            <div className="flex items-center gap-4">
              <div className="-mt-16 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary/10 text-2xl font-semibold text-primary shadow-lg">
                {profile.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={displayName} className="h-full w-full object-cover" src={profile.photoURL} />
                ) : (
                  (displayName.trim()[0] ?? "@").toUpperCase()
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">Artist Page</p>
                <h1 className="text-4xl text-foreground sm:text-5xl">{displayName}</h1>
                <p className="text-base text-muted-foreground">@{profile.username}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
              Personal art page URL:
              {" "}
              <Link className="font-medium text-foreground underline decoration-primary/30 underline-offset-4" href={buildArtistPageHref(profile.username)}>
                {buildArtistPageHref(profile.username)}
              </Link>
            </div>
          </div>
        </div>

        <section className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl sm:p-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">Gallery</p>
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
                  <article key={item.id} className="group overflow-hidden rounded-[1.5rem] border border-border/70 bg-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg">
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
                          <h3 className="text-xl text-foreground">{item.artworkDetails.title || "Untitled artwork"}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {[item.artworkDetails.medium, item.artworkDetails.yearCreated].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {price ? <p className="shrink-0 text-base font-semibold text-foreground">{price}</p> : null}
                      </div>
                      {item.artworkDetails.description ? (
                        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{item.artworkDetails.description}</p>
                      ) : null}
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        {item.pricingInventory.availability === "original_available"
                          ? "Original available"
                          : item.pricingInventory.availability.replaceAll("_", " ")}
                      </p>
                    </div>
                  </article>
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
