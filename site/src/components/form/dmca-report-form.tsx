"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  fullName: z.string().min(1, "Full legal name is required."),
  email: z.string().email("Please enter a valid email address."),
  mailingAddress: z.string().min(1, "Mailing address is required."),
  phone: z.string().min(1, "Phone number is required."),
  relationship: z
    .string()
    .min(1, "Please tell us whether you are the owner or an authorized agent."),
  copyrightedWorkDescription: z
    .string()
    .min(20, "Please describe the copyrighted work."),
  contentUrls: z
    .string()
    .min(1, "At least one direct public deck URL is required."),
  explanation: z.string().min(20, "Please explain what is infringing."),
  signature: z.string().min(1, "Your typed signature is required."),
  goodFaith: z.boolean().refine((value) => value, {
    message: "You must confirm the good faith statement.",
  }),
  accuracy: z.boolean().refine((value) => value, {
    message: "You must confirm the accuracy statement.",
  }),
});

type FormValues = z.infer<typeof schema>;

export function DmcaReportForm({
  initialDeckUrl,
}: {
  initialDeckUrl?: string | null;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      mailingAddress: "",
      phone: "",
      relationship: "",
      copyrightedWorkDescription: "",
      contentUrls: "",
      explanation: "",
      signature: "",
      goodFaith: false,
      accuracy: false,
    },
  });

  useEffect(() => {
    if (!initialDeckUrl || form.getValues("contentUrls").trim().length > 0) {
      return;
    }
    form.setValue("contentUrls", initialDeckUrl, { shouldDirty: false });
  }, [form, initialDeckUrl]);

  const onSubmit = async (values: FormValues) => {
    try {
      const response = await fetch("/api/dmca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to submit DMCA notice.");
      }

      toast.success("DMCA notice submitted. We will review it promptly.");
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit DMCA notice.",
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full legal name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jane@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telephone number</FormLabel>
                <FormControl>
                  <Input placeholder="+1 555 555 5555" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship to the work</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Select one</option>
                    <option value="owner">I am the copyright owner</option>
                    <option value="agent">
                      I am authorized to act on behalf of the owner
                    </option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="mailingAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mailing address</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  className="resize-y"
                  placeholder="123 Example Street&#10;City, State, ZIP&#10;Country"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="copyrightedWorkDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description of the copyrighted work</FormLabel>
              <FormDescription>
                If multiple works are involved, you may provide a representative
                list.
              </FormDescription>
              <FormControl>
                <Textarea
                  rows={5}
                  className="min-h-36 resize-y"
                  placeholder="Describe the original material you own or represent."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contentUrls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specific infringing content URLs</FormLabel>
              <FormDescription>
                Paste one direct public deck URL per line so we can locate the
                reported content precisely.
              </FormDescription>
              <FormControl>
                <Textarea
                  rows={5}
                  className="min-h-36 resize-y"
                  placeholder="https://app.eduthart.com/public-decks/your-deck-id"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="explanation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Explain the alleged infringement</FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  className="min-h-36 resize-y"
                  placeholder="Tell us why this content is infringing and anything else that will help the review."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-5">
          <FormField
            control={form.control}
            name="goodFaith"
            render={({ field }) => (
              <FormItem>
                <label className="flex items-start gap-3 text-sm leading-6">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(Boolean(checked))
                      }
                    />
                  </FormControl>
                  <span>
                    I have a good faith belief that the use of the material in
                    the manner complained of is not authorized by the copyright
                    owner, its agent, or the law.
                  </span>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accuracy"
            render={({ field }) => (
              <FormItem>
                <label className="flex items-start gap-3 text-sm leading-6">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(Boolean(checked))
                      }
                    />
                  </FormControl>
                  <span>
                    The information in this notification is accurate, and under
                    penalty of perjury, I am the owner or an agent authorized to
                    act on behalf of the owner of an exclusive right that is
                    allegedly infringed.
                  </span>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="signature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Electronic signature</FormLabel>
              <FormDescription>
                Type your full legal name to sign this notice.
              </FormDescription>
              <FormControl>
                <Input placeholder="Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full md:w-auto"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Submitting..." : "Submit DMCA notice"}
        </Button>
      </form>
    </Form>
  );
}
