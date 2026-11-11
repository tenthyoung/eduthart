"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, KeyRound, X } from "lucide-react";
import { useState } from "react";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormErrorCallout,
  FormShell,
  SubmitButton,
  useFormField,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    // The same three rules PasswordRequirements shows. Their messages aren't
    // displayed: on a failed submit the checklist marks the unmet ones instead.
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

type Requirement = { label: string; met: boolean };

/** The rules the schema enforces, judged live as the person types. */
function passwordRequirements(value: string): Requirement[] {
  return [
    {
      label: `${MIN_PASSWORD_LENGTH} or more characters`,
      met: value.length >= MIN_PASSWORD_LENGTH,
    },
    {
      label: "Upper and lowercase letters",
      met: /[a-z]/.test(value) && /[A-Z]/.test(value),
    },
    { label: "A number or symbol", met: /[^A-Za-z]/.test(value) },
  ];
}

/**
 * The new-password field's description and, after a failed submit, its error.
 *
 * It replaces the field's FormMessage so each rule is reported once, in one
 * place. Unmet rules stay neutral until a submit fails, so an untouched form
 * doesn't open as a wall of red.
 */
function PasswordRequirements({ value }: { value: string }) {
  const { error, formDescriptionId } = useFormField();

  return (
    <ul
      className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs"
      id={formDescriptionId}
    >
      {passwordRequirements(value).map(({ label, met }) => {
        const failed = !met && !!error;

        return (
          <li
            className={cn(
              "flex items-center gap-1.5",
              met && "text-foreground",
              failed && "text-destructive",
              !met && !failed && "text-muted-foreground"
            )}
            key={label}
          >
            {met ? (
              <Check aria-hidden="true" className="size-3.5" />
            ) : failed ? (
              <X aria-hidden="true" className="size-3.5" />
            ) : (
              <span
                aria-hidden="true"
                className="mx-[5px] size-1 rounded-full bg-current"
              />
            )}
            {label}
            <span className="sr-only">{met ? " (done)" : " (not yet)"}</span>
          </li>
        );
      })}
    </ul>
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

  const nextPassword = form.watch("nextPassword");
  const saving = form.formState.isSubmitting;

  // A failure throws through to FormShell, which keeps what was typed and
  // shows why right above the button. Only a success clears the fields.
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
          className="space-y-4"
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
                <PasswordRequirements value={nextPassword} />
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

          <FormErrorCallout />
          <DialogFooter>
            <SubmitButton pendingLabel="Updating password...">
              Update password
            </SubmitButton>
          </DialogFooter>
        </FormShell>
      </DialogContent>
    </Dialog>
  );
}
