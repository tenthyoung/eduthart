"use client";

import { AppleIcon } from "@/components/auth/apple-icon";
import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";
import type { FederatedProvider } from "@/components/auth/auth-provider";

const PROVIDERS: Array<{
  Icon: () => React.JSX.Element;
  id: FederatedProvider;
  name: string;
}> = [
  { Icon: GoogleIcon, id: "google.com", name: "Google" },
  { Icon: AppleIcon, id: "apple.com", name: "Apple" },
];

export function FederatedAuthButtons({
  disabled,
  onSelect,
  verb,
}: {
  disabled?: boolean;
  onSelect: (provider: FederatedProvider) => void;
  verb: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PROVIDERS.map(({ Icon, id, name }) => (
        <Button
          key={id}
          className="w-full"
          disabled={disabled}
          onClick={() => onSelect(id)}
          size="lg"
          type="button"
          variant="outline"
        >
          <Icon />
          {verb} {name}
        </Button>
      ))}
    </div>
  );
}
