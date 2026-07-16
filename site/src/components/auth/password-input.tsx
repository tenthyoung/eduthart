"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

export function PasswordInput({
  className,
  id,
  ...props
}: PasswordInputProps) {
  const generatedId = useId();
  const [isVisible, setIsVisible] = useState(false);
  const inputId = id ?? generatedId;

  return (
    <div className="relative">
      <Input
        {...props}
        className={cn("pr-11", className)}
        id={inputId}
        type={isVisible ? "text" : "password"}
      />
      <button
        aria-controls={inputId}
        aria-label={isVisible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
        onClick={() => setIsVisible((value) => !value)}
        type="button"
      >
        {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
