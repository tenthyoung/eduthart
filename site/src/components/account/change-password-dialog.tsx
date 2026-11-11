"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, KeyRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MIN_PASSWORD_LENGTH } from "@/components/auth/auth-provider";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormShell,
  SubmitButton,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    // The same three rules the live checklist shows, so a submit that fails
    // them says which one beside the field.
    nextPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`
      )
      .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value), {
        message: "Include one lowercase and one uppercase letter.",
      })
      .refine((value) => /[^A-Za-z]/.test(value), {
        message: "Include one number or symbol.",
      }),
    confirmPassword: z.string().min(1, "Enter the new password again."),
  })
  .refine((values) => values.nextPassword === values.confirmPassword, {
    message: "Those passwords do not match yet.",
    path: ["confirmPassword"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

type RequirementState = "failed" | "met" | "pending";

type Requirement = { label: string; state: RequirementState };

/**
 * One row of the live checklist.
 *
 * `pending` is the state before the collector has typed anything the rule can
 * judge, so an untouched form reads as neutral rather than as a wall of
 * failures.
 */
function RequirementRow({
  label,
  state,
}: {
  label: string;
  state: RequirementState;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 text-sm",
        state === "met" && "text-foreground",
        state === "failed" && "text-destructive",
        state === "pending" && "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          state === "met" && "bg-primary/15 text-primary",
          state === "failed" && "bg-destructive/10 text-destructive",
          state === "pending" && "bg-muted text-muted-foreground"
        )}
      >
        {state === "met" ? (
          <Check className="size-3.5" />
        ) : state === "failed" ? (
          <X className="size-3.5" />
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      {label}
    </li>
  );
}

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

  const [nextPassword, confirmPassword] = form.watch([
    "nextPassword",
    "confirmPassword",
  ]);
  const saving = form.formState.isSubmitting;

  const requirements = useMemo<Requirement[]>(() => {
    const judge = (untouched: boolean, met: boolean): RequirementState =>
      untouched ? "pending" : met ? "met" : "failed";
    const blank = nextPassword.length === 0;

    return [
      {
        label: `At least ${MIN_PASSWORD_LENGTH} characters`,
        state: judge(blank, nextPassword.length >= MIN_PASSWORD_LENGTH),
      },
      {
        label: "One lowercase and one uppercase letter",
        state: judge(
          blank,
          /[a-z]/.test(nextPassword) && /[A-Z]/.test(nextPassword)
        ),
      },
      {
        label: "One number or symbol",
        state: judge(blank, /[^A-Za-z]/.test(nextPassword)),
      },
      {
        label: "Both entries match",
        state: judge(
          confirmPassword.length === 0,
          nextPassword === confirmPassword
        ),
      },
    ];
  }, [confirmPassword, nextPassword]);

  // A failure throws through to FormShell, which keeps all three fields and
  // shows why at the top of the dialog. Only a success clears them.
  const handleSubmit = async (values: ChangePasswordFormData) => {
    await onSubmit(values.currentPassword, values.nextPassword);
    form.reset();
    setOpen(false);
  };

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

        <FormShell
          className="space-y-5"
          errorTitle="Your password wasn't changed"
          form={form}
          onSubmit={handleSubmit}
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

          {/* The two new-password fields belong together, so the checklist
                that judges both sits under the pair rather than between them. */}
          <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/35 p-4">
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <ul className="space-y-1.5 border-t border-border/70 pt-4">
              {requirements.map((requirement) => (
                <RequirementRow
                  key={requirement.label}
                  label={requirement.label}
                  state={requirement.state}
                />
              ))}
            </ul>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingLabel="Updating password...">
              Update password
            </SubmitButton>
          </DialogFooter>
        </FormShell>
      </DialogContent>
    </Dialog>
  );
}
