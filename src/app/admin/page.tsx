"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  listAdminRoles,
  listModerationQueue,
  listRefundRequests,
  searchUsers,
} from "@/lib/admin/api";
import type {
  AdminRoleRecord,
  AdminUserSummary,
  ModerationQueueItem,
  RefundRequestRecord,
} from "@/lib/admin/types";
import { formatCurrencyFromMicros } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  AdminEmptyState,
  AdminPage,
  AdminStat,
} from "@/components/admin/admin-ui";

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [roles, setRoles] = useState<AdminRoleRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRequestRecord[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ModerationQueueItem[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [nextUsers, nextRoles, nextRefunds, nextModerationQueue] =
          await Promise.all([
            searchUsers(""),
            listAdminRoles(),
            listRefundRequests(),
            listModerationQueue(),
          ]);

        setUsers(nextUsers);
        setRoles(nextRoles);
        setRefunds(nextRefunds);
        setModerationQueue(nextModerationQueue);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Overview failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openRefunds = refunds.filter((request) =>
    ["requested", "under_review"].includes(request.status),
  ).length;

  return (
    <AdminPage
      title="Operational overview"
      description="A fast read on the live moderation queue, refund workload, recent users, and active administrators."
      actions={
        <Button asChild>
          <Link href="/admin/users">Open user search</Link>
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Open moderation items" value={moderationQueue.length} />
        <AdminStat label="Refunds awaiting action" value={openRefunds} tone={openRefunds > 0 ? "danger" : "default"} />
        <AdminStat label="Active admins" value={roles.length} />
        <AdminStat label="Recent users loaded" value={users.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <AdminCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.04em]">
                Recent users
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Newest accounts by last update timestamp.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/users">See all</Link>
            </Button>
          </div>
          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : users.length === 0 ? (
              <AdminEmptyState
                title="No users returned"
                description="The admin search endpoint did not return any recent users."
              />
            ) : (
              users.slice(0, 6).map((user) => (
                <Link
                  key={user.uid}
                  href={`/admin/users/${user.uid}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3 transition-colors hover:bg-black/[0.04]"
                >
                  <div>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[user.email ?? user.uid, user.accountStatus, `${user.tier} plan`]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-muted-foreground">
                    {formatCurrencyFromMicros(user.monthlyEstimatedCostMicrosUsd)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </AdminCard>

        <div className="space-y-6">
          <AdminCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.04em]">
                  Moderation queue
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deck reports currently open.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/admin/moderation">Review queue</Link>
              </Button>
            </div>
            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading queue...</p>
              ) : moderationQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reported decks right now.
                </p>
              ) : (
                moderationQueue.slice(0, 4).map((item) => (
                  <Link
                    key={item.publicDeckId}
                    href={`/admin/moderation/${item.publicDeckId}`}
                    className="block rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3 transition-colors hover:bg-black/[0.04]"
                  >
                    <p className="font-medium">{item.deckName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.openReportCount} open reports • {item.latestReason}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </AdminCard>

          <AdminCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.04em]">
                  Refund queue
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest requests needing review.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/admin/refunds">Open refunds</Link>
              </Button>
            </div>
            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading refunds...</p>
              ) : refunds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No refund requests yet.</p>
              ) : (
                refunds.slice(0, 4).map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-3"
                  >
                    <p className="font-medium">{request.userEmail ?? request.uid}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[request.reason, request.status, request.currentPriceDisplay]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminPage>
  );
}
