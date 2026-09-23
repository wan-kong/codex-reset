import { createServer } from "node:http";

const port = Number(process.env.MOCK_USAGE_PORT ?? 8787);
const buildResetCreditsResponse = () => ({
  credits: [
    {
      id: "RateLimitResetCredit_mock_baseline",
      reset_type: "codex_rate_limits",
      is_supported_by_plan: true,
      status: "available",
      granted_at: "2026-09-22T18:34:10.328681Z",
      expires_at: "2026-10-22T18:34:10.328681Z",
      redeem_started_at: null,
      redeemed_at: null,
      profile_image_url: "https://openaiassets.blob.core.windows.net/$web/codex/codex-icon-200.png",
      profile_user_id: "Codex Team",
      title: "完全重置（每周 + 5 小时）",
      description: "感谢使用 Codex！你已获赠一次免费的速率限制重置机会。",
    },
  ],
  available_count: 1,
  total_earned_count: 0,
  immediate_reset_purchase_eligible: false,
  history_enabled: true,
});

const writeJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/backend-api/wham/rate-limit-reset-credits") {
    writeJson(response, 200, buildResetCreditsResponse());
    return;
  }

  writeJson(response, 404, { error: "Not found" });
});

server.listen(port, () => {
  console.info(`Mock usage server listening on http://localhost:${port}`);
  console.info(`Set CHATGPT_USAGE_ENDPOINT=http://localhost:${port} to use this server.`);
});
