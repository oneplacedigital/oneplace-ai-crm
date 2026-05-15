import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const isProd = process.env.NODE_ENV === 'production';
const logLevels: Array<'query' | 'info' | 'warn' | 'error'> = isProd
  ? ['error', 'warn']
  : ['query', 'info', 'warn', 'error'];

export const prisma: PrismaClient =
  global.__prisma ?? new PrismaClient({ log: logLevels });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export * from '@prisma/client';
e