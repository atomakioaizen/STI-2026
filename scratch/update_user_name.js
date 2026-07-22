require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const dbUrl = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Connecting to database...');
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: 'Lll'
      }
    }
  });

  console.log(`Found ${users.length} user(s) matching 'Lll':`, users.map(u => u.name));

  for (const u of users) {
    const updatedName = u.name.replaceAll('Lll', '3rd');
    await prisma.user.update({
      where: { id: u.id },
      data: { name: updatedName }
    });
    console.log(`Updated user ID ${u.id} from "${u.name}" to "${updatedName}"`);
  }

  const joaquin = await prisma.user.findFirst({
    where: { name: { contains: 'Joaquin Villanueva' } }
  });
  console.log('Current Joaquin user in DB:', joaquin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
