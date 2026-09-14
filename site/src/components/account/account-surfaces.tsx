"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The frosted card every account section sits on. The class string used to be
 * pasted into each section, so a tweak to the surface meant six edits.
 */
export function AccountPanel({
  action,
  children,
  className,
  description,
  icon: Icon,
  title,
  tone = "default",
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  icon?: LucideIcon;
  title?: string;
  tone?: "default" | "destructive";
}) {
  return (
    <section
      className={cn(
        "rounded-[2rem] border bg-white/88 p-6 shadow-[0_36px_90px_-48px_rgba(47,36,28,0.45)] backdrop-blur-xl dark:bg-card/88",
        tone === "destructive"
          ? "border-destructive/25"
          : "border-white/70 dark:border-border",
        className
      )}
    >
      {title ? (
        <header className="mb-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div
              className={cn(
                "flex items-center gap-3",
                tone === "destructive" && "text-destructive"
              )}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    "size-5",
                    tone === "destructive" ? "text-destructive" : "text-primary"
                  )}
                />
              ) : null}
              <h2 className="text-2xl text-foreground">{title}</h2>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Read-only facts as a divided definition list.
 *
 * Each of these used to be its own bordered tile, which turned a handful of
 * short values into a column of near-identical grey slabs. Rows share one
 * border instead, so the values carry the emphasis.
 */
export function DetailList({ children }: { children: ReactNode }) {
  return (
    <dl className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-muted/35">
      {children}
    </dl>
  );
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:items-baseline sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line text-sm text-foreground">{value}</dd>
    </div>
  );
}

/** A bordered tile for a fact that comes with its own action. */
export function ActionCard({
  children,
  description,
  title,
}: {
  children?: ReactNode;
  description?: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </p>
      {description ? (
        <div className="mt-2 text-sm text-muted-foreground">{description}</div>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

/**
 * Button content that swaps to a spinner while busy. Every action on these
 * screens spelled this ternary out by hand.
 */
export function BusyLabel({
  busy,
  busyLabel,
  children,
}: {
  busy: boolean;
  busyLabel: string;
  children: ReactNode;
}) {
  if (busy) {
    return (
      <>
        <Loader2 className="animate-spin" />
        {busyLabel}
      </>
    );
  }

  return <>{children}</>;
}
