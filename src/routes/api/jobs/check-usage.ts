import { createFileRoute } from "@tanstack/react-router";

import { env } from "#/env/server";
import { checkResetCredits } from "#/lib/jobs/check-usage.server";
import { logger } from "#/lib/logger.server";

export const Route = createFileRoute("/api/jobs/check-usage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = env.CRON_SECRET;
        logger.info("cron_route.request_received");

        if (!secret) {
          logger.error("cron_route.missing_secret");
          return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
        }

        const authorization = request.headers.get("authorization");
        const headerSecret = authorization?.startsWith("Bearer ")
          ? authorization.slice("Bearer ".length)
          : null;
        const submittedSecret = request.headers.get("x-cron-secret") ?? headerSecret;
        if (submittedSecret !== secret) {
          logger.warn("cron_route.unauthorized", {
            hasAuthorizationHeader: authorization !== null,
            hasCronSecretHeader: request.headers.has("x-cron-secret"),
          });
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        logger.info("cron_route.authorized");
        const result = await checkResetCredits();
        const status = result.status === "error" ? 500 : 200;
        logger.info("cron_route.completed", {
          jobRunId: result.jobRun.id,
          responseStatus: status,
          status: result.status,
        });

        return Response.json(
          {
            jobRun: result.jobRun,
            status: result.status,
          },
          { status },
        );
      },
    },
  },
});
