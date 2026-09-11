"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AccountShell } from "@/components/account/account-shell";
import { CollectorEmptyState } from "@/components/collectors/artwork-card";
import { CollectorLoadingPanel } from "@/components/collectors/loading-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useCollectorResource } from "@/hooks/useCollectorResource";
import {
  formatAddressLines,
  type AddressKind,
  type SavedAddress,
} from "@/lib/collectors/address-format";

const addressFormSchema = z.object({
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  id: z.string().optional(),
  kind: z.enum(["shipping", "billing"]),
  label: z.string(),
  line1: z.string().min(1, "Street address is required"),
  line2: z.string(),
  name: z.string().min(1, "Full name is required"),
  phone: z.string(),
  postalCode: z.string().min(1, "Postal code is required"),
  region: z.string(),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

const EMPTY_DRAFT: AddressFormValues = {
  city: "",
  country: "US",
  id: undefined,
  kind: "shipping",
  label: "",
  line1: "",
  line2: "",
  name: "",
  phone: "",
  postalCode: "",
  region: "",
};

const FIELDS: Array<{
  autoComplete: string;
  key: Exclude<keyof AddressFormValues, "id" | "kind" | "label">;
  label: string;
  required?: boolean;
}> = [
  { autoComplete: "name", key: "name", label: "Full name", required: true },
  {
    autoComplete: "address-line1",
    key: "line1",
    label: "Street address",
    required: true,
  },
  {
    autoComplete: "address-line2",
    key: "line2",
    label: "Apartment, suite (optional)",
  },
  {
    autoComplete: "address-level2",
    key: "city",
    label: "City",
    required: true,
  },
  { autoComplete: "address-level1", key: "region", label: "State or region" },
  {
    autoComplete: "postal-code",
    key: "postalCode",
    label: "Postal code",
    required: true,
  },
  { autoComplete: "country", key: "country", label: "Country", required: true },
  { autoComplete: "tel", key: "phone", label: "Phone (optional)" },
];

const KINDS: Array<{ description: string; kind: AddressKind; title: string }> =
  [
    {
      description: "Where your artwork is delivered.",
      kind: "shipping",
      title: "Shipping addresses",
    },
    {
      description: "Where your card statement is registered.",
      kind: "billing",
      title: "Billing addresses",
    },
  ];

export function AddressesPage() {
  const { data, error, loading, mutate } = useCollectorResource<SavedAddress[]>(
    {
      initialData: [],
      path: "/api/collectors/addresses",
      select: (payload) => (payload.addresses as SavedAddress[]) ?? [],
      signInPath: "/account/addresses",
    }
  );
  const [open, setOpen] = useState(false);
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: EMPTY_DRAFT,
  });
  const editingId = form.watch("id");

  const openDraft = (values: AddressFormValues) => {
    form.reset(values);
    setOpen(true);
  };

  const onSubmit = async (values: AddressFormValues) => {
    const saved = await mutate(
      { body: values, method: "POST" },
      values.id ? "Address updated." : "Address saved."
    );

    if (saved) {
      setOpen(false);
    }
  };

  if (loading) {
    return (
      <AccountShell description="Where your artwork goes." title="Addresses">
        <CollectorLoadingPanel label="Loading your addresses..." />
      </AccountShell>
    );
  }

  return (
    <AccountShell
      action={
        <Button onClick={() => openDraft({ ...EMPTY_DRAFT })}>
          <Plus />
          Add address
        </Button>
      }
      description="Manage the shipping and billing addresses offered at checkout. The default of each kind is selected automatically."
      title="Addresses"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Address error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-10">
        {KINDS.map(({ description, kind, title }) => {
          const addresses = data.filter((address) => address.kind === kind);

          return (
            <section key={kind} className="space-y-4">
              <div>
                <h2 className="text-2xl text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>

              {addresses.length === 0 ? (
                <CollectorEmptyState
                  action={
                    <Button onClick={() => openDraft({ ...EMPTY_DRAFT, kind })}>
                      <Plus />
                      Add a {kind} address
                    </Button>
                  }
                  description={
                    kind === "shipping"
                      ? "Checkout needs a shipping address before an original can be sent to you."
                      : "Add one if your card is registered somewhere other than your delivery address."
                  }
                  icon={<MapPin className="size-5" />}
                  title={`No ${kind} addresses yet`}
                />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {addresses.map((address) => (
                    <li
                      key={address.id}
                      className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-white p-5"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {address.label || address.name}
                          </p>
                          {address.isDefault ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                              <Star className="size-3" />
                              Default
                            </span>
                          ) : null}
                        </div>
                        <address className="text-sm not-italic leading-6 text-muted-foreground">
                          {formatAddressLines(address).map((line) => (
                            <span key={line} className="block">
                              {line}
                            </span>
                          ))}
                        </address>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2">
                        <Button
                          onClick={() =>
                            openDraft({
                              city: address.city,
                              country: address.country,
                              id: address.id,
                              kind: address.kind,
                              label: address.label ?? "",
                              line1: address.line1,
                              line2: address.line2 ?? "",
                              name: address.name,
                              phone: address.phone ?? "",
                              postalCode: address.postalCode,
                              region: address.region,
                            })
                          }
                          size="sm"
                          variant="outline"
                        >
                          <Pencil />
                          Edit
                        </Button>
                        {!address.isDefault ? (
                          <Button
                            onClick={() =>
                              void mutate(
                                { body: { id: address.id }, method: "PATCH" },
                                "Default address updated."
                              )
                            }
                            size="sm"
                            variant="outline"
                          >
                            <Star />
                            Make default
                          </Button>
                        ) : null}
                        <Button
                          onClick={() =>
                            void mutate(
                              { body: { id: address.id }, method: "DELETE" },
                              "Address removed."
                            )
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 />
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => (nextOpen ? null : setOpen(false))}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit address" : "Add an address"}
            </DialogTitle>
            <DialogDescription>
              Used at checkout for delivery and for your invoice.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem className="block space-y-2">
                    <FormLabel htmlFor="address-kind">Address type</FormLabel>
                    <FormControl>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                        id="address-kind"
                        {...field}
                      >
                        <option value="shipping">Shipping</option>
                        <option value="billing">Billing</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem className="block space-y-2">
                    <FormLabel htmlFor="address-label">
                      Label (optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="address-label"
                        placeholder="Home studio"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {FIELDS.map((fieldConfig) => (
                <FormField
                  key={fieldConfig.key}
                  control={form.control}
                  name={fieldConfig.key}
                  render={({ field }) => (
                    <FormItem className="block space-y-2">
                      <FormLabel htmlFor={`address-${fieldConfig.key}`}>
                        {fieldConfig.label}
                      </FormLabel>
                      <FormControl>
                        <Input
                          autoComplete={fieldConfig.autoComplete}
                          id={`address-${fieldConfig.key}`}
                          required={fieldConfig.required}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <DialogFooter>
                <Button disabled={form.formState.isSubmitting} type="submit">
                  {form.formState.isSubmitting
                    ? "Saving address..."
                    : "Save address"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AccountShell>
  );
}
