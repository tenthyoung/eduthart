import Link from "next/link";
import type { CSSProperties } from "react";

import {
  BRAND_LOCKUP,
  BRAND_MARK_ASPECT,
  BRAND_NAME,
  BRAND_WORDMARK,
} from "@/lib/brand/logo";
import { cn } from "@/lib/utils";

/** The mark's artwork, cropped tight to its three strokes. */
export const BRAND_MARK_SRC = "/brand/eduthart-mark.svg";

/**
 * The EduthArt brand mark, the brushstroke E: three pulls of one loaded brush,
 * ink with a gold middle stroke (`--mark-mid` in globals.css). Its look is set
 * in lib/brand/logo.ts; every surface that shows the logo renders this
 * component or `BrandLogo`, so a change there changes it everywhere.
 *
 * The SVG is used as a mask over `currentColor`, so the mark takes the text
 * colour it sits in and follows light and dark mode without a second file.
 * Size it with a height; the width follows from the artwork's proportions.
 */
export function BrandMark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  // Each stroke paints through its own band, so a colourway can tint one
  // stroke (`--mark-top`, `--mark-mid`, `--mark-bottom`). Unset, all three
  // fall back to the text colour. Band edges sit in the gaps between strokes.
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block h-9 shrink-0", className)}
      style={{
        aspectRatio: BRAND_MARK_ASPECT,
        mask: `url(${BRAND_MARK_SRC}) center / contain no-repeat`,
        WebkitMask: `url(${BRAND_MARK_SRC}) center / contain no-repeat`,
        ...style,
      }}
    >
      <span className="absolute inset-x-0 top-0 h-[31%] bg-[var(--mark-top,currentColor)]" />
      <span className="absolute inset-x-0 top-[31%] h-[38%] bg-[var(--mark-mid,currentColor)]" />
      <span className="absolute inset-x-0 top-[69%] bottom-0 bg-[var(--mark-bottom,currentColor)]" />
    </span>
  );
}

/** The text logo: "eduthart", lowercase, bold, tracked tight, at the inherited font size. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("leading-none", className)}
      style={{
        fontWeight: BRAND_LOCKUP.wordmarkWeight,
        letterSpacing: `${BRAND_LOCKUP.wordmarkTrackingEm}em`,
      }}
    >
      {BRAND_WORDMARK}
    </span>
  );
}

/**
 * The logo: the mark beside the text logo, linked home. Used in the site
 * header and footer, the workspace sidebars and the admin console.
 *
 * Size it with a font-size class (`text-xl`); the mark and gap scale with it,
 * so the lockup keeps one shape everywhere. Defaults to the header's size.
 *
 * The lockup is only one line of text tall, so a `before:` overlay stretches
 * the tap target 8px above and below without moving anything around it.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      aria-label={`${BRAND_NAME} home`}
      className={cn(
        "relative inline-flex shrink-0 items-center text-[1.5rem] text-foreground before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']",
        className
      )}
      href="/"
      style={{ gap: `${BRAND_LOCKUP.gapEm}em` }}
    >
      <BrandMark style={{ height: `${BRAND_LOCKUP.markHeightEm}em` }} />
      <BrandWordmark />
    </Link>
  );
}
