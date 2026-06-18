import { createFileRoute } from "@tanstack/react-router";

import { LOCALE_COOKIE_MAX_AGE, LOCALE_COOKIE_NAME, normalizeLocale } from "#/lib/i18n/routing";
import { logger } from "#/lib/logger.server";

function createLocaleCookie(locale: string) {
  return `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Max-Age=${LOCALE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export const Route = createFileRoute("/api/unsubscribe")({
  server: {
    handlers: {
      // Legacy link target: never mutate on GET (email/link scanners prefetch it).
      // Redirect to the confirmation page where the user explicitly confirms via POST.
      GET: ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const locale = normalizeLocale(url.searchParams.get("lang"));
        logger.info("unsubscribe_route.redirect_to_confirm", {
          hasToken: token.length > 0,
          locale,
        });

        const redirectUrl = new URL(`/${locale}/unsubscribe`, request.url);
        if (token) {
          redirectUrl.searchParams.set("token", token);
        }
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
