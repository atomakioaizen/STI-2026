/**
 * PRODUCTION SEED v3 — Task Monitoring System
 * Wipes old mock data and sets up real employee accounts
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  if (dbUrl.startsWith('postgresql') || dbUrl.startsWith('postgres')) {
    const pool = new pg.Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } else {
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    return new PrismaClient({ adapter });
  }
}

const prisma = createPrismaClient();

async function main() {
  console.log('🗑  Wiping all existing data...');
  await prisma.task.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  // Default hashed password
  const hash = await bcrypt.hash('STI2026', 10);

  // Helper to generate username base on name
  const makeUsername = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  console.log('── Creating Departments...');
  const deptAdmin = await prisma.department.create({ data: { name: 'Admin' } });
  const deptBSIT  = await prisma.department.create({ data: { name: 'BSIT' } });
  const deptSHS   = await prisma.department.create({ data: { name: 'Senior High School' } });
  const deptTour  = await prisma.department.create({ data: { name: 'Tourism' } });
  const deptGEd   = await prisma.department.create({ data: { name: 'General Education' } });

  console.log('── Seeding Accounts...');

  // 1. School Administrator
  await prisma.user.create({
    data: {
      name: 'Michael Kim Palay',
      username: makeUsername('Michael Kim Palay'),
      password: hash,
      position: 'School Administrator',
      role: 'SCHOOL_ADMIN',
      departmentId: deptAdmin.id
    }
  });

  // 2. Principal
  await prisma.user.create({
    data: {
      name: 'Mea Ann Diaz',
      username: makeUsername('Mea Ann Diaz'),
      password: hash,
      position: 'Principal',
      role: 'PRINCIPAL',
      departmentId: deptAdmin.id
    }
  });

  // 3. Program Heads
  await prisma.user.create({
    data: {
      name: 'Lloyd Lomoljo',
      username: makeUsername('Lloyd Lomoljo'),
      password: hash,
      position: 'Program Head - BSIT',
      role: 'PROGRAM_HEAD',
      departmentId: deptBSIT.id
    }
  });

  await prisma.user.create({
    data: {
      name: 'John Paul Odasco',
      username: makeUsername('John Paul Odasco'),
      password: hash,
      position: 'Program Head - SHS',
      role: 'PROGRAM_HEAD',
      departmentId: deptSHS.id
    }
  });

  await prisma.user.create({
    data: {
      name: 'Laurice Jade Santiago',
      username: makeUsername('Laurice Jade Santiago'),
      password: hash,
      position: 'Program Head - Tourism',
      role: 'PROGRAM_HEAD',
      departmentId: deptTour.id
    }
  });

  // 4. Staff (Admin Department)
  const staffNames = [
    'Karen Torrefiel',
    'Ronalyn Saldavia',
    'Mary Ellen Venice Cruz',
    'Mary Jane Licay',
    'Jezel Gevero',
    'Julius Cosio',
    'Maricel Lamban',
    'Joaquin Villanueva Lll',
    'Deborah Abbas',
    'Jemuel Abordo'
  ];

  for (const name of staffNames) {
    await prisma.user.create({
      data: {
        name,
        username: makeUsername(name),
        password: hash,
        position: 'Administrative Staff',
        role: 'FACULTY_STAFF',
        departmentId: deptAdmin.id
      }
    });
  }

  // 5. Faculty by Department
  // SHS Department Faculty
  const shsFaculty = [
    'Jemaica Cortez',
    'Reno Soriano',
    'Jamil Garados',
    'Mark Nel Avelino'
  ];
  for (const name of shsFaculty) {
    await prisma.user.create({
      data: {
        name,
        username: makeUsername(name),
        password: hash,
        position: 'SHS Faculty',
        role: 'FACULTY_STAFF',
        departmentId: deptSHS.id
      }
    });
  }

  // Gen Ed Department Faculty
  const gedFaculty = [
    'Karl John Leona',
    'Jimmer Quipquip',
    'Diana Estanero',
    'Danilyn Esmas',
    'Ernesto Belano'
  ];
  for (const name of gedFaculty) {
    await prisma.user.create({
      data: {
        name,
        username: makeUsername(name),
        password: hash,
        position: 'Gen Ed Faculty',
        role: 'FACULTY_STAFF',
        departmentId: deptGEd.id
      }
    });
  }

  // Tourism Department Faculty
  const tourFaculty = [
    'Fely Erika Nario',
    'Mary Jussle Mapanao'
  ];
  for (const name of tourFaculty) {
    await prisma.user.create({
      data: {
        name,
        username: makeUsername(name),
        password: hash,
        position: 'Tourism Faculty',
        role: 'FACULTY_STAFF',
        departmentId: deptTour.id
      }
    });
  }

  // BSIT Department Faculty
  await prisma.user.create({
    data: {
      name: 'Joshua Alonsagay',
      username: makeUsername('Joshua Alonsagay'),
      password: hash,
      position: 'BSIT Faculty',
      role: 'FACULTY_STAFF',
      departmentId: deptBSIT.id
    }
  });

  console.log('🎉 Seed completed successfully! Database has been cleared and seeded with the real user accounts.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
