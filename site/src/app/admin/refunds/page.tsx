"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminCard, AdminPage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  listRefundRequests,
  updateRefundRequestStatus,
} from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/format";
import type { RefundRequestRecord } from "@/lib/admin/types";

const refundStatuses = [
  "requested",
  "under_review",
  "approved",
  "rejected",
  "completed",
];

export default function AdminRefundsPage() {
  const [items, setItems] = useState<RefundRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const nextItems = await listRefundRequests();
      setItems(nextItems);
      setDraftStatus(
        Object.fromEntries(nextItems.map((item) => [item.id, item.status])),
      );
      setDraftNotes(
        Object.fromEntries(nextItems.map((item) => [item.id, item.adminNotes ?? ""])),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Refunds failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (request: RefundRequestRecord) => {
    setSavingId(request.id);
    try {
      await updateRefundRequestStatus(
        request.id,
        draftStatus[request.id] ?? request.status,
        draftNotes[request.id] ?? request.adminNotes ?? "",
      );
      toast.success("Refund request updated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Refund update failed.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminPage
      title="Refund requests"
      description="Review in-app refund requests, record admin notes, and track the current state of each case."
      actions={
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      <div className="space-y-4">
        {items.length === 0 ? (
          <AdminCard>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading refund requests..." : "No refund requests yet."}
            </p>
          </AdminCard>
        ) : (
          items.map((request) => (
            <AdminCard key={request.id} className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {request.userEmail ?? request.uid}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[request.reason, request.currentPriceDisplay, request.currentTier]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Created {formatDateTime(request.createdAt)}
                </div>
              </div>

              {request.details ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {request.details}
                </p>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[240px_1fr_auto] xl:items-start">
                <Select
                  value={draftStatus[request.id] ?? request.status}
                  onValueChange={(value) =>
                    setDraftStatus((current) => ({ ...current, [request.id]: value }))
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {refundStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  value={draftNotes[request.id] ?? ""}
                  onChange={(event) =>
                    setDraftNotes((current) => ({
                      ...current,
                      [request.id]: event.target.value,
                    }))
                  }
                  placeholder="Admin notes"
                  className="min-h-28 bg-white"
                />

                <Button
                  disabled={savingId !== null}
                  onClick={() => void save(request)}
                >
                  {savingId === request.id ? "Saving..." : "Save"}
                </Button>
              </div>
            </AdminCard>
          ))
        )}
      </div>
    </AdminPage>
  );
}
