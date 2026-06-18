import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { defaultLocale, isLocale } from "#/lib/i18n/routing";

export const Route = createFileRoute("/$locale")({
  beforeLoad: ({ params }) => {
    if (!isLocale(params.locale)) {
      throw redirect({
        to: "/$locale",
        params: { locale: defaultLocale },
      });
    }

    return { locale: params.locale };
  },
  component: Outlet,
});
