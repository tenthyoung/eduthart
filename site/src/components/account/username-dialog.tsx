"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { buildArtistPageHref } from "@/lib/auth/account-profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const usernameFormSchema = z.object({
  username: z.string(),
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
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
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
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving username...
                  </>
                ) : (
                  "Save username"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
