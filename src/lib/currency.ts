// Locale used to format CRM deal values. The app is BRL-first (Brazilian
// CRM use), so default to pt-BR; other currencies still format sensibly under it.
const LOCALE = "pt-BR";

/** Coerce a card value (Laravel serializes decimals as strings) to a number. */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Format a monetary amount in the board's currency, e.g. "R$ 12.000,00". */
export function formatMoney(
  value: number | string | null | undefined,
  currency = "BRL",
): string {
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
    }).format(toNumber(value));
  } catch {
    // Unknown currency code — fall back to a plain number with the code prefixed.
    return `${currency} ${toNumber(value).toFixed(2)}`;
  }
}

/** Compact form for column/board totals, e.g. "R$ 56,75 mil" or "R$ 1,2 mi". */
export function formatMoneyCompact(
  value: number | string | null | undefined,
  currency = "BRL",
): string {
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(toNumber(value));
  } catch {
    return `${currency} ${toNumber(value).toFixed(0)}`;
  }
}

/**
 * Real-time input mask for the deal-value field. Cents fill from the right (like a
 * calculator): "1" → "0,01", "1234567" → "12.345,67". Grouped with pt-BR separators
 * to match how values render everywhere else via formatMoney. Returns "" when empty.
 */
export function maskMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.parseInt(digits, 10) / 100);
}

/** Parse a masked deal-value string back to a number for saving. "" → null. */
export function parseMoneyInput(display: string): number | null {
  const digits = display.replace(/\D/g, "");
  if (digits === "") return null;
  return Number.parseInt(digits, 10) / 100;
}

/** Seed the masked input from a stored card value (number or Laravel string). */
export function formatMoneyInput(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

/** The board currency's symbol (e.g. "R$", "$"), for the input prefix. */
export function currencySymbol(currency = "BRL"): string {
  try {
    return (
      new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

/** ISO 4217 codes offered in the board currency picker. */
export const CURRENCIES: { code: string; label: string }[] = [
  { code: "BRL", label: "R$ Real (BRL)" },
  { code: "USD", label: "$ US Dollar (USD)" },
  { code: "EUR", label: "€ Euro (EUR)" },
  { code: "GBP", label: "£ Pound (GBP)" },
];
