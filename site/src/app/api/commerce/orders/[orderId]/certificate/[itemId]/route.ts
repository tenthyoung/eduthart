import { apiError, withSession } from "@/lib/api/handler";
import {
  buildCertificateFileName,
  getCertificateForItem,
  issueCertificates,
  renderCertificateHtml,
} from "@/lib/commerce/certificates";
import { getOrder } from "@/lib/commerce/orders";

export function GET(
  request: Request,
  context: { params: Promise<{ itemId: string; orderId: string }> }
) {
  return withSession(request, async (session) => {
    const { itemId, orderId } = await context.params;
    const order = await getOrder(orderId);

    if (!order || !order.items.some((item) => item.itemId === itemId)) {
      return apiError("That order could not be found.", 404, "not-found");
    }

    // Both sides of the sale keep a copy, as with the invoice.
    if (order.buyerUid !== session.uid && order.sellerUid !== session.uid) {
      return apiError(
        "That order belongs to another account.",
        403,
        "permission-denied"
      );
    }

    if (order.status !== "paid") {
      return apiError(
        "A certificate is issued once the order is paid.",
        409,
        "order-not-paid"
      );
    }

    // Issued at fulfilment; issuing here covers one that failed to, and is a
    // no-op once it exists.
    const certificate =
      (await getCertificateForItem(order.id, itemId)) ??
      (await issueCertificates(order)).find(
        (candidate) => candidate.itemId === itemId
      );

    if (!certificate) {
      return apiError(
        "That certificate could not be issued.",
        500,
        "certificate-unavailable"
      );
    }

    const disposition =
      new URL(request.url).searchParams.get("download") === "0"
        ? "inline"
        : "attachment";

    return new Response(await renderCertificateHtml(certificate), {
      headers: {
        "Content-Disposition": `${disposition}; filename="${buildCertificateFileName(certificate)}"`,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  });
}
