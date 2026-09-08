import { cn } from "@/lib/utils";

/**
 * The EduthArt asterisk mark: three hollow rounded sticks crossing at the
 * center. Stroked in the current text color (pair with `text-primary` for
 * the brand gold on both the light and dark themes).
 */
export function AsteriskMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      aria-hidden="true"
      className={cn("h-9 w-auto", className)}
    >
      <rect x="25" y="3.5" width="14" height="57" rx="7" />
      <rect
        x="25"
        y="3.5"
        width="14"
        height="57"
        rx="7"
        transform="rotate(60 32 32)"
      />
      <rect
        x="25"
        y="3.5"
        width="14"
        height="57"
        rx="7"
        transform="rotate(-60 32 32)"
      />
    </svg>
  );
}
