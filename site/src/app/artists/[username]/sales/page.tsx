import type { Metadata } from "next";

import { ArtistSalesPage } from "@/components/artists/artist-sales-page";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Orders & payouts | EduthArt",
};

export default async function SalesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return <ArtistSalesPage username={username} />;
}
