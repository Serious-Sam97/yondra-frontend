// Input masks for user-facing profile/auth fields (YON-116, YON-114).

/** Max length for a person's display name — also enforced on the input. */
export const NAME_MAX = 50;

/** Max digits for a WhatsApp/phone national number (excludes the country code). */
export const PHONE_MAX = 15;

/**
 * Keep only what belongs in a human name: letters (any language, incl. accents),
 * spaces, and the joiners real names use — hyphen, apostrophe, period. Strips
 * digits and other symbols so "Gabriel @-123" can't be entered. Also trims to
 * NAME_MAX so the field can't overflow the layout.
 */
export function maskName(value: string): string {
  return value.replace(/[^\p{L}\p{M}\s'’.-]/gu, "").slice(0, NAME_MAX);
}

/** Digits only, capped — for phone number entry. */
export function maskPhone(value: string): string {
  return value.replace(/\D+/g, "").slice(0, PHONE_MAX);
}

/** A dialling code option for the international selector. */
export interface CountryCode {
  code: string; // digits only, e.g. "55"
  label: string; // display, e.g. "🇧🇷 +55"
}

/**
 * Common dialling codes, Brazil first (the primary market). Longer codes are
 * listed so splitPhone can prefix-match a stored number back onto a selection.
 */
export const COUNTRY_CODES: CountryCode[] = [
  { code: "55", label: "🇧🇷 +55" },
  { code: "1", label: "🇺🇸 +1" },
  { code: "351", label: "🇵🇹 +351" },
  { code: "44", label: "🇬🇧 +44" },
  { code: "34", label: "🇪🇸 +34" },
  { code: "33", label: "🇫🇷 +33" },
  { code: "49", label: "🇩🇪 +49" },
  { code: "39", label: "🇮🇹 +39" },
  { code: "52", label: "🇲🇽 +52" },
  { code: "54", label: "🇦🇷 +54" },
  { code: "56", label: "🇨🇱 +56" },
  { code: "57", label: "🇨🇴 +57" },
  { code: "91", label: "🇮🇳 +91" },
  { code: "61", label: "🇦🇺 +61" },
  { code: "81", label: "🇯🇵 +81" },
  { code: "27", label: "🇿🇦 +27" },
  { code: "971", label: "🇦🇪 +971" },
];

/** Default dialling code (Brazil). */
export const DEFAULT_COUNTRY = "55";

/**
 * Split a stored E.164-ish digit string (e.g. "5511987654321") back into a
 * [countryCode, nationalNumber] pair by longest-prefix match against the known
 * codes. Falls back to the default country with the whole value as the number.
 */
export function splitPhone(stored: string): [string, string] {
  const digits = (stored ?? "").replace(/\D+/g, "");
  if (!digits) return [DEFAULT_COUNTRY, ""];

  const byLongest = [...COUNTRY_CODES].sort(
    (a, b) => b.code.length - a.code.length,
  );
  for (const { code } of byLongest) {
    if (digits.startsWith(code) && digits.length > code.length) {
      return [code, digits.slice(code.length)];
    }
  }
  return [DEFAULT_COUNTRY, digits];
}

/** Combine a country code + national number into the stored digit string. */
export function joinPhone(country: string, number: string): string {
  const n = number.replace(/\D+/g, "");
  return n ? country + n : "";
}
