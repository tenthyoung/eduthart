import { ListingManagerPage } from "@/components/artists/listing-manager-page";

export default async function NewListingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return <ListingManagerPage username={username} />;
}
