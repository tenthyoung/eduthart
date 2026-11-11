"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import { AlertCircle } from "lucide-react";
import {
  get,
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { ApiError } from "@/lib/api/api-error";
import {
  describeSubmitError,
  type SubmitErrorDescription,
  type SubmitErrorOptions,
} from "@/lib/forms/describe-submit-error";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });

  // The context defaults to `{}`, so check for a name rather than the object.
  if (!fieldContext.name) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : props.children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {body}
    </p>
  );
}

type FormErrorsConfig = Pick<
  SubmitErrorOptions,
  "serviceName" | "supportEmail"
>;

const FormErrorsContext = React.createContext<FormErrorsConfig>({});

/**
 * Names the product and its support address in every form's error callout
 * ("We couldn't reach EduthArt", "email support@…"). Set once near the root.
 */
function FormErrorsProvider({
  children,
  serviceName,
  supportEmail,
}: FormErrorsConfig & { children: React.ReactNode }) {
  const value = React.useMemo(
    () => ({ serviceName, supportEmail }),
    [serviceName, supportEmail]
  );

  return (
    <FormErrorsContext.Provider value={value}>
      {children}
    </FormErrorsContext.Provider>
  );
}

/**
 * `describeSubmitError` with this project's name and support address filled
 * in, for a failure outside a `FormShell` (a "Continue with Google" button).
 */
function useDescribeSubmitError() {
  const config = React.useContext(FormErrorsContext);

  return React.useCallback(
    (error: unknown, options: Pick<SubmitErrorOptions, "fallbackTitle"> = {}) =>
      describeSubmitError(error, { ...config, ...options }),
    [config]
  );
}

/**
 * What a person needs to report a failed submit: the words they saw, plus a
 * short reference, the time, and what the server said. Never field values.
 */
type SubmitErrorReport = SubmitErrorDescription & {
  reference: string;
  occurredAt: Date;
  status: number | null;
  detail: string | null;
};

type SubmitErrorContextValue = {
  error: SubmitErrorReport | null;
  calloutRef: React.RefObject<HTMLDivElement | null>;
};

const SubmitErrorContext = React.createContext<SubmitErrorContextValue>({
  error: null,
  calloutRef: { current: null },
});

/** Six characters someone can read out or type into an email. */
function newReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let reference = "";
  for (let index = 0; index < 6; index += 1) {
    reference += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return reference;
}

function technicalDetail(error: unknown): string | null {
  if (error instanceof ApiError) {
    return (
      [error.code, error.readable ? error.message : "unreadable response"]
        .filter(Boolean)
        .join(": ") || null
    );
  }

  if (error && typeof error === "object") {
    const { code, message, name } = error as {
      code?: unknown;
      message?: unknown;
      name?: unknown;
    };
    return (
      [name, code, message]
        .filter((part) => typeof part === "string" && part.length > 0)
        .join(": ") || null
    );
  }

  return null;
}

