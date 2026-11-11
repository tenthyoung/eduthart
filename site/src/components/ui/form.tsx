"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import { AlertCircle } from "lucide-react";
import {
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
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

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

type SubmitErrorContextValue = {
  error: SubmitErrorDescription | null;
};

const SubmitErrorContext = React.createContext<SubmitErrorContextValue>({
  error: null,
});

/** The error callout's contents for the nearest `FormShell`, if any. */
function useFormSubmitError() {
  return React.useContext(SubmitErrorContext).error;
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
}: Omit<React.ComponentProps<"form">, "onSubmit" | "children"> & {
  children: React.ReactNode;
  /** Disable every control for a reason other than this submit. */
  disabled?: boolean;
  /** Heads errors whose message is already fit to show, e.g. "Sign-in failed". */
  errorTitle?: string;
  form: UseFormReturn<TFieldValues>;
  formClassName?: string;
  onSubmit: (values: TFieldValues) => Promise<unknown> | unknown;
}) {
  const [error, setError] = React.useState<SubmitErrorDescription | null>(null);
  const inFlight = React.useRef(false);
  const describe = useDescribeSubmitError();
  const { isSubmitting } = useFormState({ control: form.control });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (inFlight.current) {
      return;
    }

    inFlight.current = true;

    try {
      await onSubmit(values);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        const known = form.getValues() as Record<string, unknown>;

        for (const [name, message] of Object.entries(submitError.fieldErrors)) {
          if (name in known) {
            form.setError(name as FieldPath<TFieldValues>, {
              message,
              type: "server",
            });
          }
        }
      }

      setError(describe(submitError, { fallbackTitle: errorTitle }));
    } finally {
      inFlight.current = false;
    }
  });

  return (
    <FormProvider {...form}>
      <SubmitErrorContext.Provider value={{ error }}>
        <form
          aria-busy={isSubmitting || undefined}
          className={formClassName}
          // POST, so a submit that beats hydration never writes names, emails
          // or addresses into the URL as a GET query string would.
          method="post"
          noValidate
          onSubmit={(event) => {
            setError(null);
            void handleSubmit(event);
          }}
          {...props}
        >
          <FormErrorCallout className="mb-4" />
          <fieldset
            className={cn("m-0 min-w-0 border-0 p-0", className)}
            data-slot="form-fieldset"
            disabled={disabled || isSubmitting}
          >
            {children}
          </fieldset>
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
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!error || !ref.current) {
      return;
    }

    ref.current.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    ref.current.focus({ preventScroll: true });
  }, [error]);

  if (!error) {
    return null;
  }

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
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}

/**
 * The submit button for a `FormShell`: a spinner and `pendingLabel` while the
 * form is submitting.
 */
function SubmitButton({
  children,
  pendingLabel,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "loading" | "loadingText"> & {
  pendingLabel?: React.ReactNode;
}) {
  const { isSubmitting } = useFormState();

  return (
    <Button
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
  FormShell,
  FormErrorCallout,
  SubmitButton,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
