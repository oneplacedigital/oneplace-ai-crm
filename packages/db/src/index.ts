import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prismaOptions = {
  log:
    process.env.NODE_ENV === 'production'
      ? (['error', 'warn'] as const)
      : (['query', 'info', 'warn', 'error'] as const),
};

export const prisma: PrismaClient =
  global.__prisma ?? new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export * from '@prisma/client';
export default prisma;
