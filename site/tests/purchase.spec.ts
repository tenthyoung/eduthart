import { expect, test } from "@playwright/test";

import {
  addAddress,
  createAccount,
  seedAccount,
  seedPublishedArtwork,
  signInAs,
} from "./support/accounts";

/**
 * The full buying journey.
 *
 * The card charge is the only step the E2E build stands in for; the order,
 * reservation, fulfilment, and notification paths are the production ones.
 */
test("buys an original from the artwork page through to the invoice", async ({
  page,
}) => {
  const artist = await createAccount(page, {
    displayName: "Marina Vale",
    uid: "artist-purchase",
    username: "marina-purchase",
  });
  const artwork = await seedPublishedArtwork(page, {
    price: "2400",
    uid: artist.uid,
  });
  const collector = await seedAccount(page, {
    displayName: "Robin Buyer",
    email: "robin.buyer@example.com",
    uid: "collector-purchase",
  });

  await page.goto("/account/addresses");
  await addAddress(page, {
    city: "Brooklyn",
    line1: "18 Harbour Road",
    name: "Robin Buyer",
    postalCode: "11201",
    region: "NY",
  });

  await page.goto(artwork.href);
  await expect(page.getByText("Original available")).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Artwork added to your cart.")).toBeVisible();

  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", { name: "Review your order" })
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: /18 Harbour Road/ })
  ).toBeAttached();
  await page.getByRole("button", { name: "Pay with Stripe" }).click();

  await expect(
    page.getByRole("heading", { name: "Thank you for your purchase" })
  ).toBeVisible();
  await expect(page.getByText("$2,450.00")).toBeVisible();

  await page.getByRole("link", { name: "View your order" }).click();
  await expect(page.getByText("Robin Buyer")).toBeVisible();
  await expect(page.getByText("paid").first()).toBeVisible();

  await page.goto("/account/orders");
  await expect(page.getByText("sold by Marina Vale")).toBeVisible();

  // The buyer is told their order is confirmed.
  await page.goto("/notifications");
  await expect(
    page.getByRole("heading", { name: "Your order is confirmed" })
  ).toBeVisible();

  // The original is off the market for everyone else.
  await page.goto(artwork.href);
  await expect(
    page.getByRole("button", { name: "Currently unavailable" })
  ).toBeVisible();

  // And the artist hears about the sale.
  await signInAs(page, artist);
  await page.goto("/notifications");
  await expect(
    page.getByRole("heading", { name: '"Harbour Light" sold' })
  ).toBeVisible();

  // The artist can open the same order to see where to ship it.
  await page.getByRole("link", { name: "View the order" }).click();
  await expect(
    page.getByText("You are the seller on this order")
  ).toBeVisible();
  await expect(page.getByText("18 Harbour Road")).toBeVisible();

  expect(collector.uid).toBe("collector-purchase");
});

test("bills the card to the shipping address when the collector asks it to", async ({
  page,
}) => {
  const artist = await createAccount(page, {
    displayName: "Marina Vale",
    uid: "artist-billing-match",
    username: "marina-billing-match",
  });
  const artwork = await seedPublishedArtwork(page, { uid: artist.uid });
  const collector = await seedAccount(page, {
    displayName: "Robin Buyer",
    uid: "collector-billing-match",
  });

  await page.goto("/account/addresses");
  await addAddress(page, {
    city: "Brooklyn",
    line1: "18 Harbour Road",
    name: "Robin Buyer",
    postalCode: "11201",
    region: "NY",
  });
  await addAddress(page, {
    city: "Albany",
    kind: "billing",
    line1: "9 Ledger Street",
    name: "Robin Buyer",
    postalCode: "12207",
    region: "NY",
  });

  await page.goto(artwork.href);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/checkout");

  // A saved billing address is used as-is until the collector says otherwise.
  await expect(page.getByLabel("Bill to")).toBeVisible();

  await page
    .getByLabel("My billing address is the same as my shipping address")
    .check();
  await expect(page.getByLabel("Bill to")).toBeHidden();

  await page.getByRole("button", { name: "Pay with Stripe" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you for your purchase" })
  ).toBeVisible();

  // Which address ends up on the paperwork is covered in the integration suite;
  // what matters here is that the checkbox is what decides it.
  await page.getByRole("link", { name: "View your order" }).click();
  await expect(page.getByText("18 Harbour Road")).toBeVisible();
  await expect(page.getByText("9 Ledger Street")).toHaveCount(0);
  expect(collector.uid).toBe("collector-billing-match");
});

test("refuses to check out without a shipping address", async ({ page }) => {
  const artist = await createAccount(page, {
    displayName: "Marina Vale",
    uid: "artist-no-address",
    username: "marina-no-address",
  });
  const artwork = await seedPublishedArtwork(page, { uid: artist.uid });
  await seedAccount(page, { uid: "collector-no-address" });

  await page.goto(artwork.href);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/checkout");

  await expect(page.getByText("Add a shipping address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pay with Stripe" })
  ).toBeDisabled();
});
