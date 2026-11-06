import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One figure with its label: a total, a count, a balance.
 *
 * Copied from hendeca-design-systems `web/src/components/stat-tile`; change it
 * there first. The value is the loudest thing in the tile; the label names it
 * and the hint qualifies it ("after fees"), so a row of tiles reads left to
 * right without a legend. `tone="emphasis"` fills the tile with the primary
 * colour — use it for the one figure a page is about, not for every tile.
 */
export type StatTileProps = {
  className?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  label: ReactNode;
  /** Draws the tile with the primary colour, for the one figure that matters most. */
  tone?: "default" | "emphasis";
  value: ReactNode;
};

export function StatTile({
  className,
  hint,
  icon,
  label,
  tone = "default",
  value,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-2xl border p-5",
        tone === "emphasis"
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-card-foreground",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]",
          tone === "emphasis"
            ? "text-primary-foreground/80"
            : "text-muted-foreground"
        )}
      >
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <span className="truncate">{label}</span>
      </div>
      <div className="truncate text-2xl font-semibold tabular-nums sm:text-3xl">
        {value}
      </div>
      {hint ? (
        <p
          className={cn(
            "text-sm",
            tone === "emphasis"
              ? "text-primary-foreground/80"
              : "text-muted-foreground"
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
