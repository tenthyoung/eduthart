import {
  ArrowLeft,
  BadgeCheck,
  Lock,
  PenLine,
  RotateCcw,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ArtworkGallery } from "@/components/artwork/artwork-gallery";
import { WallPreview } from "@/components/artwork/wall-preview";
import { ArtworkActions } from "@/components/collectors/artwork-actions";
import {
  ARTWORK_GRID_CLASS,
  ArtworkCard,
} from "@/components/collectors/artwork-card";
import { FollowArtistButton } from "@/components/collectors/follow-artist-button";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { MotionFade } from "@/components/motion/motion-fade";
import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { listIndexedArtworks } from "@/lib/artists/artwork-index";
import {
  buildBrowseHref,
  listAvailableArtworks,
} from "@/lib/artists/artwork-search";
import { type ListingItemDraft } from "@/lib/artists/listing-flow";
import { getPublicArtwork } from "@/lib/artists/public-artwork";
import { buildArtworkKey } from "@/lib/collectors/artwork-reference";
import { getArtworkSaveCount } from "@/lib/collectors/favorites";

/** One row of the grid for each of the two "more work" shelves. */
const SHELF_LIMIT = 4;

function formatPrice(item: ListingItemDraft) {
  const price = Number(item.pricingInventory.price);

  if (!Number.isFinite(price) || price <= 0) return "Price on request";

  // Whole amounts read as "$1,850", matching the cards that link here.
  return new Intl.NumberFormat("en-US", {
    currency: item.pricingInventory.currency || "USD",
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
    style: "currency",
  }).format(price);
}

