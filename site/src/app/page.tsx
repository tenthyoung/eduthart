import { Suspense } from "react";

import { DiscoverySections } from "@/components/home/discovery-sections";
import { DiscoverySkeleton } from "@/components/home/discovery-skeleton";
import { HomeHero } from "@/components/home/home-hero";

/** The homepage shows live inventory, so it must not be cached at build time. */
export const dynamic = "force-dynamic";

export default function IndexPage() {
  return (
    <div className="w-full">
      <HomeHero />
      {/* The hero's words paint at once and its picture streams in; the
          artwork sections follow behind a skeleton of the same shape. Both
          share one read of the index (see home-data.ts). */}
      <Suspense fallback={<DiscoverySkeleton />}>
        <DiscoverySections />
      </Suspense>
    </div>
  );
}
