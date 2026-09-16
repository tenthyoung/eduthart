"use client";

import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";

export function GoogleAuthButton({
  disabled,
  onSelect,
  verb,
}: {
  disabled?: boolean;
  onSelect: () => void;
  verb: string;
}) {
  return (
    <Button
      className="w-full"
      disabled={disabled}
      onClick={onSelect}
      size="lg"
      type="button"
      variant="outline"
    >
      <GoogleIcon />
      {verb} Google
    </Button>
  );
}
