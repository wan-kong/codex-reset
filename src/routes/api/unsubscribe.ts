import { createFileRoute } from "@tanstack/react-router";

import { LOCALE_COOKIE_MAX_AGE, LOCALE_COOKIE_NAME, normalizeLocale } from "#/lib/i18n/routing";
import { logger } from "#/lib/logger.server";
import { unsubscribeByToken } from "#/lib/subscribers.server";

function createLocaleCookie(locale: string) {
  return `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Max-Age=${LOCALE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export const Route = createFileRoute("/api/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const locale = normalizeLocale(url.searchParams.get("lang"));
        const ok = await unsubscribeByToken(token);
        logger.info("unsubscribe_route.completed", {
          locale,
          success: ok,
        });

        const redirectUrl = new URL(`/${locale}/unsubscribe${ok ? "?ok=true" : ""}`, request.url);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${redirectUrl.pathname}${redirectUrl.search}`,
            "Set-Cookie": createLocaleCookie(locale),
          },
        });
      },
    },
  },
});
