import { zodResolver } from "@hookform/resolvers/zod";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormShell,
  SubmitButton,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requestJson } from "@/lib/api/api-error";

const schema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
});

type Values = z.infer<typeof schema>;

function TestForm({
  onSubmit,
}: {
  onSubmit: (values: Values) => Promise<unknown>;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  });

  return (
    <FormShell
      aria-label="Test form"
      className="space-y-4"
      errorTitle="Sending failed"
      form={form}
      onSubmit={onSubmit}
    >
      {(["name", "email"] as const).map((name) => (
        <FormField
          key={name}
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{name === "name" ? "Name" : "Email"}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <SubmitButton pendingLabel="Sending...">Send</SubmitButton>
    </FormShell>
  );
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function fillIn(name: string, email: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), name);
  await user.type(screen.getByLabelText("Email"), email);
  return user;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FormShell validation", () => {
  it("shows a message beside the bad field and keeps every value", async () => {
    const onSubmit = vi.fn(async () => {});
    render(<TestForm onSubmit={onSubmit} />);

    const user = await fillIn("Jordan Avery", "jordan@");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Please enter a valid email address")
    ).toBeTruthy();
    expect(screen.queryByText("Full name is required")).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe(
      "Jordan Avery"
    );
    expect(screen.getByLabelText<HTMLInputElement>("Email").value).toBe(
      "jordan@"
    );
    expect(
      screen.getByLabelText("Email").getAttribute("aria-invalid")
    ).toBe("true");
  });
});

describe("FormShell while submitting", () => {
  it("disables every control, shows the spinner label and ignores a second submit", async () => {
    const pending = deferred();
    const onSubmit = vi.fn(() => pending.promise);
    render(<TestForm onSubmit={onSubmit} />);

    const user = await fillIn("Jordan Avery", "jordan@example.com");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const button = await screen.findByRole("button", { name: "Sending..." });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.matches(":disabled")).toBe(true);
    expect(screen.getByLabelText("Name").matches(":disabled")).toBe(true);
    expect(screen.getByLabelText("Email").matches(":disabled")).toBe(true);
    expect(
      screen.getByRole("form", { name: "Test form" }).getAttribute("aria-busy")
    ).toBe("true");

    // Enter in a field, or a script, can still fire submit on the form.
    fireEvent.submit(screen.getByRole("form", { name: "Test form" }));
    await act(async () => {});
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });

    expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
    expect(screen.getByLabelText("Name").matches(":disabled")).toBe(false);
  });
});

describe("FormShell on an API or network failure", () => {
  it("shows a specific callout for a server error and keeps every value", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { message: "Database unavailable." } },
          { status: 503 }
        )
      )
    );
    render(
      <TestForm
        onSubmit={(values) =>
          requestJson("/api/contact", { method: "POST", body: values })
        }
      />
    );

    const user = await fillIn("Jordan Avery", "jordan@example.com");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const callout = await screen.findByRole("alert");
    expect(callout.textContent).toContain("EduthArt had a problem on our side");
    expect(callout.textContent).toContain("Try again in a minute");
    expect(callout.textContent).not.toMatch(/something went wrong/i);
    expect(screen.getByLabelText<HTMLInputElement>("Name").value).toBe(
      "Jordan Avery"
    );
    expect(screen.getByLabelText<HTMLInputElement>("Email").value).toBe(
      "jordan@example.com"
    );
    expect(screen.getByLabelText("Name").matches(":disabled")).toBe(false);
  });

  it("says the request never arrived when the network drops", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    render(
      <TestForm
        onSubmit={(values) =>
          requestJson("/api/contact", { method: "POST", body: values })
        }
      />
    );

    const user = await fillIn("Jordan Avery", "jordan@example.com");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const callout = await screen.findByRole("alert");
    expect(callout.textContent).toContain("We couldn't reach EduthArt");
    expect(callout.textContent).toContain("Check your connection");
    expect(screen.getByLabelText<HTMLInputElement>("Email").value).toBe(
      "jordan@example.com"
    );
  });

  it("puts a field the API rejected beside that field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              message: "That email is already on the list.",
              fields: { email: "That email is already on the list." },
            },
          },
          { status: 422 }
        )
      )
    );
    render(
      <TestForm
        onSubmit={(values) =>
          requestJson("/api/contact", { method: "POST", body: values })
        }
      />
    );

    const user = await fillIn("Jordan Avery", "jordan@example.com");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const callout = await screen.findByRole("alert");
    expect(callout.textContent).toContain("Please check the form");
    expect(
      screen.getByLabelText("Email").getAttribute("aria-invalid")
    ).toBe("true");
    expect(
      screen.getAllByText("That email is already on the list.").length
    ).toBeGreaterThan(0);
  });

  it("uses the form's own title for a message that is already fit to show", async () => {
    render(
      <TestForm
        onSubmit={async () => {
          throw new Error("That email and password combination is not correct.");
        }}
      />
    );

    const user = await fillIn("Jordan Avery", "jordan@example.com");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const callout = await screen.findByRole("alert");
    expect(callout.textContent).toContain("Sending failed");
    expect(callout.textContent).toContain(
      "That email and password combination is not correct."
    );
  });

  it("clears the callout when the person submits again", async () => {
    const onSubmit = vi
      .fn<(values: Values) => Promise<void>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce();
    render(<TestForm onSubmit={onSubmit} />);

    const user = await fillIn("Jordan Avery", "jordan@example.com");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Send" }));
    await act(async () => {});
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
