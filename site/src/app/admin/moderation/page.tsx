"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminCard, AdminPage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { listModerationQueue } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/format";
import type { ModerationQueueItem } from "@/lib/admin/types";

function describeListingState(item: ModerationQueueItem) {
  if (item.moderationStatus === "hidden") return "Taken down";
  if (item.moderationStatus === "removed") return "Removed";
  if (item.moderationStatus === "warned") return "Warned, still listed";
  return item.listed ? "Listed" : "Not listed";
}

export default function AdminModerationPage() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listModerationQueue());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Queue failed to load."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminPage
      title="Moderation queue"
      description="Artworks with open reports, mostly DMCA notices. Open one to read the notice, see whether the piece is still listed, and warn the artist, take it down, or dismiss the report."
      actions={
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      <AdminCard>
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading moderation queue..."
                : "No reported artworks right now."}
            </p>
          ) : (
            items.map((item) => (
              <Link
                key={item.artworkKey}
                href={`/admin/moderation/${encodeURIComponent(item.artworkKey)}`}
                className="block rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-4 transition-colors hover:bg-black/[0.04]"
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-xl bg-black/[0.06]" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[
                          item.artistName,
                          item.latestReason,
                          describeListingState(item),
                          `Latest ${formatDateTime(item.latestReportedAt)}`,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-muted-foreground">
                    {item.openReportCount} open report
                    {item.openReportCount === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </AdminCard>
    </AdminPage>
  );
}
