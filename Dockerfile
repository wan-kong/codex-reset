# syntax=docker/dockerfile:1

# ---- Base ----------------------------------------------------------------
# Pin to the Node version used in development (v24). Debian-slim (glibc) so
# better-sqlite3 prebuilt binaries resolve, with a build-tool fallback.
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

# ---- Dependencies --------------------------------------------------------
# Install build tools so better-sqlite3 can compile if no prebuilt binary is
# available for the target platform.
FROM base AS deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build ---------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm build
# Strip dev dependencies; keeps better-sqlite3 + drizzle-orm for the migrator.
RUN pnpm prune --prod

# ---- Runtime -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0
WORKDIR /app

# Self-contained Nitro server output.
COPY --from=build /app/.output ./.output
# Production deps + migration assets for the entrypoint migrate step.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build /app/package.json ./package.json

# Writable data + logs for the non-root user.
RUN mkdir -p data logs && chown -R node:node /app
USER node

EXPOSE 3000

# Apply migrations against the (mounted) SQLite volume, then start the server.
CMD ["sh", "-c", "node scripts/migrate.mjs && node .output/server/index.mjs"]
