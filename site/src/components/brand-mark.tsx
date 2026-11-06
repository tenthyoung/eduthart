import Link from "next/link";
import { cn } from "@/lib/utils";

/** The mark's artwork, cropped tight to its three strokes. */
export const BRAND_MARK_SRC = "/brand/eduthart-mark.svg";

/**
 * The EduthArt brand mark — the single source of truth for the logo icon.
 * Every surface (navbar, footer, decorative art) renders this component, so
 * changing the design here changes it everywhere.
 *
 * Current design: the brushstroke E, three pulls of one loaded brush. The SVG
 * is used as a mask over `currentColor`, so the mark takes the text colour it
 * sits in and follows light and dark mode without a second file. Size it with
 * a height class; the width follows from the artwork's proportions.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block aspect-[351/359] h-9 shrink-0 bg-current",
        className
      )}
      style={{
        mask: `url(${BRAND_MARK_SRC}) center / contain no-repeat`,
        WebkitMask: `url(${BRAND_MARK_SRC}) center / contain no-repeat`,
      }}
    />
  );
}

/** The mark beside the lowercase wordmark, linked home: the logo in the header and footer. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      aria-label="EduthArt home"
      className={cn(
        "inline-flex flex-shrink-0 items-center gap-2 text-foreground",
        className
      )}
      href="/"
    >
      <BrandMark className="h-8" />
      <span className="text-[1.5rem] leading-none font-bold tracking-[-0.03em]">
        eduthart
      </span>
    </Link>
  );
}
