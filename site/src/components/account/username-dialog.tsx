"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent } from "react";

import { buildArtistPageHref } from "@/lib/auth/account-profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UsernameDialogProps = {
  description: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  saving: boolean;
  title: string;
  username: string;
  onUsernameChange: (value: string) => void;
};

export function UsernameDialog({
  description,
  onOpenChange,
  onSubmit,
  open,
  saving,
  title,
  username,
  onUsernameChange,
}: UsernameDialogProps) {
  const normalizedUsername = username.trim().replace(/^@+/, "").toLowerCase();
  const previewHref = normalizedUsername ? buildArtistPageHref(normalizedUsername) : "/artists/yourname";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="account-username">Username</Label>
            <Input
              id="account-username"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="@yourname"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This creates your public page at {previewHref}. Use 3-24 letters, numbers,
              hyphens, or underscores.
            </p>
          </div>
          <DialogFooter>
            <Button disabled={saving} type="submit">
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving username...
                </>
              ) : (
                "Save username"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
