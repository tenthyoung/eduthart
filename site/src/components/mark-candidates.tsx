import { cn } from "@/lib/utils";

/**
 * Exploratory logo marks, kept together while we settle on a direction.
 * Each draws in the current text color like AsteriskMark (pair with
 * `text-primary` for the brand gold on both themes).
 */

/** A hollow asterisk-style stick with a small flame floating above it. */
export function CandleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 96"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      aria-hidden="true"
      className={cn("h-9 w-auto", className)}
    >
      <path d="M32 4 C26 12 23 19 24.5 25.5 C25.8 30.5 28.5 33.5 32 35 C35.5 33.5 38.2 30.5 39.5 25.5 C41 19 38 12 32 4 Z" />
      <rect x="25" y="41" width="14" height="50" rx="7" />
    </svg>
  );
}

/** A filled flame with a negative-space inner flame over a slim handle. */
export function SolidFlameMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 96"
      fill="currentColor"
      aria-hidden="true"
      className={cn("h-9 w-auto", className)}
    >
      <path
        fillRule="evenodd"
        d="M32 4 C21 16 16 27 19 38 C21.5 47 26 52 32 54 C38 52 42.5 47 45 38 C48 27 43 16 32 4 Z M32 20 C27.5 26 25.5 31 26.8 36.5 C27.8 40.8 29.5 43.3 32 44.5 C34.5 43.3 36.2 40.8 37.2 36.5 C38.5 31 36.5 26 32 20 Z"
      />
      <rect x="29" y="60" width="6" height="30" rx="3" />
    </svg>
  );
}

/** An "E" monogram built from the same hollow sticks as the asterisk. */
export function ThreeBarsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      aria-hidden="true"
      className={cn("h-9 w-auto", className)}
    >
      <rect x="14" y="10" width="36" height="10" rx="5" />
      <rect x="14" y="27" width="26" height="10" rx="5" />
      <rect x="14" y="44" width="36" height="10" rx="5" />
    </svg>
  );
}
