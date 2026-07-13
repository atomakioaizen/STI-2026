import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis;

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  if (dbUrl.startsWith('postgresql') || dbUrl.startsWith('postgres')) {
    // Production: use PostgreSQL with adapter-pg
    const pool = new pg.Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } else {
    // Local dev: use SQLite with adapter-better-sqlite3
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    return new PrismaClient({ adapter });
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
