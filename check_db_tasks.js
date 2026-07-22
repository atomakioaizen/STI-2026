const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres.kpdjtiusfcdabmjkemfm:4723670enteR!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
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
