"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { AdminCard, AdminPage } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getArtworkModerationDetail, moderateArtwork } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/format";
import type {
  ArtworkModerationAction,
  ArtworkModerationDetail,
  ArtworkReportRecord,
} from "@/lib/admin/types";

type ActionDefinition = {
  action: ArtworkModerationAction;
  description: string;
  label: string;
  variant: "default" | "destructive" | "outline";
};

const takedownActions: ActionDefinition[] = [
  {
    action: "warn",
    description: "Keeps the piece listed. The artist is told to review it.",
    label: "Warn artist",
    variant: "outline",
  },
  {
    action: "hide",
    description:
      "Takes the piece off the site while the notice is reviewed. Can be restored.",
    label: "Take down",
    variant: "destructive",
  },
  {
    action: "remove",
    description: "Takes the piece off the site for good.",
    label: "Remove",
    variant: "destructive",
  },
];

const restoreAction: ActionDefinition = {
  action: "restore",
  description: "Clears the takedown. The piece is listed again.",
  label: "Restore listing",
  variant: "default",
};

const dismissAction: ActionDefinition = {
  action: "dismiss",
  description: "Closes the open reports without touching the listing.",
  label: "Dismiss reports",
  variant: "outline",
};

function describeModeration(detail: ArtworkModerationDetail) {
  const status = detail.moderation?.status;
  if (status === "hidden") return "Taken down pending review";
  if (status === "removed") return "Removed";
  if (status === "warned") return "Warned, still listed";
  return detail.listed ? "Listed" : "Not listed by the artist";
}

function ReportCard({ report }: { report: ArtworkReportRecord }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4">
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <span>{report.reportType}</span>
        {report.reportSubcategory ? (
          <span>{report.reportSubcategory}</span>
        ) : null}
        <span>{formatDateTime(report.createdAt)}</span>
        {report.status === "resolved" ? (
          <span>
            {report.resolutionAction ?? "resolved"}
            {report.resolvedAt ? ` ${formatDateTime(report.resolvedAt)}` : ""}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-medium">{report.reason}</p>
      {report.details ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {report.details}
        </p>
      ) : null}
      {report.reporterEmail ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Reporter: {report.reporterEmail}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminModerationDetailPage() {
  const params = useParams<{ artworkKey: string }>();
  const artworkKey = decodeURIComponent(params.artworkKey);
  const [detail, setDetail] = useState<ArtworkModerationDetail | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await getArtworkModerationDetail(artworkKey));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Artwork failed to load."
      );
    } finally {
      setLoading(false);
    }
  }, [artworkKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (action: ArtworkModerationAction) => {
    const nextReason = reason.trim();
    if (!nextReason) {
      toast.error("Write a reason first. The artist will read it.");
      return;
    }

    setSubmittingAction(action);
    try {
      await moderateArtwork(artworkKey, action, nextReason);
      toast.success("Moderation updated.");
      setReason("");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Moderation failed."
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  const takenDown =
    detail?.moderation?.status === "hidden" ||
    detail?.moderation?.status === "removed";
  const actions = [
    ...(takenDown ? [restoreAction] : takedownActions),
    ...(detail?.openReports.length ? [dismissAction] : []),
  ];

  return (
    <AdminPage
      title={detail?.title ?? "Moderation detail"}
      description="Read the reports against this artwork and decide what happens to the listing. Every action closes the open reports and, except for dismissing them, is explained to the artist with your reason."
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
      {!detail ? (
        <AdminCard>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading artwork..." : "Artwork not found."}
          </p>
        </AdminCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminCard className="space-y-4">
            <div className="flex items-start gap-4">
              {detail.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.imageUrl}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                />
              ) : null}
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  By{" "}
                  <Link
                    href={`/admin/users/${detail.artistUid}`}
                    className="text-primary hover:underline"
                  >
                    {detail.artistName}
                  </Link>{" "}
                  (@{detail.artistUsername})
                </p>
                <p>
                  {[
                    describeModeration(detail),
                    detail.availability,
                    detail.priceDisplay,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
                <p>
                  <Link
                    href={detail.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Open the public page
                  </Link>
                </p>
              </div>
            </div>
            {detail.moderation ? (
              <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4 text-sm text-muted-foreground">
                <p>
                  Current decision: {detail.moderation.status},{" "}
                  {formatDateTime(detail.moderation.moderatedAt)}
                </p>
                <p className="mt-1">Reason: {detail.moderation.reason}</p>
              </div>
            ) : null}
            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-semibold tracking-[-0.04em]">
                Open reports
              </h3>
              {detail.openReports.length ? (
                detail.openReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No open reports against this artwork right now.
                </p>
              )}
            </div>
            {detail.resolvedReports.length ? (
              <div className="space-y-3 pt-2">
                <h3 className="text-xl font-semibold tracking-[-0.04em]">
                  Resolved reports
                </h3>
                {detail.resolvedReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            ) : null}
          </AdminCard>

          <AdminCard className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.04em]">
                Take action
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                The reason is stored on the listing and sent to the artist, so
                write it for them.
              </p>
            </div>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason for this decision"
              className="min-h-32"
            />
            <div className="grid gap-4">
              {actions.map((item) => (
                <div key={item.action} className="space-y-1">
                  <Button
                    variant={item.variant}
                    className="w-full"
                    disabled={submittingAction !== null}
                    onClick={() => void handleAction(item.action)}
                  >
                    {submittingAction === item.action
                      ? "Saving..."
                      : item.label}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      )}
    </AdminPage>
  );
}
