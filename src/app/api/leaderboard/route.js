import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/**
 * SCORING FORMULA
 * ───────────────
 * Task Score = Priority Points × Timeliness Multiplier
 *
 * Priority Points:
 *   High   = 30 pts
 *   Medium = 20 pts
 *   Low    = 10 pts
 *
 * Timeliness Multiplier (targetDate vs entryDate):
 *   On Time  (targetDate >= entryDate) = ×1.5  (+50% bonus)
 *   No Deadline (no targetDate)        = ×1.2  (+20% bonus)
 *   Delayed  (targetDate < entryDate)  = ×1.0  (no bonus)
 *
 * NOTE: Only FACULTY_STAFF compete in the leaderboard.
 *       Principal, Program Head, and School Admin are excluded.
 */
function computeScore(task) {
  const prio = (task.priority || '').toUpperCase();
  const priorityPts = prio === 'HIGH' ? 30 : prio === 'MEDIUM' ? 20 : 10;

  let timeFactor = 1.2; // default: no deadline
  let timeliness = 'no_deadline';

  if (task.targetDate) {
    const target = new Date(task.targetDate);
    const entry  = new Date(task.entryDate);
    if (target >= entry) {
      timeFactor = 1.5;
      timeliness = 'on_time';
    } else {
      timeFactor = 1.0;
      timeliness = 'delayed';
    }
  }

  return {
    score: Math.round(priorityPts * timeFactor),
    priorityPts,
    timeFactor,
    timeliness,
  };
}

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // YYYY-MM
    const timeframe = searchParams.get('timeframe') || 'monthly'; // weekly | monthly | yearly

    // Build date range
    let startDate, endDate, selectedMonth;
    const now = new Date();

    if (timeframe === 'weekly') {
      // Current ISO week: Monday to Sunday
      const day = now.getDay() || 7; // treat Sunday as 7
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else if (timeframe === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      endDate   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else {
      // monthly (default)
      if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
        const [y, m] = monthParam.split('-').map(Number);
        startDate = new Date(y, m - 1, 1, 0, 0, 0);
        endDate   = new Date(y, m, 0, 23, 59, 59);
        selectedMonth = monthParam;
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }
    }

    // Get eligible users based on requester role
    // PROGRAM_HEAD: only FACULTY_STAFF in their department
    // PRINCIPAL: PROGRAM_HEAD and FACULTY_STAFF (excluding Admin department)
    // SCHOOL_ADMIN: PROGRAM_HEAD, FACULTY_STAFF (academic faculty), and FACULTY_STAFF (Admin department)
    
    let roleFilter = {};
    if (user.role === 'PROGRAM_HEAD') {
      roleFilter = {
        role: 'FACULTY_STAFF',
        departmentId: user.departmentId
      };
    } else if (user.role === 'PRINCIPAL') {
      roleFilter = {
        OR: [
          { role: 'PROGRAM_HEAD' },
          { role: 'FACULTY_STAFF', department: { name: { not: 'Admin' } } }
        ]
      };
    } else if (user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN') {
      roleFilter = {
        OR: [
          { role: 'PROGRAM_HEAD' },
          { role: 'FACULTY_STAFF' }
        ]
      };
    } else {
      // FACULTY_STAFF cannot view leaderboard
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tasks = await prisma.task.findMany({
      where: {
        entryDate: { gte: startDate, lte: endDate },
        user: roleFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            position: true,
            role: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { entryDate: 'asc' },
    });

    // Aggregate scores per user
    const scoreMap = {};

    for (const task of tasks) {
      const uid = task.user.id;
      if (!scoreMap[uid]) {
        scoreMap[uid] = {
          user: task.user,
          totalScore: 0,
          taskCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          onTimeCount: 0,
          delayedCount: 0,
          noDeadlineCount: 0,
          rejectedTasksCount: 0,
          rejectionAttempts: 0,
          tasks: [],
        };
      }

      // Add attempts to reject
      scoreMap[uid].rejectionAttempts += task.rejectionCount || 0;

      if (task.status === 'Completed') {
        const { score, priorityPts, timeFactor, timeliness } = computeScore(task);

        scoreMap[uid].totalScore      += score;
        scoreMap[uid].taskCount       += 1;
        if (task.priority === 'High')   scoreMap[uid].highCount++;
        else if (task.priority === 'Medium') scoreMap[uid].mediumCount++;
        else                            scoreMap[uid].lowCount++;
        if (timeliness === 'on_time')   scoreMap[uid].onTimeCount++;
        else if (timeliness === 'delayed') scoreMap[uid].delayedCount++;
        else                            scoreMap[uid].noDeadlineCount++;

        scoreMap[uid].tasks.push({
          id: task.id,
          category: task.category,
          taskDescription: task.taskDescription,
          priority: task.priority,
          targetDate: task.targetDate,
          entryDate: task.entryDate,
          score,
          timeliness,
        });
      } else if (task.status === 'Rejected') {
        scoreMap[uid].rejectedTasksCount += 1;
      }
    }

    // Sort all retrieved participants by score
    const allRanked = Object.values(scoreMap)
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    // Grouping into specific category arrays for views
    const programHeads = allRanked
      .filter((e) => e.user.role === 'PROGRAM_HEAD')
      .map((entry, idx) => ({ ...entry, categoryRank: idx + 1 }));

    const academicFaculty = allRanked
      .filter((e) => e.user.role === 'FACULTY_STAFF' && e.user.department?.name !== 'Admin')
      .map((entry, idx) => ({ ...entry, categoryRank: idx + 1 }));

    const adminStaff = allRanked
      .filter((e) => e.user.role === 'FACULTY_STAFF' && e.user.department?.name === 'Admin')
      .map((entry, idx) => ({ ...entry, categoryRank: idx + 1 }));

    const programHeadOfPeriod = (programHeads[0] && programHeads[0].totalScore > 0) ? programHeads[0] : null;
    const facultyOfPeriod     = (academicFaculty[0] && academicFaculty[0].totalScore > 0) ? academicFaculty[0] : null;
    const staffOfPeriod       = (adminStaff[0] && adminStaff[0].totalScore > 0) ? adminStaff[0] : null;

    return NextResponse.json({
      success: true,
      month: selectedMonth,
      userRole: user.role,
      userDepartmentId: user.departmentId,
      rankings: allRanked,
      categories: { programHeads, academicFaculty, adminStaff },
      awards: { programHeadOfPeriod, facultyOfPeriod, staffOfPeriod },
      formula: {
        priorityPts: { High: 30, Medium: 20, Low: 10 },
        timeFactor: { on_time: 1.5, no_deadline: 1.2, delayed: 1.0 },
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to compute leaderboard' }, { status: 500 });
  }
}

