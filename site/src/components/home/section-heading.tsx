import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A homepage section title under a full-width ink rule, with an optional link
 * or note on the right: the rule, not a card or a background, is what
 * separates one shelf from the next.
 */
export function SectionHeading({
  aside,
  href,
  id,
  linkLabel,
  title,
}: {
  aside?: ReactNode;
  href?: string;
  /** Lets the section name itself after this heading (`aria-labelledby`). */
  id?: string;
  linkLabel?: string;
  title: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-t border-foreground pt-4">
      <h2
        className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.75rem]"
        id={id}
      >
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          href={href}
        >
          {linkLabel}
        </Link>
      ) : (
        aside
      )}
    </div>
  );
}
