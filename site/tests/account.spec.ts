import { expect, test, type Page } from "@playwright/test";

const E2E_STORAGE_KEY = "eduthart:e2e-user";

type TestAccountOptions = {
  authProviders?: string[];
  displayName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string | null;
  uid: string;
};

async function seedAccount(page: Page, options: TestAccountOptions) {
  const displayName = options.displayName ?? "Jordan Collector";
  const defaultNameParts = displayName.trim().split(/\s+/);
  const defaultFirstName = defaultNameParts[0] ?? "Jordan";
  const defaultLastName = defaultNameParts.slice(1).join(" ") || "Collector";
  const profilePayload = {
    authProviders: options.authProviders ?? ["password"],
    displayName,
    email: options.email ?? `${options.uid}@example.com`,
    firstName: options.firstName ?? defaultFirstName,
    lastName: options.lastName ?? defaultLastName,
    photoURL: options.photoURL ?? null,
    uid: options.uid,
  };

  const response = await page.request.post("/api/test/e2e-auth", {
    data: profilePayload,
  });
  expect(response.ok()).toBeTruthy();

  await page.goto("/");
  await page.evaluate(
    ({ storageKey, user }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(user));
    },
    {
      storageKey: E2E_STORAGE_KEY,
      user: {
        displayName: profilePayload.displayName,
        email: profilePayload.email,
        photoURL: profilePayload.photoURL,
        providerIds: profilePayload.authProviders,
        uid: profilePayload.uid,
      },
    },
  );
}

test("redirects unauthenticated visitors away from account settings", async ({ page }) => {
  await page.goto("/account");

  await expect(page).toHaveURL(/\/login\?next=\/account$/);
  await expect(page.getByRole("heading", { name: "Log in to EduthArt" })).toBeVisible();
});

test("opens account settings from the desktop profile controls", async ({ page }) => {
  await seedAccount(page, { uid: "desktop-user" });

  await page.goto("/");
  await page.getByRole("link", { name: "Account" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Jordan Collector" })).toBeVisible();
  await expect(page.getByText("Sign-in method")).toBeVisible();
});

test("opens account settings from the mobile menu profile entry", async ({ page }) => {
  await seedAccount(page, { uid: "mobile-user", displayName: "Mobile Collector" });
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");
  await page.getByRole("button", { name: /open menu/i }).click();
  await page.getByRole("link", { name: /account settings/i }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Mobile Collector" })).toBeVisible();
});

test("persists profile edits across a fresh visit", async ({ page }) => {
  await seedAccount(page, { uid: "edit-user" });

  await page.goto("/account");
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.getByLabel("First name").fill("Avery");
  await page.getByLabel("Last name").fill("Curator");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByLabel("First name")).toHaveCount(0);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Avery Curator" })).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(page.getByLabel("First name")).toHaveValue("Avery");
  await expect(page.getByLabel("Last name")).toHaveValue("Curator");
});

test("sends a password reset action for password users", async ({ page }) => {
  await seedAccount(page, { uid: "password-user", email: "password.user@example.com" });

  await page.goto("/account");
  await page.getByRole("button", { name: "Send password reset email" }).click();

  await expect(page.getByText("A password reset link has been sent to password.user@example.com.")).toBeVisible();
});

test("shows provider-aware security messaging for google-only users", async ({ page }) => {
  await seedAccount(page, {
    uid: "google-user",
    authProviders: ["google.com"],
    displayName: "Google Collector",
  });

  await page.goto("/account");

  await expect(page.getByText("This account signs in with Google, so there is no EduthArt password reset to send.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send password reset email" })).toHaveCount(0);
});

test("updates the account email from account settings and persists it across reload", async ({ page }) => {
  await seedAccount(page, { uid: "email-user", email: "old.address@example.com" });

  await page.goto("/account");
  await page.getByRole("button", { name: "Change email address" }).click();
  await page.getByLabel("New email address").fill("new.address@example.com");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Your email address has been updated.")).toBeVisible();
  await expect(page.getByLabel("New email address")).toHaveCount(0);
  await expect(page.getByText("new.address@example.com")).toHaveCount(2);

  await page.reload();

  await page.getByRole("button", { name: "Change email address" }).click();
  await expect(page.getByText("new.address@example.com")).toHaveCount(2);
  await expect(page.getByLabel("New email address")).toHaveValue("new.address@example.com");
});

test("deletes the account after explicit confirmation and blocks account access afterward", async ({ page }) => {
  await seedAccount(page, { uid: "delete-user", displayName: "Delete Me" });

  await page.goto("/account");
  await page.getByLabel("Confirmation text").fill("DELETE");
  await page.getByRole("button", { name: "Delete account permanently" }).click();

  await expect(page).toHaveURL("http://127.0.0.1:3005/");
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=\/account$/);
});
