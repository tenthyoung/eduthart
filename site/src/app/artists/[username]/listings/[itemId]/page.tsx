import { ListingFlowPage } from "@/components/artists/listing-flow-page";

export default async function ListingItemPage({
  params,
}: {
  params: Promise<{ itemId: string; username: string }>;
}) {
  const { itemId, username } = await params;

  return <ListingFlowPage itemId={itemId} username={username} />;
}
