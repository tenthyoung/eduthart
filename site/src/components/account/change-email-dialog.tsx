"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  FormShell,
  SubmitButton,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const emailFormSchema = z.object({
  nextEmail: z
    .string()
    .trim()
    .min(1, "Enter your new email address.")
    .email("Enter a valid email address, like name@example.com."),
});

export type EmailFormData = z.infer<typeof emailFormSchema>;

export function useEmailForm() {
  return useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { nextEmail: "" },
  });
}

export function ChangeEmailDialog({
  currentEmail,
  form,
  onOpenChange,
  onSubmit,
  open,
}: {
  currentEmail: string | null;
  form: ReturnType<typeof useEmailForm>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EmailFormData) => Promise<void>;
  open: boolean;
}) {
  // An unchanged address is a field problem, not a disabled button: say so
  // beside the field rather than leaving the person to guess why nothing works.
  const handleSubmit = async (values: EmailFormData) => {
    const unchanged =
      values.nextEmail.trim().toLowerCase() ===
      (currentEmail ?? "").trim().toLowerCase();

    if (unchanged) {
      form.setError("nextEmail", {
        message: "That's already your email address. Enter the new one.",
        type: "validate",
      });
      return;
    }

    await onSubmit(values);
  };

  return (
    <Dialog
      open={open}
      // Stay open while saving, so a failure has somewhere to show.
      onOpenChange={(nextOpen) =>
        nextOpen || !form.formState.isSubmitting ? onOpenChange(nextOpen) : null
      }
    >
      <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Email
        </p>
        <p className="mt-2 text-sm text-foreground">
          {currentEmail ?? "Not available"}
        </p>
        <DialogTrigger asChild>
          <Button className="mt-3" type="button" variant="outline">
            <Mail />
            Change email address
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change email address</DialogTitle>
          <DialogDescription>
            Enter your new email address. We&apos;ll send a confirmation link
            before the change takes effect.
          </DialogDescription>
        </DialogHeader>
        <FormShell
          className="space-y-4"
          errorTitle="Your email wasn't changed"
          form={form}
          onSubmit={handleSubmit}
        >
          <FormField
            control={form.control}
            name="nextEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="account-next-email">
                  New email address
                </FormLabel>
                <FormControl>
                  <Input
                    id="account-next-email"
                    type="email"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <SubmitButton pendingLabel="Updating email...">
              Continue
            </SubmitButton>
          </DialogFooter>
        </FormShell>
      </DialogContent>
    </Dialog>
  );
}
