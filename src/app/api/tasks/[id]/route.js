import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

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

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Baseline Access Control Checks
    let hasAccess = false;
    if (user.role === 'SCHOOL_ADMIN') {
      hasAccess = true;
    } else if (user.role === 'PRINCIPAL') {
      // Principal has access to everything except Admin department (Staff)
      const targetUser = task.user;
      const ownerDept = targetUser.departmentId ? await prisma.department.findUnique({ where: { id: targetUser.departmentId } }) : null;
      if (targetUser && ownerDept?.name !== 'Admin') {
        hasAccess = true;
      }
    } else if (user.role === 'PROGRAM_HEAD') {
      // Program Heads have access to tasks of Faculty (FACULTY_STAFF) in their department, OR their own tasks
      if (task.userId === user.userId || (task.user.departmentId === user.departmentId && task.user.role === 'FACULTY_STAFF')) {
        hasAccess = true;
      }
    } else if (user.role === 'FACULTY_STAFF') {
      // Faculty/Staff can only access their own tasks
      if (task.userId === user.userId) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await request.json();
    const data = {};

    if (updates.category !== undefined) data.category = updates.category.trim();
    if (updates.taskDescription !== undefined) data.taskDescription = updates.taskDescription.trim();
    if (updates.priority !== undefined) data.priority = updates.priority;
    if (updates.remarks !== undefined) data.remarks = updates.remarks.trim();
    if (updates.evidenceLink !== undefined) data.evidenceLink = updates.evidenceLink.trim();
    if (updates.targetDate !== undefined) {
      data.targetDate = updates.targetDate ? new Date(updates.targetDate) : null;
    }

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

    // Progress and Status flow control
    if (!isAuthority) {
      // Subordinate modifying their own task — CANNOT change status directly
      // The ONLY allowed self-status action is requesting deletion
      if (updates.status !== undefined) {
        if (updates.status === 'Awaiting Deletion') {
          // Allow faculty/staff to request deletion
          data.status = 'Awaiting Deletion';
        } else {
          // ALL other status changes are blocked for subordinates
          return NextResponse.json(
            { error: 'Only your supervising authority can change the status of this task.' },
            { status: 403 }
          );
        }
      }

      if (updates.progress !== undefined) {
        const currentStatus = task.status;
        // Block progress updates if task is already Awaiting Deletion or Completed
        if (currentStatus === 'Awaiting Deletion' || currentStatus === 'Completed') {
          return NextResponse.json(
            { error: 'You cannot update progress on a task that is pending deletion or already completed.' },
            { status: 403 }
          );
        }
        const prog = parseInt(updates.progress, 10);
        data.progress = prog;
        // Auto-set status based on progress
        if (prog === 100) {
          data.status = 'Awaiting Approval'; // Request completion approval
        } else if (prog > 0 && currentStatus === 'Ongoing') {
          data.status = 'Ongoing'; // Stay ongoing
        } else if (currentStatus === 'Awaiting Approval') {
          data.status = 'Awaiting Approval'; // Keep awaiting if not yet approved
        }
        // If 'Not Started' or 'Awaiting Approval' and progress < 100, keep status as-is
      }
    } else {
      // Supervising authority is modifying the task — full control
      if (updates.status !== undefined) {
        data.status = updates.status;
        if (updates.status === 'Completed') {
          data.progress = 100;
        } else if (updates.status === 'Not Started') {
          data.progress = 0;
        }
      }
      if (updates.progress !== undefined) {
        data.progress = parseInt(updates.progress, 10);
        if (data.progress === 100 && !data.status) {
          data.status = 'Completed';
        }
      }
    }

    if (updates.archived !== undefined) {
      data.archived = !!updates.archived;
    } else if (data.status === 'Completed') {
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

    if (!isAuthority) {
      return NextResponse.json(
        { error: 'Only your supervising authority can delete this task.' },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

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
