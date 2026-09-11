"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, KeyRound, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MIN_PASSWORD_LENGTH } from "@/components/auth/auth-provider";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

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

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    nextPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`
      ),
    confirmPassword: z.string(),
  })
  .refine((values) => values.nextPassword === values.confirmPassword, {
    message: "Those passwords do not match yet.",
    path: ["confirmPassword"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function ChangePasswordDialog({
  onSubmit,
}: {
  onSubmit: (currentPassword: string, nextPassword: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      nextPassword: "",
      confirmPassword: "",
    },
  });

  const [currentPassword, nextPassword, confirmPassword] = form.watch([
    "currentPassword",
    "nextPassword",
    "confirmPassword",
  ]);
  const saving = form.formState.isSubmitting;

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

  const handleSubmit = async (values: ChangePasswordFormData) => {
    try {
      await onSubmit(values.currentPassword, values.nextPassword);
      form.reset();
      setOpen(false);
    } catch (submitError) {
      form.setError("root", {
        message:
          submitError instanceof Error
            ? submitError.message
            : "Unable to change your password.",
      });
    }
  };

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) {
          setOpen(nextOpen);

          if (!nextOpen) {
            form.reset();
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

        <Form {...form}>
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="current-password">
                    Current password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="current-password"
                      autoComplete="current-password"
                      required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="account-new-password">
                    New password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="account-new-password"
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="account-confirm-password">
                    Confirm new password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      id="account-confirm-password"
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                      {...field}
                    />
                  </FormControl>
                  {confirmPassword.length > 0 && !passwordsMatch ? (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                      <X className="size-4" />
                      Those passwords do not match yet.
                    </p>
                  ) : null}
                </FormItem>
              )}
            />

            {rootError ? (
              <p className="text-sm text-destructive">{rootError}</p>
            ) : null}

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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
