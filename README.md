# Codex Reset Records

TanStack Start rewrite of the Codex reset monitor.

This app monitors `https://chatgpt.com/backend-api/wham/usage`, stores every usage snapshot, detects unexpected secondary-window reset advances, and sends localized email notifications to subscribers.

## Stack

- TanStack Start + React 19 + TanStack Router/Query
- Drizzle ORM + SQLite
- shadcn/ui + Tailwind CSS
- Resend + emailmd
- pino logging

## Environment

Create `.env` from `.env.example`.

```bash
cp .env.example .env
```

Required for local app/database startup:

```env
DATABASE_URL="file:data/codex-reset-record.sqlite"
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
```

If `RESEND_API_KEY` or `EMAIL_FROM` is missing, reset notifications are not sent and deliveries are recorded as `skipped`.

## Development

```bash
pnpm db migrate
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

Generate and apply migrations:

```bash
pnpm db generate
pnpm db migrate
```

Monitor tables:

- `usage_snapshots`
- `subscribers`
- `job_runs`
- `email_deliveries`

## Local Usage Mock

Start the mock ChatGPT usage endpoint:

```bash
pnpm mock:usage
```

Then set:

```env
CHATGPT_USAGE_ENDPOINT=http://localhost:8787
CHATGPT_USAGE_AUTHORIZATION=mock
```

## Trigger Cron Manually

```bash
curl -X POST "$VITE_BASE_URL/api/jobs/check-usage" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Or use:

```bash
CRON_SECRET="$CRON_SECRET" ./check-usage.sh
```

## Verification

```bash
pnpm lint
pnpm db generate
pnpm db migrate
```

Manual checks:

- `/` redirects to `/zh` when no locale cookie is set.
- `/zh` and `/en` show localized content.
- Language toggle switches between localized routes.
- Email subscription handles success, duplicate, invalid, and error states.
- Unsubscribe token updates subscriber status and redirects to localized result page.
- Cron route rejects missing/invalid secrets.
- Cron route records baseline, no-change, reset, and error job runs according to usage response state.
