export function formatCurrencyFromMicros(micros: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: micros / 1_000_000 >= 10 ? 2 : 4,
    maximumFractionDigits: micros / 1_000_000 >= 10 ? 2 : 4,
  }).format(micros / 1_000_000);
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) {
    return "Unknown";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
