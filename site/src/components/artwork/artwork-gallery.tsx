"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The artwork's photos: one large, the rest as thumbnails that swap into it.
 *
 * The large image is contained, never cropped, on a quiet ground: a buyer is
 * judging the whole composition, and a cover crop would cut off its edges.
 */
export function ArtworkGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];

  if (!current) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
        No photo yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-muted p-4 sm:p-8 lg:max-h-[80vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={selected === 0 ? title : `${title}, view ${selected + 1}`}
          className="max-h-full max-w-full object-contain shadow-[0_24px_48px_-28px_rgba(31,31,31,0.55)] animate-in fade-in-0 duration-500 motion-reduce:animate-none"
          key={current}
          src={current}
        />
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((image, index) => (
            <button
              aria-label={index === 0 ? "Main view" : `View ${index + 1}`}
              aria-pressed={index === selected}
              className={cn(
                "aspect-square overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                index === selected
                  ? "border-foreground"
                  : "border-transparent hover:border-border"
              )}
              key={image}
              onClick={() => setSelected(index)}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-full w-full object-cover" src={image} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
