/**
 * PRODUCTION SEED v3 — Task Monitoring System
 * Wipes old mock data and sets up real employee accounts
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

const dbUrl = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock';
const pool = new pg.Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🗑  Wiping all existing data...');
  await prisma.activityLog.deleteMany({});
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
    'Joaquin Villanueva 3rd',
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

  console.log('── Generating ~200 Diverse Dummy Transactions across accounts and dates...');

  const allUsers = await prisma.user.findMany();
  const categories = [
    'Curriculum & Instruction',
    'Student Affairs',
    'Research & Development',
    'Administrative Reports',
    'Events & Seminars',
    'Facility & Maintenance',
    'Community Extension'
  ];
  
  const priorities = ['High', 'Medium', 'Low'];
  const statuses = [
    'Completed',
    'Ongoing',
    'Delayed',
    'Awaiting Approval',
    'Rejected',
    'Pending Acceptance',
    'Awaiting Deletion'
  ];

  const sampleDescriptions = [
    'Submit Midterm Grading Sheets & Examination Transcripts',
    'Prepare Accreditation Documents & Syllabi Updates',
    'Conduct Faculty Peer Evaluation and Performance Review',
    'Organize Departmental Orientation for incoming Enrollees',
    'Consolidate Research Proposals and Ethical Clearance Form',
    'Inventory Equipment and Computer Laboratory Asset Checking',
    'Draft Quarterly Accomplishment Report for Administration',
    'Submit Class Attendance Logs and Syllabus Checklist',
    'Coordinate Campus Event Logistics & Security Details',
    'Update Student Internship Guidelines & Partner MOUs',
    'Review Learning Management System Module Uploads',
    'Facilitate Community Extension Workshop & Outreach'
  ];

  const remarksOptions = [
    'Completed ahead of time with zero issues.',
    'Submitted initial draft, currently waiting for supervisor review.',
    'Slight delay due to pending external documents.',
    'Rejection: Incorrect file format uploaded. Please re-submit.',
    'Nominated to assignee. Pending initial acceptance.',
    'Requested for task deletion due to change of schedule.',
    'Progressing smoothly at 75%. On track for target completion.'
  ];

  let taskCount = 0;
  // Months: Feb 2026 to July 2026
  const monthsList = [
    { year: 2026, month: 1 }, // Feb
    { year: 2026, month: 2 }, // Mar
    { year: 2026, month: 3 }, // Apr
    { year: 2026, month: 4 }, // May
    { year: 2026, month: 5 }, // Jun
    { year: 2026, month: 6 }  // Jul
  ];

  const supervisorUsers = allUsers.filter(u => u.role === 'SCHOOL_ADMIN' || u.role === 'PRINCIPAL' || u.role === 'PROGRAM_HEAD');

  for (let i = 0; i < 200; i++) {
    const userObj = allUsers[i % allUsers.length];
    const monthObj = monthsList[i % monthsList.length];
    const category = categories[i % categories.length];
    const priority = priorities[i % priorities.length];
    const status = statuses[i % statuses.length];
    const descBase = sampleDescriptions[i % sampleDescriptions.length];
    const description = `${descBase} (Batch #${Math.floor(i / 10) + 1})`;

    // Randomize entry day and target date
    const day = (i % 25) + 1;
    const entryDate = new Date(monthObj.year, monthObj.month, day, 9, 0, 0);
    
    // Target date: entryDate + 3 to 10 days
    const targetDate = new Date(entryDate);
    targetDate.setDate(entryDate.getDate() + ((i % 7) + 3));

    const isNominated = (i % 3 === 0);
    const nominator = isNominated ? supervisorUsers[i % supervisorUsers.length] : null;

    let finalStatus = status;
    let finalNominator = nominator;

    // SCHOOL_ADMIN (Michael Kim Palay) has no supervisor above him!
    // Therefore, any task owned by SCHOOL_ADMIN should never be in approval/acceptance/deletion request states.
    if (userObj.role === 'SCHOOL_ADMIN') {
      if (finalStatus === 'Awaiting Approval' || finalStatus === 'Pending Acceptance' || finalStatus === 'Awaiting Deletion') {
        finalStatus = 'Ongoing';
      }
      finalNominator = null;
    }

    let progress = 0;
    if (finalStatus === 'Completed') progress = 100;
    else if (finalStatus === 'Ongoing' || finalStatus === 'Awaiting Approval') progress = Math.min(95, ((i % 8) + 1) * 10);
    else if (finalStatus === 'Delayed') progress = Math.min(80, ((i % 5) + 1) * 10);

    const isArchived = (finalStatus === 'Completed' && (i % 2 === 0));

    await prisma.task.create({
      data: {
        entryDate,
        targetDate,
        category,
        taskDescription: description,
        priority,
        status: finalStatus,
        progress,
        previousProgress: finalStatus === 'Awaiting Approval' ? progress - 20 : null,
        remarks: remarksOptions[i % remarksOptions.length],
        evidenceLink: finalStatus === 'Completed' || finalStatus === 'Awaiting Approval' ? 'https://drive.google.com/sample_proof_file' : null,
        archived: isArchived,
        userId: userObj.id,
        nominatedById: finalNominator ? finalNominator.id : null,
        rejectionReason: finalStatus === 'Rejected' ? 'Incomplete requirements submitted' : null,
        rejectionCount: finalStatus === 'Rejected' ? 1 : 0,
        assignedNote: isNominated && finalNominator ? 'Pushed from department priority list' : null
      }
    });

    taskCount++;
  }

  console.log(`🎉 Seed completed successfully! Database cleared and populated with 200 comprehensive dummy tasks for testing.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
