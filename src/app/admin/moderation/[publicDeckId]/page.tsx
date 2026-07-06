"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { AdminCard, AdminPage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getPublicDeckDetails, moderateDeck } from "@/lib/admin/api";
import type { PublicDeckReport, PublicDeckSummary } from "@/lib/admin/types";

const moderationActions = [
  { action: "warn", label: "Warn owner", variant: "outline" as const },
  { action: "hide", label: "Hide from browse", variant: "destructive" as const },
  { action: "remove", label: "Remove publication", variant: "destructive" as const },
] as const;

function formatReportDate(value: string | null | undefined) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function ReportCard({ report }: { report: PublicDeckReport }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4">
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <span>{report.reportType}</span>
        {report.reportSource ? <span>{report.reportSource}</span> : null}
        <span>{formatReportDate(report.createdAt)}</span>
      </div>
      <p className="mt-3 font-medium">{report.reason}</p>
      {report.details ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {report.details}
        </p>
      ) : null}
      {report.reporterUid || report.reporterEmail ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {[report.reporterUid, report.reporterEmail].filter(Boolean).join(" • ")}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminModerationDetailPage() {
  const params = useParams<{ publicDeckId: string }>();
  const publicDeckId = params.publicDeckId;
  const [deck, setDeck] = useState<PublicDeckSummary | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDeck(await getPublicDeckDetails(publicDeckId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deck failed to load.");
    } finally {
      setLoading(false);
    }
  }, [publicDeckId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (action: "warn" | "hide" | "remove") => {
    const nextReason = reason.trim() || "Moderated by admin";
    setSubmittingAction(action);
    try {
      await moderateDeck(publicDeckId, action, nextReason);
      toast.success("Deck moderation updated.");
      setReason("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Moderation failed.");
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <AdminPage
      title={deck?.deckSnapshot?.name ?? "Moderation detail"}
      description="Review current publication state and apply a moderation action that resolves all open reports for this deck."
      actions={
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      {!deck ? (
        <AdminCard>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading deck detail..." : "Deck not found."}
          </p>
        </AdminCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminCard className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Owner UID: {deck.ownerUid ?? "Unknown"}
            </p>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>{deck.visibility ?? "unknown visibility"}</span>
              <span>•</span>
              <span>{deck.publicationStatus ?? "unknown publication state"}</span>
              <span>•</span>
              <span>{deck.moderationStatus ?? "unknown moderation state"}</span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {deck.deckSnapshot?.description || "No description on this deck snapshot."}
            </p>
            {deck.moderationReason ? (
              <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4 text-sm text-muted-foreground">
                Current moderation reason: {deck.moderationReason}
              </div>
            ) : null}
            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-semibold tracking-[-0.04em]">
                Open reports
              </h3>
              {deck.openReports?.length ? (
                deck.openReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No open reports are attached to this deck right now.
                </p>
              )}
            </div>
          </AdminCard>

          <AdminCard className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.04em]">
                Take action
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Reason text is required and will be stored on the deck and moderation history.
              </p>
            </div>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for this moderation action"
              className="min-h-32"
            />
            <div className="grid gap-3">
              {moderationActions.map((item) => (
                <Button
                  key={item.action}
                  variant={item.variant}
                  disabled={submittingAction !== null}
                  onClick={() => void handleAction(item.action)}
                >
                  {submittingAction === item.action ? "Saving..." : item.label}
                </Button>
              ))}
            </div>
          </AdminCard>
        </div>
      )}
    </AdminPage>
  );
}
