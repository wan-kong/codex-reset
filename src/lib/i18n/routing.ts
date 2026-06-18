export type Locale = "zh" | "en";

export const locales = ["zh", "en"];
export const defaultLocale: Locale = "zh";

export const LOCALE_COOKIE_NAME = "USER_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return value === "zh" || value === "en";
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}
