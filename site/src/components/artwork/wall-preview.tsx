"use client";

import { Camera, ChevronRight, ImageUp, Move, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Step = "closed" | "photo" | "width" | "view";

/** A sensible first guess: a typical living-room wall. */
const DEFAULT_WALL = { cm: "300", in: "120" } as const;

const STEPS: { id: Exclude<Step, "closed">; label: string }[] = [
  { id: "photo", label: "Your photo" },
  { id: "width", label: "Wall width" },
  { id: "view", label: "See it to scale" },
];

/**
 * "See it on your wall": the buyer's own photo, with the artwork laid on it at
 * its real size.
 *
 * Scale comes from one number the buyer gives: how wide the wall in the photo
 * is. The artwork's width as a share of that sets its width as a share of the
 * photo; its own proportions set the height. It is as accurate as that number
 * and as straight-on as the photo, which the copy asks for.
 *
 * The photo is read with an object URL and never leaves the device: nothing
 * is uploaded, stored or shown to the artist.
 */
export function WallPreview({
  artworkHeight,
  artworkWidth,
  imageUrl,
  title,
  unit,
}: {
  artworkHeight: number;
  artworkWidth: number;
  imageUrl: string;
  title: string;
  unit: "in" | "cm";
}) {
  const [step, setStep] = useState<Step>("closed");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [wallWidth, setWallWidth] = useState<string>(DEFAULT_WALL[unit]);
  // Top-left corner of the artwork, as a percentage of the photo.
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const artwork = useRef<HTMLButtonElement>(null);
  const drag = useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
  } | null>(null);

  // Let go of the previous photo's memory whenever it is replaced or the
  // panel goes away.
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const wall = Number(wallWidth);
  const wallIsValid = Number.isFinite(wall) && wall > 0;
  const widthShare = wallIsValid
    ? Math.min((artworkWidth / wall) * 100, 100)
    : 0;
  const tooWide = wallIsValid && artworkWidth > wall;

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setPhotoUrl(URL.createObjectURL(file));
    setPosition(null);
    setStep("width");
  }

  /** Keep the whole artwork inside the photo. */
  function clamp(x: number, y: number) {
    const stageBox = stage.current?.getBoundingClientRect();
    const artBox = artwork.current?.getBoundingClientRect();
    const maxX = 100 - widthShare;
    const maxY =
      stageBox && artBox ? 100 - (artBox.height / stageBox.height) * 100 : 100;

    return {
      x: Math.min(Math.max(x, 0), Math.max(maxX, 0)),
      y: Math.min(Math.max(y, 0), Math.max(maxY, 0)),
    };
  }

  const placed = position ?? { x: (100 - widthShare) / 2, y: 14 };

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      ...placed,
    };
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current;
    const box = stage.current?.getBoundingClientRect();

    if (!start || !box) return;

    setPosition(
      clamp(
        start.x + ((event.clientX - start.pointerX) / box.width) * 100,
        start.y + ((event.clientY - start.pointerY) / box.height) * 100
      )
    );
  }

  function nudge(event: KeyboardEvent<HTMLButtonElement>) {
    const distance = event.shiftKey ? 5 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowDown: [0, distance],
      ArrowLeft: [-distance, 0],
      ArrowRight: [distance, 0],
      ArrowUp: [0, -distance],
    };
    const move = moves[event.key];

    if (!move) return;

    event.preventDefault();
    setPosition(clamp(placed.x + move[0], placed.y + move[1]));
  }

  const hiddenInputs = (
    <>
      <input
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={choosePhoto}
        ref={cameraInput}
        tabIndex={-1}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        onChange={choosePhoto}
        ref={uploadInput}
        tabIndex={-1}
        type="file"
      />
    </>
  );

  if (step === "closed") {
    return (
      <button
        className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:border-foreground sm:p-5"
        onClick={() => setStep(photoUrl ? "view" : "photo")}
        type="button"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Camera className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-semibold text-foreground">
            See it on your wall
          </span>
          <span className="text-sm text-muted-foreground">
            Take a photo of your wall and see {title} on it at its real size.
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <section
      aria-label="See it on your wall"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-background p-4 animate-in fade-in-0 duration-300 motion-reduce:animate-none sm:p-6"
    >
      {hiddenInputs}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl text-foreground">See it on your wall</h2>
        <Button
          aria-label="Close"
          onClick={() => setStep("closed")}
          size="icon"
          type="button"
          variant="outline"
        >
          <X />
        </Button>
      </div>

      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((item, index) => (
          <li className="flex flex-col gap-1.5" key={item.id}>
            <span
              className={cn(
                "h-1 rounded-full transition-colors",
                index <= stepIndex ? "bg-foreground" : "bg-border"
              )}
            />
            <span
              className={cn(
                "text-xs sm:text-sm",
                index === stepIndex
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ol>

      {step === "photo" ? (
        <div className="flex flex-col gap-4">
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-input bg-muted/60 p-6 text-center">
            <Camera className="size-8 text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">
              Add a photo of your wall
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Stand straight on to the wall, in good light, with the whole space
              you want to fill in the frame.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={() => cameraInput.current?.click()}
              size="lg"
              type="button"
            >
              <Camera />
              Take a photo
            </Button>
            <Button
              onClick={() => uploadInput.current?.click()}
              size="lg"
              type="button"
              variant="outline"
            >
              <ImageUp />
              Upload a photo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your photo stays on this device. It is never uploaded or shown to
            the artist.
          </p>
        </div>
      ) : null}

      {step === "width" && photoUrl ? (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Your wall"
              className="block h-auto w-full"
              src={photoUrl}
            />
            <span className="pointer-events-none absolute inset-x-[4%] top-1/2 flex items-center">
              <span className="h-5 w-0.5 bg-highlight" />
              <span className="h-0.5 flex-1 bg-highlight" />
              <span className="h-5 w-0.5 bg-highlight" />
            </span>
            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-9 rounded-full bg-highlight px-3 py-1 text-sm font-semibold text-highlight-foreground">
              {wallIsValid ? `${wall} ${unit}` : `? ${unit}`}
            </span>
          </div>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (wallIsValid) setStep("view");
            }}
          >
            <label
              className="text-sm font-semibold text-foreground"
              htmlFor="wall-width"
            >
              How wide is the wall in your photo, edge to edge?
            </label>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-40">
                <Input
                  className="h-11 pr-10 text-base"
                  id="wall-width"
                  inputMode="decimal"
                  min={1}
                  onChange={(event) => setWallWidth(event.target.value)}
                  type="number"
                  value={wallWidth}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {unit}
                </span>
              </div>
              <Button disabled={!wallIsValid} size="lg" type="submit">
                Show it to scale
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No tape measure? Use something you know:{" "}
              {unit === "in"
                ? "a sofa is about 84 in, a door about 32 in."
                : "a sofa is about 210 cm, a door about 80 cm."}
            </p>
          </form>
        </div>
      ) : null}

      {step === "view" && photoUrl && wallIsValid ? (
        <div className="flex flex-col gap-4">
          <div
            className="relative touch-none overflow-hidden rounded-xl bg-muted select-none"
            ref={stage}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Your wall"
              className="block h-auto w-full"
              draggable={false}
              src={photoUrl}
            />
            <button
              aria-label={`${title} at ${artworkWidth} × ${artworkHeight} ${unit}. Drag, or use the arrow keys, to move it.`}
              className="absolute cursor-grab rounded-[2px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-highlight active:cursor-grabbing"
              onKeyDown={nudge}
              onPointerCancel={() => (drag.current = null)}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={() => (drag.current = null)}
              ref={artwork}
              style={{
                aspectRatio: `${artworkWidth} / ${artworkHeight}`,
                left: `${placed.x}%`,
                top: `${placed.y}%`,
                width: `${widthShare}%`,
              }}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="h-full w-full object-cover shadow-[0_14px_28px_-12px_rgba(0,0,0,0.6)]"
                draggable={false}
                src={imageUrl}
              />
            </button>
          </div>

          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Move className="size-4 shrink-0" />
            {tooWide
              ? `This piece is wider than the ${wall} ${unit} you gave, so it fills the photo.`
              : `True size: ${artworkWidth} × ${artworkHeight} ${unit} on a ${wall} ${unit} wall. Drag it to try other spots.`}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setStep("width")}
              type="button"
              variant="outline"
            >
              Change wall width
            </Button>
            <Button
              onClick={() => uploadInput.current?.click()}
              type="button"
              variant="outline"
            >
              Use another photo
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
