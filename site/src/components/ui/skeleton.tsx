import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A placeholder block, sized by its classes to match what it stands in for.
 *
 * Hidden from assistive tech: a screen reader has nothing to say about a grey
 * bar, and the region it sits in should carry `aria-busy` instead. The pulse
 * stops for anyone who has asked for less motion; the shape alone still says
 * "loading".
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
