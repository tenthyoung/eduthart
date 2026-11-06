import { expect, test, type Page } from "@playwright/test";

import { seedAccount } from "./support/accounts";

/**
 * The "Help me choose" form, as a buyer fills it in.
 *
 * What the request does on the server is covered in
 * tests/integration/advisory.test.ts. This checks the page: that it can be
 * reached, that a failure keeps every answer, and that success says so.
 */

async function fillBrief(page: Page, email = "robin@example.com") {
  await page.getByLabel("Budget").selectOption("1000-5000");
  await page.getByLabel("Where will it hang?").selectOption("living-room");
  await page.getByLabel("Size").selectOption("large");
  await page.getByLabel("Timeline").selectOption("quarter");
  await page
    .getByLabel("Style you are drawn to")
    .fill("Quiet abstracts with texture");
  await page.getByLabel(/Anything else/).fill("Pale grey walls.");
  await page.getByLabel("Your name").fill("Robin Hart");
  await page.getByLabel("Email for the reply").fill(email);
}

async function expectBriefKept(page: Page, email: string) {
  await expect(page.getByLabel("Budget")).toHaveValue("1000-5000");
  await expect(page.getByLabel("Where will it hang?")).toHaveValue(
    "living-room"
  );
  await expect(page.getByLabel("Size")).toHaveValue("large");
  await expect(page.getByLabel("Timeline")).toHaveValue("quarter");
  await expect(page.getByLabel("Style you are drawn to")).toHaveValue(
    "Quiet abstracts with texture"
  );
  await expect(page.getByLabel(/Anything else/)).toHaveValue(
    "Pale grey walls."
  );
  await expect(page.getByLabel("Your name")).toHaveValue("Robin Hart");
  await expect(page.getByLabel("Email for the reply")).toHaveValue(email);
}

test("the services page leads to the advisory form", async ({ page }) => {
  await page.goto("/services");
  await page.getByRole("link", { name: "Help Me Choose" }).click();

  await expect(page).toHaveURL(/\/advisory$/);
  await expect(
    page.getByRole("heading", { name: "Help me choose", level: 1 })
  ).toBeVisible();
});

test("a buyer sends a brief and is told it arrived", async ({ page }) => {
  await page.goto("/advisory");
  await fillBrief(page);
  await page.getByRole("button", { name: "Ask a curator" }).click();

  await expect(
    page.getByText("Thank you. Your request is with our curators.")
  ).toBeVisible();
  await expect(page.getByText("robin@example.com")).toBeVisible();
});

test("a rejected email keeps every answer and points at the field", async ({
  page,
}) => {
  await page.goto("/advisory");
  await fillBrief(page, "robin@example");
  await page.getByRole("button", { name: "Ask a curator" }).click();

  await expect(
    page.getByText("Enter an email address we can reply to.")
  ).toBeVisible();
  await expect(page.getByLabel("Email for the reply")).toHaveAttribute(
    "aria-invalid",
    "true"
  );
  await expectBriefKept(page, "robin@example");
  expect(page.url()).not.toContain("robin");
});

test("a server failure keeps every answer", async ({ page }) => {
  await page.route("**/api/advisory", (route) =>
    route.fulfill({
      body: JSON.stringify({
        error: { code: "internal", message: "Something broke on our side." },
      }),
      contentType: "application/json",
      status: 500,
    })
  );

  await page.goto("/advisory");
  await fillBrief(page);
  await page.getByRole("button", { name: "Ask a curator" }).click();

  await expect(page.getByText("Something broke on our side.")).toBeVisible();
  await expectBriefKept(page, "robin@example.com");
});

test("a dropped connection keeps every answer", async ({ page }) => {
  await page.route("**/api/advisory", (route) => route.abort("failed"));

  await page.goto("/advisory");
  await fillBrief(page);
  await page.getByRole("button", { name: "Ask a curator" }).click();

  await expect(page.getByText(/your answers are still here/)).toBeVisible();
  await expectBriefKept(page, "robin@example.com");
});

test("a signed-in buyer has their name and email filled in", async ({
  page,
}) => {
  await seedAccount(page, {
    displayName: "Robin Signedin",
    email: "robin-signedin@example.com",
    uid: "collector-advisory-signed-in",
  });

  await page.goto("/advisory");

  await expect(page.getByLabel("Your name")).toHaveValue("Robin Signedin");
  await expect(page.getByLabel("Email for the reply")).toHaveValue(
    "robin-signedin@example.com"
  );
  await expect(
    page.getByText("We'll see the works you've saved")
  ).toBeVisible();
});
