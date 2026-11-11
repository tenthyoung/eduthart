import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type DisclosureProps = {
  /** The label on the closed strip — and on the open one, unless `openSummary` says otherwise. */
  summary: ReactNode;
  /**
   * The label once it is open, for the "Show details" / "Hide details" swap.
   * Both labels are in the markup and CSS picks between them, so the swap
   * costs no JavaScript.
   */
  openSummary?: ReactNode;
  /** Open on first render. The reader's toggling takes over from there. */
  defaultOpen?: boolean;
  summaryClassName?: string;
  contentClassName?: string;
  children: ReactNode;
} & Omit<ComponentProps<"details">, "children" | "open">;

/**
 * A row that opens to reveal more, on an eased curve rather than a snap.
 *
 * It is a native `<details>`, which buys three things a JavaScript panel
 * doesn't: it works before hydration and with scripting off, it carries its own
 * accessibility semantics, and find-in-page opens it to show a match. There is
 * no `"use client"` here on purpose — it renders in a server component as is.
 *
 * The motion comes from `.disclosure` in `tokens.css`, which animates
 * `::details-content` — the box the browser wraps the contents in — from zero
 * to the content's own height. A browser that doesn't know that pseudo-element
 * drops the rule whole and opens instantly, which is what a `<details>` has
 * always done.
 *
 * Give several of them the same `name` and the browser closes the open one when
 * another is opened, the way an accordion does, again with no state to hold.
 *
 * `summaryClassName` is where the padding goes: a disclosure that sits across
 * the foot of a card wants the whole strip clickable, so the padding belongs on
 * the summary rather than on a wrapper around it. The default `py-3` puts the
 * strip at exactly 44px, the system's minimum for a control a thumb has to
 * find — override the padding upwards, not down.
 */
export const Disclosure = ({
  summary,
  openSummary,
  defaultOpen,
  className,
  summaryClassName,
  contentClassName,
  children,
  ...props
}: DisclosureProps) => (
  <details
    {...props}
    open={defaultOpen}
    className={cn("disclosure group/disclosure", className)}
  >
    <summary
      className={cn(
        "flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset [&::-webkit-details-marker]:hidden",
        summaryClassName
      )}
    >
      {openSummary === undefined ? (
        <span>{summary}</span>
      ) : (
        <>
          <span className="group-open/disclosure:hidden">{summary}</span>
          <span className="hidden group-open/disclosure:inline">
            {openSummary}
          </span>
        </>
      )}
      <ChevronDown
        aria-hidden
        className="size-4 shrink-0 transition-transform duration-[380ms] ease-[cubic-bezier(0.33,1,0.68,1)] group-open/disclosure:rotate-180 motion-reduce:transition-none"
      />
    </summary>

    <div className={cn("pb-4 text-sm", contentClassName)}>{children}</div>
  </details>
);
