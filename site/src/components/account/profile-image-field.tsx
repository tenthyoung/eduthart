"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ACCEPTED_IMAGE_TYPES_ATTRIBUTE,
  isAcceptedImageType,
  MAX_PROFILE_IMAGE_SIZE,
} from "@/lib/profile/images";
import { cn } from "@/lib/utils";

export type ProfileImageFieldProps = {
  aspectClassName: string;
  busy: boolean;
  circular?: boolean;
  className?: string;
  description: string;
  emptyLabel: string;
  helpText: string;
  /** Skip the built-in heading when a dialog already provides one. */
  hideHeader?: boolean;
  imageUrl: string | null;
  inputId: string;
  onError: (message: string) => void;
  onRemove: () => void;
  onSelect: (file: File) => void;
  removeLabel: string;
  title: string;
  uploadLabel: string;
};

/**
 * Upload, preview, and remove control shared by the banner and the profile
 * picture. Only the framing and copy differ between the two.
 */
export function ProfileImageField({
  aspectClassName,
  busy,
  circular,
  className,
  description,
  emptyLabel,
  helpText,
  hideHeader,
  imageUrl,
  inputId,
  onError,
  onRemove,
  onSelect,
  removeLabel,
  title,
  uploadLabel,
}: ProfileImageFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!isAcceptedImageType(file.type)) {
      onError("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      onError("Please choose an image smaller than 5 MB.");
      return;
    }

    onSelect(file);
  };

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-border/80 bg-muted/45 p-4",
        className
      )}
    >
      {hideHeader ? null : (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden border border-dashed border-primary/20 bg-white/70",
          circular ? "mx-auto w-40 rounded-full" : "rounded-2xl"
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`${title} preview`}
            className={cn("w-full object-cover", aspectClassName)}
            src={imageUrl}
          />
        ) : (
          <div
            className={cn(
              "bg-profile-banner flex flex-col items-center justify-center gap-3 px-6 text-center",
              aspectClassName
            )}
          >
            <ImagePlus className="size-6 text-primary" />
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          </div>
        )}
      </div>

      <Label className="sr-only" htmlFor={inputId}>
        {uploadLabel}
      </Label>
      <input
        ref={inputRef}
        accept={ACCEPTED_IMAGE_TYPES_ATTRIBUTE}
        className="sr-only"
        id={inputId}
        onChange={handleChange}
        type="file"
      />

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          type="button"
          variant="outline"
        >
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {busy ? "Uploading..." : uploadLabel}
        </Button>
        {imageUrl ? (
          <Button
            disabled={busy}
            onClick={onRemove}
            type="button"
            variant="ghost"
          >
            <Trash2 />
            {removeLabel}
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">{helpText}</p>
    </div>
  );
}
