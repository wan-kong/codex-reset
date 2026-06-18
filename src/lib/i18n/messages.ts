import enMessages from "#/lib/i18n/messages/en.json";
import zhMessages from "#/lib/i18n/messages/zh.json";
import type { Locale } from "#/lib/i18n/routing";

const messages = {
  en: enMessages,
  zh: zhMessages,
};

export function getMessages(locale: Locale) {
  return messages[locale];
}

export type Messages = typeof zhMessages;
