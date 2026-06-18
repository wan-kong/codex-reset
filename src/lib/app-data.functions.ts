import { createServerFn } from "@tanstack/react-start";

import { getHomeData } from "#/lib/app-data.server";

export const $getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  return getHomeData();
});