function formatTime(date: Date) {
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Plain text for the clipboard or an email: what failed, never what was typed. */
function reportText(error: SubmitErrorReport) {
  const lines = [
    `What failed: ${error.title}`,
    `Message shown: ${error.message}`,
    `Reference: ${error.reference} (${error.kind}${error.status ? `, HTTP ${error.status}` : ""})`,
    error.detail ? `Detail: ${error.detail}` : null,
    typeof window === "undefined" ? null : `Page: ${window.location.pathname}`,
    `Time: ${error.occurredAt.toISOString()}`,
    typeof navigator === "undefined" ? null : `Browser: ${navigator.userAgent}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** The error callout's contents for the nearest `FormShell`, if any. */
function useFormSubmitError() {
  return React.useContext(SubmitErrorContext).error;
}

/** Scroll to and focus the error callout, e.g. from the note by the button. */
function useShowSubmitError() {
  const { calloutRef } = React.useContext(SubmitErrorContext);
  return React.useCallback(() => {
    calloutRef.current?.scrollIntoView?.({
      block: "center",
      behavior: "smooth",
    });
    calloutRef.current?.focus({ preventScroll: true });
  }, [calloutRef]);
}

/**
 * The one way a form on this site submits.
 *
 * - Validation runs first (react-hook-form + the form's zod resolver). A bad
 *   field gets its message beside it and focus; nothing is cleared.
 * - While `onSubmit` runs, every control sits inside a disabled `<fieldset>`,
 *   the form is `aria-busy`, and a second submit is ignored. `SubmitButton`
 *   shows the spinner.
 * - If `onSubmit` throws, the error becomes a callout at the top of the form
 *   saying what went wrong and what to do next (see `describeSubmitError`).
 *   An `ApiError` that names fields also puts those messages on the fields.
 *   The values are never reset on failure: resetting is only ever the submit
 *   handler's own choice, after it succeeds.
 *
 * `className` lays out the fields (it lands on the fieldset); `formClassName`
 * styles the `<form>` box around the callout and the fields.
 */
function FormShell<TFieldValues extends FieldValues>({
  children,
  className,
  disabled = false,
  errorTitle,
  form,
  formClassName,
  onSubmit,
  ...props
}: Omit<
  React.ComponentProps<"form">,
  "onSubmit" | "children" | "method" | "noValidate"
> & {
  children: React.ReactNode;
  /** Disable every control for a reason other than this submit. */
  disabled?: boolean;
  /** Heads errors whose message is already fit to show, e.g. "Sign-in failed". */
  errorTitle?: string;
  form: UseFormReturn<TFieldValues>;
  formClassName?: string;
  onSubmit: (values: TFieldValues) => Promise<unknown> | unknown;
}) {
  const [error, setError] = React.useState<SubmitErrorReport | null>(null);
  const calloutRef = React.useRef<HTMLDivElement>(null);
  const inFlight = React.useRef(false);
  const describe = useDescribeSubmitError();
  const { isSubmitting } = useFormState({ control: form.control });

  const fail = (submitError: unknown) => {
    if (submitError instanceof ApiError) {
      for (const [name, message] of Object.entries(submitError.fieldErrors)) {
        // `get` follows dotted paths ("address.postcode"), and a registered
        // field counts even when its default value was left out.
        const path = name as FieldPath<TFieldValues>;
        if (
          get(form.getValues(), path) !== undefined ||
          form.getFieldState(path).isTouched ||
          form.getFieldState(path).isDirty
        ) {
          form.setError(path, { message, type: "server" });
        }
      }
    }

    const description = describe(submitError, { fallbackTitle: errorTitle });
    // Also record it on the form itself, so `formState.isSubmitSuccessful` is
    // false after a failure and the usual "reset once it succeeded" effect
    // never empties a form that didn't go through. react-hook-form clears
    // `root` errors on the next submit.
    form.setError("root.submit", {
      message: description.message,
      type: description.kind,
    });
    setError({
      ...description,
      detail: technicalDetail(submitError),
      occurredAt: new Date(),
      reference: newReference(),
      status: submitError instanceof ApiError ? submitError.status : null,
    });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (submitError) {
      fail(submitError);
    }
  });

  return (
    <FormProvider {...form}>
      <SubmitErrorContext.Provider value={{ calloutRef, error }}>
        <form
          {...props}
          aria-busy={isSubmitting || undefined}
          className={formClassName}
          // POST, so a submit that beats hydration never writes names, emails
          // or addresses into the URL as a GET query string would. Not
          // overridable: see the props type.
          method="post"
          noValidate
          onSubmit={(event) => {
            // Guard here, before react-hook-form flips `isSubmitting`: a
            // blocked second submit inside handleSubmit would end the first
            // one's busy state while its request is still running.
            if (inFlight.current) {
              event.preventDefault();
              return;
            }

            inFlight.current = true;
            setError(null);
            // A resolver that throws (not a validation failure) would
            // otherwise be an unhandled rejection with no callout.
            handleSubmit(event)
              .catch(fail)
              .finally(() => {
                inFlight.current = false;
              });
          }}
        >
          <FormErrorCallout className="mb-4" />
          <fieldset
            className={cn("m-0 min-w-0 border-0 p-0", className)}
            data-slot="form-fieldset"
            disabled={disabled || isSubmitting}
          >
            {children}
          </fieldset>
          <FormErrorNote className="mt-3" />
        </form>
      </SubmitErrorContext.Provider>
    </FormProvider>
  );
}

/**
 * The failure callout at the top of a `FormShell`. It takes focus and scrolls
 * into view when it appears, so a long form's submit button is never the last
 * thing the person sees.
 */
function FormErrorCallout({ className }: { className?: string }) {
  const error = useFormSubmitError();
  const { calloutRef: ref } = React.useContext(SubmitErrorContext);
  const { supportEmail } = React.useContext(FormErrorsContext);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setCopied(false);

    if (!error || !ref.current) {
      return;
    }

    ref.current.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    ref.current.focus({ preventScroll: true });
  }, [error, ref]);

  if (!error) {
    return null;
  }

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(reportText(error));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // The body carries only what failed and when, never what was typed.
  const mailto = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent(
        `Problem submitting a form (ref ${error.reference})`
      )}&body=${encodeURIComponent(`${reportText(error)}\n\n`)}`
    : null;

  return (
    <Alert
      ref={ref}
      className={cn("outline-none", className)}
      data-kind={error.kind}
      data-slot="form-error-callout"
      tabIndex={-1}
      variant="destructive"
    >
      <AlertCircle aria-hidden="true" className="size-4" />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        {/* A reference and the time make a screenshot or an email traceable. */}
        <p
          className="mt-2 text-xs tabular-nums opacity-80"
          data-slot="form-error-reference"
        >
          Ref {error.reference} · {error.kind}
          {error.status ? ` ${error.status}` : ""} ·{" "}
          {formatTime(error.occurredAt)}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <button
            className="cursor-pointer underline underline-offset-2"
            onClick={() => void copyDetails()}
            type="button"
          >
            {copied ? "Details copied" : "Copy details"}
          </button>
          {mailto ? (
            <a className="underline underline-offset-2" href={mailto}>
              Email support
            </a>
          ) : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * One line under the fields, by the submit button, so a screenshot of the
 * bottom of a long form still shows that it failed and its reference.
 */
function FormErrorNote({ className }: { className?: string }) {
  const error = useFormSubmitError();
  const showError = useShowSubmitError();

  if (!error) {
    return null;
  }

  return (
    <p
      className={cn("text-sm text-destructive", className)}
      data-slot="form-error-note"
    >
      Not sent: {error.title} (ref {error.reference}).{" "}
      <button
        className="cursor-pointer underline underline-offset-2"
        onClick={showError}
        type="button"
      >
        See details
      </button>
    </p>
  );
}

/**
 * The submit button for a `FormShell`: disabled until hydration, then a
 * spinner and `pendingLabel` while the form is submitting.
 */
function SubmitButton({
  children,
  disabled,
  pendingLabel,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "loading" | "loadingText"> & {
  pendingLabel?: React.ReactNode;
}) {
  const { isSubmitting } = useFormState();
  const hydrated = useHydrated();

  return (
    <Button
      // Until hydration the form has no submit handler, so a click would post
      // the page natively and come back with every field empty.
      disabled={!hydrated || disabled}
      loading={isSubmitting}
      loadingText={pendingLabel}
      type="submit"
      {...props}
    >
      {children}
    </Button>
  );
}

export {
  useDescribeSubmitError,
  useFormField,
  FormErrorsProvider,
  useFormSubmitError,
  useShowSubmitError,
  FormShell,
  FormErrorCallout,
  FormErrorNote,
  SubmitButton,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
