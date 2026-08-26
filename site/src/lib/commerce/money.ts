export const DEFAULT_CURRENCY = "USD";

/** Currencies EduthArt prices in that have no minor unit. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function normalizeCurrency(currency?: string | null) {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized)
    ? normalized
    : DEFAULT_CURRENCY;
}

export function getCurrencyExponent(currency: string) {
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrency(currency)) ? 0 : 2;
}

/** Convert a listing's decimal price string into the minor units Stripe expects. */
export function toMinorUnits(amount: number | string, currency: string) {
  const value = typeof amount === "number" ? amount : Number(amount);

  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value * 10 ** getCurrencyExponent(currency));
}

export function fromMinorUnits(amount: number, currency: string) {
  return amount / 10 ** getCurrencyExponent(currency);
}

export function formatMinorUnits(amount: number, currency: string) {
  const normalized = normalizeCurrency(currency);

  return new Intl.NumberFormat("en-US", {
    currency: normalized,
    style: "currency",
  }).format(fromMinorUnits(amount, normalized));
}

export function formatAmount(amount: number | string, currency: string) {
  const normalized = normalizeCurrency(currency);
  const value = typeof amount === "number" ? amount : Number(amount);

  return new Intl.NumberFormat("en-US", {
    currency: normalized,
    style: "currency",
  }).format(Number.isFinite(value) ? value : 0);
}
