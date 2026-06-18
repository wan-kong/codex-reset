import { queryOptions } from "@tanstack/react-query";

import { $getHomeData } from "#/lib/app-data.functions";
import type { Locale } from "#/lib/i18n/routing";

export const homeDataQueryOptions = (locale: Locale) =>
  queryOptions({
    queryKey: ["home-data", locale],
    queryFn: ({ signal }) => $getHomeData({ signal }),
  });
