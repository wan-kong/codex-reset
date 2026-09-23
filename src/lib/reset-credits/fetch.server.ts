import "@tanstack/react-start/server-only";
import { env } from "#/env/server";
import { logger } from "#/lib/logger.server";
import { type ResetCreditsResponse, resetCreditsResponseSchema } from "#/lib/reset-credits/types";

function getResetCreditsEndpoint() {
  return `${env.CHATGPT_USAGE_ENDPOINT}/backend-api/wham/rate-limit-reset-credits`;
}

function buildResetCreditsHeaders() {
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

export async function fetchResetCredits(): Promise<ResetCreditsResponse> {
  const endpoint = getResetCreditsEndpoint();
  const startedAt = Date.now();
  logger.info("reset_credit_fetch.started", {
    endpointHost: new URL(endpoint).host,
  });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      cache: "no-store",
      headers: buildResetCreditsHeaders(),
      method: "GET",
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    const causeMessage =
      cause instanceof Error
        ? cause.message
        : typeof cause === "string"
          ? cause
          : cause
            ? JSON.stringify(cause)
            : undefined;
    logger.warn("reset_credit_fetch.network_error", {
      durationMs: Date.now() - startedAt,
      cause: causeMessage,
    });
    throw new Error(
      `Reset credit request failed to reach ${new URL(endpoint).host}${
        causeMessage ? `: ${causeMessage}` : ""
      }`,
      { cause: error },
    );
  }

  const durationMs = Date.now() - startedAt;
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.warn("reset_credit_fetch.request_failed", {
      durationMs,
      status: response.status,
    });
    throw new Error(`Reset credit request failed with ${response.status}: ${body.slice(0, 240)}`);
  }

  const json = await response.json();
  const parsed = resetCreditsResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.warn("reset_credit_fetch.shape_mismatch", { durationMs });
    throw new Error(`Reset credit response shape mismatch: ${parsed.error.message}`);
  }

  logger.info("reset_credit_fetch.completed", {
    availableCount: parsed.data.available_count,
    creditCount: parsed.data.credits.length,
    durationMs,
    status: response.status,
  });

  return parsed.data;
}
