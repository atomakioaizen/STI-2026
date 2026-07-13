/**
 * FRESH SEED v2 — Task Monitoring System
 * Admin: Michael Kim Palay
 * Tasks spread across May, June, July 2026 with varied statuses
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

const d = (y, m, day) => new Date(y, m - 1, day); // helper



async function main() {
  console.log('🗑  Wiping all data...');
  await prisma.task.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  const hash = await bcrypt.hash('password123', 10);

  // ── DEPARTMENTS ──────────────────────────────
  const deptBSIT  = await prisma.department.create({ data: { name: 'BSIT' } });
  const deptBSTM  = await prisma.department.create({ data: { name: 'BSTM' } });
  const deptGEd   = await prisma.department.create({ data: { name: 'General Education' } });
  const deptSHS   = await prisma.department.create({ data: { name: 'Senior High School' } });
  const deptAdmin = await prisma.department.create({ data: { name: 'Admin' } });

  // ── SCHOOL ADMINISTRATOR ─────────────────────
  const admin = await prisma.user.create({ data: { name: 'Michael Kim Palay', username: 'admin', password: hash, position: 'School Administrator', role: 'SCHOOL_ADMIN', departmentId: deptAdmin.id } });

  // ── NON-ACADEMIC STAFF ───────────────────────
  const staffRosario = await prisma.user.create({ data: { name: 'Rosario Magtanggol', username: 'rmagtanggol', password: hash, position: 'Administrative Aide', role: 'FACULTY_STAFF', departmentId: deptAdmin.id } });
  const staffErnesto = await prisma.user.create({ data: { name: 'Ernesto Villanueva', username: 'evillanueva', password: hash, position: 'Registrar Clerk', role: 'FACULTY_STAFF', departmentId: deptAdmin.id } });

  // ── PRINCIPAL ────────────────────────────────
  const principal = await prisma.user.create({ data: { name: 'Marisol Aguinaldo', username: 'principal', password: hash, position: 'Principal', role: 'PRINCIPAL', departmentId: deptBSIT.id } });

  // ── PROGRAM HEADS ────────────────────────────
  const headBSIT = await prisma.user.create({ data: { name: 'Fernando Castillo', username: 'fcastillo', password: hash, position: 'Program Head - BSIT', role: 'PROGRAM_HEAD', departmentId: deptBSIT.id } });
  const headBSTM = await prisma.user.create({ data: { name: 'Gloria Espiritu',   username: 'gespiritu', password: hash, position: 'Program Head - BSTM', role: 'PROGRAM_HEAD', departmentId: deptBSTM.id } });
  const headGEd  = await prisma.user.create({ data: { name: 'Ramon Valdez',      username: 'rvaldez',   password: hash, position: 'Program Head - Gen Ed', role: 'PROGRAM_HEAD', departmentId: deptGEd.id } });
  const headSHS  = await prisma.user.create({ data: { name: 'Corazon Reyes',     username: 'creyes',    password: hash, position: 'Program Head - SHS', role: 'PROGRAM_HEAD', departmentId: deptSHS.id } });

  // ── FACULTY ──────────────────────────────────
  const facBSIT1 = await prisma.user.create({ data: { name: 'Miguel Santos',    username: 'msantos',  password: hash, position: 'Instructor I - BSIT', role: 'FACULTY_STAFF', departmentId: deptBSIT.id } });
  const facBSIT2 = await prisma.user.create({ data: { name: 'Lourdes Domingo',  username: 'ldomingo', password: hash, position: 'Instructor II - BSIT', role: 'FACULTY_STAFF', departmentId: deptBSIT.id } });
  const facBSTM1 = await prisma.user.create({ data: { name: 'Angelica Torres',  username: 'atorres',  password: hash, position: 'Instructor I - BSTM', role: 'FACULTY_STAFF', departmentId: deptBSTM.id } });
  const facBSTM2 = await prisma.user.create({ data: { name: 'Jerome Navarro',   username: 'jnavarro', password: hash, position: 'Instructor II - BSTM', role: 'FACULTY_STAFF', departmentId: deptBSTM.id } });
  const facGEd1  = await prisma.user.create({ data: { name: 'Patricia Mendoza', username: 'pmendoza', password: hash, position: 'Instructor I - Gen Ed', role: 'FACULTY_STAFF', departmentId: deptGEd.id } });
  const facSHS1  = await prisma.user.create({ data: { name: 'Dante Quizon',     username: 'dquizon',  password: hash, position: 'Instructor I - SHS', role: 'FACULTY_STAFF', departmentId: deptSHS.id } });

  console.log('✅ Users created. Seeding tasks...');

  // ═══════════════════════════════════════════════
  // TASKS — MAY 2026
  // ═══════════════════════════════════════════════

  // Miguel Santos — BSIT Faculty (high performer May)
  await prisma.task.create({ data: { entryDate: d(2026,5,3), targetDate: d(2026,5,15), category: 'HQ Syllabus', taskDescription: 'Update CS 301 course syllabus aligned with CHED CMO 25', priority: 'High', status: 'Completed', progress: 100, remarks: 'Submitted to program head', evidenceLink: 'https://drive.google.com/syllabus-cs301', userId: facBSIT1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,5), targetDate: d(2026,5,20), category: 'Instruction', taskDescription: 'Finalize mid-term practical examination for CC 201', priority: 'High', status: 'Completed', progress: 100, remarks: 'Exam conducted successfully', evidenceLink: '', userId: facBSIT1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,10), targetDate: d(2026,5,25), category: 'Research', taskDescription: 'Submit research proposal on IoT-based classroom monitoring', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Approved by research committee', evidenceLink: 'https://drive.google.com/iot-proposal', userId: facBSIT1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,12), targetDate: d(2026,5,28), category: 'Extension', taskDescription: 'Conduct free IT seminar for Brgy. Tiniguiban youth', priority: 'Medium', status: 'Completed', progress: 100, remarks: '45 participants', evidenceLink: '', userId: facBSIT1.id } });

  // Lourdes Domingo — BSIT Faculty (May)
  await prisma.task.create({ data: { entryDate: d(2026,5,4), targetDate: d(2026,5,18), category: 'Instruction', taskDescription: 'Develop quiz questions for all CC subjects mid-term', priority: 'High', status: 'Completed', progress: 100, remarks: 'Approved by head', evidenceLink: '', userId: facBSIT2.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,8), targetDate: d(2026,5,22), category: 'HQ Syllabus', taskDescription: 'Submit updated grading rubric for IT 401 capstone', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'On file with department', evidenceLink: '', userId: facBSIT2.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,14), targetDate: d(2026,5,30), category: 'Student Affairs', taskDescription: 'Process enrollment requests for 4th year irregular students', priority: 'High', status: 'Completed', progress: 100, remarks: '28 students processed', evidenceLink: '', userId: facBSIT2.id } });

  // Angelica Torres — BSTM Faculty (May)
  await prisma.task.create({ data: { entryDate: d(2026,5,2), targetDate: d(2026,5,16), category: 'Research', taskDescription: 'Submit abstract for Regional Tourism Research Symposium', priority: 'High', status: 'Completed', progress: 100, remarks: 'Abstract accepted', evidenceLink: 'https://drive.google.com/abstract-tourism', userId: facBSTM1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,6), targetDate: d(2026,5,20), category: 'Instruction', taskDescription: 'Create e-modules for Tourism Marketing (Modules 1-3)', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Uploaded to LMS', evidenceLink: '', userId: facBSTM1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,15), targetDate: d(2026,5,28), category: 'Extension', taskDescription: 'Lead Heritage Walk activity for Tourism Month', priority: 'Low', status: 'Completed', progress: 100, remarks: 'Successful event', evidenceLink: '', userId: facBSTM1.id } });

  // Jerome Navarro — BSTM Faculty (May)
  await prisma.task.create({ data: { entryDate: d(2026,5,3), targetDate: d(2026,5,17), category: 'Instruction', taskDescription: 'Conduct hotel operations simulation for HM 301 students', priority: 'High', status: 'Completed', progress: 100, remarks: 'All groups completed', evidenceLink: '', userId: facBSTM2.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,9), targetDate: d(2026,5,23), category: 'HQ Syllabus', taskDescription: 'Revise HM 401 subject syllabus with updated references', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Submitted on time', evidenceLink: '', userId: facBSTM2.id } });

  // Patricia Mendoza — Gen Ed Faculty (May)
  await prisma.task.create({ data: { entryDate: d(2026,5,5), targetDate: d(2026,5,19), category: 'Instruction', taskDescription: 'Prepare mid-term exam for GE 101 Understanding the Self', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Proctored and checked', evidenceLink: '', userId: facGEd1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,11), targetDate: d(2026,5,25), category: 'Extension', taskDescription: 'Organize literacy outreach for Brgy. San Isidro', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Materials prepared and distributed', evidenceLink: '', userId: facGEd1.id } });

  // Dante Quizon — SHS Faculty (May)
  await prisma.task.create({ data: { entryDate: d(2026,5,4), targetDate: d(2026,5,18), category: 'Research', taskDescription: 'Submit journal article to JPAIR accredited publication', priority: 'High', status: 'Completed', progress: 100, remarks: 'Published in JPAIR Vol 52', evidenceLink: 'https://jpair.org/sample', userId: facSHS1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,10), targetDate: d(2026,5,24), category: 'Instruction', taskDescription: 'Complete instructional materials for NSTP 101', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Compiled and distributed', evidenceLink: '', userId: facSHS1.id } });

  // Program Heads (May)
  await prisma.task.create({ data: { entryDate: d(2026,5,6), targetDate: d(2026,5,20), category: 'Curriculum', taskDescription: 'Review and update BSIT program curriculum per CHED memo', priority: 'High', status: 'Completed', progress: 100, remarks: 'Submitted to Principal', evidenceLink: 'https://drive.google.com/bsit-curriculum', userId: headBSIT.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,7), targetDate: d(2026,5,21), category: 'Faculty Dev', taskDescription: 'Coordinate BSTM faculty seminar on Sustainable Tourism', priority: 'High', status: 'Completed', progress: 100, remarks: 'Successfully conducted', evidenceLink: '', userId: headBSTM.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,8), targetDate: d(2026,5,22), category: 'Assessment', taskDescription: 'Submit Gen Ed department performance report Q1', priority: 'High', status: 'Completed', progress: 100, remarks: 'Report compiled and submitted', evidenceLink: 'https://drive.google.com/ged-q1', userId: headGEd.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,9), targetDate: d(2026,5,23), category: 'Monitoring', taskDescription: 'Conduct classroom visits for SHS faculty evaluation', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'All 6 faculty observed', evidenceLink: '', userId: headSHS.id } });

  // Principal & Admin Staff (May)
  await prisma.task.create({ data: { entryDate: d(2026,5,5), targetDate: d(2026,5,19), category: 'Administration', taskDescription: 'Conduct monthly department heads coordination meeting', priority: 'High', status: 'Completed', progress: 100, remarks: 'Minutes filed', evidenceLink: '', userId: principal.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,10), targetDate: d(2026,5,24), category: 'Monitoring', taskDescription: 'Review faculty performance evaluation forms Q1', priority: 'High', status: 'Completed', progress: 100, remarks: 'Evaluation completed for all departments', evidenceLink: '', userId: principal.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,3), targetDate: d(2026,5,17), category: 'Records', taskDescription: 'Digitize student admission records batches 1–50', priority: 'High', status: 'Completed', progress: 100, remarks: 'Completed ahead of schedule', evidenceLink: '', userId: staffRosario.id } });
  await prisma.task.create({ data: { entryDate: d(2026,5,5), targetDate: d(2026,5,19), category: 'Compliance', taskDescription: 'Prepare CHED enrollment statistics report for Q1', priority: 'High', status: 'Completed', progress: 100, remarks: 'Submitted to CHED portal', evidenceLink: '', userId: staffErnesto.id } });

  // ═══════════════════════════════════════════════
  // TASKS — JUNE 2026
  // ═══════════════════════════════════════════════

  // Miguel Santos — BSIT (June)
  await prisma.task.create({ data: { entryDate: d(2026,6,2), targetDate: d(2026,6,14), category: 'Instruction', taskDescription: 'Upload final examination questions for CC 201 to LMS', priority: 'High', status: 'Completed', progress: 100, remarks: 'Done', evidenceLink: '', userId: facBSIT1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,5), targetDate: d(2026,6,19), category: 'Research', taskDescription: 'Present IoT research findings at departmental colloquium', priority: 'High', status: 'Completed', progress: 100, remarks: 'Well received', evidenceLink: '', userId: facBSIT1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,10), targetDate: d(2026,6,25), category: 'HQ Syllabus', taskDescription: 'Update CS 401 syllabus for upcoming semester', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Submitted', evidenceLink: '', userId: facBSIT1.id } });

  // Lourdes Domingo (June)
  await prisma.task.create({ data: { entryDate: d(2026,6,3), targetDate: d(2026,6,17), category: 'Instruction', taskDescription: 'Conduct final practical examination for IT 301', priority: 'High', status: 'Completed', progress: 100, remarks: 'All students passed', evidenceLink: '', userId: facBSIT2.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,8), targetDate: d(2026,6,22), category: 'Student Affairs', taskDescription: 'Advise 4th year students on thesis topic selection', priority: 'Medium', status: 'Completed', progress: 100, remarks: '15 groups approved', evidenceLink: '', userId: facBSIT2.id } });

  // Angelica Torres (June)
  await prisma.task.create({ data: { entryDate: d(2026,6,4), targetDate: d(2026,6,18), category: 'Research', taskDescription: 'Submit full paper for Regional Tourism Research Symposium', priority: 'High', status: 'Completed', progress: 100, remarks: 'Accepted for publication', evidenceLink: 'https://drive.google.com/tourism-paper', userId: facBSTM1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,9), targetDate: d(2026,6,23), category: 'Instruction', taskDescription: 'Complete Tourism Marketing e-modules 4–6', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Uploaded to LMS', evidenceLink: '', userId: facBSTM1.id } });

  // Jerome Navarro (June)
  await prisma.task.create({ data: { entryDate: d(2026,6,3), targetDate: d(2026,6,17), category: 'Extension', taskDescription: 'Facilitate culinary arts demonstration for community', priority: 'Medium', status: 'Completed', progress: 100, remarks: '60 community members participated', evidenceLink: '', userId: facBSTM2.id } });

  // Patricia Mendoza (June) — delayed one
  await prisma.task.create({ data: { entryDate: d(2026,6,5), targetDate: d(2026,6,8), category: 'Instruction', taskDescription: 'Submit GE 101 final exam questionnaire', priority: 'High', status: 'Completed', progress: 100, remarks: 'Submitted late due to illness', evidenceLink: '', userId: facGEd1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,12), targetDate: d(2026,6,26), category: 'Research', taskDescription: 'Submit research proposal on Gender Responsiveness in GE curriculum', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Approved', evidenceLink: '', userId: facGEd1.id } });

  // Dante Quizon (June)
  await prisma.task.create({ data: { entryDate: d(2026,6,6), targetDate: d(2026,6,20), category: 'Instruction', taskDescription: 'Finalize SHS grade encoding for all sections', priority: 'High', status: 'Completed', progress: 100, remarks: 'Submitted to registrar', evidenceLink: 'https://drive.google.com/grades-shs', userId: facSHS1.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,11), targetDate: d(2026,6,25), category: 'HQ Syllabus', taskDescription: 'Update ABM strand syllabi for upcoming semester', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Filed with department', evidenceLink: '', userId: facSHS1.id } });

  // Program Heads (June)
  await prisma.task.create({ data: { entryDate: d(2026,6,5), targetDate: d(2026,6,19), category: 'Monitoring', taskDescription: 'Conduct mid-year faculty performance review for BSIT', priority: 'High', status: 'Completed', progress: 100, remarks: 'All evaluations completed', evidenceLink: '', userId: headBSIT.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,6), targetDate: d(2026,6,20), category: 'Curriculum', taskDescription: 'Prepare BSTM accreditation self-study guide Chapter 3', priority: 'High', status: 'Completed', progress: 100, remarks: 'Submitted to principal', evidenceLink: '', userId: headBSTM.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,7), targetDate: d(2026,6,21), category: 'Assessment', taskDescription: 'Submit Gen Ed Q2 accomplishment report', priority: 'High', status: 'Completed', progress: 100, remarks: 'On time', evidenceLink: '', userId: headGEd.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,8), targetDate: d(2026,6,22), category: 'Faculty Dev', taskDescription: 'Coordinate SHS faculty in-house training on senior high pedagogy', priority: 'Medium', status: 'Completed', progress: 100, remarks: 'Training completed', evidenceLink: '', userId: headSHS.id } });

  // Principal & Staff (June)
  await prisma.task.create({ data: { entryDate: d(2026,6,3), targetDate: d(2026,6,17), category: 'Administration', taskDescription: 'Prepare school mid-year report for submission to DepEd', priority: 'High', status: 'Completed', progress: 100, remarks: 'Submitted on time', evidenceLink: '', userId: principal.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,8), targetDate: d(2026,6,22), category: 'Monitoring', taskDescription: 'Conduct classroom observation rounds BSIT and Gen Ed', priority: 'High', status: 'Completed', progress: 100, remarks: 'All visited', evidenceLink: '', userId: principal.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,4), targetDate: d(2026,6,18), category: 'Records', taskDescription: 'Archive graduation documents AY 2025-2026', priority: 'High', status: 'Completed', progress: 100, remarks: 'All records filed', evidenceLink: '', userId: staffRosario.id } });
  await prisma.task.create({ data: { entryDate: d(2026,6,5), targetDate: d(2026,6,19), category: 'Compliance', taskDescription: 'Prepare CHED compliance checklist for mid-year audit', priority: 'High', status: 'Completed', progress: 100, remarks: 'Submitted for review', evidenceLink: '', userId: staffErnesto.id } });

  // ═══════════════════════════════════════════════
  // TASKS — JULY 2026 (current month — mix of statuses)
  // ═══════════════════════════════════════════════

  const now = new Date();
  const future = (days) => new Date(now.getTime() + days * 86400000);
  const past   = (days) => new Date(now.getTime() - days * 86400000);

  // Faculty BSIT — July (newly nominated / ongoing / delayed)
  await prisma.task.create({ data: { entryDate: new Date(), targetDate: future(14), category: 'HQ Syllabus', taskDescription: 'Prepare updated course syllabus for CS 301 – Data Structures', priority: 'High', status: 'Awaiting Approval', progress: 0, remarks: 'Needs alignment with CHED CMO', evidenceLink: '', userId: facBSIT1.id } });
  await prisma.task.create({ data: { entryDate: past(5), targetDate: future(10), category: 'Student Affairs', taskDescription: 'Facilitate enrolment assistance for irregular students', priority: 'Medium', status: 'Ongoing', progress: 50, remarks: '45 students processed so far', evidenceLink: '', userId: facBSIT1.id } });
  await prisma.task.create({ data: { entryDate: past(3), targetDate: future(7), category: 'Instruction', taskDescription: 'Conduct mid-term practical examination for CC 201', priority: 'High', status: 'Awaiting Approval', progress: 0, remarks: '', evidenceLink: '', userId: facBSIT2.id } });
  await prisma.task.create({ data: { entryDate: past(20), targetDate: past(2), category: 'Instruction', taskDescription: 'Finalize and submit final grade encoding for all sections', priority: 'High', status: 'Awaiting Approval', progress: 100, remarks: 'All grades submitted to registrar', evidenceLink: 'https://drive.google.com/sample-grades', userId: facBSIT2.id } });

  // Faculty BSTM — July
  await prisma.task.create({ data: { entryDate: new Date(), targetDate: future(10), category: 'Research', taskDescription: 'Submit abstract for Regional Tourism Research Symposium 2026', priority: 'Medium', status: 'Awaiting Approval', progress: 0, remarks: 'Deadline is Aug 15', evidenceLink: '', userId: facBSTM1.id } });
  await prisma.task.create({ data: { entryDate: past(10), targetDate: past(3), category: 'Admin', taskDescription: 'Attendance monitoring (duplicate entry — requesting removal)', priority: 'Low', status: 'Awaiting Deletion', progress: 0, remarks: 'Duplicate of another task.', evidenceLink: '', userId: facBSTM1.id } });
  await prisma.task.create({ data: { entryDate: past(3), targetDate: future(21), category: 'Instruction', taskDescription: 'Develop e-learning modules for Tourism Marketing subject', priority: 'High', status: 'Ongoing', progress: 40, remarks: 'Module 1–3 complete', evidenceLink: '', userId: facBSTM2.id } });

  // Faculty Gen Ed — July
  await prisma.task.create({ data: { entryDate: past(8), targetDate: future(5), category: 'Extension', taskDescription: 'Organize literacy program for Brgy. San Isidro outreach', priority: 'Medium', status: 'Ongoing', progress: 75, remarks: 'Awaiting venue confirmation', evidenceLink: '', userId: facGEd1.id } });
  await prisma.task.create({ data: { entryDate: past(15), targetDate: past(5), category: 'Instruction', taskDescription: 'Complete instructional materials for NSTP 101', priority: 'Medium', status: 'Delayed', progress: 30, remarks: 'Pending approval from resource center', evidenceLink: '', userId: facGEd1.id } });

  // Faculty SHS — July
  await prisma.task.create({ data: { entryDate: past(3), targetDate: future(14), category: 'Instruction', taskDescription: 'Prepare ABM strand mid-term examination for all subjects', priority: 'High', status: 'Ongoing', progress: 60, remarks: 'Eng and Math done', evidenceLink: '', userId: facSHS1.id } });

  // Program Heads — July  
  await prisma.task.create({ data: { entryDate: new Date(), targetDate: future(30), category: 'Curriculum', taskDescription: 'Review and update BSIT program curriculum per CHED memo', priority: 'High', status: 'Awaiting Approval', progress: 0, remarks: 'For submission to Principal before end of month', evidenceLink: '', userId: headBSIT.id } });
  await prisma.task.create({ data: { entryDate: past(7), targetDate: future(14), category: 'Faculty Development', taskDescription: 'Coordinate BSTM faculty seminar on Sustainable Tourism practices', priority: 'Medium', status: 'Ongoing', progress: 60, remarks: 'Speaker confirmed, venue booked', evidenceLink: '', userId: headBSTM.id } });
  await prisma.task.create({ data: { entryDate: past(25), targetDate: past(3), category: 'Assessment', taskDescription: 'Submit Gen Ed department performance report Q2', priority: 'High', status: 'Awaiting Approval', progress: 100, remarks: 'Report compiled and ready for Principal review', evidenceLink: 'https://drive.google.com/ged-q2', userId: headGEd.id } });
  await prisma.task.create({ data: { entryDate: past(5), targetDate: future(20), category: 'Monitoring', taskDescription: 'Conduct SHS faculty classroom observation Round 2', priority: 'Medium', status: 'Ongoing', progress: 35, remarks: '3 of 6 faculty visited', evidenceLink: '', userId: headSHS.id } });

  // Principal — July
  await prisma.task.create({ data: { entryDate: new Date(), targetDate: future(45), category: 'Administration', taskDescription: 'Prepare school improvement plan for academic year 2025-2026', priority: 'High', status: 'Awaiting Approval', progress: 0, remarks: 'For School Administrator approval', evidenceLink: '', userId: principal.id } });
  await prisma.task.create({ data: { entryDate: past(10), targetDate: future(20), category: 'Monitoring', taskDescription: 'Conduct classroom observation rounds for all departments', priority: 'Medium', status: 'Ongoing', progress: 45, remarks: 'BSIT and BSTM completed', evidenceLink: '', userId: principal.id } });

  // Admin Staff — July
  await prisma.task.create({ data: { entryDate: new Date(), targetDate: future(7), category: 'Records', taskDescription: 'Digitize student admission records for AY 2024-2025 batches 51-100', priority: 'High', status: 'Awaiting Approval', progress: 0, remarks: 'Awaiting School Admin approval to start', evidenceLink: '', userId: staffRosario.id } });
  await prisma.task.create({ data: { entryDate: past(4), targetDate: future(10), category: 'Compliance', taskDescription: 'Update enrollment statistics for CHED submission Q2', priority: 'High', status: 'Ongoing', progress: 65, remarks: 'Undergraduate data done, graduate pending', evidenceLink: '', userId: staffErnesto.id } });

  console.log('✅ All tasks seeded.\n');
  console.log('════════════════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETE! All accounts → password: password123');
  console.log('════════════════════════════════════════════════════════');
  console.log('  SCHOOL ADMIN : admin         (Michael Kim Palay)');
  console.log('  PRINCIPAL    : principal     (Marisol Aguinaldo)');
  console.log('  HEAD BSIT    : fcastillo     (Fernando Castillo)');
  console.log('  HEAD BSTM    : gespiritu     (Gloria Espiritu)');
  console.log('  HEAD GEN ED  : rvaldez       (Ramon Valdez)');
  console.log('  HEAD SHS     : creyes        (Corazon Reyes)');
  console.log('  FACULTY BSIT : msantos       (Miguel Santos)');
  console.log('  FACULTY BSIT : ldomingo      (Lourdes Domingo)');
  console.log('  FACULTY BSTM : atorres       (Angelica Torres)');
  console.log('  FACULTY BSTM : jnavarro      (Jerome Navarro)');
  console.log('  FACULTY GENED: pmendoza      (Patricia Mendoza)');
  console.log('  FACULTY SHS  : dquizon       (Dante Quizon)');
  console.log('  ADMIN STAFF  : rmagtanggol   (Rosario Magtanggol)');
  console.log('  ADMIN STAFF  : evillanueva   (Ernesto Villanueva)');
  console.log('════════════════════════════════════════════════════════');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
