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
      // Principal can see everything EXCEPT Admin department (Staff)
      where.user = {
        department: {
          name: { not: 'Admin' }
        }
      };
    } else if (user.role === 'SCHOOL_ADMIN') {
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
          where.user = {
            departmentId: parsedDeptId
          };
        } else {
          // If trying to access Admin, return empty
          where.user = {
            id: -1 // Matches nothing
          };
        }
      } else if (user.role === 'SCHOOL_ADMIN') {
        where.user = {
          departmentId: parsedDeptId
        };
      }
    }

    // 3. Apply user filter
    if (userIdQuery && userIdQuery !== 'All') {
      const parsedUserId = parseInt(userIdQuery, 10);
      
      if (user.role === 'SCHOOL_ADMIN') {
        where.userId = parsedUserId;
      } else if (user.role === 'PRINCIPAL') {
        // Principal can only filter users that do not belong to Admin department
        const targetUser = await prisma.user.findUnique({
          where: { id: parsedUserId },
          include: { department: true }
        });
        if (targetUser && targetUser.department?.name !== 'Admin') {
          where.userId = parsedUserId;
        } else {
          where.userId = -1; // Matches nothing
        }
      } else if (user.role === 'PROGRAM_HEAD') {
        // Program Heads can view their own tasks or faculty in their department
        if (parsedUserId === user.userId) {
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
      userId
    } = await request.json();

    if (!category || !taskDescription || !priority) {
      return NextResponse.json(
        { error: 'Category, description, and priority are required' },
        { status: 400 }
      );
    }

    let targetOwnerId = user.userId;

    if (userId && (user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL')) {
      const parsedUserId = parseInt(userId, 10);
      if (user.role === 'SCHOOL_ADMIN') {
        targetOwnerId = parsedUserId;
      } else if (user.role === 'PRINCIPAL') {
        const targetUser = await prisma.user.findUnique({
          where: { id: parsedUserId },
          include: { department: true }
        });
        if (targetUser && targetUser.department?.name !== 'Admin') {
          targetOwnerId = parsedUserId;
        } else {
          return NextResponse.json(
            { error: 'Principal cannot assign tasks to Admin department users' },
            { status: 403 }
          );
        }
      }
    } else if (userId && user.role === 'PROGRAM_HEAD') {
      const parsedUserId = parseInt(userId, 10);
      const targetUser = await prisma.user.findUnique({
        where: { id: parsedUserId }
      });
      if (targetUser && targetUser.departmentId === user.departmentId) {
        targetOwnerId = parsedUserId;
      } else {
        return NextResponse.json(
          { error: 'Cannot assign tasks to users outside your department' },
          { status: 403 }
        );
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetOwnerId },
      include: { department: true }
    });

    let isAuthority = false;
    if (user.role === 'SCHOOL_ADMIN') {
      isAuthority = true;
    } else if (user.role === 'PRINCIPAL') {
      // Principal is authority for Program Heads and Faculty (non-Admin)
      const isStaff = targetUser.role === 'FACULTY_STAFF' && targetUser.department?.name === 'Admin';
      if (targetUser.id !== user.userId && !isStaff) {
        isAuthority = true;
      }
    } else if (user.role === 'PROGRAM_HEAD') {
      // Program Head is authority for Faculty in their own department
      if (targetUser.id !== user.userId && targetUser.role === 'FACULTY_STAFF' && targetUser.departmentId === user.departmentId) {
        isAuthority = true;
      }
    }

    let status = 'Not Started';
    let initialProgress = progress ? parseInt(progress, 10) : 0;
    
    if (isAuthority) {
      if (targetOwnerId !== user.userId) {
        status = 'Pending Acceptance';
        initialProgress = 0;
      } else {
        if (initialProgress > 0 && initialProgress < 100) {
          status = 'Ongoing';
        } else if (initialProgress === 100) {
          status = 'Completed';
        }
      }
    } else {
      // Subordinate nominating a task
      status = 'Awaiting Approval';
      initialProgress = 0;
    }

    const isArchived = (status === 'Completed');

    const task = await prisma.task.create({
      data: {
        entryDate: new Date(),
        targetDate: targetDate ? new Date(targetDate) : null,
        category: category.trim(),
        taskDescription: taskDescription.trim(),
        priority,
        status,
        progress: initialProgress,
        remarks: remarks ? remarks.trim() : '',
        evidenceLink: evidenceLink ? evidenceLink.trim() : '',
        archived: isArchived,
        userId: targetOwnerId
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

    const { logActivity } = await import('@/lib/activity');
    await logActivity(user.userId, 'CREATE_TASK', `Created task "${task.taskDescription.substring(0, 50)}" for user "${task.user?.name || targetOwnerId}"`);

    return NextResponse.json({ success: true, task });

  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'An error occurred creating the task' },
      { status: 500 }
    );
  }
}
