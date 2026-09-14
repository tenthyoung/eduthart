"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

import { AccountPanel, BusyLabel } from "@/components/account/account-surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DangerZoneSection({
  confirmation,
  deleting,
  onConfirmationChange,
  onDelete,
}: {
  confirmation: string;
  deleting: boolean;
  onConfirmationChange: (value: string) => void;
  onDelete: () => void;
}) {
  return (
    <AccountPanel
      className="space-y-5"
      description="Deleting your account permanently removes your EduthArt login and the account profile data currently managed by this site. Type DELETE below before continuing."
      icon={AlertTriangle}
      title="Delete account"
      tone="destructive"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full max-w-sm space-y-2">
          <Label htmlFor="delete-account-confirmation">Confirmation text</Label>
          <Input
            id="delete-account-confirmation"
            onChange={(event) => onConfirmationChange(event.target.value)}
            placeholder="Type DELETE"
            value={confirmation}
          />
        </div>
        <Button
          disabled={confirmation.trim() !== "DELETE" || deleting}
          onClick={onDelete}
          type="button"
          variant="destructive"
        >
          <BusyLabel busy={deleting} busyLabel="Deleting account...">
            <Trash2 />
            Delete account permanently
          </BusyLabel>
        </Button>
      </div>
    </AccountPanel>
  );
}
