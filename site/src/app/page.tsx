import { DiscoverySections } from "@/components/home/discovery-sections";
import { HomeHero } from "@/components/home/home-hero";
import { MarketplaceSections } from "@/components/home/marketplace-sections";

/** The homepage shows live inventory, so it must not be cached at build time. */
export const dynamic = "force-dynamic";

export default function IndexPage() {
  return (
    <div className="w-full">
      <div className="bg-transparent">
        <HomeHero />
      </div>
      <DiscoverySections />
      <MarketplaceSections />
    </div>
  );
}
