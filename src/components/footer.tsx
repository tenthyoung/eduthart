"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SocialIcon } from "@/components/ui/social-icon";
import { SOCIAL_MEDIA_LINKS } from "@/constants/social-media.constants";
import { AlertCircle, CheckCircle, Linkedin, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { siFacebook, siInstagram, siX, siYoutube } from "simple-icons";
import { toast } from "sonner";

interface NewsletterFormData {
  email: string;
  subscribe: boolean;
}

const navigationLinks = [
  { name: "About", href: "/about" },
  { name: "Exhibitions", href: "/#features" },
  { name: "Membership", href: "/pricing" },
  { name: "Contact", href: "/contact" },
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
        "Please confirm that you would like to join our mailing list.",
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
        setAlertMessage("You have been added to the gallery mailing list.");
        setIsSubscribed(true);
        toast.success("You have been added to the gallery mailing list.");
        reset();
      } else {
        setAlertType("error");
        setAlertMessage("We could not save your subscription. Please try again.");
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
        "Please confirm that you would like to join our mailing list.",
      );
    } else if (errors.email) {
      setAlertType("error");
      setAlertMessage(
        errors.email.message || "Please fill in all required fields.",
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
    <footer className="border-t bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-8">
              <div>
                <Image
                  src="/logo/eduthart-logo.png"
                  alt="EduthArt Gallery"
                  width={80}
                  height={80}
                  className="h-16 w-auto"
                />
              </div>

              <div className="flex flex-wrap gap-8">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="font-medium text-foreground transition-colors duration-200 hover:text-primary"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              <div className="flex gap-6">
                {socialIcons.map((socialIcon) => {
                  if (socialIcon.isLucide) {
                    const IconComponent = socialIcon.icon;
                    return (
                      <Link
                        key={socialIcon.label}
                        href={socialIcon.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground transition-colors duration-200 hover:text-primary"
                        aria-label={socialIcon.label}
                      >
                        <IconComponent size={24} />
                      </Link>
                    );
                  }
                  return (
                    <SocialIcon
                      key={socialIcon.label}
                      iconPath={socialIcon.iconPath!}
                      href={socialIcon.href}
                      label={socialIcon.label}
                      size={24}
                      variant="footer"
                    />
                  );
                })}
              </div>

              <div className="space-y-3">
                <div className="text-muted-foreground">
                  <p className="mb-2 font-semibold text-foreground">
                    EDUTHART GALLERY
                  </p>
                  <p className="mb-2">For visit requests, collecting inquiries, and press.</p>
                  <Link
                    href="mailto:support@eduthart.com"
                    className="mb-3 block text-foreground transition-colors duration-200 hover:text-primary"
                  >
                    support@eduthart.com
                  </Link>
                </div>
                <div className="text-muted-foreground">
                  <p className="mb-2">Follow exhibition announcements and new works</p>
                  <p className="mb-3">Based in Orange County, CA</p>
                  <p>Welcoming visitors, collectors, and design professionals</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold">Join the Gallery List</h3>
              <p className="text-muted-foreground">
                Receive exhibition announcements, private-view invitations, and selected highlights from the collection.
              </p>

              {isSubscribed ? (
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-6 text-center">
                  <p className="font-semibold text-primary">
                    Thank you for subscribing.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    You&apos;ll receive upcoming exhibition news and gallery updates.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium"
                    >
                      Email*
                    </label>
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
                      className={`w-full rounded-md border bg-background px-4 py-3 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary ${
                        errors.email ? "border-red-500" : "border-input"
                      }`}
                      placeholder="Enter your email address"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <Controller
                        name="subscribe"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            id="subscribe"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="mt-1"
                          />
                        )}
                      />
                      <label
                        htmlFor="subscribe"
                        className="cursor-pointer text-sm text-muted-foreground"
                      >
                        Yes, send me exhibition news and gallery updates.
                      </label>
                    </div>
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

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-8 sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join the List"
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="border-t py-6">
          <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-6">
              {legalLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="transition-colors duration-200 hover:text-primary"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="text-center sm:text-right">
              © 2026 Hendeca Labs LLC • Founded by Izzy Young
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
