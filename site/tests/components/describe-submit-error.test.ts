import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, readApiError } from "@/lib/api/api-error";
import {
  SubmitError,
  describeSubmitError,
} from "@/lib/forms/describe-submit-error";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("describeSubmitError", () => {
  it("tells a signed-out person to sign in again", () => {
    const result = describeSubmitError(
      new ApiError({ message: "Unauthorized", status: 401 })
    );
    expect(result.kind).toBe("session");
    expect(result.message).toContain("Sign in again");
  });

  it("asks the person to wait after too many attempts", () => {
    const result = describeSubmitError(
      new ApiError({ message: "Slow down", status: 429 })
    );
    expect(result.kind).toBe("rate-limit");
    expect(result.message).toContain("Wait a minute");
  });

  it("passes on a 4xx message from the API with what to do next", () => {
    const result = describeSubmitError(
      new ApiError({ message: "Postal code is not valid.", status: 400 })
    );
    expect(result.kind).toBe("invalid");
    expect(result.message).toBe(
      "Postal code is not valid. Fix that and submit again."
    );
  });

  it("adds the full stop a route message left off", () => {
    const result = describeSubmitError(
      new ApiError({
        message: "Please provide a valid email address",
        status: 400,
      })
    );
    expect(result.message).toBe(
      "Please provide a valid email address. Fix that and submit again."
    );
  });

  it("does not blame the person for a response that was not JSON", async () => {
    const error = await readApiError(
      new Response("<html>Bad gateway</html>", { status: 502 })
    );
    const result = describeSubmitError(error, {
      serviceName: "EduthArt",
      supportEmail: "support@eduthart.com",
    });
    expect(result.kind).toBe("server");
    expect(result.title).toBe("EduthArt had a problem on its side");
    expect(result.message).toContain("support@eduthart.com");
  });

  it("reads the older { error: string } shape", async () => {
    const error = await readApiError(
      Response.json({ error: "Message is required" }, { status: 400 })
    );
    expect(error.message).toBe("Message is required");
    expect(error.status).toBe(400);
  });

  it("uses a SubmitError's own title", () => {
    const result = describeSubmitError(
      new SubmitError("That code was not accepted.", {
        title: "Code not accepted",
      })
    );
    expect(result).toEqual({
      kind: "rejected",
      message: "That code was not accepted.",
      title: "Code not accepted",
    });
  });

  it("says the person is offline before anything else", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const result = describeSubmitError(
      new ApiError({ message: "x", status: 500 })
    );
    expect(result.kind).toBe("offline");
  });

  it("names no service and no inbox when none is configured", () => {
    const result = describeSubmitError(new TypeError("Failed to fetch"));
    expect(result.title).toBe("We couldn't reach the server");
    expect(
      describeSubmitError(new ApiError({ message: "x", status: 500 })).message
    ).not.toContain("email");
  });

  it("treats Firebase's network failure as a network failure", () => {
    const error = Object.assign(
      new Error("Firebase: Error (auth/network-request-failed)."),
      { code: "auth/network-request-failed" }
    );
    expect(describeSubmitError(error).kind).toBe("network");
  });

  it("recognises a timeout", () => {
    const error = new DOMException("The operation was aborted.", "AbortError");
    expect(describeSubmitError(error).kind).toBe("timeout");
  });
});
