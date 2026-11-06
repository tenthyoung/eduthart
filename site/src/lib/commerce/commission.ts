/**
 * EduthArt's cut of a sale.
 *
 * Agreed with Jong on 2026-07-24 (see `docs/marketplace-commerce.md`): the
 * platform keeps 33% of the artwork price and the artist keeps 67%. Expressed
 * in basis points because that is what a Stripe Connect application fee takes,
 * so the same constant can feed it once Connect is built (EDUTHA-93).
 *
 * Shipping is deliberately left out. Whether an artist's shipping cost comes
 * out of their share or is passed through to them is still undecided, so
 * nothing here should be read as settling it.
 */
export const PLATFORM_COMMISSION_BASIS_POINTS = 3300;

export const PLATFORM_COMMISSION_PERCENT =
  PLATFORM_COMMISSION_BASIS_POINTS / 100;

export type SaleSplit = {
  artistShareMinor: number;
  platformFeeMinor: number;
};

/**
 * Split an artwork price, in minor units, into the platform fee and the
 * artist's share.
 *
 * The fee is rounded to the nearest minor unit and the artist's share is
 * whatever is left, so the two always add back up to the price exactly.
 */
export function splitSale(artworkMinor: number): SaleSplit {
  const amount = Number.isFinite(artworkMinor)
    ? Math.max(0, Math.round(artworkMinor))
    : 0;
  const platformFeeMinor = Math.round(
    (amount * PLATFORM_COMMISSION_BASIS_POINTS) / 10_000
  );

  return {
    artistShareMinor: amount - platformFeeMinor,
    platformFeeMinor,
  };
}
