# syntax=docker/dockerfile:1.6
# Single-stage build for @oneplace/api with pnpm hoisted node-linker.
# NOTE: NODE_ENV must NOT be 'production' during install (skips devDeps needed for tsc).

FROM node:20-slim
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

RUN pnpm config set node-linker hoisted
RUN pnpm install --frozen-lockfile=false

COPY . .
RUN pnpm --filter @oneplace/types build
RUN pnpm --filter @oneplace/db prisma:generate
RUN pnpm --filter @oneplace/db build
RUN pnpm --filter @oneplace/api build

ENV NODE_ENV=production
EXPOSE 4000

# Self-apply additive schema changes on startup (idempotent if schema unchanged).
CMD ["sh", "-c", "cd /repo/packages/db && npx prisma db push --skip-generate && cd /repo && node apps/api/dist/index.js"]
