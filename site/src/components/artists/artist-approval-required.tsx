import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ARTIST_APPLICATION_PATH } from "@/lib/artists/artist-approval";

/**
 * Shown in place of the listing studio to a signed-in account that has not
 * been accepted as an artist yet (EDUTHA-137). The listing API refuses them
 * either way; this tells them what to do about it.
 */
export function ArtistApprovalRequired() {
  return (
    <section className="min-h-screen bg-transparent px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto max-w-2xl border-t border-foreground pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Selling on EduthArt
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
          Apply to sell your art
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Every artist on EduthArt is reviewed before they can list work, so
          collectors know what they&apos;re buying. Send us your application
          and we&apos;ll be in touch once we&apos;ve looked at your work.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="rounded-full" size="lg">
            <Link href={ARTIST_APPLICATION_PATH}>Apply to be an artist</Link>
          </Button>
          <Button asChild className="rounded-full" size="lg" variant="outline">
            <Link href="/for-artists">How it works</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
