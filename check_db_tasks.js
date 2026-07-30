require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const rawUrl = process.env.DATABASE_URL || 'postgresql://postgres:4723670enteR!@db.kpdjtiusfcdabmjkemfm.supabase.co:5432/postgres';
const dbUrl = rawUrl.trim().replace(/\\n/g, '');
const pool = new pg.Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const users = await prisma.user.findMany({
    include: { department: true }
  });
  console.log('--- USERS ---');
  users.forEach(u => {
    console.log(`${u.id}: ${u.name} (username: ${u.username}, role: ${u.role}, dept: ${u.department?.name})`);
  });

  const tasks = await prisma.task.findMany({
    include: { user: true }
  });
  console.log('\n--- TASKS ---');
  tasks.forEach(t => {
    console.log(`${t.id}: ${t.taskDescription} (userId: ${t.userId}, assignee: ${t.user?.name}, status: ${t.status}, nominatedById: ${t.nominatedById})`);
  });

  prisma.$disconnect();
}

run();
