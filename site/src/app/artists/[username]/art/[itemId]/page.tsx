import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { normalizeListingStudio, type ListingItemDraft, type ListingStudioDraft } from "@/lib/artists/listing-flow";
import { findE2EAccountProfileByUsername, getE2EListingFlow, isE2EAuthEnabled } from "@/lib/auth/e2e-store";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type PublicArtwork = {
  artistName: string;
  item: ListingItemDraft;
};

async function getPublicArtwork(username: string, itemId: string): Promise<PublicArtwork | null> {
  const normalizedUsername = username.trim().toLowerCase();

  if (isE2EAuthEnabled()) {
    const profile = await findE2EAccountProfileByUsername(normalizedUsername);
    if (!profile) return null;

    const studio = await getE2EListingFlow(profile.uid);
    const item = studio
      ? normalizeListingStudio(studio).items.find((candidate) => candidate.id === itemId)
      : null;

    if (!item?.salesVisibility.public || item.salesVisibility.draft) return null;

    return {
      artistName: profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || `@${profile.username}`,
      item,
    };
  }

  const db = getFirebaseAdminDb();
  const profileSnapshot = await db
    .collection("users")
    .where("usernameLower", "==", normalizedUsername)
    .limit(1)
    .get();
  const profileDocument = profileSnapshot.docs[0];

  if (!profileDocument) return null;

  const studioSnapshot = await profileDocument.ref.collection("seller").doc("listing_flow").get();
  if (!studioSnapshot.exists) return null;

  const item = normalizeListingStudio(studioSnapshot.data() as ListingStudioDraft).items.find(
    (candidate) => candidate.id === itemId,
  );

  if (!item?.salesVisibility.public || item.salesVisibility.draft) return null;

  const profile = profileDocument.data() as Record<string, unknown>;
  const fullName = [profile.firstName, profile.lastName].filter((value) => typeof value === "string" && value).join(" ");

  return {
    artistName:
      (typeof profile.displayName === "string" && profile.displayName) ||
      fullName ||
      `@${normalizedUsername}`,
    item,
  };
}

function formatPrice(item: ListingItemDraft) {
  const price = Number(item.pricingInventory.price);

  if (!Number.isFinite(price) || price <= 0) return "Price on request";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: item.pricingInventory.currency || "USD",
  }).format(price);
}

export default async function PublicArtworkPage({
  params,
}: {
  params: Promise<{ itemId: string; username: string }>;
}) {
  const { itemId, username } = await params;
  const artwork = await getPublicArtwork(username, itemId);

  if (!artwork) notFound();

  const { item, artistName } = artwork;
  const images = [item.media.mainImageUrl, ...item.media.galleryImageUrls].filter(
    (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index,
  );
  const available = item.pricingInventory.availability === "original_available";
  const dimensions = item.dimensions.width && item.dimensions.height
    ? `${item.dimensions.width} × ${item.dimensions.height}${item.dimensions.depth ? ` × ${item.dimensions.depth}` : ""} ${item.dimensions.unit}`
    : null;
  const inquiryHref = `/contact?${new URLSearchParams({
    artwork: item.artworkDetails.title || "Untitled artwork",
    artist: artistName,
    listing: `/artists/${username}/art/${item.id}`,
  }).toString()}`;

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" href={`/artists/${username}`}>
          <ArrowLeft className="size-4" />
          Back to {artistName}&apos;s gallery
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <section className="space-y-4">
            <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-muted/20">
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={item.artworkDetails.title || "Artwork"} className="aspect-[4/3] w-full object-cover" src={images[0]} />
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {images.slice(1).map((image, index) => (
                  <div key={image} className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={`${item.artworkDetails.title || "Artwork"} view ${index + 2}`} className="aspect-square w-full object-cover" src={image} />
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_30px_80px_-48px_rgba(47,36,28,0.4)] sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Original artwork</p>
              <h1 className="mt-3 text-4xl text-foreground">{item.artworkDetails.title || "Untitled artwork"}</h1>
              <Link className="mt-2 inline-block text-base text-muted-foreground underline decoration-primary/30 underline-offset-4" href={`/artists/${username}`}>
                by {artistName}
              </Link>
              <p className="mt-6 text-3xl font-semibold text-foreground">{formatPrice(item)}</p>

              <div className="mt-6 grid gap-3 border-y border-border/60 py-6 text-sm">
                {item.artworkDetails.medium ? <Detail label="Medium" value={item.artworkDetails.medium} /> : null}
                {item.artworkDetails.yearCreated ? <Detail label="Year" value={item.artworkDetails.yearCreated} /> : null}
                {dimensions ? <Detail label="Dimensions" value={dimensions} /> : null}
                {item.artworkDetails.category ? <Detail label="Category" value={item.artworkDetails.category} /> : null}
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-foreground">
                <span className={`inline-flex size-6 items-center justify-center rounded-full ${available ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {available ? <Check className="size-4" /> : null}
                </span>
                {available ? "Original available" : item.pricingInventory.availability.replaceAll("_", " ")}
              </div>

              {available ? (
                <Link className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition hover:brightness-105" href={inquiryHref}>
                  Inquire to purchase
                </Link>
              ) : (
                <button className="mt-6 w-full rounded-xl bg-muted px-5 py-3.5 text-base font-semibold text-muted-foreground" disabled type="button">
                  Currently unavailable
                </button>
              )}

              <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                Payment and shipping are coordinated securely after the artist confirms availability.
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {item.artworkDetails.description ? <CopySection title="About this artwork" copy={item.artworkDetails.description} /> : null}
          {item.artworkDetails.storyBehindPiece ? <CopySection title="Story behind the piece" copy={item.artworkDetails.storyBehindPiece} /> : null}
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function CopySection({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="rounded-[2rem] border border-border/60 bg-white p-7">
      <h2 className="text-2xl text-foreground">{title}</h2>
      <p className="mt-4 whitespace-pre-line text-base leading-8 text-muted-foreground">{copy}</p>
    </section>
  );
}
