"use client";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/api/api-error";
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
      `I'm interested in purchasing “${artwork}”${artist ? ` by ${artist}` : ""}.${listing ? `\n\nArtwork: ${window.location.origin}${listing}` : ""}\n\nPlease let me know the next steps.`
    );
  }, [form]);

  // A failure throws, and FormShell shows it at the top of the form with every
  // field still filled in. Only a message that was sent clears the form.
  const onSubmit = async (data: FormData) => {
    await requestJson("/api/contact", { method: "POST", body: data });
    toast.success("Message sent. We'll reply by email soon.");
    form.reset();
  };

  const stylesRequired = {
    transform: "translateX(-6px)",
  };

  return (
    <FormShell
      form={form}
      onSubmit={onSubmit}
      errorTitle="Your message wasn't sent"
      className={cn("space-y-6", className)}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
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
              <FormLabel>
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
            <FormLabel>
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

      <FormErrorCallout />
      <SubmitButton size="lg" className="w-full" pendingLabel="Sending...">
        Send Inquiry
        <Send className="h-4 w-4 ml-2" />
      </SubmitButton>
    </FormShell>
  );
};
