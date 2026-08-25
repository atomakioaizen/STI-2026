import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getTaskDelayDays } from '@/lib/taskHelpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


function appendMessage(existingRemarks, senderName, senderRole, text) {
  let messages = [];
  if (existingRemarks) {
    try {
      const parsed = JSON.parse(existingRemarks);
      if (Array.isArray(parsed)) {
        messages = parsed;
      } else {
        messages = [{ sender: 'System', role: 'SYSTEM', message: existingRemarks, timestamp: new Date().toISOString() }];
      }
    } catch (e) {
      messages = [{ sender: 'System', role: 'SYSTEM', message: existingRemarks, timestamp: new Date().toISOString() }];
    }
  }
  
  if (text && text.trim()) {
    messages.push({
      sender: senderName,
      role: senderRole,
      message: text.trim(),
      timestamp: new Date().toISOString()
    });
  }
  return JSON.stringify(messages);
}

async function populateNominators(tasks) {
  const list = Array.isArray(tasks) ? tasks : [tasks];
  const nominatedIds = Array.from(new Set(list.map(t => t?.nominatedById).filter(Boolean)));
  if (nominatedIds.length === 0) return tasks;

  const nominators = await prisma.user.findMany({
    where: { id: { in: nominatedIds } },
    select: { id: true, name: true, position: true, role: true }
  });

  const map = new Map(nominators.map(n => [n.id, n]));
  list.forEach(t => {
    if (t && t.nominatedById) {
      t.nominatedBy = map.get(t.nominatedById) || null;
    } else if (t) {
      t.nominatedBy = null;
    }
  });
  return tasks;
}

