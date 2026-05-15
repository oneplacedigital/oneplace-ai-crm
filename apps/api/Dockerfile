# syntax=docker/dockerfile:1.6
# Single-stage build to preserve pnpm workspace symlinks at runtime.
FROM node:20-alpine

WORKDIR /repo

RUN apk add --no-cache openssl libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@9.0.0 --activate

# Copy whole monorepo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Install all workspace deps with hoisted node-linker for runtime portability
RUN pnpm config set node-linker hoisted \
 && pnpm install --no-frozen-lockfile

# Generate Prisma client and build API
RUN pnpm --filter @oneplace/db prisma:generate \
 && pnpm --filter @oneplace/api build

ENV NODE_ENV=production
EXPOSE 4000
WORKDIR /repo/apps/api
CMD ["node", "dist/index.js"]
