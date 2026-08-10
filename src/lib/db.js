import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis;

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock';
  let dbUrl = rawUrl.trim().replace(/\\n/g, '');

  // Automatically switch Supabase Pooler from Session Mode (5432) to Transaction Mode (6543)
  if (dbUrl.includes('.supabase.com:5432')) {
    dbUrl = dbUrl.replace('.supabase.com:5432', '.supabase.com:6543');
  }
  if (dbUrl.includes('.supabase.com') && !dbUrl.includes('pgbouncer=true')) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }

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
