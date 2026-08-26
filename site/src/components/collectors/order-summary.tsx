"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/commerce/orders";

const STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: "bg-amber-100 text-amber-900",
  cancelled: "bg-muted text-muted-foreground",
  paid: "bg-green-100 text-green-800",
  refunded: "bg-blue-100 text-blue-900",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        STATUS_STYLES[status],
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

/**
 * Download an order's invoice.
 *
 * The invoice route is authenticated with a bearer token, which a plain link
 * cannot send, so the file is fetched and handed to the browser as a blob.
 */
export function DownloadInvoiceButton({ order }: { order: Order }) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!user) {
      return;
    }

    setDownloading(true);

    try {
      const response = await fetch(`/api/commerce/orders/${order.id}/invoice`, {
        headers: { authorization: `Bearer ${await user.getIdToken()}` },
      });

      if (!response.ok) {
        throw new Error("Unable to download that invoice.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `eduthart-invoice-${order.number}.html`;
      link.href = url;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      toast.error(
        downloadError instanceof Error ? downloadError.message : "Unable to download that invoice.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button disabled={downloading} onClick={() => void download()} size="sm" variant="outline">
      {downloading ? <Loader2 className="animate-spin" /> : <Download />}
      {downloading ? "Preparing..." : "Download invoice"}
    </Button>
  );
}
