"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  buildArtistPageHref,
  isValidUsername,
  normalizeUsername,
} from "@/lib/auth/account-profile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

/** Shared with the profile completion page, where the username is optional. */
export const USERNAME_RULE_MESSAGE =
  "Use 3-24 lowercase letters, numbers, hyphens or underscores, starting and ending with a letter or number.";

export function isAcceptableUsername(value: string) {
  return isValidUsername(normalizeUsername(value) ?? "");
}

const usernameFormSchema = z.object({
  username: z
    .string()
    .refine((value) => value.trim().replace(/^@+/, "").length > 0, {
      message: "Choose a username.",
    })
    .refine(
      (value) =>
        value.trim().replace(/^@+/, "").length === 0 ||
        isAcceptableUsername(value),
      { message: USERNAME_RULE_MESSAGE }
    ),
});

type UsernameFormData = z.infer<typeof usernameFormSchema>;

type UsernameDialogProps = {
  defaultUsername?: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (username: string) => Promise<void>;
  open: boolean;
  title: string;
};

export function UsernameDialog({
  defaultUsername = "",
  description,
  onOpenChange,
  onSubmit,
  open,
  title,
}: UsernameDialogProps) {
  const form = useForm<UsernameFormData>({
    resolver: zodResolver(usernameFormSchema),
    defaultValues: { username: defaultUsername },
  });

  useEffect(() => {
    form.reset({ username: defaultUsername });
  }, [defaultUsername, form]);

  const username = form.watch("username");
  const normalizedUsername = username.trim().replace(/^@+/, "").toLowerCase();
  const previewHref = normalizedUsername
    ? buildArtistPageHref(normalizedUsername)
    : "/artists/yourname";

  const handleSubmit = async (values: UsernameFormData) => {
    await onSubmit(values.username);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FormShell
          className="space-y-4"
          errorTitle="Your username wasn't saved"
          form={form}
          onSubmit={handleSubmit}
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="account-username">Username</FormLabel>
                <FormControl>
                  <Input
                    id="account-username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="@yourname"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  This creates your public page at {previewHref}. Use 3-24
                  letters, numbers, hyphens, or underscores.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <SubmitButton pendingLabel="Saving username...">
              Save username
            </SubmitButton>
          </DialogFooter>
        </FormShell>
      </DialogContent>
    </Dialog>
  );
}
