# syntax=docker/dockerfile:1.6
# Single-stage build for @oneplace/api with pnpm hoisted node-linker.

FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo
ENV NODE_ENV=production

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

RUN pnpm config set node-linker hoisted
RUN pnpm install --frozen-lockfile=false

COPY . .
RUN pnpm --filter @oneplace/db prisma:generate
RUN pnpm --filter @oneplace/api build

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
