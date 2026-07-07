export {};

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      VITE_BASE_URL?: string;
      CRON_SECRET?: string;
      CHATGPT_USAGE_AUTHORIZATION?: string;
      CHATGPT_USAGE_ENDPOINT?: string;
      RESEND_API_KEY?: string;
      EMAIL_FROM?: string;
      LOG_LEVEL?: string;
    }
  }
}
