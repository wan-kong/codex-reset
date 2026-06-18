import type { Locale } from "#/lib/i18n/routing";

export function formatUnixTime(value: number | null | undefined, locale: string = "zh") {
  if (!value) {
    return locale === "en" ? "None" : "暂无";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value * 1000));
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh").format(value);
}
