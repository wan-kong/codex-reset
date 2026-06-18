import { createServer } from "node:http";

const port = Number(process.env.MOCK_USAGE_PORT ?? 8787);
const baseSecondaryResetAt = 1_779_225_534;

const buildUsageResponse = () => ({
  account_id: "user-mock-codex-reset-record",
  additional_rate_limits: null,
  code_review_rate_limit: null,
  credits: {
    approx_cloud_messages: [0, 0],
    approx_local_messages: [0, 0],
    balance: "0",
    has_credits: false,
    overage_limit_reached: false,
    unlimited: false,
  },
  email: "user@example.com",
  plan_type: "plus",
  promo: null,
  rate_limit: {
    allowed: true,
    limit_reached: false,
    primary_window: {
      limit_window_seconds: 18_000,
      reset_after_seconds: 5277,
      reset_at: 1_779_275_534,
      used_percent: 66,
    },
    secondary_window: {
      limit_window_seconds: 604_800,
      reset_after_seconds: 604_800,
      reset_at: baseSecondaryResetAt,
      used_percent: 22,
    },
  },
  rate_limit_reached_type: null,
  rate_limit_reset_credits: {
    available_count: 0,
    can_reset: false,
  },
  referral_beacon: null,
  spend_control: {
    individual_limit: null,
    reached: false,
  },
  user_id: "user-mock-codex-reset-record",
});

const writeJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/backend-api/wham/usage") {
    writeJson(response, 200, buildUsageResponse());
    return;
  }

  writeJson(response, 404, { error: "Not found" });
});

server.listen(port, () => {
  console.info(`Mock usage server listening on http://localhost:${port}`);
  console.info(`Set CHATGPT_USAGE_ENDPOINT=http://localhost:${port} to use this server.`);
});
