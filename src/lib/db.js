import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

function createPrismaClient() {
  const url = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock';
  return new PrismaClient({
    datasources: {
      db: {
        url
      }
    }
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
