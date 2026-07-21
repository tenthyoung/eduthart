"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const contactFormSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  message: z.string().min(1, "Message is required"),
});

type FormData = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  className?: string;
}

export const ContactForm = ({ className }: ContactFormProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const artwork = params.get("artwork");
    const artist = params.get("artist");
    const listing = params.get("listing");

    if (!artwork) return;

    form.setValue(
      "message",
      `I'm interested in purchasing “${artwork}”${artist ? ` by ${artist}` : ""}.${listing ? `\n\nArtwork: ${window.location.origin}${listing}` : ""}\n\nPlease let me know the next steps.`,
    );
  }, [form]);

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      toast.success("Message sent successfully. The gallery will reply soon.");
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send message. Please try again.",
      );
    }
  };

  const stylesRequired = {
    transform: "translateX(-6px)",
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-6", className)}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="name">
                  Full Name
                  <span className="text-primary" style={stylesRequired}>
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Jordan Avery" {...field} />
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
                <FormLabel htmlFor="email">
                  Email Address
                  <span className="text-primary" style={stylesRequired}>
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jordan@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="message">
                Message
                <span className="text-primary" style={stylesRequired}>
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={5}
                  placeholder="Tell us about your visit, collecting interest, or the work you would like to discuss."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              Send Inquiry
              <Send className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};
