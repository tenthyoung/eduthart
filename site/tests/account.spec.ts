import { expect, test } from "@playwright/test";

import { seedAccount, TINY_PNG } from "./support/accounts";

test("redirects unauthenticated visitors away from account settings", async ({ page }) => {
  await page.goto("/account");

  await expect(page).toHaveURL(/\/login\?next=\/account$/);
  await expect(page.getByRole("heading", { name: "Log in to EduthArt" })).toBeVisible();
});

test("opens account settings from the desktop profile controls", async ({ page }) => {
  await seedAccount(page, { uid: "desktop-user" });

  await page.goto("/");
  await page.getByRole("link", { name: "Jordan Collector" }).click();

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
  await page.getByLabel("Location").fill("Brooklyn, New York");
  await page.getByLabel("Biography").fill("Collecting coastal light since 2019.");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByLabel("First name")).toHaveCount(0);

  await page.getByRole("button", { name: "Choose username" }).click();
  await page.getByRole("textbox", { name: "Username" }).fill("@avery-curator");
  await page.getByRole("button", { name: "Save username" }).click();
  await expect(page.getByText("Your username has been updated.")).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Avery Curator" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View your personal art page" })).toHaveAttribute("href", "/artists/avery-curator");
  await expect(page.getByText("Brooklyn, New York").first()).toBeVisible();
  await expect(page.getByText("Collecting coastal light since 2019.")).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(page.getByLabel("First name")).toHaveValue("Avery");
  await expect(page.getByLabel("Last name")).toHaveValue("Curator");
});

test("shows a navbar link to the personal art page using the chosen username", async ({ page }) => {
  await seedAccount(page, {
    uid: "artist-link-user",
    displayName: "Maya Studio",
    username: "maya-studio",
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "@maya-studio" })).toHaveAttribute("href", "/artists/maya-studio");

  await page.getByRole("link", { name: "@maya-studio" }).click();
  await expect(page).toHaveURL(/\/artists\/maya-studio$/);
  await expect(page.getByRole("heading", { name: "Maya Studio" })).toBeVisible();
  await expect(page.getByText("Personal art page URL:")).toBeVisible();
});

test("crops, uploads, and removes a profile banner from account settings", async ({ page }) => {
  await seedAccount(page, { uid: "banner-user" });

  await page.goto("/account");
  await expect(page.getByText("No banner uploaded yet.")).toBeVisible();

  await page.getByLabel("Upload profile banner").setInputFiles({
    mimeType: "image/png",
    name: "banner.png",
    buffer: TINY_PNG,
  });

  await expect(page.getByRole("heading", { name: "Position your banner" })).toBeVisible();
  await expect(page.getByText("Banners are saved at 1500 × 500 pixels (3:1).").last()).toBeVisible();
  await page.getByRole("button", { name: "Save banner" }).click();

  await expect(page.getByText("Your profile banner has been updated.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Jordan Collector banner", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Remove banner" }).click();
  await expect(page.getByText("Your profile banner has been removed.")).toBeVisible();
  await expect(page.getByText("No banner uploaded yet.")).toBeVisible();
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

  await expect(page.getByText("This account signs in with Google, so there is no EduthArt password to change or reset.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send password reset email" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Change password" })).toHaveCount(0);
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
