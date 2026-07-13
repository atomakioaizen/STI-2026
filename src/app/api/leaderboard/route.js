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
  const priorityPts = task.priority === 'High' ? 30 : task.priority === 'Medium' ? 20 : 10;

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

    // Build date range
    let startDate, endDate, selectedMonth;
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split('-').map(Number);
      startDate = new Date(y, m - 1, 1, 0, 0, 0);
      endDate   = new Date(y, m, 0, 23, 59, 59);
      selectedMonth = monthParam;
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Get Completed tasks by FACULTY_STAFF only (these are the competitors)
    const tasks = await prisma.task.findMany({
      where: {
        status: 'Completed',
        entryDate: { gte: startDate, lte: endDate },
        user: { role: 'FACULTY_STAFF' }, // Only FACULTY_STAFF compete
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
          tasks: [],
        };
      }

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
    }

    // Sort all FACULTY_STAFF by score
    const allRanked = Object.values(scoreMap)
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    // Separate: Academic Faculty vs Admin Staff — each with their own internal rank
    const academicFaculty = allRanked
      .filter((e) => e.user.department?.name !== 'Admin')
      .map((entry, idx) => ({ ...entry, categoryRank: idx + 1 }));

    const adminStaff = allRanked
      .filter((e) => e.user.department?.name === 'Admin')
      .map((entry, idx) => ({ ...entry, categoryRank: idx + 1 }));

    const facultyOfMonth = academicFaculty[0] || null;
    const staffOfMonth   = adminStaff[0]       || null;

    return NextResponse.json({
      success: true,
      month: selectedMonth,
      rankings: allRanked,
      categories: { academicFaculty, adminStaff },
      awards: { facultyOfMonth, staffOfMonth },
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