/** A positive number from a free-text dimension field, or null. */
function readDimension(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export default async function PublicArtworkPage({
  params,
}: {
  params: Promise<{ itemId: string; username: string }>;
}) {
  const { itemId, username } = await params;
  const artwork = await getPublicArtwork(username, itemId);

  if (!artwork) notFound();

  const { artistName, item, shipping } = artwork;
  const title = item.artworkDetails.title || "Untitled artwork";
  const artworkKey = buildArtworkKey({
    artistUid: artwork.artistUid,
    itemId: item.id,
  });
  const [saveCount, index] = await Promise.all([
    getArtworkSaveCount(artworkKey),
    listIndexedArtworks(),
  ]);

  const images = [item.media.mainImageUrl, ...item.media.galleryImageUrls]
    .concat([
      item.media.sideProfileImageUrl,
      item.media.signatureImageUrl,
      item.media.backImageUrl,
    ])
    .filter(
      (value, position, array): value is string =>
        Boolean(value) && array.indexOf(value) === position
    );
  const available = item.pricingInventory.availability === "original_available";

  const { dimensions } = item;
  const width = readDimension(dimensions.width);
  const height = readDimension(dimensions.height);
  const sizeLabel =
    width && height
      ? `${width} × ${height}${readDimension(dimensions.depth) ? ` × ${dimensions.depth}` : ""} ${dimensions.unit}`
      : null;

  const facts = [
    sizeLabel,
    item.artworkDetails.medium,
    dimensions.framed || dimensions.frameIncluded
      ? "Framed"
      : dimensions.readyToHang
        ? "Ready to hang"
        : null,
    item.salesVisibility.original
      ? item.artworkDetails.yearCreated
        ? `One of one, ${item.artworkDetails.yearCreated}`
        : "One of one"
      : item.artworkDetails.yearCreated,
  ].filter((fact): fact is string => Boolean(fact));

  const details: [string, string][] = (
    [
      ["Medium", item.artworkDetails.medium],
      ["Surface", item.artworkDetails.surface],
      ["Size", sizeLabel],
      [
        "Weight",
        readDimension(dimensions.weight)
          ? `${dimensions.weight} ${dimensions.weightUnit}`
          : null,
      ],
      ["Year", item.artworkDetails.yearCreated],
      ["Category", item.artworkDetails.category],
      ["Style", item.artworkDetails.style],
      ["Subject", item.artworkDetails.subject],
      [
        "Framing",
        dimensions.framed || dimensions.frameIncluded
          ? [dimensions.frameColor, dimensions.frameMaterial, "frame"]
              .filter(Boolean)
              .join(" ")
          : dimensions.readyToHang
            ? "Unframed, ready to hang"
            : null,
      ],
    ] as [string, string | null][]
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));

  // Every promise here comes from what the artist set for their studio, so
  // nothing is claimed that the listing does not back up.
  const assurances: { icon: LucideIcon; title: string; body: ReactNode }[] = [];

  if (shipping?.shippedFromSummary) {
    assurances.push({
      body: [
        shipping.processingTime
          ? `Ready to ship in ${shipping.processingTime}.`
          : null,
        shipping.insuranceIncluded ? "Insured in transit." : null,
        "Shipping is quoted for your address at checkout.",
      ]
        .filter(Boolean)
        .join(" "),
      icon: Truck,
      title: `Ships from ${shipping.shippedFromSummary}`,
    });
  }

  if (shipping?.certificateOfAuthenticityIncluded) {
    assurances.push({
      body: `Comes with a certificate of authenticity from ${artistName}.`,
      icon: BadgeCheck,
      title: "Certificate of authenticity",
    });
  }

  if (shipping?.signed) {
    const where = [
      shipping.signedFront ? "front" : null,
      shipping.signedBack ? "back" : null,
    ].filter(Boolean);

    assurances.push({
      body: where.length
        ? `Signed on the ${where.join(" and ")} by the artist.`
        : "Signed by the artist.",
      icon: PenLine,
      title: "Signed",
    });
  }

  assurances.push(
    {
      body: "Payment is handled by Stripe. Your card details never pass through EduthArt.",
      icon: Lock,
      title: "Secure checkout",
    },
    {
      body: (
        <>
          See our{" "}
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href="/legal/refund-cancellation-policy"
          >
            refund and cancellation policy
          </Link>
          .
        </>
      ),
      icon: RotateCcw,
      title: "Refunds and cancellations",
    }
  );

  const others = listAvailableArtworks(index).filter(
    (candidate) =>
      !(
        candidate.itemId === item.id &&
        candidate.artistUid === artwork.artistUid
      )
  );
  const moreFromArtist = others
    .filter((candidate) => candidate.artistUid === artwork.artistUid)
    .slice(0, SHELF_LIMIT);
  const category = item.artworkDetails.category.trim().toLowerCase();
  const similar = others
    .filter(
      (candidate) =>
        candidate.artistUid !== artwork.artistUid &&
        Boolean(category) &&
        candidate.category.trim().toLowerCase() === category
    )
    .slice(0, SHELF_LIMIT);

  const inquiryHref = `/contact?${new URLSearchParams({
    artwork: title,
    artist: artistName,
    listing: `/artists/${username}/art/${item.id}`,
  }).toString()}`;
  const initial = artistName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:pt-28">
      <Link
        className="inline-flex h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        href={`/artists/${username}`}
      >
        <ArrowLeft className="size-4" />
        More from {artistName}
      </Link>

      <div className="mt-2 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:gap-x-14 lg:gap-y-5">
        <div className="rise-in">
          <ArtworkGallery images={images} title={title} />
        </div>

        <aside className="rise-in flex flex-col gap-6 lg:sticky lg:top-24 lg:row-span-2 lg:self-start">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="group flex min-w-0 items-center gap-3"
              href={`/artists/${username}`}
            >
              {artwork.artistPhotoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="size-11 shrink-0 rounded-full object-cover"
                  src={artwork.artistPhotoURL}
                />
              ) : (
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
                  {initial}
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold text-foreground group-hover:underline">
                  {artistName}
                </span>
                {artwork.artistLocation ? (
                  <span className="truncate text-sm text-muted-foreground">
                    {artwork.artistLocation}
                  </span>
                ) : null}
              </span>
            </Link>
            <FollowArtistButton
              artistName={artistName}
              artistUid={artwork.artistUid}
              size="sm"
              username={username}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-4xl leading-[1.04] text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="text-3xl font-bold text-foreground">
              {formatPrice(item)}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                <span
                  aria-hidden
                  className={
                    available
                      ? "size-2 rounded-full bg-emerald-600 dark:bg-emerald-400"
                      : "size-2 rounded-full bg-muted-foreground"
                  }
                />
                {available
                  ? "Original available"
                  : item.pricingInventory.availability.replaceAll("_", " ")}
              </span>
              {saveCount > 0 ? (
                <span>
                  Saved by {saveCount}{" "}
                  {saveCount === 1 ? "collector" : "collectors"}
                </span>
              ) : null}
            </p>
          </div>

          {facts.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {facts.map((fact) => (
                <li
                  className="inline-flex h-9 items-center rounded-full bg-muted px-3.5 text-sm font-medium text-foreground"
                  key={fact}
                >
                  {fact}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-col gap-1">
            {available ? (
              <>
                <AddToCartButton
                  className="mt-0 h-12 text-base"
                  itemId={item.id}
                  username={username}
                />
                <Link
                  className="mt-2 flex h-12 w-full items-center justify-center rounded-xl border border-input text-base font-medium text-foreground transition-colors hover:border-foreground"
                  href={inquiryHref}
                >
                  Ask a question
                </Link>
              </>
            ) : (
              <button
                className="h-12 w-full rounded-xl bg-muted text-base font-semibold text-muted-foreground"
                disabled
                type="button"
              >
                Currently unavailable
              </button>
            )}
            <ArtworkActions
              artworkKey={artworkKey}
              itemId={item.id}
              title={title}
              username={username}
            />
          </div>

          <ul className="flex flex-col border-t border-border">
            {assurances.map((assurance) => {
              const Icon = assurance.icon;

              return (
                <li
                  className="flex gap-3.5 border-b border-border py-4"
                  key={assurance.title}
                >
                  <Icon className="mt-0.5 size-5 shrink-0 text-brass" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">
                      {assurance.title}
                    </span>
                    <span className="text-sm leading-6 text-muted-foreground">
                      {assurance.body}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Last in the source so a phone shows it after the buy buttons; on a
            wide screen it sits in the first column, under the photo. */}
        {available && width && height && images[0] ? (
          <div className="lg:col-start-1">
            <WallPreview
              artworkHeight={height}
              artworkWidth={width}
              imageUrl={images[0]}
              title={title}
              unit={dimensions.unit}
            />
          </div>
        ) : null}
      </div>

      {item.artworkDetails.description ||
      item.artworkDetails.storyBehindPiece ||
      details.length > 0 ? (
        <MotionFade className="mt-20 lg:mt-28" delay={0.05} duration={0.9}>
          <section className="grid gap-12 border-t border-border pt-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:gap-14">
            <div className="flex flex-col gap-10">
              {item.artworkDetails.description ? (
                <Story title="About this piece">
                  {item.artworkDetails.description}
                </Story>
              ) : null}
              {item.artworkDetails.storyBehindPiece ? (
                <Story title="How it was made">
                  {item.artworkDetails.storyBehindPiece}
                </Story>
              ) : null}
            </div>
            {details.length > 0 ? (
              <dl className="grid h-fit grid-cols-[auto_minmax(0,1fr)] border-t border-border text-sm">
                {details.map(([label, value]) => (
                  <div className="contents" key={label}>
                    <dt className="border-b border-border py-3.5 pr-6 text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="border-b border-border py-3.5 text-right font-medium text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        </MotionFade>
      ) : null}

      {moreFromArtist.length > 0 ? (
        <Shelf
          href={`/artists/${username}`}
          linkLabel="Visit the studio"
          title={`More from ${artistName}`}
        >
          {moreFromArtist.map((candidate) => (
            <ArtworkCard artwork={candidate} key={candidate.key} />
          ))}
        </Shelf>
      ) : null}

      {similar.length > 0 ? (
        <Shelf
          href={buildBrowseHref({ category: item.artworkDetails.category })}
          linkLabel="See all"
          title="Similar pieces"
        >
          {similar.map((candidate) => (
            <ArtworkCard artwork={candidate} key={candidate.key} />
          ))}
        </Shelf>
      ) : null}
    </div>
  );
}

function Story({ children, title }: { children: string; title: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl text-foreground sm:text-3xl">{title}</h2>
      <p className="max-w-2xl whitespace-pre-line text-lg leading-8 text-muted-foreground">
        {children}
      </p>
    </section>
  );
}

function Shelf({
  children,
  href,
  linkLabel,
  title,
}: {
  children: ReactNode[];
  href: string;
  linkLabel: string;
  title: string;
}) {
  return (
    <section className="mt-20 lg:mt-24">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl text-foreground sm:text-3xl">{title}</h2>
        <Link
          className="text-sm font-semibold text-foreground hover:underline"
          href={href}
        >
          {linkLabel}
        </Link>
      </div>
      <MotionStaggerFade
        className={ARTWORK_GRID_CLASS}
        delay={0.07}
        duration={0.8}
        initialDelay={0.05}
      >
        {children}
      </MotionStaggerFade>
    </section>
  );
}
