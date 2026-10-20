import { Skeleton } from "@/components/ui/skeleton";

/** Shaped like an ArtworkCard, so the real grid lands without moving anything. */
export function ArtworkCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      <div className="flex flex-col gap-2 pt-0.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Stands in for the homepage's live sections while the artwork index loads.
 *
 * It mirrors their headings, tile grid and shelf so the page keeps its shape:
 * the hero above stays put and nothing jumps when the real content streams in.
 */
export function DiscoverySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading artwork"
      className="pb-20 lg:pb-28"
    >
      <section className="py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="flex flex-col gap-3" key={index}>
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-56" />
          <div className="mt-5 flex gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton className="h-11 w-28 rounded-full" key={index} />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <ArtworkCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