export async function PATCH(request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: true
      }
    });

    if (task) {
      await populateNominators(task);
    }

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Baseline Access Control Checks
    let hasAccess = false;
    const currentUserId = user.userId || user.id;

    if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN' || user.role === 'SECRETARY') {
      hasAccess = true;
    } else if (user.role === 'PRINCIPAL') {
      // Principal has access to her own tasks OR tasks across academic departments (non-Admin)
      const targetUser = task.user;
      const ownerDept = targetUser.departmentId ? await prisma.department.findUnique({ where: { id: targetUser.departmentId } }) : null;
      if (Number(task.userId) === Number(currentUserId) || (targetUser && ownerDept?.name !== 'Admin')) {
        hasAccess = true;
      }
    } else if (user.role === 'PROGRAM_HEAD') {
      // Program Heads have access to tasks of Faculty (FACULTY_STAFF) in their department, OR their own tasks
      if (Number(task.userId) === Number(currentUserId) || (task.user.departmentId === user.departmentId && task.user.role === 'FACULTY_STAFF')) {
        hasAccess = true;
      }
    } else if (user.role === 'FACULTY_STAFF') {
      // Faculty/Staff can only access their own tasks
      if (Number(task.userId) === Number(currentUserId)) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await request.json();
    const data = {};
    let currentRemarks = task.remarks;

    // Delay Monitoring Enforcement: Block 100% Completion if 3+ days delayed and notice/reply incomplete
    const isCompletingAttempt = (updates.progress !== undefined && parseInt(updates.progress, 10) === 100) || updates.status === 'Completed';

    if (isCompletingAttempt) {
      const delayDays = getTaskDelayDays(task);
      if (delayDays >= 3) {
        let remarksList = [];
        if (task.remarks) {
          try {
            const parsed = JSON.parse(task.remarks);
            if (Array.isArray(parsed)) remarksList = parsed;
          } catch(e){}
        }

        const adminNoticeEntry = remarksList.find(m => 
          (m.message || '').includes('[ADMIN_ESCALATION]') || 
          (m.message || '').includes('[ADMIN_NOTICE]') || 
          (m.message || '').includes('[SUPERVISOR_ACTION]')
        );
        const userReplyEntry = remarksList.find(m => 
          (m.message || '').includes('[USER_REPLY]') || 
          (m.message || '').includes('[STAFF_REPLY]')
        );

        if (!adminNoticeEntry) {
          return NextResponse.json({
            error: 'DELAY_NOTICE_REQUIRED',
            code: 'DELAY_NOTICE_REQUIRED',
            delayDays: delayDays,
            message: `Task Completion Blocked: This activity has a delay of ${delayDays} days and is subject to Delay Monitoring. Please wait for the School Administrator to issue a formal Justification or Notice to Explain (NTE) request before completing this activity.`
          }, { status: 400 });
        }

        if (!userReplyEntry) {
          return NextResponse.json({
            error: 'USER_REPLY_REQUIRED',
            code: 'USER_REPLY_REQUIRED',
            delayDays: delayDays,
            message: `Task Completion Blocked: A formal Notice / Justification request has been issued by the School Administrator for this delayed activity. You must submit your reply and attach your repository letter document in the Delay Monitoring panel before marking this activity as 100% complete.`
          }, { status: 400 });
        }
      }
    }

    if (updates.category !== undefined) data.category = updates.category.trim();
    if (updates.taskDescription !== undefined) data.taskDescription = updates.taskDescription.trim();
    if (updates.priority !== undefined) data.priority = updates.priority;
    if (updates.evidenceLink !== undefined) data.evidenceLink = updates.evidenceLink.trim();
    if (updates.targetDate !== undefined) {
      data.targetDate = updates.targetDate ? new Date(updates.targetDate) : null;
    }
    if (updates.rejectionReason !== undefined) data.rejectionReason = updates.rejectionReason ? updates.rejectionReason.trim() : null;
    if (updates.assignedNote !== undefined) data.assignedNote = updates.assignedNote ? updates.assignedNote.trim() : null;
    if (updates.rejectionCount !== undefined) data.rejectionCount = parseInt(updates.rejectionCount, 10);

    // Determine supervising authority
    let isAuthority = false;
    const targetUser = task.user;

    if (user.role === 'SCHOOL_ADMIN') {
      isAuthority = true;
    } else if (user.role === 'PRINCIPAL') {
      const ownerDept = targetUser.departmentId ? await prisma.department.findUnique({ where: { id: targetUser.departmentId } }) : null;
      const isStaff = targetUser.role === 'FACULTY_STAFF' && ownerDept?.name === 'Admin';
      if (targetUser.id !== user.userId && !isStaff) {
        isAuthority = true;
      }
    } else if (user.role === 'PROGRAM_HEAD') {
      if (targetUser.id !== user.userId && targetUser.role === 'FACULTY_STAFF' && targetUser.departmentId === user.departmentId) {
        isAuthority = true;
      }
    }

    // Determine owner vs supervisor role
    const isOwner = Number(task.userId) === Number(user.userId);

    // Progress and Status flow control
    if (isOwner) {
      // Subordinate / Task Owner Actions
      
      // 1. Check if already awaiting approval or deletion to prevent double submissions
      if (task.status === 'Awaiting Approval' && (updates.status === 'Completed' || (updates.progress !== undefined && parseInt(updates.progress, 10) !== task.progress))) {
        return NextResponse.json(
          { error: 'This task is already awaiting approval. Please wait for your supervisor to review it.' },
          { status: 409 }
        );
      }

      // 2. Deletion Request
      if (updates.status === 'Awaiting Deletion') {
        data.status = 'Awaiting Deletion';
      }
      // 3. Accept Nomination
      else if ((updates.status === 'Ongoing' || updates.status === 'Not Started') && task.status === 'Pending Acceptance') {
        data.status = 'Ongoing';
        data.rejectionReason = null;
        currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `Task nomination accepted by ${user.name}. Status is now Ongoing.`);

        if (task.nominatedById && Number(task.nominatedById) !== Number(currentUserId)) {
          await prisma.activityLog.create({
            data: {
              userId: task.nominatedById,
              action: 'TASK_ACCEPTED',
              details: JSON.stringify({
                taskId: task.id,
                taskDescription: task.taskDescription,
                assigneeName: user.name,
                assigneeRole: user.role
              })
            }
          });
        }
      }
      // 4. Reject Nomination
      else if (updates.status === 'Rejected' && task.status === 'Pending Acceptance') {
        const reason = updates.rejectionReason || updates.remarks;
        if (!reason || !reason.trim()) {
          return NextResponse.json({ error: 'Rejection reason is mandatory.' }, { status: 400 });
        }
        data.status = 'Rejected';
        data.rejectionReason = reason.trim();
        data.rejectionCount = (task.rejectionCount || 0) + 1;

        if (task.nominatedById && Number(task.nominatedById) !== Number(currentUserId)) {
          await prisma.activityLog.create({
            data: {
              userId: task.nominatedById,
              action: 'TASK_REJECTED',
              details: JSON.stringify({
                taskId: task.id,
                taskDescription: task.taskDescription,
                assigneeName: user.name,
                assigneeRole: user.role,
                rejectionReason: reason.trim()
              })
            }
          });
        }
      }
      // 5. Acknowledge Progress Rejection (Revert to Ongoing)
      else if (updates.status === 'Ongoing' && task.status === 'Rejected') {
        data.status = 'Ongoing';
        data.rejectionReason = null;
        currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `${user.name} acknowledged progress rejection. Task returned to Ongoing.`);
      }
      // 6. Progress Change or Status update
      else if (
        (updates.progress !== undefined && parseInt(updates.progress, 10) !== task.progress) ||
        (updates.status !== undefined && updates.status !== task.status)
      ) {
        if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN') {
          // School Administrator is the highest authority — progress updates take effect directly
          const newProg = updates.progress !== undefined ? parseInt(updates.progress, 10) : task.progress;
          const isDone = newProg === 100 || updates.status === 'Completed';
          data.progress = newProg;
          data.status = isDone ? 'Completed' : (updates.status && updates.status !== 'Completed' ? updates.status : 'Ongoing');
          data.archived = isDone;
          data.previousProgress = task.progress;
          data.rejectionReason = null;
        } else {
          // Principal, Program Heads, and Faculty require supervisor approval
          data.status = 'Awaiting Approval';
          data.previousProgress = task.progress;
          data.rejectionReason = null;
          if (updates.progress !== undefined) {
            data.progress = parseInt(updates.progress, 10);
          } else {
            data.progress = task.progress;
          }
        }
      }

      // 7. Subordinate editing a currently Rejected task (resubmitting)
      if (task.status === 'Rejected' && !data.status) {
        if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN') {
          data.status = 'Ongoing';
          data.rejectionReason = null;
        } else {
          data.status = 'Awaiting Approval';
          data.previousProgress = task.progress;
          data.rejectionReason = null;
          currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `${user.name} resubmitted the task after rejection.`);
        }
      }
    } else if (isAuthority) {
      // Supervising Authority Actions
      if (updates.status !== undefined) {
        if (updates.status === 'Rejected') {
          // Rejection of progress request or deletion request
          const reason = updates.remarks || updates.rejectionReason;
          if (!reason || !reason.trim()) {
            return NextResponse.json({ error: 'Rejection reason is mandatory.' }, { status: 400 });
          }

          if (task.status === 'Awaiting Approval') {
            if (task.previousProgress === null) {
              // Scenario B: Newly created self-nomination rejection -> Delete directly!
              await prisma.activityLog.create({
                data: {
                  userId: task.userId,
                  action: 'REJECTED_DELETED',
                  details: JSON.stringify({
                    taskDescription: task.taskDescription,
                    remarks: reason.trim(),
                    supervisorName: user.name
                  })
                }
              });

              await prisma.task.delete({
                where: { id: task.id }
              });

              return NextResponse.json({ success: true, deleted: true, message: 'Self-nomination rejected and task deleted directly.' });
            } else {
              // Scenario A: Progress update rejection -> Revert to Ongoing!
              data.status = 'Ongoing';
              data.progress = task.previousProgress;
              data.previousProgress = null;
              data.rejectionReason = reason.trim();
              currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `Supervisor rejected progress update request. Remarks: "${reason.trim()}"`);

              await prisma.activityLog.create({
                data: {
                  userId: task.userId,
                  action: 'PROGRESS_REJECTED',
                  details: JSON.stringify({
                    taskId: task.id,
                    taskDescription: task.taskDescription,
                    supervisorName: user.name,
                    rejectionReason: reason.trim()
                  })
                }
              });
            }
          } else if (task.status === 'Awaiting Deletion') {
            data.status = 'Ongoing';
            data.rejectionReason = reason.trim();
            currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `Supervisor rejected deletion request. Remarks: "${reason.trim()}"`);
          }
        } else {
          const isCompleting = updates.status === 'Completed' || (updates.status === 'Ongoing' && task.status === 'Awaiting Approval' && task.progress === 100);
          data.status = isCompleting ? 'Completed' : updates.status;
          if (isCompleting) {
            data.progress = 100;
            data.archived = true;
            data.previousProgress = null;
            if (task.status === 'Awaiting Approval') {
              currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `Supervisor ${user.name} approved progress completion request.`);
              await prisma.activityLog.create({
                data: {
                  userId: task.userId,
                  action: 'TASK_APPROVED',
                  details: JSON.stringify({
                    taskId: task.id,
                    taskDescription: task.taskDescription,
                    supervisorName: user.name,
                    newStatus: 'Completed',
                    progress: 100
                  })
                }
              });
            } else {
              currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `Supervisor ${user.name} marked task as Completed.`);
            }
          } else if (updates.status === 'Ongoing') {
            data.rejectionReason = null;
            if (task.status === 'Awaiting Approval') {
              currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `Supervisor ${user.name} approved progress update to ${task.progress}%.`);
              await prisma.activityLog.create({
                data: {
                  userId: task.userId,
                  action: 'TASK_APPROVED',
                  details: JSON.stringify({
                    taskId: task.id,
                    taskDescription: task.taskDescription,
                    supervisorName: user.name,
                    newStatus: 'Ongoing',
                    progress: task.progress
                  })
                }
              });
            } else if (task.status === 'Awaiting Deletion') {
              currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `Supervisor ${user.name} rejected deletion request. Task returned to Ongoing.`);
            }
          } else if (updates.status === 'Pending Acceptance') {
            data.status = 'Pending Acceptance';
            data.rejectionReason = null;
            currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `School Administrator ${user.name} approved Principal nomination request. Task delivered to assignee as Pending Acceptance.`);
            await prisma.activityLog.create({
              data: {
                userId: task.userId,
                action: 'TASK_NOMINATED',
                details: JSON.stringify({
                  taskId: task.id,
                  taskDescription: task.taskDescription,
                  supervisorName: user.name
                })
              }
            });
          } else if (updates.status === 'Not Started') {
            data.progress = 0;
            data.rejectionReason = null;
          }
        }
      }

      if (data.status === 'Completed') {
        data.progress = 100;
        data.archived = true;
        data.previousProgress = null;
      }

      // Supervisor editing a currently Rejected task (resubmitting delegated nomination)
      if (task.status === 'Rejected' && !data.status && task.nominatedById !== null) {
        data.status = 'Pending Acceptance';
        data.rejectionReason = null;
        currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `Supervisor updated and resubmitted task nomination to assignee.`);
      }
    }

    // Capture manual user remarks and rejection reasons into chat logs
    let userRemarks = updates.remarks;
    if (data.status === 'Rejected' && (!userRemarks || !userRemarks.trim())) {
      userRemarks = updates.rejectionReason;
    }

    // Force push notes should be logged under the supervisor name
    if (updates.assignedNote !== undefined && updates.assignedNote.trim() !== '') {
      userRemarks = updates.assignedNote;
    }

    if (userRemarks !== undefined && userRemarks.trim() !== '') {
      currentRemarks = appendMessage(currentRemarks, user.name, user.role, userRemarks.trim());
    }

    data.remarks = currentRemarks;

    // Handle task restoration category updates and permissions
    const isRestoring = updates.archived === false || (task.archived && updates.status === 'Ongoing');
    if (isRestoring && (task.archived || task.status === 'Completed')) {
      if (user.role !== 'SCHOOL_ADMIN' && user.role !== 'PRINCIPAL') {
        return NextResponse.json(
          { error: 'Only Principal and School Administrator can restore archived tasks.' },
          { status: 403 }
        );
      }

      if (!task.category.startsWith('[Restored]')) {
        data.category = `[Restored] ${task.category}`;
      }
      data.status = 'Ongoing';
      data.archived = false;
      data.progress = (task.previousProgress !== null && task.previousProgress < 100) ? task.previousProgress : 90;
      data.previousProgress = null;
      currentRemarks = appendMessage(currentRemarks, 'System', 'SYSTEM', `Supervisor ${user.name} restored this task from Archived.`);

      // Create bell notification for task owner
      await prisma.activityLog.create({
        data: {
          userId: task.userId,
          action: 'TASK_RESTORED',
          details: JSON.stringify({
            taskDescription: task.taskDescription,
            supervisorName: user.name,
            supervisorRole: user.role
          })
        }
      });
    }

    if (updates.archived !== undefined) {
      data.archived = !!updates.archived;
    } else if (data.status === 'Completed' && data.archived === undefined) {
      data.archived = true;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            position: true
          }
        }
      }
    });

    await populateNominators(updatedTask);

    const { logActivity } = await import('@/lib/activity');
    let actionType = 'UPDATE_TASK';
    if (data.status === 'Completed') actionType = 'COMPLETE_TASK';
    if (data.archived === true && updates.archived !== undefined) actionType = 'ARCHIVE_TASK';
    await logActivity(user.userId, actionType, `Task "${updatedTask.taskDescription.substring(0, 50)}" owned by ${updatedTask.user?.name} was updated: ${JSON.stringify(data)}`);

    return NextResponse.json({ success: true, task: updatedTask });

  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'An error occurred updating the task' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    let isAuthority = false;
    const targetUser = task.user;

    if (user.role === 'SCHOOL_ADMIN') {
      isAuthority = true;
    } else if (user.role === 'PRINCIPAL') {
      const ownerDept = targetUser.departmentId ? await prisma.department.findUnique({ where: { id: targetUser.departmentId } }) : null;
      const isStaff = targetUser.role === 'FACULTY_STAFF' && ownerDept?.name === 'Admin';
      if (targetUser.id !== user.userId && !isStaff) {
        isAuthority = true;
      }
    } else if (user.role === 'PROGRAM_HEAD') {
      if (targetUser.id !== user.userId && targetUser.role === 'FACULTY_STAFF' && targetUser.departmentId === user.departmentId) {
        isAuthority = true;
      }
    }

    const isNominator = task.nominatedById !== null && Number(task.nominatedById) === Number(user.userId);
    if (isNominator) {
      isAuthority = true;
    }

    const isOwner = Number(task.userId) === Number(user.userId);
    const isSelfNominated = task.nominatedById === null || Number(task.nominatedById) === Number(user.userId);
    const canOwnerDelete = isOwner && (task.status === 'Awaiting Approval' || task.status === 'Awaiting Deletion' || (task.status === 'Rejected' && isSelfNominated));

    // Check if task is archived or completed - ONLY School Admin & Principal can delete archived tasks!
    const isArchivedOrCompleted = task.archived || task.status === 'Completed';
    if (isArchivedOrCompleted) {
      if (user.role !== 'SCHOOL_ADMIN' && user.role !== 'PRINCIPAL') {
        return NextResponse.json(
          { error: 'Only Principal and School Administrator can delete archived tasks.' },
          { status: 403 }
        );
      }
    }

    if (!isAuthority && !canOwnerDelete) {
      return NextResponse.json(
        { error: 'Only your supervising authority can delete this task.' },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    if (isAuthority && Number(task.userId) !== Number(user.userId)) {
      await prisma.activityLog.create({
        data: {
          userId: task.userId,
          action: 'REJECTED_DELETED',
          details: JSON.stringify({
            taskDescription: task.taskDescription,
            remarks: 'Nomination cancelled by supervisor.',
            supervisorName: user.name
          })
        }
      });
    }

    const { logActivity } = await import('@/lib/activity');
    await logActivity(user.userId, 'DELETE_TASK', `Deleted task "${task.taskDescription.substring(0, 50)}" owned by user "${task.user?.name || task.userId}"`);

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });

  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'An error occurred deleting the task' },
      { status: 500 }
    );
  }
}
