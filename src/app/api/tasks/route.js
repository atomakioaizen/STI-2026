import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

function getDateFilterForTimeframe(timeframe) {
  const now = new Date();
  const start = new Date();
  
  if (timeframe === 'daily') {
    start.setHours(0, 0, 0, 0);
    return { gte: start };
  } else if (timeframe === 'weekly') {
    const day = now.getDay();
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return { gte: start };
  } else if (timeframe === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { gte: start };
  } else if (timeframe === 'yearly') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return { gte: start };
  }
  return null;
}

async function populateNominators(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return tasks;
  const nominatedIds = Array.from(new Set(tasks.map(t => t.nominatedById).filter(Boolean)));
  if (nominatedIds.length === 0) return tasks;

  const nominators = await prisma.user.findMany({
    where: { id: { in: nominatedIds } },
    select: { id: true, name: true, position: true, role: true }
  });

  const map = new Map(nominators.map(n => [n.id, n]));
  tasks.forEach(t => {
    if (t.nominatedById) {
      t.nominatedBy = map.get(t.nominatedById) || null;
    } else {
      t.nominatedBy = null;
    }
  });
  return tasks;
}

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const departmentId = searchParams.get('departmentId');
    const userIdQuery = searchParams.get('userId');
    const search = searchParams.get('search');
    const timeframe = searchParams.get('timeframe');

    const where = {};

    // 1. Role-based baseline visibility limits
    if (user.role === 'FACULTY_STAFF') {
      // Faculty/Staff can only see their own tasks
      where.userId = user.userId;
    } else if (user.role === 'PROGRAM_HEAD') {
      // Program Heads see tasks belonging to FACULTY_STAFF in their department, OR their own tasks (their nominated tasks)
      where.OR = [
        {
          user: {
            departmentId: user.departmentId,
            role: 'FACULTY_STAFF'
          }
        },
        {
          userId: user.userId
        }
      ];
    } else if (user.role === 'PRINCIPAL') {
      // Principal can see all academic departments (non-Admin) OR her own tasks
      const currentUserId = user.userId || user.id;
      where.OR = [
        { userId: currentUserId },
        {
          user: {
            department: {
              name: { not: 'Admin' }
            }
          }
        }
      ];
    } else if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN') {
      // School Administrator has full visibility across all departments
      // No baseline filters applied
    }

    // 2. Apply department filter if explicitly selected
    if (departmentId && departmentId !== 'All') {
      const parsedDeptId = parseInt(departmentId, 10);
      
      if (user.role === 'PRINCIPAL') {
        // Principal cannot query Admin department
        const targetDept = await prisma.department.findUnique({ where: { id: parsedDeptId } });
        if (targetDept && targetDept.name !== 'Admin') {
          delete where.OR;
          where.user = {
            departmentId: parsedDeptId
          };
        } else {
          // If trying to access Admin, return empty
          delete where.OR;
          where.user = {
            id: -1 // Matches nothing
          };
        }
      } else if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN') {
        where.user = {
          departmentId: parsedDeptId
        };
      }
    }

    // 3. Apply user filter
    if (userIdQuery && userIdQuery !== 'All') {
      const parsedUserId = parseInt(userIdQuery, 10);
      const currentUserId = user.userId || user.id;
      
      if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN') {
        where.userId = parsedUserId;
      } else if (user.role === 'PRINCIPAL') {
        // Principal can filter users that do not belong to Admin department OR herself
        delete where.OR;
        if (parsedUserId === currentUserId) {
          where.userId = parsedUserId;
        } else {
          const targetUser = await prisma.user.findUnique({
            where: { id: parsedUserId },
            include: { department: true }
          });
          if (targetUser && targetUser.department?.name !== 'Admin') {
            where.userId = parsedUserId;
          } else {
            where.userId = -1; // Matches nothing
          }
        }
      } else if (user.role === 'PROGRAM_HEAD') {
        // Program Heads can view their own tasks or faculty in their department
        delete where.OR;
        if (parsedUserId === currentUserId) {
          where.userId = parsedUserId;
        } else {
          const targetUser = await prisma.user.findUnique({ where: { id: parsedUserId } });
          if (targetUser && targetUser.departmentId === user.departmentId && targetUser.role === 'FACULTY_STAFF') {
            where.userId = parsedUserId;
          } else {
            where.userId = -1; // Matches nothing
          }
        }
      }
    }

    // 4. Apply status and priority filters
    if (status && status !== 'All') {
      where.status = status;
    }
    if (priority && priority !== 'All') {
      where.priority = priority;
    }

    // Archived filter: default to archived = false
    const archivedParam = searchParams.get('archived');
    if (archivedParam === 'true') {
      where.OR = [
        { archived: true },
        { status: 'Completed' }
      ];
    } else if (archivedParam === 'all') {
      // Do not filter by archived
    } else {
      where.archived = false;
      where.status = { not: 'Completed' };
    }

    // 5. Apply timeframe date filters
    if (timeframe && timeframe !== 'All') {
      const dateFilter = getDateFilterForTimeframe(timeframe);
      if (dateFilter) {
        where.entryDate = dateFilter;
      }
    }

    // 6. Apply search query
    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      const searchConditions = [
        { taskDescription: { contains: cleanSearch } },
        { category: { contains: cleanSearch } },
        {
          user: {
            name: { contains: cleanSearch }
          }
        }
      ];

      // Merge with where clauses cleanly
      if (where.OR) {
        // If we already have OR conditions (e.g. Program Head portal visibility), handle it
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Execute query
    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            position: true,
            role: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        entryDate: 'desc'
      }
    });

    await populateNominators(tasks);

    // Auto-flag overdue tasks as Delayed
    const now = new Date();
    const overdueIds = tasks
      .filter(t =>
        t.targetDate &&
        new Date(t.targetDate) < now &&
        (t.status === 'Ongoing' || t.status === 'Not Started')
      )
      .map(t => t.id);

    if (overdueIds.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'Delayed' }
      });
      // Reflect the change in the response
      tasks.forEach(t => {
        if (overdueIds.includes(t.id)) t.status = 'Delayed';
      });
    }

    return NextResponse.json({ success: true, tasks });

  } catch (error) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json(
      { error: 'An error occurred fetching tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      category,
      taskDescription,
      priority,
      targetDate,
      progress,
      remarks,
      evidenceLink,
      userId,
      userIds
    } = await request.json();

    if (!category || !taskDescription || !priority || !targetDate) {
      return NextResponse.json(
        { error: 'Category, description, priority, and target date are required' },
        { status: 400 }
      );
    }

    const currentUserId = parseInt(user.userId || user.id, 10);

    let targetOwnerIds = [];
    if (Array.isArray(userIds) && userIds.length > 0) {
      targetOwnerIds = userIds
        .map(id => (typeof id === 'object' && id !== null ? (id.id || id.userId) : id))
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id) && id > 0);
    } else if (userId && !isNaN(parseInt(userId, 10))) {
      const parsed = parseInt(userId, 10);
      if (parsed > 0) targetOwnerIds = [parsed];
    }

    if (targetOwnerIds.length === 0 && currentUserId) {
      targetOwnerIds = [currentUserId].filter(id => !isNaN(id) && id > 0);
    }

    // Role-based authority validation for requested user IDs
    let targetUsers = await prisma.user.findMany({
      where: { id: { in: targetOwnerIds } },
      include: { department: true }
    });

    if (targetUsers.length === 0 && currentUserId) {
      // Fallback: If requested IDs returned no users (e.g. stale front-end selection), try current user
      targetUsers = await prisma.user.findMany({
        where: { id: currentUserId },
        include: { department: true }
      });
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: 'No valid target users selected' }, { status: 400 });
    }

    // Filter target users based on authority limits
    const validTargetUsers = targetUsers.filter(targetUser => {
      if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN') return true;
      if (user.role === 'PRINCIPAL') {
        return Number(targetUser.id) === currentUserId || targetUser.department?.name !== 'Admin';
      }
      if (user.role === 'PROGRAM_HEAD') {
        return Number(targetUser.id) === currentUserId || targetUser.departmentId === user.departmentId;
      }
      return Number(targetUser.id) === currentUserId;
    });

    if (validTargetUsers.length === 0) {
      return NextResponse.json({ error: 'Forbidden assignment for selected user(s)' }, { status: 403 });
    }

    const createdTasks = [];
    const { logActivity } = await import('@/lib/activity');

    for (const targetUser of validTargetUsers) {
      const isSelfAssignment = Number(targetUser.id) === currentUserId;
      let isAuthority = false;

      if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN') {
        isAuthority = true;
      } else if (user.role === 'PRINCIPAL') {
        const isStaff = targetUser.role === 'FACULTY_STAFF' && targetUser.department?.name === 'Admin';
        if (!isSelfAssignment && !isStaff) {
          isAuthority = true;
        }
      } else if (user.role === 'PROGRAM_HEAD') {
        if (!isSelfAssignment && targetUser.role === 'FACULTY_STAFF' && targetUser.departmentId === user.departmentId) {
          isAuthority = true;
        }
      }

      let status = 'Not Started';
      let initialProgress = progress ? parseInt(progress, 10) : 0;
      
      if (isAuthority) {
        if (!isSelfAssignment) {
          status = 'Pending Acceptance';
          initialProgress = 0;
        } else {
          if (initialProgress === 100) {
            status = 'Completed';
          } else {
            status = 'Ongoing';
          }
        }
      } else if (isSelfAssignment && user.role === 'PRINCIPAL') {
        if (initialProgress === 100) {
          status = 'Completed';
        } else {
          status = 'Ongoing';
        }
      } else {
        status = 'Awaiting Approval';
        initialProgress = 0;
      }

      const isArchived = (status === 'Completed');
      let finalRemarks = remarks ? remarks.trim() : '';

      // If team deliverable (multiple assignees), append co-assignees log
      if (validTargetUsers.length > 1) {
        const coAssigneeNames = validTargetUsers.filter(x => Number(x.id) !== Number(targetUser.id)).map(x => x.name).join(', ');
        if (coAssigneeNames) {
          const teamMsg = `Team Deliverable: Co-assigned with ${coAssigneeNames}`;
          let messages = [];
          if (finalRemarks) {
            try {
              messages = JSON.parse(finalRemarks);
              if (!Array.isArray(messages)) messages = [{ sender: 'System', role: 'SYSTEM', message: finalRemarks, timestamp: new Date().toISOString() }];
            } catch(e) {
              messages = [{ sender: 'System', role: 'SYSTEM', message: finalRemarks, timestamp: new Date().toISOString() }];
            }
          }
          messages.push({ sender: 'System', role: 'SYSTEM', message: teamMsg, timestamp: new Date().toISOString() });
          finalRemarks = JSON.stringify(messages);
        }
      }

      const task = await prisma.task.create({
        data: {
          entryDate: new Date(),
          targetDate: targetDate ? new Date(targetDate) : null,
          category: category.trim(),
          taskDescription: taskDescription.trim(),
          priority,
          status,
          progress: initialProgress,
          remarks: finalRemarks,
          evidenceLink: evidenceLink ? evidenceLink.trim() : '',
          archived: isArchived,
          userId: targetUser.id,
          nominatedById: !isSelfAssignment ? currentUserId : null
        },
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

      await logActivity(currentUserId, 'CREATE_TASK', `Created task "${task.taskDescription.substring(0, 50)}" for user "${targetUser.name}"`);
      createdTasks.push(task);
    }

    await populateNominators(createdTasks);

    return NextResponse.json({ success: true, tasks: createdTasks, task: createdTasks[0] });

  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'An error occurred creating the task' },
      { status: 500 }
    );
  }
}
