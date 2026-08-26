"use client";

import { Check, Loader2, Minus, Plus, RotateCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { IMAGE_OUTPUT_QUALITY, IMAGE_OUTPUT_TYPE } from "@/lib/profile/images";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.05;

type Offset = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read the selected image."));
    image.src = src;
  });
}

export type ImageCropSpec = {
  /** Rendered as a circle in the frame, for avatars. */
  circular?: boolean;
  description: string;
  outputHeight: number;
  outputWidth: number;
  submitLabel: string;
  submittingLabel: string;
  title: string;
};

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Unable to crop the selected image."));
      },
      IMAGE_OUTPUT_TYPE,
      IMAGE_OUTPUT_QUALITY,
    );
  });
}

function buildCroppedFileName(fileName: string, width: number, height: number) {
  const base = fileName.replace(/\.[^./\\]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${base || "image"}-${width}x${height}.jpg`;
}

export type ImageCropDialogProps = {
  file: File | null;
  onCancel: () => void;
  onCropped: (file: File) => void | Promise<void>;
  spec: ImageCropSpec;
};

/**
 * Drag-and-zoom cropper for any fixed-ratio profile image.
 *
 * The banner and the profile picture differ only in output size and framing,
 * so the interaction lives here once and each caller supplies its own spec.
 */
export function ImageCropDialog({ file, onCancel, onCropped, spec }: ImageCropDialogProps) {
  const outputWidth = spec.outputWidth;
  const outputHeight = spec.outputHeight;
  const aspectRatio = outputWidth / outputHeight;
  const dimensionsLabel = `${outputWidth} × ${outputHeight}`;
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dragStateRef = useRef<{ offset: Offset; pointerId: number; x: number; y: number } | null>(null);
  const hasCenteredRef = useRef(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frameHeight = frameWidth / aspectRatio;
  const coverScale =
    image && frameWidth > 0
      ? Math.max(frameWidth / image.naturalWidth, frameHeight / image.naturalHeight)
      : 0;
  const renderScale = coverScale * zoom;
  const renderedWidth = image ? image.naturalWidth * renderScale : 0;
  const renderedHeight = image ? image.naturalHeight * renderScale : 0;
  const isLowResolution =
    image !== null && (image.naturalWidth < outputWidth || image.naturalHeight < outputHeight);

  // The dialog body mounts after this component's effects run, so measure the
  // frame from a callback ref instead of a layout effect.
  const measureFrame = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;

    if (!node) {
      return;
    }

    setFrameWidth(node.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;

      if (typeof width === "number") {
        setFrameWidth(width);
      }
    });

    observer.observe(node);
    resizeObserverRef.current = observer;
  }, []);

  const clampOffset = useCallback(
    (next: Offset): Offset => ({
      x: clamp(next.x, Math.min(0, frameWidth - renderedWidth), 0),
      y: clamp(next.y, Math.min(0, frameHeight - renderedHeight), 0),
    }),
    [frameHeight, frameWidth, renderedHeight, renderedWidth],
  );

  useEffect(() => {
    if (!file) {
      setImage(null);
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    let cancelled = false;

    hasCenteredRef.current = false;
    setObjectUrl(url);
    setError(null);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });

    loadImage(url)
      .then((loaded) => {
        if (!cancelled) {
          setImage(loaded);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to read the selected image.",
          );
        }
      });

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Center the image once it is measurable, then only keep it inside the frame.
  useEffect(() => {
    if (!image || frameWidth === 0) {
      return;
    }

    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true;
      setOffset({ x: (frameWidth - renderedWidth) / 2, y: (frameHeight - renderedHeight) / 2 });
      return;
    }

    setOffset((current) => clampOffset(current));
  }, [clampOffset, frameHeight, frameWidth, image, renderedHeight, renderedWidth]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!image) {
      return;
    }

    dragStateRef.current = {
      offset,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    setOffset(
      clampOffset({
        x: dragState.offset.x + (event.clientX - dragState.x),
        y: dragState.offset.y + (event.clientY - dragState.y),
      }),
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const applyZoom = (nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

    if (!image || clampedZoom === zoom) {
      setZoom(clampedZoom);
      return;
    }

    // Zoom around the centre of the frame so the visible subject stays put.
    const ratio = clampedZoom / zoom;
    const nextOffset = {
      x: frameWidth / 2 - (frameWidth / 2 - offset.x) * ratio,
      y: frameHeight / 2 - (frameHeight / 2 - offset.y) * ratio,
    };
    const nextRenderedWidth = image.naturalWidth * coverScale * clampedZoom;
    const nextRenderedHeight = image.naturalHeight * coverScale * clampedZoom;

    setZoom(clampedZoom);
    setOffset({
      x: clamp(nextOffset.x, Math.min(0, frameWidth - nextRenderedWidth), 0),
      y: clamp(nextOffset.y, Math.min(0, frameHeight - nextRenderedHeight), 0),
    });
  };

  const handleReset = () => {
    const baseWidth = image ? image.naturalWidth * coverScale : 0;
    const baseHeight = image ? image.naturalHeight * coverScale : 0;

    setZoom(MIN_ZOOM);
    setOffset({ x: (frameWidth - baseWidth) / 2, y: (frameHeight - baseHeight) / 2 });
  };

  const handleApply = async () => {
    if (!file || !image || frameWidth === 0) {
      return;
    }

    setApplying(true);
    setError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to crop the selected image.");
      }

      context.imageSmoothingQuality = "high";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, outputWidth, outputHeight);
      context.drawImage(
        image,
        -offset.x / renderScale,
        -offset.y / renderScale,
        frameWidth / renderScale,
        frameHeight / renderScale,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const blob = await canvasToBlob(canvas);

      await onCropped(
        new File([blob], buildCroppedFileName(file.name, outputWidth, outputHeight), {
          type: IMAGE_OUTPUT_TYPE,
        }),
      );
    } catch (cropError: unknown) {
      setError(cropError instanceof Error ? cropError.message : "Unable to crop the selected image.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog
      open={file !== null}
      onOpenChange={(open) => {
        if (!open && !applying) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{spec.title}</DialogTitle>
          <DialogDescription>{spec.description}</DialogDescription>
        </DialogHeader>

        <div
          ref={measureFrame}
          className={cn(
            "relative w-full cursor-grab touch-none overflow-hidden border border-border/80 bg-muted/45 active:cursor-grabbing",
            spec.circular ? "mx-auto max-w-xs rounded-full" : "rounded-2xl",
          )}
          data-testid="image-crop-frame"
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ aspectRatio: `${outputWidth} / ${outputHeight}` }}
        >
          {image && objectUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Banner crop preview"
                className="pointer-events-none absolute max-w-none select-none"
                src={objectUrl}
                style={{
                  height: `${renderedHeight}px`,
                  left: `${offset.x}px`,
                  top: `${offset.y}px`,
                  width: `${renderedWidth}px`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="border border-white/25" />
                ))}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Label className="sr-only" htmlFor="image-crop-zoom">
            Zoom
          </Label>
          <Button
            aria-label="Zoom out"
            disabled={!image || zoom <= MIN_ZOOM}
            onClick={() => applyZoom(zoom - ZOOM_STEP * 4)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Minus />
          </Button>
          <input
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-primary/20 accent-primary"
            disabled={!image}
            id="image-crop-zoom"
            max={MAX_ZOOM}
            min={MIN_ZOOM}
            onChange={(event) => applyZoom(Number(event.target.value))}
            step={ZOOM_STEP}
            type="range"
            value={zoom}
          />
          <Button
            aria-label="Zoom in"
            disabled={!image || zoom >= MAX_ZOOM}
            onClick={() => applyZoom(zoom + ZOOM_STEP * 4)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Plus />
          </Button>
          <Button
            aria-label="Reset crop"
            disabled={!image}
            onClick={handleReset}
            size="icon"
            type="button"
            variant="ghost"
          >
            <RotateCcw />
          </Button>
        </div>

        {isLowResolution ? (
          <p className="text-xs text-muted-foreground">
            This image is smaller than {dimensionsLabel} pixels, so it may look soft once it is
            scaled up.
          </p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button disabled={applying} onClick={onCancel} type="button" variant="ghost">
            Cancel
          </Button>
          <Button disabled={!image || applying} onClick={handleApply} type="button">
            {applying ? <Loader2 className="animate-spin" /> : <Check />}
            {applying ? spec.submittingLabel : spec.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
