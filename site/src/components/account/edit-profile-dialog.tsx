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
  FormErrorCallout,
  FormShell,
  SubmitButton,
} from "@/components/ui/form";
import { LocationField } from "@/components/profile/location-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_BIO_LENGTH } from "@/lib/profile/details";
import {
  EMPTY_PROFILE_LOCATION_INPUT,
  profileLocationInputSchema,
} from "@/lib/profile/location";

export const profileFormSchema = z.object({
  bio: z
    .string()
    .max(
      MAX_BIO_LENGTH,
      `Keep your biography under ${MAX_BIO_LENGTH} characters.`
    ),
  firstName: z.string(),
  lastName: z.string(),
  location: profileLocationInputSchema,
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

export function useProfileForm() {
  return useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      bio: "",
      firstName: "",
      lastName: "",
      location: EMPTY_PROFILE_LOCATION_INPUT,
    },
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
    <Dialog
      open={open}
      // Stay open while saving, so a failure has somewhere to show.
      onOpenChange={(nextOpen) =>
        nextOpen || !form.formState.isSubmitting ? onOpenChange(nextOpen) : null
      }
    >
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
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel htmlFor="account-location">Location</FormLabel>
                <LocationField
                  idPrefix="account-location"
                  invalid={Boolean(fieldState.error)}
                  onChange={field.onChange}
                  value={field.value}
                />
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
          <FormErrorCallout />
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
