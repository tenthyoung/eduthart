"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { MAX_BIO_LENGTH, MAX_LOCATION_LENGTH } from "@/lib/profile/details";

export const profileFormSchema = z.object({
  bio: z
    .string()
    .max(
      MAX_BIO_LENGTH,
      `Keep your biography under ${MAX_BIO_LENGTH} characters.`
    ),
  firstName: z.string(),
  lastName: z.string(),
  location: z
    .string()
    .max(
      MAX_LOCATION_LENGTH,
      `Keep your location under ${MAX_LOCATION_LENGTH} characters.`
    ),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

export function useProfileForm() {
  return useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { bio: "", firstName: "", lastName: "", location: "" },
  });
}

export function EditProfileDialog({
  displayNamePreview,
  form,
  onOpenChange,
  onSubmit,
  open,
}: {
  displayNamePreview: string;
  form: ReturnType<typeof useProfileForm>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProfileFormData) => Promise<void>;
  open: boolean;
}) {
  const bio = form.watch("bio");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <UserRound />
          Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update the details collectors and artists see, without keeping the
            full form visible on the account page.
          </DialogDescription>
        </DialogHeader>
        <FormShell
          className="space-y-4"
          errorTitle="Your profile wasn't saved"
          form={form}
          onSubmit={onSubmit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="account-first-name">First name</FormLabel>
                  <FormControl>
                    <Input id="account-first-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="account-last-name">Last name</FormLabel>
                  <FormControl>
                    <Input id="account-last-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="account-location">Location</FormLabel>
                <FormControl>
                  <Input
                    id="account-location"
                    autoComplete="address-level2"
                    maxLength={MAX_LOCATION_LENGTH}
                    placeholder="Brooklyn, New York"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="account-bio">Biography</FormLabel>
                <FormControl>
                  <Textarea
                    id="account-bio"
                    maxLength={MAX_BIO_LENGTH}
                    placeholder="Tell collectors what you make, collect, or care about."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {bio.length}/{MAX_BIO_LENGTH} characters
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Display name preview
            </p>
            <p className="mt-2 text-base text-foreground">
              {displayNamePreview}
            </p>
          </div>
          <DialogFooter>
            <SubmitButton pendingLabel="Saving profile...">
              Save profile
            </SubmitButton>
          </DialogFooter>
        </FormShell>
      </DialogContent>
    </Dialog>
  );
}
