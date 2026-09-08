import { cn } from "@/lib/utils";

/**
 * The EduthArt brand mark — the single source of truth for the logo icon.
 * Every surface (navbar, footer, decorative art) renders this component, so
 * changing the design here changes it everywhere.
 *
 * Current design: the three-bars "E" in a diagonal gold gradient running from
 * the theme's light gold through the brand gold to a deeper tone, so it reads
 * on both the light and dark backgrounds. The gradient id is fixed, which
 * stays harmless when the mark renders more than once per page because every
 * instance defines the identical gradient.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("h-9 w-auto", className)}
    >
      <defs>
        <linearGradient id="brand-mark-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary-light, #e3c9a2)" />
          <stop offset="0.55" stopColor="var(--primary, #d4af7c)" />
          <stop offset="1" stopColor="#b08a52" />
        </linearGradient>
      </defs>
      <rect
        x="14"
        y="10"
        width="36"
        height="10"
        rx="5"
        fill="url(#brand-mark-gold)"
      />
      <rect
        x="14"
        y="27"
        width="26"
        height="10"
        rx="5"
        fill="url(#brand-mark-gold)"
      />
      <rect
        x="14"
        y="44"
        width="36"
        height="10"
        rx="5"
        fill="url(#brand-mark-gold)"
      />
    </svg>
  );
}
