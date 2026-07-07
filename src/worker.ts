import start from "@tanstack/react-start/server-entry";

import { logger } from "#/lib/logger.server";

function createCronRequest(env: Cloudflare.Env) {
  const baseUrl = env.VITE_BASE_URL ?? "http://localhost";
  const url = new URL("/api/jobs/check-usage", baseUrl);
  const headers = new Headers();

  if (env.CRON_SECRET) {
    headers.set("Authorization", `Bearer ${env.CRON_SECRET}`);
  }

  return new Request(url, {
    headers,
    method: "POST",
  });
}

export default {
  fetch(request) {
    return start.fetch(request as Parameters<typeof start.fetch>[0]);
  },
  async scheduled(controller, env) {
    logger.info("cron_trigger.started", {
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
    });

    const response = await start.fetch(createCronRequest(env) as Parameters<typeof start.fetch>[0]);
    const body = await response.text().catch(() => "");

    logger.info("cron_trigger.completed", {
      cron: controller.cron,
      responseBody: body.slice(0, 500),
      responseStatus: response.status,
      scheduledTime: controller.scheduledTime,
    });

    if (!response.ok) {
      throw new Error(`Cron route failed with ${response.status}: ${body.slice(0, 240)}`);
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
