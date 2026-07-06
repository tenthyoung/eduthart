"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { AdminCard, AdminPage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminUserDetails, updateUserModerationState } from "@/lib/admin/api";
import {
  formatCurrency,
  formatCurrencyFromMicros,
  formatDateTime,
} from "@/lib/admin/format";
import type { AdminUserDetail } from "@/lib/admin/types";

const accountActions = [
  { action: "activate", label: "Activate user", destructive: false },
  { action: "suspend", label: "Suspend user", destructive: true },
  { action: "ban", label: "Ban user", destructive: true },
  { action: "unban", label: "Unban user", destructive: false },
] as const;

export default function AdminUserDetailPage() {
  const params = useParams<{ uid: string }>();
  const uid = params.uid;
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await getAdminUserDetails(uid));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "User detail failed to load.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const fullName = useMemo(() => {
    if (!detail) {
      return "";
    }

    return [detail.user.firstName, detail.user.lastName]
      .filter((value): value is string => Boolean(value))
      .join(" ");
  }, [detail]);

  const handleAction = async (action: string) => {
    setSubmittingAction(action);
    try {
      await updateUserModerationState(uid, action, reason);
      toast.success("User moderation updated.");
      setReason("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Moderation update failed.");
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <AdminPage
      title={detail ? fullName || detail.user.email || detail.user.uid : "User detail"}
      description="Moderate account state, inspect billing and AI usage, and review any public decks this user owns."
      actions={
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      {!detail ? (
        <AdminCard>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading user detail..." : "No user detail available."}
          </p>
        </AdminCard>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <AdminCard className="space-y-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">
                  Account
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>{detail.user.email ?? "No email"}</span>
                  <span>•</span>
                  <span>{detail.user.accountStatus}</span>
                  <span>•</span>
                  <span>
                    {detail.user.publishingDisabled
                      ? "Publishing disabled"
                      : "Publishing enabled"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4">
                  <p className="text-sm font-medium">Billing tier</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {detail.billing.currentTier}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {detail.billing.monthlyDisplay}
                  </p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4">
                  <p className="text-sm font-medium">Monthly AI cost</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {formatCurrencyFromMicros(
                      detail.aiUsage?.monthlyEstimatedCostMicrosUsd ?? 0,
                    )}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {detail.aiUsage?.monthlyTokens ?? 0} tokens this month
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Created: {formatDateTime(detail.user.createdAt)}</p>
                <p>Updated: {formatDateTime(detail.user.updatedAt)}</p>
                <p>
                  Latest paid: {formatCurrency(detail.billing.latestKnownAmountPaidUsd)}
                </p>
                <p>
                  Renews: {detail.billing.latestKnownRenewsAt ?? "Unknown"}
                </p>
                {detail.user.moderationReason ? (
                  <p>Current moderation reason: {detail.user.moderationReason}</p>
                ) : null}
              </div>
            </AdminCard>

            <AdminCard className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.04em]">
                  Moderation actions
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use a reason whenever you change account state. It is stored in the user profile for later review.
                </p>
              </div>
              <Input
                placeholder="Reason for this action"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {accountActions.map((item) => (
                  <Button
                    key={item.action}
                    variant={item.destructive ? "destructive" : "outline"}
                    disabled={submittingAction !== null}
                    onClick={() => void handleAction(item.action)}
                  >
                    {submittingAction === item.action
                      ? "Saving..."
                      : item.label}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  disabled={submittingAction !== null}
                  onClick={() =>
                    void handleAction(
                      detail.user.publishingDisabled
                        ? "enable_publishing"
                        : "disable_publishing",
                    )
                  }
                >
                  {submittingAction === "enable_publishing" ||
                  submittingAction === "disable_publishing"
                    ? "Saving..."
                    : detail.user.publishingDisabled
                      ? "Enable publishing"
                      : "Disable publishing"}
                </Button>
              </div>
            </AdminCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <AdminCard>
              <h3 className="text-xl font-semibold tracking-[-0.04em]">
                Public decks
              </h3>
              <div className="mt-6 space-y-3">
                {detail.publicDecks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This user has no public decks returned by the admin detail endpoint.
                  </p>
                ) : (
                  detail.publicDecks.map((deck) => (
                    <Link
                      key={deck.id}
                      href={`/admin/moderation/${deck.id}`}
                      className="block rounded-2xl border border-black/5 bg-black/[0.02] px-4 py-4 transition-colors hover:bg-black/[0.04]"
                    >
                      <p className="font-medium">
                        {deck.deckSnapshot?.name ?? "Untitled deck"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[
                          deck.publicationStatus,
                          deck.visibility,
                          deck.moderationStatus,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </AdminCard>

            <AdminCard>
              <h3 className="text-xl font-semibold tracking-[-0.04em]">
                Credits and usage
              </h3>
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <p>Monthly tokens: {detail.aiUsage?.monthlyTokens ?? 0}</p>
                <p>Cumulative tokens: {detail.aiUsage?.cumulativeTokens ?? 0}</p>
                <p>
                  Prompt tokens: {detail.aiUsage?.cumulativePromptTokens ?? 0}
                </p>
                <p>
                  Output tokens: {detail.aiUsage?.cumulativeOutputTokens ?? 0}
                </p>
                <p>Credits tier: {detail.credits?.tier ?? "free"}</p>
                <p>Credits used this month: {detail.credits?.creditsUsed ?? 0}</p>
                <p>
                  Credits used total: {detail.credits?.totalCreditsUsed ?? 0}
                </p>
                {detail.adminRole ? (
                  <p>Admin role: {String(detail.adminRole.role ?? "admin")}</p>
                ) : null}
              </div>
            </AdminCard>
          </div>
        </>
      )}
    </AdminPage>
  );
}
