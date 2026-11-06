import { expect, test } from "@playwright/test";

import {
  addAddress,
  createAccount,
  seedAccount,
  seedPublishedArtwork,
  signInAs,
} from "./support/accounts";

/**
 * An artist checks what they sold and what they earned (EDUTHA-99).
 *
 * The integration suite covers the arithmetic and the scoping; this walks the
 * page an artist actually opens from their workspace after a sale.
 */
test("shows an artist their sale, their 67% share, and what to ship", async ({
  page,
}) => {
  const artist = await createAccount(page, {
    displayName: "Marina Vale",
    uid: "artist-sales-page",
    username: "marina-sales-page",
  });
  const artwork = await seedPublishedArtwork(page, {
    price: "2400",
    uid: artist.uid,
  });

  await seedAccount(page, {
    displayName: "Robin Buyer",
    email: "robin.sales-page@example.com",
    uid: "collector-sales-page",
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
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Artwork added to your cart.")).toBeVisible();
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay with Stripe" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you for your purchase" })
  ).toBeVisible();

  await signInAs(page, artist);
  await page.goto("/artists/marina-sales-page/listings/new");
  await page.getByRole("link", { name: "Orders & Payouts" }).first().click();
  await expect(page).toHaveURL(/\/artists\/marina-sales-page\/sales$/);

  await expect(
    page.getByRole("heading", { name: "Orders & payouts" })
  ).toBeVisible();
  // $2,400 artwork: EduthArt keeps $792, the artist keeps $1,608.
  await expect(page.getByText("$1,608.00").first()).toBeVisible();
  await expect(page.getByText("$792.00").first()).toBeVisible();

  const sale = page.getByTestId("sale-row");
  await expect(sale).toHaveCount(1);
  await expect(sale.getByText("Harbour Light")).toBeVisible();
  await expect(sale.getByText("to Robin Buyer")).toBeVisible();
  await expect(sale.getByText("Not scheduled yet")).toBeVisible();

  // The filter narrows the list, and an empty stage says so.
  await page.getByRole("button", { name: /^Delivered/ }).click();
  await expect(page.getByTestId("sale-row")).toHaveCount(0);
  await expect(
    page.getByText("No sales are delivered right now.")
  ).toBeVisible();
  await page.getByRole("button", { name: /^All/ }).click();
  await expect(page.getByTestId("sale-row")).toHaveCount(1);

  await sale.getByRole("link", { name: "View order" }).click();
  await expect(
    page.getByText("You are the seller on this order")
  ).toBeVisible();
});
