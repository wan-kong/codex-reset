# Codex Reset Records

TanStack Start rewrite of the Codex reset monitor.

This app monitors `https://chatgpt.com/backend-api/wham/rate-limit-reset-credits`, stores reset credits by their stable IDs, detects newly granted credits, and sends localized email notifications to subscribers.

## Stack

- TanStack Start + React 19 + TanStack Router/Query
- Drizzle ORM + Cloudflare D1
- shadcn/ui + Tailwind CSS
- Resend + emailmd
- Cloudflare Workers Observability

## Environment

Create `.env` from `.env.example` for local development.

```bash
cp .env.example .env
```

Required for local app startup:

```env
VITE_BASE_URL=http://localhost:3000
```

Required for cron checks:

```env
CRON_SECRET="replace-with-a-cron-secret"
CHATGPT_USAGE_AUTHORIZATION="Bearer ..."
CHATGPT_USAGE_ENDPOINT=https://chatgpt.com
```

Required for real email delivery:

```env
RESEND_API_KEY="..."
EMAIL_FROM="Codex Reset Records <notify@example.com>"
NOTICE_USER_MAIL="owner@example.com"
```

If `RESEND_API_KEY` or `EMAIL_FROM` is missing, reset-credit notifications are not sent and deliveries are recorded as `skipped`. If `NOTICE_USER_MAIL` is configured, check failures are sent to that address separately.

For Cloudflare deployment, set secrets with Wrangler:

```bash
pnpm wrangler secret put CRON_SECRET
pnpm wrangler secret put CHATGPT_USAGE_AUTHORIZATION
pnpm wrangler secret put RESEND_API_KEY
pnpm wrangler secret put EMAIL_FROM
pnpm wrangler secret put NOTICE_USER_MAIL
```

Set non-secret values in `wrangler.jsonc` under `vars`.

## Development

```bash
pnpm db:migrate
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

Routes:

- `/` redirects to the preferred locale, defaulting to `/zh`.
- `/zh` and `/en` render the public monitor page.
- `/zh/unsubscribe` and `/en/unsubscribe` render unsubscribe results.
- `POST /api/jobs/check-usage` runs the monitor job.
- `GET /api/unsubscribe?token=...&lang=zh` unsubscribes a subscriber and redirects to the localized result page.

## Database

Create the D1 database once:

```bash
pnpm db:create
```

Then copy the returned database ID into `wrangler.jsonc` at `d1_databases[0].database_id`.

Generate and apply migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

Apply migrations to the remote Cloudflare D1 database:

```bash
pnpm db:migrate:remote
```

Monitor tables:

- `reset_credits`
- `credit_monitor_state`
- `subscribers`
- `job_runs`
- `email_deliveries`

The first successful check establishes a baseline and never sends notifications, including when the API returns no credits. Later checks identify new credits by `credits[].id`.

## Local Usage Mock

Start the mock ChatGPT reset-credit endpoint:

```bash
pnpm mock:usage
```

Then set:

```env
CHATGPT_USAGE_ENDPOINT=http://localhost:8787
CHATGPT_USAGE_AUTHORIZATION=mock
```

## Trigger Cron Manually

Cloudflare Cron Triggers call `POST /api/jobs/check-usage` every hour via `wrangler.jsonc`:

```jsonc
"triggers": {
  "crons": ["0 * * * *"]
}
```

The scheduled handler uses the same `Authorization: Bearer $CRON_SECRET` header as `check-usage.sh`.

Cron expressions use UTC time. In local dev, trigger the scheduled handler with:

```bash
curl "http://localhost:3000/cdn-cgi/handler/scheduled"
```

The HTTP route is still available for manual checks:

```bash
curl -X POST "$VITE_BASE_URL/api/jobs/check-usage" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Or use:

```bash
CRON_SECRET="$CRON_SECRET" ./check-usage.sh
```

## Deploy

```bash
pnpm deploy
```

## Verification

```bash
pnpm lint
pnpm db:generate
pnpm db:migrate
```

Manual checks:

- `/` redirects to `/zh` when no locale cookie is set.
- `/zh` and `/en` show localized content.
- Language toggle switches between localized routes.
- Email subscription handles success, duplicate, invalid, and error states.
- Unsubscribe token updates subscriber status and redirects to localized result page.
- Cron route rejects missing/invalid secrets.
- Cron route records baseline, no-change, new-credit, and error outcomes according to the reset-credit response.
