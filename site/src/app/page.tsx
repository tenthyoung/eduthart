import { HomeHero } from "@/components/home/home-hero";
import { MarketplaceSections } from "@/components/home/marketplace-sections";

export default function IndexPage() {
  return (
    <div className="w-full">
      <div className="bg-transparent">
        <HomeHero />
      </div>
      <MarketplaceSections />
    </div>
  );
}
