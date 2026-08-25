import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis;

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock';
  let dbUrl = rawUrl.trim().replace(/\\n/g, '');

  // Strip sslmode query param so pg.Pool ssl: { rejectUnauthorized: false } handles TLS cleanly without certificate chain errors
  dbUrl = dbUrl.replace(/(\?|&)sslmode=[^&]*/, '');

  const pool = new pg.Pool({ 
    connectionString: dbUrl, 
    max: 10, 
    idleTimeoutMillis: 2000, 
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false } 
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'test') {
  globalForPrisma.prisma = prisma;
}
