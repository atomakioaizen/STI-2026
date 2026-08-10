import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis;

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock';
  const dbUrl = rawUrl.trim().replace(/\\n/g, '');
  const pool = new pg.Pool({ 
    connectionString: dbUrl, 
    max: 1, 
    idleTimeoutMillis: 5000, 
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false } 
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'test') {
  globalForPrisma.prisma = prisma;
}
