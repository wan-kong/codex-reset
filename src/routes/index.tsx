import { createFileRoute, redirect } from "@tanstack/react-router";

import { $getPreferredLocale } from "#/lib/i18n/locale.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const locale = await $getPreferredLocale();

    throw redirect({
      to: "/$locale",
      params: { locale },
    });
  },
});
