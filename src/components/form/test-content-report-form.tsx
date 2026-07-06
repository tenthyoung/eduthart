"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
  contentUrls: z
    .string()
    .min(1, "At least one direct public deck URL is required."),
  gradeLevel: z.string().min(1, "Grade level is required."),
  subject: z.string().min(1, "Subject is required."),
  assessmentType: z.string().min(1, "Assessment type is required."),
  originalAuthor: z.string().min(1, "Original author selection is required."),
  description: z
    .string()
    .min(
      20,
      "Please provide a brief description with enough detail for review.",
    ),
  email: z.string().email("Please enter a valid email address."),
});

type FormValues = z.infer<typeof schema>;

const gradeLevels = [
  "Middle School (under 14)",
  "High School (ages 14-18)",
  "College (ages 18-24)",
  "Graduate (post college)",
  "Professional",
  "Other",
];

const subjects = [
  "Foreign language",
  "Language arts",
  "Sciences",
  "Social studies",
  "Mathematics",
  "Medical/Nursing",
  "Arts",
  "Vocational/job training",
  "Computer science/technology",
  "Criminology/legal studies",
  "Psychology",
  "Religion",
  "Business/economics",
  "Other",
];

const assessmentTypes = [
  "Quiz",
  "Test",
  "Midterm exam",
  "Final exam",
  "Licensing/certification exam",
  "Admissions exam",
  "Standardized course exam",
  "Other",
];

const originalAuthors = [
  "I am the original author. I use it with my students.",
  "A publisher is the original author. My employer purchased it for use with our students.",
  "A standardized testing organization is the original author. I use it with my students.",
  "My employer is the original author. I use it with my students.",
  "Other",
];

export function TestContentReportForm({
  initialDeckUrl,
}: {
  initialDeckUrl?: string | null;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contentUrls: "",
      gradeLevel: "",
      subject: "",
      assessmentType: "",
      originalAuthor: "",
      description: "",
      email: "",
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
      const response = await fetch("/api/test-content-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = (await response.json()) as {
        error?: string;
        success?: boolean;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to submit report.");
      }

      toast.success(
        "Report submitted. We will review the content as quickly as we can.",
      );
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to submit report.",
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="contentUrls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content items you would like to report</FormLabel>
              <FormDescription>
                Paste one direct public deck URL per line. Search results,
                profile pages, and folder pages are not accepted.
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

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="gradeLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Which grade level is this content intended for?
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Select one</option>
                    {gradeLevels.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What subject is this content?</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Select one</option>
                    {subjects.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assessmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  What type of assessment is this material used in?
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Select one</option>
                    {assessmentTypes.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="originalAuthor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Who is the original author of this content?
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Select one</option>
                    {originalAuthors.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tell us more about this material</FormLabel>
              <FormDescription>
                Include anything useful, such as the course, assessment name,
                publisher, or how students may have gained access.
              </FormDescription>
              <FormControl>
                <Textarea
                  rows={6}
                  className="min-h-40 resize-y"
                  placeholder="Describe the material and why it should be removed."
                  {...field}
                />
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
                <Input type="email" placeholder="you@example.edu" {...field} />
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
          {form.formState.isSubmitting ? "Submitting..." : "Submit report"}
        </Button>
      </form>
    </Form>
  );
}
