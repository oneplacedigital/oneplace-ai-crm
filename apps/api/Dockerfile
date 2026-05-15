# syntax=docker/dockerfile:1.6
FROM node:20-alpine

WORKDIR /repo

RUN apk add --no-cache openssl libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages

RUN pnpm config set node-linker hoisted \
 && pnpm install --no-frozen-lockfile

# Build in dependency order: types -> db (with prisma generate) -> api
RUN pnpm --filter @oneplace/types build \
 && pnpm --filter @oneplace/db prisma:generate \
 && pnpm --filter @oneplace/db build \
 && pnpm --filter @oneplace/api build

ENV NODE_ENV=production
EXPOSE 4000
WORKDIR /repo/apps/api
CMD ["node", "dist/index.js"]
