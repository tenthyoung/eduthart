"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SocialIcon } from "@/components/ui/social-icon";
import { SOCIAL_MEDIA_LINKS } from "@/constants/social-media.constants";
import { AlertCircle, CheckCircle, Linkedin, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { siFacebook, siInstagram, siX, siYoutube } from "simple-icons";
import { toast } from "sonner";

interface NewsletterFormData {
  email: string;
  subscribe: boolean;
}

const linkColumns = [
  {
    title: "Buying",
    links: [
      { name: "Browse all art", href: "/browse" },
      {
        name: "Shipping and returns",
        href: "/legal/refund-cancellation-policy",
      },
      { name: "Contact us", href: "/contact" },
    ],
  },
  {
    title: "Artists",
    links: [
      { name: "Sell on EduthArt", href: "/for-artists" },
      { name: "Apply to sell", href: "/apply-to-be-an-artist" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/about" },
      { name: "Journal", href: "/blog" },
    ],
  },
];

const legalLinks = [
  { name: "Terms of Service", href: "/legal/terms-of-service" },
  { name: "Privacy Policy", href: "/legal/privacy-policy" },
  { name: "Content Policy", href: "/legal/content-policy" },
  {
    name: "Refund & Cancellation",
    href: "/legal/refund-cancellation-policy",
  },
  { name: "Legal", href: "/legal" },
];

export function Footer() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    reset,
    control,
    watch,
  } = useForm<NewsletterFormData>({
    defaultValues: {
      email: "",
      subscribe: false,
    },
  });

  const subscribe = watch("subscribe");

  const onSubmit = async (data: NewsletterFormData) => {
    if (!data.subscribe) {
      setAlertType("error");
      setAlertMessage(
        "Please confirm that you would like to join our mailing list."
      );
      return;
    }

    try {
      const response = await fetch("/api/zoho-campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: [data.email],
          listKey:
            "3z04b4ed98938ff07d4f2d0fec7f8d43a56513e22250d799f540df80ee69696f93",
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setAlertType("success");
        setAlertMessage("You have been added to the collector mailing list.");
        setIsSubscribed(true);
        toast.success("You have been added to the collector mailing list.");
        reset();
      } else {
        setAlertType("error");
        setAlertMessage(
          "We could not save your subscription. Please try again."
        );
        toast.error("We could not save your subscription. Please try again.");
        console.error("Subscription error:", responseData);
      }
    } catch (error) {
      setAlertType("error");
      setAlertMessage("An error occurred. Please try again later.");
      toast.error("An error occurred. Please try again later.");
      console.error("Subscription error:", error);
    }
  };

  const onInvalidSubmit = () => {
    if (!subscribe) {
      setAlertType("error");
      setAlertMessage(
        "Please confirm that you would like to join our mailing list."
      );
    } else if (errors.email) {
      setAlertType("error");
      setAlertMessage(
        errors.email.message || "Please fill in all required fields."
      );
    }
  };

  const socialIcons = [
    {
      iconPath: siInstagram.path,
      href: SOCIAL_MEDIA_LINKS.INSTAGRAM,
      label: "Instagram",
    },
    {
      iconPath: siFacebook.path,
      href: SOCIAL_MEDIA_LINKS.FACEBOOK,
      label: "Facebook",
    },
    { iconPath: siX.path, href: SOCIAL_MEDIA_LINKS.X, label: "X" },
    {
      iconPath: siYoutube.path,
      href: SOCIAL_MEDIA_LINKS.YOUTUBE,
      label: "Youtube",
    },
    {
      icon: Linkedin,
      href: SOCIAL_MEDIA_LINKS.LINKEDIN,
      label: "LinkedIn",
      isLucide: true,
    },
  ];

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 py-14 lg:grid-cols-[1.1fr_repeat(3,minmax(0,0.6fr))_1.4fr] lg:gap-10 lg:py-16">
          <div className="space-y-5">
            <Link
              href="/"
              className="font-display text-[1.75rem] leading-none text-foreground"
            >
              EduthArt
            </Link>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              Original art, bought straight from the people who make it.
            </p>
            <div className="flex gap-5">
              {socialIcons.map((socialIcon) => {
                if (socialIcon.isLucide) {
                  const IconComponent = socialIcon.icon;
                  return (
                    <Link
                      key={socialIcon.label}
                      href={socialIcon.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      aria-label={socialIcon.label}
                    >
                      <IconComponent size={20} />
                    </Link>
                  );
                }
                return (
                  <SocialIcon
                    key={socialIcon.label}
                    iconPath={socialIcon.iconPath!}
                    href={socialIcon.href}
                    label={socialIcon.label}
                    size={20}
                    variant="footer"
                  />
                );
              })}
            </div>
          </div>

          {linkColumns.map((column) => (
            <nav aria-label={column.title} key={column.title}>
              <p className="text-sm font-semibold text-foreground">
                {column.title}
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              New work from the studios, once a week
            </h3>

            {isSubscribed ? (
              <div className="rounded-xl border border-border bg-muted p-5">
                <p className="font-semibold text-foreground">
                  Thank you for subscribing.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&apos;ll receive new work and collector notes.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
                className="space-y-3"
              >
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    id="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Please enter a valid email address",
                      },
                    })}
                    className={`h-11 min-w-0 flex-1 rounded-xl border bg-background px-4 text-sm transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring ${
                      errors.email ? "border-red-500" : "border-input"
                    }`}
                    placeholder="you@example.com"
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 px-5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}

                <div className="flex items-start gap-3">
                  <Controller
                    name="subscribe"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="subscribe"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    )}
                  />
                  <label
                    htmlFor="subscribe"
                    className="cursor-pointer text-sm text-muted-foreground"
                  >
                    Yes, send me new work and collector emails.
                  </label>
                </div>

                {!subscribe && alertType && isSubmitted && (
                  <Alert
                    variant={
                      alertType === "success" ? "success" : "destructive"
                    }
                  >
                    <div className="flex items-start gap-3">
                      {alertType === "success" ? (
                        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                      )}
                      <AlertDescription>{alertMessage}</AlertDescription>
                    </div>
                  </Alert>
                )}
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-border py-6">
          <div className="flex flex-col gap-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {legalLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="transition-colors duration-200 hover:text-foreground"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div>© 2026 Hendeca Labs LLC • Founded by Izzy Young</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
