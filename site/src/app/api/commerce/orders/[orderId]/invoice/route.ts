import { getOrder } from "@/lib/commerce/orders";
import {
  buildInvoiceFileName,
  renderInvoiceHtml,
} from "@/lib/commerce/invoice";
import { apiError, withSession } from "@/lib/api/handler";

export function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  return withSession(request, async (session) => {
    const { orderId } = await context.params;
    const order = await getOrder(orderId);

    if (!order) {
      return apiError("That order could not be found.", 404, "not-found");
    }

    // Both sides of the sale keep a copy of the paperwork.
    if (order.buyerUid !== session.uid && order.sellerUid !== session.uid) {
      return apiError(
        "That order belongs to another account.",
        403,
        "permission-denied"
      );
    }

    const disposition =
      new URL(request.url).searchParams.get("download") === "0"
        ? "inline"
        : "attachment";

    return new Response(renderInvoiceHtml(order), {
      headers: {
        "Content-Disposition": `${disposition}; filename="${buildInvoiceFileName(order)}"`,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  });
}
