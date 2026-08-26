import { formatAddressLines } from "@/lib/collectors/addresses";
import { formatMinorUnits } from "@/lib/commerce/money";
import type { Order } from "@/lib/commerce/orders";
import { getSiteUrl } from "@/lib/notifications/email";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
}

export function buildInvoiceFileName(order: Order) {
  return `eduthart-invoice-${order.number}.html`;
}

/**
 * A self-contained invoice document.
 *
 * It is served as a download and also prints cleanly, so a collector who needs
 * a PDF can save one from their browser without EduthArt taking on a PDF
 * rendering dependency.
 */
export function renderInvoiceHtml(order: Order) {
  const money = (amount: number) => formatMinorUnits(amount, order.currency);
  const shippingLines = order.shippingAddress ? formatAddressLines(order.shippingAddress) : [];
  const billingLines = order.billingAddress ? formatAddressLines(order.billingAddress) : shippingLines;

  const rows = order.items
    .map(
      (item) => `<tr>
        <td>
          <strong>${escapeHtml(item.title)}</strong><br />
          <span class="muted">Original artwork by ${escapeHtml(order.sellerName)}</span>
        </td>
        <td class="right">${money(item.unitAmountMinor)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>EduthArt invoice ${escapeHtml(order.number)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { background: #f6f3ef; color: #2f241c; font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; }
  .sheet { background: #fff; border-radius: 20px; margin: 0 auto; max-width: 720px; padding: 48px; }
  header { align-items: flex-start; border-bottom: 1px solid #efe9e2; display: flex; justify-content: space-between; padding-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 13px; letter-spacing: 0.18em; margin: 0 0 8px; text-transform: uppercase; }
  .muted { color: #8d8178; font-size: 13px; }
  .grid { display: grid; gap: 32px; grid-template-columns: 1fr 1fr; padding: 28px 0; }
  address { font-size: 14px; font-style: normal; line-height: 1.7; }
  table { border-collapse: collapse; width: 100%; }
  th { border-bottom: 1px solid #efe9e2; font-size: 12px; letter-spacing: 0.14em; padding-bottom: 10px; text-align: left; text-transform: uppercase; }
  td { border-bottom: 1px solid #f4efe9; font-size: 14px; padding: 16px 0; vertical-align: top; }
  .right { text-align: right; white-space: nowrap; }
  .totals { margin-left: auto; margin-top: 24px; width: 260px; }
  .totals div { display: flex; font-size: 14px; justify-content: space-between; padding: 6px 0; }
  .totals .total { border-top: 1px solid #efe9e2; font-size: 17px; font-weight: 700; margin-top: 8px; padding-top: 14px; }
  footer { border-top: 1px solid #efe9e2; color: #8d8178; font-size: 12px; line-height: 1.7; margin-top: 36px; padding-top: 20px; }
  .status { border-radius: 999px; display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; padding: 6px 14px; text-transform: uppercase; }
  .paid { background: #e6f4ea; color: #1e6b3a; }
  .unpaid { background: #fdf0e3; color: #8a5a1b; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { border-radius: 0; max-width: none; padding: 0; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div>
        <h1>EduthArt</h1>
        <p class="muted">${escapeHtml(getSiteUrl())}</p>
      </div>
      <div style="text-align:right">
        <h2>Invoice</h2>
        <p class="muted">${escapeHtml(order.number)}<br />${formatDate(order.paidAt ?? order.createdAt)}</p>
        <p><span class="status ${order.status === "paid" ? "paid" : "unpaid"}">${escapeHtml(order.status.replaceAll("_", " "))}</span></p>
      </div>
    </header>

    <div class="grid">
      <div>
        <h2>Billed to</h2>
        <address>${billingLines.map((line) => escapeHtml(line)).join("<br />") || "—"}</address>
        <p class="muted">${escapeHtml(order.buyerEmail ?? "")}</p>
      </div>
      <div>
        <h2>Ship to</h2>
        <address>${shippingLines.map((line) => escapeHtml(line)).join("<br />") || "—"}</address>
      </div>
    </div>

    <table>
      <thead>
        <tr><th>Item</th><th class="right">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${money(order.subtotalMinor)}</span></div>
      <div><span>Shipping</span><span>${money(order.shippingAmountMinor)}</span></div>
      <div class="total"><span>Total</span><span>${money(order.totalMinor)}</span></div>
    </div>

    <footer>
      Sold by ${escapeHtml(order.sellerName)} through EduthArt.<br />
      Questions about this order? Reply to your confirmation email and quote ${escapeHtml(order.number)}.
    </footer>
  </div>
</body>
</html>`;
}
