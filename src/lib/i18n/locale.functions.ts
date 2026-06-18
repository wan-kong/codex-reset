import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  defaultLocale,
  normalizeLocale,
} from "#/lib/i18n/routing";

export const $getPreferredLocale = createServerFn({ method: "GET" }).handler(async () => {
  return normalizeLocale(getCookie(LOCALE_COOKIE_NAME) ?? defaultLocale);
});

export const $setPreferredLocale = createServerFn({ method: "POST" })
  .validator(
    z.object({
      locale: z.enum(["zh", "en"]),
    }),
  )
  .handler(async ({ data }) => {
    setCookie(LOCALE_COOKIE_NAME, data.locale, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });

    return { locale: data.locale };
  });
