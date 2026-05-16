# syntax=docker/dockerfile:1.6
# Multi-stage build for @oneplace/api inside the pnpm monorepo.

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo

# --- Install all deps with workspace context ---
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile=false

# --- Build ---
FROM deps AS build
COPY . .
RUN pnpm --filter @oneplace/db prisma:generate
RUN pnpm --filter @oneplace/api build

# --- Runtime ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/apps/api/package.json ./apps/api/
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
