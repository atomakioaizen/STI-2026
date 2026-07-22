require('dotenv').config();
const { prisma } = require('../src/lib/db.js');

async function testWorkflow() {
  console.log('Testing Lloyd 100% progress update workflow...');
  
  // Find Lloyd
  const lloyd = await prisma.user.findFirst({ where: { username: 'lloyd_lomoljo' } });
  if (!lloyd) {
    console.log('Lloyd not found');
    return;
  }
  
  // Find a task owned by Lloyd that is nominated by someone else (or create mock)
  let task = await prisma.task.findFirst({
    where: { userId: lloyd.id, nominatedById: { not: null } }
  });
  
  if (!task) {
    console.log('Creating a test nominated task for Lloyd...');
    const admin = await prisma.user.findFirst({ where: { role: 'SCHOOL_ADMIN' } });
    task = await prisma.task.create({
      data: {
        category: 'Test Task',
        taskDescription: 'Test deliverable for Lloyd',
        priority: 'Medium',
        status: 'Ongoing',
        progress: 50,
        userId: lloyd.id,
        nominatedById: admin ? admin.id : null,
        entryDate: new Date()
      }
    });
  } else {
    // Reset to Ongoing 50%
    task = await prisma.task.update({
      where: { id: task.id },
      data: { status: 'Ongoing', progress: 50, archived: false, previousProgress: null }
    });
  }
  
  console.log('Initial task status:', task.status, 'progress:', task.progress, 'archived:', task.archived);

  // Now simulate what PATCH /api/tasks/[id] does when Lloyd submits 100% progress:
  // User is Lloyd (user.userId = lloyd.id, user.role = 'PROGRAM_HEAD')
  // task.userId = lloyd.id
  // isOwner = true, isAuthority = false
  
  const updates = { progress: 100 };
  const data = {};
  
  const isOwner = Number(task.userId) === Number(lloyd.id);
  const isAuthority = false; // Lloyd updating his own assigned task nominated by supervisor
  
  if (isOwner) {
    if ((updates.progress !== undefined && parseInt(updates.progress, 10) !== task.progress) || updates.status === 'Completed') {
      data.status = 'Awaiting Approval';
      data.previousProgress = task.progress;
      data.rejectionReason = null;
      data.progress = parseInt(updates.progress, 10);
    }
  }

  if (data.status === 'Completed') {
    data.progress = 100;
    data.archived = true;
    data.previousProgress = null;
  }
  
  console.log('Resulting data payload for DB update:', data);

  const updated = await prisma.task.update({
    where: { id: task.id },
    data
  });

  console.log('UPDATED TASK IN DB:');
  console.log('  Status:', updated.status);
  console.log('  Progress:', updated.progress, '%');
  console.log('  Previous Progress:', updated.previousProgress, '%');
  console.log('  Archived:', updated.archived);
  
  if (updated.status === 'Awaiting Approval' && updated.archived === false) {
    console.log('✅ SUCCESS! Task is now Awaiting Approval and NOT archived!');
  } else {
    console.log('❌ FAILED! Task status is:', updated.status, 'Archived:', updated.archived);
  }
}

testWorkflow().then(() => prisma.$disconnect()).catch(err => console.error(err));
