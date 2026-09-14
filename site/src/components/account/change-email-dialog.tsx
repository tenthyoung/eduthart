"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BusyLabel } from "@/components/account/account-surfaces";
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
import { Input } from "@/components/ui/input";

export const emailFormSchema = z.object({ nextEmail: z.string() });

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
  const nextEmail = form.watch("nextEmail");
  const saving = form.formState.isSubmitting;
  const unchanged =
    nextEmail.trim().toLowerCase() ===
    (currentEmail ?? "").trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
              <Button disabled={saving || unchanged} type="submit">
                <BusyLabel busy={saving} busyLabel="Updating email...">
                  Continue
                </BusyLabel>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
