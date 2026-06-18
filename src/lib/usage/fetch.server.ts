import "@tanstack/react-start/server-only";
import { env } from "#/env/server";
import { logger } from "#/lib/logger.server";
import { type UsageResponse, usageResponseSchema } from "#/lib/usage/types";

function getUsageEndpoint() {
  return `${env.CHATGPT_USAGE_ENDPOINT}/backend-api/wham/usage`;
}

function buildUsageHeaders() {
  const authorization = env.CHATGPT_USAGE_AUTHORIZATION;
  if (!authorization) {
    throw new Error("CHATGPT_USAGE_AUTHORIZATION is required");
  }

  return {
    accept: "*/*",
    "accept-language": "zh,en;q=0.8",
    authorization: authorization.startsWith("Bearer ") ? authorization : `Bearer ${authorization}`,
  };
}

export async function fetchUsage(): Promise<UsageResponse> {
  const endpoint = getUsageEndpoint();
  const startedAt = Date.now();
  logger.info("usage_fetch.started", {
    endpointHost: new URL(endpoint).host,
  });

  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: buildUsageHeaders(),
    method: "GET",
  });
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.warn("usage_fetch.request_failed", {
      durationMs,
      status: response.status,
    });
    throw new Error(`Usage request failed with ${response.status}: ${body.slice(0, 240)}`);
  }

  const json = await response.json();
  const parsed = usageResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.warn("usage_fetch.shape_mismatch", { durationMs });
    throw new Error(`Usage response shape mismatch: ${parsed.error.message}`);
  }

  logger.info("usage_fetch.completed", {
    durationMs,
    status: response.status,
  });

  return parsed.data;
}
