import { OrderDetailPage } from "@/components/collectors/order-detail-page";

export const metadata = { title: "Order | EduthArt" };

export default async function OrderDetailRoute({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailPage orderId={orderId} />;
}
