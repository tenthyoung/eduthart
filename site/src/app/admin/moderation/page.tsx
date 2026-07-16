"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminCard, AdminPage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { listModerationQueue } from "@/lib/admin/api";
import type { ModerationQueueItem } from "@/lib/admin/types";

export default function AdminModerationPage() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await listModerationQueue());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Queue failed to load.");
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
      description="Review reported decks, inspect live publication state, and take warn, hide, or remove actions through the server-verified admin backend."
      actions={
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      <AdminCard>
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading moderation queue..." : "No reported decks right now."}
            </p>
          ) : (
            items.map((item) => (
              <Link
                key={item.publicDeckId}
                href={`/admin/moderation/${item.publicDeckId}`}
                className="block rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-4 transition-colors hover:bg-black/[0.04]"
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium">{item.deckName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[
                        item.latestReason,
                        item.latestReportType,
                        item.visibility,
                        item.publicationStatus,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-muted-foreground">
                    {item.openReportCount} open reports
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
