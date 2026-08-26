"use client";

import { Check, KeyRound, Loader2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;

type Requirement = {
  label: string;
  test: (value: string) => boolean;
};

const REQUIREMENTS: Requirement[] = [
  {
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (value) => value.length >= MIN_PASSWORD_LENGTH,
  },
  {
    label: "One lowercase and one uppercase letter",
    test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  },
  { label: "One number or symbol", test: (value) => /[^A-Za-z]/.test(value) },
];

export function ChangePasswordDialog({
  onSubmit,
}: {
  onSubmit: (currentPassword: string, nextPassword: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(
    () =>
      REQUIREMENTS.map((requirement) => ({
        ...requirement,
        met: requirement.test(nextPassword),
      })),
    [nextPassword]
  );
  const meetsRequirements = results.every((result) => result.met);
  const passwordsMatch =
    nextPassword.length > 0 && nextPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    meetsRequirements &&
    passwordsMatch &&
    !saving;

  const reset = () => {
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit(currentPassword, nextPassword);
      reset();
      setOpen(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to change your password."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) {
          setOpen(nextOpen);

          if (!nextOpen) {
            reset();
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <KeyRound />
          Change password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Confirm the password you use today, then choose a new one. You stay
            signed in on this device.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              value={currentPassword}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-new-password">New password</Label>
            <PasswordInput
              id="account-new-password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              onChange={(event) => setNextPassword(event.target.value)}
              required
              value={nextPassword}
            />
          </div>

          <ul className="space-y-1.5 rounded-2xl border border-border/80 bg-muted/45 p-4">
            {results.map((result) => (
              <li
                key={result.label}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  result.met ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    result.met
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {result.met ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                </span>
                {result.label}
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <Label htmlFor="account-confirm-password">
              Confirm new password
            </Label>
            <PasswordInput
              id="account-confirm-password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              value={confirmPassword}
            />
            {confirmPassword.length > 0 && !passwordsMatch ? (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <X className="size-4" />
                Those passwords do not match yet.
              </p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button disabled={!canSubmit} type="submit">
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
