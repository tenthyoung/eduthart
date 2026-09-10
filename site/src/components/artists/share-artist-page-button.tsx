"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buildArtistPageHref } from "@/lib/auth/account-profile";

// The async clipboard API needs a focused document and a permissive
// permissions policy, so embedded browsers can reject it even for a real
// click; the deprecated execCommand path still works there.
function copyWithExecCommand(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export function ShareArtistPageButton({
  artistName,
  username,
}: {
  artistName: string;
  username: string;
}) {
  const handleShare = async () => {
    const url = new URL(
      buildArtistPageHref(username),
      window.location.origin
    ).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title: `${artistName} on EduthArt`, url });
        return;
      } catch (error) {
        // Falling through to the clipboard makes sense for share failures,
        // but not when the person simply closed the share sheet.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard.");
    } catch {
      if (copyWithExecCommand(url)) {
        toast.success("Link copied to clipboard.");
      } else {
        toast.error("Unable to copy the link.");
      }
    }
  };

  return (
    <Button
      aria-label="Share this page"
      onClick={() => void handleShare()}
      size="icon"
      type="button"
      variant="outline"
    >
      <Share2 />
    </Button>
  );
}
