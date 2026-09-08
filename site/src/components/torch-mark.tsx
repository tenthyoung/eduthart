import { cn } from "@/lib/utils";

/**
 * The EduthArt torch mark: a two-tongue flame over a collared handle,
 * drawn flat in the current text color (pair with `text-primary` for the
 * brand gold on both the Classic and Noir themes).
 */
export function TorchMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 96"
      fill="currentColor"
      aria-hidden="true"
      className={cn("h-9 w-auto", className)}
    >
      <path d="M37 2 C24 13 15 25 15.5 37 C16 47 22 54 29.5 57.5 C26 49.5 26.5 41 30 33 C33.8 24.5 36.2 13.5 37 2 Z" />
      <path d="M40.5 8 C44.5 16.5 47 25.5 46.5 34 C46 45 40.5 53 33.5 57 C31.8 51 32.5 44 35.5 36.5 C38.8 28.5 40.5 18.5 40.5 8 Z" />
      <rect x="23.5" y="62" width="17" height="6" rx="3" />
      <path d="M27 72 L37 72 L35.2 92 C35 94.5 33.5 95.5 32 95.5 C30.5 95.5 29 94.5 28.8 92 Z" />
    </svg>
  );
}
